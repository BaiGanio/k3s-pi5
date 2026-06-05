# Phase 2 — Orchestration (k3s on the Pi)

**Theme:** Take the containerized Rick & Morty app off the single Docker host and onto a real
Kubernetes cluster — k3s, on the Raspberry Pi 5. This is the heart of the whole project: the
VM concepts from Phase 1 map onto Kubernetes resources, and the app becomes self-healing,
service-discovered, and publicly reachable — all on an ARM64 board on your desk, for free.

**The story:** Rick stops running the portal gun by hand. The three services that were `docker
compose up` in Phase 1 become a `Deployment` (Morty, the frontend), a `Deployment` (Rick, the
.NET API), and a `StatefulSet` with a PVC (the garage — Postgres needs stable identity and
persistent storage). Traefik routes traffic; a Cloudflare Tunnel opens a public door without a
static IP or an open port on your router.

**Why it comes second:** Phase 1 proved you can run the app. Phase 2 proves you can run it the
way the industry actually runs things — declared as resources, scheduled by a control plane,
healed automatically.

---

## What this phase proves

- ✅ k3s running on the Pi 5 (ARM64), `kubectl` access from the MacBook
- ✅ The Rick & Morty stack as native k8s resources: Deployments, Services, Ingress, a Postgres StatefulSet + PVC
- ✅ Public HTTPS to the cluster via a free Cloudflare Tunnel — no static IP, no port-forwarding
- ✅ Config and secrets handled the k8s way (ConfigMaps + Secrets), persistent storage that survives pod restarts
- ✅ A cluster you can diagnose: verification checks, security notes, and a troubleshooting playbook

Spend: €0. Cloudflare Tunnel is free; the Pi and SSD are already owned.

---

## The VM → Kubernetes mapping

This is the single most important idea in the project. Everything from Phase 1 has a home here:

| Phase 1 concept | Kubernetes resource | Why |
|---|---|---|
| Frontend VM (Morty / Node.js) | `Deployment` + `Service` + `Ingress` | Stateless; scale replicas horizontally |
| API VM (Rick / .NET) | `Deployment` + `Service` + `Ingress` | Stateless API behind Traefik |
| Database VM (the garage / Postgres) | `StatefulSet` + `Service` + `PVC` | Stateful — needs stable identity and persistent SSD storage |
| Manual `dotnet run` / `npm start` | `Deployment` with an `image:` | The scheduler keeps it alive |
| Vagrant private network + fixed IPs | `Service` (ClusterIP) + cluster DNS | Service discovery by name replaces hand-wired IPs |
| `pg_hba.conf` IP allow-list | `NetworkPolicy` | Restrict who can reach Postgres |

---

## Stop 1 — Stand up the cluster

### The walk
Pre-flight the Pi (cgroups v2, SSD as the data disk), install k3s with one command, pull the
kubeconfig back to the MacBook, and confirm the node is `Ready`. k3s ships Traefik and a local
storage provisioner out of the box, so a working cluster is minutes away — but you'll learn
what each built-in piece is doing.

### Modules
- `m3-k3s-pi5` — pre-flight, install, kubectl access, cgroups v2.
- `m3-verification` — cluster health checks and diagnostics.
- `m3-quick-reference` — the daily `kubectl` cheatsheet you'll actually use.

### Milestones
1. `kubectl get nodes` from the MacBook shows the Pi as `Ready`.
2. `kubectl get pods -A` is all `Running` — no `Pending`, no `CrashLoopBackOff`.

---

## Stop 2 — Run the Rick & Morty app on the cluster

### The walk
Deploy the three services as real resources. Postgres gets persistent storage so the garage
survives a pod restart. The frontend reaches the API by Service name; the API reaches Postgres
by Service name. Config comes from a ConfigMap, the DB password from a Secret.

### Modules
- `m3-sample-apps` — Nginx smoke test, then the Node + Postgres app with the ConfigMap + Secret pattern.
- `m3-persistent-storage` — StorageClass, PV, PVC for stateful workloads on the Pi's SSD.
- `m3-nginx-ingress` — Traefik/ingress routing to the services.

### Milestones
1. The Postgres pod is `Running`, its PVC is `Bound`; delete the pod and the data is still there.
2. The frontend pod reaches the API at `http://dotnet-api:8080` — by name, not IP.
3. Hitting the Ingress host serves the frontend; `/api/*` reaches the .NET service.

---

## Stop 3 — Open a public door (safely)

### The walk
Expose the cluster to the internet without touching your router's firewall. A Cloudflare Tunnel
runs as a pod, dials *out* to Cloudflare, and routes public HTTPS back to Traefik. Add the
Kubernetes Dashboard (with a proper RBAC ServiceAccount + token) for a UI, and write down the
security and recovery basics.

### Modules
- `m3-cloudflare-tunnel-pi5` — public exposure with no static IP.
- `m3-k3s-dashboard` — Dashboard with RBAC ServiceAccount + token auth.
- `m3-security` — secret rotation, token regen, k3s updates, PV backup.
- `m3-troubleshooting` — stuck pods, `ImagePullBackOff`, `CrashLoopBackOff`, PVC pending, cgroup issues, DNS, OOMKilled.

### Milestones
1. From your phone on cellular (not WiFi), the public URL serves the app over valid HTTPS.
2. The Dashboard loads and you log in with the ServiceAccount token — no `kubectl proxy` needed.
3. You can walk the troubleshooting module from memory when a pod misbehaves.

### Potholes
- **k3s already ships Traefik** — don't install a second ingress controller on top of it.
- **flannel (k3s default CNI) doesn't enforce NetworkPolicy** — note this now; it matters if you
  later want real network isolation (a future stop, see below).
- **SD card vs SSD** — etcd and PVs belong on the SSD; the SD card will corrupt under that load.

---

## Optional future stops (free, not yet built)

These are real, open-source, and Pi-friendly — candidates for later, **not assumed done**:

- **GitOps (ArgoCD or Flux)** — reconcile the cluster from a Git repo instead of `kubectl apply`.
  Open-source, runs on the Pi. The discipline shift is worth a whole stop when you're ready.
- **Helm** — package the Rick & Morty manifests as a chart for clean upgrades/rollbacks.
- **cert-manager + Let's Encrypt** — free TLS certs issued automatically.
- **Second node** — bring the ASUS X540S in as a k3s agent for scheduling, affinity, and drain drills.

When one of these gets built and documented as a module, promote it out of this list and into a
stop above.

---

## Phase 2 Retrospective

- [ ] The Rick & Morty app runs entirely on k3s on the Pi, reachable publicly over HTTPS.
- [ ] You can recite the VM → Kubernetes mapping table without looking.
- [ ] Persistent storage survives pod restarts; secrets aren't plaintext in any manifest.
- [ ] Every k3s-group module is `ready: true`; the three previously-flagged bugs are fixed.

---

[← Phase 1](./phase-1-foundations.md) · [Phase 3 — Delivery & Eyes-On →](./phase-3-delivery-monitoring.md)
