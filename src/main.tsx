import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Prevent zoom on input focus for better mobile experience
document.addEventListener(
  "touchmove",
  (e) => {
    if (
      (e.target as HTMLElement).tagName !== "INPUT" &&
      (e.target as HTMLElement).tagName !== "TEXTAREA" &&
      (e.target as HTMLElement).tagName !== "SELECT"
    ) {
      // Allow normal scroll
    }
  },
  { passive: true },
);

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((error) => {
      console.log("SW registration failed:", error);
    });
  });
}

// Prevent pull-to-refresh on Android
document.body.addEventListener(
  "touchmove",
  (e) => {
    if ((e as TouchEvent).touches.length > 1 || (e as any).scale !== 1) {
      e.preventDefault();
    }
  },
  { passive: false },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
