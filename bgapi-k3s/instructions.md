# BGAPI on Raspberry Pi 5 + k3s — Deployment Guide

This guide takes you from a fresh Raspberry Pi 5 (8 GB) to a running BGAPI
stack inside k3s: SQL Server (Azure SQL Edge, ARM64-compatible), the BGAPI
.NET API, and seeded reference databases.

---

## Architecture (what runs where)

```
┌────────────────────────────────────────────────────────────┐
│  Raspberry Pi 5 (ARM64, 8 GB)                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  k3s (lightweight Kubernetes)                        │  │
│  │                                                      │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │  │
│  │  │sqlserver │ │ postgres │ │ db-init  │ │  bgapi  │ │  │
│  │  │ Stateful │ │ Stateful │ │   Job    │ │Deploy-  │ │  │
│  │  │  Set     │ │  Set     │ │(run once)│ │ ment    │ │  │
│  │  │  :1433   │ │  :5432   │ │          │ │ :62010  │ │  │
│  │  └────┬─────┘ └────┬─────┘ └──────────┘ └────┬────┘ │  │
│  │       │ bgapi-local│ scroogecorp    seeds    │      │  │
│  │       │ Geo+TechCorp  (ScroogeCorp)  Geo+TC  │      │  │
│  │       └────────────┴──────────────────┬──────┘      │  │
│  │  ┌───────────────────────────────────┴─────────┐    │  │
│  │  │  Traefik Ingress (built into k3s)           │    │  │
│  │  │  bgapi.local → bgapi:62010                  │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

> **Why two database engines?** This is deliberate **polyglot persistence**.
> The legacy BGAPI contexts run on **Azure SQL Edge** (`mcr.microsoft.com/azure-sql-edge`)
> — the only Microsoft SQL engine with an ARM64 build (SQL Server 2022 has none).
> It's deprecated upstream but works unchanged with the existing EF Core SQL Server
> provider. The newer **ScroogeCorp bounded context** (FinancingRequest + IntakeDocument)
> lives in its own **PostgreSQL** database via a dedicated `ScroogeCorpDbContext` (Npgsql):
> native ARM64, actively maintained, its own migration history, and zero coupling to the
> legacy schema. New work lands on a database with a future; the legacy schema is left
> untouched.

---

## 0. Prepare the Raspberry Pi

### 0.1 Flash the OS

Use **Raspberry Pi Imager** to flash a 64-bit OS:

- **Raspberry Pi OS Lite (64-bit)** — Bookworm or later
- Or **Ubuntu Server 24.04 LTS (64-bit)** for Raspberry Pi

> You **must** use a 64-bit OS. 32-bit won't run .NET or Docker containers.

### 0.2 First boot setup

```bash
# SSH in (or use keyboard + monitor)
ssh pi@<raspberry-pi-ip>

# Update everything
sudo apt update && sudo apt upgrade -y

# Enable cgroups (required by k3s)
# Add to /boot/firmware/cmdline.txt (RPi OS) or /boot/cmdline.txt:
#   cgroup_memory=1 cgroup_enable=memory swapaccount=1
sudo sed -i '$ s/$/ cgroup_memory=1 cgroup_enable=memory swapaccount=1/' /boot/firmware/cmdline.txt

# Reboot
sudo reboot
```

---

## 1. Install k3s

k3s is a certified, CNCF-conformant Kubernetes distribution that runs great on
a Pi. No external database needed — it uses embedded SQLite by default.

```bash
curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644

# Wait for it to be ready
sudo k3s kubectl get nodes
# Should show your node as "Ready"

# Make kubectl convenient (optional)
echo 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml' >> ~/.bashrc
source ~/.bashrc
# Or alias:
alias k='sudo k3s kubectl'
```

> The `--write-kubeconfig-mode 644` flag lets you run `kubectl` without `sudo`.
> On a single-node homelab this is fine.

---

## 2. Build the BGAPI Docker image on the Pi

The Dockerfile is multi-arch compatible — it uses `mcr.microsoft.com/dotnet/sdk:10.0`
and `aspnet:10.0`, both of which have `linux/arm64` tags. Building on the Pi
itself produces a native ARM64 image.

```bash
# Clone the repo on the Pi
git clone https://dev.azure.com/teamkepler/BGAPI/_git/BGAPI
cd BGAPI

