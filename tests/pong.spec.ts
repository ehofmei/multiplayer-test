import { test, expect, type Page } from "@playwright/test";
import {
  chooseGame,
  closePanels,
  expectScreenFits,
  join,
  returnHome,
  showHelp,
} from "./ui";
import { expectStableScreenshot } from "./screenshot";

const sizes = [
  { width: 320, height: 568 },
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1280, height: 720 },
];
const card = (page: Page) => page.locator(".pong-game-card");
const bumpers = (page: Page) => page.locator(".pong-bumper");
async function fit(page: Page) {
  for (const size of sizes) {
    await page.setViewportSize(size);
    for (const font of ["system", "tall"]) {
      const style =
        font === "tall"
          ? await page.addStyleTag({
              content: ":root{font-family:serif;line-height:1.6}",
            })
          : null;
      await expectScreenFits(page);
      const court = (await page.locator(".pong-court").boundingBox())!;
      expect(court.width).toBeGreaterThan(200);
      const box = (await card(page).boundingBox())!;
      expect(court.y + court.height).toBeLessThan(box.y + box.height);
      await page.screenshot({
        path: `test-results/pong-bumpers-${size.width}x${size.height}-${font}.png`,
      });
      await style?.evaluate((e) => e.remove());
    }
  }
}

test("Pong pairs, warns, adds four bumpers, flashes impacts, pauses, resets each point and handles background/disconnect", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(180000);
  const context = await browser.newContext({
    viewport: sizes[2],
    hasTouch: true,
    reducedMotion: "reduce",
  });
  try {
    const client = await context.newPage();
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await join(host, client, "Emma");
    await chooseGame(host, "Pong");
    await host.setViewportSize(sizes[2]);
    await host.clock.install({ time: new Date("2026-10-07T12:00:00Z") });
    await host.clock.pauseAt(new Date("2026-10-07T12:00:01Z"));
    await host.getByRole("button", { name: "Start Pong", exact: true }).click();
    await host.clock.runFor(1100);
    await expect(card(client)).toHaveAttribute("data-phase", "playing");
    await expect(host.getByTestId("paddle-0")).toHaveAttribute("height", "156");
    await host
      .getByRole("group", { name: "Pong court", exact: true })
      .press("ArrowUp");
    await expect(host.getByTestId("paddle-0")).toHaveAttribute("y", "208");
    await client
      .getByRole("group", { name: "Pong court", exact: true })
      .tap({ position: { x: 20, y: 20 } });
    await host.clock.runFor(100);
    await expect
      .poll(() => host.getByTestId("paddle-1").getAttribute("y"))
      .toBe("0");
    await showHelp(client);
    await expect(
      client.getByText("Long rallies add up to four small bumpers.", {
        exact: false,
      }),
    ).toBeVisible();
    await client.getByLabel("Your paddle").press("End");
    await closePanels(client);
    await host.clock.runFor(100);
    await expect
      .poll(() => host.getByTestId("paddle-1").getAttribute("y"))
      .toBe("494");

    // Keep a rally going through ordinary pointer input on both actual paired
    // courts; no state injection or special gameplay hooks.
    let capturedImpact = false;
    const follow = async (milliseconds: number) => {
      for (let elapsed = 0; elapsed < milliseconds; elapsed += 50) {
        const y = Number(
          await host.getByTestId("pong-ball").getAttribute("data-y"),
        );
        for (const page of [host, client]) {
          const box = (await page.locator(".pong-court").boundingBox())!;
          await page.mouse.click(
            box.x + box.width / 2,
            box.y +
              box.height *
                Math.max(
                  0.12,
                  Math.min(
                    0.88,
                    y +
                      (capturedImpact
                        ? 0
                        : Math.max(-0.08, Math.min(0.08, (y - 0.3) * 0.6))),
                  ),
                ),
          );
        }
        // Wait for the real client input to reach the host before advancing its
        // simulation clock. Coalescing and RTC delivery use the client's clock.
        await expect
          .poll(
            async () =>
              (await host.getByTestId("paddle-1").getAttribute("y")) ===
              (await client.getByTestId("paddle-1").getAttribute("y")),
          )
          .toBe(true);
        await host.clock.runFor(50);
      }
    };
    await follow(8000);
    await expect(bumpers(client)).toHaveCount(1);
    await expect(host.getByTestId("pong-bumper-0")).toHaveClass(/warning/);
    await expectStableScreenshot(
      host,
      ".pong-court",
      `pong-warning-${process.platform}.png`,
    );
    await host.getByRole("button", { name: "Pause Pong", exact: true }).click();
    await expect(card(client)).toHaveAttribute("data-phase", "paused");
    const warning = await client
      .getByTestId("pong-bumper-0")
      .getAttribute("data-warning");
    await host.clock.runFor(5000);
    await expect(client.getByTestId("pong-bumper-0")).toHaveAttribute(
      "data-warning",
      warning!,
    );
    await host
      .getByRole("button", { name: "Resume Pong", exact: true })
      .click();
    await host.clock.runFor(1100);
    await follow(1600);
    await expect(client.getByTestId("pong-bumper-0")).toHaveClass(/solid/);
    for (let elapsed = 0; elapsed < 18000; elapsed += 100) {
      await follow(100);
      if (
        !capturedImpact &&
        (await host.locator(".pong-bumper.impact").count())
      ) {
        await expect
          .poll(async () =>
            Number(await client.locator(".pong-bumper.impact").count()),
          )
          .toBeGreaterThan(0);
        await expectStableScreenshot(
          host,
          ".pong-court",
          `pong-impact-${process.platform}.png`,
        );
        capturedImpact = true;
      }
    }
    expect(capturedImpact).toBe(true);
    await expect(bumpers(host)).toHaveCount(4);
    await expect(client.locator(".pong-bumper.solid")).toHaveCount(4);
    await host.getByRole("button", { name: "Pause Pong", exact: true }).click();
    await expect(card(client)).toHaveAttribute("data-phase", "paused");
    const frozen = await bumpers(client).evaluateAll((es) =>
      es.map((e) => e.outerHTML),
    );
    await host.clock.runFor(5000);
    expect(
      await bumpers(client).evaluateAll((es) => es.map((e) => e.outerHTML)),
    ).toEqual(frozen);
    await fit(host);
    await host.setViewportSize(sizes[2]);
    await expectStableScreenshot(
      host,
      ".pong-game-card",
      `pong-four-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await host.setViewportSize(sizes[5]);
    await expectStableScreenshot(
      host,
      ".pong-game-card",
      `pong-four-desktop-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await host.setViewportSize(sizes[2]);
    await client.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await client
        .getByTestId("pong-bumper-0")
        .locator(".bumper-halo")
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("none");
    await host
      .getByRole("button", { name: "Resume Pong", exact: true })
      .click();
    await host.clock.runFor(1100);
    // Stop defending to produce a real point and confirm a clean next rally.
    for (const page of [host, client]) {
      await showHelp(page);
      await page.getByLabel("Your paddle").press("Home");
      await closePanels(page);
    }
    for (let i = 0; i < 150 && (await bumpers(host).count()); i++)
      await host.clock.runFor(100);
    // A point can land between the host's 20 Hz snapshot sends.
    await host.clock.runFor(100);
    await expect(bumpers(client)).toHaveCount(0);
    expect(
      Number(await host.getByTestId("pong-score-0").textContent()) +
        Number(await host.getByTestId("pong-score-1").textContent()),
    ).toBeGreaterThan(0);
    await host.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(card(client)).toHaveAttribute("data-phase", "paused");
    await host.evaluate(() =>
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: false,
      }),
    );
    await host
      .getByRole("button", { name: "Resume Pong", exact: true })
      .click();
    await host.clock.runFor(1100);
    await returnHome(client);
    await expect(card(host)).toHaveAttribute("data-phase", "ready");
    await expect(bumpers(host)).toHaveCount(0);
    await expect(
      host.getByText("A player left.", { exact: false }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
