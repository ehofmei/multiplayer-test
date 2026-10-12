import { expect, test, type Page } from "@playwright/test";
import {
  chooseGame,
  closePanels,
  connectionDetails,
  expectScreenFits,
  join,
} from "./ui";
import { expectStableScreenshot } from "./screenshot";
import { audioStarts, monitorAudio } from "./audio";

const cell = (page: Page, number: number) =>
  page.getByRole("button", { name: `Cell ${number}`, exact: true });

async function create(page: Page) {
  await page.goto("./");
  await page.getByLabel("Your name").fill("Family Player");
  await page.getByRole("button", { name: "Create Game", exact: true }).click();
  await chooseGame(page, "Shared Lights");
}

async function settled(page: Page) {
  await expect
    .poll(() =>
      page
        .locator(".lights-board")
        .evaluate((board) => board.getAnimations({ subtree: true }).length),
    )
    .toBe(0);
}

async function fit(page: Page) {
  await expectScreenFits(page);
  const metrics = await page.locator(".lights-board").evaluate((board) => {
    const bounds = board.getBoundingClientRect();
    return {
      width: board.clientWidth,
      scrollWidth: board.scrollWidth,
      height: board.clientHeight,
      scrollHeight: board.scrollHeight,
      cells: [...board.querySelectorAll("button")].map((button) => {
        const b = button.getBoundingClientRect();
        const lens = button.querySelector(".light")!.getBoundingClientRect();
        const label = button
          .querySelector(".lamp-label")!
          .getBoundingClientRect();
        return {
          width: b.width,
          height: b.height,
          left: b.left - bounds.left,
          right: bounds.right - b.right,
          bottom: bounds.bottom - b.bottom,
          lens: lens.width,
          roundness: Math.abs(lens.width - lens.height),
          clearance: label.top - lens.bottom,
          labelBottom: b.bottom - label.bottom,
          overflow: button.scrollHeight - button.clientHeight,
        };
      }),
    };
  });
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.height + 1);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width + 1);
  expect(metrics.cells).toHaveLength(16);
  for (const b of metrics.cells) {
    expect(b.width).toBeGreaterThanOrEqual(44);
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(b.left).toBeGreaterThanOrEqual(0);
    expect(b.right).toBeGreaterThanOrEqual(0);
    expect(b.bottom).toBeGreaterThanOrEqual(0);
    expect(b.lens).toBeGreaterThanOrEqual(24);
    expect(b.roundness).toBeLessThanOrEqual(1);
    expect(b.clearance).toBeGreaterThanOrEqual(4);
    expect(b.labelBottom).toBeGreaterThanOrEqual(4);
    expect(b.overflow).toBeLessThanOrEqual(1);
  }
}

test("lamp states, keyboard focus and diagnostics have deliberate compositions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await create(page);
  await expect(page.locator(".lights-board")).not.toContainText("Revision");
  await fit(page);
  await expectStableScreenshot(
    page,
    ".lights-board",
    `lights-off-phone-${process.platform}.png`,
    { maxDiffPixels: 180 },
  );
  await cell(page, 1).focus();
  await page.keyboard.press("Space");
  await expect(cell(page, 1)).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Tab");
  await expect(cell(page, 2)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(cell(page, 2)).toHaveAttribute("aria-pressed", "true");
  await cell(page, 6).click();
  await cell(page, 16).click();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(cell(page, 16)).toBeFocused();
  await settled(page);
  await expectStableScreenshot(
    page,
    ".lights-board",
    `lights-mixed-focus-phone-${process.platform}.png`,
    { maxDiffPixels: 180 },
  );
  await connectionDetails(page);
  await expect(page.locator(".debug")).toContainText("Revision 4");
  await expect(
    page.getByText("No active peer connections.", { exact: true }),
  ).toBeVisible();
  await closePanels(page);
  for (const number of [3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    await cell(page, number).click();
  await settled(page);
  await page.setViewportSize({ width: 1180, height: 820 });
  await fit(page);
  await expectStableScreenshot(
    page,
    ".lights-board",
    `lights-on-ipad-${process.platform}.png`,
    { maxDiffPixels: 180 },
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 844, height: 390 });
  await cell(page, 8).click();
  await settled(page);
  await fit(page);
  await expectStableScreenshot(
    page,
    ".lights-board",
    `lights-landscape-reduced-${process.platform}.png`,
    { maxDiffPixels: 180 },
  );
});

test("all lamps stay readable across household and small-screen font metrics", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await create(page);
  await cell(page, 1).click();
  await cell(page, 16).click();
  for (const [width, height] of [
    [402, 874],
    [440, 956],
    [874, 402],
    [956, 440],
    [1180, 820],
    [1080, 810],
    [390, 844],
    [320, 700],
    [320, 568],
    [844, 390],
    [768, 1024],
    [1280, 720],
  ]) {
    await page.setViewportSize({ width, height });
    for (const tall of [false, true]) {
      const style = tall
        ? await page.addStyleTag({
            content: ":root { font-family: serif; line-height: 1.6; }",
          })
        : null;
      await fit(page);
      await style?.evaluate((element) => element.remove());
    }
    await page.screenshot({
      path: `test-results/lights-${width}x${height}.png`,
    });
  }
});

