# Screenshot font fixture

Atkinson Hyperlegible regular and bold, copyright 2020 Braille Institute of
America, Inc., are redistributed under the SIL Open Font License in OFL.txt.
Sources: [regular](https://github.com/google/fonts/blob/main/ofl/atkinsonhyperlegible/AtkinsonHyperlegible-Regular.ttf),
[bold](https://github.com/google/fonts/blob/main/ofl/atkinsonhyperlegible/AtkinsonHyperlegible-Bold.ttf).

These files are used only by `tests/screenshot.ts`; they are not shipped with the
app. During each baseline capture, the entire page uses the fixture font and a
fixed line height. Text outside the captured region also determines its available
space, so normalizing only the region leaves macOS/Linux geometry differences.
The helper waits for both faces, aligns the region to pixel boundaries, keeps image
dimensions strict, and defaults to at most 64 differing rasterized pixels.
Text-heavy regions have explicit small rasterization allowances. The helper removes
the fixture style before normal-font and taller-font layout checks. Long names are
checked separately from the Home baseline to avoid platform-specific native input
scroll positions.

The two full-screen baselines (Home and game library) have separate `darwin` and
`linux` images because CoreText and FreeType still rasterize their text and fallback
icon glyphs differently with the same font files. Both Linux images were reviewed
from failing GitHub Actions artifacts. Both screens retain the 250-pixel allowance;
all seven game-region baselines remain shared and pass on both platforms.
Normal-font viewport checks remain independent of these images. New full-screen
baselines should include reviewed images from both macOS and Linux rather than
assuming a local macOS pass certifies the Linux comparison.