# Build the image (this takes ~5-15 minutes on a Pi 5)
docker build -f APIs/BGAPI/Dockerfile -t bgapi:local .

# Verify
docker images | grep bgapi
```

> **Build takes a while?** The .NET SDK restore + build on a Pi 5 (8 GB) is
> slow but works. Make sure you have at least 4 GB of free disk space. If the
> build fails with OOM, add a swap file: `sudo fallocate -l 2G /swapfile &&
> sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`.

### 2.1 Make the image available to k3s

k3s uses its own embedded containerd, not Docker. Import the image:

```bash
# Option A: Import from Docker (if Docker is installed)
docker save bgapi:local | sudo k3s ctr images import -

# Option B: Build directly with nerdctl (k3s's containerd client)
#   sudo k3s ctr images build -f APIs/BGAPI/Dockerfile -t bgapi:local .

# Verify k3s can see it
sudo k3s ctr images ls | grep bgapi
```

---

## 3. Deploy to k3s

All manifests are in the `k3s/` folder. Apply them in order:

```bash
cd k3s

# Apply everything
kubectl apply -f namespace.yaml
kubectl apply -f secrets.yaml
kubectl apply -f sqlserver.yaml
kubectl apply -f postgres.yaml
kubectl apply -f db-init-job.yaml
kubectl apply -f bgapi.yaml
kubectl apply -f ingress.yaml
```

Or use the convenience script:

```bash
chmod +x deploy.sh
./deploy.sh
```

### 3.1 What each file does

| File | What it creates |
|------|----------------|
| `namespace.yaml` | `bgapi` namespace — isolates everything |
| `secrets.yaml` | SA password (SQL Server) + postgres password (base64-encoded) |
| `sqlserver.yaml` | StatefulSet + PersistentVolumeClaim + ClusterIP Service for SQL on port 1433 |
| `postgres.yaml` | StatefulSet + PVC + headless Service for PostgreSQL on port 5432 — the ScroogeCorp bounded context |
| `db-init-job.yaml` | One-shot Job that runs `geography.sql` and `techcorp.sql` against SQL Server |
| `bgapi.yaml` | Deployment (1 replica) + ClusterIP Service for the .NET API on port 62010 |
| `ingress.yaml` | Traefik IngressRoute — exposes the API at `bgapi.local:80` |

### 3.2 Wait for everything to be ready

```bash
# Watch pods come up
kubectl -n bgapi get pods -w

# Expected output (all Running / Completed):
#   NAME                         READY   STATUS      RESTARTS   AGE
#   sqlserver-0                  1/1     Running     0          2m
#   postgres-0                   1/1     Running     0          2m
#   db-init-xxxxx                0/1     Completed   0          1m
#   bgapi-xxxxxxxxxx-xxxxx       1/1     Running     0          30s
```

The `db-init` Job runs once and completes. On startup the API applies EF Core
migrations for **both** databases: `BGAPIDbContext` against SQL Server
(`bgapi-local`) and `ScroogeCorpDbContext` against PostgreSQL (`scroogecorp`).
Each context has its own migration history, so the schemas evolve independently.

---

## 4. Verify the deployment

### 4.1 Check the API directly (port-forward)

```bash
kubectl -n bgapi port-forward svc/bgapi 62010:62010
```

In another terminal:

```bash
curl http://localhost:62010/swagger/v1/swagger.json | head -c 200
```

You should see a JSON Swagger document.

### 4.2 Access via Ingress

If your Pi is at `192.168.1.100`, add to your laptop's `/etc/hosts`:

```
192.168.1.100   bgapi.local
```

Then open **http://bgapi.local/swagger** in a browser.

### 4.3 Check logs

```bash
# API logs
kubectl -n bgapi logs deploy/bgapi

# SQL Server logs
kubectl -n bgapi logs sqlserver-0

# DB init logs (even after completion)
kubectl -n bgapi logs job/db-init
```

### 4.4 Test a ScroogeCorp endpoint

```bash
# Port-forward and create a financing request
curl -X POST http://localhost:62010/api/scrooge-corp/financing-requests \
  -H "Content-Type: application/json" \
  -d '{
    "debtorName": "Scrooge McDuck",
    "amount": {"amount": 1000000, "currency": "USD"},
    "debtorIban": "GB29NWBK60161331926819",
    "documentId": "test-doc-001"
  }'
