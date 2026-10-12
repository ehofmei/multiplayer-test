import { monitorAudio, audioStarts } from "./audio";
import {
  addPlayer,
  join,
  chooseGame,
  closePanels,
  connectionDetails,
  expectScreenFits,
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
    await expect(
      host.getByRole("button", { name: "Cell 1", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
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

test("scanner modal fills the viewport, traps focus and releases the stream on close or Escape", async ({
  baseURL,
}) => {
  const browser = await chromium.launch({
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  });
  try {
    const page = await browser.newPage({
      baseURL,
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

async function expectRevision(page: Page, revision: number) {
  await openMenu(page);
  const details = page.locator(".debug");
  if (!(await page.locator(".debug[open]").count()))
    await details.locator("summary").click();
  await expect(
    details.getByText(`Revision ${revision}`, { exact: true }),
  ).toBeVisible();
  await details.locator("summary").click();
  await closePanels(page);
}

async function createLights(page: Page) {
  await page.getByRole("button", { name: "Create Game", exact: true }).click();
  await chooseGame(page, "Shared Lights");
}

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
          page.getByRole("button", { name: "Cell 1", exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
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
    await expectRevision(p, 4);
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
    await expectRevision(p, 24);
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
  await expectStableScreenshot(
    host,
    ".grid",
    `shared-grid-${process.platform}.png`,
    {
      maxDiffPixels: 512,
    },
  );
  await Promise.all(
    [host, ...clients].map((p) =>
      p.getByRole("button", { name: "Cell 8", exact: true }).click(),
    ),
  );
  for (const p of [host, ...clients]) {
    await expectRevision(p, 28);
    await expect(
      p.getByRole("button", { name: "Cell 8", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
  }
  await returnHome(clients[2]);
  await expect(host.getByText("3/8", { exact: true })).toBeVisible();
  await host.getByRole("button", { name: "Cell 16", exact: true }).click();
  await expect(
    clients[0].getByRole("button", { name: "Cell 16", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await join(host, clients[2], "Sam");
  await expectRevision(clients[2], 29);
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
