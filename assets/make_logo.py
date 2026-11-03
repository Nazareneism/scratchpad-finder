"""Pixel-art Clawd holding a sheet of paper, for the scratchpad-finder icon.

Usage, from the repo root (write to a folder outside the repo):
    uv run --no-project --with pillow python assets/make_logo.py <out_dir>

Writes icon-cream.png, icon-dark.png, icon-clear.png (1024x1024) and
preview.png to <out_dir>. The shipped icon is icon-clear.png, copied to
.claude-plugin/icon.png. The art is the CLAWD and PAPER text grids below:
edit a grid, re-run, check preview.png, then copy the icon over.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

GRID = 32      # logical pixel grid
SCALE = 32     # 32 * 32 = 1024 px output

COLORS = {
    "#": (217, 119, 87, 255),   # Claude orange
    "e": (20, 20, 19, 255),     # eyes
    "O": (61, 57, 41, 255),     # paper outline
    "W": (255, 255, 255, 255),  # paper
    "F": (222, 220, 209, 255),  # folded corner
    "L": (176, 174, 165, 255),  # text lines
}

# Decoded from the Claude Code banner: 1 quadrant = 1 px wide, 2 px tall.
CLAWD = [
    "..############..",
    "..############..",
    "..##e######e##..",
    "..##e######e##..",
    "################",
    "################",
    "..############..",
    "..############..",
    "...#.#....#.#...",
    "...#.#....#.#...",
]

PAPER = [
    "OOOOOOOO...",
    "OWWWWWWOO..",
    "OWLLLLWOFO.",
    "OWWWWWWOOOO",
    "OWWWWWWWWWO",
    "OWLLLLLLLWO",
    "OWWWWWWWWWO",
    "OWLLLLLLLWO",
    "OWWWWWWWWWO",
    "OWLLLLLLLWO",
    "OWWWWWWWWWO",
    "OWLLLLLWWWO",
    "OWWWWWWWWWO",
    "OWWWWWWWWWO",
    "OWWWWWWWWWO",
    "OOOOOOOOOOO",
]

# Where the right arm grips the paper (paper row index level with the arm).
GRIP_ROW = 13
PAPER_X = 15          # paper's left column, in Clawd coordinates
ARM_EXTRA = 1         # extra arm pixels reaching onto the paper


def compose():
    """Return a dict {(x, y): color} for the art, centered on the grid."""
    px = {}
    paper_y = 4 - GRIP_ROW
    for y, row in enumerate(PAPER):
        for x, ch in enumerate(row):
            if ch != ".":
                px[(PAPER_X + x, paper_y + y)] = COLORS[ch]
    for y, row in enumerate(CLAWD):
        for x, ch in enumerate(row):
            if ch != ".":
                px[(x, y)] = COLORS[ch]
    for dx in range(ARM_EXTRA):
        for y in (4, 5):
            px[(16 + dx, y)] = COLORS["#"]

    xs = [p[0] for p in px]
    ys = [p[1] for p in px]
    w = max(xs) - min(xs) + 1
    h = max(ys) - min(ys) + 1
    ox = (GRID - w) // 2 - min(xs)
    oy = (GRID - h) // 2 - min(ys) + 1   # nudge down a touch: feet carry weight
    return {(x + ox, y + oy): c for (x, y), c in px.items()}, (w, h)


CORNER = [4, 2, 1, 1]  # cells trimmed per row for a pixel-rounded tile


def tile_mask(x, y):
    def trimmed(r, c):
        return r < len(CORNER) and c < CORNER[r]
    return not (
        trimmed(y, x) or trimmed(y, GRID - 1 - x)
        or trimmed(GRID - 1 - y, x) or trimmed(GRID - 1 - y, GRID - 1 - x)
    )


def render(art, bg):
    img = Image.new("RGBA", (GRID, GRID), (0, 0, 0, 0))
    if bg is not None:
        for y in range(GRID):
            for x in range(GRID):
                if tile_mask(x, y):
                    img.putpixel((x, y), bg)
    for (x, y), c in art.items():
        img.putpixel((x, y), c)
    return img.resize((GRID * SCALE, GRID * SCALE), Image.NEAREST)


def checker(size, cell=16):
    img = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    for y in range(0, size, cell):
        for x in range(0, size, cell):
            if (x // cell + y // cell) % 2:
                d.rectangle([x, y, x + cell - 1, y + cell - 1], fill=(225, 225, 225, 255))
    return img


def main(out):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    art, (w, h) = compose()
    variants = {
        "cream": (240, 238, 230, 255),
        "dark": (38, 38, 36, 255),
        "clear": None,
    }
    icons = {}
    for name, bg in variants.items():
        icons[name] = render(art, bg)
        icons[name].save(out / f"icon-{name}.png", optimize=True)

    # Preview sheet: each variant big, plus 64 px and 32 px actual size.
    big, pad = 360, 40
    sheet_w = pad + len(icons) * (big + pad)
    sheet_h = 560
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (250, 249, 245, 255))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.load_default(size=22)
        small = ImageFont.load_default(size=15)
    except TypeError:
        font = small = ImageFont.load_default()
    labels = {"cream": "A  cream tile", "dark": "B  dark tile", "clear": "C  transparent"}
    for i, (name, icon) in enumerate(icons.items()):
        x = pad + i * (big + pad)
        d.text((x, 14), labels[name], fill=(40, 40, 38, 255), font=font)
        frame = checker(big) if name == "clear" else Image.new("RGBA", (big, big), (250, 249, 245, 255))
        frame.alpha_composite(icon.resize((big, big), Image.NEAREST))
        sheet.alpha_composite(frame, (x, 50))
        y = 50 + big + 30
        d.text((x, y), "actual size: 64 px, 32 px", fill=(110, 108, 100, 255), font=small)
        for j, s in enumerate((64, 32)):
            for k, under in enumerate(((250, 249, 245, 255), (30, 30, 28, 255))):
                bx = x + j * 150 + k * (s + 14)
                swatch = Image.new("RGBA", (s + 8, s + 8), under)
                swatch.alpha_composite(icon.resize((s, s), Image.LANCZOS), (4, 4))
                sheet.alpha_composite(swatch, (bx, y + 26))
    sheet.save(out / "preview.png")
    print(f"art {w}x{h} on {GRID}x{GRID} grid; icons {GRID * SCALE}px")
    for name in icons:
        p = out / f"icon-{name}.png"
        print(f"{p}  {p.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1])
