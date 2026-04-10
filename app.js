const commandData = [
  {
    id: 1, section: "preflight", sectionTitle: "Pre-flight Checks",
    command: "cat /etc/os-release",
    searchTerms: "cat os-release linux version",
    description: "Displays information about your operating system (name, version, pretty name).",
    parts: [
      { text: "cat",            explanation: "concatenate — outputs file contents to screen" },
      { text: "/etc/os-release",explanation: "system config file containing OS info" }
    ],
    example: 'PRETTY_NAME="Raspberry Pi OS (64-bit)"\nNAME="Raspberry Pi OS"\nVERSION_ID="2024.01"',
    why: "Confirms you're running the right OS before installing k3s (which has OS requirements)."
  },
  {
    id: 2, section: "preflight", sectionTitle: "Pre-flight Checks",
    command: "uname -a",
    searchTerms: "uname kernel arm64 architecture",
    description: "Shows complete system information: OS name, kernel version, CPU architecture, hostname.",
    parts: [
      { text: "uname", explanation: "unix name — system info tool" },
      { text: "-a",    explanation: "flag meaning 'all' (show everything)" }
    ],
    example: "Linux raspberrypi 6.6.51-v8 #1 SMP ARM64 aarch64 GNU/Linux",
    why: "Look for <strong>aarch64</strong> in output — proves you have an ARM64 CPU. K3s on Pi 5 needs this."
  },
  {
    id: 3, section: "preflight", sectionTitle: "Pre-flight Checks",
    command: "free -h",
    searchTerms: "free memory ram",
    description: "Shows RAM usage: total, used, available. The <code>-h</code> flag displays in human-readable format (GB/MB, not bytes).",
    parts: [
      { text: "free", explanation: "memory reporting tool" },
      { text: "-h",   explanation: "'human-readable' (shows 7.5G instead of raw bytes)" }
    ],
    example: "Mem:    7.5Gi   1.2Gi   6.3Gi   120Mi   128Mi   5.8Gi",
    why: "Verifies your 8GB Pi has enough free RAM. K3s + containers need ~2GB minimum available."
  },
  {
    id: 4, section: "system", sectionTitle: "System Setup",
    command: "sudo apt update && sudo apt upgrade -y",
    searchTerms: "sudo apt update upgrade install packages",
    description: "Updates system packages to latest versions. First refreshes package list, then upgrades everything.",
    parts: [
      { text: "sudo",    explanation: "superuser do — run as administrator" },
      { text: "apt",     explanation: "package manager (Debian/Ubuntu)" },
      { text: "update",  explanation: "refresh list of available packages" },
      { text: "&&",      explanation: "run next command only if this one succeeds" },
      { text: "upgrade", explanation: "install newer versions of installed packages" },
      { text: "-y",      explanation: "auto-confirm all prompts" }
    ],
    example: "Reading package lists... Done\nBuilding dependency tree... Done\n0 upgraded, 0 newly installed",
    why: "Ensures all security patches are installed before running Kubernetes. Old packages = potential vulnerabilities."
  },
  {
    id: 5, section: "system", sectionTitle: "System Setup",
    command: "sudo dphys-swapfile swapoff",
    searchTerms: "sudo dphys-swapfile disable swap",
    description: "Turns off swap memory. Swap is disk-based RAM that's much slower — Kubernetes doesn't like it.",
    parts: [
      { text: "sudo",           explanation: "run as administrator" },
      { text: "dphys-swapfile", explanation: "Raspberry Pi's swap management tool" },
      { text: "swapoff",        explanation: "command to disable swap" }
    ],
    example: "(no output on success)",
    why: "Kubernetes pods expect fast memory. Swap causes unpredictable slowdowns — better to crash than to hang."
  },
  {
    id: 6, section: "system", sectionTitle: "System Setup",
    command: "sudo ufw allow 6443/tcp",
    searchTerms: "sudo ufw allow firewall port",
    description: "Opens a firewall port for incoming traffic. 6443/tcp is the K3s API server port.",
    parts: [
      { text: "sudo",      explanation: "run as administrator" },
      { text: "ufw",       explanation: "'uncomplicated firewall' tool" },
      { text: "allow",     explanation: "permit traffic on this port" },
      { text: "6443/tcp",  explanation: "port 6443, TCP protocol (where K3s API listens)" }
    ],
    example: "Rule added\nRule added (v6)",
    why: "UFW blocks ALL ports by default. K3s won't work without these ports open (6443, 10250, 80, 443)."
  },
  {
    id: 7, section: "k3s", sectionTitle: "K3s Installation",
    command: "curl -sfL https://get.k3s.io | sh -",
    searchTerms: "curl install k3s script",
    description: "Downloads the k3s installer script from the internet and runs it immediately. This is the official installation method.",
    parts: [
      { text: "curl",             explanation: "downloads files from URLs" },
      { text: "-sfL",             explanation: "silent, fail on HTTP error, follow redirects" },
      { text: "https://get.k3s.io", explanation: "official k3s download URL" },
      { text: "|",                explanation: "pipe — sends output to the next command" },
      { text: "sh -",             explanation: "shell reads commands from the pipe and executes them" }
    ],
    example: "Downloading k3s... [####################] 100%\n[INFO] systemd: Starting k3s",
    why: "Official k3s distribution method. Download + execute in one step = faster than manual installation."
  },
  {
    id: 8, section: "k3s", sectionTitle: "K3s Installation",
    command: "sudo systemctl status k3s",
    searchTerms: "sudo systemctl k3s status",
    description: "Checks if the k3s service is running. Shows status, recent logs, and memory usage.",
    parts: [
      { text: "sudo",      explanation: "run as administrator" },
      { text: "systemctl", explanation: "system service manager" },
      { text: "status",    explanation: "check service state" },
      { text: "k3s",       explanation: "service name (registered by installer)" }
    ],
    example: "● k3s.service - Lightweight Kubernetes\n   Active: active (running) since Mon...\n   Memory: 145.3M",
    why: "<strong>Active: active (running)</strong> = K3s started successfully. Any other status = needs debugging."
  },
  {
    id: 9, section: "k3s", sectionTitle: "K3s Installation",
    command: "sudo k3s kubectl get nodes",
    searchTerms: "kubectl get nodes",
    description: "Lists all Kubernetes nodes (machines in the cluster). Shows their readiness status.",
    parts: [
      { text: "sudo k3s kubectl", explanation: "K3s's built-in kubectl (Kubernetes CLI)" },
      { text: "get",              explanation: "retrieve/list resources" },
      { text: "nodes",            explanation: "resource type (the machines in the cluster)" }
    ],
    example: "NAME       STATUS   ROLES    AGE\npi5-k3s    Ready    master   5m",
    why: "<strong>Ready</strong> status = your Pi is ready to run containers. <strong>NotReady</strong> = wait or debug."
  },
  {
    id: 10, section: "cloudflare", sectionTitle: "Cloudflare Tunnel",
    command: "cloudflared tunnel login",
    searchTerms: "cloudflared tunnel login authenticate",
    description: "Authenticates your Pi with your Cloudflare account. Opens a browser, you log in, Pi gets a certificate.",
    parts: [
      { text: "cloudflared", explanation: "Cloudflare's tunnel client" },
      { text: "tunnel",      explanation: "subcommand for tunnel operations" },
      { text: "login",       explanation: "authenticate with Cloudflare account" }
    ],
    example: "Please open the following URL and log in with your Cloudflare account:\nhttps://dash.cloudflare.com/argotunnel?...",
    why: "The certificate proves you own the Cloudflare account. Without it, the tunnel won't work."
  },
  {
    id: 11, section: "cloudflare", sectionTitle: "Cloudflare Tunnel",
    command: "cloudflared tunnel create my-pi",
    searchTerms: "cloudflared tunnel create",
    description: "Creates a named tunnel. \"my-pi\" is just a label. Generates a unique credentials file for this tunnel.",
    parts: [
      { text: "cloudflared tunnel create", explanation: "create a new tunnel" },
      { text: "my-pi",                     explanation: "name you choose — use something meaningful" }
    ],
    example: "Tunnel my-pi created with ID abc123def456\nCredentials file: ~/.cloudflared/abc123def456.json",
    why: "Creates unique credentials for this tunnel. You'll reference these in the config file later."
  },
  {
    id: 12, section: "kubernetes", sectionTitle: "Kubernetes Operations",
    command: "kubectl apply -f nginx-deployment.yaml",
    searchTerms: "kubectl apply yaml deployment",
    description: "Reads a YAML file and creates or updates Kubernetes resources (Deployments, Services, Ingress, etc.).",
    parts: [
      { text: "kubectl",                   explanation: "Kubernetes command line tool" },
      { text: "apply",                     explanation: "create or update a resource (idempotent)" },
      { text: "-f",                        explanation: "'file' — read config from this file" },
      { text: "nginx-deployment.yaml",     explanation: "file containing the resource definition" }
    ],
    example: "deployment.apps/nginx-welcome created\nservice/nginx-service created",
    why: "This is how you deploy apps to Kubernetes. YAML defines what you want; apply makes it happen."
  },
  {
    id: 13, section: "kubernetes", sectionTitle: "Kubernetes Operations",
    command: "kubectl get pods",
    searchTerms: "kubectl get pods deployment",
    description: "Lists all running containers (pods) in your cluster. Shows status, age, and readiness.",
    parts: [
      { text: "kubectl", explanation: "Kubernetes CLI" },
      { text: "get",     explanation: "list/retrieve resources" },
      { text: "pods",    explanation: "resource type to list" }
    ],
    example: "NAME                     READY   STATUS    RESTARTS\nnginx-welcome-abc123     1/1     Running   0\ndotnet-hello-def456      1/1     Running   0",
    why: "First command to run when debugging — is my app actually running? Use this constantly."
  },
  {
    id: 14, section: "kubernetes", sectionTitle: "Kubernetes Operations",
    command: "kubectl logs nginx-welcome-abc123",
    searchTerms: "kubectl logs pod debug",
    description: "Shows output from inside a container (stdout/stderr). Use to see what the app is doing or why it crashed.",
    parts: [
      { text: "kubectl",              explanation: "Kubernetes CLI" },
      { text: "logs",                 explanation: "retrieve container output" },
      { text: "nginx-welcome-abc123", explanation: "exact pod name (from 'get pods')" }
    ],
    example: '10.42.0.1 - - [10/Apr/2026:12:00:00] "GET / HTTP/1.1" 200 615',
    why: "See actual error messages. If a pod crashes, logs tell you why (port in use, missing config, etc.)."
  }
];

