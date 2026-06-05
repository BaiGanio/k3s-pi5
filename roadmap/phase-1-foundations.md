# Phase 1 — Foundations (Before Kubernetes)

**Theme:** Stand the Rick & Morty app up the old-fashioned way — on real Linux VMs — provision
those VMs with Ansible instead of clicking around, then containerize the whole thing with
Docker. By the end of this phase you understand the "before containers" baseline *and* the
container baseline, which is exactly the ground Kubernetes is built on.

**The story:** Rick (the .NET API) and Morty (the Node.js frontend) start their adventure in
the garage — three services on three VMs, wired together by hand, then by Ansible, then sealed
into containers. Same app, same data flow, three different ways to run it. Walking it at this
altitude is what makes the cluster make sense later.

**Why it comes first:** Everything after this — k3s, CI/CD, monitoring — is automation *on top
of* these primitives. Skip the VMs and Docker and you're memorizing `kubectl` without knowing
what it's orchestrating.

---

## What this phase proves

- ✅ Real Linux VMs spun up from a `Vagrantfile` on Apple Silicon (Parallels and VMware), reproducibly
- ✅ Those VMs provisioned by Ansible — packages, the app, a `systemd` service — agentless, idempotent, nothing left behind
- ✅ The same ASP.NET Core *and* Node.js apps deployed via playbooks, backed by PostgreSQL
- ✅ The app re-packaged as Docker containers on the Pi 5 (ARM64), then orchestrated locally with Compose and Swarm
- ✅ Every stop captured as a site module with commands, output, "why," plus an exam and homework

All of it on hardware already owned. Total spend: €0.

---

## Stop 1 — Virtual Machines & Provisioning (Vagrant)

### The walk
Build the first DevOps lab on the laptop itself. Vagrant + a hypervisor (Parallels Desktop Pro
or VMware Fusion) spin up real ARM64 Ubuntu VMs from a single file. This is the "manual deploy"
baseline: a Node.js web app and a database stood up by hand on VMs (the DOB-WEB / DOB-DB
pattern), so you feel the toil that every later tool exists to remove.

### Modules that cover it
- `intro-devops-intro` — what DevOps is, and the manual VM deploy baseline.
- `intro-vagrant-parallels` / `intro-vagrant-vmware` — two-VM labs on Apple Silicon, two hypervisors.
- `intro-practice-vagrant-docker` — a hands-on lab: provision a Vagrant VM and install Docker on it.
- `intro-exam` — author a Vagrantfile, drive the VM lifecycle, multi-machine provisioning.

### Hands-on milestones
1. `vagrant up` brings two ARM64 VMs to life; `vagrant ssh` into each works.
2. The Node app on one VM talks to the database on the other over the private network.
3. `vagrant destroy && vagrant up` rebuilds the whole lab from scratch — reproducibility proven.

### Potholes
- **ARM64 box availability** — pick boxes that publish `arm64` artifacts; not every public box does.
- **Hypervisor licensing** — Parallels Pro is paid; VMware Fusion is free for personal use. The
  modules cover both so you're never forced into a purchase.

---

## Stop 2 — Configuration Management (Ansible)

### The walk
Stop hand-typing setup steps. Ansible drives those same VMs over SSH — agentless, idempotent,
declarative-ish. This is where "I provisioned a server" becomes "I can rebuild any server, the
same way, every time." Crucially, the playbooks deploy the *real* apps: ASP.NET Core on CentOS
and Node.js/Express on Ubuntu, each as a managed `systemd` service, each backed by PostgreSQL.

### Modules that cover it
- `ansible-intro` — architecture, components, install (still operating on the Phase 1 VMs).
- `ansible-inventory-config` — inventories, groups, `group_vars`/`host_vars` precedence, `ansible.cfg`.
- `ansible-adhoc-modules` — `command` vs `shell`, the `script` module, `ansible-doc`, package/service modules.
- `ansible-playbooks-dotnet` — publish & copy a .NET 8 app, wire a `systemd` unit, syntax-check, retry files.
- `ansible-playbooks-nodejs` — NodeSource, `npm ci`, `systemd`, tags for fast partial deploys.
- `ansible-roles-templates` — role structure, `ansible-galaxy`, Jinja2 templates, `when`/facts, handlers.
- `ansible-practice-lab` — the authentic DOB file-for-file lab: Vagrant fleet, ad-hoc → inventory → playbooks → roles (Apache + MariaDB), with a WinRM finale.
- `ansible-homework` — the capstone of this stop: a two-host heterogeneous deploy (.NET *and* Node + Postgres) using roles, facts, and idempotence.

### Hands-on milestones
1. `ansible -m ping all` is green across every VM in the inventory.
2. One `ansible-playbook` run takes a blank VM to a running, `systemd`-managed app.
3. Re-running the same playbook changes nothing (idempotence) — the second run reports `changed=0`.

### Potholes
- **Idempotence is the whole point** — if a re-run keeps reporting changes, a task is wrong. Prefer
  modules over `shell`/`command`; reach for `creates=`/`changed_when` when you can't.
- **Secrets** — Postgres passwords go in `ansible-vault` or environment, never plaintext in the repo.

---

## Stop 3 — Containers (Docker)

### The walk
Now seal the app into containers. Docker on the Raspberry Pi 5 (ARM64) takes you from a fresh
OS to a first running container, then up through images, networks, volumes, and multi-service
orchestration. The Rick & Morty stack gets a `docker-compose.yml` so all three services come up
with one command — the same idea that Kubernetes will generalize in Phase 2.

### Modules that cover it
- `m2-docker-intro` — Docker on the Pi 5: install to first container.
- `m2-advanced-docker` — custom networks, volumes, container linking, registries.
- `m2-nerdctl-intro` — a Docker-compatible CLI over containerd (the runtime k3s uses).
- `m2-docker-compose-dotnet` — the multi-service .NET + Postgres stack, one command up.
- `m2-docker-swarm-dotnet` — a first taste of orchestration before the real thing.
- `m2-practice-docker-images` — hands-on image building.
- `m2-exam` / homework — prove it.

### Hands-on milestones
1. `docker compose up -d` brings the frontend, the .NET API, and Postgres up together on the Pi.
2. The frontend reaches the API by service name (`http://dotnet-api:8080`), not an IP — DNS-by-name, the container way.
3. An image you built runs natively on ARM64 — no emulation, no surprises.

### Potholes
- **ARM64 base images** — pin `linux/arm64` (or multi-arch) tags so images actually run on the Pi.
- **Don't bake secrets into images** — pass them as environment/`.env` at run time.
- **SD cards lie** — put Docker's data root on the SSD, not the SD card, or you'll fight corruption.

---

## Phase 1 Retrospective

Before walking on to the cluster, confirm:

- [ ] You can rebuild the entire VM lab from a `Vagrantfile` and an Ansible run, from zero, hands-off.
- [ ] The Rick & Morty app runs three ways now: by-hand on VMs, Ansible-provisioned, and in Docker — and you can explain the trade-offs of each out loud.
- [ ] Every module in groups intro, Ansible, and M2 is `ready: true` with its exam/homework intact.
- [ ] Nothing in this phase cost money beyond the hardware already on the desk.

If any box is unchecked, stay at this altitude another few evenings rather than carrying gaps
into the cluster.

---

[← Roadmap](./roadmap.md) · [Phase 2 — Orchestration →](./phase-2-orchestration.md)
