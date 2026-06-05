// modules/registry.js
// ─────────────────────────────────────────────────────────────────────────────
// THE ONLY FILE YOU EDIT when adding a new module.
//
// To add a module:
//   1. Drop its data file into the modules/ folder.
//   2. Add one entry to the correct group below (or create a new group).
//   3. Done — the sidebar and routing update automatically.
//
// Per-group fields:
//   group                  — the group name; self-describing (the technology / layer)
//   icon                   — emoji shown beside the group
//   blurb                  — ONE line: WHERE this group runs (host / VM / container / cluster).
//                            Rendered under the group label so users never have to guess.
//
// Per-module fields:
//   title / subtitle       — shown in the main content header
//   sidebarTitle           — overrides title in the sidebar (optional)
//   sidebarSubtitle        — overrides subtitle in the sidebar (optional)
//   context                — short "where it runs" tag for THIS module (e.g. "host → VM",
//                            "k3s cluster"). Shown as a chip on the card and in the sidebar.
//   Both sidebar fields fall back to title/subtitle when omitted.
// ─────────────────────────────────────────────────────────────────────────────

const MODULE_REGISTRY = [
  {
    group: "Virtual Machines & Provisioning",
    icon: "🛠️",
    blurb: "Build your first DevOps lab on your own laptop: Vagrant + a hypervisor spin up real Linux VMs, then Ansible provisions them — installing packages, deploying apps and managing services over SSH (agentless, nothing left behind on the VMs). The foundation everything later runs on.",
    modules: [
      {
        id: "m1-devops-intro",
        title: "Introduction to DevOps",
        subtitle: "VirtualBox · Vagrant · Manual deploy",
        context: "host → VM",
        script: "modules/m1/devops-intro.js",
        ready: true,
      },
      {
        id: "m1-vagrant-parallels",
        title: "Vagrant + Parallels on M1 Pro",
        subtitle: "Apple Silicon · 32GB RAM · 16 GPU / 10 CPU cores · 1TB SSD · Parallels Desktop Pro",
        sidebarSubtitle: " Two-VM setup on Apple Silicon",
        context: "host → 2 VMs",
        script: "modules/m1/vagrant-parallels.js",
        ready: true,
      },
      {
        id: "m1-vagrant-vmware",
        title: "Vagrant + VMware Fusion on M1 Pro",
        subtitle: "Apple Silicon · 32GB RAM · 16 GPU / 10 CPU cores · 1TB SSD · VMware Fusion",
        sidebarSubtitle: "Two-VM setup on Apple Silicon",
        context: "host → 2 VMs",
        script: "modules/m1/vagrant-vmware.js",
        ready: true,
      },
      {
        id: "m1-practice-vagrant-docker",
        title: "Practice: Provision a Docker VM",
        subtitle: "Hands-on lab · Vagrant + Parallels · ARM64 Ubuntu · install & verify Docker",
        sidebarSubtitle: "Hands-on: a Vagrant Docker host",
        context: "host → VM",
        script: "modules/m1/practice-vagrant-docker.js",
        ready: true,
        practice: true,
      },
      {
        id: "m1-exam",
        title: "Exam: Introduction to DevOps & Vagrant",
        subtitle: "M1 exam · Vagrant + Parallels · author a Vagrantfile · VM lifecycle · provisioning · multi-machine",
        sidebarTitle: "Exam — DevOps & Vagrant",
        sidebarSubtitle: "M1 exam walkthrough",
        context: "host → VM",
        script: "modules/m1/exam-m1.js",
        ready: true,
        practice: true,
      },
      // ── Configuration management with Ansible — still operating on these VMs ──
      {
        id: "m4-ansible-intro",
        title: "Introduction to Ansible",
        subtitle: "Agentless config management · architecture · components · installation",
        sidebarSubtitle: "Agentless config management",
        context: "host (control node)",
        script: "modules/m4/ansible-intro.js",
        ready: true,
      },
      {
        id: "m4-inventory-config",
        title: "Inventory & Configuration",
        subtitle: "Inventories · groups · group_vars/host_vars precedence · ansible.cfg",
        sidebarSubtitle: "Inventories, vars & ansible.cfg",
        context: "host (control node)",
        script: "modules/m4/inventory-config.js",
        ready: true,
      },
      {
        id: "m4-adhoc-modules",
        title: "Ad-hoc Commands & Modules",
        subtitle: "command vs shell · script module · ansible-doc · package & service modules",
        sidebarSubtitle: "Ad-hoc runs & core modules",
        context: "host → VMs",
        script: "modules/m4/adhoc-modules.js",
        ready: true,
      },
      {
        id: "m4-playbooks-dotnet",
        title: "Playbooks — Deploy ASP.NET Core",
        subtitle: ".NET 8 runtime · publish & copy · systemd service · syntax-check · retry files",
        sidebarSubtitle: "Playbooks with a .NET app",
        context: "host → VM (CentOS)",
        script: "modules/m4/playbooks-dotnet.js",
        ready: true,
      },
      {
        id: "m4-playbooks-nodejs",
        title: "Playbooks — Deploy Node.js / Express",
        subtitle: "NodeSource · npm ci · systemd service · tags for fast deploys",
        sidebarSubtitle: "Playbooks with a Node.js app",
        context: "host → VM (Ubuntu)",
        script: "modules/m4/playbooks-nodejs.js",
        ready: true,
      },
      {
        id: "m4-roles-templates",
        title: "Roles, Templates & Galaxy",
        subtitle: "Role structure · ansible-galaxy · Jinja2 templates · when/facts · register/debug · handlers",
        sidebarSubtitle: "Roles, Jinja2 & advanced techniques",
        context: "host → VMs",
        script: "modules/m4/roles-templates.js",
        ready: true,
      },
      {
        id: "m4-homework",
        title: "Homework M4 — WEB + DB Stack",
        subtitle: "Two-host heterogeneous deploy · ASP.NET Core / Node.js + PostgreSQL · roles · facts · idempotence",
        sidebarTitle: "Homework — WEB + DB",
        sidebarSubtitle: "Heterogeneous .NET / Node + Postgres",
        context: "host → 2 VMs",
        script: "modules/m4/homework.js",
        ready: true,
        practice: true,
      },
    ],
  },
  {
    group: "Containers (Docker)",
    icon: "🐳",
    blurb: "Docker Engine on a single host (Raspberry Pi 5, or a VM) — apps packaged as containers.",
    modules: [
      {
        id: "m2-docker-intro",
        title: "Docker on Raspberry Pi 5 (8GB)",
        subtitle: "Raspberry Pi OS installation and configuration",
        context: "Pi 5 host",
        script: "modules/m2/docker-intro.js",
        ready: true,
      },
      {
        id: "m2-advanced-docker",
        title: "Advanced Docker",
        subtitle: "docker-machine · Networking · Volumes · Compose · Swarm (Node.js stack)",
        context: "Docker host",
        script: "modules/m2/advanced-docker.js",
        ready: true,
      },
      {
        id: "m2-docker-compose-dotnet",
        title: ".NET Docker Compose",
        subtitle: ".NET 8 Web API + PostgreSQL multi-container setup",
        sidebarSubtitle: "Compose with a .NET stack",
        context: "Docker host",
        script: "modules/m2/docker-compose-dotnet.js",
        ready: true,
      },
      {
        id: "m2-docker-swarm-dotnet",
        title: ".NET Docker Swarm",
        subtitle: "Deploy .NET services across a 3-node Swarm cluster",
        sidebarSubtitle: "Swarm with a .NET stack",
        context: "Swarm · 3 nodes",
        script: "modules/m2/docker-swarm-dotnet.js",
        ready: true,
      },
      {
        id: "m2-homework",
        title: "Practice: .NET Swarm Deployment",
        subtitle: "Vagrantfile + docker-compose + Swarm cluster exercise",
        sidebarTitle: "Homework — .NET Swarm",
        sidebarSubtitle: "Vagrant + Compose + Swarm",
        context: "host → Swarm VMs",
        script: "modules/m2/homework-m3.js",
        ready: true,
        practice: true,
      },
      {
        id: "m2-nerdctl-intro",
        title: "Nerdctl: Docker-compatible CLI for containerd",
        subtitle: "Installing and using nerdctl on Pi OS",
        context: "Pi 5 host",
        script: "modules/m2/nerdctl-intro.js",
        ready: true,
      },
      {
        id: "m2-practice-docker-images",
        title: "Practice: Build, Run & Optimize Images",
        subtitle: "Hands-on lab · first image · ENTRYPOINT vs CMD · image layers & build cache",
        sidebarSubtitle: "Hands-on: build & optimize images",
        context: "Docker host",
        script: "modules/m2/practice-docker-images.js",
        ready: true,
        practice: true,
      },
      {
        id: "m2-exam",
        title: "Exam: Introduction to Docker",
        subtitle: "M2 exam · install · images & containers · export/import · commit · Dockerfiles · ENTRYPOINT vs CMD · Apache homework",
        sidebarTitle: "Exam — Introduction to Docker",
        sidebarSubtitle: "M2 exam walkthrough",
        context: "Docker host",
        script: "modules/m2/exam-m2.js",
        ready: true,
        practice: true,
      },
    ],
  },
  {
    group: "Orchestration (k3s)",
    icon: "☸️",
    blurb: "A k3s Kubernetes cluster on the Raspberry Pi 5 — containers scheduled across the cluster.",
    modules: [
      {
        id: "m3-k3s-pi5",
        title: "Setup Guide for Raspberry Pi 5 (8GB)",
        subtitle: "Running Raspberry Pi OS with k3s and containerized applications",
        context: "Pi 5 cluster",
        script: "modules/m3/k3s-pi5.js",
        ready: true,
      },
      {
        id: "m3-cloudflare-tunnel-pi5",
        title: "Cloudflare Tunnel on Pi 5",
        subtitle: "Secure remote access to local services",
        context: "Pi 5 cluster",
        script: "modules/m3/cloudflare-tunnel-pi5.js",
        ready: true,
      },
      {
        id: "m3-k3s-dashboard",
        title: "k3s Dashboard",
        subtitle: "Install, create ServiceAccount, generate token, create Ingress, update Cloudflare config",
        context: "k3s cluster",
        script: "modules/m3/k3s-dashboard.js",
        ready: true,
      },
      {
        id: "m3-nginx-ingress",
        title: "Nginx Ingress Controller with Traefik",
        subtitle: "Verify Traefik is running, create Ingress rules, and route traffic to your services",
        context: "k3s cluster",
        script: "modules/m3/nginx-ingress.js",
        ready: true,
      },
      {
        id: "m3-persistent-storage",
        title: "Persistent Storage with k3s",
        subtitle: "Using local-path-provisioner and hostPath for data persistence",
        context: "k3s cluster",
        script: "modules/m3/persistent-storage.js",
        ready: true,
      },
      {
        id: "m3-sample-apps",
        title: "Sample Applications",
        subtitle: "Deploying example workloads to test your k3s cluster",
        context: "k3s cluster",
        script: "modules/m3/sample-apps.js",
        ready: true,
      },
      {
        id: "m3-quick-reference",
        title: "Quick Reference Commands",
        subtitle: "A curated list of essential kubectl commands for managing your k3s cluster",
        context: "k3s cluster",
        script: "modules/m3/quick-reference.js",
        ready: true,
      },
      {
        id: "m3-security",
        title: "Security Notes",
        subtitle: "Best practices for securing your k3s cluster and applications",
        context: "k3s cluster",
        script: "modules/m3/security.js",
        ready: true,
      },
      {
        id: "m3-verification",
        title: "Verification & Testing",
        subtitle: "Commands to verify your cluster and troubleshoot issues",
        context: "k3s cluster",
        script: "modules/m3/verification.js",
        ready: true,
      },
      {
        id: "m3-troubleshooting",
        title: "Troubleshooting",
        subtitle: "Debug common issues with k3s, Traefik, and Cloudflare Tunnel",
        context: "k3s cluster",
        script: "modules/m3/troubleshooting.js",
        ready: true,
      }
    ],
  },
  {
    group: "CI/CD",
    icon: "🔄",
    blurb: "A pipeline that builds, tests & ships your app — runs on a CI runner.",
    modules: [
      {
        id: "m5-placeholder",
        title: "M5 – (coming soon)",
        subtitle: "",
        script: null,
        ready: false,
      },
    ],
  },
  // ── Add more groups / modules here as you convert the MD files ────────────
];
