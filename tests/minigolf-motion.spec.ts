import { test, expect, type Page } from "@playwright/test";
import { chooseGame, expectScreenFits, join } from "./ui";
import { expectStableScreenshot } from "./screenshot";

const motion = (p: Page) => p.locator(".golf-motion");
const effect = (p: Page, kind: string) =>
  p.locator(`[data-golf-effect="${kind}"]`);
async function shot(page: Page, angle: number, power: number) {
  const portrait =
    (await page.locator(".golf-course").getAttribute("data-layout")) ===
    "portrait";
  await page
    .getByRole("slider", { name: "Shot angle" })
    .fill(String((angle + (portrait ? 270 : 0)) % 360));
  await page.getByRole("slider", { name: "Shot power" }).fill(String(power));
  await page.getByRole("button", { name: "Ready", exact: true }).click();
}
async function exactPositions(page: Page) {
  const positions = await page.locator("[data-golf-ball]").evaluateAll((es) =>
    es.map((e) => ({
      drawn: e.getAttribute("transform"),
      x: e.getAttribute("data-target-x"),
      y: e.getAttribute("data-target-y"),
    })),
  );
  expect(positions.length).toBe(2);
  for (const p of positions) expect(p.drawn).toBe(`translate(${p.x} ${p.y})`);
}
for (const reduced of [false, true])
  test(`Golf motion ${reduced ? "reduced" : "smooth"}: paired contacts, pause, sound and exact results`, async ({
    page: host,
    browser,
  }) => {
    test.setTimeout(120000);
    await host.emulateMedia({
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    await host.setViewportSize({ width: 390, height: 844 });
    await host.addInitScript(() => {
      Math.random = () => 0;
      const create = AudioContext.prototype.createOscillator;
      (window as unknown as { audioStarts: number }).audioStarts = 0;
      AudioContext.prototype.createOscillator = function () {
        (window as unknown as { audioStarts: number }).audioStarts++;
        return create.call(this);
      };
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    try {
      const client = await context.newPage();
      await host.goto("./");
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
      await expect(host.locator(".golf-game-card")).toHaveAttribute(
        "data-phase",
        "aiming",
      );
      await shot(host, 0, 100);
      await shot(client, 0, 100);
      await expect(effect(host, "launch")).toHaveCount(1);
      await expect(effect(client, "launch")).toHaveCount(1);
      await host.clock.runFor(16);
      await client.clock.runFor(16);
      if (!reduced)
        await expectStableScreenshot(
          host,
          ".golf-game-card",
          `golf-launch-${process.platform}.png`,
          { maxDiffPixels: 180 },
        );
      expect(
        await host.evaluate(
          () => (window as unknown as { audioStarts: number }).audioStarts,
        ),
      ).toBe(0);
      await host.clock.runFor(50);
      await expect
        .poll(() => motion(client).getAttribute("data-ticks"))
        .toBe(await motion(host).getAttribute("data-ticks"));
      await client.clock.runFor(16);
      await expect(motion(client)).toHaveAttribute(
        "data-motion",
        reduced ? "exact" : "smooth",
      );
      if (reduced) await exactPositions(client);
      else {
        const b = client.locator("[data-golf-ball]").first();
        expect(await b.getAttribute("transform")).not.toBe(
          `translate(${await b.getAttribute("data-target-x")} ${await b.getAttribute("data-target-y")})`,
        );
        await expectStableScreenshot(
          client,
          ".golf-game-card",
          `golf-rolling-desktop-${process.platform}.png`,
          { maxDiffPixels: 180 },
        );
      }
      await host.getByRole("button", { name: "Pause", exact: true }).click();
      await expect(motion(client)).toHaveAttribute("data-motion", "exact");
      await exactPositions(client);
      await expect(client.locator("[data-golf-effect]")).toHaveCount(0);
      await host.getByRole("button", { name: "Resume", exact: true }).click();
      await host.clock.runFor(3000);
      await expect(client.locator(".golf-game-card")).toHaveAttribute(
        "data-phase",
        "rolling",
      );
      await expect(effect(client, "launch")).toHaveCount(0);

      async function contact(kind: string, name: string) {
        for (let i = 0; i < 140 && !(await effect(host, kind).count()); i++) {
          await host.clock.runFor(50);
          await expect
            .poll(() => motion(client).getAttribute("data-ticks"))
            .toBe(await motion(host).getAttribute("data-ticks"));
          await client.clock.runFor(50);
        }
        await expect(effect(host, kind)).toHaveCount(1);
        await expect(effect(client, kind)).toHaveCount(1);
        await host.clock.runFor(64);
        await expectScreenFits(host);
        await expectStableScreenshot(
          host,
          ".golf-game-card",
          `golf-${name}${reduced ? "-reduced" : ""}-${process.platform}.png`,
          { maxDiffPixels: 180 },
        );
        if (!reduced && kind === "mushroom") {
          await expect(
            host.locator('[data-golf-mushroom-body="0"]'),
          ).toHaveAttribute("transform", /scale\(/);
        }
        if (reduced) {
          await exactPositions(host);
          for (const m of await host.locator("[data-golf-mushroom-body]").all())
            expect(await m.getAttribute("transform")).toBeNull();
        }
      }
      await contact("wall", "rail-contact");
      await host.getByRole("button", { name: "Sound", exact: true }).click();
      await expect(
        host.getByRole("button", { name: "Sound", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await host.clock.runFor(20000);
      await expect(host.locator(".golf-heading")).toContainText("Hole 2/5");
      await shot(host, 0, 60);
      await shot(client, 0, 60);
      await contact("wall", "stone-contact");
      await host.clock.runFor(20000);
      await expect(host.locator(".golf-heading")).toContainText("Hole 3/5");
      await shot(host, 0, 60);
      await shot(client, 0, 60);
      await contact("mushroom", "mushroom-boost");
      expect(
        await host.evaluate(
          () => (window as unknown as { audioStarts: number }).audioStarts,
        ),
      ).toBeGreaterThan(0);
      await host.getByRole("button", { name: "Sound", exact: true }).click();
      await host.clock.runFor(20000);
      await expect(host.locator(".golf-heading")).toContainText("Hole 4/5");
      await shot(host, 329, 50);
      await shot(client, 329, 50);
      await contact("meteor", "meteor-burst");
      await host.clock.runFor(20000);
      await expect(host.locator(".golf-heading")).toContainText("Hole 5/5");
      await shot(host, 304, 85);
      await shot(client, 304, 85);
      await host.clock.runFor(20000);
      await expect(client.locator(".golf-game-card")).toHaveAttribute(
        "data-phase",
        "finished",
      );
      await exactPositions(host);
      await exactPositions(client);
      await expect(host.locator("[data-golf-effect]")).toHaveCount(0);
      await expectScreenFits(host);
      await expectScreenFits(client);
    } finally {
      await context.close();
    }
  });
