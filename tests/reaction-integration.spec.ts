import { join, chooseGame } from "./ui";
import { expect, test } from "@playwright/test";
import { expectStableScreenshot } from "./screenshot";
import { monitorAudio, audioStarts } from "./audio";

test("Reaction Race penalizes early/wrong taps, mixes hold rounds, finishes and restarts", async ({
  browser,
  page: host,
}) => {
  await monitorAudio(host);
  test.setTimeout(90_000);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    const client = await context.newPage();
    await host.addInitScript(() => {
      Math.random = () => 0;
    });
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await join(host, client, "Emma");
    await host.getByRole("button", { name: "Sound", exact: true }).click();
    await expect.poll(() => audioStarts(host)).toBeGreaterThan(0);
    const beforeRace = await audioStarts(host);
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    const advanceTo = async (text: string | RegExp) => {
      for (let step = 0; step < 40; step++) {
        const cue = (await host.locator(".race-cue").textContent()) ?? "";
        if (typeof text === "string" ? cue === text : text.test(cue)) return;
        await host.clock.runFor(100);
      }
      throw new Error(`Race did not reach ${text}`);
    };
    await chooseGame(host, "Reaction Race");
    await expectStableScreenshot(
      host,
      ".race-targets",
      `race-ready-${process.platform}.png`,
      {
        maxDiffPixels: 250,
      },
    );
    await host.getByRole("button", { name: "Start Race", exact: true }).click();
    await expect(
      client.getByText("Wait… hands ready!", { exact: true }),
    ).toBeVisible();
    await client.getByRole("button", { name: "Target 2", exact: true }).click();
    await expect(client.locator(".race-target.mistake")).toHaveCount(1);
    await expect(client.locator(".race-target.intended")).toHaveCount(0);
    await expect(client.locator(".race-feedback")).toHaveText(
      "Too early · −25 · Wait for TAP or HOLD",
    );
    await expect(
      client.getByRole("button", { name: "Target 1", exact: true }),
    ).toBeDisabled();
    for (let round = 1; round <= 10; round++) {
      const hold = round === 3 || round === 7;
      await advanceTo(
        hold ? "Hold! Don’t tap anything." : "Hit the marked target!",
      );
      if (round === 1)
        await expect.poll(() => audioStarts(host)).toBeGreaterThan(beforeRace);
      await expect(
        client.getByText(
          hold ? "Hold! Don’t tap anything." : "Hit the marked target!",
          { exact: true },
        ),
      ).toBeVisible();
      if (round === 2) {
        await client
          .getByRole("button", { name: "Target 2", exact: true })
          .click();
        await expect(client.locator(".race-feedback")).toHaveText(
          "Wrong target · −25",
        );
        await expect(client.locator(".race-target.mistake")).toHaveText(
          /2.*TAPPED/,
        );
        await expect(client.locator(".race-target.intended")).toHaveText(
          /1.*TAP/,
        );
        await expectStableScreenshot(
          client,
          ".reaction-game-card",
          `race-wrong-${process.platform}.png`,
          { maxDiffPixels: 250 },
        );
      } else if (!hold && round > 1) {
        await client
          .getByRole("button", { name: "Target 1", exact: true })
          .click();
        await expect(client.locator(".race-feedback")).toContainText("Hit ·");
      }
      await advanceTo("Round complete");
      await expect(
        client.getByText("Round complete", { exact: true }),
      ).toBeVisible();
      if (hold)
        await expect(client.locator(".race-feedback")).toHaveText(
          "Held steady · +75",
        );
      if (round === 3) {
        await expectStableScreenshot(
          client,
          ".reaction-game-card",
          `race-held-${process.platform}.png`,
          { maxDiffPixels: 250 },
        );
        await client.screenshot({
          path: "test-results/reaction-mobile.png",
          fullPage: true,
        });
      }
      await advanceTo(round === 10 ? /wins!|tie!/ : "Wait… hands ready!");
    }
    await expect(
      client.getByText("Round 10 / 10", { exact: false }),
    ).toBeVisible();
    await expect(client.locator(".race-cue")).toContainText("wins!");
    await host.getByRole("button", { name: "Race Again", exact: true }).click();
    await expect(
      client.getByText("Round 1 / 10", { exact: false }),
    ).toBeVisible();
    await host.getByRole("button", { name: "Stop Race", exact: true }).click();
    await expect(
      client.getByText("Race stopped.", { exact: false }),
    ).toBeVisible();
    await expect(
      host.getByRole("button", { name: "Start Race", exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test("a slight touch drag on a reaction target registers without scrolling", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    const page = await context.newPage();
    await page.addInitScript(() => {
      Math.random = () => 0;
    });
    await page.goto("./");
    await page
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await chooseGame(page, "Reaction Race");
    await page.getByRole("button", { name: "Start Race", exact: true }).click();
    await expect(
      page.getByText("Hit the marked target!", { exact: true }),
    ).toBeVisible({ timeout: 8000 });
    const target = page.getByRole("button", { name: "Target 1", exact: true });
    await target.scrollIntoViewIfNeeded();
    const bounds = (await target.boundingBox())!;
    const scroll = await page.evaluate(() => window.scrollY);
    const cdp = await context.newCDPSession(page);
    const point = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ ...point, y: point.y + 20 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.locator(".race-feedback")).toContainText("Hit");
    expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
    await cdp.detach();
  } finally {
    await context.close();
  }
});
