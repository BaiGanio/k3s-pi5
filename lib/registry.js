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
        script: "modules/m1/devops-intro.js",
        ready: true,
      },
      {
        id: "m1-vagrant-parallels",
        title: "Vagrant + Parallels on M1 Pro",
        subtitle: "Apple Silicon · 32GB RAM · 16 GPU / 10 CPU cores · 1TB SSD · Parallels Desktop Pro",
        sidebarSubtitle: " Two-VM setup on Apple Silicon",
        script: "modules/m1/vagrant-parallels.js",
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
        title: "Docker on Raspberry Pi 5 (8GB)",
        subtitle: "Raspberry Pi OS installation and configuration",
        script: "modules/m2/docker-intro.js",
        ready: true,
      },
      {
        id: "m2-advanced-docker",
        title: "Advanced Docker",
        subtitle: "... ",
        script: "modules/m2/advanced-docker.js",
        ready: false,
      },
      {
        id: "m2-nerdctl-intro",
        title: "Nerdctl: Docker-compatible CLI for containerd",
        subtitle: "Installing and using nerdctl on Pi OS",
        script: "modules/m2/nerdctl-intro.js",
        ready: true,
      },
    ],
  },
  {
    group: "Kubernetes / K3s",
    icon: "☸️",
    modules: [
      {
        id: "m3-k3s-pi5",
        title: "Setup Guide for Raspberry Pi 5 (8GB)",
        subtitle: "Running Raspberry Pi OS with k3s and containerized applications",
        script: "modules/m3/k3s-pi5.js",
        ready: true,
      },
      {
        id: "m3-cloudflare-tunnel-pi5",
        title: "Cloudflare Tunnel on Pi 5",
        subtitle: "Secure remote access to local services",
        script: "modules/m3/cloudflare-tunnel-pi5.js",
        ready: true,
      },
      {
        id: "m3-k3s-dashboard",
        title: "k3s Dashboard",
        subtitle: "Install, create ServiceAccount, generate token, create Ingress, update Cloudflare config",
        script: "modules/m3/k3s-dashboard.js",
        ready: true,
      },
      {
        id: "m3-nginx-ingress",
        title: "Nginx Ingress Controller with Traefik",
        subtitle: "Verify Traefik is running, create Ingress rules, and route traffic to your services",
        script: "modules/m3/nginx-ingress.js",
        ready: true,
      },
      {
        id: "m3-persistent-storage",
        title: "Persistent Storage with k3s",
        subtitle: "Using local-path-provisioner and hostPath for data persistence",
        script: "modules/m3/persistent-storage.js",
        ready: true,
      },
      {
        id: "m3-sample-apps",
        title: "Sample Applications",
        subtitle: "Deploying example workloads to test your k3s cluster",
        script: "modules/m3/sample-apps.js",
        ready: true,
      },
      {
        id: "m3-quick-reference",
        title: "Quick Reference Commands",
        subtitle: "A curated list of essential kubectl commands for managing your k3s cluster",
        script: "modules/m3/quick-reference.js",
        ready: true,
      },
      {
        id: "m3-security",
        title: "Security Notes",
        subtitle: "Best practices for securing your k3s cluster and applications",
        script: "modules/m3/security.js",
        ready: true,
      },
      {
        id: "m3-verification",
        title: "Verification & Testing",
        subtitle: "Commands to verify your cluster and troubleshoot issues",
        script: "modules/m3/verification.js",
        ready: true,
      },
      {
        id: "m3-troubleshooting",
        title: "Troubleshooting",
        subtitle: "Debug common issues with k3s, Traefik, and Cloudflare Tunnel",
        script: "modules/m3/troubleshooting.js",
        ready: true,
      }
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