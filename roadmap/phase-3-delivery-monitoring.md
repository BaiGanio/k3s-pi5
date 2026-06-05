# Phase 3 — Delivery & Eyes-On

**Theme:** Two habits separate someone who *can use* a cluster from someone who *operates* one:
they stop deploying by hand, and they stop flying blind. This phase builds both — a Jenkins
pipeline that builds, tests, containerizes, and ships the Rick & Morty app, and Nagios Core
watching every piece of it so you know things broke before your users do. Both self-hosted,
both free, both on hardware you own.

**The story:** Rick automates the portal gun assembly line (Jenkins) so he never has to hand-crank
a build again — and then he wires up the garage alarm system (Nagios) so that when Morty trips
over a power cable, a notification fires before the whole adventure falls apart.

**Why it comes here:** You've got a deployable, cluster-hosted app from Phases 1–2. Now make the
delivery repeatable and the operation observable — that's the actual day job of a DevOps/SRE.

---

## What this phase proves

- ✅ A self-hosted Jenkins controller + agents running on dedicated Vagrant VMs
- ✅ Pipelines that build, test, containerize, and deploy both the .NET API and the Node.js frontend, backed by Postgres
- ✅ Nagios Core monitoring the running stack: APIs, Postgres, containers, hosts
- ✅ Alerts that fire on real failure conditions — caught before users notice
- ✅ Both stops captured as site modules with commands, output, "why," plus homework

Spend: €0. Jenkins and Nagios are open-source; the VMs run on hardware already owned.

---

## Stop 1 — CI/CD with Jenkins

### The walk
Run your own CI/CD instead of renting a managed one — the fastest way to actually understand
what managed pipelines do under the hood. Jenkins runs as a controller with agents on dedicated
Vagrant VMs (the same Vagrant skills from Phase 1, now in service of the build farm). Pipelines
are code: `Jenkinsfile` stages that restore, build, test, build a Docker image, and deploy the
Rick & Morty services.

### Modules
- `jenkins-intro` — what Jenkins is and where it fits versus Azure DevOps / GitHub Actions.
- `jenkins-setup` — install and bootstrap the controller.
- `jenkins-jobs` — freestyle jobs first, to see the moving parts.
- `jenkins-pipelines` — pipeline-as-code: stages, agents, `Jenkinsfile`, build/test/deploy for .NET and Node.
- `jenkins-slaves` — distributed builds across agent VMs.
- `jenkins-docker` — Jenkins in Docker, and building Docker images from pipelines.
- `homework` — wire an end-to-end pipeline for the app stack.

### Milestones
1. A push triggers a pipeline that restores, builds, and tests the .NET API automatically.
2. The pipeline builds a container image and deploys the updated service — no manual `docker`/`kubectl`.
3. A failing test turns the build red and stops the deploy — the gate actually gates.

### Potholes
- **Agent capacity** — the ASUS (4GB) is a fine agent for light builds; keep the heavy steps off it
  or stagger them. Match the build farm to the hardware you actually have.
- **Credentials** — use Jenkins' credential store, never plaintext tokens in a `Jenkinsfile`.
- **Don't reinvent the cluster's job** — Jenkins builds and hands off; let k3s run the workload.

---

## Stop 2 — Monitoring with Nagios

### The walk
You can't operate what you can't see. Nagios Core watches the hosts, the .NET / Node APIs, the
Postgres database, and the Docker containers — and pages you when a check goes critical. Start
local, then add remote checks (NRPE) so the monitoring host can see inside the other machines.
This is the "eyes-on" half of operations: thresholds, states, notifications, and the discipline
of deciding what's actually worth waking up for.

### Modules
- `nagios-intro` — monitoring concepts: hosts, services, states, checks, notifications.
- `nagios-setup` — install and stand up Nagios Core.
- `nagios-config` — define hosts and services; thresholds and contacts.
- `nagios-remote` — NRPE remote checks across the other machines.
- `nagios-advanced` — event handlers, escalations, tuning the noise out.
- `homework` — build a monitoring config for the full Rick & Morty stack.

### Milestones
1. Nagios shows the API, the database, and the host as `OK` in steady state.
2. Stop the Postgres container → within the check interval Nagios flips it `CRITICAL` and notifies.
3. You've tuned thresholds so a normal load spike doesn't page you — only real trouble does.

### Potholes
- **Alert fatigue is failure** — a dashboard that cries wolf gets ignored. Tune until alerts mean something.
- **Monitor the right thing** — watch user-facing symptoms (API returns 500s) more than internal noise (one pod restarted and recovered).
- **The monitor needs to outlive what it monitors** — run Nagios where it won't die with the thing it's watching.

---

## A note on the bigger observability picture

Nagios gives you check-based monitoring and alerting — genuinely useful, and a real resume skill
for on-prem/enterprise shops. The metrics-and-dashboards world (Prometheus + Grafana + Loki) is
a complementary, also-free stack that's a natural *future* stop: PromQL queries, time-series
dashboards, log aggregation. It isn't built yet, so it lives in the backlog — not assumed done.
When it's built and documented, it earns its own stop here.

---

## Phase 3 Retrospective

- [ ] A code push results in a built, tested, deployed Rick & Morty service with zero manual steps.
- [ ] Nagios catches a deliberately broken service and notifies you before you'd have noticed by hand.
- [ ] You can answer "how would you know production broke?" with a real demo from your own setup.
- [ ] Every Jenkins and Nagios module is `ready: true` with its homework intact.

---

[← Phase 2](./phase-2-orchestration.md) · [Phase 4 — Reach & Capstone →](./phase-4-capstone-cloud.md)
