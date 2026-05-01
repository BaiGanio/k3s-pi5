// modules/registry.js
// ─────────────────────────────────────────────────────────────────────────────
// THE ONLY FILE YOU EDIT when adding a new module.
//
// To add a module:
//   1. Drop its data file into the modules/ folder.
//   2. Add one entry to the correct group below (or create a new group).
//   3. Done — the sidebar and routing update automatically.
// ─────────────────────────────────────────────────────────────────────────────

const MODULE_REGISTRY = [
  {
    group: "VMs",
    icon: "🛠️",
    modules: [
      {
        id: "m1-devops-intro",
        title: "Introduction to DevOps",
        subtitle: "VirtualBox · Vagrant · Manual deploy",
        script: "modules/m1-devops-intro.js",
        ready: true,
      },
      {
        id: "m1-vagrant-parallels",
        title: "Vagrant + Parallels on M1 Pro",
        subtitle: "Apple Silicon · 32GB RAM · 16 GPU / 10 CPU cores · 1TB SSD · Parallels Desktop Pro",
        sidebarSubtitle: " Two-VM setup on Apple Silicon",
        script: "modules/vagrant-parallels-m1.js",
        ready: true,
      },
    ],
  },
  {
    group: "Standalone Containers",
    icon: "🐳",
    modules: [
      {
        id: "m2-docker-intro",
        title: "Docker on Raspberry Pi OS",
        subtitle: "Installation and configuration",
        script: "modules/m2-docker-intro.js",
        ready: true,
      },
      {
        id: "m2-advanced-docker",
        title: "Advanced Docker",
        subtitle: "... ",
        script: "modules/m2-advanced-docker.js",
        ready: true,
      },
      {
        id: "m2-nerdctl-intro",
        title: "Nerdctl: Docker-compatible CLI for containerd",
        subtitle: "Installing and using nerdctl on Raspberry Pi OS",
        script: "modules/m2-nerdctl-intro.js",
        ready: true,
      },
    ],
  },
  {
    group: "Kubernetes / K3s",
    icon: "☸️",
    modules: [
      {
        id: "k3s-pi5",
        title: "k3s on Pi 5: Complete Setup Guide",
        subtitle: "Raspberry Pi 5 (8GB) running Raspberry Pi OS with k3s, Cloudflare Tunnel, and containerized applications",
        script: "modules/k3s-pi5.js",
        ready: true,
      },
    ],
  },
  {
    group: "CI/CD",
    icon: "🔄",
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