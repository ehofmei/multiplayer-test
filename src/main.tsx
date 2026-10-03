import React from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import "./style.css";

registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new Event("pwa-update"));
  },
  onOfflineReady() {
    window.dispatchEvent(new Event("pwa-offline"));
  },
  onRegisterError(error) {
    console.warn("Offline setup failed:", error);
  },
});
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
