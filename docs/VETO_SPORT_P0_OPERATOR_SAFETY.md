# P0 production safety & LIVE evidence — 12 October 2026
- Four direct-provider GET routes previously allowed anonymous users to consume vendor quota; now require INGESTION_SECRET in x-veto-ingestion-secret. No UI / browser should call them.
- /api/cron/live-odds (5-minute cadence) is OFF unless operator explicitly sets VETO_ODDS_CRON_ENABLED=true and a sufficiently high positive integer VETO_ODDS_CRON_MAX_ESTIMATED_DAILY_CREDITS. Estimate = sports × markets × regions × 288 times daily. Estimate is **not** a real provider billing ledger; do not switch on blindly.
- /api/intelligence/data-plane/storage-selfcheck previously accepted unauthenticated public GET that mutates database; now restrict to CRON_SECRET Bearer or INGESTION_SECRET header, sanitize error body.
- API-Football FREE source remains active on production (VETO_API_FOOTBALL_ENABLED=true), separate from bookmaker quotes. 30-minute cron verified produced real persisted football snapshots; source fetch timestamp is not second-by-second live.
- /api/live/events preview data is labeled PERSISTED versus SANDBOX, and Matchcast now guards stale status; signal radar suppresses all demo and stale decisions.
- Event freshness uses state sample timestamp exclusively; newer odds/decisions must not make an old score look current.
- Runtime QA: /api/intelligence/live-freshness/selfcheck (8 deterministic checks) and /api/intelligence/providers/odds-budget/selfcheck (9 checks) do not hit paid APIs.
- Verify anonymous direct vendor endpoints and storage selfcheck return 401 on production after merge. Confirm /api/live/events persisted events and /api/providers free adapter readiness remain functional.
- Source limits: free upstream snapshots every 30 minutes, no bookmaker odds, no actual live TV, no guarantee of profitable betting recommendations.