test("confirmed feedback stays bounded and does not replay on recovery or game switching", async ({
  page,
}) => {
  await monitorAudio(page);
  await create(page);
  await cell(page, 1).click();
  expect(await audioStarts(page)).toBe(0);
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  const before = await audioStarts(page);
  await cell(page, 1).click();
  expect(
    await page
      .locator(".lights-board")
      .evaluate((board) => board.getAnimations({ subtree: true }).length),
  ).toBe(1);
  await expect.poll(() => audioStarts(page)).toBe(before + 1);
  for (let i = 0; i < 20; i++) await cell(page, 7).click();
  await expect(cell(page, 7)).toHaveAttribute("aria-pressed", "false");
  expect(
    await page
      .locator(".lights-board")
      .evaluate((board) => board.getAnimations({ subtree: true }).length),
  ).toBeLessThanOrEqual(16);
  await settled(page);
  const sounded = await audioStarts(page);
  // Simulate the browser lifecycle event without injecting any game state.
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    ),
  );
  expect(await audioStarts(page)).toBe(sounded);
  await cell(page, 8).click(); // First state after recovery establishes a silent baseline.
  expect(
    await page
      .locator(".lights-board")
      .evaluate((board) => board.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await settled(page);
  expect(await audioStarts(page)).toBe(sounded);
  await cell(page, 8).click();
  await expect.poll(() => audioStarts(page)).toBe(sounded + 1);
  await page.getByRole("button", { name: "Choose Game", exact: true }).click();
  await chooseGame(page, "Shared Lights");
  await expect(cell(page, 1)).toHaveAttribute("aria-pressed", "false");
  await settled(page);
  expect(await audioStarts(page)).toBe(sounded + 1);
});

test("client pressing responds locally while ON/OFF waits for host confirmation", async ({
  browser,
  page: host,
}) => {
  await create(host);
  const context = await browser.newContext();
  try {
    const client = await context.newPage();
    await client.addInitScript(() => {
      const send = RTCDataChannel.prototype.send;
      RTCDataChannel.prototype.send = function (data: string) {
        if (JSON.parse(data).type === "toggle") {
          (window as unknown as { releaseToggle: () => void }).releaseToggle =
            () => send.call(this, data);
          return;
        }
        return send.call(this, data);
      };
    });
    await join(host, client, "Emma");
    const button = cell(client, 1);
    const b = (await button.boundingBox())!;
    await client.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await client.mouse.down();
    expect(
      await button
        .locator(".light")
        .evaluate((lens) => getComputedStyle(lens).transform),
    ).not.toBe("none");
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await client.mouse.up();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(cell(host, 1)).toHaveAttribute("aria-pressed", "false");
    await client.evaluate(() =>
      (window as unknown as { releaseToggle: () => void }).releaseToggle(),
    );
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(cell(host, 1)).toHaveAttribute("aria-pressed", "true");
    expect(
      await button
        .locator(".light")
        .evaluate((lens) => lens.getAnimations().length),
    ).toBe(1);
    await settled(client);
  } finally {
    await context.close();
  }
});

test("cancelled touch releases the lamp without toggling, then ordinary taps work", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 402, height: 874 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    await create(page);
    const button = cell(page, 1);
    const b = (await button.boundingBox())!;
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchCancel",
      touchPoints: [],
    });
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await button.tap();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await button.tap();
    await expect(button).toHaveAttribute("aria-pressed", "false");
  } finally {
    await context.close();
  }
});

test("eight players share the same board and late joins never replay old lamp effects", async ({
  browser,
  page: host,
}) => {
  test.setTimeout(180_000);
  await host.setViewportSize({ width: 440, height: 956 });
  await create(host);
  await cell(host, 1).click();
  const contexts = [];
  try {
    for (let index = 0; index < 7; index++) {
      const context = await browser.newContext();
      contexts.push(context);
      const client = await context.newPage();
      await join(host, client, `Family player ${index + 2} with a long name`);
      await expect(cell(client, 1)).toHaveAttribute("aria-pressed", "true");
      expect(
        await client
          .locator(".lights-board")
          .evaluate((board) => board.getAnimations({ subtree: true }).length),
      ).toBe(0);
      await cell(client, index + 2).click();
      await expect(cell(host, index + 2)).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
    await expect(host.getByText("8/8", { exact: true })).toBeVisible();
    await settled(host);
    await fit(host);
    await expectStableScreenshot(
      host,
      "main",
      `lights-eight-phone-${process.platform}.png`,
      { maxDiffPixels: 250 },
    );
  } finally {
    for (const context of contexts) await context.close();
  }
});
