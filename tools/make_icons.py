#!/usr/bin/env python3
"""Draw the Momo app icon and export PWA/iOS sizes."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"
OUT.mkdir(exist_ok=True)

S = 1024  # draw large, then downsample


def ellipse(d, box, fill, outline=None, width=0):
    d.ellipse(tuple(int(v * S) for v in box), fill=fill, outline=outline, width=int(width * S))


def draw_icon(maskable=False):
    img = Image.new("RGB", (S, S), "#FFE7C2")
    d = ImageDraw.Draw(img)

    # soft background glow
    for i, alpha in enumerate((28, 20, 12)):
        r = 0.46 - i * 0.06
        d.ellipse(
            [int(S * (0.5 - r)), int(S * (0.5 - r)), int(S * (0.5 + r)), int(S * (0.5 + r))],
            fill=(255, 249, 238),
        )

    # ground shadow
    d.ellipse([int(S * .27), int(S * .78), int(S * .73), int(S * .86)], fill="#EBC79F")

    # ears (behind head)
    ellipse(d, (0.31, 0.10, 0.47, 0.48), "#EFC094")
    ellipse(d, (0.53, 0.10, 0.69, 0.48), "#EFC094")
    ellipse(d, (0.345, 0.15, 0.435, 0.44), "#F6B8B0")
    ellipse(d, (0.565, 0.15, 0.655, 0.44), "#F6B8B0")

    # head / body
    ellipse(d, (0.24, 0.27, 0.76, 0.84), "#F4C99B")
    ellipse(d, (0.34, 0.54, 0.66, 0.82), "#FFF3DF")

    # paws
    ellipse(d, (0.17, 0.66, 0.28, 0.79), "#F4C99B")
    ellipse(d, (0.72, 0.66, 0.83, 0.79), "#F4C99B")

    # eyes
    ellipse(d, (0.375, 0.48, 0.435, 0.54), "#4A3226")
    ellipse(d, (0.565, 0.48, 0.625, 0.54), "#4A3226")
    ellipse(d, (0.395, 0.495, 0.415, 0.515), "#FFFFFF")
    ellipse(d, (0.585, 0.495, 0.605, 0.515), "#FFFFFF")

    # blush
    ellipse(d, (0.29, 0.58, 0.39, 0.63), "#F7A9A0")
    ellipse(d, (0.61, 0.58, 0.71, 0.63), "#F7A9A0")

    # nose + mouth
    d.polygon([
        (int(S * .475), int(S * .575)),
        (int(S * .525), int(S * .575)),
        (int(S * .50), int(S * .60)),
    ], fill="#4A3226")
    d.arc([int(S * .45), int(S * .585), int(S * .55), int(S * .66)], 15, 165, fill="#4A3226", width=int(S * .012))

    # scarf
    d.rounded_rectangle(
        [int(S * .33), int(S * .745), int(S * .67), int(S * .805)],
        radius=int(S * .03), fill="#8FD3B6",
    )

    # tiny star accent
    cx, cy, r = int(S * .78), int(S * .25), int(S * .045)
    pts = []
    import math
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * .45
        pts.append((cx + math.cos(ang) * rr, cy + math.sin(ang) * rr))
    d.polygon(pts, fill="#FFCE6B")

    if maskable:
        # Keep the same art, but the background is full-bleed and the face is
        # inside the central safe zone for Android's adaptive mask.
        pass
    return img


def main():
    base = draw_icon()
    base.resize((512, 512), Image.LANCZOS).save(OUT / "icon-512.png", optimize=True)
    base.resize((192, 192), Image.LANCZOS).save(OUT / "icon-192.png", optimize=True)
    base.resize((180, 180), Image.LANCZOS).save(OUT / "apple-touch-icon.png", optimize=True)
    base.resize((32, 32), Image.LANCZOS).save(OUT / "favicon-32.png", optimize=True)
    # Android adaptive masks can crop the edges; inset the art into the safe zone.
    maskable = Image.new("RGB", (S, S), "#FFE7C2")
    art = base.resize((int(S * .82), int(S * .82)), Image.LANCZOS)
    maskable.paste(art, ((S - art.width) // 2, (S - art.height) // 2))
    maskable.resize((512, 512), Image.LANCZOS).save(OUT / "icon-maskable-512.png", optimize=True)
    print("icons written to", OUT)


if __name__ == "__main__":
    main()
