# Screenshot font fixture

Atkinson Hyperlegible regular and bold, copyright 2020 Braille Institute of
America, Inc., are redistributed under the SIL Open Font License in OFL.txt.
Sources: [regular](https://github.com/google/fonts/blob/main/ofl/atkinsonhyperlegible/AtkinsonHyperlegible-Regular.ttf),
[bold](https://github.com/google/fonts/blob/main/ofl/atkinsonhyperlegible/AtkinsonHyperlegible-Bold.ttf).

These files are used only by `tests/screenshot.ts`; they are not shipped with the
app. Embedding the same font in the ship-panel and cycle-arena screenshot regions
avoids different macOS/Linux system-font metrics. The helper waits for both faces,
keeps image dimensions strict, and defaults to at most 64 differing rasterized
pixels. Ship panels explicitly allow 512 pixels to cover the observed 396-pixel
Linux difference; their legends, button count and selected values are asserted
separately. The helper removes the fixture style before normal-font and taller-font
layout checks.
