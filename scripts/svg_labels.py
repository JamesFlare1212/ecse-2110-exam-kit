"""Localize renderer-owned SVG labels and embed the existing local CJK font.

Only ordinary text nodes are translated. Math spans and original exam crops
retain their source notation. Embedded font subsets keep SVG images independent
of the reader's installed fonts and make no runtime font requests.
"""
import base64
from functools import lru_cache
from io import BytesIO
import re
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont


@lru_cache(maxsize=128)
def subset_font(path, codepoints):
    """Physically remove unused glyphs; unicode-range alone only selects a face."""
    with TTFont(path, recalcTimestamp=False) as font:
        options = subset.Options()
        options.ignore_missing_unicodes = False
        # Retain the font's attribution and license in each embedded subset.
        options.name_IDs += [13, 14]
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(unicodes=codepoints)
        subsetter.subset(font)
        output = BytesIO()
        font.save(output)
        return output.getvalue()


def localize(path, labels):
    svg = path.read_text()
    used = set()
    for original, translated in labels.items():
        needle = '>' + original + '<'
        if needle in svg:
            svg = svg.replace(needle, '>' + translated + '<')
            used.update(ord(char) for char in translated if ord(char) > 127)
    if not used:
        return
    root = Path(__file__).resolve().parents[1]
    fonts = root / 'node_modules/@fontsource-variable/noto-sans-sc'
    css = (fonts / 'index.css').read_text()
    faces = []
    missing = used.copy()
    for block in re.findall(r'@font-face\s*\{([^}]+)\}', css):
        ranges = re.search(r'unicode-range:\s*([^;]+)', block).group(1)
        covered = set()
        for item in ranges.split(','):
            bounds = item.strip()[2:].split('-')
            low, high = int(bounds[0], 16), int(bounds[-1], 16)
            covered.update(code for code in used if low <= code <= high)
        if not covered:
            continue
        file = fonts / re.search(r'url\(\./([^\)]+)\)', block).group(1)
        encoded = base64.b64encode(subset_font(file, tuple(sorted(covered)))).decode()
        ranges_used = ','.join(f'U+{code:X}' for code in sorted(covered))
        faces.append("@font-face{font-family:'Fieldnotes Chinese';font-weight:100 900;src:url(data:font/woff2;base64," + encoded + ") format('woff2');unicode-range:" + ranges_used + ';}')
        missing -= covered
    if missing:
        raise ValueError(f'Missing local font characters: {missing}')
    styles = ''.join(faces) + "text{font-family:'Fieldnotes Chinese','DejaVu Sans',sans-serif!important}"
    svg = svg.replace('<defs>', '<defs>\n<style type="text/css">' + styles + '</style>', 1)
    path.write_text(svg)
