# M3 Audit — Source Material Extraction for Modules

## 1. Inventory of `m3/` Source Material

| File | Type | Lines | Content |
|------|------|-------|---------|
| `M3-Advanced-Docker.md` | Course slides | 922 | Docker Machine, Networking, Volumes, Distributed Apps, Docker Compose, Docker Swarm, Stacks |
| `Practice-M3-Advanced-Docker.md` | Lab exercises (BG) | 344 | Hands-on: docker-machine setup, networking, volumes, linking, compose, swarm clusters, stacks |
| `Homework-M3-Advanced-Docker.md` | Assignment | ~20 | Vagrantfile for 3-node Swarm + docker-compose (web+db, replicate ×3) |
| `DOB-M3-Practice-Files/` | Reference files | — | M3-1: install scripts, M3-2a: PHP+MySQL Dockerfiles, M3-2b: docker-compose.yml (PHP+MySQL), M3-3: docker-compose.yml (PHP Swarm stack) |

### Topic breakdown from M3-Advanced-Docker.md

| Section | Slides | Commands Covered |
|---------|--------|-----------------|
| Docker Machine | 9–18 | `create`, `env`, `ls`, `status`, `ssh`, `start`, `stop`, `rm` |
| Networking | 20–28 | `network ls`, `inspect`, `connect`, `disconnect`, `create`, `rm`, `prune` |
| Volumes | 30–35 | `volume ls`, `inspect`, `create`, `rm`, `prune` |
| Distributed Apps | 38–40 | Container linking (`--link`), isolated networks (`--net`) |
| Docker Compose | 42–51 | `build`, `up`, `down`, `ps`, `logs`, `start`, `stop`, `rm` |
| Docker Swarm | 53–61 | `swarm init`, `join`, `leave`; `node ls`; `service create`, `ls`, `inspect`, `ps`, `scale`, `rm`, `update`; `stack deploy`, `ps`, `rm` |

---

## 2. Gap Analysis — What's Already Covered

### 2.1 `modules/m2/advanced-docker.js` (699 lines, 9 parts)

This module **already covers virtually all M3 topics** with a Node.js + PostgreSQL stack:

| M3 Topic | m2/advanced-docker.js Coverage | ID Range |
|----------|-------------------------------|----------|
| Docker Machine | Install, create, ls, env, ssh, env -u | 101–107 |
| Networking | ls, create, inspect, connect, disconnect | 201–205 |
| Volumes | Create, inspect, attach, bind-mount, named, data-container, Postgres persistence | 301–309 |
| Docker Compose | Install, Node.js+Postgres compose file, lifecycle (build→up→ps→logs→down) | 501–503 |
| Swarm — Cluster | 3-node cluster creation, init, join workers, node ls | 601–604 |
| Swarm — Services | create, ls, inspect, ps, scale, drain/active, force rebalance, update-delay/parallelism | 605–608 |
| Swarm — Stacks | deploy from compose, ps, rm | 701–702 |
| File Sharing | docker-machine mount, virtualbox shared folders across VMs | 801–802 |
| Cleanup | Stop default VM, remove all VMs | 901–902 |

**The module is currently marked `ready: false` in `lib/registry.js`.**

### 2.2 Commands in M3 source NOT in m2/advanced-docker.js

| Command | Reason Missing |
|---------|---------------|
| `docker-machine start` / `stop` / `rm` / `status` | Low-value subcommands — m2 covers create/ls/env/ssh which are the 80% case |
| `docker network prune` | Niche — only used during cleanup |
| `docker volume rm` / `prune` | Niche — only used during cleanup |
| `docker swarm leave` | Niche — only needed when decommissioning a node |
| `docker-compose start` / `stop` / `rm` (individual) | m2 shows the lifecycle chain (build→up→down) which is the standard workflow |

**Verdict:** m2/advanced-docker.js already has ~95% functional coverage. The M3 source material's added value is **not in new commands** but in:

1. **Stack diversity** — the M3 practice files use PHP+MySQL; m2 uses only Node.js+Postgres
2. **.NET is missing entirely** — no module in `modules/` uses a .NET stack
3. **Multi-stack comparison** — showing the same Compose/Swarm patterns in both Node.js and .NET side-by-side

---

## 3. Extraction Proposals

### 3.1 Proposal A: `.NET Docker Compose Module`

**File:** `modules/m3/docker-compose-dotnet.js`

**What it replaces:** M3-2a (PHP+MySQL manual linking) and M3-2b (PHP+MySQL Compose)

