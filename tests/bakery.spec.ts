import { expect, test } from "@playwright/test";
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
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1280, height: 720 },
];
const card = (page: import("@playwright/test").Page) =>
  page.locator(".bakery-treat").first();
test("Bakery pairs, previews, secretly locks, passes, scores two batches and rematches", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(120000);
  await host.addInitScript(() => {
    Math.random = () => 0.5;
  });
  const context = await browser.newContext({
    viewport: sizes[1],
    hasTouch: true,
  });
  await context.addInitScript(() => {
    Math.random = () => 0.5;
  });
  try {
    const client = await context.newPage();
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await join(host, client, "Emma");
    await chooseGame(host, "Midnight Bakery");
    await host
      .getByRole("button", { name: "Open Bakery", exact: true })
      .click();
    await expect(client.locator(".bakery-treat")).toHaveCount(6);
    await expect(
      client.getByRole("button", { name: "Lock my pick", exact: true }),
    ).toBeDisabled();
    for (const size of sizes) {
      await client.setViewportSize(size);
      const style = await client.addStyleTag({
        content: ":root {font-family:serif;line-height:1.6}",
      });
      await expectScreenFits(client);
      const metrics = await client
        .locator(".bakery-hand")
        .evaluate((e) => ({ height: e.clientHeight, scroll: e.scrollHeight }));
      expect(metrics.scroll).toBeLessThanOrEqual(metrics.height + 1);
      const hand = (await client.locator(".bakery-hand").boundingBox())!;
      const lock = (await client
        .getByRole("button", { name: "Lock my pick", exact: true })
        .boundingBox())!;
      const preview = (await client.locator(".bakery-preview").boundingBox())!;
      if (size.height > 550) {
        expect(hand.y + hand.height).toBeLessThanOrEqual(preview.y);
        expect(preview.y + preview.height).toBeLessThanOrEqual(lock.y);
      } else {
        expect(hand.x + hand.width).toBeLessThanOrEqual(preview.x);
        expect(hand.y + hand.height).toBeLessThanOrEqual(lock.y);
      }
      for (const treat of await client.locator(".bakery-treat").all()) {
        await treat.click();
        await expectScreenFits(client);
        const afterHand = (await client.locator(".bakery-hand").boundingBox())!;
        const afterPreview = (await client
          .locator(".bakery-preview")
          .boundingBox())!;
        const afterCounter = (await client
          .locator(".bakery-counter")
          .boundingBox())!;
        if (size.height > 550) {
          expect(afterHand.y + afterHand.height).toBeLessThanOrEqual(
            afterPreview.y,
          );
          expect(afterPreview.y + afterPreview.height).toBeLessThanOrEqual(
            afterCounter.y,
          );
        }
      }
      await card(client).click();
      await host.setViewportSize(size);
      await expectScreenFits(host);
      await host.setViewportSize({ width: 1280, height: 720 });
      for (const element of await client.locator(".bakery-treat").all()) {
        const b = (await element.boundingBox())!;
        expect(b.height).toBeGreaterThanOrEqual(44);
        expect(b.width).toBeGreaterThanOrEqual(44);
      }
      await client.screenshot({
        path: `test-results/bakery-play-${size.width}.png`,
      });
      await style.evaluate((e) => e.remove());
    }
    await client.setViewportSize(sizes[1]);
    await expectStableScreenshot(
      client,
      ".bakery-hand",
      `bakery-hand-${process.platform}.png`,
      {
        maxDiffPixels: 180,
      },
    );
    await card(client).tap();
    await expect(client.locator(".bakery-preview")).toContainText("points");
    await client
      .getByRole("button", { name: "Lock my pick", exact: true })
      .tap();
    await expect(
      client.getByRole("button", { name: "Pick locked", exact: true }),
    ).toBeDisabled();
    await expect(host.locator(".bakery-reveal")).not.toBeVisible();
    await host
      .getByRole("button", { name: "Pause Bakery", exact: true })
      .click();
    await expect(client.locator(".bakery-status")).toHaveText("Bakery paused");
    await host
      .getByRole("button", { name: "Resume Bakery", exact: true })
      .click();
    await expect(
      client.getByRole("button", { name: "Pick locked", exact: true }),
    ).toBeDisabled();
    await card(host).focus();
    await host.keyboard.press("Enter");
    await host
      .getByRole("button", { name: "Lock my pick", exact: true })
      .click();
    await expect(client.locator(".bakery-reveal")).toBeVisible();
    await expect(client.locator(".bakery-game-card")).toHaveAttribute(
      "data-phase",
      "picking",
    );
    await expect(client.locator(".bakery-treat")).toHaveCount(5);
    await showHelp(client);
    await expect(client.getByRole("dialog")).toContainText(
      "Cookies earn 2 each",
    );
    await closePanels(client);
    await client
      .getByRole("button", { name: "Table & scores", exact: true })
      .click();
    await expect(
      client
        .getByRole("dialog", { name: "Table & scores", exact: true })
        .locator("li"),
    ).toHaveCount(2);
    await closePanels(client);
    for (let round = 1; round <= 2; round++) {
      for (let pick = round === 1 ? 2 : 1; pick <= 6; pick++) {
        await expect(host.locator(".bakery-game-card")).toHaveAttribute(
          "data-phase",
          "picking",
        );
        for (const page of [host, client]) {
          await card(page).click();
          await page
            .getByRole("button", { name: "Lock my pick", exact: true })
            .click();
        }
        await expect(client.locator(".bakery-game-card")).not.toHaveAttribute(
          "data-phase",
          "reveal",
        );
      }
      if (round === 1) {
        await expect(client.locator(".bakery-status")).toHaveText(
          "Batch one baked!",
        );
        await host
          .getByRole("button", { name: "Start Batch Two", exact: true })
          .click();
      }
    }
    await expect(client.locator(".bakery-status")).toContainText(
      /wins|share the win/,
    );
    await expect(client.locator(".bakery-scores:visible strong")).toHaveCount(
      2,
    );
    for (const size of sizes) {
      await client.setViewportSize(size);
      await expectScreenFits(client);
      await client.screenshot({
        path: `test-results/bakery-results-${size.width}.png`,
      });
    }
    await host.getByRole("button", { name: "Bake Again", exact: true }).click();
    await expect(client.locator(".bakery-treat")).toHaveCount(6);
    await returnHome(client);
    await expect(host.locator(".bakery-status")).toHaveText(
      "The ovens are ready. Are you?",
    );
  } finally {
    await context.close();
  }
});

