import { useSyncExternalStore } from "react";
import { registerSW } from "virtual:pwa-register";

type UpdateState = {
  ready: boolean;
  busy: boolean;
  message: string;
};
let state: UpdateState = { ready: false, busy: false, message: "" };
let registration: ServiceWorkerRegistration | undefined;
let applying = false;
let activatedElsewhere = false;
const listeners = new Set<() => void>();
const publish = (patch: Partial<UpdateState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};
const refresh = () => publish({ ready: true, message: "An update is ready." });

export const registerUpdates = () => {
  let controlled = !!navigator.serviceWorker?.controller;
  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    if (applying) window.location.reload();
    else if (controlled) {
      activatedElsewhere = true;
      refresh();
    }
    controlled = true;
  });
  applyWorker = registerSW({
    immediate: true,
    onNeedRefresh: refresh,
    // Native controllerchange also covers updates Workbox classifies as external.
    onNeedReload() {},
    onOfflineReady() {
      window.dispatchEvent(new Event("pwa-offline"));
    },
    onRegisteredSW(_url, next) {
      registration = next;
      if (!next) return;
      if (next.waiting && next.active) refresh();
      next.addEventListener("updatefound", () => {
        const worker = next.installing;
        const isUpdate = !!next.active;
        worker?.addEventListener("statechange", () => {
          if (isUpdate && worker.state === "installed" && next.waiting)
            refresh();
        });
      });
    },
    onRegisterError() {
      publish({ message: "Updates couldn’t start. Try again when online." });
    },
  });
};
let applyWorker: (() => Promise<void>) | undefined;

// Wait until the download/cache step finishes; never announce a partial update.
export function waitForInstall(worker: ServiceWorker): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = () => {
      if (!["installed", "activated", "redundant"].includes(worker.state))
        return;
      cleanup();
      if (worker.state === "redundant") reject(new Error("Install failed"));
      else resolve();
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Install timed out"));
    }, 20_000);
    const cleanup = () => {
      window.clearTimeout(timer);
      worker.removeEventListener("statechange", finish);
    };
    worker.addEventListener("statechange", finish);
    finish();
  });
}

export async function checkForUpdate() {
  if (state.busy) return;
  publish({ busy: true, message: "Checking for updates…" });
  try {
    if (!navigator.onLine) throw new Error("Offline");
    if (!("serviceWorker" in navigator)) throw new Error("Unsupported");
    registration ??= await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error("Not registered yet");
    await registration.update();
    if (registration.installing) await waitForInstall(registration.installing);
    if (registration.waiting || activatedElsewhere) refresh();
    else if (!state.ready) publish({ message: "You’re up to date." });
  } catch {
    publish({
      message:
        "Couldn’t check for updates. Connect to the internet and try again.",
    });
  } finally {
    publish({ busy: false });
  }
}

export async function applyUpdate() {
  if (state.busy) return;
  if (activatedElsewhere) {
    window.location.reload();
    return;
  }
  if (!registration?.waiting || !applyWorker) {
    publish({ ready: false, message: "Update isn’t ready yet. Check again." });
    return;
  }
  applying = true;
  publish({ busy: true, message: "Updating…" });
  const timeout = window.setTimeout(() => {
    applying = false;
    publish({
      busy: false,
      message: "Update couldn’t finish. Please try again.",
    });
  }, 15_000);
  try {
    await applyWorker();
  } catch {
    window.clearTimeout(timeout);
    applying = false;
    publish({
      busy: false,
      message: "Update couldn’t finish. Please try again.",
    });
  }
}

export function useUpdates() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}
