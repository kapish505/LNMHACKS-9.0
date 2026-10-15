#!/usr/bin/env python3
"""Trace the roofline of the cut-out reference into scripts/hawa-mahal-silhouette.json.

The facade sits on black, so the mask is simply "not black". Finial spikes are
stripped with a wide horizontal opening (they are drawn as geometry later); the
profile is then symmetrised about the central axis and simplified.

    python3 scripts/hawa-mahal/trace-silhouette.py
"""
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "public/hawa-mahal-footer.png")
OUT = os.path.join(ROOT, "scripts/hawa-mahal-silhouette.json")
AX = 1004

px = np.asarray(Image.open(SRC).convert("RGB")).astype(np.int32)
H, W = px.shape[:2]
mask = px.max(axis=2) > 70
mask = ndimage.binary_opening(mask, structure=np.ones((1, 15)))
mask = ndimage.binary_opening(mask, structure=np.ones((3, 3)))
lab, n = ndimage.label(mask)
sizes = ndimage.sum(mask, lab, range(1, n + 1))
mask = lab == (int(np.argmax(sizes)) + 1)

top = []
for x in range(W):
    col = np.nonzero(mask[:, x])[0]
    top.append(int(col[0]) if len(col) else None)

pts = []
for x in range(0, W, 2):
    y, ym = top[x], top[2 * AX - x] if 0 <= 2 * AX - x < W else None
    if y is None and ym is None:
        continue
    y = ym if y is None else y
    ym = y if ym is None else ym
    pts.append((x, (y + ym) / 2))


def rdp(p, eps):
    if len(p) < 3:
        return p
    a, b = np.array(p[0]), np.array(p[-1])
    d = b - a
    length = np.hypot(*d) or 1
    dist = [abs(np.cross(d, np.array(q) - a)) / length for q in p]
    i = int(np.argmax(dist))
    if dist[i] > eps:
        return rdp(p[: i + 1], eps)[:-1] + rdp(p[i:], eps)
    return [p[0], p[-1]]


simp = rdp(pts, 1.2)
json.dump({"axis": AX, "view": [W, H], "top": [[int(x), round(y, 1)] for x, y in simp]}, open(OUT, "w"))
print(f"{len(pts)} profile samples -> {len(simp)} points, apex y={min(y for _, y in simp)}")
