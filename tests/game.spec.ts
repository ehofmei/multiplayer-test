import {
  addPlayer,
  join,
  chooseGame,
  closePanels,
  connectionDetails,
  openMenu,
  returnHome,
  showHelp,
  transferText,
} from "./ui";
import { expectStableScreenshot } from "./screenshot";
import { chromium, expect, test, type Page } from "@playwright/test";
import QRCode from "qrcode";

test("compressed QR images pair offline and expose live latency on a phone", async ({
  browser,
  page: host,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript(() => {
    Reflect.deleteProperty(window, "BarcodeDetector");
  });
  try {
    const client = await context.newPage();
    await client.goto("./");
    await client.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await client.reload();
    await expect
      .poll(() => client.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true);
    // Block external HTTP without disabling Chromium's local WebRTC sockets.
    // The service worker must serve the app and decoder from its cache.
    await context.route("**/*", (route) => route.abort());
    await client.getByLabel("Your name").fill("Emma");
    await client
      .getByRole("button", { name: "Join Game", exact: true })
      .click();
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await createLights(host);
    await addPlayer(host);
    const offer = host.getByRole("img", {
      name: "Invite QR code",
      exact: true,
    });
    await expect(offer).toBeVisible();
    await host.screenshot({ path: "test-results/qr-host-desktop.png" });
    await offer.screenshot({ path: "test-results/offer-qr.png" });
    await client
      .locator('input[type="file"]')
      .setInputFiles("test-results/offer-qr.png");
    const answer = client.getByRole("img", {
      name: "Join QR code",
      exact: true,
    });
    await expect(answer).toBeVisible({ timeout: 20_000 });
    const answerBounds = await answer.boundingBox();
    expect(answerBounds!.y + answerBounds!.height).toBeLessThanOrEqual(844);
    await client.screenshot({ path: "test-results/qr-answer-mobile.png" });
    await answer.screenshot({ path: "test-results/answer-qr.png" });
    await host
      .locator('input[type="file"]')
      .setInputFiles("test-results/answer-qr.png");
    await expect(
      host.getByRole("img", { name: "Invite QR code", exact: true }),
    ).toHaveCount(0);
    await expect(client.getByRole("status")).toHaveText("Connected to host", {
      timeout: 20_000,
    });
    await expect(host.getByText("2/8", { exact: true })).toBeVisible();
    await client.getByRole("button", { name: "Cell 1", exact: true }).click();
    await expect(host.getByText("Revision 1", { exact: true })).toBeVisible();
    await connectionDetails(client);
    await expect(client.getByTestId("rtt")).toContainText("ms", {
      timeout: 10_000,
    });
    await expect(client.getByTestId("tap-response")).toContainText("ms");
    expect(
      await client.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await client.screenshot({
      path: "test-results/latency-mobile.png",
      fullPage: true,
    });
  } finally {
    await context.close();
  }
});

test("camera denial and unrelated QR images preserve the text fallback", async ({
  page,
}) => {
  await page.context().clearPermissions();
  await page.goto("./");
  await page.getByRole("button", { name: "Join Game", exact: true }).click();
  await page.getByRole("button", { name: "Scan Invite", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Camera unavailable", {
    timeout: 10_000,
  });
  await expect(
    page.getByRole("button", { name: "Stop Camera", exact: true }),
  ).toHaveCount(0);
  const unrelated = await QRCode.toBuffer("https://example.com");
  await page.locator('input[type="file"]').setInputFiles({
    name: "unrelated.png",
    mimeType: "image/png",
    buffer: unrelated,
  });
  await expect(page.getByRole("alert")).toContainText(
    "Invalid connection text",
  );
  await expect(
    page.getByRole("button", { name: "Scan Invite", exact: true }),
  ).toBeEnabled();
  await page.locator('input[type="file"]').setInputFiles("public/icon-192.png");
  await expect(page.getByRole("alert")).toContainText("No readable QR");
  await transferText(page, "Paste connection text instead");
  await expect(page.getByLabel("Paste host invite code")).toBeVisible();
});

test("scanner modal fills the viewport, traps focus and releases the stream on close or Escape", async () => {
  const browser = await chromium.launch({
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  });
  try {
    const page = await browser.newPage({
      baseURL: "http://127.0.0.1:4173/multiplayer-test/",
      viewport: { width: 390, height: 844 },
    });
    await page.goto("./");
    await page.getByRole("button", { name: "Join Game", exact: true }).click();
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1280, height: 720 },
      { width: 320, height: 700 },
    ]) {
      await page.setViewportSize(viewport);
      for (const exit of ["Stop Camera", "Escape"]) {
        await page
          .getByRole("button", { name: "Scan Invite", exact: true })
          .click();
        await expect
          .poll(() =>
            page
              .locator("video")
              .evaluate((video) => (video as HTMLVideoElement).videoWidth),
          )
          .toBeGreaterThan(0);
        const track = await page.evaluateHandle(
          () =>
            (
              document.querySelector("video")!.srcObject as MediaStream
            ).getVideoTracks()[0],
        );
        const modal = page.getByRole("dialog", {
          name: "Scan Invite QR code",
          exact: true,
        });
        await expect(modal).toBeVisible();
        const bounds = await modal.boundingBox();
        expect(bounds!.y).toBe(0);
        expect(bounds!.height).toBe(viewport.height);
        expect(bounds!.width).toBe(viewport.width);
        expect(await page.evaluate(() => document.body.style.overflow)).toBe(
          "hidden",
        );
        await page.keyboard.press("Tab");
        expect(
          await page.evaluate(
            () => !!document.activeElement?.closest("dialog"),
          ),
        ).toBe(true);
        await page.screenshot({
          path: `test-results/scanner-modal-${viewport.width}.png`,
        });
        if (exit === "Escape") await page.keyboard.press("Escape");
        else
          await page.getByRole("button", { name: exit, exact: true }).click();
        await expect
          .poll(() => track.evaluate((track) => track.readyState))
          .toBe("ended");
        await expect(page.locator("video")).toHaveCount(0);
        await track.dispose();
        await expect(
          page.getByRole("button", { name: "Scan Invite", exact: true }),
        ).toBeFocused();
        expect(await page.evaluate(() => document.body.style.overflow)).toBe(
          "",
        );
      }
    }
  } finally {
    await browser.close();
  }
});

async function createLights(page: Page) {
  await page.getByRole("button", { name: "Create Game", exact: true }).click();
  await chooseGame(page, "Shared Lights");
}

async function monitorAudio(page: Page) {
  await page.addInitScript(() => {
    const create = AudioContext.prototype.createOscillator;
    (window as unknown as { audioStarts: number }).audioStarts = 0;
    AudioContext.prototype.createOscillator = function () {
      (window as unknown as { audioStarts: number }).audioStarts++;
      return create.call(this);
    };
  });
}
const audioStarts = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { audioStarts: number }).audioStarts,
  );

