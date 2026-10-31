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
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "index.html"
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


def load_word_data(text: str) -> dict:
    match = re.search(
        r'<script id="word-data" type="application/json">(.*?)</script>',
        text,
        re.S,
    )
    if not match:
        raise SystemExit("index.html: cannot find the word-data JSON block")
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"index.html: word-data is not valid JSON: {exc}") from exc


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
            for index, prompt in enumerate(prompts):
                if not isinstance(prompt, str) or not prompt.strip():
                    error(f"{word_id}.{lang}: prompt {index + 1} is empty")

    foils = word.get("foils", [])
    if not isinstance(foils, list):
        error(f"{word_id}: foils must be a list")
    return word_id


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


def check_art_keys(text: str, word_ids: set[str]) -> None:
    match = re.search(r"var ART = \{(.*?)\n  \};", text, re.S)
    if not match:
        warn("could not find the ART block in index.html; skipping art check")
        return
    art_ids = set(re.findall(r"^    ([a-z0-9_]+):\s*$", match.group(1), re.M))
    for art_id in sorted(art_ids - word_ids):
        error(f"ART has an entry for unknown word id {art_id!r}")
    print(f"  SVG art: {len(art_ids)} words")


def check_interest_keys(text: str, word_ids: set[str]) -> None:
    match = re.search(r"var INTEREST = \{([^}]*)\};", text)
    if not match:
        warn("could not find the INTEREST block in index.html; skipping check")
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
    text = HTML.read_text(encoding="utf-8")
    data = load_word_data(text)

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
    check_foils(words, word_ids)
    check_actions(actions)
    check_packs(data.get("packs", []), word_ids)
    check_audio(words, actions)
    check_art_keys(text, word_ids)
    check_interest_keys(text, word_ids)
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
