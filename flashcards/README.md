# Picture cards

These 19 PNG files replace the hand-drawn SVGs for concepts that were hard to
recognise as an emoji. They are cropped to their transparent bounding box and
scaled onto a 480×480 transparent canvas; the drawings themselves are not
modified.

## Source and licence

- Source: [ARASAAC](https://arasaac.org) — Aragonese Center of Augmentative and
  Alternative Communication
- Author: Sergio Palao
- Copyright holder: Gobierno de Aragón
- Licence: [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
- Attribution wording used by ARASAAC: *Pictogramas: Sergio Palao. Origen:
  ARASAAC (https://arasaac.org). Licencia: CC (BY-NC-SA). Propiedad: Gobierno
  de Aragón.*

The non-commercial clause means these files must not be used in a paid product
without replacing them or obtaining separate permission. The rest of this
project is a free, non-commercial family learning tool.

## Files

| File | Word id | ARASAAC pictogram |
|---|---|---|
| `share.png` | share | [15361](https://arasaac.org/pictograms/15361) |
| `move.png` | move | [2719](https://arasaac.org/pictograms/2719) |
| `fall.png` | fall | [4582](https://arasaac.org/pictograms/4582) |
| `get_dressed.png` | get_dressed | [34494](https://arasaac.org/pictograms/34494) |
| `prepare.png` | prepare | [25738](https://arasaac.org/pictograms/25738) |
| `push.png` | push | [4638](https://arasaac.org/pictograms/4638) |
| `catch.png` | catch | [24208](https://arasaac.org/pictograms/24208) |
| `blow.png` | blow | [4747](https://arasaac.org/pictograms/4747) |
| `take_off.png` | take_off | [36582](https://arasaac.org/pictograms/36582) |
| `put_on.png` | put_on | [36577](https://arasaac.org/pictograms/36577) |
| `donkey.png` | donkey | [2291](https://arasaac.org/pictograms/2291) |
| `skirt.png` | skirt | [2391](https://arasaac.org/pictograms/2391) |
| `dress.png` | dress | [2613](https://arasaac.org/pictograms/2613) |
| `belt.png` | belt | [2336](https://arasaac.org/pictograms/2336) |
| `yogurt.png` | yogurt | [2618](https://arasaac.org/pictograms/2618) |
| `cashews.png` | cashews | [35141](https://arasaac.org/pictograms/35141) |
| `snack.png` | snack | [4694](https://arasaac.org/pictograms/4694) |
| `papers.png` | papers | [2398](https://arasaac.org/pictograms/2398) |
| `sky.png` | sky | [38270](https://arasaac.org/pictograms/38270) |

Original downloads used `https://static.arasaac.org/pictograms/<id>/<id>_500.png`.

## Regenerating

```bash
python3 tools/fetch_flashcards.py
```

The script downloads the 19 source files, trims transparent margins and writes
the normalized PNGs into this folder. It needs Pillow and network access; it is
not part of the offline app or the GitHub Actions validation.