**Content:**
- Docker Compose with .NET 8 Minimal API + PostgreSQL
- Multi-stage Dockerfile for .NET (SDK build stage → runtime stage)
- ConfigMap/Secret pattern via `.env` file
- Volume persistence for Postgres data
- Bridge network for service-to-service communication
- Full lifecycle: `build` → `up -d` → `ps` → `logs` → `down`

**Example stack:**

```yaml
# docker-compose.yml — .NET 8 Web API + PostgreSQL
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: weatherapp
    volumes:
      - pg-data:/var/lib/postgresql/data
    networks:
      - app-network

  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '8080:8080'
    environment:
      ConnectionStrings__Default: "Host=db;Database=weatherapp;Username=postgres;Password=${DB_PASSWORD}"
    depends_on:
      - db
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  pg-data:
```

```dockerfile
# Dockerfile — multi-stage .NET 8 build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY *.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "WeatherApi.dll"]
```

**Module structure** (following `modules/m3/*.js` pattern):

```js
window.commandData = [
  {
    id: 350, section: "compose-dotnet", sectionTitle: "Docker Compose — .NET Stack",
    commandTitle: "Create docker-compose.yml (.NET + Postgres)",
    command: "cat docker-compose.yml",
    searchTerms: "docker-compose dotnet .net postgres compose file services volumes network",
    description: "...",
    parts: [
      { text: "services:", explanation: "..." },
      { text: "build: context: .", explanation: "..." },
      // ...
    ],
    example: "# Full docker-compose.yml shown above",
    why: "..."
  },
  // build, up, ps, logs, down, etc.
];
```

### 3.2 Proposal B: `.NET Docker Swarm Module`

**File:** `modules/m3/docker-swarm-dotnet.js`

**What it replaces:** M3-3 (PHP Swarm stack deployment)

**Content:**
- 3-node Swarm cluster via docker-machine + VirtualBox
- Deploy a .NET 8 Web API stack across the cluster
- Service replication (scale .NET API ×3)
- Rolling updates (`--update-delay`, `--update-parallelism`)
- Node drain/reactivate during maintenance
- Stack deploy/ps/rm with .NET services
- Multi-VM file sharing via VirtualBox shared folders

**Key .NET-specific considerations:**
- .NET images are larger than Node.js alpine images (~210 MB vs ~180 MB for runtime)
- `mcr.microsoft.com/dotnet/aspnet:8.0` is multi-arch (amd64, arm64) — works on both x86 and ARM
- Environment variables use `ASPNETCORE_*` and `ConnectionStrings__*` naming conventions
- Health checks via `/health` endpoint (built into ASP.NET 8 Minimal APIs)

### 3.3 Proposal C: `.NET & Node.js Homework Module`

**File:** `modules/m3/homework-m3.js`

**What it replaces:** `Homework-M3-Advanced-Docker.md`

**Content:**
- Vagrantfile that provisions 3 VMs with Docker pre-installed
- Swarm init + join automation
- docker-compose.yml with .NET Web API + PostgreSQL (alternative: Node.js + PostgreSQL)
- Service replication factor 3
- Deploy on Swarm via `docker stack deploy`

---

## 4. Stack Deviations — PHP → .NET / Node.js

### 4.1 PHP (`php:7.0-apache`) → .NET (`mcr.microsoft.com/dotnet/aspnet:8.0`)

| Concern | PHP Approach | .NET Approach | Deviation |
|---------|-------------|---------------|-----------|
| **Base image** | `php:7.0-apache` (~400 MB) | `mcr.microsoft.com/dotnet/aspnet:8.0` (~210 MB) | .NET runtime is smaller but needs a separate SDK build stage |
| **Build process** | No build — PHP is interpreted | Multi-stage Dockerfile: `dotnet publish` in SDK stage → copy artifacts to runtime stage | Adds a build stage; increases initial `docker build` time but produces smaller final image |
| **Web server** | Apache bundled inside PHP image | Kestrel (built into ASP.NET) | .NET doesn't need a separate web server; Kestrel is production-ready behind a reverse proxy |
| **Port** | 80 (Apache default) | 8080 (ASP.NET default) or 80 via `ASPNETCORE_URLS` | Port mapping must be explicit in docker-compose and Compose files |
| **Config** | `php.ini`, Apache `.conf` files | `appsettings.json`, `ASPNETCORE_*` env vars | Environment-based config is the idiomatic .NET pattern |
| **DB driver** | `mysqli` / `PDO` | `Npgsql` (PostgreSQL) or `Microsoft.Data.SqlClient` (SQL Server) | NuGet package dependency must be in `.csproj` |
| **Health check** | `curl localhost` in shell | `HEALTHCHECK` with `/health` endpoint | .NET 8 Minimal APIs have built-in health check middleware |

