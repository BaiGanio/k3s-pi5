// modules/k3s-pi5/k3s-pi5.js
// Setup Guide — from a bare Raspberry Pi 5 to a running, remotely-managed k3s cluster

window.pageBlocks = [

  // ── What is the Setup Guide? ──────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Setup Guide: From Bare Pi to Running Cluster',
    content: `
      <p>
        <strong>This is the foundational build.</strong> It takes a fresh Raspberry Pi OS
        install and turns it into a working single-node k3s cluster that you can drive from
        your MacBook. Everything else in this section — Cloudflare tunnels, persistent
        storage, the dashboard, the Field Manual — assumes the cluster you build here is
        already up and <code>Ready</code>.
      </p>
      <p>
        Unlike the Field Manual (a reference you dip into), this is a <em>linear walkthrough</em>.
        Follow it top to bottom, once. By the last command you'll have k3s installed, its
        node reporting <code>Ready</code>, and <code>kubectl get nodes</code> working from
        your laptop.
      </p>

      <h4>What's Inside</h4>
      <p>
        Four sections, in the order you run them:
      </p>
      <ul>
        <li><strong>Pre-flight Checks</strong> — prove the Pi is actually ready before you install anything: right OS, ARM64 CPU, enough free RAM and disk, cgroups v2, and swap disabled. Most "k3s won't start" problems are caught here.</li>
        <li><strong>Firewall Configuration</strong> — open exactly the ports k3s needs and nothing more. UFW blocks everything by default, so a missing port silently breaks scheduling or ingress.</li>
        <li><strong>k3s Installation</strong> — the one-command install, then the two checks that confirm it worked: the systemd service is running and the node is <code>Ready</code>.</li>
        <li><strong>kubectl from MacBook</strong> — pull the kubeconfig off the Pi so you manage the cluster from your laptop instead of SSHing in for every command.</li>
      </ul>

      <h4>How to Use This</h4>
      <p>
        <strong>Work top to bottom the first time.</strong> Every command shows what it does,
        a breakdown of each flag, sample output, and why it matters on a Pi specifically.
        Don't skip pre-flight — swap left on or cgroups still at v1 will make the kubelet
        refuse to start, and the error message won't point you at the real cause.
      </p>
      <p>
        Once the node shows <code>Ready</code> and kubectl works from your Mac, this guide is
        done. From there, day-to-day operation lives in the <strong>Field Manual</strong>.
      </p>
    `,
  },

  // ── Three rules before you install ────────────────────────────────────────

  {
    type: 'note',
    variant: 'tip',
    content: `
      <strong>Three rules before you install k3s on a Pi 5:</strong>
      <ol style="margin-top: 0.5rem; padding-left: 1.5rem;">
        <li><strong>Pre-flight is not optional.</strong> Swap left on or cgroups still at v1
            means the kubelet refuses to start — with errors that don't name the real cause.
            Run all six checks first.</li>
        <li><strong>ARM64 or nothing.</strong> Confirm <code>aarch64</code> in the architecture
            check now, because every container image you pull later must support ARM64 too —
            an <code>amd64</code>-only image sits in ImagePullBackOff forever.</li>
        <li><strong>Open ports deliberately.</strong> UFW denies all inbound traffic by default.
            Each k3s port serves a distinct role — miss one and scheduling, ingress, or node
            registration breaks with no obvious symptom.</li>
      </ol>
    `,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: PRE-FLIGHT CHECKS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Pre-flight Checks',
    content: `
      <p>
        <strong>Prove the Pi is ready before you install anything.</strong> These six checks
        take two minutes and save hours. k3s has hard requirements — cgroups v2, swap
        disabled, an ARM64 CPU — and when they aren't met it fails in ways that point you at
        the wrong problem. Verifying up front means that if the install later misbehaves, you
        already know the foundation is sound.
      </p>
      <p>
        Run them in order: confirm the OS and architecture, check you have the RAM and disk
        headroom for k3s plus containers, then verify the two settings the kubelet is strict
        about — <strong>cgroups v2</strong> and <strong>swap off</strong>.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'preflight',
    sectionTitle: 'Pre-flight Checks',
    items: [
      {
        id: 1,
        commandTitle: "Check OS",
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
        id: 2,
        commandTitle: "Check System Architecture",
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
        id: 3,
        commandTitle: "Check RAM",
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
        id: 4,
        commandTitle: "Check Disk Space",
        command: "df -h",
        searchTerms: "disk space free storage available df",
        description: "Shows disk usage for all mounted filesystems. Helps you confirm you have enough free space before installing K3s and pulling container images.",
        parts: [
          { text: "df", explanation: "disk filesystem — reports available and used disk space" },
          { text: "-h", explanation: "'human-readable' — shows sizes as 60.5G instead of raw bytes" }
        ],
        example: "Filesystem      Size  Used Avail Use% Mounted on\n/dev/root        59G   12G   44G  22% /\ntmpfs           3.9G     0  3.9G   0% /dev/shm",
        why: "K3s and container images take up disk space. With 8GB RAM and databases, you'll want adequate storage — at least 10GB free on the root partition for K3s and containers."
      },
      {
        id: 5,
        commandTitle: "Check cgroups Version",
        command: "stat -fc %T /sys/fs/cgroup/",
        searchTerms: "cgroups version check k3s resource management",
        description: "Checks which version of cgroups is active. K3s requires cgroups v2 for proper memory and CPU resource management.",
        parts: [
          { text: "stat",           explanation: "displays file or filesystem status" },
          { text: "-fc %T",         explanation: "-f for filesystem, -c for custom format, %T is the filesystem type" },
          { text: "/sys/fs/cgroup/", explanation: "the cgroup filesystem mount point" }
        ],
        example: "# Should output 'cgroup2fs'\ncgroup2fs",
        why: "cgroups v1 causes instability with containerd on newer kernels. K3s logs will warn about this at startup if it's wrong."
      },
      {
        id: 6,
        commandTitle: "Check Swap is Disabled",
        command: "free -h | grep Swap",
        searchTerms: "free swap disabled kubernetes k3s",
        description: "The kubelet requires swap to be disabled. The swap line should show 0B in all columns.",
        parts: [
          { text: "free -h",        explanation: "shows memory and swap usage in human-readable format" },
          { text: "| grep Swap",    explanation: "filters output to show only the Swap line" }
        ],
        example: "Swap:          0B          0B          0B",
        why: "If swap is not zero, Kubernetes will refuse to start pods. Disable it with 'sudo dphys-swapfile swapoff && sudo dphys-swapfile uninstall && sudo systemctl disable dphys-swapfile'."
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: FIREWALL CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Firewall Configuration',
    content: `
      <p>
        <strong>k3s needs specific ports open; UFW blocks all inbound traffic by default.</strong>
        First check whether the firewall is even active, then open exactly the set k3s
        requires — the API server, kubelet, etcd, Flannel's overlay network, the NodePort
        range, and standard HTTP/HTTPS for ingress.
      </p>
      <p>
        Open only what you need. Every extra open port is attack surface, and every missing
        one is a silent failure — a blocked API port means kubectl times out, a blocked
        Flannel port means pods can't talk to each other. This is a single-node cluster, so
        we open the server-side set here.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'firewall',
    sectionTitle: 'Firewall Configuration',
    items: [
      {
        id: 100,
        commandTitle: "Check Firewall Status",
        command: "sudo ufw status",
        searchTerms: "ufw firewall status check",
        description: "Shows whether the Uncomplicated FireWall (UFW) is active and which rules are applied.",
        parts: [
          { text: "sudo ufw",    explanation: "runs the Uncomplicated FireWall tool as admin" },
          { text: "status",      explanation: "displays current firewall state" }
        ],
        example: "Status: active\n\nTo                         Action      From\n--                         ------      ----\n22/tcp                     ALLOW       Anywhere\n6443/tcp                   ALLOW       Anywhere",
        why: "K3s needs specific ports open. Firewall status tells you whether rules are even being enforced."
      },
      {
        id: 101,
        commandTitle: "Open K3s Required Ports",
        command: "sudo ufw allow 6443/tcp && sudo ufw allow 10250/tcp && sudo ufw allow 2379:2380/tcp && sudo ufw allow 8472/udp && sudo ufw allow 30000:32767/tcp && sudo ufw allow 443/tcp && sudo ufw allow 80/tcp && sudo ufw allow 10252/tcp",
        searchTerms: "ufw allow ports k3s required open firewall",
        description: "Opens all ports k3s requires for cluster communication and service exposure. The 30000-32767 range covers NodePort services.",
        parts: [
          { text: "6443/tcp",    explanation: "Kubernetes API server — kubectl connects here" },
          { text: "10250/tcp",   explanation: "kubelet API — used by the API server to reach kubelets" },
          { text: "2379-2380/tcp", explanation: "etcd client/server ports — for distributed key-value store" },
          { text: "8472/udp",    explanation: "Flannel CNI VXLAN overlay networking" },
          { text: "30000-32767/tcp", explanation: "NodePort service range — all NodePort services use ports in this band" },
          { text: "443, 80/tcp", explanation: "Ingress/Traefik — standard HTTPS and HTTP ports" },
          { text: "10252/tcp",   explanation: "Controller Manager — maintains cluster state" }
        ],
        verify: {
          command: "sudo ufw status",
          expected: "Each port should appear in the ALLOW list"
        },
        example: "Rule added\nRule added (v6)",
        why: "UFW blocks ALL ports by default. Each port serves a distinct Kubernetes role — missing even one can silently break scheduling, ingress, or node registration."
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: K3S INSTALLATION
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'k3s Installation',
    content: `
      <p>
        <strong>This is the actual install — one command.</strong> k3s is a lightweight
        Kubernetes distribution built for edge devices like the Pi: it strips out the
        components a home lab doesn't need, bundles containerd, Traefik, and a local-path
        storage provisioner, and runs 40–60% lighter than full Kubernetes. The official
        installer downloads and starts it as a systemd service in a single step.
      </p>
      <p>
        After it runs, don't assume success — verify it. Check the <code>k3s</code> service is
        <code>active (running)</code>, then check the node reports <code>Ready</code>. If both
        are green, the control plane is up and you have a working cluster.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'k3s',
    sectionTitle: 'k3s Installation',
    items: [
      {
        id: 200,
        commandTitle: "Install k3s",
        command: "curl -sfL https://get.k3s.io | sh -",
        searchTerms: "curl install k3s script",
        description: "Downloads the k3s installer script from the internet and runs it immediately. This is the official installation method.<br> K3s is a lightweight Kubernetes distribution optimized for edge devices like the Raspberry Pi. It:<br> - Removes unnecessary components that consume memory.<br> - Bundles container runtime (containerd) built-in.<br> - Is 40-60% lighter than full Kubernetes.<br> - Perfect for IoT, edge computing, and home labs",
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
        id: 201,
        commandTitle: "Check k3s Status",
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
        id: 202,
        commandTitle: "Check Kubernetes Nodes",
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
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: KUBECTL FROM MACBOOK
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'kubectl from MacBook',
    content: `
      <p>
        <strong>Stop SSHing into the Pi for every command.</strong> By default kubectl lives
        only on the Pi (as <code>sudo k3s kubectl</code>). This section copies the cluster's
        kubeconfig to your MacBook so you can run <code>kubectl</code> locally and manage the
        cluster like any remote server.
      </p>
      <p>
        Two gotchas to expect. First, the kubeconfig on the Pi is root-owned and mode 600, so
        a plain <code>scp</code> fails — you read it with <code>sudo cat</code> over SSH.
        Second, it points at <code>127.0.0.1</code> (localhost <em>on the Pi</em>), which from
        your Mac means your Mac — so you rewrite that to the Pi's hostname. Install kubectl via
        Homebrew, copy the config, fix the server address, and confirm with
        <code>kubectl get nodes</code>.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'kubectl',
    sectionTitle: 'kubectl from MacBook',
    items: [
      {
        id: 300,
        commandTitle: "Copy kubeconfig from Pi to MacBook",
        command: "ssh pi@raspberrypi \"sudo cat /etc/rancher/k3s/k3s.yaml\" > ~/.kube/config-pi5",
        searchTerms: "scp ssh cat copy kubeconfig mac pi k3s remote access permission denied",
        description: "Copies the kubeconfig from the Pi to your MacBook so kubectl on your Mac can control the cluster. It uses <code>sudo cat</code> over SSH because <code>/etc/rancher/k3s/k3s.yaml</code> is mode 600 and owned by root — a plain <code>scp pi@...</code> fails with <em>Permission denied</em>.",
        parts: [
          { text: "ssh pi@raspberrypi \"sudo cat ...\"", explanation: "runs cat as root on the Pi over SSH — the only way to read the root-owned kubeconfig without changing its permissions" },
          { text: "/etc/rancher/k3s/k3s.yaml",            explanation: "source: the k3s-generated kubeconfig on the Pi" },
          { text: "> ~/.kube/config-pi5",                 explanation: "redirects the output into a dedicated config file on your MacBook" }
        ],
        example: "# No output on success — check it landed:\nhead -3 ~/.kube/config-pi5\n# apiVersion: v1\n# clusters:\n# - cluster:\n\n# Alternative: install k3s with --write-kubeconfig-mode 644, then plain scp works:\n#   curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644",
        why: "Having kubectl on your MacBook means you can manage the Pi without SSHing in. Use KUBECONFIG=~/.kube/config-pi5 kubectl get nodes."
      },
      {
        id: 301,
        commandTitle: "Update Kubeconfig Server IP",
        command: "sed -i '' 's/127.0.0.1/raspberrypi.local/' ~/.kube/config-pi5",
        searchTerms: "sed update kubeconfig server ip localhost mac",
        description: "The copied kubeconfig points to 127.0.0.1 (localhost on the Pi). This replaces it with the Pi's hostname so kubectl on your MacBook can reach the cluster.",
        parts: [
          { text: "sed -i '' 's/127.0.0.1/...'", explanation: "in-place edit — replaces the server IP in the config file" },
          { text: "raspberrypi.local", explanation: "replace with your Pi's hostname (or .local for mDNS, or its static IP)" }
        ],
        example: "# Verify the change:\ngrep server ~/.kube/config-pi5\n# server: https://raspberrypi.local:6443",
        why: "Without this change, kubectl on your MacBook tries to reach localhost:6443 — which is your Mac, not the Pi."
      },
      {
        id: 302,
        commandTitle: "Test kubectl from MacBook",
        command: "KUBECONFIG=~/.kube/config-pi5 kubectl get nodes",
        searchTerms: "kubectl test mac connection macbook get nodes verify remote",
        description: "Uses the copied kubeconfig to talk to the Pi's k3s cluster from your MacBook. Confirms end-to-end connectivity.",
        parts: [
          { text: "KUBECONFIG=~/.kube/config-pi5", explanation: "sets the config file location for this one command" },
          { text: "kubectl get nodes", explanation: "lists cluster nodes — successful response means connectivity works" }
        ],
        example: "NAME       STATUS   ROLES    AGE\npi5-k3s    Ready    master   10m",
        why: "Pro tip: 'export KUBECONFIG=~/.kube/config-pi5' in your Mac terminal to avoid prefixing every command."
      },
      {
        id: 303,
        commandTitle: "Install kubectl on MacBook",
        command: "brew install kubectl",
        searchTerms: "kubectl install homebrew mac macos",
        description: "Installs the standard kubectl CLI on your MacBook via Homebrew. Required before you can manage the cluster remotely.",
        parts: [
          { text: "brew install kubectl", explanation: "downloads and installs the kubectl binary from Homebrew — adds it to PATH" }
        ],
        example: "🍺  kubernetes-cli was successfully installed!",
        why: "k3s bundles its own kubectl on the Pi — install it separately on your MacBook for remote control."
      },
    ],
  },

  // ── Closing: What's Next ──────────────────────────────────────────────────

  {
    type: 'note',
    variant: 'info',
    content: `
      <strong>✅ Cluster up? Here's what's next.</strong> Once the node shows
      <code>Ready</code> and <code>kubectl get nodes</code> works from your Mac, the
      foundation is done. From here: expose services to the internet with the
      <strong>Cloudflare Tunnel</strong> module, add durable storage with
      <strong>Persistent Storage</strong>, and get a UI with the <strong>k3s Dashboard</strong>.
      For everyday operation — deploying apps, verifying health, troubleshooting — keep the
      <strong>Field Manual</strong> within reach.
    `,
  },

];
