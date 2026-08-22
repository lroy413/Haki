#!/usr/bin/env python3
"""
Generate the Haki icon set.

Kept in the repo so the icons are reproducible rather than mystery binaries:
re-run it after changing the glyph or the palette.

    python3 tools/make_icons.py

Writes app icons into assets/ and PWA icons into public/.
"""

import os
from PIL import Image, ImageDraw, ImageFont

BG = (10, 11, 18)        # --bg  #0A0B12
VIOLET = (177, 76, 255)  # --violet #B14CFF
GLYPH = "覇"             # Haoshoku — the conqueror's kanji

FONT_CANDIDATES = [
    "/etc/alternatives/fonts-japanese-gothic.ttf",
    "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf",
]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def font_path() -> str:
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return path
    raise SystemExit(f"No CJK font found. Looked in: {FONT_CANDIDATES}")


def render(size: int, glyph_ratio: float, bg=BG) -> Image.Image:
    """A square icon with the glyph centred and optically balanced."""
    img = Image.new("RGB", (size, size), bg)
    draw = ImageDraw.Draw(img)

    font = ImageFont.truetype(font_path(), int(size * glyph_ratio))
    # Measure the actual inked bounds — CJK glyphs sit high in their em box,
    # so centring on the font metrics alone leaves them visibly too high.
    left, top, right, bottom = draw.textbbox((0, 0), GLYPH, font=font)
    x = (size - (right - left)) / 2 - left
    y = (size - (bottom - top)) / 2 - top

    draw.text((x, y), GLYPH, font=font, fill=VIOLET)
    return img


def main() -> None:
    assets = os.path.join(ROOT, "assets")
    public = os.path.join(ROOT, "public")
    os.makedirs(public, exist_ok=True)

    # Native app icon, and the Android adaptive foreground (which is cropped
    # to a circle on many launchers, so the glyph is kept smaller).
    render(1024, 0.62).save(os.path.join(assets, "icon.png"))
    render(1024, 0.44).save(os.path.join(assets, "android-icon-foreground.png"))
    render(1024, 0.62).save(os.path.join(assets, "splash-icon.png"))

    # PWA. The maskable variant keeps the glyph inside the 80% safe zone so
    # platform masking never clips it.
    render(192, 0.62).save(os.path.join(public, "pwa-192.png"))
    render(512, 0.62).save(os.path.join(public, "pwa-512.png"))
    render(512, 0.42).save(os.path.join(public, "pwa-512-maskable.png"))

    # iOS home screen. No transparency — iOS composites its own rounding.
    render(180, 0.60).save(os.path.join(public, "apple-touch-icon.png"))

    favicon = render(64, 0.66)
    favicon.save(os.path.join(assets, "favicon.png"))
    favicon.save(
        os.path.join(public, "favicon.ico"),
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
    )

    print("Wrote:")
    for path in (assets, public):
        for name in sorted(os.listdir(path)):
            if name.endswith((".png", ".ico")):
                print(f"  {os.path.relpath(os.path.join(path, name), ROOT)}")


if __name__ == "__main__":
    main()
