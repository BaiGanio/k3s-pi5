# 👉 [https://baiganio.github.io/k3s-pi5](https://baiganio.github.io/k3s-pi5/)

## The Characters
**Rick Sanchez** is an eccentric, hyper-intelligent scientist — arguably the smartest being in the universe. He's Morty's grandfather, an alcoholic, and a deeply nihilistic character who nonetheless shows occasional flashes of genuine love for his family. He can build interdimensional portal guns, clones, and robots out of scrap, and has died and been resurrected countless times across alternate timelines.

**Morty Smith** is Rick's 14-year-old grandson — anxious, insecure, but growing in confidence over the series. He's Rick's reluctant sidekick on dangerous interdimensional adventures. His "brainwave" frequency is said to cancel out Rick's genius, making them harder to detect. Over the seasons, Morty evolves from a nervous kid into someone who's seen enough universe-scale horror to become somewhat desensitized.

Together, they're a classic "genius + everyman" duo, but with layers of trauma, love, and dark comedy underneath.

## How it works?

### 🛸 Rick and Morty API — Multi-VM Developer Environment

> A practical reference for integrating the [Rick and Morty REST/GraphQL API](https://rickandmortyapi.com) across a three-VM local or cloud development setup: a **Node.js frontend**, a **.NET API layer**, and a **PostgreSQL database**. This README covers architecture, data flows, configuration scenarios, and code examples to get you up and running fast.

---

#### Table of Contents

- [About the Rick and Morty API](#about-the-rick-and-morty-api)
- [Architecture Overview](#architecture-overview)
- [VM Configuration](#vm-configuration)
  - [VM1 — Node.js Frontend](#vm1--nodejs-frontend)
  - [VM2 — .NET API Layer](#vm2--net-api-layer)
  - [VM3 — PostgreSQL Database](#vm3--postgresql-database)
- [API Reference](#api-reference)
  - [Characters](#characters)
  - [Locations](#locations)
  - [Episodes](#episodes)
- [Data Flow Scenarios](#data-flow-scenarios)
  - [Scenario A: Direct Fetch (No Cache)](#scenario-a-direct-fetch-no-cache)
  - [Scenario B: .NET Proxy with PostgreSQL Cache](#scenario-b-net-proxy-with-postgresql-cache)
  - [Scenario C: Full Sync — Bulk Import to PostgreSQL](#scenario-c-full-sync--bulk-import-to-postgresql)
- [Code Examples](#code-examples)
  - [Node.js — Fetch Characters](#nodejs--fetch-characters)
  - [.NET — Proxy Controller](#net--proxy-controller)
  - [PostgreSQL — Schema](#postgresql--schema)
- [Environment Variables](#environment-variables)
- [Running the Stack](#running-the-stack)
- [Extending the Setup](#extending-the-setup)

---

### About the Rick and Morty API

The [Rick and Morty API](https://rickandmortyapi.com) is a **free, public, no-auth-required** REST and GraphQL API containing canonical data from the animated TV series.

| Property | Details |
|---|---|
| Base URL | `https://rickandmortyapi.com/api` |
| GraphQL Endpoint | `https://rickandmortyapi.com/graphql` |
| Auth Required | ❌ None |
| Rate Limiting | None documented (be respectful) |
| Response Format | JSON |
| Pagination | 20 results per page |
| Total Characters | 826+ across 42 pages |

**Resources available:**

- `/api/character` — Characters with status, species, origin, image, episodes
- `/api/location` — Dimensions, planets, and named locations
- `/api/episode` — All episodes with air dates and cast lists

This makes it an ideal API for practicing real-world multi-service integration patterns without needing accounts, billing, or API keys.

---

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    External API                         │
│            https://rickandmortyapi.com/api              │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS GET (REST or GraphQL)
                         ▼
┌─────────────────────────────────────────────────────────┐
│  VM2 — .NET API  (e.g. 192.168.1.20 / api.local)       │
│                                                         │
│  • Proxies / enriches Rick & Morty API responses        │
│  • Handles caching logic (DB or in-memory)              │
│  • Exposes internal REST endpoints to VM1               │
│  • Runs scheduled sync jobs to populate VM3             │
└──────────┬──────────────────────────┬───────────────────┘
           │ HTTP (internal)          │ TCP 5432
           ▼                          ▼
┌──────────────────────┐   ┌──────────────────────────────┐
│  VM1 — Node.js       │   │  VM3 — PostgreSQL            │
│  (192.168.1.10)      │   │  (192.168.1.30 / db.local)   │
│                      │   │                              │
│  • React / Next.js   │   │  • Stores synced characters  │
│  • Express.js SSR    │   │  • Cache layer for .NET API  │
│  • Calls VM2 API     │   │  • Supports full-text search │
└──────────────────────┘   └──────────────────────────────┘
```

Each VM is independently deployable. The .NET layer is the central orchestrator — it decides whether to serve data from PostgreSQL cache or fetch fresh from the upstream Rick and Morty API.

---

## VM Configuration

### VM1 — Node.js Frontend

**Role:** User-facing application. Renders characters, locations, and episodes. Makes all API calls to VM2, never directly to `rickandmortyapi.com`.

| Setting | Value |
|---|---|
| OS | Ubuntu 22.04 LTS |
| Runtime | Node.js 20 LTS |
| Framework | Next.js 14 / Express.js |
| Port | 3000 |
| Talks to | VM2 on port 5000 |

**Recommended packages:**
```bash
npm install axios dotenv next react react-dom
```

**Key environment variables:**
```env
API_BASE_URL=http://192.168.1.20:5000
NEXT_PUBLIC_APP_NAME=Rick & Morty Explorer
```

---

### VM2 — .NET API Layer

**Role:** Backend API gateway. Proxies the external Rick and Morty API, applies caching, data enrichment, and business logic. Also runs background sync workers to populate the database on VM3.

| Setting | Value |
|---|---|
| OS | Ubuntu 22.04 LTS / Windows Server 2022 |
| Runtime | .NET 8 |
| Framework | ASP.NET Core Web API |
| Port | 5000 |
| Talks to | rickandmortyapi.com (outbound), VM3 on 5432 |

**Required NuGet packages:**
```bash
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package Microsoft.Extensions.Caching.Memory
dotnet add package Polly                  # Resilience & retry policies
dotnet add package Serilog.AspNetCore     # Structured logging
```

**Key environment variables:**
```env
RICKMORTY_BASE_URL=https://rickandmortyapi.com/api
ConnectionStrings__DefaultConnection=Host=192.168.1.30;Database=rickmorty;Username=app;Password=secret
CACHE_TTL_MINUTES=60
```

---

### VM3 — PostgreSQL Database

**Role:** Persistent store for synced API data, enabling offline access, full-text search, and historical snapshots.

| Setting | Value |
|---|---|
| OS | Ubuntu 22.04 LTS |
| Engine | PostgreSQL 16 |
| Port | 5432 |
| Accessed by | VM2 only (never VM1 directly) |

**Install PostgreSQL:**
```bash
sudo apt install postgresql-16
sudo -u postgres createuser app --pwprompt
sudo -u postgres createdb rickmorty --owner=app
```

**Restrict access in `pg_hba.conf`** to only allow VM2's IP:
```
host  rickmorty  app  192.168.1.20/32  scram-sha-256
```

---

## API Reference

All endpoints are `GET` requests. No authentication required. Responses are JSON.

### Characters

```
GET https://rickandmortyapi.com/api/character
GET https://rickandmortyapi.com/api/character/{id}
GET https://rickandmortyapi.com/api/character/{id1},{id2},{id3}
```

**Filters:** `?name=rick&status=alive&species=human&type=&gender=male`

**Character schema:**

| Field | Type | Description |
|---|---|---|
| `id` | int | Unique ID |
| `name` | string | Character name |
| `status` | string | `Alive`, `Dead`, or `unknown` |
| `species` | string | e.g. `Human`, `Alien` |
| `type` | string | Sub-type / variant |
| `gender` | string | `Female`, `Male`, `Genderless`, `unknown` |
| `origin` | object | `{name, url}` |
| `location` | object | Current location `{name, url}` |
| `image` | string | URL to character image (300×300 JPG) |
| `episode` | array | List of episode URLs the character appears in |
| `url` | string | Link to this character's endpoint |
| `created` | string | ISO 8601 timestamp |

---

### Locations

```
GET https://rickandmortyapi.com/api/location
GET https://rickandmortyapi.com/api/location/{id}
```

**Filters:** `?name=earth&type=planet&dimension=C-137`

**Location schema:** `id`, `name`, `type`, `dimension`, `residents` (array of character URLs), `url`, `created`

---

### Episodes

```
GET https://rickandmortyapi.com/api/episode
GET https://rickandmortyapi.com/api/episode/{id}
```

**Filters:** `?name=pilot&episode=S01E01`

**Episode schema:** `id`, `name`, `air_date`, `episode` (e.g. `S02E07`), `characters` (array of URLs), `url`, `created`

---

## Data Flow Scenarios

### Scenario A: Direct Fetch (No Cache)

Best for development and prototyping. VM1 calls VM2, VM2 immediately proxies to `rickandmortyapi.com` and returns the response. VM3 is not used.

```
VM1 (Node.js)  →  VM2 (.NET)  →  rickandmortyapi.com
                  ↓
               Returns JSON directly (no DB)
```

**When to use:** Local dev, low-traffic demos, when data freshness is critical.

**VM2 .NET controller example (passthrough):**
```csharp
[HttpGet("characters")]
public async Task<IActionResult> GetCharacters([FromQuery] int page = 1)
{
    var url = $"{_config["RICKMORTY_BASE_URL"]}/character?page={page}";
    var response = await _httpClient.GetFromJsonAsync<CharacterResponse>(url);
    return Ok(response);
}
```

---

### Scenario B: .NET Proxy with PostgreSQL Cache

VM2 checks PostgreSQL first. On a cache miss, it fetches from the upstream API, stores the result in VM3, then returns it. Subsequent requests within the TTL window are served from the DB.

```
VM1  →  VM2  →  VM3 (cache hit?) ──yes──→  return cached data
                       │
                      no
                       │
                       ↓
                  rickandmortyapi.com
                       │
                       ↓
               Store in VM3 → return to VM1
```

**When to use:** Production-like setups, reducing upstream API calls, supporting offline/degraded mode.

**Cache TTL** is configurable via `CACHE_TTL_MINUTES`. Characters change rarely; a 60-minute TTL is reasonable.

---

### Scenario C: Full Sync — Bulk Import to PostgreSQL

A background job on VM2 (e.g. a hosted `IHostedService` or cron) walks all paginated pages of the Rick and Morty API and bulk-inserts every character, location, and episode into VM3. VM1 then queries VM2 which reads entirely from the DB — no live upstream calls during normal operation.

```
[Scheduled Job on VM2]
    ↓  GET /api/character?page=1..42
    rickandmortyapi.com
    ↓  bulk insert
    VM3 (PostgreSQL)

VM1  →  VM2  →  VM3 (all reads from DB)
```

**When to use:** High-traffic apps, full-text search requirements, analytics, data enrichment pipelines, or when upstream API availability cannot be relied on.

**Sync frequency:** Daily is sufficient — the show is no longer in production, so data is largely stable.

---

## Code Examples

### Node.js — Fetch Characters

`vm1/lib/api.js`

```javascript
const axios = require('axios');

const API_BASE = process.env.API_BASE_URL; // Points to VM2

async function getCharacters(page = 1, filters = {}) {
  const params = new URLSearchParams({ page, ...filters });
  const { data } = await axios.get(`${API_BASE}/characters?${params}`);
  return data;
}

async function getCharacterById(id) {
  const { data } = await axios.get(`${API_BASE}/characters/${id}`);
  return data;
}

module.exports = { getCharacters, getCharacterById };
```

---

### .NET — Proxy Controller

`vm2/Controllers/CharactersController.cs`

```csharp
[ApiController]
[Route("api/[controller]")]
public class CharactersController : ControllerBase
{
    private readonly IHttpClientFactory _factory;
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public CharactersController(IHttpClientFactory factory, AppDbContext db, IConfiguration config)
    {
        _factory = factory;
        _db = db;
        _config = config;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] string? name = null)
    {
        // Try cache first (Scenario B)
        var cached = await _db.Characters
            .Where(c => name == null || c.Name.Contains(name))
            .Skip((page - 1) * 20)
            .Take(20)
            .ToListAsync();

        if (cached.Any())
            return Ok(new { results = cached, source = "cache" });

        // Fallback to upstream API (Scenario A)
        var client = _factory.CreateClient();
        var url = $"{_config["RICKMORTY_BASE_URL"]}/character?page={page}";
        if (!string.IsNullOrEmpty(name)) url += $"&name={name}";

        var response = await client.GetFromJsonAsync<CharacterPageResponse>(url);
        return Ok(response);
    }
}
```

---

### PostgreSQL — Schema

`vm3/schema.sql`

```sql
CREATE TABLE characters (
    id          INT PRIMARY KEY,
    name        TEXT NOT NULL,
    status      TEXT,
    species     TEXT,
    type        TEXT,
    gender      TEXT,
    origin_name TEXT,
    location    TEXT,
    image_url   TEXT,
    created_at  TIMESTAMPTZ,
    synced_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE locations (
    id          INT PRIMARY KEY,
    name        TEXT NOT NULL,
    type        TEXT,
    dimension   TEXT,
    synced_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE episodes (
    id          INT PRIMARY KEY,
    name        TEXT NOT NULL,
    air_date    TEXT,
    episode     TEXT,
    synced_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table: which characters appear in which episodes
CREATE TABLE character_episodes (
    character_id INT REFERENCES characters(id),
    episode_id   INT REFERENCES episodes(id),
    PRIMARY KEY (character_id, episode_id)
);

-- Full-text search index on characters
CREATE INDEX characters_name_fts ON characters USING GIN(to_tsvector('english', name));
```

---

## Environment Variables

| Variable | VM | Description |
|---|---|---|
| `API_BASE_URL` | VM1 | VM2's internal URL, e.g. `http://192.168.1.20:5000` |
| `RICKMORTY_BASE_URL` | VM2 | `https://rickandmortyapi.com/api` |
| `ConnectionStrings__DefaultConnection` | VM2 | PostgreSQL connection string |
| `CACHE_TTL_MINUTES` | VM2 | How long cached data is considered fresh |
| `SYNC_ENABLED` | VM2 | `true`/`false` — enable the background full-sync job |
| `SYNC_CRON` | VM2 | Cron expression for sync schedule, e.g. `0 3 * * *` |
| `DB_HOST` | VM3 | Postgres host (used in monitoring/backups) |

Store secrets in `.env` files locally and in your secret manager (Vault, AWS Secrets Manager, Azure Key Vault) in deployed environments. Never commit credentials.

---

## Running the Stack

**1. Start PostgreSQL on VM3:**
```bash
sudo systemctl start postgresql
psql -U app -d rickmorty -f schema.sql
```

**2. Start the .NET API on VM2:**
```bash
cd vm2/
dotnet restore
dotnet run --environment Production
# Listens on http://0.0.0.0:5000
```

**3. Start the Node.js app on VM1:**
```bash
cd vm1/
npm install
npm run dev
# Listens on http://0.0.0.0:3000
```

**Optional — trigger a full sync manually via VM2:**
```bash
curl -X POST http://192.168.1.20:5000/api/sync/run
```

---

## Extending the Setup

| Use Case | How |
|---|---|
| **Add Redis** | Drop Redis between VM2 and VM3 for sub-millisecond in-memory cache. Use as L1, PostgreSQL as L2. |
| **GraphQL on VM2** | Replace REST proxy with a GraphQL layer using Hot Chocolate (.NET) — query `rickandmortyapi.com/graphql` upstream. |
| **Authentication** | Add JWT middleware to VM2. VM1 sends bearer tokens; VM2 validates before serving data. |
| **Search** | Use PostgreSQL full-text search (`to_tsvector`) on the `characters` table for name/species search. |
| **Containerise** | Wrap each VM's service in a Dockerfile. Use Docker Compose or Kubernetes to orchestrate all three together. |
| **Event streaming** | Emit character sync events from VM2 to a message broker (RabbitMQ / Kafka). Other consumers can react to updates independently. |
| **Analytics** | Add a fourth service (Python / dbt) that reads from VM3 and builds aggregate reports — episode appearance counts, species breakdowns, etc. |

---

## Resources

- **Rick and Morty API Docs:** https://rickandmortyapi.com/documentation
- **GraphQL Playground:** https://rickandmortyapi.com/graphql
- **JavaScript Client:** https://github.com/afuh/rick-and-morty-api-node
- **ASP.NET Core Docs:** https://learn.microsoft.com/en-us/aspnet/core
- **Npgsql EF Core Provider:** https://www.npgsql.org/efcore/

---

*Data and images from Rick and Morty belong to their respective owners (Adult Swim / Justin Roiland / Dan Harmon). This project is for educational and development purposes only.*