test("eight bakers fit, late arrivals spectate, and losing the host disables picks", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(120000);
  const contexts = await Promise.all(
    Array.from({ length: 7 }, () => browser.newContext({ viewport: sizes[0] })),
  );
  await host.addInitScript(() => {
    Math.random = () => 0.999999;
  });
  for (const context of contexts)
    await context.addInitScript(() => {
      Math.random = () => 0.999999;
    });
  try {
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    const clients = await Promise.all(contexts.map((c) => c.newPage()));
    for (let i = 0; i < 6; i++)
      await join(
        host,
        clients[i],
        i === 0
          ? "Emma with a very long name"
          : `Baker ${i + 1} ABCDEFGHIJKLMNOPQRSTUV`,
      );
    await chooseGame(host, "Midnight Bakery");
    await host
      .getByRole("button", { name: "Open Bakery", exact: true })
      .click();
    await join(host, clients[6], "Late baker");
    await expect(clients[6].locator(".bakery-status")).toContainText(
      "watching",
    );
    await expect(clients[6].locator(".bakery-treat")).toHaveCount(0);
    await host
      .getByRole("button", { name: "Resume Bakery", exact: true })
      .click();
    await expectScreenFits(clients[0]);
    for (const page of [host, ...clients.slice(0, 6)]) {
      await card(page).click();
      await page
        .getByRole("button", { name: "Lock my pick", exact: true })
        .click();
    }
    await expect(clients[0].locator(".bakery-reveal")).toBeVisible();
    await expectScreenFits(clients[0]);
    await clients[0].screenshot({
      path: "test-results/bakery-seven-reveal.png",
    });
    // Finish quickly through real inputs, then include the late arrival in a rematch.
    for (let round = 1; round <= 2; round++) {
      for (let pick = round === 1 ? 2 : 1; pick <= 6; pick++) {
        await expect(host.locator(".bakery-game-card")).toHaveAttribute(
          "data-phase",
          "picking",
        );
        for (const page of [host, ...clients.slice(0, 6)]) {
          await card(page).click();
          await page
            .getByRole("button", { name: "Lock my pick", exact: true })
            .click();
        }
        await expect(host.locator(".bakery-game-card")).not.toHaveAttribute(
          "data-phase",
          "reveal",
        );
      }
      if (round === 1)
        await host
          .getByRole("button", { name: "Start Batch Two", exact: true })
          .click();
    }
    await expect(clients[0].locator(".bakery-status")).toHaveText(
      "7 bakers share the win!",
    );
    for (const size of sizes) {
      await clients[0].setViewportSize(size);
      const style = await clients[0].addStyleTag({
        content: ":root {font-family:Arial,sans-serif;line-height:1.5}",
      });
      await expectScreenFits(clients[0]);
      await clients[0].screenshot({
        path: `test-results/bakery-tied-results-${size.width}.png`,
      });
      await style.evaluate((e) => e.remove());
    }
    await clients[0].setViewportSize(sizes[0]);
    await clients[0]
      .getByRole("button", { name: "Table & scores", exact: true })
      .click();
    await expect(
      clients[0].getByRole("dialog", { name: "Table & scores", exact: true }),
    ).toContainText("Baker 2 ABCDEFGHIJKLMNOPQRSTUV");
    await expect(
      clients[0].getByRole("dialog", { name: "Table & scores", exact: true }),
    ).toContainText("Batch 2:");
    await closePanels(clients[0]);
    await expectScreenFits(clients[0]);
    await clients[0].screenshot({
      path: "test-results/bakery-seven-results.png",
    });
    await host.getByRole("button", { name: "Bake Again", exact: true }).click();
    await expect(clients[6].locator(".bakery-treat")).toHaveCount(6);
    await expectScreenFits(clients[0]);
    await clients[0].screenshot({
      path: "test-results/bakery-eight-phone.png",
    });
    await returnHome(host);
    await expect(clients[0].locator(".bakery-status")).toHaveText(
      "Host disconnected",
    );
    await expect(card(clients[0])).toBeDisabled();
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
