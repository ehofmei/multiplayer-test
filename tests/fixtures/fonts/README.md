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

Home has separate `darwin` and `linux` baselines because CoreText and FreeType
still rasterize its large heading and introductory text differently with the same
font files. The Linux baseline was reviewed from the failing GitHub Actions
artifact. Both retain the 250-pixel allowance; other regions share their existing
baselines. Normal-font viewport checks remain independent of these images.
