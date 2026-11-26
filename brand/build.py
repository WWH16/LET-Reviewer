"""Builds the LET Prep logo masters into brand/logo/. Run from anywhere: python brand/build.py

The mark: an L and a P share one stem. The P's bowl is an answer bubble that a pencil is shading in.
Every gap is a real cut-out, so the one-colour and reversed versions need no white paint.
"""
import math
import os

INK = '#231F17'      # the app's --color-ink
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logo')

N = (math.cos(math.radians(-45)), math.sin(math.radians(-45)))   # pencil axis and the way the shading moves
D = (-N[1], N[0])                                                 # across the pencil

# Symbol geometry on a 256 canvas. OX/OY centre the mark optically (a little above the middle).
OX, OY = -2, -3
STEM = (44, 72, 40, 154)            # x, y, width, height
FOOT = (44, 186, 136, 40)
CX, CY, RO, RI = 128, 122, 50, 36   # the bubble: centre, outer and inner radius
FRONT, TEETH, AMP = -8, 6, 4        # shading edge position, tooth count, tooth depth
PS = 0.95                           # pencil scale
PW = 12 * PS                        # pencil half width
CUT = PW + 6                        # half width of the gap the pencil cuts through the ring


def f(n):
    return f'{n:.2f}'.rstrip('0').rstrip('.')


def pt(x, y):
    return f'{f(x + OX)} {f(y + OY)}'


def rect(x, y, w, h):
    return f'M{pt(x, y)}H{f(x + w + OX)}V{f(y + h + OY)}H{f(x + OX)}Z'


def along(a, b):
    """A point a along the pencil axis and b across it, measured from the bubble's centre."""
    return CX + a * N[0] + b * D[0], CY + a * N[1] + b * D[1]


def ring_with_gap():
    """The bubble's outline, cut where the pencil crosses it."""
    ao, ai = math.sqrt(RO ** 2 - CUT ** 2), math.sqrt(RI ** 2 - CUT ** 2)
    o1, o2 = along(ao, CUT), along(ao, -CUT)
    i1, i2 = along(ai, -CUT), along(ai, CUT)
    return (f'M{pt(*o1)}A{RO} {RO} 0 1 1 {pt(*o2)}'
            f'L{pt(*i1)}A{RI} {RI} 0 1 0 {pt(*i2)}Z')


def shading():
    """The shaded part of the bubble, up to a toothed edge left by the pencil strokes."""
    r = RI + 2
    period = 2 * r / TEETH

    def F(p):
        x = ((p + r) / period) % 1
        return FRONT + AMP * (1 - 2 * abs(2 * x - 1))

    def xy(p, q):
        return CX + p * D[0] + q * N[0], CY + p * D[1] + q * N[1]

    # tooth corners only, so the edge is a clean zigzag
    ps = sorted({-r + k * period / 2 for k in range(2 * TEETH + 1)})
    edge = [(p, F(p)) for p in ps if p * p + F(p) ** 2 < r * r]
    # where the edge meets the circle at each end
    def meet(p_in, p_out):
        lo, hi = p_in, p_out
        for _ in range(40):
            mid = (lo + hi) / 2
            if mid * mid + F(mid) ** 2 < r * r:
                lo = mid
            else:
                hi = mid
        return lo, F(lo)
    first = meet(edge[0][0], edge[0][0] - period / 2)
    last = meet(edge[-1][0], edge[-1][0] + period / 2)
    pts = [first] + edge + [last]
    d = 'M' + 'L'.join(pt(*xy(p, q)) for p, q in pts)
    # back round the shaded side of the circle (the side away from the pencil)
    start = xy(*first)
    large = 1 if FRONT > 0 else 0   # an edge past the centre leaves more than half the circle shaded
    d += f'A{f(r)} {f(r)} 0 {large} 1 {pt(*start)}Z'
    return d


def pencil():
    """Graphite, wood cone, body and eraser, each a separate piece with real gaps between."""
    tip = FRONT + AMP + 3                     # just clear of the highest tooth
    k = PW / 28                               # cone half width per unit of length

    def P(a, b):
        return pt(*along(tip + a * PS, b))
    g = 10
    graphite = f'M{P(0, 0)}L{P(g, -k * g * PS)}L{P(g, k * g * PS)}Z'
    wood = f'M{P(15, -k * 15 * PS)}L{P(28, -PW)}L{P(28, PW)}L{P(15, k * 15 * PS)}Z'
    body = f'M{P(33, -PW)}L{P(80, -PW)}L{P(80, PW)}L{P(33, PW)}Z'
    eraser = f'M{P(85, -PW)}L{P(94, -PW)}A{f(PW)} {f(PW)} 0 0 1 {P(94, PW)}L{P(85, PW)}Z'
    return [graphite, wood, body, eraser]


def stem_and_foot():
    x, y, w, h = STEM
    fx, fy, fw, fh = FOOT
    return f'M{pt(x, y)}H{f(x + w + OX)}V{f(fy + OY)}H{f(fx + fw + OX)}V{f(fy + fh + OY)}H{f(x + OX)}Z'


