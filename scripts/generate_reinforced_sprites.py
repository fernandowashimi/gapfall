"""Generate reinforced_ore and cracked_ore sprites matching Gapfall pixel style."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "assets" / "sprites"
STONE = ROOT / "src" / "assets" / "sprites" / "stone_block.png"

# Palette
TRANSPARENT = (0, 0, 0, 0)
SHADOW = (24, 34, 48, 255)
DARK = (37, 45, 58, 255)
MID = (55, 65, 81, 255)
LIGHT = (75, 85, 99, 255)
HIGHLIGHT = (107, 114, 128, 255)
RIM = (148, 163, 184, 255)

STEEL_DARK = (30, 41, 59, 255)
STEEL_MID = (51, 65, 85, 255)
STEEL_LIGHT = (71, 85, 105, 255)
STEEL_SHINE = (100, 116, 139, 255)

COPPER_DARK = (154, 52, 18, 255)
COPPER = (217, 119, 6, 255)
COPPER_BRIGHT = (251, 191, 36, 255)

BOLT = (180, 83, 9, 255)
BAND = (120, 53, 15, 255)

CRACK_DARK = (15, 23, 42, 255)
CRACK_MID = (30, 41, 59, 255)
CRACK_EDGE = (203, 213, 225, 255)


def load_mask() -> list[list[bool]]:
    stone = Image.open(STONE).convert("RGBA")
    px = stone.load()
    return [[px[x, y][3] > 0 for x in range(90)] for y in range(45)]


def blank() -> Image.Image:
    return Image.new("RGBA", (90, 45), TRANSPARENT)


def set_px(img: Image.Image, x: int, y: int, color: tuple[int, int, int, int]) -> None:
    if 0 <= x < 90 and 0 <= y < 45:
        img.putpixel((x, y), color)


def draw_rect(
    img: Image.Image,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    color: tuple[int, int, int, int],
) -> None:
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            set_px(img, x, y, color)


def draw_reinforced_ore(mask: list[list[bool]]) -> Image.Image:
    img = blank()
    px = img.load()

    for y in range(45):
        for x in range(90):
            if not mask[y][x]:
                continue
            # Cool steel body with subtle vertical banding
            band = (x // 6) % 2
            if y <= 4:
                px[x, y] = RIM
            elif y >= 40:
                px[x, y] = STEEL_DARK
            elif band == 0:
                px[x, y] = STEEL_MID if (x + y) % 3 else STEEL_LIGHT
            else:
                px[x, y] = STEEL_DARK if (x + y) % 4 else STEEL_MID

    # Heavy top/bottom reinforcement bands
    for x in range(6, 84):
        if mask[6][x]:
            set_px(img, x, 6, BAND)
            set_px(img, x, 7, COPPER_DARK)
        if mask[37][x]:
            set_px(img, x, 37, BAND)
            set_px(img, x, 38, COPPER_DARK)

    # Side brackets
    for y in range(10, 35):
        for x in range(5, 9):
            if mask[y][x]:
                set_px(img, x, y, COPPER if y % 4 == 0 else COPPER_DARK)
        for x in range(81, 85):
            if mask[y][x]:
                set_px(img, x, y, COPPER if y % 4 == 0 else COPPER_DARK)

    # Corner plates
    draw_rect(img, 8, 9, 17, 16, COPPER_DARK)
    draw_rect(img, 9, 10, 16, 15, COPPER)
    draw_rect(img, 72, 9, 81, 16, COPPER_DARK)
    draw_rect(img, 73, 10, 80, 15, COPPER)
    draw_rect(img, 8, 26, 17, 33, COPPER_DARK)
    draw_rect(img, 9, 27, 16, 32, COPPER)
    draw_rect(img, 72, 26, 81, 33, COPPER_DARK)
    draw_rect(img, 73, 27, 80, 32, COPPER)

    # Rivets on plates
    rivets = [
        (10, 11),
        (15, 14),
        (74, 11),
        (79, 14),
        (10, 28),
        (15, 31),
        (74, 28),
        (79, 31),
        (44, 8),
        (45, 8),
        (44, 36),
        (45, 36),
    ]
    for x, y in rivets:
        set_px(img, x, y, BOLT)
        set_px(img, x + 1, y, COPPER_BRIGHT)

    # Center hazard stripe panel - very visible
    for y in range(14, 30):
        for x in range(34, 56):
            if not mask[y][x]:
                continue
            stripe = ((x - 34) + (y - 14)) % 8 < 4
            px[x, y] = COPPER_BRIGHT if stripe else COPPER_DARK

    # Inner shadow on body edges
    for y in range(45):
        for x in range(90):
            if not mask[y][x]:
                continue
            current = px[x, y]
            if current in (COPPER, COPPER_DARK, COPPER_BRIGHT, BAND, BOLT):
                continue
            if x > 0 and not mask[y][x - 1]:
                px[x, y] = STEEL_DARK
            if y > 0 and not mask[y - 1][x] and px[x, y] != RIM:
                px[x, y] = STEEL_SHINE

    return img


def draw_pixel_crack(
    img: Image.Image,
    mask: list[list[bool]],
    points: list[tuple[int, int]],
) -> None:
    px = img.load()
    painted: set[tuple[int, int]] = set()

    def stamp(x: int, y: int) -> None:
        for dy in range(0, 2):
            for dx in range(0, 2):
                nx, ny = x + dx, y + dy
                if 0 <= nx < 90 and 0 <= ny < 45 and mask[ny][nx]:
                    painted.add((nx, ny))

    for index in range(len(points) - 1):
        x0, y0 = points[index]
        x1, y1 = points[index + 1]
        x, y = x0, y0
        while x != x1 or y != y1:
            stamp(x, y)
            if x != x1:
                x += 1 if x1 > x else -1
            elif y != y1:
                y += 1 if y1 > y else -1
        stamp(x1, y1)

    for x, y in painted:
        px[x, y] = CRACK_DARK
        if x > 0 and mask[y][x - 1] and (x - 1, y) not in painted:
            if px[x - 1, y] not in (CRACK_DARK, CRACK_MID):
                px[x - 1, y] = CRACK_EDGE
        if y > 0 and mask[y - 1][x] and (x, y - 1) not in painted:
            if px[x, y - 1] not in (CRACK_DARK, CRACK_MID):
                px[x, y - 1] = CRACK_EDGE


def draw_cracked_ore(reinforced: Image.Image, mask: list[list[bool]]) -> Image.Image:
    img = reinforced.copy()
    px = img.load()

    # Chip hazard panel
    for y in range(14, 30):
        for x in range(34, 56):
            if mask[y][x] and (x + y) % 5 == 0:
                px[x, y] = CRACK_MID

    cracks = [
        [(18, 10), (24, 14), (22, 20), (28, 26), (24, 32), (20, 36)],
        [(48, 8), (52, 12), (48, 18), (54, 24), (50, 30), (46, 34)],
        [(68, 12), (62, 16), (66, 22), (60, 28), (64, 34), (70, 38)],
        [(38, 18), (42, 22), (38, 26), (42, 30)],
    ]
    for path in cracks:
        draw_pixel_crack(img, mask, path)

    # Missing chunks at crack intersections
    chunks = [(24, 20), (50, 24), (64, 28), (40, 24)]
    for x, y in chunks:
        for dy in range(-1, 2):
            for dx in range(-1, 2):
                nx, ny = x + dx, y + dy
                if 0 <= nx < 90 and 0 <= ny < 45 and mask[ny][nx]:
                    px[nx, ny] = CRACK_DARK

    # Re-draw a few copper flecks inside cracks for readability
    flecks = [(26, 22), (52, 20), (66, 30)]
    for x, y in flecks:
        set_px(img, x, y, COPPER_DARK)
        set_px(img, x + 1, y, COPPER)

    return img


def main() -> None:
    mask = load_mask()
    reinforced = draw_reinforced_ore(mask)
    cracked = draw_cracked_ore(reinforced, mask)
    reinforced.save(OUT / "reinforced_ore.png")
    cracked.save(OUT / "cracked_ore.png")
    print("Wrote", OUT / "reinforced_ore.png", OUT / "cracked_ore.png")


if __name__ == "__main__":
    main()
