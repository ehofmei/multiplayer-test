import { test, expect, type Page } from "@playwright/test";
import { chooseGame, join, expectScreenFits } from "./ui";
import { expectStableScreenshot } from "./screenshot";
async function shot(p: Page, angle: number, power: number) {
  const portrait =
    (await p.locator(".golf-course").getAttribute("data-layout")) ===
    "portrait";
  await p
    .getByRole("slider", { name: "Shot angle" })
    .fill(String((angle + (portrait ? 270 : 0)) % 360));
  await p.getByRole("slider", { name: "Shot power" }).fill(String(power));
  await p.getByRole("button", { name: "Ready", exact: true }).click();
}
for (const reduced of [false, true])
  test(`Golf cup and final results ${reduced ? "reduced" : "animated"}`, async ({
    page: host,
    browser,
  }) => {
    test.setTimeout(120000);
    await host.setViewportSize({ width: 390, height: 844 });
    await host.emulateMedia({
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    await host.addInitScript(() => {
      Math.random = () => 0;
    });
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    try {
      const client = await ctx.newPage();
      await host.goto("./");
      await host.getByLabel("Your name").fill("Alex");
      await host
        .getByRole("button", { name: "Create Game", exact: true })
        .click();
      await join(host, client, "Emma");
      await chooseGame(host, "Meteor Minigolf");
      await host.clock.install();
      await host.clock.pauseAt(new Date(Date.now() + 1000));
      await client.clock.install();
      await client.clock.pauseAt(new Date(Date.now() + 1000));
      await host
        .getByRole("button", { name: "Start Golf", exact: true })
        .click();
      await host.clock.runFor(7000);
      await shot(host, 0, 60);
      await shot(client, 0, 20);
      for (
        let i = 0;
        i < 100 && !(await host.locator('[data-golf-captured="true"]').count());
        i++
      ) {
        await host.clock.runFor(50);
        await expect
          .poll(() => client.locator(".golf-motion").getAttribute("data-ticks"))
          .toBe(await host.locator(".golf-motion").getAttribute("data-ticks"));
        await client.clock.runFor(50);
      }
      await expect(host.locator('[data-golf-effect="cup"]')).toHaveCount(1);
      await expect(client.locator('[data-golf-effect="cup"]')).toHaveCount(1);
      await expect(host.locator(".golf-hole-reward")).toContainText(
        "In the cup!",
      );
      await expect(host.locator(".golf-hole-reward > strong")).toContainText(
        "+100",
      );
      const visual = host.locator(
        '[data-golf-captured="true"] [data-golf-ball-visual]',
      );
      if (reduced) await expect(visual).toHaveAttribute("opacity", "0");
      else {
        await host.clock.runFor(120);
        const opacity = Number(await visual.getAttribute("opacity"));
        expect(opacity).toBeGreaterThan(0);
        expect(opacity).toBeLessThan(1);
      }
      await expectStableScreenshot(
        host,
        ".golf-game-card",
        `golf-cup${reduced ? "-reduced" : ""}-${process.platform}.png`,
        { maxDiffPixels: 180 },
      );
      await host.getByRole("button", { name: "Pause", exact: true }).click();
      await expect(host.locator("[data-golf-effect]")).toHaveCount(0);
      await expect(visual).toHaveAttribute("opacity", "0");
      await host.getByRole("button", { name: "Resume", exact: true }).click();
      await host.clock.runFor(3000);
      await expect(host.locator('[data-golf-effect="cup"]')).toHaveCount(0);
      while (
        (await host.locator(".golf-game-card").getAttribute("data-phase")) ===
        "rolling"
      )
        await host.clock.runFor(100);
      await expect(client.locator(".golf-hole-reward")).toContainText(
        "Near the cup",
      );
      await expect(
        client.locator(".golf-hole-reward > strong"),
      ).not.toContainText("+100");
      if (!reduced)
        await expectStableScreenshot(
          client,
          ".golf-game-card",
          `golf-near-points-${process.platform}.png`,
          { maxDiffPixels: 180 },
        );
      for (const [index, [angle, power]] of [
        [300, 85],
        [54, 90],
        [58, 95],
        [304, 85],
      ].entries()) {
        await host.clock.runFor(7000);
        await expect(host.locator(".golf-heading")).toContainText(
          `Hole ${index + 2}/5`,
        );
        await shot(host, angle, power);
        await shot(client, 0, 20);
        while (
          (await host.locator(".golf-game-card").getAttribute("data-phase")) ===
          "rolling"
        )
          await host.clock.runFor(100);
      }
      await host.clock.runFor(3000);
      await expect(host.locator(".golf-game-card")).toHaveAttribute(
        "data-phase",
        "finished",
      );
      await expect(client.locator(".golf-game-card")).toHaveAttribute(
        "data-phase",
        "finished",
      );
      await expect(host.locator(".golf-status")).toHaveText("Alex wins!");
      await expect(host.locator(".golf-ranking > li")).toHaveCount(2);
      await expect(host.locator(".golf-ranking > li").first()).toContainText(
        "500",
      );
      await expect(
        host.locator(".golf-hole-scores").first().locator("b"),
      ).toHaveText(["100", "100", "100", "100", "100"]);
      await expect(client.locator(".golf-ranking > li").first()).toContainText(
        "Alex",
      );
      await host.clock.runFor(60000);
      await expect(host.locator(".golf-game-card")).toHaveAttribute(
        "data-phase",
        "finished",
      );
      if (!reduced)
        for (const [label, viewport] of [
          ["phone", { width: 390, height: 844 }],
          ["desktop", { width: 1280, height: 720 }],
        ] as const) {
          await host.setViewportSize(viewport);
          await expectScreenFits(host);
          await expectStableScreenshot(
            host,
            ".golf-game-card",
            `golf-winner-${label}-${process.platform}.png`,
            { maxDiffPixels: 180 },
          );
        }
      await host
        .getByRole("button", { name: "Play Again", exact: true })
        .click();
      await expect(client.locator(".golf-game-card")).toHaveAttribute(
        "data-phase",
        "countdown",
      );
      await expect(host.locator(".golf-results")).toHaveCount(0);
      await expect(host.locator(".golf-workspace")).toBeVisible();
    } finally {
      await ctx.close();
    }
  });