for (const missed of ["hello", "state"] as const)
  test(`pairing recovers when the first ${missed} message is missed`, async ({
    browser,
    page: host,
  }) => {
    const context = await browser.newContext();
    try {
      const client = await context.newPage();
      await client.clock.install();
      const sender = missed === "hello" ? client : host;
      await sender.addInitScript((type) => {
        const send = RTCDataChannel.prototype.send;
        let dropped = false;
        RTCDataChannel.prototype.send = function (data: string) {
          if (JSON.parse(data).type === "hello") {
            const counters = window as unknown as { helloCount?: number };
            counters.helloCount = (counters.helloCount ?? 0) + 1;
          }
          if (!dropped && JSON.parse(data).type === type) {
            dropped = true;
            return;
          }
          return send.call(this, data);
        };
      }, missed);
      await host.goto("./");
      await host.getByLabel("Your name").fill("Alex");
      await createLights(host);
      await join(host, client, "Emma");
      await expect(host.getByText("2/8", { exact: true })).toBeVisible();
      await expect(host.getByRole("alert")).toHaveCount(0);
      await client.getByRole("button", { name: "Cell 1", exact: true }).click();
      for (const page of [host, client])
        await expect(
          page.getByText("Revision 1", { exact: true }),
        ).toBeVisible();
      await connectionDetails(client);
      const helloCount = () =>
        client.evaluate(
          () => (window as unknown as { helloCount?: number }).helloCount,
        );
      const acknowledged = await helloCount();
      // Advancing past the handshake deadline must neither send another hello
      // nor drop a client whose initial state was acknowledged.
      await client.clock.runFor(35_000);
      expect(await helloCount()).toBe(acknowledged);
      await expect(client.getByRole("status")).toHaveText("Connected to host");
      await returnHome(host);
      await expect(client.getByRole("status")).toHaveText("Host disconnected");
    } finally {
      await context.close();
    }
  });

