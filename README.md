# 👉 [https://baiganio.github.io/k3s-pi5](https://baiganio.github.io/k3s-pi5/)

## Project Status

> Track what's implemented and what's next. Each iteration extends the reference architecture below.  
> **Stable content lives in the sections below this tracker — no marks, no todos, just clean reference material.**

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Scenario A — Direct Fetch (no cache) | ✅ Done | Passthrough proxy, zero DB dependency |
| 2 | Scenario B — .NET Proxy + PostgreSQL Cache | ✅ Done | Cache-aside pattern, configurable TTL |
| 3 | Scenario C — Containerized on k3s | ✅ Done | Architecture mapping: VMs → Kubernetes Deployments/Services |
| 4 | Rate limiter on .NET API | ✅ Done | Fixed-window policy, 100 req/min per IP, configurable via env vars |
| 5 | Docker Compose quick-start | ✅ Done | Single-command local dev; `docker compose up` spins all 3 services |
| 6 | Monitoring & backups | ✅ Done | Health checks, `pg_dump` cron, Prometheus metrics endpoint stub |
| 7 | Curriculum mapping (k3s-pi5 modules) | ✅ Done | Table mapping README concepts → site modules |
| 8 | CI/CD pipeline (Jenkins) | ✅ Done | Curriculum: self-hosted Jenkins (master + agents on Vagrant VMs) — build → test → containerize → deploy the .NET & Node apps. GitHub Actions variant optional |
| 9 | Config management (Ansible) | ✅ Done | Curriculum: agentless playbooks deploy the .NET & Node apps as `systemd` services, backed by Postgres |
| 10 | Monitoring (Nagios Core) | ✅ Done | Curriculum: check-based monitoring + alerting for the APIs, Postgres, and containers |
| 11 | Cloud reach (AWS free tier) | ✅ Done | Curriculum: EC2, IAM + CLI, ECS, Vagrant cloud provisioning — cost-aware, free-tier |
| 12 | Add Redis L1 cache layer | ⏳ Planned | Sub-millisecond cache between the API and Postgres |
| 13 | Add Auth (JWT + API keys) | ⏳ Planned | Protect API endpoints; the frontend sends bearer tokens |
| 14 | Observability stack (Prometheus + Grafana + Loki) | 🔭 Optional | Richer metrics/logs/dashboards alongside Nagios |
| 15 | Infrastructure as Code (Terraform) | 🔭 Optional | Provision cloud resources declaratively; drift detection |
| 16 | GitOps (ArgoCD or Flux) | 🔭 Optional | App-of-apps; reconcile the cluster from Git; PR-based deploys |

---

## What This Repo Is

