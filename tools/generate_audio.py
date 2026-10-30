#!/usr/bin/env python3
"""Generate the bilingual audio clips used by index.html.

The vocabulary lives in the `word-data` JSON block inside index.html, so this
script has a single source of truth. Run with:

    python3 tools/generate_audio.py            # only missing files
    python3 tools/generate_audio.py --force    # regenerate everything

Requires: edge-tts, ffmpeg.
"""
import argparse
import asyncio
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

try:
    import edge_tts
except ImportError:
    sys.exit("Please install edge-tts first: pip install edge-tts")

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "index.html"
AUDIO = ROOT / "audio"
TMP = AUDIO / "_tmp"

VOICES = {"en": "en-US-JennyNeural", "fr": "fr-FR-DeniseNeural"}
RATES = {"en": "-12%", "fr": "-10%"}
PITCH = {"en": "+0Hz", "fr": "+0Hz"}

GENERIC = {
    "intro": {"en": "Let's play!", "fr": "On joue !"},
    "retry": {"en": "Hmm... try again.", "fr": "Hmm... essaie encore."},
    "end": {"en": "You did it! Bravo!", "fr": "C'est fini ! Bravo !"},
}


def load_data():
    text = HTML.read_text(encoding="utf-8")
    m = re.search(
        r'<script id="word-data" type="application/json">(.*?)</script>',
        text,
        re.S,
    )
    if not m:
        sys.exit("Could not find the word-data block in index.html")
    return json.loads(m.group(1))


def build_jobs(data):
    jobs = []
    for lang in ("en", "fr"):
        for word in data["words"]:
            for i, prompt in enumerate(word[lang]["prompts"]):
                suffix = "_prompt" if i == 0 else f"_prompt{i + 1}"
                # Advanced prompts are longer; read them a little brisker.
                rate = RATES[lang] if i == 0 else "-8%"
                jobs.append((lang, f"{word['id']}{suffix}", prompt, rate))
            jobs.append((lang, f"{word['id']}_praise", word[lang]["praise"], RATES[lang]))
        for action in data["actions"]:
            jobs.append((lang, action["id"], action[lang], RATES[lang]))
        for name, phrases in GENERIC.items():
            jobs.append((lang, name, phrases[lang], RATES[lang]))
    return jobs


async def synth(lang, name, text, rate, force, sem, counter, total):
    out = AUDIO / lang / f"{name}.mp3"
    if out.exists() and out.stat().st_size > 1000 and not force:
        counter[0] += 1
        return
    tmp = TMP / f"{lang}_{name}.mp3"
    async with sem:
        for attempt in range(3):
            try:
                communicate = edge_tts.Communicate(
                    text,
                    VOICES[lang],
                    rate=rate,
                    pitch=PITCH[lang],
                )
                await asyncio.wait_for(communicate.save(str(tmp)), timeout=35)
                break
            except Exception as exc:  # noqa: BLE001 - retry network errors
                if attempt == 2:
                    print(f"  !! {lang}/{name}: {exc}", flush=True)
                    return
                await asyncio.sleep(1.2 * (attempt + 1))

        # Trim leading/trailing silence, even out loudness, keep it small.
        af = (
            "silenceremove=start_periods=1:start_duration=0.06:start_threshold=-45dB,"
            "areverse,"
            "silenceremove=start_periods=1:start_duration=0.12:start_threshold=-45dB,"
            "areverse,"
            "loudnorm=I=-18:TP=-1.5:LRA=7"
        )
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(tmp),
            "-af", af,
            "-ac", "1", "-ar", "24000", "-b:a", "48k",
            str(out),
        ]
        subprocess.run(cmd, check=True, timeout=45)
        tmp.unlink(missing_ok=True)
        counter[0] += 1
        print(f"  [{counter[0]:3d}/{total}] {lang}/{name}", flush=True)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    data = load_data()
    jobs = build_jobs(data)
    for lang in ("en", "fr"):
        (AUDIO / lang).mkdir(parents=True, exist_ok=True)
    TMP.mkdir(parents=True, exist_ok=True)

    print(f"Generating {len(jobs)} clips with edge-tts…")
    sem = asyncio.Semaphore(4)
    counter = [0]
    await asyncio.gather(
        *(synth(lang, name, text, rate, args.force, sem, counter, len(jobs)) for lang, name, text, rate in jobs)
    )
    shutil.rmtree(TMP, ignore_errors=True)

    # Keep the PWA offline-cache list in sync with the generated clips.
    manifest = sorted(p.relative_to(ROOT).as_posix() for p in AUDIO.glob("*/*.mp3"))
    (AUDIO / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Done: {counter[0]} clips in {AUDIO} ({len(manifest)} in manifest)")


if __name__ == "__main__":
    asyncio.run(main())
