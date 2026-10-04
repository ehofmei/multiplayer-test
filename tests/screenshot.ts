import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";

const regular = readFileSync(
  new URL("./fixtures/fonts/AtkinsonHyperlegible-Regular.ttf", import.meta.url),
).toString("base64");
const bold = readFileSync(
  new URL("./fixtures/fonts/AtkinsonHyperlegible-Bold.ttf", import.meta.url),
).toString("base64");

// Only the snapshot region gets a fixture font. Remove it before exercising the
// real system/alternate fonts in the responsive layout checks that follow.
export async function expectStableScreenshot(
  page: Page,
  selector: string,
  name: string,
  options: { maxDiffPixels?: number } = {},
) {
  const style = await page.addStyleTag({
    content: `
      @font-face {
        font-family: "Snapshot Fixture";
        src: url("data:font/ttf;base64,${regular}") format("truetype");
        font-weight: 100 599;
      }
      @font-face {
        font-family: "Snapshot Fixture";
        src: url("data:font/ttf;base64,${bold}") format("truetype");
        font-weight: 600 900;
      }
      ${selector}, ${selector} * {
        font-family: "Snapshot Fixture" !important;
        line-height: 1.25 !important;
      }
    `,
  });
  try {
    await page.evaluate(async () => {
      await Promise.all([
        document.fonts.load('400 14px "Snapshot Fixture"'),
        document.fonts.load('700 14px "Snapshot Fixture"'),
      ]);
      await document.fonts.ready;
    });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.fonts.check('400 14px "Snapshot Fixture"') &&
            document.fonts.check('700 14px "Snapshot Fixture"'),
        ),
      )
      .toBe(true);
    const region = page.locator(selector);
    await region.scrollIntoViewIfNeeded();
    const bounds = await region.boundingBox();
    if (!bounds) throw new Error(`Snapshot region is not visible: ${selector}`);
    // System fonts outside the region can place it at a fractional pixel. Align
    // its origin so clipping does not rasterize borders differently across OSes.
    const alignment = await page.addStyleTag({
      content: `${selector} { transform: translate(${Math.round(bounds.x) - bounds.x}px, ${Math.round(bounds.y) - bounds.y}px); }`,
    });
    try {
      // Regions with more text need a larger absolute rasterization allowance.
      // Callers set that budget explicitly; image dimensions stay strict.
      await expect(region).toHaveScreenshot(name, {
        maxDiffPixels: options.maxDiffPixels ?? 64,
      });
    } finally {
      await alignment.evaluate((element) => element.remove());
    }
  } finally {
    await style.evaluate((element) => element.remove());
  }
}