// Derive unique sections preserving order
const sectionOrder = [];
const seenSections = {};
commandData.forEach(cmd => {
  if (!seenSections[cmd.section]) {
    seenSections[cmd.section] = true;
    sectionOrder.push({ id: cmd.section, title: cmd.sectionTitle });
  }
});

// ─── RENDER ──────────────────────────────────────────────────────────────────
const commandList   = document.getElementById('commandList');
const searchInput   = document.getElementById('searchInput');
const filterControls = document.getElementById('filterControls');
const noResults     = document.getElementById('noResults');

let activeFilter = 'all';

// Build filter buttons
const allBtn = makeFilterBtn('All', 'all', true);
filterControls.appendChild(allBtn);
sectionOrder.forEach(sec => filterControls.appendChild(makeFilterBtn(sec.title, sec.id, false)));

function makeFilterBtn(label, value, isActive) {
  const btn = document.createElement('button');
  btn.className = 'btn btn-sm btn-outline-secondary rounded-pill filter-btn' + (isActive ? ' active' : '');
  btn.textContent = label;
  btn.dataset.filter = value;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = value;
    render();
  });
  return btn;
}

function render() {
  const query = searchInput.value.toLowerCase().trim();
  commandList.innerHTML = '';
  let totalShown = 0;
  let renderedSectionCount = 0;

  sectionOrder.forEach((sec) => {
    // Commands must belong to THIS section AND match filter AND match search
    const cmds = commandData.filter(cmd => {
      const inThisSection = cmd.section === sec.id;
      const matchFilter   = activeFilter === 'all' || cmd.section === activeFilter;
      const matchSearch   = !query ||
        cmd.command.toLowerCase().includes(query) ||
        cmd.searchTerms.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query);
      return inThisSection && matchFilter && matchSearch;
    });

    if (cmds.length === 0) return;
    totalShown += cmds.length;
    renderedSectionCount++;

    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'mb-4';
    sectionDiv.innerHTML = `
      <h5 class="fw-semibold mb-3 d-flex align-items-center gap-2">
        <span class="section-badge">${renderedSectionCount}</span>
        ${sec.title}
      </h5>
    `;

    // Accordion per section
    const accordionId = `acc-${sec.id}`;
    const accordion = document.createElement('div');
    accordion.className = 'accordion shadow-sm';
    accordion.id = accordionId;

    cmds.forEach((cmd, i) => {
      const itemId   = `item-${cmd.id}`;
      const collapseId = `collapse-${cmd.id}`;

      const partsHtml = cmd.parts.map(p =>
        `<span class="command-part">${p.text}</span>`
      ).join(' ');

      const breakdownHtml = cmd.parts.map(p =>
        `<li><code>${p.text}</code> — ${p.explanation}</li>`
      ).join('');

      accordion.innerHTML += `
        <div class="accordion-item border" id="${itemId}">
          <h2 class="accordion-header">
            <button class="accordion-button collapsed" type="button"
              data-bs-toggle="collapse" data-bs-target="#${collapseId}"
              aria-expanded="false" aria-controls="${collapseId}">
              ${cmd.command}
            </button>
          </h2>
          <div id="${collapseId}" class="accordion-collapse collapse"
            data-bs-parent="">
            <div class="accordion-body pt-0">
              <hr class="mt-0" />

              <div class="mb-3">
                <div class="detail-label">What it does</div>
                <div>${cmd.description}</div>
              </div>

              <div class="mb-3">
                <div class="detail-label">Breaking it down</div>
                <div class="mb-2">${partsHtml}</div>
                <ul class="list-unstyled small text-secondary ps-1 mb-0">
                  ${breakdownHtml}
                </ul>
              </div>

              <div class="mb-3">
                <div class="detail-label">Example output</div>
                <div class="example-box">${cmd.example}</div>
              </div>

              <div class="why-box">
                💡 <strong>Why:</strong> ${cmd.why}
              </div>
            </div>
          </div>
        </div>
      `;
    });

    sectionDiv.appendChild(accordion);
    commandList.appendChild(sectionDiv);
  });

  noResults.style.display = totalShown === 0 ? 'block' : 'none';
}

searchInput.addEventListener('input', render);

// Initial render
render();