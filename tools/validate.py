#!/usr/bin/env python3
"""Validate the word data, audio files and PWA assets.

Run from the repository root (or anywhere; paths are resolved from this file):

    python3 tools/validate.py

Exits non-zero on errors. Warnings do not fail the build. This is intentionally
dependency-free so it can run in GitHub Actions before a Pages deploy.
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "word-data.js"
APP = ROOT / "app.js"
AUDIO = ROOT / "audio"
AUDIO_MANIFEST = AUDIO / "manifest.json"
WEB_MANIFEST = ROOT / "manifest.webmanifest"

LANGS = ("en", "fr")
POS = {"noun", "verb", "adj", "position"}
GENERIC_AUDIO = ("intro", "retry", "end", "check", "check_end")
ID_RE = re.compile(r"^[a-z0-9_]+$")
PACK_ID_RE = re.compile(r"^[a-z0-9_-]+$")

errors: list[str] = []
warnings: list[str] = []


def error(message: str) -> None:
    errors.append(message)


def warn(message: str) -> None:
    warnings.append(message)


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def load_word_data(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    if "MOMO_DATA" not in text:
        raise SystemExit(f"{rel(path)}: cannot find window.MOMO_DATA")
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        raise SystemExit(f"{rel(path)}: cannot find the word-data object")
    try:
        return json.loads(text[start:end + 1])
    except json.JSONDecodeError as exc:
        raise SystemExit(f"{rel(path)}: word-data is not valid JSON: {exc}") from exc


def check_word(word: object, seen_ids: set[str]) -> str | None:
    if not isinstance(word, dict):
        error(f"words: entry is not an object: {word!r}")
        return None

    word_id = word.get("id")
    if not isinstance(word_id, str) or not ID_RE.match(word_id):
        error(f"words: invalid id {word_id!r}")
        return None
    if word_id in seen_ids:
        error(f"words: duplicate id {word_id!r}")
    seen_ids.add(word_id)

    if not isinstance(word.get("emoji"), str) or not word["emoji"]:
        error(f"{word_id}: missing emoji")
    if not isinstance(word.get("cat"), str) or not word["cat"]:
        error(f"{word_id}: missing cat")
    if word.get("pos") not in POS:
        error(f"{word_id}: pos must be one of {sorted(POS)}, got {word.get('pos')!r}")

    for lang in LANGS:
        block = word.get(lang)
        if not isinstance(block, dict):
            error(f"{word_id}: missing {lang} block")
            continue
        if not isinstance(block.get("phrase"), str) or not block["phrase"].strip():
            error(f"{word_id}.{lang}: missing phrase")
        if not isinstance(block.get("praise"), str) or not block["praise"].strip():
            error(f"{word_id}.{lang}: missing praise")
        prompts = block.get("prompts")
        if not isinstance(prompts, list) or not prompts:
            error(f"{word_id}.{lang}: prompts must be a non-empty list")
        else:
            if len(prompts) < 3:
                error(f"{word_id}.{lang}: needs at least 3 prompts for the three levels")
            for index, prompt in enumerate(prompts):
                if not isinstance(prompt, str) or not prompt.strip():
                    error(f"{word_id}.{lang}: prompt {index + 1} is empty")

    foils = word.get("foils", [])
    if not isinstance(foils, list):
        error(f"{word_id}: foils must be a list")
    return word_id


EN_EXTRA_FORMS = {
    "cashew nuts": ["cashew nuts", "cashew", "nuts"],
    "get dressed": ["get dressed", "dressed", "dress"],
    "take off": ["take off", "take", "off"],
    "put on": ["put on", "put", "on"],
    "in front of": ["in front of", "front"],
    "next to": ["next to", "next"],
    "in": ["in"],
}

FR_VERB_FORMS = {
    "partager": ["partager", "partage"],
    "bouger": ["bouger", "bouge"],
    "tomber": ["tomber", "tombe"],
    "préparer": ["préparer", "prépare"],
    "pousser": ["pousser", "pousse"],
    "attraper": ["attraper", "attrape"],
    "souffler": ["souffler", "souffle"],
    "enlever": ["enlever", "enlève"],
    "mettre": ["mettre", "met", "mets"],
    "sourire": ["sourire", "sourit"],
    "s'habiller": ["s'habiller", "habiller", "habille"],
}


def _norm(text: str) -> str:
    return unicodedata.normalize("NFC", text.lower())


def _contains(form: str, text: str) -> bool:
    form = _norm(form)
    return bool(re.search(r"(?<!\w)" + re.escape(form) + r"(?!\w)", _norm(text)))


def _english_forms(word: dict) -> set[str]:
    phrase = word["en"]["phrase"].strip()
    core = re.sub(r"^(a|an|the)\s+", "", phrase, flags=re.I)
    forms = {phrase, core}
    forms.update(EN_EXTRA_FORMS.get(core.lower(), []))
    return {form for form in forms if form}


def _french_forms(word: dict) -> set[str]:
    phrase = word["fr"]["phrase"].strip()
    core = re.sub(r"^(un|une|le|la|les|du|des)\s+", "", phrase, flags=re.I)
    core = re.sub(r"^(de la|de l')\s*", "", core, flags=re.I)
    core = re.sub(r"^l'", "", core, flags=re.I)
    forms = {phrase, core}
    forms.update(FR_VERB_FORMS.get(core, []))
    for part in re.split(r"[\s-]+", core):
        if len(part) > 2 and part not in {"une", "les", "des", "avec", "pour"}:
            forms.add(part)
    return {form for form in forms if form}


def check_l3_prompts(words: list) -> None:
    """The third prompt must describe the word, not name it."""
    checked = 0
    for word in words:
        if not isinstance(word, dict) or not isinstance(word.get("id"), str):
            continue
        for lang, forms in (("en", _english_forms(word)), ("fr", _french_forms(word))):
            prompts = word.get(lang, {}).get("prompts", [])
            if not isinstance(prompts, list) or len(prompts) < 3:
                continue
            checked += 1
            for form in forms:
                if _contains(form, prompts[2]):
                    error(f"{word['id']}.{lang}: L3 prompt contains the answer form {form!r}")
    print(f"  L3 prompts: {checked} checked")


def check_actions(actions: object) -> None:
    if not isinstance(actions, list):
        error("actions: must be a list")
        return
    action_ids: set[str] = set()
    for action in actions:
        if not isinstance(action, dict):
            error(f"actions: entry is not an object: {action!r}")
            continue
        action_id = action.get("id")
        if not isinstance(action_id, str) or not ID_RE.match(action_id):
            error(f"actions: invalid id {action_id!r}")
            continue
        if action_id in action_ids:
            error(f"actions: duplicate id {action_id!r}")
        action_ids.add(action_id)
        if not isinstance(action.get("emoji"), str) or not action["emoji"]:
            error(f"actions[{action_id}]: missing emoji")
        for lang in LANGS:
            if not isinstance(action.get(lang), str) or not action[lang].strip():
                error(f"actions[{action_id}]: missing {lang} text")


def check_packs(packs: object, word_ids: set[str]) -> None:
    if not isinstance(packs, list):
        error("packs: must be a list")
        return
    pack_ids: set[str] = set()
    for pack in packs:
        if not isinstance(pack, dict):
            error(f"packs: entry is not an object: {pack!r}")
            continue
        pack_id = pack.get("id")
        if not isinstance(pack_id, str) or not PACK_ID_RE.match(pack_id):
            error(f"packs: invalid id {pack_id!r}")
            continue
        if pack_id in pack_ids:
            error(f"packs: duplicate id {pack_id!r}")
        pack_ids.add(pack_id)

        if not isinstance(pack.get("label"), str) or not pack["label"].strip():
            error(f"packs[{pack_id}]: missing label")
        lang = pack.get("lang")
        if lang not in LANGS:
            error(f"packs[{pack_id}]: lang must be en or fr, got {lang!r}")
        level = pack.get("level", 1)
        if not isinstance(level, int) or not 1 <= level <= 3:
            error(f"packs[{pack_id}]: level must be 1..3, got {level!r}")

        words = pack.get("words")
        if not isinstance(words, list) or not words:
            error(f"packs[{pack_id}]: words must be a non-empty list")
            continue
        if len(words) != len(set(words)):
            error(f"packs[{pack_id}]: words contains duplicates")
        for word_id in words:
            if word_id not in word_ids:
                error(f"packs[{pack_id}]: unknown word id {word_id!r}")


def check_foils(words: list, word_ids: set[str]) -> None:
    for word in words:
        if not isinstance(word, dict) or "foils" not in word:
            continue
        word_id = word.get("id")
        foils = word.get("foils")
        if not isinstance(foils, list):
            continue
        if len(foils) != len(set(foils)):
            error(f"{word_id}: foils contains duplicates")
        for foil in foils:
            if not isinstance(foil, str) or foil not in word_ids:
                error(f"{word_id}: unknown foil {foil!r}")
            elif foil == word_id:
                error(f"{word_id}: a word cannot be its own foil")


def expected_audio(words: list, actions: list) -> set[str]:
    paths: set[str] = set()
    for word in words:
        if not isinstance(word, dict) or not isinstance(word.get("id"), str):
            continue
        word_id = word["id"]
        for lang in LANGS:
            block = word.get(lang)
            prompts = block.get("prompts") if isinstance(block, dict) else None
            if isinstance(prompts, list):
                for index in range(len(prompts)):
                    suffix = "_prompt" if index == 0 else f"_prompt{index + 1}"
                    paths.add(f"audio/{lang}/{word_id}{suffix}.mp3")
            paths.add(f"audio/{lang}/{word_id}_praise.mp3")
    for action in actions:
        if not isinstance(action, dict) or not isinstance(action.get("id"), str):
            continue
        for lang in LANGS:
            paths.add(f"audio/{lang}/{action['id']}.mp3")
    for lang in LANGS:
        for name in GENERIC_AUDIO:
            paths.add(f"audio/{lang}/{name}.mp3")
    return paths


def check_audio(words: list, actions: list) -> None:
    expected = expected_audio(words, actions)
    actual = {
        rel(path)
        for path in AUDIO.rglob("*.mp3")
        if "_tmp" not in path.relative_to(AUDIO).parts
    }

    for path in sorted(expected - actual):
        error(f"missing audio: {path}")
    for path in sorted(actual - expected):
        warn(f"unused audio file: {path}")

    for path in sorted(expected & actual):
        if (ROOT / path).stat().st_size <= 1000:
            error(f"audio file is suspiciously small: {path}")

    if not AUDIO_MANIFEST.exists():
        error("audio/manifest.json is missing; run tools/generate_audio.py")
        return
    try:
        manifest = json.loads(AUDIO_MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        error(f"audio/manifest.json is not valid JSON: {exc}")
        return
    if not isinstance(manifest, list) or not all(isinstance(item, str) for item in manifest):
        error("audio/manifest.json must be a list of relative paths")
        return
    if len(manifest) != len(set(manifest)):
        error("audio/manifest.json contains duplicate paths")
    listed = set(manifest)
    for path in sorted(actual - listed):
        error(f"audio file missing from manifest: {path}")
    for path in sorted(listed - actual):
        error(f"manifest references missing file: {path}")


def check_art_keys(text: str, word_ids: set[str]) -> set[str]:
    match = re.search(r"var ART = \{(.*?)\n  \};", text, re.S)
    if not match:
        warn("could not find the ART block in app.js; skipping art check")
        return set()
    art_ids = set(re.findall(r"^    ([a-z0-9_]+):\s*$", match.group(1), re.M))
    for art_id in sorted(art_ids - word_ids):
        error(f"ART has an entry for unknown word id {art_id!r}")
    print(f"  SVG art: {len(art_ids)} words")
    return art_ids


def check_flashcards(text: str, word_ids: set[str], art_ids: set[str]) -> None:
    match = re.search(r"var FLASHCARDS = \{(.*?)\n  \};", text, re.S)
    if not match:
        error("app.js: cannot find the FLASHCARDS block")
        return
    entries = re.findall(r"^    ([a-z0-9_]+):\s*'([^']+)'", match.group(1), re.M)
    seen: set[str] = set()
    for word_id, src in entries:
        if word_id not in word_ids:
            error(f"FLASHCARDS has an entry for unknown word id {word_id!r}")
        if word_id in seen:
            error(f"FLASHCARDS has a duplicate entry for {word_id!r}")
        seen.add(word_id)
        if word_id in art_ids:
            error(f"{word_id} is in both ART and FLASHCARDS")
        if not src.startswith("flashcards/"):
            error(f"{word_id}: flashcard path must live under flashcards/, got {src!r}")
        path = ROOT / src
        if not path.exists():
            error(f"{word_id}: missing flashcard image {src}")
        elif path.stat().st_size <= 1000:
            error(f"{word_id}: flashcard image is suspiciously small: {src}")

    folder = ROOT / "flashcards"
    if folder.exists():
        for path in sorted(folder.glob("*.png")):
            if path.name not in {src.rsplit("/", 1)[-1] for _, src in entries}:
                warn(f"unused flashcard image: {rel(path)}")

    # Every picture card must be pre-cached, otherwise the first offline play
    # can show a blank card.
    sw_path = ROOT / "sw.js"
    if sw_path.exists():
        sw = sw_path.read_text(encoding="utf-8")
        sources = {src for _, src in entries}
        for src in sorted(sources):
            if src not in sw:
                error(f"sw.js CORE is missing picture card {src}")
        for src in sorted(set(re.findall(r"'(flashcards/[^']+\.png)'", sw)) - sources):
            warn(f"sw.js CORE lists an unused picture card {src}")
    else:
        error("sw.js is missing")
    print(f"  picture cards: {len(seen)} words")


def check_shell_assets() -> None:
    sw_path = ROOT / "sw.js"
    if not sw_path.exists():
        error("sw.js is missing")
        return
    sw = sw_path.read_text(encoding="utf-8")
    match = re.search(r"const CORE = \[(.*?)\n\];", sw, re.S)
    if not match:
        error("sw.js: cannot find CORE")
        return
    assets = re.findall(r"SCOPE \+ '([^']+)'", match.group(1))
    required = {"index.html", "styles.css", "word-data.js", "app.js", "manifest.webmanifest"}
    missing = sorted(required - set(assets))
    for asset in missing:
        error(f"sw.js CORE is missing {asset}")
    for asset in assets:
        if not (ROOT / asset).exists():
            error(f"sw.js CORE references missing file {asset}")
    print(f"  shell assets: {len(assets)}")


def check_interest_keys(text: str, word_ids: set[str]) -> None:
    match = re.search(r"var INTEREST = \{([^}]*)\};", text)
    if not match:
        warn("could not find the INTEREST block in app.js; skipping check")
        return
    for word_id in re.findall(r"([a-z0-9_]+):\s*true", match.group(1)):
        if word_id not in word_ids:
            error(f"INTEREST references unknown word id {word_id!r}")


def check_web_manifest() -> None:
    if not WEB_MANIFEST.exists():
        error("manifest.webmanifest is missing")
        return
    try:
        manifest = json.loads(WEB_MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        error(f"manifest.webmanifest is not valid JSON: {exc}")
        return
    for icon in manifest.get("icons", []):
        src = icon.get("src") if isinstance(icon, dict) else None
        if not isinstance(src, str) or not (ROOT / src).exists():
            error(f"manifest.webmanifest icon is missing: {src!r}")


def main() -> int:
    app_text = APP.read_text(encoding="utf-8")
    data = load_word_data(DATA_FILE)

    words = data.get("words")
    actions = data.get("actions")
    if not isinstance(words, list) or not words:
        raise SystemExit("words must be a non-empty list")
    if not isinstance(actions, list):
        error("actions must be a list")
        actions = []

    word_ids: set[str] = set()
    for word in words:
        check_word(word, word_ids)
    check_l3_prompts(words)
    check_foils(words, word_ids)
    check_actions(actions)
    check_packs(data.get("packs", []), word_ids)
    check_audio(words, actions)
    art_ids = check_art_keys(app_text, word_ids)
    check_flashcards(app_text, word_ids, art_ids)
    check_interest_keys(app_text, word_ids)
    check_shell_assets()
    check_web_manifest()

    pos_counts = Counter(word.get("pos") for word in words if isinstance(word, dict))
    actual_audio = [path for path in AUDIO.rglob("*.mp3") if "_tmp" not in path.relative_to(AUDIO).parts]
    total_mb = sum(path.stat().st_size for path in actual_audio) / 1e6

    print(f"  words: {len(words)} " + " / ".join(
        f"{name} {pos_counts.get(name, 0)}" for name in ("noun", "verb", "adj", "position")
    ))
    print(f"  packs: {len(data.get('packs', []) or [])}")
    print(f"  audio: {len(actual_audio)} files, {total_mb:.1f} MB")

    for message in warnings:
        print(f"WARN  {message}")
    for message in errors:
        print(f"ERROR {message}")

    if errors:
        print(f"\n{len(errors)} error(s), {len(warnings)} warning(s)")
        return 1
    print(f"\nOK: {len(warnings)} warning(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
