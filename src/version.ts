// Single source of truth for the version shown at the bottom of Profil
// (ProfileView.tsx). Convention (2026-08-22, per user request): bump this
// as part of the SAME commit that ships each deploy —
//   - small fix / incremental feature → MINOR + 1        (5.2 → 5.3)
//   - large overhaul / major feature   → MAJOR + 1, MINOR resets to 0
//                                         (5.9 → 6.0)
// There's no CI/build step in this repo to derive this automatically from
// commit history, so it's maintained by hand here — this file's whole job
// is to be the one place that needs editing.
export const APP_VERSION = '5.3';
