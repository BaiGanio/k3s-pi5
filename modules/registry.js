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
        title: "M1 – Introduction to DevOps",
        subtitle: "VirtualBox · Vagrant · Manual deploy",
        script: "modules/m1-devops-intro.js",
        ready: true,
      },
      {
        id: "m2-placeholder",
        title: "M2 – (coming soon)",
        subtitle: "",
        script: null,
        ready: false,
      },
    ],
  },
  {
    group: "Containers",
    icon: "🐳",
    modules: [
      {
        id: "m3-placeholder",
        title: "M3 – (coming soon)",
        subtitle: "",
        script: null,
        ready: false,
      },
    ],
  },
  {
    group: "Kubernetes / K3s",
    icon: "☸️",
    modules: [
      {
        id: "m4-placeholder",
        title: "M4 – (coming soon)",
        subtitle: "",
        script: null,
        ready: false,
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