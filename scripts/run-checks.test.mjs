import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireLock } from "./run-checks.mjs";

async function fixture(fn) {
  const root = await mkdtemp(join(tmpdir(), "game-qa-lock-"));
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
test("active QA owner prevents overlap and release allows the next run", () =>
  fixture(async (root) => {
    const release = await acquireLock(root, "first suite");
    await assert.rejects(acquireLock(root, "second suite"), /first suite.*PID/);
    await release();
    await (
      await acquireLock(root, "next suite")
    )();
  }));
test("dead owner is recovered without stopping processes", () =>
  fixture(async (root) => {
    await mkdir(join(root, ".qa-run.lock"));
    await writeFile(
      join(root, ".qa-run.lock/owner.json"),
      JSON.stringify({ pid: 2147483647, label: "stale suite" }),
    );
    await (
      await acquireLock(root, "recovered suite")
    )();
  }));
test("missing or invalid owner is preserved for inspection", () =>
  fixture(async (root) => {
    await mkdir(join(root, ".qa-run.lock"));
    await assert.rejects(acquireLock(root, "next suite"), /no readable owner/);
    await writeFile(
      join(root, ".qa-run.lock/owner.json"),
      JSON.stringify({ pid: -1 }),
    );
    await assert.rejects(
      acquireLock(root, "next suite"),
      /Invalid QA lock owner/,
    );
  }));

test("focused selection includes standalone Arena and Race coverage", async () => {
  const { spawnSync } = await import("node:child_process");
  const { games } = await import("./run-checks.mjs");
  for (const [game, expected] of [
    ["arena", "Arena arcade pairs"],
    ["reaction", "Race shows immediate cues"],
  ]) {
    const result = spawnSync(
      process.execPath,
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        ...games[game],
        "--list",
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes(expected), result.stdout);
  }
});
test("complete verification rejects narrowing and update flags", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    process.execPath,
    ["scripts/run-checks.mjs", "verify", "--grep", "Breakout"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Full verification accepts no selection/);
});

test("dead parent does not reclaim a still-running QA child", () =>
  fixture(async (root) => {
    const { spawn } = await import("node:child_process");
    const child = spawn(
      process.execPath,
      ["-e", "setInterval(() => {}, 1000)"],
      { stdio: "ignore", detached: process.platform !== "win32" },
    );
    try {
      await mkdir(join(root, ".qa-run.lock"));
      await writeFile(
        join(root, ".qa-run.lock/owner.json"),
        JSON.stringify({
          pid: 2147483647,
          childPid: child.pid,
          label: "orphaned suite",
        }),
      );
      await assert.rejects(
        acquireLock(root, "new suite"),
        /child process group is still alive/,
      );
    } finally {
      const finished = new Promise((accept) => child.on("exit", accept));
      child.kill();
      await finished;
    }
  }));
