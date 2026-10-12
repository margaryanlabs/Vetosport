# Live Watchlist launch — VETO Sport / 12 October 2026

Existing project (not new app), route `/research/watchlist`. Main navigation and Today first screen link to it. Live match snapshots come exclusively from existing persisted `/api/live/events`, fed by already-enabled production API-Football every 30 minutes under the free plan.

### Operator workflow
1. Open Watchlist → inspect source badge: persisted vs demo, time and age.
2. Browse real persisted football fixtures and choose a match; visually rich PitchVision uses stored scoreboard and schematic pitch only.
3. A research candidate appears **only** when exact match state 1:1 after minute 80 (through minute 105), source=persisted, clock parsed, and state captured no more than 120 seconds ago. Other matches stay observation only, never implied opportunities.
4. The suggested `Total Under 4.5` is explicitly a **research market to check**, not a verified bookmaker offer. Watchlist does not ask live vendor endpoints, cannot consume API-Football quota, has no bet placement functionality.
5. Optional *manually entered* decimal odds calculate 1/price break-even threshold only; no prediction or verified edge is generated.
6. If no match candidates within 120s of last provider fetch, the filtered results say so. All stored real events remain browseable as historical snapshots; never substitute demo matches as live.

### QA
- Source `/api/live/events` switched to PERSISTED around 12:30 UTC, real football fixtures observed, source timestamps retained.
- `/api/intelligence/research/watchlist/selfcheck` 9 deterministic no-network assertions.
- New independent page and responsive CSS compiled and passed TypeScript on Preview.
- Authenticated graphical mobile tap-through visual QA still required; UI should show 3 first-visit choices, live Watchlist CTA and 5 navigation tabs on narrow screens.
- Real bookmaker odds and video rights *not* part of current source; no under-4.5 betting profit claim.
