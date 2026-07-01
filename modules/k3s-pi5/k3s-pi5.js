window.commandData = [
  // ── Pre-flight checks ─────────────────────────────────────
  {
    id: 1, section: "preflight", sectionTitle: "Pre-flight Checks",
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
    id: 2, section: "preflight", sectionTitle: "Pre-flight Checks",
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
    id: 3, section: "preflight", sectionTitle: "Pre-flight Checks",
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
    id: 4, section: "preflight", sectionTitle: "Pre-flight Checks",
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
    id: 5, section: "preflight", sectionTitle: "Pre-flight Checks",
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
    id: 6, section: "preflight", sectionTitle: "Pre-flight Checks",
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

  // ── Firewall Configuration ─────────────────────────────────
  {
    id: 100, section: "firewall", sectionTitle: "Firewall Configuration",
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
    id: 101, section: "firewall", sectionTitle: "Firewall Configuration",
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

  // ── k3s Installation ─────────────────────────────────────
  {
    id: 200, section: "k3s", sectionTitle: "k3s Installation",
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
    id: 201, section: "k3s", sectionTitle: "K3s Installation",
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
    id: 202, section: "k3s", sectionTitle: "K3s Installation",
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

  // ── kubectl Access from MacBook ───────────────────────────
  {
    id: 300, section: "kubectl", sectionTitle: "kubectl from MacBook",
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
    id: 301, section: "kubectl", sectionTitle: "kubectl from MacBook",
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
    id: 302, section: "kubectl", sectionTitle: "kubectl from MacBook",
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
    id: 303, section: "kubectl", sectionTitle: "kubectl from MacBook",
    commandTitle: "Install kubectl on MacBook",
    command: "brew install kubectl",
    searchTerms: "kubectl install homebrew mac macos",
    description: "Installs the standard kubectl CLI on your MacBook via Homebrew. Required before you can manage the cluster remotely.",
    parts: [
      { text: "brew install kubectl", explanation: "downloads and installs the kubectl binary from Homebrew — adds it to PATH" }
    ],
    example: "🍺  kubernetes-cli was successfully installed!",
    why: "k3s bundles its own kubectl on the Pi — install it separately on your MacBook for remote control."
  }
];
