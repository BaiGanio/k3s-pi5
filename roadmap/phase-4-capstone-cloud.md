# Phase 4 — Reach & Capstone

**Theme:** Reach off the homelab and into the cloud — on the free tier, with cost warnings
written into every step — then tie the whole journey together. The reach is AWS: EC2, IAM,
the CLI, Vagrant cloud provisioning, and ECS. The capstone isn't a paid exam or a job-hunt
sprint; it's the realization that you built the entire stack yourself, end to end, and can walk
anyone through every decision in it. That story is the portfolio.

**The story:** Rick finally opens a portal off-world — to AWS — but he's careful: free-tier
boxes, IAM locked down, the billing alarm armed. He doesn't bet the garage on a cloud invoice.
And when the adventure's done, the proof of who he's become isn't a certificate on the wall —
it's the working machine he can demonstrate, top to bottom, on his own desk.

**Why it comes last:** Cloud makes sense *after* you've run the primitives yourself. Having
built VMs, containers, a cluster, a pipeline, and monitoring by hand, you reach for AWS knowing
exactly what it's abstracting — and exactly what it costs.

---

## What this phase proves

- ✅ AWS basics done safely and free: EC2, IAM + CLI, Vagrant cloud provisioning, ECS containers
- ✅ A billing alarm and cost discipline baked in from the first command
- ✅ The full Rick & Morty reference architecture realized across the homelab — and explainable end to end
- ✅ A capstone you can demo live: "I built every layer of this myself, for free, on hardware I own"
- ✅ Certs framed honestly — optional, later, never a gate

Spend: €0 if you stay inside the AWS free tier and tear resources down. The cost warnings in the
modules exist precisely so this stays true.

---

## Stop 1 — Cloud reach (AWS, free tier)

### The walk
Extend the journey to a public cloud without leaving the rules of the road. Stand up an EC2
instance, lock down access with IAM and the AWS CLI, provision cloud machines with Vagrant (the
same Vagrant muscle from Phase 1, now pointed at the cloud), and run containers on ECS. The
point isn't to live in AWS — it's to understand how the on-prem patterns you built map to a
managed cloud, and to do it for free.

### Modules
- `aws-intro` — the lay of the land; free-tier scope and the cost warnings that follow you through.
- `aws-ec2` — launch, connect to, and tear down a free-tier EC2 instance.
- `aws-iam-cli` — identities, least-privilege policies, and driving AWS from the CLI.
- `aws-vagrant` — provision cloud machines with Vagrant.
- `aws-ecs` — run your containers on a managed container service.
- `aws-homework` — put it together; then **destroy everything** and confirm the bill is €0.

### Milestones
1. A billing alarm exists *before* you launch anything — you'll get warned long before a surprise charge.
2. You can launch, use, and fully tear down an EC2 instance, and IAM keeps the blast radius small.
3. After `aws-homework`, the AWS console shows no running resources and the cost explorer shows €0.

### Potholes
- **Free tier has edges** — some services bill the moment you exceed a quota. The modules call these
  out; respect them, and always tear down.
- **Never commit AWS keys** — IAM users with scoped policies and short-lived credentials, never root keys in a repo.
- **"I'll delete it later" is how bills happen** — destroy resources in the same session you create them.

### Why on-prem first, cloud second
Everything here has a homelab twin you already built: EC2 ↔ your Vagrant VMs, ECS ↔ your Docker/k3s
workloads, IAM ↔ k8s RBAC, the AWS CLI ↔ `kubectl`. You're not learning the cloud cold — you're
mapping skills you earned for free onto a paid platform, and you can articulate the trade-offs in
both directions. (Azure and GCP can be layered on the same way later, if and when you want them.)

---

## Stop 2 — The Capstone: the path, made whole

The capstone is not a new tool. It's the act of standing back and proving the whole machine is
*one coherent thing you built yourself*.

### What "done" looks like
- [ ] **The reference architecture, realized.** The Rick & Morty three-service app (Morty/Node,
      Rick/.NET, the garage/Postgres) demonstrably runs across the stack you built: on VMs, in
      Docker, on k3s — shipped by Jenkins, watched by Nagios, with a documented cloud reach. See
      the [README](../README.md) for the architecture it's tracing.
- [ ] **The curriculum is the portfolio.** The live site, with every group complete — exams,
      homework, practice labs included — *is* the deliverable. It's a living DevOps textbook you
      authored by building.
- [ ] **A decision log.** A short write-up per phase: what you chose, what you rejected, and why
      (Jenkins over a managed runner; Nagios first; Cloudflare Tunnel over port-forwarding; free
      tier over spend). The "why" is what a senior engineer actually wants to hear.
- [ ] **A walkthrough you can give live.** You can screen-share the running stack and narrate it
      from VM to cloud without notes. That demo outranks most junior portfolios on its own.

### Milestones
1. You can take a stranger from `git clone` to a running piece of the stack using only your docs.
2. You can explain any layer — and the choice behind it — out loud, in five minutes, from memory.
3. The site shows every curriculum group complete; nothing's a broken placeholder.

---

## On certifications (optional, and last)

A credential like the **CKA** can validate the cluster work — *if and when* you decide you want
one. It is deliberately **not** part of this phase's definition of done:

- It's a **paid exam**, which collides with the free/self-built rule. Plan for it as a future,
  separately-budgeted choice — never a gate that blocks progress.
- The homelab maps closely to the CKA domains, so the built work *is* the study material. If you
  book it someday, you'll prep against the cluster you already run, not a course you paid for.
- Until then: the working, self-built, fully-documented stack is the proof. Certs decorate it;
  they don't replace it.

CKAD, CKS, Terraform Associate, and the rest sit in the same bucket — optional decorations for
later, listed here only so the choice is conscious, not assumed.

---

## Phase 4 Retrospective

- [ ] You reached AWS on the free tier, did real work, tore it all down, and the bill is €0.
- [ ] The full Rick & Morty reference architecture runs across your stack and you can demo it live.
- [ ] A decision log exists; you can defend every major choice you made on the path.
- [ ] Every curriculum group is complete on the site — VMs, Docker, k3s, Jenkins, Nagios, AWS.
- [ ] You treated certs as optional and free progress as mandatory — and stuck to it.

---

## After the path

The roadmap ends; the homelab doesn't. Natural continuations — all free, all on the hardware you
own — live in the backlog at the bottom of the [roadmap](./roadmap.md): GitOps with ArgoCD/Flux,
Helm packaging, cert-manager TLS, a Prometheus/Grafana/Loki stack alongside Nagios, a real
second node, Terraform for the cloud pieces. Pick the next stop when it interests you, build it,
document it, and the path grows one module longer.

The whole point, start to finish: **built on your own hardware, owned end to end, for free.**

---

[← Phase 3](./phase-3-delivery-monitoring.md) · [Back to Roadmap](./roadmap.md)
