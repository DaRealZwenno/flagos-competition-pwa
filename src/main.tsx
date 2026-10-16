import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/800.css";
import "./index.css";
import App from "./App.tsx";
import { initPwaUpdates } from "./lib/pwaUpdate";
import { startAuth } from "./lib/auth";

initPwaUpdates();
startAuth();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);