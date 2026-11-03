"""Pixel-art mockup of scratchpad-finder in a Claude Code terminal: the save
toast and the side pane. The README shows it as assets/ui-mockup.jpg.

Draws at terminal resolution in Monaco 9 (its hand-drawn bitmap size) with
anti-aliasing off, then scales up with nearest-neighbor so every pixel shows.
Glyphs Monaco lacks (the bullet, the result branch, the ellipsis, the cursor)
are drawn pixel by pixel. Text and layout follow hooks/features/notify.ts and
hooks/features/pane.tsx: when those change, update toast() and pane() below.
Monaco ships with macOS, so this runs there.

Usage, from the repo root (write to a folder outside the repo):
    uv run --no-project --with pillow python assets/make_ui_mockup.py <out_dir>

Writes ui-mockup.png and ui-mockup.jpg to <out_dir>. Check them, then copy
ui-mockup.jpg over assets/ui-mockup.jpg.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT = ImageFont.truetype("/System/Library/Fonts/Monaco.ttf", 9)
CW, LH = 6, 12            # character cell, in source pixels
COLS, ROWS = 110, 24
PAD = 6
TITLE_H = 18
SCALE = 3

BG = (38, 38, 36)         # the icon's dark
TITLEBAR = (54, 53, 49)
TEXT = (222, 220, 212)
BRIGHT = (250, 249, 245)
DIM = (140, 138, 128)
FAINT = (88, 86, 80)
ORANGE = (217, 119, 87)   # the icon's Claude orange
GREEN = (120, 190, 110)
TOAST_BG = (50, 49, 46)
LIGHTS = [(237, 106, 94), (245, 191, 79), (98, 197, 84)]

W = PAD * 2 + COLS * CW
H = TITLE_H + PAD * 2 + ROWS * LH
X0, Y0 = PAD, TITLE_H + PAD

SEP = " · "
LEFT_END = 58             # last column of the conversation side
PANE = (61, 108)          # the pane's border columns
DIR = "/private/tmp/claude-501/-Users-you-myproject/9b1e4f2a-7c3d-4e8b-a6f1-2d5c8e0b7a94/scratchpad"
ENTRIES = [
    ("report.md", ["2.1 KB", "just now"]),
    ("icon-dark.jpg", ["30.4 KB", "3m ago"]),
    ("make_logo_jpg.py", ["1.4 KB", "3m ago"]),
    ("samples/", ["9m ago"]),   # a folder: age only, no size
    ("test.txt", ["89 B", "14m ago"]),
]

DISC_5 = [".###.", "#####", "#####", "#####", ".###."]
DISC_7 = ["..###..", ".#####.", "#######", "#######", "#######", ".#####.", "..###.."]


def shorten_start(text, limit):
    """Keeps the end of a long text, as the pane does for its path."""
    return text if len(text) <= limit else "…" + text[-(limit - 1):]


class Term:
    def __init__(self):
        self.img = Image.new("RGB", (W, H), BG)
        self.d = ImageDraw.Draw(self.img)
        self.d.fontmode = "1"   # hard pixels, no smoothing
        _, self.x_top, _, self.base = FONT.getbbox("x")
        self.mid = (self.x_top + self.base) // 2
        self.special = {
            "⏺": self.bullet,
            "⎿": self.branch,
            "…": self.ellipsis,
            "█": self.cursor,
        }

    def pattern(self, x, y, rows, color):
        for dy, row in enumerate(rows):
            for dx, ch in enumerate(row):
                if ch == "#":
                    self.d.point((x + dx, y + dy), fill=color)

    def bullet(self, x, y, color):
        self.pattern(x, y + self.mid - 2, DISC_5, color)

    def branch(self, x, y, color):
        self.d.line([(x + 2, y), (x + 2, y + self.mid)], fill=color)
        self.d.line([(x + 2, y + self.mid), (x + CW - 1, y + self.mid)], fill=color)

    def ellipsis(self, x, y, color):
        for dx in (0, 2, 4):
            self.d.point((x + dx, y + self.base - 1), fill=color)

    def cursor(self, x, y, color):
        self.d.rectangle([x, y + 1, x + CW - 1, y + LH - 2], fill=color)

    def put_at(self, x, y, text, color):
        for ch in text:
            if ch in self.special:
                self.special[ch](x, y, color)
            elif ch != " ":
                self.d.text((x, y), ch, font=FONT, fill=color)
            x += CW
        return x

    def put(self, col, row, spans):
        """Writes (text, color) spans on the character grid."""
        x, y = X0 + col * CW, Y0 + row * LH
        for text, color in spans:
            x = self.put_at(x, y, text, color)

    def box(self, c0, r0, c1, r1, color, fill=None, title=None):
        """A one-pixel frame through the middle of the edge cells, corners rounded."""
        x0, y0 = X0 + c0 * CW + CW // 2, Y0 + r0 * LH + LH // 2
        x1, y1 = X0 + c1 * CW + CW // 2, Y0 + r1 * LH + LH // 2
        if fill:
            self.d.rectangle([x0 + 1, y0 + 1, x1 - 1, y1 - 1], fill=fill)
        self.d.line([(x0 + 2, y0), (x1 - 2, y0)], fill=color)
        self.d.line([(x0 + 2, y1), (x1 - 2, y1)], fill=color)
        self.d.line([(x0, y0 + 2), (x0, y1 - 2)], fill=color)
        self.d.line([(x1, y0 + 2), (x1, y1 - 2)], fill=color)
        for corner in ((x0 + 1, y0 + 1), (x1 - 1, y0 + 1), (x0 + 1, y1 - 1), (x1 - 1, y1 - 1)):
            self.d.point(corner, fill=color)
        if title:
            tx = X0 + (c0 + 2) * CW
            self.d.rectangle([tx, y0, tx + (len(title) + 2) * CW - 1, y0], fill=fill or BG)
            self.put(c0 + 3, r0, [(title, TEXT)])

    def title_bar(self, title):
        self.d.rectangle([0, 0, W - 1, TITLE_H - 1], fill=TITLEBAR)
        for i, color in enumerate(LIGHTS):
            self.pattern(8 + i * 12, (TITLE_H - 7) // 2, DISC_7, color)
        self.put_at((W - len(title) * CW) // 2, 3, title, DIM)


def actions(is_focused=False):
    """A row's Open, Show in folder and Copy path: dim, the focused one bright."""
    first = BRIGHT if is_focused else DIM
    return [("Open", first), (SEP, DIM), ("Show in folder", DIM), (SEP, DIM), ("Copy path", DIM)]


