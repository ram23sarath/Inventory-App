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

// --- Temporary diagnostic logging (remove after mobile issues are confirmed fixed) ---
// C1: Log network conditions on startup
if ('connection' in navigator) {
  const conn = (navigator as any).connection;
  console.log('[Diag] Network at startup:', {
    type: conn?.type,
    effectiveType: conn?.effectiveType,
    downlink: conn?.downlink,
    rtt: conn?.rtt,
    saveData: conn?.saveData,
  });
}
console.log('[Diag] navigator.onLine:', navigator.onLine);
console.log('[Diag] SW controller:', navigator.serviceWorker?.controller?.scriptURL ?? 'none');

// C3: Log SW registration state
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((reg) => {
    console.log('[Diag] SW ready, scope:', reg.scope);
    console.log('[Diag] SW active script:', reg.active?.scriptURL);
    console.log('[Diag] SW waiting:', reg.waiting?.scriptURL ?? 'none');
  });
}
// --- End diagnostic logging ---

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
