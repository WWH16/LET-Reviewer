# LET Prep logo

![LET Prep horizontal logo](logo/let-prep-horizontal-black-1200.png)

## The idea

An **L** and a **P** share one stem. The P's bowl is an answer bubble, and a pencil is shading it in, the way every LET answer is marked. The toothed edge is where the pencil strokes stop.

The mark has no caps, books or apples, the usual education clichés. It uses the app's own colours: ink on pencil yellow.

## Files

| File | Use |
|---|---|
| `logo/let-prep-symbol.svg` | Master symbol, ink. Use at 48 px and up. |
| `logo/let-prep-symbol-small.svg` | Small-size cut with a solid bubble and no pencil. Use under 48 px (favicons, tiny avatars). |
| `logo/let-prep-horizontal.svg` | Main lockup: symbol and wordmark side by side. |
| `logo/let-prep-stacked.svg` | Symbol over wordmark, for square spaces. |
| `logo/let-prep-wordmark.svg` | Wordmark alone. |
| `logo/*-black.svg`, `logo/*-white.svg` | One-colour versions. White is for dark backgrounds. |
| `logo/*-1200.png`, `logo/*-512.png`, `logo/*-1024.png` | Transparent PNGs for documents and slides. |
| `logo/let-prep-symbol-app-icon.svg` | Ink symbol on a pencil-yellow tile. |
| `web/` | Favicon (ICO, SVG, PNG), app icons, maskable icon, `site.webmanifest` and a `<head>` snippet. The app already uses these from `public/`. |
| `presentation.html`, `slides/` | Presentation board with mockups. |

Every file is pure vector shapes: no live text, no images inside, and no white paint used as a cut-out. The wordmark is drawn from shapes, so no font licence is needed.

## Colours

| Name | HEX | RGB | CMYK (approx.) | Nearest Pantone (check against a swatch book) |
|---|---|---|---|---|
| Ink | `#231F17` | 35 31 23 | 0 11 34 86 | Black 7 C |
| Pencil yellow | `#FDCA3A` | 253 202 58 | 0 20 77 1 | 123 C |
| Paper | `#FBFAF6` | 251 250 246 | 0 0 2 2 | (paper white) |

These are the app's own `--color-ink`, `--color-inverse` and `--color-paper` tokens.

Approved combinations:

- Ink on paper or white: 15.7:1 contrast. This is the default.
- Ink on pencil yellow: 10.7:1. Use it for the app icon, merchandise and feature blocks.
- White on ink, or on any dark photo or colour: use the `-white` files.

Never put yellow logo art on paper or white: the contrast is only 1.5:1.

## Clear space and minimum size

- **Clear space:** keep a margin around the logo equal to the thickness of the L's foot, on every side.
- **Symbol:** 48 px or 12 mm minimum. Below that, use `let-prep-symbol-small.svg`.
- **Horizontal lockup:** 120 px or 30 mm wide minimum.

## Don't

- Stretch, squash, tilt or rotate the mark.
- Redraw the wordmark in another font, or set "LET Prep" in type next to the symbol as a lockup.
- Add outlines, shadows, glows or gradients.
- Change the colours, or use the full pencil mark below 48 px.
- Move the pencil or change the wordmark's position in the lockups.
- Place the ink logo on dark or busy backgrounds without a clear tile.

## Rebuilding

The masters come from `build.py`, so change the geometry there, not in the SVGs.

```powershell
python brand/build.py
```

The variants and web icons were exported with the `logo-design` skill's `export_variants.py`. Use the full symbol for the app icons and the small cut for favicons. Then copy `web/apple-touch-icon.png` to `public/icon-180.png`, and `web/icon-192.png`, `icon-512.png`, `maskable-512.png`, `favicon.ico` and `favicon.svg` to `public/`.

## Open items

- **Trademark.** No trademark search has been done. Run one (IPOPHL for the Philippines) before a public launch.
- **Pantone.** The Pantone matches are estimates from screen colour. Check them against a printed swatch book before ordering print.