### 4.2 PHP → Node.js (already handled in m2/advanced-docker.js)

| Concern | PHP Approach | Node.js Approach | Status |
|---------|-------------|-----------------|--------|
| **Base image** | `php:7.0-apache` | `node:18-alpine` / `node:20-alpine` | Already covered |
| **Build** | None | `npm install` / `npm ci` | Already covered |
| **Port** | 80 | 3000 (Express default) | Already covered |
| **DB driver** | `mysqli` | `pg` (PostgreSQL) | Already covered |

### 4.3 MySQL → PostgreSQL

The original M3 materials use MySQL (`mysql:5.7`). Both proposed modules use PostgreSQL. Rationale:

- PostgreSQL is the default for modern .NET development (EF Core + Npgsql)
- PostgreSQL is already used in `modules/m2/advanced-docker.js` — consistency across modules
- The `postgres:16-alpine` image is ARM64-compatible (important for Pi 5 users)
- If MySQL is specifically required for coursework, it can be used as a swap with minimal changes (only the connection string and image change)

---

## 5. Implementation Plan

### Phase 1 — Audit & Planning (this document)

- [x] Inventory m3/ source material
- [x] Gap analysis against existing modules
- [x] Propose extractions with .NET/Node.js stack alignment
- [x] Mark `m2-advanced-docker` as `ready: true` in `lib/registry.js` (content is complete)

> **Placement decision (final):** the .NET Compose/Swarm/Homework modules were
> **merged into the existing "Standalone Containers" (`m2`) group** next to
> `m2-advanced-docker` — *not* a separate "M3 — Advanced Docker (.NET)" group.
> Rationale: same topic as the existing (Node.js) advanced-Docker module, keeps the
> curriculum order (single containers → Compose/Swarm → Kubernetes), and avoids
> colliding with the k3s group which also uses the `m3-*` id/folder space.
> Modules were renamed `m3-* → m2-*` and moved `modules/m3/ → modules/m2/`.

### Phase 2 — .NET Compose Module

- [x] Create `modules/m2/docker-compose-dotnet.js`
- [x] Register in `lib/registry.js` inside the "Standalone Containers" group
- [x] Include: docker-compose.yml, Dockerfile, build, up, ps, logs, down
- [x] All examples use .NET 8 Minimal API + PostgreSQL

### Phase 3 — .NET Swarm Module

- [x] Create `modules/m2/docker-swarm-dotnet.js`
- [x] Register in `lib/registry.js`
- [x] Include: swarm init, join, node ls, service create/scale/update, stack deploy
- [x] All service examples use .NET 8 Web API images

### Phase 4 — Practice Files Migration

- [x] Create `m3/DOB-M3-Practice-Files/M3-2a-dotnet/` — .NET Dockerfile + source
- [x] Create `m3/DOB-M3-Practice-Files/M3-2b-dotnet/` — .NET docker-compose.yml
- [x] Create `m3/DOB-M3-Practice-Files/M3-3-dotnet/` — .NET Swarm stack compose file
- [x] Original PHP+MySQL files kept in place for reference (alongside the `-dotnet` variants)

### Phase 5 — Homework Module

- [x] Create `modules/m2/homework-m3.js`
- [x] Register in `lib/registry.js`
- [x] Include: Vagrantfile for 3-node Swarm, .NET docker-compose.yml, deployment instructions

---

## 6. Registry Changes (as implemented)

The three .NET modules were added **inside the existing "Standalone Containers"
group**, right after `m2-advanced-docker` (no new group was created):

```js
{
  id: "m2-docker-compose-dotnet",
  title: ".NET Docker Compose",
  subtitle: ".NET 8 Web API + PostgreSQL multi-container setup",
  sidebarSubtitle: "Compose with a .NET stack",
  script: "modules/m2/docker-compose-dotnet.js",
  ready: true,
},
{
  id: "m2-docker-swarm-dotnet",
  title: ".NET Docker Swarm",
  subtitle: "Deploy .NET services across a 3-node Swarm cluster",
  sidebarSubtitle: "Swarm with a .NET stack",
  script: "modules/m2/docker-swarm-dotnet.js",
  ready: true,
},
{
  id: "m2-homework",
  title: "Homework M3 — .NET Swarm Deployment",
  subtitle: "Vagrantfile + docker-compose + Swarm cluster exercise",
  sidebarTitle: "Homework — .NET Swarm",
  sidebarSubtitle: "Vagrant + Compose + Swarm",
  script: "modules/m2/homework-m3.js",
  ready: true,
},
```

`m2-advanced-docker` was already marked `ready: true` (Phase 1).
