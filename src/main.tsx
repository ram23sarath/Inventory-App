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

// One-time migration step: the service worker runtime cache was renamed 
// from 'supabase-cache' to 'supabase-data-cache'. Remove the orphaned cache.
if ('caches' in window) {
  caches.delete('supabase-cache').catch(() => {
    // silently fail if there's an issue accessing caches
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
