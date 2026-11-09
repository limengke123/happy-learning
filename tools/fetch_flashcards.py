#!/usr/bin/env python3
"""Download and normalize the ARASAAC picture cards used by index.html.

The source images are 500 px PNGs from https://static.arasaac.org. Each one is
cropped to its transparent bounding box and centred on a 480x480 transparent
canvas so it sits inside the card's circular halo at a consistent size.

Usage:
    python3 tools/fetch_flashcards.py

Pictograms: Sergio Palao / Gobierno de Aragón, ARASAAC, CC BY-NC-SA 4.0.
See flashcards/README.md for the per-file source list.
"""
from __future__ import annotations

import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "flashcards"
CANVAS = 480
MAX = 452

# word id -> ARASAAC pictogram id
PICTOGRAMS = {
    "share": 15361,
    "move": 2719,
    "fall": 4582,
    "get_dressed": 34494,
    "prepare": 25738,
    "push": 4638,
    "catch": 24208,
    "blow": 4747,
    "take_off": 36582,
    "put_on": 36577,
    "donkey": 2291,
    "skirt": 2391,
    "dress": 2613,
    "belt": 2336,
    "yogurt": 2618,
    "cashews": 35141,
    "snack": 4694,
    "papers": 2398,
    "sky": 38270,
}


def download(pictogram_id: int) -> bytes:
    url = f"https://static.arasaac.org/pictograms/{pictogram_id}/{pictogram_id}_500.png"
    with urllib.request.urlopen(url, timeout=40) as response:
        return response.read()


def normalize(raw: bytes) -> Image.Image:
    from io import BytesIO

    image = Image.open(BytesIO(raw)).convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if bbox:
        image = image.crop(bbox)
    image.thumbnail((MAX, MAX), Image.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.alpha_composite(image, ((CANVAS - image.width) // 2, (CANVAS - image.height) // 2))
    return canvas


def main() -> int:
    OUT.mkdir(exist_ok=True)
    failures = 0
    for name, pictogram_id in PICTOGRAMS.items():
        try:
            image = normalize(download(pictogram_id))
        except Exception as exc:  # network errors should not leave a partial file
            print(f"ERROR {name} ({pictogram_id}): {exc}", file=sys.stderr)
            failures += 1
            continue
        dest = OUT / f"{name}.png"
        image.save(dest, optimize=True)
        print(f"  {dest.relative_to(ROOT)}  {dest.stat().st_size // 1024} KB")
        time.sleep(0.2)  # be gentle with the public API
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
