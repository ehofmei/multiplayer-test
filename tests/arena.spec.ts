import { expect, test, type Page } from "@playwright/test";
import {
  chooseGame,
  join,
  closePanels,
  showHelp,
  expectScreenFits,
} from "./ui";
import { expectStableScreenshot } from "./screenshot";

const sizes = [
  { width: 390, height: 844 },
  { width: 320, height: 700 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1280, height: 720 },
];
async function fit(page: Page, label: string) {
  for (const size of sizes) {
    await page.setViewportSize(size);
    for (const taller of [false, true]) {
      const style = taller
        ? await page.addStyleTag({
            content: ":root {font-family:serif;line-height:1.6}",
          })
        : null;
      await expectScreenFits(page);
      const card = page.locator(".arena-polished");
      const metrics = await card.evaluate((e) => ({
        h: e.clientHeight,
        sh: e.scrollHeight,
        w: e.clientWidth,
        sw: e.scrollWidth,
      }));
      expect(metrics.sh).toBeLessThanOrEqual(metrics.h + 1);
      expect(metrics.sw).toBeLessThanOrEqual(metrics.w + 1);
      for (const control of await card
        .locator("button, .arena-steering")
        .all()) {
        const b = (await control.boundingBox())!;
        expect(b.width).toBeGreaterThanOrEqual(44);
        expect(b.height).toBeGreaterThanOrEqual(44);
        expect(b.y + b.height).toBeLessThanOrEqual(size.height);
      }
      if (label !== "results") {
        const court = (await card.locator(".arena-court").boundingBox())!;
        expect(court.width).toBeCloseTo(court.height, 0);
        expect(court.width).toBeGreaterThan(size.height < 450 ? 170 : 180);
      } else {
        await expect(card.locator(".arena-finale")).toBeVisible();
        await expect(card.locator(".arena-court")).toBeHidden();
      }
      await page.screenshot({
        path: `test-results/arena-${label}-${size.width}x${size.height}-${taller ? "taller" : "native"}.png`,
      });
      await style?.evaluate((e) => e.remove());
    }
  }
  await page.setViewportSize(sizes[0]);
}
async function settings(page: Page, lives: string) {
  await page
    .getByRole("button", { name: "Players & lives", exact: true })
    .click();
  await page
    .getByLabel("Lives per player", { exact: true })
    .selectOption(lives);
  await closePanels(page);
}
async function start(page: Page) {
  await page
    .getByRole("button", { name: /^(Start Arena Pong|Play Arena Again)$/ })
    .click();
  await page.clock.runFor(1150);
}
async function phase(page: Page) {
  return page.locator(".arena-polished").getAttribute("data-phase");
}