test("host and three clients pair, synchronize concurrent taps, and disconnect cleanly", async ({
  browser,
  page: host,
}) => {
  test.setTimeout(120_000);
  await host.goto("./");
  await host.getByLabel("Your name").fill("Alex");
  await createLights(host);
  const contexts = await Promise.all([0, 1, 2].map(() => browser.newContext()));
  const clients = await Promise.all(contexts.map((c) => c.newPage()));
  for (const [i, client] of clients.entries())
    await join(host, client, ["Emma", "Chris", "Sam"][i]);
  await expect(host.getByText("4/8", { exact: true })).toBeVisible();
  await host.screenshot({ path: "test-results/connected-host.png" });
  await Promise.all([
    host.getByRole("button", { name: "Cell 1", exact: true }).click(),
    clients[0].getByRole("button", { name: "Cell 2", exact: true }).click(),
    clients[1].getByRole("button", { name: "Cell 3", exact: true }).click(),
    clients[2].getByRole("button", { name: "Cell 4", exact: true }).click(),
  ]);
  for (const p of [host, ...clients]) {
    await expect(p.getByText("Revision 4", { exact: true })).toBeVisible();
    for (let i = 1; i <= 4; i++)
      await expect(
        p.getByRole("button", { name: "Cell " + i, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
  }
  for (let i = 0; i < 20; i++)
    await clients[0]
      .getByRole("button", { name: "Cell 7", exact: true })
      .click();
  for (const p of [host, ...clients]) {
    await expect(p.getByText("Revision 24", { exact: true })).toBeVisible();
    await expect(
      p.getByRole("button", { name: "Cell 7", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
  }
  await connectionDetails(host);
  await expect(host.getByText("open", { exact: true })).toHaveCount(3);
  for (const rtt of await host.getByTestId("rtt").all())
    await expect(rtt).toContainText("ms", { timeout: 10_000 });
  await connectionDetails(clients[0]);
  await expect(clients[0].getByTestId("rtt")).toContainText("ms", {
    timeout: 10_000,
  });
  await expect(clients[0].getByTestId("tap-response")).toContainText("ms");
  await host
    .locator(".debug")
    .screenshot({ path: "test-results/connected-details.png" });
  await closePanels(host);
  await closePanels(clients[0]);
  await expectStableScreenshot(host, ".grid", "shared-grid.png", {
    maxDiffPixels: 512,
  });
  await returnHome(clients[2]);
  await expect(host.getByText("3/8", { exact: true })).toBeVisible();
  await host.getByRole("button", { name: "Cell 16", exact: true }).click();
  await expect(
    clients[0].getByRole("button", { name: "Cell 16", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await join(host, clients[2], "Sam");
  await expect(
    clients[2].getByText("Revision 25", { exact: true }),
  ).toBeVisible();
  await returnHome(host);
  for (const p of clients) {
    await expect(p.getByRole("status")).toHaveText("Host disconnected");
    await expect(
      p.getByRole("button", { name: "Cell 1", exact: true }),
    ).toBeDisabled();
  }
  await clients[0].screenshot({ path: "test-results/disconnected-client.png" });
  for (const c of contexts) await c.close();
});

test("mobile controls, keyboard, invalid input, cancellation and persistent identity", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(page.getByLabel("Your name")).toHaveValue("");
  await expect(page.getByLabel("Your name")).toHaveAttribute(
    "placeholder",
    "Player",
  );
  await page.reload();
  // A saved default from an earlier visit also stays out of the editable text.
  await expect(page.getByLabel("Your name")).toHaveValue("");
  await createLights(page);
  await returnHome(page);
  await expect(page.getByLabel("Your name")).toHaveValue("");
  await page.getByLabel("Your name").pressSequentially("Family Player");
  await page.reload();
  await expect(page.getByLabel("Your name")).toHaveValue("Family Player");
  await page.getByRole("button", { name: "Join Game", exact: true }).click();
  await transferText(page, "Paste connection text instead");
  await page.getByLabel("Paste host invite code").fill("not an offer");
  await page
    .getByRole("button", { name: "Create Join Code", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Invalid connection text",
  );
  await returnHome(page);
  await createLights(page);
  await page.getByRole("button", { name: "Cell 1", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Cell 1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const metrics = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    gridBottom: document.querySelector(".grid")!.getBoundingClientRect().bottom,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
  expect(metrics.gridBottom).toBeLessThan(844);
  await page.screenshot({ path: "test-results/mobile-host.png" });
  await addPlayer(page);
  await transferText(page, "Copy/paste instead");
  await transferText(page, "Paste connection text instead");
  await expect(page.getByLabel("Invite text")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Paste player join code").fill("{}");
  await page
    .getByRole("button", { name: "Connect Player", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("valid join code");
  await closePanels(page);
  await page
    .getByRole("button", { name: "Cancel Invite", exact: true })
    .click();
  await expect(page.getByLabel("Invite text")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await returnHome(page);
  await page.getByLabel("Your name").fill("");
  await page.reload();
  await expect(page.getByLabel("Your name")).toHaveValue("");
  await page.screenshot({ path: "test-results/name-placeholder-mobile.png" });
});

test("production subpath manifest, cache, offline startup and identity survive reload", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page.getByLabel("Your name").fill("Offline Alex");
  const manifestURL = await page
    .locator("link[rel=manifest]")
    .getAttribute("href");
  expect(manifestURL).toContain("/multiplayer-test/");
  const response = await page.request.get(manifestURL!);
  const manifest = await response.json();
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons)
    expect(
      (await page.request.get(new URL(icon.src, response.url()).href)).ok(),
    ).toBe(true);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel("Your name")).toHaveValue("Offline Alex");
  await createLights(page);
  await page.getByRole("button", { name: "Cell 5", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cell 5", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Choose Game", exact: true }).click();
  await chooseGame(page, "Pong");
  await expect(page.getByRole("region", { name: "Pong game" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start Pong", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Choose Game", exact: true }).click();
  await chooseGame(page, "Reaction Race");
  await page.getByRole("button", { name: "Start Race", exact: true }).click();
  await expect(
    page.getByText("Wait… hands ready!", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop Race", exact: true }).click();
  await context.setOffline(false);
});

test("the complete board fits desktop, tablet and narrow phone viewports", async ({
  page,
}) => {
  for (const { font, ...viewport } of [
    { width: 1280, height: 900, font: "system" },
    { width: 1280, height: 720, font: "system" },
    { width: 768, height: 1024, font: "system" },
    { width: 320, height: 700, font: "system" },
    { width: 320, height: 700, font: "Arial" },
    { width: 320, height: 700, font: "Arial-tall" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("./");
    // Exercise different font metrics rather than relying on macOS's system font.
    if (font !== "system") {
      await page.addStyleTag({
        content: `:root { font-family: Arial, sans-serif; ${font === "Arial-tall" ? "line-height: 1.3;" : ""} }`,
      });
    }
    await createLights(page);
    const bounds = await page.locator(".board-card").boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
    await page.getByRole("button", { name: "Cell 1", exact: true }).click();
    await page.screenshot({
      path: `test-results/host-${viewport.width}x${viewport.height}-${font}.png`,
    });
    await addPlayer(page);
    const qr = page.getByRole("img", { name: "Invite QR code", exact: true });
    await expect(qr).toBeVisible();
    const qrBounds = await qr.boundingBox();
    expect(qrBounds!.y + qrBounds!.height).toBeLessThanOrEqual(viewport.height);
    if (viewport.width === 320) {
      expect(qrBounds!.width).toBeGreaterThanOrEqual(240);
      expect(
        qrBounds!.y + qrBounds!.height,
        `${font} QR must leave 32px below it on ${viewport.width}×${viewport.height}`,
      ).toBeLessThanOrEqual(viewport.height - 32);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({
      path: `test-results/qr-${viewport.width}x${viewport.height}-${font}.png`,
    });
  }
});

test("host picks games, assigns two Pong players, spectators watch, and switching preserves connections", async ({
  browser,
  page: host,
}) => {
  await monitorAudio(host);
  const contexts = await Promise.all(
    [0, 1].map(() =>
      browser.newContext({ viewport: { width: 390, height: 844 } }),
    ),
  );
  try {
    const [emma, sam] = await Promise.all(contexts.map((c) => c.newPage()));
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await expect(
      host.getByRole("region", { name: "Game picker" }),
    ).toBeVisible();
    await host.screenshot({ path: "test-results/game-picker-desktop.png" });
    await join(host, emma, "Emma");
    await join(host, sam, "Sam");
    await host.getByRole("button", { name: "Sound", exact: true }).click();
    await expect.poll(() => audioStarts(host)).toBeGreaterThan(0);
    const beforePong = await audioStarts(host);
    await emma.getByRole("button", { name: "More games", exact: true }).click();
    await expect(
      emma.getByRole("button", { name: "Pong", exact: true }),
    ).toBeDisabled();
    await chooseGame(host, "Pong");
    await expect(emma.getByRole("region", { name: "Pong game" })).toBeVisible();
    await expectStableScreenshot(
      host,
      ".pong-court",
      `pong-court-${process.platform}.png`,
    );
    // Text above the court must not change the shared baseline's geometry.
    const alternateFont = await host.addStyleTag({
      content: ":root { font-family: serif; line-height: 1.6; }",
    });
    await expectStableScreenshot(
      host,
      ".pong-court",
      `pong-court-${process.platform}.png`,
    );
    await alternateFont.evaluate((element) => element.remove());
    await host.getByLabel("Player 1").selectOption({ label: "Emma" });
    await host.getByLabel("Player 2").selectOption({ label: "Emma" });
    await expect(
      host.getByRole("button", { name: "Start Pong", exact: true }),
    ).toBeDisabled();
    await host.getByLabel("Player 2").selectOption({ label: "Sam" });
    await host.getByRole("button", { name: "Start Pong", exact: true }).click();
    await showHelp(host);
    await expect(
      host.getByText("You’re watching this match.", { exact: false }),
    ).toBeVisible();
    await closePanels(host);
    await expect(host.getByLabel("Your paddle")).toHaveCount(0);
    await expect(emma.getByLabel("Your paddle")).toBeEnabled();
    await expect(
      host.getByText("First to seven", { exact: true }),
    ).toBeVisible();
    await expect.poll(() => audioStarts(host)).toBeGreaterThan(beforePong);
    await showHelp(emma);
    await emma.getByLabel("Your paddle").press("End");
    await closePanels(emma);
    await expect
      .poll(async () =>
        Math.round(
          Number(await host.getByTestId("paddle-0").getAttribute("y")),
        ),
      )
      .toBe(494);
    await sam.getByRole("group", { name: "Pong court" }).press("ArrowRight");
    await expect
      .poll(async () =>
        Number(await host.getByTestId("paddle-1").getAttribute("y")),
      )
      .toBeLessThan(247);
    await host.getByRole("button", { name: "Pause Pong", exact: true }).click();
    await expect(emma.getByText("Match paused", { exact: true })).toBeVisible();
    await expect(emma.getByLabel("Your paddle")).toBeDisabled();
    const pausedPaddle = Math.round(
      (Number(await host.getByTestId("paddle-0").getAttribute("y")) / 650 +
        0.12) *
        100,
    );
    await expect(emma.getByLabel("Your paddle")).toHaveValue(
      String(pausedPaddle),
    );
    await emma.screenshot({ path: "test-results/pong-mobile.png" });
    await host
      .getByRole("button", { name: "Resume Pong", exact: true })
      .click();
    await expect(emma.getByLabel("Your paddle")).toBeEnabled();
    await returnHome(sam);
    await expect(
      host.getByText("A player left.", { exact: false }),
    ).toBeVisible();
    await expect(
      host.getByRole("button", { name: "Start Pong", exact: true }),
    ).toBeVisible();
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await chooseGame(host, "Reaction Race");
    await expect(
      emma.getByRole("region", { name: "Reaction Race game" }),
    ).toBeVisible();
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await chooseGame(host, "Shared Lights");
    await emma.getByRole("button", { name: "Cell 1", exact: true }).click();
    await expect(
      host.getByRole("button", { name: "Cell 1", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(emma.getByRole("status")).toHaveText("Connected to host");
    await expect(host.getByText("2/8", { exact: true })).toBeVisible();
  } finally {
    for (const context of contexts) await context.close();
  }
});

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
    await expectStableScreenshot(host, ".race-targets", "race-targets.png", {
      maxDiffPixels: 250,
    });
    await host.getByRole("button", { name: "Start Race", exact: true }).click();
    await expect(
      client.getByText("Wait… hands ready!", { exact: true }),
    ).toBeVisible();
    await client.getByRole("button", { name: "Target 2", exact: true }).click();
    await expect(
      client.getByText("Too early · −25", { exact: true }),
    ).toBeVisible();
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
        await expect(
          client.getByText("Wrong target · −25", { exact: true }),
        ).toBeVisible();
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
      if (round === 3)
        await client.screenshot({
          path: "test-results/reaction-mobile.png",
          fullPage: true,
        });
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

test("game picker and new game controls fit phones, tablet and desktop with long names", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 700 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("./");
    await page.getByLabel("Your name").fill("ABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    await page
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    for (const name of ["Pong", "Arena Pong", "Reaction Race"] as const) {
      await chooseGame(page, name);
      const surface = page.locator(
        name === "Reaction Race" ? ".race-targets" : ".pong-court",
      );
      const bounds = await surface.boundingBox();
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);
      await page.screenshot({
        path: `test-results/${name === "Pong" ? "pong" : name === "Arena Pong" ? "arena" : "reaction"}-${viewport.width}x${viewport.height}.png`,
      });
      await page
        .getByRole("button", { name: "Choose Game", exact: true })
        .click();
    }
  }
});

test("sound defaults to mute, unlocks on tap, plays light cues, persists and works offline", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    const oscillator = AudioContext.prototype.createOscillator;
    (window as unknown as { audioStarts: number }).audioStarts = 0;
    AudioContext.prototype.createOscillator = function () {
      (window as unknown as { audioStarts: number }).audioStarts++;
      return oscillator.call(this);
    };
  });
  const starts = () =>
    page.evaluate(
      () => (window as unknown as { audioStarts: number }).audioStarts,
    );
  await page.goto("./");
  const sound = page.getByRole("button", { name: "Sound", exact: true });
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await createLights(page);
  await page.getByRole("button", { name: "Cell 1", exact: true }).click();
  expect(await starts()).toBe(0);
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await expect.poll(starts).toBeGreaterThan(0);
  const enabledCount = await starts();
  await page.getByRole("button", { name: "Cell 2", exact: true }).click();
  await expect.poll(starts).toBeGreaterThan(enabledCount);
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  const mutedCount = await starts();
  await page.getByRole("button", { name: "Cell 3", exact: true }).click();
  expect(await starts()).toBe(mutedCount);
  await page.reload();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await sound.press("Enter");
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  expect(await starts()).toBe(0);
  await createLights(page);
  await page.getByRole("button", { name: "Cell 4", exact: true }).click();
  await expect.poll(starts).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/sound-enabled.png" });
  await context.setOffline(false);
});

test("unavailable audio does not prevent playing", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "AudioContext", { value: undefined });
    Object.defineProperty(window, "webkitAudioContext", { value: undefined });
  });
  await page.goto("./");
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  await expect(
    page.getByText("Sound couldn’t start.", { exact: false }),
  ).toBeVisible();
  await createLights(page);
  await page.getByRole("button", { name: "Cell 1", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cell 1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("Arena Pong synchronizes four players, rotated controls, colors, pause and disconnect", async ({
  browser,
  page: host,
}) => {
  const contexts = await Promise.all(
    [0, 1, 2].map(() =>
      browser.newContext({ viewport: { width: 390, height: 844 } }),
    ),
  );
  try {
    const [emma, sam, lee] = await Promise.all(
      contexts.map((c) => c.newPage()),
    );
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await join(host, emma, "Emma");
    await join(host, sam, "Sam");
    await join(host, lee, "Lee");
    await chooseGame(host, "Arena Pong");
    await expect(
      emma.getByRole("region", { name: "Arena Pong game" }),
    ).toBeVisible();
    await showHelp(emma);
    await emma
      .getByRole("button", { name: "Coral paddle", exact: true })
      .click();
    await closePanels(emma);
    await expect(
      host.getByRole("button", { name: "Start Arena Pong", exact: true }),
    ).toBeEnabled();
    await host
      .getByRole("button", { name: "Start Arena Pong", exact: true })
      .click();
    for (const page of [host, emma, sam, lee]) {
      await showHelp(page);
      await expect(
        page.getByText("Your paddle is at the bottom.", { exact: false }),
      ).toBeVisible();
      await closePanels(page);
      await expect(page.getByTestId("arena-lives-0")).toContainText("5 lives");
      await expect(page.getByTestId("arena-paddle-1")).toHaveAttribute(
        "fill",
        "#fda4af",
      );
    }
    for (const [page, rotation] of [
      [host, 0],
      [emma, 90],
      [sam, 180],
      [lee, 270],
    ] as const)
      await expect(page.locator(".arena-court svg g")).toHaveAttribute(
        "transform",
        `rotate(${rotation} 500 500)`,
      );
    await emma
      .getByRole("group", { name: "Arena court", exact: true })
      .press("ArrowRight");
    await expect
      .poll(async () =>
        Number(await host.getByTestId("arena-paddle-1").getAttribute("y")),
      )
      .toBeLessThan(380);
    await host
      .getByRole("button", { name: "Pause Arena", exact: true })
      .click();
    await expect(emma.getByText("Arena paused", { exact: true })).toBeVisible();
    await expect(
      emma.getByLabel("Your paddle", { exact: true }),
    ).toBeDisabled();
    await host
      .getByRole("region", { name: "Arena Pong game" })
      .screenshot({ path: "test-results/arena-desktop.png" });
    await emma.setViewportSize({ width: 320, height: 700 });
    for (const font of ["system", "Arial", "Arial-tall"]) {
      if (font !== "system")
        await emma.addStyleTag({
          content: `:root { font-family: Arial, sans-serif; ${font === "Arial-tall" ? "line-height: 1.3;" : ""} }`,
        });
      await emma.keyboard.press("Control+Home");
      const courtBounds = await emma
        .getByRole("group", { name: "Arena court" })
        .boundingBox();
      expect(courtBounds!.y + courtBounds!.height).toBeLessThanOrEqual(700);
      expect(
        await emma.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(320);
      await emma.screenshot({
        path: `test-results/arena-phone-${font}.png`,
        fullPage: true,
      });
    }
    await host
      .getByRole("button", { name: "Resume Arena", exact: true })
      .click();
    await expect(emma.getByLabel("Your paddle", { exact: true })).toBeEnabled();
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await chooseGame(host, "Arena Pong");
    await host.getByLabel("Left player", { exact: true }).selectOption("");
    await host
      .getByLabel("Lives per player", { exact: true })
      .selectOption("3");
    await host
      .getByRole("button", { name: "Start Arena Pong", exact: true })
      .click();
    await expect(emma.getByTestId("arena-lives-0")).toContainText("3 lives");
    await expect(
      lee.getByLabel("Lives per player", { exact: true }),
    ).toHaveCount(0);
    await expect(emma.getByTestId("arena-paddle-3")).toHaveAttribute(
      "data-active",
      "false",
    );
    await expect(
      lee.getByText("You’re watching. The host picks the players.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(lee.getByLabel("Your paddle", { exact: true })).toHaveCount(0);
    await expect(
      emma.getByRole("button", {
        name: "Coral paddle",
        exact: true,
        includeHidden: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await returnHome(emma);
    await expect(
      host.getByText("A player left. Choose players and start a new round.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      sam.getByRole("button", { name: "Start Arena Pong", exact: true }),
    ).toHaveCount(0);
    await emma.reload();
    await emma
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await chooseGame(emma, "Pong");
    await expect(
      emma.getByRole("button", {
        name: "Coral paddle",
        exact: true,
        includeHidden: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
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

test("Co-op Breakout pairs teammates, rotates controls, pauses and handles spectators and disconnects", async ({
  browser,
  page: host,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  try {
    const client = await context.newPage();
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await join(host, client, "Emma");
    await chooseGame(host, "Co-op Breakout");
    await expect(
      client.getByRole("region", { name: "Co-op Breakout game" }),
    ).toBeVisible();
    await expect(
      client.getByRole("button", { name: "Start Co-op Breakout", exact: true }),
    ).toHaveCount(0);
    await expectStableScreenshot(host, ".arena-court", "breakout-court.png");
    // Reject duplicate assignments, and allow solo practice with spectators.
    await host
      .getByLabel("Right player", { exact: true })
      .selectOption(
        await host.getByLabel("Bottom player", { exact: true }).inputValue(),
      );
    await expect(
      host.getByRole("button", { name: "Start Co-op Breakout", exact: true }),
    ).toBeDisabled();
    await host.getByLabel("Right player", { exact: true }).selectOption("");
    await host
      .getByRole("button", { name: "Start Co-op Breakout", exact: true })
      .click();
    await expect(
      client.getByText("You’re watching. The host picks the players.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(client.getByLabel("Your paddle", { exact: true })).toHaveCount(
      0,
    );
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await chooseGame(host, "Co-op Breakout");
    await host
      .getByRole("button", { name: "Start Co-op Breakout", exact: true })
      .click();
    await expect(client.locator(".arena-court svg > g")).toHaveAttribute(
      "transform",
      "rotate(90 500 500)",
    );
    await expect(client.getByLabel("Team progress")).toContainText(
      "5 shared lives",
    );
    await expect(client.getByTestId("arena-paddle-2")).toHaveAttribute(
      "data-active",
      "false",
    );
    await client
      .getByRole("group", { name: "Breakout court", exact: true })
      .press("ArrowRight");
    await expect
      .poll(async () =>
        Number(await host.getByTestId("arena-paddle-1").getAttribute("y")),
      )
      .toBeLessThan(380);
    await host
      .getByRole("button", { name: "Pause Breakout", exact: true })
      .click();
    await expect(
      client.getByText("Co-op Breakout paused", { exact: true }),
    ).toBeVisible();
    await expect(
      client.getByLabel("Your paddle", { exact: true }),
    ).toBeDisabled();
    await host.screenshot({
      path: "test-results/breakout-desktop.png",
      fullPage: true,
    });
    for (const viewport of [
      { width: 320, height: 700 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
    ]) {
      await client.setViewportSize(viewport);
      for (const font of ["system", "Arial-tall"]) {
        const style =
          font === "system"
            ? null
            : await client.addStyleTag({
                content: ":root {font-family:Arial,sans-serif;line-height:1.3}",
              });
        await client.keyboard.press("Control+Home");
        const bounds = await client
          .getByRole("group", { name: "Breakout court" })
          .boundingBox();
        expect(bounds!.y + bounds!.height).toBeLessThan(viewport.height - 16);
        expect(
          await client.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(viewport.width);
        await client.screenshot({
          path: `test-results/breakout-${viewport.width}-${font}.png`,
          fullPage: true,
        });
        await style?.evaluate((el) => el.remove());
      }
    }
    await host
      .getByRole("button", { name: "Resume Breakout", exact: true })
      .click();
    await expect(
      client.getByLabel("Your paddle", { exact: true }),
    ).toBeEnabled();
    // A real touch drag sends the canonical (rotated) position to the host.
    await client.setViewportSize({ width: 390, height: 844 });
    await client
      .getByRole("group", { name: "Breakout court" })
      .tap({ position: { x: 40, y: 80 } });
    await expect
      .poll(async () =>
        Number(await host.getByTestId("arena-paddle-1").getAttribute("y")),
      )
      .toBeGreaterThan(550);
    await returnHome(client);
    await expect(
      host.getByText("A player left. Choose players and start a new round.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      host.getByRole("button", { name: "Start Co-op Breakout", exact: true }),
    ).toBeEnabled();
    await host
      .getByRole("button", { name: "Start Co-op Breakout", exact: true })
      .click();
    await expect(host.getByLabel("Team progress")).toContainText(
      "5 shared lives",
    );
  } finally {
    await context.close();
  }
});

test("four Breakout teammates fit narrow phones with long names and taller fonts", async ({
  browser,
  page: host,
}) => {
  const contexts = await Promise.all([0, 1, 2].map(() => browser.newContext()));
  try {
    const clients = await Promise.all(contexts.map((c) => c.newPage()));
    await host.goto("./");
    await host
      .getByLabel("Your name")
      .fill("Alex with a very long family name");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    for (const [i, client] of clients.entries())
      await join(host, client, ["Emma", "Sam", "Lee"][i]);
    await chooseGame(host, "Co-op Breakout");
    await host
      .getByRole("button", { name: "Start Co-op Breakout", exact: true })
      .click();
    for (const [i, client] of clients.entries()) {
      await expect(client.locator(".arena-court svg > g")).toHaveAttribute(
        "transform",
        `rotate(${(i + 1) * 90} 500 500)`,
      );
      await expect(
        client.getByLabel("Your paddle", { exact: true }),
      ).toBeEnabled();
    }
    await host
      .getByRole("button", { name: "Pause Breakout", exact: true })
      .click();
    await host.setViewportSize({ width: 320, height: 700 });
    await host.addStyleTag({
      content: ":root {font-family:Arial,sans-serif;line-height:1.3}",
    });
    await host.keyboard.press("Control+Home");
    const court = await host
      .getByRole("group", { name: "Breakout court" })
      .boundingBox();
    expect(court!.y + court!.height).toBeLessThan(684);
    expect(
      await host.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    await host.screenshot({
      path: "test-results/breakout-four-phone.png",
      fullPage: true,
    });
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test("Light-cycle Arena pairs riders, steers by touch and keyboard, draws, rematches and handles departures", async ({
  browser,
  page: host,
}) => {
  test.setTimeout(90_000);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const lateContext = await browser.newContext();
  try {
    const client = await context.newPage(),
      late = await lateContext.newPage();
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await chooseGame(host, "Light-cycle Arena");
    await expect(
      host.getByRole("button", { name: "Start Arena", exact: true }),
    ).toBeDisabled();
    await join(host, client, "Emma");
    await expect(
      client.getByRole("region", { name: "Light-cycle Arena game" }),
    ).toBeVisible();
    await expect(
      client.getByRole("button", { name: "Start Arena", exact: true }),
    ).toHaveCount(0);
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Arena", exact: true })
      .click();
    await expect(client.locator(".cycle-status")).toHaveText("Get ready… 3");
    await expect(
      client.getByRole("button", { name: "Steer up", exact: true }),
    ).toBeDisabled();
    await expect(host.locator(".cycle-court")).toBeFocused();
    const startBounds = await host.locator(".cycle-court").boundingBox();
    expect(startBounds!.y).toBeGreaterThanOrEqual(0);
    expect(startBounds!.y + startBounds!.height).toBeLessThanOrEqual(720);
    await expectStableScreenshot(host, ".cycle-court", "cycle-court.png");
    await host.clock.runFor(3000);
    await expect(
      client.getByRole("button", { name: "Steer up", exact: true }),
    ).toBeEnabled();
    // Between authoritative grid steps, head and trail advance continuously.
    await host.clock.runFor(150);
    await expect(host.getByTestId("cycle-rider-0")).toHaveAttribute(
      "data-x",
      "5",
    );
    await host.clock.runFor(25);
    const headX = await host
      .getByTestId("cycle-rider-0")
      .evaluate(
        (element) =>
          (element as unknown as SVGGElement).transform.baseVal.consolidate()!
            .matrix.e,
      );
    expect(headX).toBeGreaterThan(45);
    expect(headX).toBeLessThan(55);
    const trailX = await host
      .getByTestId("cycle-extension-0")
      .getAttribute("x2");
    expect(Number(trailX)).toBeCloseTo(headX);
    await client.getByRole("button", { name: "Steer up", exact: true }).tap();
    // Touch arrives over the actual DataChannel before the next grid step.
    await expect
      .poll(() => host.locator(".people-card").textContent())
      .toContain("Emma");
    await host.clock.runFor(300);
    await expect(host.getByTestId("cycle-rider-1")).toHaveAttribute(
      "data-direction",
      "up",
    );
    await host.locator(".cycle-court").press("ArrowDown");
    await host.clock.runFor(150);
    await expect(client.getByTestId("cycle-rider-0")).toHaveAttribute(
      "data-direction",
      "down",
    );
    await client.getByRole("button", { name: "Steer down", exact: true }).tap();
    await host.clock.runFor(300);
    await expect(host.getByTestId("cycle-rider-1")).toHaveAttribute(
      "data-direction",
      "up",
    );
    await host
      .getByRole("button", { name: "Pause Arena", exact: true })
      .click();
    await expect(client.locator(".cycle-status")).toHaveText("Arena paused");
    const pausedHead = host.getByTestId("cycle-rider-0");
    const pausedMatrix = await pausedHead.evaluate(
      (element) =>
        (element as unknown as SVGGElement).transform.baseVal.consolidate()!
          .matrix.e,
    );
    expect(pausedMatrix).toBe(
      Number(await pausedHead.getAttribute("data-x")) * 10 + 5,
    );
    const tick = await host.locator(".cycle-court").getAttribute("data-tick");
    await host.clock.runFor(3000);
    await expect(host.locator(".cycle-court")).toHaveAttribute(
      "data-tick",
      tick!,
    );
    for (const viewport of [
      { width: 320, height: 700 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
    ]) {
      await client.setViewportSize(viewport);
      for (const font of ["system", "Arial-tall"]) {
        const style =
          font === "system"
            ? null
            : await client.addStyleTag({
                content: ":root{font-family:Arial,sans-serif;line-height:1.3}",
              });
        await client.keyboard.press("Control+Home");
        const controls = await client.locator(".cycle-controls").boundingBox();
        expect(controls!.y + controls!.height).toBeLessThan(
          viewport.height - 16,
        );
        expect(
          await client.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(viewport.width);
        const button = await client
          .getByRole("button", { name: "Steer up", exact: true })
          .boundingBox();
        expect(button!.width).toBeGreaterThanOrEqual(72);
        expect(button!.height).toBeGreaterThanOrEqual(64);
        await client.screenshot({
          path: `test-results/cycle-${viewport.width}-${font}.png`,
          fullPage: true,
        });
        await style?.evaluate((el) => el.remove());
      }
    }
    await host.screenshot({
      path: "test-results/cycle-desktop.png",
      fullPage: true,
    });
    await host
      .locator(".cycle-game-card")
      .screenshot({ path: "test-results/cycle-game.png" });
    await host
      .getByRole("button", { name: "Resume Arena", exact: true })
      .click();
    await expect(client.locator(".cycle-status")).toHaveText("Get ready… 3");
    // Reduced-motion users get exact grid positions without interpolation.
    await host.emulateMedia({ reducedMotion: "reduce" });
    await host.clock.runFor(3000);
    await expect(host.locator(".cycle-status")).toContainText("riders remain");
    await host.clock.runFor(150);
    const reducedHead = host.getByTestId("cycle-rider-0");
    const reducedPosition = await reducedHead.evaluate((element) => ({
      x: (element as unknown as SVGGElement).transform.baseVal.consolidate()!
        .matrix.e,
      y: (element as unknown as SVGGElement).transform.baseVal.consolidate()!
        .matrix.f,
      targetX: Number(element.getAttribute("data-x")) * 10 + 5,
      targetY: Number(element.getAttribute("data-y")) * 10 + 5,
    }));
    expect(reducedPosition.x).toBe(reducedPosition.targetX);
    expect(reducedPosition.y).toBe(reducedPosition.targetY);
    await host.emulateMedia({ reducedMotion: "no-preference" });
    // Re-select for a deterministic untouched round; equal wall distances draw.
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await chooseGame(host, "Light-cycle Arena");
    await host
      .getByRole("button", { name: "Start Arena", exact: true })
      .click();
    await host.clock.runFor(7500);
    await expect(client.locator(".cycle-status")).toHaveText(
      "Draw! Everyone crashed.",
    );
    await host.getByRole("button", { name: "Ride Again", exact: true }).click();
    await expect(client.getByTestId("cycle-rider-1")).toHaveAttribute(
      "data-alive",
      "true",
    );
    await host.clock.runFor(3000);
    await host.clock.resume();
    await join(host, late, "Sam with a long family name");
    await expect(host.locator(".cycle-status")).toHaveText("Arena paused");
    await expect(late.locator(".cycle-feedback")).toContainText(
      "You’re watching",
    );
    await expect(
      late.getByRole("button", { name: "Steer up", exact: true }),
    ).toBeDisabled();
    await host
      .getByRole("button", { name: "Resume Arena", exact: true })
      .click();
    await returnHome(late);
    await expect(
      host.getByRole("button", { name: "Pause Arena", exact: true }),
    ).toBeVisible();
    await returnHome(client);
    await expect(
      host.getByText("A player left. Choose players and start a new round.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      host.getByRole("button", { name: "Start Arena", exact: true }),
    ).toBeDisabled();
  } finally {
    await context.close();
    await lateContext.close();
  }
});

test("eight Light-cycle riders fit a narrow phone and support swipe, background pause and host loss", async ({
  browser,
  page: host,
}) => {
  test.setTimeout(90_000);
  const contexts = await Promise.all(
    Array.from({ length: 7 }, () =>
      browser.newContext({
        viewport: { width: 320, height: 700 },
        hasTouch: true,
      }),
    ),
  );
  try {
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex with a very long rider name");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    const clients: Page[] = [];
    for (const [i, context] of contexts.entries()) {
      const client = await context.newPage();
      clients.push(client);
      await join(host, client, `Rider ${i + 2} with a long family name`);
    }
    await chooseGame(host, "Light-cycle Arena");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Arena", exact: true })
      .click();
    const client = clients[0];
    await expect(client.locator(".cycle-riders li")).toHaveCount(8);
    await client.addStyleTag({
      content: ":root{font-family:Arial,sans-serif;line-height:1.3}",
    });
    await client.keyboard.press("Control+Home");
    const bounds = await client.locator(".cycle-controls").boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThan(684);
    expect(
      await client.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    await client.screenshot({
      path: "test-results/cycle-eight-phone.png",
      fullPage: true,
    });
    await host.clock.runFor(3000);
    // A physical-style touch swipe on the play surface must turn without scrolling.
    const court = await client.locator(".cycle-court").boundingBox();
    const x = court!.x + court!.width / 2,
      y = court!.y + court!.height / 2;
    const cdp = await client.context().newCDPSession(client);
    const beforeScroll = await client.evaluate(() => scrollY);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y - 45 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await host.clock.runFor(300);
    await expect(host.getByTestId("cycle-rider-1")).toHaveAttribute(
      "data-direction",
      "up",
    );
    expect(await client.evaluate(() => scrollY)).toBe(beforeScroll);
    // Walk the host through all four directions using normal keyboard input.
    for (const [key, direction] of [
      ["s", "down"],
      ["a", "left"],
      ["w", "up"],
      ["d", "right"],
    ]) {
      await host.locator(".cycle-court").press(key);
      await host.clock.runFor(450);
      await expect(client.getByTestId("cycle-rider-0")).toHaveAttribute(
        "data-direction",
        direction,
      );
    }
    await host.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(client.locator(".cycle-status")).toHaveText("Arena paused");
    await host.clock.runFor(2000);
    await host.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: false,
      });
    });
    await host
      .getByRole("button", { name: "Resume Arena", exact: true })
      .click();
    await expect(client.locator(".cycle-status")).toHaveText("Get ready… 3");
    await returnHome(host);
    await expect(client.locator(".cycle-status")).toHaveText(
      "Host disconnected",
    );
    await expect(
      client.getByRole("button", { name: "Steer up", exact: true }),
    ).toBeDisabled();
    await client.screenshot({
      path: "test-results/cycle-host-disconnected.png",
      fullPage: true,
    });
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test("Sumo Bumpers pairs, moves by thumb pad and keyboard, dashes, pauses, finishes and rematches", async ({
  browser,
  page: host,
}) => {
  test.setTimeout(90_000);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const lateContext = await browser.newContext();
  try {
    const client = await context.newPage(),
      late = await lateContext.newPage();
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await chooseGame(host, "Sumo Bumpers");
    await expect(
      host.getByRole("button", { name: "Start Bumpers", exact: true }),
    ).toBeDisabled();
    await join(host, client, "Emma");
    await expect(
      client.getByRole("region", { name: "Sumo Bumpers game" }),
    ).toBeVisible();
    await expect(
      client.getByRole("button", { name: "Start Bumpers", exact: true }),
    ).toHaveCount(0);
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Bumpers", exact: true })
      .click();
    await expect(client.locator(".sumo-status")).toHaveText("Get ready… 3");
    await expect(
      client.getByRole("button", { name: "Dash", exact: true }),
    ).toBeDisabled();
    await expect(host.locator(".sumo-court")).toBeFocused();
    await expectStableScreenshot(host, ".sumo-court", "sumo-court.png");
    await host.clock.runFor(3050);
    await expect(client.locator(".sumo-status")).toContainText(
      "2 bumpers remain",
    );
    const cdp = await context.newCDPSession(client);
    const pad = await client
      .getByRole("group", { name: "Movement thumb pad", exact: true })
      .boundingBox();
    const beforeScroll = await client.evaluate(() => scrollY);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ id: 1, x: pad!.x + 20, y: pad!.y + pad!.height / 2 }],
    });
    // Wait for the actual data-channel input before advancing the host clock.
    await expect
      .poll(() => host.getByTestId("sumo-bumper-1").getAttribute("data-dx"))
      .toBe("-1");
    const dashBounds = await client
      .getByRole("button", { name: "Dash", exact: true })
      .boundingBox();
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { id: 1, x: pad!.x + 20, y: pad!.y + pad!.height / 2 },
        {
          id: 2,
          x: dashBounds!.x + dashBounds!.width / 2,
          y: dashBounds!.y + dashBounds!.height / 2,
        },
      ],
    });
    await expect
      .poll(async () =>
        Number(
          await host.getByTestId("sumo-bumper-1").getAttribute("data-cooldown"),
        ),
      )
      .toBeGreaterThan(0);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [{ id: 1, x: pad!.x + 20, y: pad!.y + pad!.height / 2 }],
    });
    await host.clock.runFor(100);
    await expect
      .poll(async () =>
        Number(
          await client
            .getByTestId("sumo-bumper-1")
            .getAttribute("data-cooldown"),
        ),
      )
      .toBeGreaterThan(0);
    await expect
      .poll(async () =>
        Number(
          await client.getByTestId("sumo-bumper-1").getAttribute("data-x"),
        ),
      )
      .toBeLessThan(0.75);
    await host.clock.runFor(25);
    const smooth = await host
      .getByTestId("sumo-bumper-1")
      .evaluate((element) => ({
        drawn:
          (element as unknown as SVGGElement).transform.baseVal.consolidate()!
            .matrix.e / 1000,
        target: Number(element.getAttribute("data-x")),
      }));
    expect(smooth.drawn).toBeGreaterThan(smooth.target);
    expect(smooth.drawn).toBeLessThan(0.75);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(() => host.getByTestId("sumo-bumper-1").getAttribute("data-dx"))
      .toBe("0");
    expect(await client.evaluate(() => scrollY)).toBe(beforeScroll);
    await host.locator(".sumo-court").focus();
    await host.keyboard.down("ArrowRight");
    await host.keyboard.press("Space");
    await host.clock.runFor(100);
    await expect
      .poll(async () =>
        Number(
          await client.getByTestId("sumo-bumper-0").getAttribute("data-x"),
        ),
      )
      .toBeGreaterThan(0.25);
    await host.keyboard.up("ArrowRight");
    await host
      .getByRole("button", { name: "Pause Bumpers", exact: true })
      .click();
    await expect(client.locator(".sumo-status")).toHaveText("Ring paused");
    const pausedPosition = await host
      .getByTestId("sumo-bumper-0")
      .evaluate((element) => ({
        drawn: (
          element as unknown as SVGGElement
        ).transform.baseVal.consolidate()!.matrix.e,
        target: Number(element.getAttribute("data-x")) * 1000,
      }));
    expect(pausedPosition.drawn).toBeCloseTo(pausedPosition.target);
    const tick = await host.locator(".sumo-court").getAttribute("data-tick");
    await host.clock.runFor(2000);
    await expect(host.locator(".sumo-court")).toHaveAttribute(
      "data-tick",
      tick!,
    );
    for (const viewport of [
      { width: 320, height: 700 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
    ]) {
      await client.setViewportSize(viewport);
      for (const font of ["system", "Arial-tall"]) {
        const style =
          font === "system"
            ? null
            : await client.addStyleTag({
                content: ":root{font-family:Arial,sans-serif;line-height:1.3}",
              });
        await client.keyboard.press("Control+Home");
        const controls = await client.locator(".sumo-controls").boundingBox();
        expect(controls!.y + controls!.height).toBeLessThan(
          viewport.height - 16,
        );
        expect(
          await client.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(viewport.width);
        const dash = await client
          .getByRole("button", { name: "Dash", exact: true })
          .boundingBox();
        expect(dash!.width).toBeGreaterThanOrEqual(90);
        expect(dash!.height).toBeGreaterThanOrEqual(72);
        await client.screenshot({
          path: `test-results/sumo-${viewport.width}-${font}.png`,
          fullPage: true,
        });
        await style?.evaluate((el) => el.remove());
      }
    }
    await host
      .locator(".sumo-game-card")
      .screenshot({ path: "test-results/sumo-game.png" });
    await host.screenshot({
      path: "test-results/sumo-desktop.png",
      fullPage: true,
    });
    await host
      .getByRole("button", { name: "Resume Bumpers", exact: true })
      .click();
    await expect(client.locator(".sumo-status")).toHaveText("Get ready… 3");
    await host.clock.runFor(3050);
    await host.emulateMedia({ reducedMotion: "reduce" });
    await host.locator(".sumo-court").focus();
    await host.keyboard.down("w");
    await host.clock.runFor(100);
    const reduced = await host
      .getByTestId("sumo-bumper-0")
      .evaluate((element) => ({
        drawn: (
          element as unknown as SVGGElement
        ).transform.baseVal.consolidate()!.matrix.f,
        target: Number(element.getAttribute("data-y")) * 1000,
      }));
    expect(reduced.drawn).toBeCloseTo(reduced.target);
    await host.keyboard.up("w");
    await host.emulateMedia({ reducedMotion: "no-preference" });
    // Pairing during live play pauses; a late arrival watches this round.
    await join(host, late, "Sam");
    await expect(late.locator(".sumo-feedback")).toContainText("watching");
    await expect(
      late.getByRole("button", { name: "Dash", exact: true }),
    ).toBeDisabled();
    await returnHome(late);
    await expect(host.locator(".people-card")).toContainText("2 connected");
    await host
      .getByRole("button", { name: "Resume Bumpers", exact: true })
      .click();
    await host.clock.runFor(3050);
    await expect(host.locator(".sumo-status")).toContainText(
      "2 bumpers remain",
    );
    await host.locator(".sumo-court").focus();
    await host.keyboard.down("ArrowLeft");
    await host.clock.runFor(2500);
    await host.keyboard.up("ArrowLeft");
    await expect(client.locator(".sumo-status")).toHaveText("Emma wins!");
    await expect(client.getByTestId("sumo-bumper-0")).toHaveAttribute(
      "data-alive",
      "false",
    );
    await host.getByRole("button", { name: "Bump Again", exact: true }).click();
    await expect(client.getByTestId("sumo-bumper-0")).toHaveAttribute(
      "data-alive",
      "true",
    );
    await expect(client.getByTestId("sumo-bumper-0")).toHaveAttribute(
      "data-x",
      "0.25",
    );
    await returnHome(client);
    await expect(
      host.getByText("A player left. Choose players and start a new round.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      host.getByRole("button", { name: "Start Bumpers", exact: true }),
    ).toBeDisabled();
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await expect(
      host.getByRole("region", { name: "Game picker" }),
    ).toBeVisible();
  } finally {
    await context.close();
    await lateContext.close();
  }
});

test("eight Sumo bumpers fit narrow phones, clear movement on background and handle host loss", async ({
  browser,
  page: host,
}) => {
  test.setTimeout(90_000);
  const contexts = await Promise.all(
    Array.from({ length: 7 }, () =>
      browser.newContext({
        viewport: { width: 320, height: 700 },
        hasTouch: true,
      }),
    ),
  );
  try {
    await host.goto("./");
    await host
      .getByLabel("Your name")
      .fill("Alex with a very long bumper name");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    const clients: Page[] = [];
    for (const [i, context] of contexts.entries()) {
      const client = await context.newPage();
      clients.push(client);
      await join(host, client, `Bumper ${i + 2} with a long name`);
    }
    await chooseGame(host, "Sumo Bumpers");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Bumpers", exact: true })
      .click();
    const client = clients[0];
    await expect(client.locator(".cycle-riders li")).toHaveCount(8);
    await client.addStyleTag({
      content: ":root{font-family:Arial,sans-serif;line-height:1.3}",
    });
    await client.keyboard.press("Control+Home");
    const controls = await client.locator(".sumo-controls").boundingBox();
    expect(controls!.y + controls!.height).toBeLessThan(684);
    expect(
      await client.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    await client.screenshot({
      path: "test-results/sumo-eight-phone.png",
      fullPage: true,
    });
    await host.clock.runFor(3050);
    await host.locator(".sumo-court").focus();
    await host.keyboard.down("w");
    await host.clock.runFor(100);
    await host.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await host.keyboard.up("w");
    await expect(client.locator(".sumo-status")).toHaveText("Ring paused");
    await expect(host.getByTestId("sumo-bumper-0")).toHaveAttribute(
      "data-dy",
      "0",
    );
    await host.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: false,
      });
    });
    await host
      .getByRole("button", { name: "Resume Bumpers", exact: true })
      .click();
    await expect(client.locator(".sumo-status")).toHaveText("Get ready… 3");
    await returnHome(host);
    await expect(client.locator(".sumo-status")).toHaveText(
      "Host disconnected",
    );
    await expect(
      client.getByRole("button", { name: "Dash", exact: true }),
    ).toBeDisabled();
    await expect(
      client.getByRole("group", { name: "Movement thumb pad", exact: true }),
    ).toHaveAttribute("aria-disabled", "true");
    await client.screenshot({
      path: "test-results/sumo-host-disconnected.png",
      fullPage: true,
    });
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
