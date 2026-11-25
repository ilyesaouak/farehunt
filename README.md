# FareHunt

Finds the cheapest **door-to-door** route from Heidelberg to Tunisia. It scans flights from 12 airports in Germany, France, Switzerland and Italy to Tunis, Enfidha, Monastir and Djerba, adds the train or bus to each airport, and ranks every route by total cost, travel time and risk.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional: add SERPAPI_KEY for live prices
npm run dev
```

Without `SERPAPI_KEY` the app runs in **demo mode**: it shows deterministic, simulated fares, clearly labelled in the UI. With a key you can still switch to demo data from the search panel to save API quota.

## How it works

| Layer | File | Notes |
| --- | --- | --- |
| Search API | `src/app/api/search/route.ts` | `GET /api/search?origins=FRA,STR&destinations=TUN&tripType=oneway&depart=YYYY-MM-DD&flex=3` streams NDJSON events (`start`, `progress`, `route`, `done`) |
| Orchestration | `src/lib/search.ts` | Bounded concurrency, 30-min in-memory cache, per-request lookup budget (`src/lib/limits.ts`) |
| Providers | `src/lib/providers/` | `serpapi.ts` (Google Flights) and `demo.ts` (seeded fake fares) |
| Calculations | `src/lib/pricing.ts`, `src/lib/scoring.ts` | See below |
| Data | `src/lib/airports.ts` | Airports, coordinates, ground-transport estimates from Heidelberg Hbf |

### Calculations

- **Total cost** = flight + ground fare × legs. A return trip counts 2 ground legs (there and back).
- **Door to door** = ground minutes + a 2h airport buffer + flight duration (outbound).
- **Risk** is derived from the itinerary: length of the ground leg, number of changes, cross-border rail, flight stops, and whether you'd have to leave home before 05:00.
- **Value score** (0–100) is relative to the best route in the same search: 60% price, 25% door-to-door time, 15% reliability.
- **Flexible dates** scan consecutive departure days. For return trips, the return date shifts by the same amount so the trip length stays the same.
- All date math is done on UTC calendar dates, so dates never shift with the timezone.
