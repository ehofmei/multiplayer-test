import React from "react";
import { createRoot } from "react-dom/client";
import { registerUpdates } from "./pwa/updates";
import { App } from "./App";
import "./style.css";

registerUpdates();
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
