#!/usr/bin/env python3
"""Trace un rectangle rouge par capture : lit les brutes, écrit dans delivery/ (idempotent).
Usage : annoter-captures.py <annotations.json> <dossier-brutes> <dossier-sortie>"""
import json, sys, os
from PIL import Image, ImageDraw

ann_path, src, dst = sys.argv[1:4]
ann = json.load(open(ann_path))
RED = (220, 53, 69)
for name, (x, y, w, h) in ann.items():
    im = Image.open(os.path.join(src, name)).convert("RGBA")
    W, H = im.size
    glow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    for i in range(1, 5):  # halo extérieur 4 px, rgba(220,53,69,0.2)
        g.rectangle([x - i, y - i, x + w - 1 + i, y + h - 1 + i], outline=RED + (51,), width=1)
    im = Image.alpha_composite(im, glow)
    d = ImageDraw.Draw(im)
    d.rectangle([x, y, x + w - 1, y + h - 1], outline=RED + (255,), width=3)  # bordure 3 px, sans remplissage
    assert 0 <= x and 0 <= y and x + w <= W and y + h <= H, name
    im.convert("RGB").save(os.path.join(dst, name))
print(len(ann), "captures annotées")
