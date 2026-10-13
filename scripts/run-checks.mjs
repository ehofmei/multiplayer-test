import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function acquireLock(root, label) {
  const lock = resolve(root, ".qa-run.lock");
  const recovery = `${lock}.recovery`;
  const claim = async () => {
    await mkdir(lock);
    await writeFile(
      `${lock}/owner.json`,
      JSON.stringify({ pid: process.pid, label }),
    );
    const release = () => rm(lock, { recursive: true, force: true });
    release.child = (childPid) =>
      writeFile(
        `${lock}/owner.json`,
        JSON.stringify({ pid: process.pid, label, childPid }),
      );
    return release;
  };
  try {
    return await claim();
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  // Serialize stale recovery; an unreadable owner can be a process still claiming
  // the lock, so leave it alone. Never kill another session's process.
  await mkdir(recovery).catch(() => {
    throw new Error(
      "QA lock recovery is already in progress. Try again later.",
    );
  });
  try {
    let owner;
    try {
      owner = JSON.parse(await readFile(`${lock}/owner.json`, "utf8"));
    } catch {
      throw new Error(
        `QA lock has no readable owner: ${lock}. Inspect it before removing it.`,
      );
    }
    if (!Number.isInteger(owner.pid) || owner.pid <= 0)
      throw new Error(
        `Invalid QA lock owner: ${lock}. Inspect it before removing it.`,
      );
    try {
      process.kill(owner.pid, 0);
    } catch (error) {
      if (error.code === "ESRCH") {
        if (owner.childPid) {
          try {
            process.kill(
              process.platform === "win32" ? owner.childPid : -owner.childPid,
              0,
            );
            throw new Error(
              `QA owner exited but its child process group is still alive (${owner.childPid}). Wait or inspect your own run before recovering.`,
            );
          } catch (childError) {
            if (childError.code !== "ESRCH") throw childError;
          }
        }
        await rm(lock, { recursive: true });
        return await claim();
      }
      if (error.code !== "EPERM") throw error;
      // A sandbox may deny inspection of an owner launched with browser access.
      // Treat that owner as alive rather than exposing a raw kill error.
    }
    throw new Error(
      `QA already running: ${owner.label} (PID ${owner.pid}). Wait for it to finish; no processes were stopped.`,
    );
  } finally {
    await rm(recovery, { recursive: true, force: true });
  }
}

export const games = {
  breakout: ["tests/breakout.spec.ts", "tests/breakout-integration.spec.ts"],
  pong: [
    "tests/pong.spec.ts",
    "tests/pong-integration.spec.ts",
    "tests/pong-polish.spec.ts",
  ],
  arena: ["tests/arena.spec.ts", "tests/arena-integration.spec.ts"],
  reaction: ["tests/reaction.spec.ts", "tests/reaction-integration.spec.ts"],
  cycle: ["tests/cycle-integration.spec.ts"],
  sumo: ["tests/sumo.spec.ts", "tests/sumo-integration.spec.ts"],
  bakery: ["tests/bakery.spec.ts"],
  seek: ["tests/seek.spec.ts"],
  ship: ["tests/ship.spec.ts"],
  picnic: ["tests/picnic.spec.ts"],
  treasure: ["tests/treasure.spec.ts"],
  glow: ["tests/glow.spec.ts"],
  minigolf: [
    "tests/minigolf.spec.ts",
    "tests/minigolf-motion.spec.ts",
    "tests/minigolf-results.spec.ts",
  ],
};
const network = ["tests/game.spec.ts", "--grep", "host and three clients pair"];

async function run(command, args, env, release) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env,
    detached: process.platform !== "win32",
  });
  const forward = (signal) => {
    if (child.pid) {
      try {
        process.kill(
          process.platform === "win32" ? child.pid : -child.pid,
          signal,
        );
      } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
    }
  };
  const interrupt = () => forward("SIGINT");
  const terminate = () => forward("SIGTERM");
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  const finished = new Promise((accept, reject) => {
    child.on("error", reject);
    child.on("exit", (code, signal) => accept(signal ? 1 : (code ?? 1)));
  });
  try {
    if (child.pid) await release.child(child.pid);
    return await finished;
  } finally {
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", terminate);
  }
}
async function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (!["verify", "browser", "game", "network"].includes(mode))
    throw new Error("Use verify, browser, game <name>, or network.");
  if (mode === "verify" && args.length)
    throw new Error(
      "Full verification accepts no selection or snapshot-update flags; use a focused command instead.",
    );
  const selection =
    mode === "game" ? games[args.shift()] : mode === "network" ? network : [];
  if (!selection)
    throw new Error(`Choose a game: ${Object.keys(games).join(", ")}`);
  const release = await acquireLock(
    process.cwd(),
    `${mode} port ${process.env.QA_PORT ?? 4173}`,
  );
  const started = Date.now();
  const steps =
    mode === "verify"
      ? ["format:check", "test", "build", "browser", "check:snapshots"]
      : ["browser"];
  const timings = [];
  try {
    for (const step of steps) {
      const start = Date.now();
      const code =
        step === "browser"
          ? await run(
              process.execPath,
              [
                "node_modules/@playwright/test/cli.js",
                "test",
                ...selection,
                ...(mode === "verify" ? ["--update-snapshots=none"] : []),
                ...args,
              ],
              process.env,
              release,
            )
          : await run("npm", ["run", step], process.env, release);
      timings.push({ step, durationMs: Date.now() - start, code });
      if (code) {
        process.exitCode = code;
        break;
      }
    }
  } finally {
    try {
      const output = resolve(process.env.QA_OUTPUT_DIR ?? "test-results");
      await mkdir(output, { recursive: true });
      await writeFile(
        `${output}/checks-timing.json`,
        JSON.stringify(
          {
            mode,
            platform: process.platform,
            durationMs: Date.now() - started,
            steps: timings,
          },
          null,
          2,
        ),
      );
    } finally {
      await release();
    }
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