def symbol_paths():
    return [stem_and_foot(), ring_with_gap(), shading()] + pencil()


def small_paths():
    """For 48 px and under: the pencil and teeth would blur, so the bubble is shown fully shaded."""
    return [stem_and_foot(), f'M{pt(CX, CY - RO)}A{RO} {RO} 0 1 1 {pt(CX, CY + RO)}A{RO} {RO} 0 1 1 {pt(CX, CY - RO)}Z']


# Wordmark: LET PREP in constructed capitals. Cap height 100, stem 21.
H, S = 100, 21


def wm_rect(x, y, w, h):
    return f'M{f(x)} {f(y)}H{f(x + w)}V{f(y + h)}H{f(x)}Z'


def wm_bowl(x):
    ro, bot = 31, 62
    ri = ro - S
    inner = bot - 2 * S
    return (f'M{f(x)} 0H{f(x + S + 16)}A{ro} {ro} 0 0 1 {f(x + S + 16)} {bot}H{f(x)}Z'
            f'M{f(x + S)} {S}V{S + inner}H{f(x + S + 16)}A{ri} {ri} 0 0 0 {f(x + S + 16)} {S}Z')


LEG = 42 / math.tan(math.radians(60))
GLYPHS = {
    'L': (lambda x: [wm_rect(x, 0, S, H), wm_rect(x, H - S, 60, S)], 60),
    'E': (lambda x: [wm_rect(x, 0, S, H), wm_rect(x, 0, 57, S), wm_rect(x, (H - S) / 2, 51, S), wm_rect(x, H - S, 57, S)], 57),
    'T': (lambda x: [wm_rect(x, 0, 64, S), wm_rect(x + 32 - S / 2, 0, S, H)], 64),
    'P': (lambda x: [wm_rect(x, 0, S, H), wm_bowl(x)], S + 47),
    # the leg runs at exactly 60 degrees: 42 units down, 42 / tan 60 across
    'R': (lambda x: [wm_rect(x, 0, S, H), wm_bowl(x), f'M{f(x + 30)} 58H{f(x + 54)}L{f(x + 54 + LEG)} {H}H{f(x + 30 + LEG)}Z'], 54 + LEG),
}
KERN = {('L', 'E'): 9, ('E', 'T'): 8}


def wordmark_paths():
    x, out, prev = 0, [], None
    for ch in 'LET PREP':
        if ch == ' ':
            x, prev = x + 44, None
            continue
        if prev:
            x += KERN.get((prev, ch), 14)
        make, w = GLYPHS[ch]
        out += make(x)
        x, prev = x + w, ch
    return out, x


def svg(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(w)} {f(h)}" role="img">\n'
            f'  <title>{title}</title>\n{body}</svg>\n')


def paths(ps, fill=INK, rule='nonzero', indent='  '):
    return ''.join(f'{indent}<path fill="{fill}" fill-rule="{rule}" d="{d}"/>\n' for d in ps)


def group(ps, tx, ty, s):
    return f'  <g transform="translate({f(tx)} {f(ty)}) scale({f(s)})">\n{paths(ps, rule="evenodd", indent="    ")}  </g>\n'


def main():
    os.makedirs(OUT, exist_ok=True)
    def write(name, text):
        with open(os.path.join(OUT, name), 'w', encoding='utf-8') as fh:
            fh.write(text)

    sym = symbol_paths()
    write('let-prep-symbol.svg', svg(256, 256, paths(sym, rule='evenodd'), 'LET Prep'))
    write('let-prep-symbol-small.svg', svg(256, 256, paths(small_paths()), 'LET Prep'))

    wm, ww = wordmark_paths()
    write('let-prep-wordmark.svg', svg(ww, H, paths(wm, rule='evenodd'), 'LET Prep'))

    # Symbol bounds on its canvas: x 42..215, y 30..223 (after OX, OY). Crop to them for lockups.
    sx0, sy0, sx1, sy1 = 42, 30, 216, 223
    sw, sh = sx1 - sx0, sy1 - sy0
    # Horizontal: wordmark baseline on the L's foot, cap height twice the foot's thickness.
    cap = 2 * FOOT[3]
    s = cap / H
    # The wordmark starts one foot-thickness past the foot; the pencil sits above it, clear of the letters.
    wx = FOOT[0] + FOOT[2] + OX - sx0 + FOOT[3]
    body = group(sym, -sx0, -sy0, 1) + group(wm, wx, sh - cap, s)
    write('let-prep-horizontal.svg', svg(wx + ww * s, sh, body, 'LET Prep'))

    # Stacked: symbol centred over the wordmark.
    s2 = 1.4 * sw / ww
    w2 = max(sw, ww * s2)
    body = group(sym, (w2 - sw) / 2 - sx0, -sy0, 1) + group(wm, (w2 - ww * s2) / 2, sh + FOOT[3] * 1.2, s2)
    write('let-prep-stacked.svg', svg(w2, sh + FOOT[3] * 1.2 + H * s2, body, 'LET Prep'))


if __name__ == '__main__':
    main()