test("Arena arcade pairs rotated controls, identifies walls and lives, and finishes without blocking play", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(120_000);
  const contexts = await Promise.all(
    [0, 1, 2].map(() =>
      browser.newContext({ viewport: sizes[0], hasTouch: true }),
    ),
  );
  try {
    const clients = await Promise.all(contexts.map((c) => c.newPage()));
    await host.setViewportSize(sizes[0]);
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    for (const [i, client] of clients.entries())
      await join(host, client, ["Emma with a very long name", "Sam", "Lee"][i]);
    await chooseGame(host, "Arena Pong");
    await settings(host, "7");
    await fit(host, "ready");
    await expectStableScreenshot(
      host,
      ".arena-polished",
      `arena-ready-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    for (const client of clients.slice(0, 2)) {
      await showHelp(client);
      await client
        .getByRole("button", { name: "Coral paddle", exact: true })
        .click();
      await closePanels(client);
    }
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await start(host);
    for (const [i, page] of [host, ...clients].entries()) {
      await expect(page.locator(".arena-polished")).toHaveAttribute(
        "data-phase",
        "playing",
      );
      await expect(page.locator(".arena-court svg > g")).toHaveAttribute(
        "transform",
        `rotate(${i * 90} 500 500)`,
      );
      await expect(
        page.locator('.arena-lives [data-local="true"] .arena-player small'),
      ).toHaveText("↓");
    }
    const client = clients[0];
    await expectStableScreenshot(
      client,
      ".arena-polished",
      `arena-rotated-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    await fit(client, "active");
    for (const [label, size] of [
      ["landscape", sizes[3]],
      ["short-phone", sizes[2]],
    ] as const) {
      await client.setViewportSize(size);
      await expectStableScreenshot(
        client,
        ".arena-polished",
        `arena-${label}-${process.platform}.png`,
        { maxDiffPixels: 160 },
      );
    }
    await client.setViewportSize(sizes[0]);
    await host.setViewportSize({ width: 1280, height: 720 });
    await expectStableScreenshot(
      host,
      ".arena-polished",
      `arena-desktop-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    await host.setViewportSize(sizes[0]);
    const strip = client.getByRole("group", { name: "Paddle steering strip" });
    await strip.press("ArrowRight");
    await host.clock.runFor(100);
    await expect
      .poll(async () =>
        Number(await host.getByTestId("arena-paddle-1").getAttribute("y")),
      )
      .toBeLessThan(380);
    const b = (await strip.boundingBox())!;
    await client.mouse.move(b.x + b.width * 0.2, b.y + 20);
    await client.mouse.down();
    await client.mouse.move(b.x + b.width * 0.8, b.y + 20);
    await client.mouse.up();
    await host.clock.runFor(100);
    await expect
      .poll(async () =>
        Number(await host.getByTestId("arena-paddle-1").getAttribute("y")),
      )
      .toBeLessThan(120);
    await client
      .getByRole("group", { name: "Arena court", exact: true })
      .press("ArrowLeft");
    await host.clock.runFor(100);
    await expect
      .poll(async () =>
        Number(await host.getByTestId("arena-paddle-1").getAttribute("y")),
      )
      .toBeGreaterThan(120);
    await host
      .getByRole("button", { name: "Pause Arena", exact: true })
      .click();
    await expect(client.locator(".arena-steering")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await showHelp(client);
    await expect(
      client.getByLabel("Your paddle", { exact: true }),
    ).toBeDisabled();
    await closePanels(client);
    await host
      .getByRole("button", { name: "Resume Arena", exact: true })
      .click();
    await host.clock.runFor(1150);
    await expect(client.locator(".arena-polished")).toHaveAttribute(
      "data-phase",
      "playing",
    );
    // Steer away from the ball and let real simulation produce a miss.
    for (const page of [host, ...clients])
      await page
        .getByRole("group", { name: "Paddle steering strip" })
        .press("ArrowLeft");
    let loss = false;
    for (let i = 0; i < 150; i++) {
      await host.clock.runFor(50);
      if ((await phase(host)) === "serve") {
        loss = true;
        break;
      }
    }
    expect(loss).toBe(true);
    const values = await host.locator(".arena-life-count").allTextContents();
    expect(values).toContain("6 lives");
    await expect
      .poll(() => client.locator(".arena-life-count").allTextContents())
      .toEqual(values);
    await expect(host.locator(".arena-contact")).toHaveAttribute(
      "data-kind",
      "miss",
    );
    await expectStableScreenshot(
      host,
      ".arena-polished",
      `arena-miss-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    // One-life match gives deterministic last-life and elimination states.
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await chooseGame(host, "Arena Pong");
    await settings(host, "1");
    await start(host);
    await host.emulateMedia({ reducedMotion: "reduce" });
    await expectStableScreenshot(
      host,
      ".arena-polished",
      `arena-last-life-reduced-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    let out = false;
    for (let i = 0; i < 150; i++) {
      await host.clock.runFor(50);
      if (
        (await host.locator(".arena-life-count").allTextContents()).includes(
          "· Out",
        )
      ) {
        out = true;
        break;
      }
    }
    expect(out).toBe(true);
    await host.clock.runFor(50);
    const eliminated = await host
      .locator('.arena-lives li[data-lives="0"]')
      .evaluate((e) => Number(e.querySelector("b")!.textContent) - 1);
    await expect(
      clients[0].getByTestId(`arena-paddle-${eliminated}`),
    ).toHaveAttribute("data-active", "false");
    const outPage = [host, ...clients][eliminated];
    await expect(outPage.locator(".arena-steering")).toHaveCount(0);
    await showHelp(outPage);
    await expect(
      outPage.getByLabel("Your paddle", { exact: true }),
    ).toBeDisabled();
    await closePanels(outPage);
    await expectStableScreenshot(
      host,
      ".arena-polished",
      `arena-eliminated-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    for (let i = 0; i < 800 && (await phase(host)) !== "finished"; i++)
      await host.clock.runFor(100);
    await expect(host.locator(".arena-finale")).toBeVisible();
    await expect(clients[0].locator(".arena-finale strong")).toHaveText(
      await host.locator(".arena-finale strong").innerText(),
    );
    await fit(host, "results");
    await expectStableScreenshot(
      host,
      ".arena-polished",
      `arena-results-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    await host
      .getByRole("button", { name: "Play Arena Again", exact: true })
      .click();
    await expect(host.getByTestId("arena-lives-0")).toContainText("1 life");
    await expect(host.locator(".arena-finale")).toHaveCount(0);
    await host.clock.resume();
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
