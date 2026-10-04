import { test, expect } from "@playwright/test";
import { expectStableScreenshot } from "./screenshot";
import {
  chooseGame,
  closePanels,
  expectScreenFits,
  join,
  openMenu,
  returnHome,
  showHelp,
} from "./ui";

const sizes = [
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
];

test("home, paged library, settings and all game setups fit the primary screen", async ({
  page,
}) => {
  test.setTimeout(120_000);
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.goto("./");
    if (size.width === 320)
      await page.addStyleTag({
        content: ":root { font-family: Arial, sans-serif; line-height: 1.3; }",
      });
    await page.getByLabel("Your name").fill("ABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    await expectScreenFits(page);
    await page.screenshot({ path: `test-results/app-home-${size.width}.png` });
    if (size.width === 390) {
      // CoreText and FreeType rasterize this large text differently even with
      // identical font files. Keep reviewed OS baselines and strict tolerances.
      const homeSnapshot = `app-home-${process.platform}.png`;
      // Keep the long-name fit check above, but avoid native input horizontal
      // scrolling (which differs by OS) in the shared visual baseline.
      await page.getByLabel("Your name").fill("Family Player");
      await expectStableScreenshot(page, "main", homeSnapshot, {
        maxDiffPixels: 250,
      });
      // Reuse the same baseline under different inherited metrics, as on CI.
      const alternateFont = await page.addStyleTag({
        content: ":root { font-family: serif; line-height: 1.6; }",
      });
      await expectStableScreenshot(page, "main", homeSnapshot, {
        maxDiffPixels: 250,
      });
      await alternateFont.evaluate((element) => element.remove());
      await page
        .getByLabel("Your name")
        .fill("ABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    }
    await page
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await expectScreenFits(page);
    const more = page.getByRole("button", { name: "More games", exact: true });
    if (await more.count()) {
      await more.click();
      await expect(
        page.getByRole("button", { name: "Shared Lights", exact: true }),
      ).toBeVisible();
      await expectScreenFits(page);
      await page
        .getByRole("button", { name: "Previous games", exact: true })
        .click();
    }
    await page.screenshot({
      path: `test-results/app-library-${size.width}.png`,
    });
    if (size.width === 390)
      await expectStableScreenshot(
        page,
        "main",
        `app-library-${process.platform}.png`,
        { maxDiffPixels: 250 },
      );
    await openMenu(page);
    await page.getByText("Install on iPhone or iPad", { exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Add to Home Screen");
    await page
      .getByRole("button", { name: "Close", exact: true })
      .press("Escape");
    await expect(
      page.getByRole("button", { name: "Menu", exact: true }),
    ).toBeFocused();
    for (const name of [
      "Pong",
      "Arena Pong",
      "Co-op Breakout",
      "Spaceship Panic",
      "Light-cycle Arena",
      "Sumo Bumpers",
      "Reaction Race",
      "Shared Lights",
    ]) {
      await chooseGame(page, name);
      await expectScreenFits(page);
      await page.screenshot({
        path: `test-results/app-setup-${name.replaceAll(" ", "-")}-${size.width}.png`,
      });
      if (name !== "Shared Lights") {
        await showHelp(page);
        await expect(
          page.getByRole("dialog", { name: "Controls & help", exact: true }),
        ).toBeVisible();
        await closePanels(page);
      }
      await page
        .getByRole("button", { name: "Choose Game", exact: true })
        .click();
    }
    await returnHome(page);
  }
});

test("four connected players keep every game's play and pause screens within phones and tablets", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(180_000);
  const contexts = await Promise.all(
    [0, 1, 2].map(() => browser.newContext({ viewport: sizes[0] })),
  );
  try {
    await host.setViewportSize(sizes[0]);
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex with a very long name");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    const clients = await Promise.all(
      contexts.map((context) => context.newPage()),
    );
    for (const [index, client] of clients.entries())
      await join(
        host,
        client,
        ["Emma with a very long name", "Chris", "Sam"][index],
      );
    for (const [name, start, pause, resume] of [
      ["Pong", "Start Pong", "Pause Pong", "Resume Pong"],
      ["Arena Pong", "Start Arena Pong", "Pause Arena", "Resume Arena"],
      [
        "Co-op Breakout",
        "Start Co-op Breakout",
        "Pause Breakout",
        "Resume Breakout",
      ],
      ["Spaceship Panic", "Launch Mission", "Pause Mission", "Resume Mission"],
      ["Light-cycle Arena", "Start Arena", "Pause Arena", "Resume Arena"],
      ["Sumo Bumpers", "Start Bumpers", "Pause Bumpers", "Resume Bumpers"],
      ["Reaction Race", "Start Race", "Stop Race", ""],
    ]) {
      await chooseGame(host, name);
      await host.getByRole("button", { name: start, exact: true }).click();
      for (const size of [sizes[0], sizes[2], sizes[3]]) {
        for (const page of [host, clients[0]]) {
          await page.setViewportSize(size);
          await expectScreenFits(page);
          await page.screenshot({
            path: `test-results/app-play-${name.replaceAll(" ", "-")}-${page === host ? "host" : "client"}-${size.width}.png`,
          });
        }
      }
      if (
        await host.getByRole("button", { name: pause, exact: true }).count()
      ) {
        await host.getByRole("button", { name: pause, exact: true }).click();
        await expectScreenFits(host);
        if (resume) {
          await expect(
            host.getByRole("button", { name: resume, exact: true }),
          ).toBeVisible();
          await host.getByRole("button", { name: resume, exact: true }).click();
        }
      }
      await host
        .getByRole("button", { name: "Choose Game", exact: true })
        .click();
    }
    await chooseGame(host, "Shared Lights");
    await openMenu(host);
    await expect(host.locator(".people-card li")).toHaveCount(4);
    await closePanels(host);
    await returnHome(host);
    await expect(clients[0].getByRole("status")).toHaveText(
      "Host disconnected",
    );
    await expect(
      clients[0].getByRole("button", { name: "Cell 1", exact: true }),
    ).toBeDisabled();
  } finally {
    for (const context of contexts) await context.close();
  }
});

test("completed rounds show results and rematches without disabled play controls", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({ viewport: sizes[0] });
  try {
    await host.setViewportSize(sizes[0]);
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    const client = await context.newPage();
    await join(host, client, "Emma with a very long name");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    for (const [name, start, rematch] of [
      ["Sumo Bumpers", "Start Bumpers", "Bump Again"],
      ["Light-cycle Arena", "Start Arena", "Ride Again"],
      ["Spaceship Panic", "Launch Mission", "Launch Again"],
      ["Reaction Race", "Start Race", "Race Again"],
    ]) {
      await chooseGame(host, name);
      await host.getByRole("button", { name: start, exact: true }).click();
      await host.clock.runFor(180_000);
      await expect(
        host.locator('.games-card[data-phase="finished"]'),
      ).toBeVisible();
      for (const size of [sizes[0], sizes[2], sizes[3]]) {
        await host.setViewportSize(size);
        await expectScreenFits(host);
        await expect(
          host.getByRole("button", { name: rematch, exact: true }),
        ).toBeVisible();
        await pageResultScreenshot(host, name, size.width);
      }
      await host.getByRole("button", { name: rematch, exact: true }).click();
      await expect(
        host.locator('.games-card[data-phase="finished"]'),
      ).toHaveCount(0);
      await host
        .getByRole("button", { name: "Choose Game", exact: true })
        .click();
    }
  } finally {
    await context.close();
  }
});

async function pageResultScreenshot(
  page: import("@playwright/test").Page,
  name: string,
  width: number,
) {
  await page.screenshot({
    path: `test-results/app-results-${name.replaceAll(" ", "-")}-${width}.png`,
  });
}
