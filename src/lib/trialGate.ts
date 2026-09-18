// Trial feature (Task 4): detects the TRIAL_EXPIRED signal that
// requireActiveStatus (server.ts) returns on ANY gated endpoint once a
// 'trial' user's 3-day window has passed — `{ error: "...", code:
// "TRIAL_EXPIRED" }` on a 403 response.
//
// There is no existing centralized fetch wrapper in this codebase — every
// call site (App.tsx and friends) does a raw `fetch()` — and this signal can
// come back from ANY of them (the very first /api/data on boot, or a save
// mid-session once the trial expires while the tab is already open).
// Patching every call site individually would be invasive and easy to miss
// one, so this patches `window.fetch` ONCE instead and broadcasts a plain
// DOM CustomEvent — deliberately not importing React or any App.tsx state
// directly, so this module has zero React dependency and can't create an
// import cycle with App.tsx.
export const TRIAL_EXPIRED_EVENT = "kantongku:trial-expired";

let installed = false;

export function installTrialGate(): void {
  if (installed) return; // idempotent — safe to call from a React effect that may re-run (StrictMode double-invoke, HMR, etc.)
  installed = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (...args: Parameters<typeof fetch>) => {
    return originalFetch(...args).then((response) => {
      if (response.status === 403) {
        // Clone before reading the body — the ORIGINAL response object must
        // still be readable exactly once by whichever code actually called
        // fetch(), completely unaffected by this check running alongside it.
        response
          .clone()
          .json()
          .then((body) => {
            if (body?.code === "TRIAL_EXPIRED") {
              window.dispatchEvent(new CustomEvent(TRIAL_EXPIRED_EVENT));
            }
          })
          .catch(() => {
            // Not a JSON body (e.g. some unrelated 403 from a static asset) — ignore.
          });
      }
      return response;
    });
  };
}