```

---

## 5. Useful k3s operations

```bash
# Restart the API
kubectl -n bgapi rollout restart deploy/bgapi

# Scale the API (only if you add more Pi nodes)
kubectl -n bgapi scale deploy/bgapi --replicas=2

# View SQL Server data (interactive)
kubectl -n bgapi exec -it sqlserver-0 -- /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "YourStrong!Passw0rd" -C

# Delete and redeploy everything
kubectl delete namespace bgapi
# Then re-run ./deploy.sh

# Check resource usage
kubectl -n bgapi top pods
```

---

## 6. Troubleshooting

### SQL Server won't start

```bash
kubectl -n bgapi logs sqlserver-0
```

Common causes:
- **PVC not bound**: check `kubectl -n bgapi get pvc`. On k3s, the local-path
  provisioner should create it automatically.
- **Out of memory**: Azure SQL Edge needs ~1 GB minimum. The 8 GB Pi handles
  this fine, but check with `free -h` on the host.

### db-init Job failed

```bash
kubectl -n bgapi logs job/db-init
```

If it says "Login timeout" or "Cannot open server", SQL Server wasn't ready
yet. Delete the Job and it'll retry:

```bash
kubectl -n bgapi delete job db-init
kubectl apply -f db-init-job.yaml
```

### BGAPI pod CrashLoopBackOff

```bash
kubectl -n bgapi logs deploy/bgapi --tail=50
```

Most common: EF Core migrations fail because the `bgapi-local` database doesn't
exist or the connection string is wrong. Check the connection string in
`bgapi.yaml` matches the SQL Server service name (`sqlserver`).

### ImagePullBackOff for bgapi:local

k3s doesn't pull from Docker's local image store. Re-import:

```bash
docker save bgapi:local | sudo k3s ctr images import -
```

Or set `imagePullPolicy: Never` in `bgapi.yaml` (it's already set).

### Out of disk space

```bash
df -h
sudo k3s ctr images ls   # see what's taking space
sudo k3s ctr images rm <image>  # remove unused images
```

---

## 7. Resource budget (Raspberry Pi 5, 8 GB)

| Component | RAM (approx) | CPU |
|-----------|-------------|-----|
| Raspberry Pi OS | ~300 MB | — |
| k3s (idle) | ~500 MB | — |
| Azure SQL Edge | ~1 GB | low-moderate |
| PostgreSQL (ScroogeCorp) | ~150 MB | low |
| BGAPI (.NET) | ~300 MB | low |
| **Total** | **~2.25 GB** | — |
| **Headroom** | **~5.75 GB** | plenty |

You have plenty of room. The Pi 5 handles this workload comfortably.

---

## 8. Continuous Deployment — auto-rebuild on push

The `watch-deploy.sh` script, paired with a systemd timer, polls the git remote
every 5 minutes. When it sees new commits on the `dev` branch, it pulls,
rebuilds the Docker image, imports it into k3s, and triggers a rolling restart.
If there are no new commits, it exits in under a second — no wasted CPU.

### 8.1 Install the watcher

```bash
# Make the script executable
chmod +x /home/pi/bgapi-k3s/watch-deploy.sh

# Copy systemd units
sudo cp /home/pi/bgapi-k3s/bgapi-watch.service /etc/systemd/system/
sudo cp /home/pi/bgapi-k3s/bgapi-watch.timer /etc/systemd/system/

# Reload systemd and enable the timer
sudo systemctl daemon-reload
sudo systemctl enable bgapi-watch.timer
sudo systemctl start bgapi-watch.timer
```

### 8.2 Verify it's working

```bash
# Check timer status (shows next run time)
systemctl status bgapi-watch.timer

# Check last run logs
sudo journalctl -u bgapi-watch.service -n 20 --no-pager

# Follow live
sudo journalctl -u bgapi-watch.service -f
```

### 8.3 How it works

```
Every 5 min:
  git fetch origin dev
  if remote SHA == .last-deployed-sha:
    exit 0                          ← cheap, ~1 second
  else:
    git pull                        ← new commits!
    docker build -t bgapi:local .   ← ~5-15 min on Pi 5
    docker save → k3s ctr import
    kubectl rollout restart deploy/bgapi
    kubectl rollout status          ← wait for healthy
    write SHA → .last-deployed-sha
