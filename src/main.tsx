import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Prevent pinch zoom on iOS Safari while allowing scroll
document.addEventListener(
  "gesturestart",
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);
// Register service worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((error) => {
      console.log("SW registration failed:", error);
    });
  });
}

// Block multi-touch gestures to prevent pinch/zoom on Android
const onTouchMove = (e: TouchEvent) => {
  // Only prevent if multi-touch or pinch
  if (e.touches.length > 1) {
    e.preventDefault();
  }
};

document.addEventListener("touchmove", onTouchMove as EventListener, {
  passive: false,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
