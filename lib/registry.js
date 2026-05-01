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
    group: "DevOps Fundamentals",
    icon: "🛠️",
    modules: [
      {
        id: "m1-devops-intro",
        title: "M1 - Introduction to DevOps",
        subtitle: "VirtualBox · Vagrant · Manual deploy",
        script: "modules/m1-devops-intro.js",
        ready: true,
      },
      {
        id: "vagrant-parallels-m1",
        title: "Vagrant on Apple Silicon",
        subtitle: "M1 Pro 32GB RAM · 16 GPU / 10 CPU cores · 1TB SSD · Parallels Desktop Pro",
        sidebarSubtitle: "M1 Pro · Parallels Desktop Pro",
        script: "modules/vagrant-parallels-m1.js",
        ready: true,
      },
    ],
  },
  {
    group: "Containers",
    icon: "🐳",
    modules: [
      {
        id: "m2-docker-intro",
        title: "Docker installation and configuration",
        subtitle: "WTF is a container? Installing Docker on Raspberry Pi OS",
        script: "modules/m2-docker-intro.js",
        ready: true,
      },
      {
        id: "m3-advanced-docker",
        title: "Advanced Docker",
        subtitle: "... ",
        script: "modules/m3-advanced-docker.js",
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