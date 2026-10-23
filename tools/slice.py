"""Slice tall screenshots into viewable chunks: python tools/slice.py <png> <chunk_px>"""
import sys
from pathlib import Path
from PIL import Image

src = Path(sys.argv[1])
chunk = int(sys.argv[2]) if len(sys.argv) > 2 else 1400
im = Image.open(src)
out = src.parent / "slices"
out.mkdir(exist_ok=True)
for i, top in enumerate(range(0, im.height, chunk)):
    im.crop((0, top, im.width, min(top + chunk, im.height))).save(out / f"{src.stem}-{i:02d}.png")
    print(out / f"{src.stem}-{i:02d}.png")