def conversation(t):
    t.put(1, 0, [("> ", DIM), ("write up today's test run as a short report", TEXT)])
    t.put(1, 2, [("⏺ ", TEXT), ("I'll save it to the scratchpad.", TEXT)])
    t.put(1, 4, [("⏺ ", GREEN), ("Write", BRIGHT), ("(/private/tmp/claude-501/…/scratchpad/report.md)", TEXT)])
    t.put(1, 5, [("  ⎿  ", DIM), ("Wrote 42 lines to report.md", DIM)])
    t.put(1, 7, [("⏺ ", TEXT), ("Done. report.md has the summary, the 3 failing", TEXT)])
    t.put(1, 8, [("  tests and the next steps.", TEXT)])


def toast(t):
    # notify.ts: terse, dot-joined; the header names the plugin.
    message = [("Saved report.md", TEXT), (SEP, DIM), ("path copied", TEXT), (SEP, DIM), ("/scratchpad to open", TEXT)]
    c0 = LEFT_END - sum(len(text) for text, _ in message) - 3
    t.box(c0, 14, LEFT_END, 17, FAINT, fill=TOAST_BG)
    t.put(c0 + 2, 15, [("scratchpad-finder", ORANGE)])
    t.put(c0 + 2, 16, message)


def prompt(t):
    t.box(1, 19, LEFT_END, 21, FAINT)
    t.put(3, 20, [("> ", TEXT), ("█", TEXT)])
    t.put(3, 22, [("? for shortcuts", DIM)])


def pane(t):
    p0, p1 = PANE
    t.box(p0, 0, p1, ROWS - 1, FAINT, title="Scratchpad")
    col, width = p0 + 2, p1 - p0 - 3
    t.put(col, 1, [(shorten_start(DIR, width), DIM)])
    t.put(col, 2, actions() + [(SEP, DIM), ("Refresh", DIM)])
    for i, (name, details) in enumerate(ENTRIES):
        row = 4 + i * 2
        t.put(col, row, [(name, BRIGHT), ("  ", DIM), (SEP.join(details), DIM)])
        t.put(col, row + 1, [("  ⎿  ", DIM)] + actions(is_focused=i == 0))


def main(out):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    t = Term()
    t.title_bar("claude · ~/myproject")
    conversation(t)
    toast(t)
    prompt(t)
    pane(t)

    big = t.img.resize((W * SCALE, H * SCALE), Image.NEAREST)
    big.save(out / "ui-mockup.png", optimize=True)
    big.save(out / "ui-mockup.jpg", quality=95, subsampling=0)
    for name in ("ui-mockup.png", "ui-mockup.jpg"):
        path = out / name
        print(f"{path}  {big.width}x{big.height}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
