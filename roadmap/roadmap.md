# k3s-pi5 — The Path We Walked

> A roadmap, not a brochure. This folder documents the route from a bare laptop to a
> production-shaped homelab — every stop self-built, on hardware we own, with free and
> open-source tools. No paid courses, no exam fees gating progress, no "buy your way to
> the next level." The walking *is* the portfolio.

---

## What this is

The [live site](https://baiganio.github.io/k3s-pi5/) is a self-paced DevOps curriculum: a
progressive command reference where each module carries the raw command, a breakdown of every
flag, the expected output, and a "why." This `roadmap/` folder is the **map behind the
curriculum** — the order we walked the stops in, what each one proved, and what's still ahead.

The through-line is the reference architecture in the [README](../README.md): a three-service
**Rick and Morty** app — a Node.js frontend (**Morty**, what users see), a .NET API
(**Rick**, who does the heavy lifting and talks to the outside world), and PostgreSQL (**the
garage**, where everything's stored between adventures). That same app is what we carry through
every layer: it starts on VMs, gets containerized, lands on Kubernetes, picks up a CI/CD
pipeline, gets watched by monitoring, and finally reaches into the cloud. One app, many portals.

---

## The rules of the road

These are non-negotiable and shape every decision in the phases below:

- **Self-built.** If a managed service would hide the mechanism, we run the thing ourselves at
  least once. The point is to understand the gears, not to rent them.
- **Free / free-tier only.** Open-source tools, the hardware already on the desk, and cloud
  free tiers with cost warnings written in. No exam fees, no paid mocks, no subscriptions to
  reach the next stop.
- **Own the hardware.** A MacBook M1, a Raspberry Pi 5, and an aging ASUS laptop. ARM64 is the
  primary target; everything has to actually run on a Pi.
- **Document the path.** Every stop becomes a module with commands, output, and reasoning.
  Building it and writing it up are the same act.
- **Certs are optional, and they come last.** A credential like the CKA can validate the work
  *if and when* we want one — but it's never a gate, never a deliverable, and never something the
  budget has to absorb to keep moving. The built stack is the proof.

---

## Who's walking it

- **Lyuben Kikov** (GitHub: [BaiGanio](https://github.com/BaiGanio)) — 12+ years of software
  engineering: .NET (C#, ASP.NET Core), Angular, SQL Server / MongoDB, Azure, Docker, CI/CD.
- **Goal:** grow from software developer into a DevOps / Platform / SRE role — by building, in
  public, end to end.
- **Constraint that defines everything:** studying full-time, funding it personally. So the
  whole plan is engineered to cost ~nothing beyond electricity and the hardware already owned.

---

## The hardware

| Machine | Role on the path |
|---|---|
| MacBook M1 (32GB) | Dev workstation — `kubectl`, code, Vagrant, image builds, control access |
| Raspberry Pi 5 (8GB + SSD) | The star of the show — k3s server node and core services |
| ASUS X540S (4GB + HDD) | Second node — worker, build agent, bulk storage, optional ops kiosk |

See [homelab-guide.md](./homelab-guide.md) for the full hardware-roles breakdown and the
optional extras (object storage, a live ops screen).

---

## The map — six stops, four phases

The curriculum is organized into six groups on the site. The roadmap bundles them into four
phases, each a coherent act in the same story: walk the Rick & Morty app one layer deeper.

| Phase | The story | Curriculum groups | Status |
|---|---|---|---|
| **[Phase 1 — Foundations](./phase-1-foundations.md)** | Before Kubernetes. Stand the app up on real VMs, provision them with Ansible, then containerize it. | Virtual Machines & Provisioning (Vagrant + Ansible) · Containers (Docker) | ✅ Built |
| **[Phase 2 — Orchestration](./phase-2-orchestration.md)** | The app leaves the single host and lands on a cluster: k3s on the Pi 5. | Orchestration (k3s) | ✅ Built |
| **[Phase 3 — Delivery & Eyes-On](./phase-3-delivery-monitoring.md)** | Stop deploying by hand and stop flying blind: a Jenkins pipeline ships it, Nagios watches it. | CI/CD (Jenkins) · Monitoring (Nagios) | ✅ Built |
| **[Phase 4 — Reach & Capstone](./phase-4-capstone-cloud.md)** | Reach into the cloud on the free tier, then tie the whole journey together as the capstone. | Cloud (AWS) · Capstone | 🔭 In progress |

Each module on the site also ships an **exam**, **homework**, and **practice lab** — the path
isn't read, it's walked and tested.

---

## Current state of the curriculum

Mirrors the live module registry (`lib/registry.js`). This table is the source of truth for
"what exists" — keep it honest.

| Group | What's covered today |
|---|---|
| **Virtual Machines & Provisioning** 🛠️ | DevOps intro, Vagrant on Parallels and VMware (Apple Silicon, two-VM labs), a Docker-VM practice lab, an M1 exam — then Ansible: intro, inventory/vars, ad-hoc & modules, playbooks for ASP.NET Core *and* Node.js, roles/templates/Galaxy, a WEB+DB homework. |
| **Containers (Docker)** 🐳 | Docker on the Pi 5, advanced Docker, nerdctl, Docker Compose with .NET, Docker Swarm with .NET, image-build practice, an M2 exam, homework. |
| **Orchestration (k3s)** ☸️ | k3s on the Pi 5, Cloudflare Tunnel, Kubernetes Dashboard, Traefik/Nginx ingress, persistent storage, sample apps (Node + Postgres), quick reference, security notes, verification, troubleshooting. |
| **CI/CD (Jenkins)** 🔄 | Jenkins intro, setup, jobs, pipelines, agents/slaves, Jenkins-in-Docker, homework — building/testing/containerizing/deploying .NET and Node.js apps backed by Postgres, on dedicated Vagrant VMs. |
| **Monitoring (Nagios)** 📡 | Nagios Core intro, setup, config, remote checks, advanced, homework — watching the .NET / Node APIs, Postgres, and containers; alerting before users notice. |
| **Cloud (AWS)** ☁️ | EC2, IAM + CLI, Vagrant cloud provisioning, ECS containers, intro and homework — free-tier compatible, cost warnings throughout. Azure / GCP can be layered on later. |

---

## What's still ahead (honest backlog)

Not yet built — candidates for future stops, all achievable free/free-tier on the hardware owned:

| Topic | Why it's worth a stop |
|---|---|
| Helm packaging | Standard k8s packaging; would tidy the k3s deployments |
| cert-manager + Let's Encrypt | Real TLS on the cluster, free certs |
| GitOps (ArgoCD or Flux) | The reconcile-from-Git discipline; in-demand and open-source |
| Prometheus + Grafana + Loki | A metrics/logs stack to sit alongside (or replace) Nagios |
| Multi-node hardening | Already have two nodes — push on affinity, taints, NetworkPolicy |
| Sealed Secrets / SOPS | Get secrets out of base64 and into Git safely |
| Terraform | IaC for the AWS free-tier pieces and Azure later |

This list earns its place by being *real and free*. Anything that needs a paid exam, a paid
SaaS tier, or hardware we don't own is out of scope by the rules above.

---

*Last updated: 2026-06-05 · Project: k3s-pi5 · [Live site](https://baiganio.github.io/k3s-pi5/) · [Repo](https://github.com/BaiGanio/k3s-pi5)*