```

### 8.4 Adjust the polling interval

Edit `bgapi-watch.timer` — change `OnUnitActiveSec=300` (seconds):

| Value | Polling frequency |
|-------|------------------|
| `60`  | Every 1 minute    |
| `300` | Every 5 minutes (default) |
| `600` | Every 10 minutes  |
| `3600`| Every hour        |

```bash
sudo systemctl edit --full bgapi-watch.timer   # edit
sudo systemctl restart bgapi-watch.timer        # apply
```

### 8.5 Manual trigger (for testing)

```bash
# Run the watcher immediately (bypasses the timer)
sudo systemctl start bgapi-watch.service

# Or run the script directly
/home/pi/bgapi-k3s/watch-deploy.sh
```

### 8.6 Webhook — real-time CD (recommended)

Instead of polling every 5 minutes, have Azure DevOps call the Pi the *moment*
you push. A tiny `webhook` receiver runs the same `watch-deploy.sh` script, so
you get instant deploys with zero idle polling. Two ready-made files ship in
this folder: `webhook.conf` (the HMAC-verified hook) and `bgapi-webhook.service`
(the systemd unit).

**1. Install the receiver and the hook config**

```bash
sudo apt update && sudo apt install -y webhook

# Set a strong shared secret, then drop it into webhook.conf:
openssl rand -hex 32                       # copy the output
sudo cp /home/pi/bgapi-k3s/webhook.conf /etc/webhook.conf
sudo nano /etc/webhook.conf                # replace CHANGE-ME-long-random-secret
```

**2. Run it as a service**

```bash
sudo cp /home/pi/bgapi-k3s/bgapi-webhook.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bgapi-webhook.service

# It now listens on localhost:9000
sudo systemctl status bgapi-webhook.service
sudo journalctl -u bgapi-webhook.service -f
```

**3. Expose it through the Cloudflare Tunnel**

The receiver is on `localhost:9000`; Azure DevOps is on the public internet.
Bridge them with your existing tunnel (see the *Cloudflare Tunnel* module) —
add a hostname route **above** the wildcard, then restart cloudflared:

```yaml
# ~/.cloudflared/config.yml
ingress:
  - hostname: deploy.yourdomain.com
    service: http://localhost:9000
  - hostname: "*.yourdomain.com"
    service: http://localhost:80
  - service: http_status:404
```

```bash
sudo systemctl restart cloudflared        # config.yml is not hot-reloaded
```

**4. Wire the Azure DevOps Service Hook**

Azure DevOps → **Project Settings → Service Hooks → +** → **Web Hooks** →
trigger **Code pushed** (filter to your branch) → URL:

```
https://deploy.yourdomain.com/hooks/bgapi-deploy
```

Use the same HMAC secret you put in `webhook.conf`. Now `git push` triggers a
rebuild and rolling restart within seconds — no port opened on your router,
authenticated end-to-end through the tunnel.

> Lock it down further with a **Cloudflare Access** policy on
> `deploy.yourdomain.com` (same pattern as the TCP/SSH module). The systemd
> polling timer (§8.1) remains a fine fallback if the tunnel is ever down — use
> the timer **or** the webhook, not both.

---

## 9. PostgreSQL migration path — already started

The migration off Azure SQL Edge is **underway, one bounded context at a time**.
The **ScroogeCorp** context already runs on PostgreSQL (`postgres.yaml` +
`ScroogeCorpDbContext` via Npgsql) — its own database, own migration history,
zero coupling to the SQL Server schema. This is the low-risk way to migrate a
large app: move new/isolated contexts first, leave the rest on SQL Server until
each is ready.

To move a **further** context (e.g. the main `BGAPIDbContext`) later:

1. It already has a Postgres server to target (`postgres.yaml`) — add a database
   or reuse `scroogecorp`'s server.
2. Swap that context's `UseSqlServer(...)` for `UseNpgsql(...)` and regenerate
   its migrations against Postgres (they're provider-specific).
3. Convert the raw `.sql` seed scripts in `Docs/sql/` to PostgreSQL dialect
   (`GO` → `;`, `NVARCHAR` → `VARCHAR`, `datetime2` → `timestamptz`, etc.) — or
   fold that seed data into EF migrations/seeding.
4. Update the connection string(s) in `bgapi.yaml`.

The remaining SQL-Server-only pieces are the legacy `*ServiceManager` singletons
(Geography/TechCorp) that read via `sqlcmd`/raw ADO — migrate those last.
