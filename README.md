# Hotel Offer Orchestrator

Backend service that pulls hotel listings from two suppliers, deduplicates them by name (cheapest wins), and exposes a single API with optional price range filtering. Uses Temporal for workflow orchestration and Redis for caching + price filtering.

## Stack

- Node.js + TypeScript
- Express
- Temporal.io (workflow orchestration)
- Redis (caching, sorted sets for price range queries)
- Docker Compose

## Setup & Run

You need Docker and Docker Compose installed. That's it.

```bash
git clone https://github.com/<your-username>/hotel-orchestrator.git
cd hotel-orchestrator
docker compose up --build
```

Wait until you see `Hotel Orchestrator API listening on port 3000` and `Temporal worker listening for tasks` in the logs, then you're good.

```bash
curl "http://localhost:3000/api/hotels?city=delhi"
```

To tear it down:

```bash
docker compose down       # keep postgres data
docker compose down -v    # wipe everything
```

## API Endpoints

### GET /api/hotels

Main endpoint. Triggers a Temporal workflow that fetches from both suppliers in parallel, dedupes, caches to Redis, and returns the result.

| Param      | Required | Description |
|------------|----------|-------------|
| `city`     | yes      | e.g. `delhi`, `mumbai`, `bangalore` |
| `minPrice` | no       | minimum price (inclusive) |
| `maxPrice` | no       | maximum price (inclusive) |

Examples:

```
GET /api/hotels?city=delhi
GET /api/hotels?city=delhi&minPrice=4000&maxPrice=6000
```

Response:

```json
[
  { "name": "Holtin", "price": 5340, "supplier": "Supplier B", "commissionPct": 20 },
  { "name": "Radison", "price": 5900, "supplier": "Supplier A", "commissionPct": 13 }
]
```

### GET /health

Checks connectivity to both suppliers, Redis, and Temporal. Returns 200 if everything is up, 503 otherwise.

### GET /supplierA/hotels?city=...

Mock supplier A data (static JSON).

### GET /supplierB/hotels?city=...

Mock supplier B data (static JSON).

## How it works

1. Client hits `/api/hotels?city=delhi`
2. Express handler starts a Temporal workflow
3. Workflow fires two activities in parallel — one hits `/supplierA/hotels`, the other hits `/supplierB/hotels`
4. `deduplicateHotels` activity merges both lists by name, keeps the cheaper price for duplicates
5. `cacheInRedis` stores results as a Redis sorted set (score = price) and individual hashes
6. If `minPrice`/`maxPrice` are in the query, the handler runs `ZRANGEBYSCORE` on the sorted set and returns filtered results
7. Final JSON array goes back to the client

## Project structure

```
src/
├── config.ts                  # env vars with defaults
├── logger.ts                  # winston setup
├── redis-client.ts            # singleton ioredis client
├── server.ts                  # express app entry
├── worker.ts                  # temporal worker entry
├── types.ts
├── routes/
│   ├── hotel-routes.ts        # GET /api/hotels
│   ├── health-routes.ts       # GET /health
│   └── supplier-routes.ts     # mock supplier endpoints
├── suppliers/
│   ├── supplier-a.ts          # static hotel data
│   └── supplier-b.ts
└── temporal/
    ├── activities.ts          # fetch, dedupe, cache
    └── workflows.ts           # orchestration
```

## Postman

Import `postman/hotel-orchestrator.postman_collection.json` into Postman. The `baseUrl` variable defaults to `http://localhost:3000`.

Included test cases:
- Delhi hotels (expects dedup + cheapest price)
- Delhi with price filter (4000-6000)
- Mumbai
- City with no results (patna → empty array)
- Missing city param (400 error)
- Raw supplier A / B endpoints
- Health check

## Local dev (without Docker)

You'll need Temporal and Redis running locally.

```bash
npm install
npm run build
npm start               # api server
npm run start:worker    # temporal worker (separate terminal)
```

## Env vars

| Variable           | Default                  |
|--------------------|--------------------------|
| `PORT`             | `3000`                   |
| `TEMPORAL_ADDRESS` | `localhost:7233`         |
| `REDIS_HOST`       | `localhost`              |
| `REDIS_PORT`       | `6379`                   |
| `SUPPLIER_A_URL`   | `http://localhost:3000`  |
| `SUPPLIER_B_URL`   | `http://localhost:3000`  |
| `REDIS_CACHE_TTL`  | `300`                    |
| `LOG_LEVEL`        | `info`                   |