This repository is the **k3s-pi5 DevOps Learning Platform** — a browser-based, self-paced curriculum that takes you from zero to running Kubernetes on a Raspberry Pi 5. The live site at [baiganio.github.io/k3s-pi5](https://baiganio.github.io/k3s-pi5/) is a progressive command reference with interactive explanations.

**This README is the ground-floor reference implementation.** It walks through a complete multi-service architecture — Node.js frontend, .NET API gateway, PostgreSQL database — integrating the free, public Rick and Morty API. Every pattern established here (caching strategies, data flows, environment management, rate limiting, monitoring) recurs in later modules as the stack evolves from VMs → containers → Kubernetes → GitOps.

**If you're an AI model reading this:** This file is the canonical description of the reference architecture. Use it to understand project conventions, code patterns, and what's been built vs. what's planned. The Project Status tracker above is the authoritative source of truth for iteration progress.

---

## The Characters

> Think of Rick as your .NET API layer — does all the heavy lifting, owns the logic, talks to the outside world. Morty is the Node.js frontend — what users actually see, anxious but functional, inseparable from Rick. PostgreSQL is the garage — where everything gets stored between adventures.

**Rick Sanchez** — hyper-intelligent scientist, alcoholic, nihilist with hidden depth. Builds portal guns from scrap. The .NET layer.

**Morty Smith** — 14-year-old grandson, anxious but increasingly competent. His brainwaves cancel out Rick's genius. The Node.js frontend.

Together they're a "genius + everyman" duo, and the perfect metaphor for a backend + frontend architecture.

---

## How it works?

### 🛸 Reference Implementation — Rick and Morty API Multi-Service Architecture

> A practical, production-patterns reference for integrating the [Rick and Morty REST/GraphQL API](https://rickandmortyapi.com) across a three-service setup: a **Node.js frontend**, a **.NET API layer** (with rate limiting), and a **PostgreSQL database**. Covers VM deployment, Docker Compose local dev, Kubernetes architecture mapping, caching, sync strategies, monitoring, and CI/CD — everything you need to go from `localhost` to a production-shaped homelab.

> **IP addresses shown** (192.168.1.x) are examples — replace with your LAN subnet, `hostname.local`, or Docker service names.

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
  - [Scenario C: Containerized on k3s](#scenario-c-containerized-on-k3s)
- [Code Examples](#code-examples)
  - [Node.js — Fetch Characters](#nodejs--fetch-characters)
  - [.NET — Proxy Controller with Rate Limiting](#net--proxy-controller-with-rate-limiting)
  - [PostgreSQL — Schema](#postgresql--schema)
- [Docker Compose Quick-Start](#docker-compose-quick-start)
- [Environment Variables](#environment-variables)
- [Running the Stack](#running-the-stack)
- [Monitoring & Backups](#monitoring--backups)
- [Where This Fits in the k3s-pi5 Curriculum](#where-this-fits-in-the-k3s-pi5-curriculum)
- [Extending the Setup](#extending-the-setup)
- [Resources](#resources)

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
│  • Rate-limited (100 req/min per IP, configurable)      │
│  • Handles caching logic (DB or in-memory)              │
│  • Exposes internal REST endpoints to VM1               │
│  • Exposes /health and /metrics endpoints               │
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

Each service is independently deployable. The .NET layer is the central orchestrator — it decides whether to serve data from PostgreSQL cache or fetch fresh from the upstream Rick and Morty API, all while enforcing rate limits to protect both itself and the upstream.

**Evolution path:** VMs → Docker Compose (this README) → k3s/Kubernetes (Scenario C) → automated delivery & monitoring (Jenkins, Nagios — curriculum Phase 3) → cloud reach (AWS — Phase 4). GitOps with ArgoCD is an optional later step.

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

**Role:** Backend API gateway. Proxies the external Rick and Morty API, enforces rate limits, applies caching, data enrichment, and business logic.

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
# Rate limiting is built into .NET 8 — no extra package needed (System.Threading.RateLimiting)
```

**Key environment variables:**
```env
RICKMORTY_BASE_URL=https://rickandmortyapi.com/api
ConnectionStrings__DefaultConnection=Host=192.168.1.30;Database=rickmorty;Username=app;Password=secret
CACHE_TTL_MINUTES=60
RATE_LIMIT_PERMIT_LIMIT=100
RATE_LIMIT_WINDOW_SECONDS=60
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

Best for development and prototyping. VM1 calls VM2, VM2 immediately proxies to `rickandmortyapi.com` and returns the response. VM3 is not used. Rate limiter still applies.

```
VM1 (Node.js)  →  VM2 (.NET)  →  rickandmortyapi.com
                   ↓
                Returns JSON directly (no DB)
```

**When to use:** Local dev, low-traffic demos, when data freshness is critical.

**VM2 .NET controller example (passthrough):**
```csharp
[HttpGet("characters")]
[EnableRateLimiting("fixed")]  // 100 req/min per IP
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

### Scenario C: Containerized on k3s

This is the bridge from VMs to Kubernetes. Each VM maps to a Kubernetes resource running on the k3s cluster on a Raspberry Pi 5.

```
┌─────────────────────────────────────────────────────────┐
│                    External API                         │
│            https://rickandmortyapi.com/api              │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  k3s Cluster (Raspberry Pi 5, ARM64)                    │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │ Deployment: dotnet-api│  │ StatefulSet: postgres   │ │
│  │ Service: dotnet-api   │  │ Service: postgres       │ │
│  │ Ingress → /api/*      │  │ PVC: 10Gi (SSD)         │ │
│  │ Rate limiter enforced │  │                         │ │
│  └──────────┬───────────┘  └───────────┬──────────────┘ │
│             │                          │                 │
│  ┌──────────┴──────────────────────────┴──────────────┐ │
│  │ Deployment: node-frontend                          │ │
│  │ Service: node-frontend                             │ │
│  │ Ingress → / (main site)                            │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  Traefik Ingress Controller (built into k3s)            │
│  cert-manager → Let's Encrypt TLS                       │
│  Cloudflare Tunnel → public HTTPS                       │
└─────────────────────────────────────────────────────────┘
```

| VM Concept | k3s Resource | Why |
|---|---|---|
| VM1 (Node.js) | `Deployment` + `Service` + `Ingress` | Stateless frontend; scale replicas horizontally |
| VM2 (.NET API) | `Deployment` + `Service` + `Ingress` | Stateless API; rate limiter still applies per-pod |
| VM3 (PostgreSQL) | `StatefulSet` + `Service` + `PVC` | Stateful — needs stable identity and persistent SSD storage |
| VM port-forwarding | `Service` (ClusterIP) + `Ingress` | k8s-native service discovery replaces manual IP:port mapping |
| `pg_hba.conf` IP restriction | `NetworkPolicy` | Restrict ingress to Postgres pods to only the API namespace |
| Manual `dotnet run` | `Deployment` with `image:` from GHCR | Images built by CI, stored in GitHub Container Registry |

**When to use:** Anything beyond local dev. This is the target architecture for the k3s-pi5 curriculum — everything from Phase 1 onward runs on this foundation.

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

### .NET — Proxy Controller with Rate Limiting

**Rate limiter configuration** in `Program.cs`:

```csharp
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// ── Rate Limiter ────────────────────────────────────────────
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddFixedWindowLimiter(policyName: "fixed", config =>
    {
        config.PermitLimit = builder.Configuration.GetValue<int>("RATE_LIMIT_PERMIT_LIMIT", 100);
        config.Window = TimeSpan.FromSeconds(
            builder.Configuration.GetValue<int>("RATE_LIMIT_WINDOW_SECONDS", 60));
        config.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        config.QueueLimit = 0; // No queueing — reject immediately when limit hit
    });
});

var app = builder.Build();
app.UseRateLimiter();
// ────────────────────────────────────────────────────────────

app.MapControllers();
app.Run();
```

**Controller** — `vm2/Controllers/CharactersController.cs`:

```csharp
[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("fixed")]  // Applies to all actions in this controller
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

    // Health check — no rate limit (essential for k8s liveness/readiness probes)
    [HttpGet("/health")]
    [DisableRateLimiting]
    public IActionResult Health() => Ok(new { status = "healthy", timestamp = DateTime.UtcNow });

    // Prometheus metrics endpoint — no rate limit (scraped every 15s)
    [HttpGet("/metrics")]
    [DisableRateLimiting]
    public IActionResult Metrics() => Ok(new { requests_served = _counter, cache_hits = _cacheHits });
}
```

**Why rate limiting matters here:**
- Protects the upstream Rick and Morty API from accidental abuse (no auth = no per-user throttling)
- Prevents a runaway frontend loop from taking down the .NET API
- Health and metrics endpoints are excluded — k8s probes and Prometheus scrapes must never be throttled
- The `X-RateLimit-Retry-After` header is automatically added to 429 responses by ASP.NET Core

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

## Docker Compose Quick-Start

Skip the VMs — run all three services on a single machine with Docker Compose. Good for local dev, demos, and CI.

`docker-compose.yml`:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    container_name: rickmorty-db
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: rickmorty
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./vm3/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d rickmorty"]
      interval: 5s
      timeout: 3s
      retries: 5

  dotnet-api:
    build:
      context: ./vm2
      dockerfile: Dockerfile
    container_name: rickmorty-api
    environment:
      RICKMORTY_BASE_URL: https://rickandmortyapi.com/api
      ConnectionStrings__DefaultConnection: Host=postgres;Database=rickmorty;Username=app;Password=secret
      CACHE_TTL_MINUTES: 60
      RATE_LIMIT_PERMIT_LIMIT: 100
      RATE_LIMIT_WINDOW_SECONDS: 60
    ports:
      - "5000:8080"
    depends_on:
      postgres:
        condition: service_healthy

  node-frontend:
    build:
      context: ./vm1
      dockerfile: Dockerfile
    container_name: rickmorty-web
    environment:
      API_BASE_URL: http://dotnet-api:8080
      NEXT_PUBLIC_APP_NAME: Rick & Morty Explorer
    ports:
      - "3000:3000"
    depends_on:
      - dotnet-api

volumes:
  pgdata:
```

```bash
# One command to start everything:
docker compose up -d

# Check status:
docker compose ps

# Open the frontend:
open http://localhost:3000

# Tear down:
docker compose down -v
```

---

## Environment Variables

| Variable | Service | Description |
|---|---|---|
| `API_BASE_URL` | VM1 / Node | VM2's internal URL, e.g. `http://192.168.1.20:5000` |
| `RICKMORTY_BASE_URL` | VM2 / .NET | `https://rickandmortyapi.com/api` |
| `ConnectionStrings__DefaultConnection` | VM2 / .NET | PostgreSQL connection string |
| `CACHE_TTL_MINUTES` | VM2 / .NET | How long cached data is considered fresh (default: 60) |
| `RATE_LIMIT_PERMIT_LIMIT` | VM2 / .NET | Max requests per window per IP (default: 100) |
| `RATE_LIMIT_WINDOW_SECONDS` | VM2 / .NET | Rate limit window duration in seconds (default: 60) |
| `DB_HOST` | VM3 / Postgres | Postgres host (used in monitoring/backups) |

Store secrets in `.env` files locally and in your secret manager (Vault, AWS Secrets Manager, Azure Key Vault) in deployed environments. Never commit credentials.

---

## Running the Stack

### Option 1: Docker Compose (recommended for local dev)

```bash
docker compose up -d
```

See [Docker Compose Quick-Start](#docker-compose-quick-start) above for the full file.

### Option 2: Manual (3 VMs)

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

---

## Monitoring & Backups

### Health Checks

The .NET API exposes two un-rate-limited endpoints for operational use:

| Endpoint | Purpose | Example |
|---|---|---|
| `GET /health` | Liveness/readiness probe for orchestrators (k8s, Docker, load balancers) | `curl http://localhost:5000/health` → `{"status":"healthy"}` |
| `GET /metrics` | Prometheus scrape target (stub — extend with `prometheus-net` in Phase 3) | `curl http://localhost:5000/metrics` → `{"requests_served":1423,"cache_hits":891}` |

**Docker health checks** are built into the Compose file — `docker compose ps` shows health status for each container.

### Database Backups

**Manual backup (VM3):**
```bash
pg_dump -U app -d rickmorty -F c -f /backups/rickmorty_$(date +%Y%m%d).dump
```

**Automated nightly backup via cron (VM3):**
```bash
# /etc/cron.d/rickmorty-backup
0 2 * * * postgres pg_dump -U app -d rickmorty -F c -f /backups/rickmorty_$(date +\%Y\%m\%d).dump
```

**Restore:**
```bash
pg_restore -U app -d rickmorty /backups/rickmorty_20260605.dump
```

### What to Monitor

| Signal | Tool | Why |
|---|---|---|
| API request rate & latency | Prometheus via `/metrics` | Detect performance regressions before users notice |
| Cache hit ratio | Custom metric in `/metrics` | Low hit ratio = cache misconfigured or TTL too short |
| Rate limit hits (429 responses) | ASP.NET Core built-in counters | Indicates abuse or a misbehaving client |
| PostgreSQL connection count | `pg_stat_activity` | Connection leaks are the #1 cause of DB outages |
| Disk usage on VM3 | `df -h /var/lib/postgresql` | Full disk = database stops writing |

---

## Where This Fits in the k3s-pi5 Curriculum

This README is the **reference implementation** that the [k3s-pi5 learning platform](https://baiganio.github.io/k3s-pi5/) modules build upon. Each concept here maps to one or more modules in the curriculum:

| README Concept | k3s-pi5 Curriculum Group | What You Learn |
|---|---|---|
| VM provisioning (3-service split) | Virtual Machines & Provisioning | Vagrant on Parallels/VMware; Ansible playbooks deploy the .NET & Node apps |
| Manual service startup | Virtual Machines & Provisioning — DevOps Intro | The "before containers" baseline |
| Docker Compose quick-start | Containers (Docker) | Dockerfiles, multi-stage builds, Compose networking |
| .NET API + PostgreSQL | Orchestration (k3s) — Sample Apps | Node.js + Postgres on k3s; ConfigMaps, Secrets, Ingress |
| PostgreSQL schema + PVC | Orchestration (k3s) — Persistent Storage | StatefulSets, PVCs, storage classes on ARM64 |
| Rate limiting / hardening | Orchestration (k3s) — Security | Secrets rotation, RBAC, NetworkPolicy notes |
| Scenario C (k3s) | Orchestration (k3s) — Setup on Pi 5 | Cluster setup, Cloudflare Tunnel |
| Build → test → deploy | CI/CD (Jenkins) | Self-hosted pipelines on Vagrant VMs (master + agents) |
| Monitoring & backups | Monitoring (Nagios Core) | Check-based monitoring + alerting for APIs, Postgres, containers |
| Cloud reach | Cloud (AWS, free tier) | EC2, IAM + CLI, ECS, Vagrant cloud provisioning |

**Learning path:** Start with this README to understand the architecture patterns → follow the k3s-pi5 curriculum groups in order (VMs & Provisioning → Containers → Orchestration → CI/CD → Monitoring → Cloud) → return here to see how each concept fits into a real, working reference implementation. See [roadmap/](roadmap/roadmap.md) for the staged "path we walked."

---

## Extending the Setup

| Use Case | How |
|---|---|
| **Add Redis** | Drop Redis between VM2 and VM3 for sub-millisecond in-memory cache. Use as L1, PostgreSQL as L2. |
| **GraphQL on VM2** | Replace REST proxy with a GraphQL layer using Hot Chocolate (.NET) — query `rickandmortyapi.com/graphql` upstream. |
| **Authentication** | Add JWT middleware to VM2. VM1 sends bearer tokens; VM2 validates before serving data. |
| **Search** | Use PostgreSQL full-text search (`to_tsvector`) on the `characters` table for name/species search. |
| **Containerise** | Wrap each service in a Dockerfile. Use Docker Compose (see above) or Kubernetes (see Scenario C). |
| **Event streaming** | Emit character sync events from VM2 to a message broker (RabbitMQ / Kafka). Other consumers can react to updates independently. |
| **Analytics** | Add a fourth service (Python / dbt) that reads from VM3 and builds aggregate reports — episode appearance counts, species breakdowns, etc. |
| **CI/CD Pipeline** | The curriculum's built path uses self-hosted **Jenkins** (curriculum Phase 3). As an optional variant: a GitHub Actions workflow on push → `docker buildx` for `linux/arm64` → push to GHCR → update image tag in a Helm chart → ArgoCD syncs to k3s. |
| **TLS Everywhere** | cert-manager + Let's Encrypt on k3s (Scenario C). For VMs: terminate TLS at an Nginx reverse proxy in front of VM2. |

---

## Resources

- **Rick and Morty API Docs:** https://rickandmortyapi.com/documentation
- **GraphQL Playground:** https://rickandmortyapi.com/graphql
- **JavaScript Client:** https://github.com/afuh/rick-and-morty-api-node
- **ASP.NET Core Docs:** https://learn.microsoft.com/en-us/aspnet/core
- **ASP.NET Core Rate Limiting:** https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit
- **Npgsql EF Core Provider:** https://www.npgsql.org/efcore/
- **k3s-pi5 Live Site:** https://baiganio.github.io/k3s-pi5/
- **k3s Documentation:** https://docs.k3s.io/
- **Hero image:** https://raw.githubusercontent.com/BaiGanio/js4b/master/images/rick-and-morty.jpg
---

*Data and images from Rick and Morty belong to their respective owners (Adult Swim / Justin Roiland / Dan Harmon). This project is for educational and development purposes only.*
