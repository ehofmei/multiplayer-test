import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { missingScreenshotBaselines } from "./check-screenshot-baselines.mjs";

async function fixture(t, files) {
  const root = await mkdtemp(join(tmpdir(), "screenshot-baselines-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const file of files) {
    const path = join(root, file);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, "fixture");
  }
  return root;
}

test("reports all three missing Picnic Linux states on macOS", async (t) => {
  const states = ["ready", "active", "results"];
  const root = await fixture(
    t,
    states.map(
      (state) => `picnic.spec.ts-snapshots/picnic-${state}-darwin.png`,
    ),
  );
  assert.deepEqual(
    await missingScreenshotBaselines(root),
    states
      .map((state) =>
        join(root, `picnic.spec.ts-snapshots/picnic-${state}-linux.png`),
      )
      .sort(),
  );
});

test("reports missing Darwin counterparts too", async (t) => {
  const root = await fixture(t, ["game.spec.ts-snapshots/ready-linux.png"]);
  assert.deepEqual(await missingScreenshotBaselines(root), [
    join(root, "game.spec.ts-snapshots/ready-darwin.png"),
  ]);
});

test("accepts complete pairs and platform-independent snapshots", async (t) => {
  const root = await fixture(t, [
    "game.spec.ts-snapshots/ready-darwin.png",
    "game.spec.ts-snapshots/ready-linux.png",
    "game.spec.ts-snapshots/court.png",
    "fixtures/unrelated-darwin.png",
  ]);
  assert.deepEqual(await missingScreenshotBaselines(root), []);
});

test("a baseline in another test folder cannot satisfy the pair", async (t) => {
  const root = await fixture(t, [
    "one.spec.ts-snapshots/ready-darwin.png",
    "two.spec.ts-snapshots/ready-linux.png",
    "one.spec.ts-snapshots/ready-linux-actual.png",
  ]);
  assert.deepEqual(await missingScreenshotBaselines(root), [
    join(root, "one.spec.ts-snapshots/ready-linux.png"),
    join(root, "two.spec.ts-snapshots/ready-darwin.png"),
  ]);
});
