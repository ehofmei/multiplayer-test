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
    await host.getByRole("button", { name: "Add Player", exact: true }).click();
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
    await client.getByText("Connection details", { exact: false }).click();
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
  await page
    .getByText("Paste connection text instead", { exact: true })
    .click();
  await expect(page.getByLabel("Paste host invite code")).toBeVisible();
});

test("camera controls release the stream when stopped and when leaving", async () => {
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
    for (const exit of ["Stop Camera", "Return Home"]) {
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
      await page.getByRole("button", { name: exit, exact: true }).click();
      await expect
        .poll(() => track.evaluate((track) => track.readyState))
        .toBe("ended");
      await expect(page.locator("video")).toHaveCount(0);
      await track.dispose();
    }
  } finally {
    await browser.close();
  }
});

async function createLights(page: Page) {
  await page.getByRole("button", { name: "Create Game", exact: true }).click();
  await page
    .getByRole("button", { name: "Shared Lights", exact: true })
    .click();
}

async function join(host: Page, client: Page, name: string) {
  await client.goto("./");
  await client.getByLabel("Your name").fill(name);
  await client.getByRole("button", { name: "Join Game", exact: true }).click();
  await host.getByRole("button", { name: "Add Player", exact: true }).click();
  await host.getByText("Copy/paste instead", { exact: true }).click();
  await host
    .getByText("Paste connection text instead", { exact: true })
    .click();
  await client
    .getByText("Paste connection text instead", { exact: true })
    .click();
  await expect(host.getByLabel("Invite text")).toBeVisible({ timeout: 20_000 });
  const offer = await host.getByLabel("Invite text").inputValue();
  const parsed = JSON.parse(offer);
  expect(parsed.description.sdp).toContain("a=candidate:");
  await client.getByLabel("Paste host invite code").fill(offer);
  await client
    .getByRole("button", { name: "Create Join Code", exact: true })
    .click();
  await client.getByText("Copy/paste instead", { exact: true }).click();
  await expect(client.getByLabel("Join text")).toBeVisible({
    timeout: 20_000,
  });
  await host
    .getByLabel("Paste player join code")
    .fill(await client.getByLabel("Join text").inputValue());
  await host
    .getByRole("button", { name: "Connect Player", exact: true })
    .click();
  await expect(client.getByRole("status")).toHaveText("Connected to host", {
    timeout: 20_000,
  });
  await expect(
    host.locator(".people-card li").filter({ hasText: name }),
  ).toBeVisible();
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
          page.getByText("Revision 1", { exact: true }),
        ).toBeVisible();
      await client.getByText("Connection details", { exact: false }).click();
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
      await host
        .getByRole("button", { name: "Return Home", exact: true })
        .click();
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
  await host.getByText("Connection details", { exact: false }).click();
  await expect(host.getByText("open", { exact: true })).toHaveCount(3);
  for (const rtt of await host.getByTestId("rtt").all())
    await expect(rtt).toContainText("ms", { timeout: 10_000 });
  await clients[0].getByText("Connection details", { exact: false }).click();
  await expect(clients[0].getByTestId("rtt")).toContainText("ms", {
    timeout: 10_000,
  });
  await expect(clients[0].getByTestId("tap-response")).toContainText("ms");
  await host
    .locator(".debug")
    .screenshot({ path: "test-results/connected-details.png" });
  await expect(
    host.getByRole("region", { name: "Shared grid" }).locator(".grid"),
  ).toHaveScreenshot("shared-grid.png", { maxDiffPixelRatio: 0.03 });
  await clients[2]
    .getByRole("button", { name: "Return Home", exact: true })
    .click();
  await expect(host.getByText("3/8", { exact: true })).toBeVisible();
  await host.getByRole("button", { name: "Cell 16", exact: true }).click();
  await expect(
    clients[0].getByRole("button", { name: "Cell 16", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await join(host, clients[2], "Sam");
  await expect(
    clients[2].getByText("Revision 25", { exact: true }),
  ).toBeVisible();
  await host.getByRole("button", { name: "Return Home", exact: true }).click();
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
  await page.getByRole("button", { name: "Return Home", exact: true }).click();
  await expect(page.getByLabel("Your name")).toHaveValue("");
  await page.getByLabel("Your name").pressSequentially("Family Player");
  await page.reload();
  await expect(page.getByLabel("Your name")).toHaveValue("Family Player");
  await page.getByRole("button", { name: "Join Game", exact: true }).click();
  await page
    .getByText("Paste connection text instead", { exact: true })
    .click();
  await page.getByLabel("Paste host invite code").fill("not an offer");
  await page
    .getByRole("button", { name: "Create Join Code", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Invalid connection text",
  );
  await page.getByRole("button", { name: "Return Home", exact: true }).click();
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
  await page.getByRole("button", { name: "Add Player", exact: true }).click();
  await page.getByText("Copy/paste instead", { exact: true }).click();
  await page
    .getByText("Paste connection text instead", { exact: true })
    .click();
  await expect(page.getByLabel("Invite text")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Paste player join code").fill("{}");
  await page
    .getByRole("button", { name: "Connect Player", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("valid join code");
  await page
    .getByRole("button", { name: "Cancel Invite", exact: true })
    .click();
  await expect(page.getByLabel("Invite text")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Return Home", exact: true }).click();
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
  await page.getByRole("button", { name: "Pong", exact: true }).click();
  await expect(page.getByRole("region", { name: "Pong game" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start Pong", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Choose Game", exact: true }).click();
  await page
    .getByRole("button", { name: "Reaction Race", exact: true })
    .click();
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
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("./");
    // Exercise different font metrics rather than relying on macOS's system font.
    if (font !== "system") {
      await page.addStyleTag({
        content: `:root { font-family: ${font}, sans-serif; }`,
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
    await page.getByRole("button", { name: "Add Player", exact: true }).click();
    const qr = page.getByRole("img", { name: "Invite QR code", exact: true });
    await expect(qr).toBeVisible();
    const qrBounds = await qr.boundingBox();
    expect(qrBounds!.y + qrBounds!.height).toBeLessThanOrEqual(viewport.height);
    if (viewport.width === 320) {
      expect(qrBounds!.width).toBeGreaterThanOrEqual(240);
      expect(qrBounds!.y + qrBounds!.height).toBeLessThanOrEqual(
        viewport.height - 16,
      );
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
    await expect(
      emma.getByRole("button", { name: "Pong", exact: true }),
    ).toBeDisabled();
    await host.getByRole("button", { name: "Pong", exact: true }).click();
    await expect(emma.getByRole("region", { name: "Pong game" })).toBeVisible();
    await expect(host.locator(".pong-court")).toHaveScreenshot(
      "pong-court.png",
      { maxDiffPixelRatio: 0.02 },
    );
    await host.getByLabel("Left player").selectOption({ label: "Emma" });
    await host.getByLabel("Right player").selectOption({ label: "Emma" });
    await expect(
      host.getByRole("button", { name: "Start Pong", exact: true }),
    ).toBeDisabled();
    await host.getByLabel("Right player").selectOption({ label: "Sam" });
    await host.getByRole("button", { name: "Start Pong", exact: true }).click();
    await expect(
      host.getByText("You’re watching this match.", { exact: false }),
    ).toBeVisible();
    await expect(host.getByLabel("Your paddle")).toHaveCount(0);
    await expect(emma.getByLabel("Your paddle")).toBeEnabled();
    await emma.getByLabel("Your paddle").press("End");
    await expect
      .poll(async () =>
        Math.round(
          Number(await host.getByTestId("paddle-0").getAttribute("y")),
        ),
      )
      .toBe(494);
    await sam.getByRole("group", { name: "Pong court" }).press("ArrowUp");
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
    await sam.getByRole("button", { name: "Return Home", exact: true }).click();
    await expect(
      host.getByText("A player left.", { exact: false }),
    ).toBeVisible();
    await expect(
      host.getByRole("button", { name: "Start Pong", exact: true }),
    ).toBeVisible();
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await host
      .getByRole("button", { name: "Reaction Race", exact: true })
      .click();
    await expect(
      emma.getByRole("region", { name: "Reaction Race game" }),
    ).toBeVisible();
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await host
      .getByRole("button", { name: "Shared Lights", exact: true })
      .click();
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
    await host
      .getByRole("button", { name: "Reaction Race", exact: true })
      .click();
    await expect(host.locator(".race-targets")).toHaveScreenshot(
      "race-targets.png",
      { maxDiffPixelRatio: 0.03 },
    );
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
    for (const name of ["Pong", "Reaction Race"] as const) {
      await page.getByRole("button", { name, exact: true }).click();
      const surface = page.locator(
        name === "Pong" ? ".pong-court" : ".race-targets",
      );
      const bounds = await surface.boundingBox();
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);
      await page.screenshot({
        path: `test-results/${name === "Pong" ? "pong" : "reaction"}-${viewport.width}x${viewport.height}.png`,
      });
      await page
        .getByRole("button", { name: "Choose Game", exact: true })
        .click();
    }
  }
});
