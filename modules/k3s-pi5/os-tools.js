// modules/k3s-pi5/os-tools.js
// OS & Developer Tools — the toolbelt and tuning a fresh Pi 5 needs before it runs k3s

window.pageBlocks = [

  // ── What is this module? ──────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'OS & Developer Tools: Preparing the Pi',
    content: `
      <p>
        <strong>This is the groundwork you lay once, right after flashing the SD card.</strong>
        A fresh Raspberry Pi OS install is deliberately minimal — no <code>git</code>, no
        <code>jq</code>, no <code>dig</code>, and a handful of desktop-oriented services eating
        RAM for no reason. Before you install k3s or deploy anything, you fix that: install the
        core toolbelt, add the diagnostics you'll reach for when something breaks, and tune the
        kernel and services for a headless server.
      </p>
      <p>
        Every later module — Docker, k3s, Cloudflare, Ansible — quietly assumes these tools are
        already present. Do this first and you'll never hit a "command not found" six steps deep
        into a tutorial.
      </p>

      <h4>What's Inside</h4>
      <p>
        Five sections, grouped by purpose:
      </p>
      <ul>
        <li><strong>Essential Tools</strong> — the core toolbelt (<code>curl</code>, <code>git</code>, <code>vim</code>, <code>htop</code>, <code>jq</code>, <code>build-essential</code>) plus a verification check that they all landed on PATH.</li>
        <li><strong>Network Diagnostics</strong> — <code>dig</code>, <code>netstat</code>, <code>nmap</code>, <code>tcpdump</code>, and a two-layer internet connectivity test. When a pod can't reach another pod, these are what you use.</li>
        <li><strong>Terminal Productivity</strong> — <code>tmux</code>, <code>tree</code>, <code>ncdu</code>, <code>bat</code>, <code>ripgrep</code> — quality-of-life for long SSH sessions.</li>
        <li><strong>Kubernetes Companion Tools</strong> — Krew (the kubectl plugin manager) and the four plugins worth installing on day one: <code>ctx</code>, <code>ns</code>, <code>tail</code>, <code>view-secret</code>.</li>
        <li><strong>Pi 5 System Tuning</strong> — disable services a headless server doesn't need, and raise the kernel inotify limits before container file-watchers exhaust them.</li>
      </ul>

      <h4>How to Use This</h4>
      <p>
        <strong>Run it top to bottom on a fresh install</strong>, then forget it. Everything
        here is a one-time setup — install the packages, set the theme, disable the services,
        raise the limits. After this, the Pi is a proper server and you can move on to the
        Setup Guide.
      </p>
    `,
  },

  // ── Three rules for prepping a Pi ─────────────────────────────────────────

  {
    type: 'note',
    variant: 'tip',
    content: `
      <strong>Three rules when prepping a fresh Pi 5:</strong>
      <ol style="margin-top: 0.5rem; padding-left: 1.5rem;">
        <li><strong>Install before you need it.</strong> Add <code>jq</code>, <code>git</code>,
            and <code>dig</code> now — discovering they're missing mid-debug, when a pod won't
            resolve DNS, is the worst time to <code>apt install</code>.</li>
        <li><strong>ARM64 binaries only.</strong> Tools you download directly (Krew, and
            anything outside apt) must be the <code>arm64</code>/<code>aarch64</code> build. The
            wrong architecture fails with a cryptic "Exec format error".</li>
        <li><strong>Every megabyte counts.</strong> On an 8 GB Pi shared between k3s, Postgres,
            and your apps, trimming idle services and raising kernel limits is cheap insurance
            against OOM kills and <code>ENOSPC</code> errors later.</li>
      </ol>
    `,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: ESSENTIAL TOOLS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Essential Tools',
    content: `
      <p>
        <strong>The core toolbelt every Pi deserves — install once, use everywhere.</strong>
        <code>curl</code> and <code>wget</code> for downloads and API tests, <code>git</code>
        for cloning repos, <code>vim</code> for editing configs over SSH, <code>htop</code> for
        watching resource pressure live, <code>jq</code> for making kubectl's JSON output
        readable, and <code>build-essential</code> for the times something needs to compile a
        native extension.
      </p>
      <p>
        Install them, then run the verification check. A missing tool caught now is a
        thirty-second fix; the same tool missing mid-tutorial is a confusing detour.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'essentials',
    sectionTitle: 'Essential Tools',
    items: [
      {
        id: 50,
        commandTitle: "Install Essential Packages",
        command: "sudo apt update && sudo apt install -y curl wget git vim htop jq build-essential",
        searchTerms: "apt install essential tools curl git vim htop jq build-essential",
        description: "Installs the core toolbelt every Pi deserves: <code>curl</code> + <code>wget</code> for downloads, <code>git</code> for cloning repos, <code>vim</code> for editing configs, <code>htop</code> for live resource monitoring, <code>jq</code> for parsing JSON from kubectl/API responses, and <code>build-essential</code> for compiling anything that doesn't have a pre-built ARM64 binary.",
        parts: [
          { text: "sudo apt update",              explanation: "refreshes the package index from the configured repositories" },
          { text: "apt install -y",               explanation: "installs all listed packages without prompting for confirmation" },
          { text: "curl wget",                    explanation: "network transfer tools — curl for APIs/tests, wget for downloading binaries" },
          { text: "git",                          explanation: "version control — clone repos, track changes, collaborate" },
          { text: "vim",                          explanation: "terminal text editor — lighter than VS Code, available on every Linux box" },
          { text: "htop",                         explanation: "interactive process viewer — see CPU, RAM, and per-process usage in real time" },
          { text: "jq",                           explanation: "command-line JSON processor — pipe kubectl -o json into jq for readable output" },
          { text: "build-essential",              explanation: "C/C++ compiler toolchain (gcc, make, libc-dev) — needed when pip/npm/cargo compiles native extensions" }
        ],
        example: "Reading package lists... Done\nBuilding dependency tree... Done\nThe following NEW packages will be installed:\n  build-essential curl git htop jq vim wget\n# All tools now available: curl --version, git --version, etc.",
        why: "Install these once after flashing the SD card. Every subsequent module — Docker, k3s, Ansible — assumes you have curl, git, and a text editor. Without jq, kubectl JSON output is a wall of text."
      },
      {
        id: 51,
        commandTitle: "Verify Tool Installations",
        command: "curl --version && echo '---' && git --version && echo '---' && htop --version && echo '---' && jq --version",
        searchTerms: "verify curl git htop jq version check installed",
        description: "Quick sanity check that all essential tools installed correctly and are on the PATH. Each tool prints its version — anything missing will error out.",
        parts: [
          { text: "curl --version",     explanation: "prints curl version and supported protocols (look for HTTPS)" },
          { text: "git --version",      explanation: "prints git version — confirms it's installed and accessible" },
          { text: "htop --version",     explanation: "prints htop version — also confirms terminal capabilities are ok" },
          { text: "jq --version",       explanation: "prints jq version — validates the JSON parser is present" },
          { text: "&& echo '---'",      explanation: "separator between each tool's output for readability" }
        ],
        example: "curl 7.88.1 (aarch64-unknown-linux-gnu)\n---\ngit version 2.39.5\n---\nhtop 3.2.2\n---\njq-1.7.1",
        why: "A missing tool discovered now saves you from debugging a cryptic 'command not found' mid-tutorial when you're six steps deep."
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: NETWORK DIAGNOSTICS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Network Diagnostics',
    content: `
      <p>
        <strong>When something can't talk to something else, these tools tell you why.</strong>
        <code>dig</code>/<code>nslookup</code> for DNS, <code>netstat</code>/<code>ifconfig</code>
        for interfaces and listening ports, <code>nmap</code> to see what's actually open, and
        <code>tcpdump</code> to watch packets on the wire. On a k3s cluster, a pod that can't
        reach another pod is almost always DNS, a firewall rule, or a port binding — and this
        set diagnoses all three.
      </p>
      <p>
        The connectivity test is the one to run <em>before</em> anything that downloads from the
        internet. It separates the two failure modes cleanly: if <code>curl</code> to GitHub
        fails but <code>ping</code> to 1.1.1.1 works, it's DNS or TLS; if both fail, it's your
        router or cable.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'networking',
    sectionTitle: 'Network Diagnostics',
    items: [
      {
        id: 52,
        commandTitle: "Install Network Tools",
        command: "sudo apt install -y dnsutils net-tools nmap tcpdump",
        searchTerms: "dnsutils net-tools nmap tcpdump network diagnostics install dig nslookup",
        description: "Adds the networking Swiss Army knife: <code>dig</code>/<code>nslookup</code> for DNS debugging, <code>ifconfig</code>/<code>netstat</code> for interface and port info, <code>nmap</code> for port scanning, and <code>tcpdump</code> for packet capture.",
        parts: [
          { text: "dnsutils",   explanation: "provides dig and nslookup — DNS lookup tools essential for debugging Cloudflare and cluster DNS" },
          { text: "net-tools",  explanation: "provides ifconfig, netstat, route — classic network interface and connection inspection" },
          { text: "nmap",       explanation: "port scanner — use 'nmap localhost' to verify which ports are actually open on the Pi" },
          { text: "tcpdump",    explanation: "packet capture — use 'sudo tcpdump -i eth0 port 6443' to watch k3s API traffic in real time" }
        ],
        example: "# Check which ports k3s is listening on:\nsudo netstat -tlnp | grep -E '6443|10250|8472'\n\n# Verify CoreDNS is resolving internal service names:\ndig +short postgres.default.svc.cluster.local @10.43.0.10",
        why: "When a pod can't reach another pod, it's almost always DNS, a firewall rule, or a port binding — these four tools diagnose all three."
      },
      {
        id: 53,
        commandTitle: "Test Internet Connectivity",
        command: "curl -sI https://github.com | head -n 1 && ping -c 2 1.1.1.1",
        searchTerms: "internet test connectivity ping curl github cloudflare",
        description: "Two-layer connectivity test: HTTPS to GitHub (validates DNS + TLS + routing) and ICMP to Cloudflare's 1.1.1.1 (validates basic IP reachability).",
        parts: [
          { text: "curl -sI https://github.com",  explanation: "silent HEAD request — just the HTTP status line, no body" },
          { text: "ping -c 2 1.1.1.1",           explanation: "sends 2 ICMP echo requests to Cloudflare's public DNS — tests basic IP routing" }
        ],
        example: "HTTP/2 200\nPING 1.1.1.1 (1.1.1.1) 56(84) bytes of data.\n64 bytes from 1.1.1.1: icmp_seq=1 ttl=57 time=12.3 ms\n64 bytes from 1.1.1.1: icmp_seq=2 ttl=57 time=11.8 ms",
        why: "Run this before installing anything that downloads from the internet (k3s, cloudflared, Docker images). If curl fails but ping works, you have a DNS or TLS problem. If both fail, check your router or ethernet cable."
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: TERMINAL PRODUCTIVITY
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Terminal Productivity',
    content: `
      <p>
        <strong>You will live in an SSH session on this Pi — make it comfortable.</strong>
        <code>tmux</code> keeps your work alive across disconnects (start a
        <code>kubectl get pods -w</code>, detach, and check back hours later with the full
        history intact), <code>tree</code> and <code>ncdu</code> make sense of the filesystem
        and disk usage, <code>bat</code> is <code>cat</code> with syntax highlighting, and
        <code>ripgrep</code> is a much faster <code>grep</code> that respects
        <code>.gitignore</code>.
      </p>
      <p>
        On Raspberry Pi OS, <code>bat</code> installs under the name <code>batcat</code> to
        avoid a package collision — so the second step points you at that and sets a readable
        theme, which matters more than it sounds when a single mis-indented space breaks a YAML
        manifest.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'productivity',
    sectionTitle: 'Terminal Productivity',
    items: [
      {
        id: 54,
        commandTitle: "Install Terminal Enhancers",
        command: "sudo apt install -y tmux tree ncdu bat ripgrep",
        searchTerms: "tmux tree ncdu bat ripgrep terminal multiplexer productivity enhancers",
        description: "Quality-of-life tools for long SSH sessions: <code>tmux</code> keeps sessions alive across disconnects, <code>tree</code> visualizes directories, <code>ncdu</code> finds disk hogs, <code>bat</code> is cat with syntax highlighting, and <code>ripgrep</code> is grep but faster.",
        parts: [
          { text: "tmux",       explanation: "terminal multiplexer — split panes, detach/re-attach sessions, survive SSH drops" },
          { text: "tree",       explanation: "recursive directory listing as a visual tree — great for understanding project structure" },
          { text: "ncdu",       explanation: "NCurses Disk Usage — interactive TUI that shows which folders consume the most space" },
          { text: "bat",        explanation: "cat clone with syntax highlighting and line numbers — reads much better than plain cat" },
          { text: "ripgrep",    explanation: "ultra-fast recursive grep (rg command) — respects .gitignore by default, ideal for searching repos" }
        ],
        example: "# Start a tmux session that survives SSH disconnects:\ntmux new -s k3s\n# Detach: Ctrl+B, D\n# Re-attach later:\ntmux attach -t k3s\n\n# Find what's eating disk space:\nncdu /var/lib/rancher/k3s\n\n# Search all YAML files for 'replicas':\nrg 'replicas' --type yaml",
        why: "Tmux alone is worth it — run 'k3s kubectl get pods -w' inside tmux, detach, and check back hours later to see the full event history. No lost output."
      },
      {
        id: 55,
        commandTitle: "Configure bat Syntax Highlighting",
        command: "batcat --list-themes && mkdir -p ~/.config/bat && echo '--theme=\"Monokai Extended\"' > ~/.config/bat/config",
        searchTerms: "batcat bat syntax highlighting theme monokai config",
        description: "On Debian/Raspberry Pi OS, <code>bat</code> is installed as <code>batcat</code> (avoids name collision with another package). This command lists available themes and sets Monokai Extended as the default — much easier on the eyes than plain white text.",
        parts: [
          { text: "batcat --list-themes",                  explanation: "shows all installed syntax highlighting themes you can choose from" },
          { text: "mkdir -p ~/.config/bat",                explanation: "creates the config directory if it doesn't exist" },
          { text: "echo '--theme=\"Monokai Extended\"'",   explanation: "writes the theme preference to bat's config file — change Monokai Extended to any theme from the list" }
        ],
        example: "# After setting the theme, compare:\ncat /etc/rancher/k3s/k3s.yaml     # plain, hard to read\nbatcat /etc/rancher/k3s/k3s.yaml  # syntax-highlighted YAML with line numbers\n\n# Create an alias so 'bat' works too:\necho 'alias bat=batcat' >> ~/.bashrc && source ~/.bashrc",
        why: "YAML configs (k3s, cloudflared, Kubernetes manifests) are significantly easier to scan with syntax highlighting. One misplaced space in YAML breaks the whole file — batcat makes indentation errors pop visually."
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: KUBERNETES COMPANION TOOLS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Kubernetes Companion Tools',
    content: `
      <p>
        <strong>kubectl on its own is verbose — these tools cut the repetitive typing.</strong>
        Krew is the plugin manager for kubectl ("brew for kubectl"): install it once and you can
        pull community plugins with a single command, no compiling required. The ARM64 binary
        installs cleanly on the Pi.
      </p>
      <p>
        Then install the four plugins that pay for themselves immediately: <code>ctx</code> to
        switch clusters, <code>ns</code> to switch namespaces (so you stop typing <code>-n</code>
        on every command), <code>tail</code> to stream logs from many pods at once even as they
        restart, and <code>view-secret</code> to decode base64 Secrets without piping through
        <code>base64 -d</code>.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'k8s-tools',
    sectionTitle: 'Kubernetes Companion Tools',
    items: [
      {
        id: 56,
        commandTitle: "Install kubectl Plugins (krew)",
        command: "curl -fsSLO https://github.com/kubernetes-sigs/krew/releases/latest/download/krew-linux_arm64.tar.gz && tar -xzf krew-linux_arm64.tar.gz && ./krew-linux_arm64 install krew && echo 'export PATH=\"${KREW_ROOT:-$HOME/.krew}/bin:$PATH\"' >> ~/.bashrc && source ~/.bashrc",
        searchTerms: "krew kubectl plugin manager install arm64 linux",
        description: "Installs Krew, the kubectl plugin manager. Krew lets you extend kubectl with community plugins — think of it as 'brew for kubectl'. ARM64 binary, no compilation needed.",
        parts: [
          { text: "curl -fsSLO ...krew-linux_arm64.tar.gz", explanation: "downloads the ARM64 krew binary tarball from GitHub releases" },
          { text: "tar -xzf ...",                           explanation: "extracts the tarball in the current directory" },
          { text: "./krew-linux_arm64 install krew",        explanation: "runs the krew installer — copies the binary and sets up the plugin directory" },
          { text: "export PATH=...",                        explanation: "adds krew's bin directory to PATH so kubectl can find plugins" }
        ],
        example: "kubectl krew version\n# kubectl-krew v0.4.4\n\n# List available plugins:\nkubectl krew search",
        why: "kubectl plugins like 'ctx' (switch contexts), 'ns' (switch namespaces), and 'tail' (stream pod logs) save dozens of keystrokes per session. On a Pi, every saved second adds up."
      },
      {
        id: 57,
        commandTitle: "Install Useful kubectl Plugins",
        command: "kubectl krew install ctx ns tail view-secret",
        searchTerms: "kubectl ctx ns tail view-secret krew plugins install context namespace",
        description: "Installs the four most impactful kubectl plugins: <code>ctx</code> switches between kubeconfig contexts in one command, <code>ns</code> switches namespaces, <code>tail</code> streams logs from multiple pods at once, and <code>view-secret</code> decodes base64 Secrets without piping through base64 -d.",
        parts: [
          { text: "kubectl ctx",          explanation: "no more 'kubectl config use-context' — just 'kubectl ctx' with tab completion" },
          { text: "kubectl ns",           explanation: "switches the default namespace for all subsequent commands — 'kubectl ns kube-system'" },
          { text: "kubectl tail",         explanation: "tail -f for Kubernetes — streams logs from pods matching a label selector, even as they restart" },
          { text: "kubectl view-secret",  explanation: "decodes and pretty-prints Secret data without manual base64 piping" }
        ],
        example: "# Switch to the production context in one command:\nkubectl ctx pi5-k3s\n\n# Set default namespace so you never type -n again:\nkubectl ns default\n\n# Tail logs from all Node.js pods:\nkubectl tail -l app=node-api\n\n# Decode a Secret:\nkubectl view-secret postgres-secret",
        why: "'kubectl ns' alone eliminates the most common repetitive typing in Kubernetes workflows. Combined with 'ctx', you can bounce between clusters and namespaces in two keystrokes."
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: PI 5 SYSTEM TUNING
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Pi 5 System Tuning',
    content: `
      <p>
        <strong>Two small changes that prevent two annoying failure modes.</strong> First, turn
        off the services a headless k3s server has no use for — Bluetooth, Avahi, and
        triggerhappy — reclaiming a couple hundred megabytes of RAM that your containers would
        rather have. It's safe and reversible.
      </p>
      <p>
        Second, raise the kernel's inotify limits. Container runtimes and Node.js file watchers
        (nodemon, webpack, ts-node) each consume inotify instances and watches, and the stock
        limits are low enough that a busy cluster hits the ceiling — surfacing as the cryptic
        <code>ENOSPC: System limit for number of file watchers reached</code>. Set the limits
        once in <code>sysctl.conf</code> and the error never appears.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'tuning',
    sectionTitle: 'Pi 5 System Tuning',
    items: [
      {
        id: 58,
        commandTitle: "Disable Unnecessary Services",
        command: "sudo systemctl disable --now bluetooth avahi-daemon triggerhappy",
        searchTerms: "disable bluetooth avahi services free ram pi optimization",
        description: "Disables Bluetooth, Avahi (mDNS), and triggerhappy (input device handler) — three services that consume RAM and CPU on a headless Pi but serve no purpose when it's running as a k3s server.",
        parts: [
          { text: "systemctl disable --now",   explanation: "stops the service immediately AND prevents it from starting on boot" },
          { text: "bluetooth",                 explanation: "Bluetooth daemon — useless on a headless server, frees ~15-20 MB RAM" },
          { text: "avahi-daemon",              explanation: "mDNS/Bonjour — redundant if you use static IPs or /etc/hosts for Pi discovery" },
          { text: "triggerhappy",              explanation: "handles keyboard/multimedia keys — meaningless on a server with no keyboard attached" }
        ],
        example: "# Before:\nfree -h\n# Mem:  7.5Gi  1.8Gi used\n\n# After:\nfree -h\n# Mem:  7.5Gi  1.6Gi used  (~200MB saved across these + related services)",
        why: "Every megabyte counts on an 8GB Pi when k3s + Postgres + Node.js containers are competing for RAM. Disabling these services is safe and reversible: 'sudo systemctl enable bluetooth' to undo."
      },
      {
        id: 59,
        commandTitle: "Increase Kernel Watchdog for Containers",
        command: "echo 'fs.inotify.max_user_instances=8192' | sudo tee -a /etc/sysctl.conf && echo 'fs.inotify.max_user_watches=524288' | sudo tee -a /etc/sysctl.conf && sudo sysctl -p",
        searchTerms: "inotify max_user_instances max_user_watches sysctl kernel containers",
        description: "Raises kernel inotify limits. Node.js file watchers (nodemon, webpack, ts-node) and container runtimes can exhaust the default limits, causing 'ENOSPC: System limit for number of file watchers reached' errors.",
        parts: [
          { text: "fs.inotify.max_user_instances=8192",   explanation: "maximum number of inotify instances per user — a container runtime creates one per container" },
          { text: "fs.inotify.max_user_watches=524288",   explanation: "maximum number of files a single user can watch — Node.js watchers can consume hundreds per project" },
          { text: "sudo tee -a /etc/sysctl.conf",          explanation: "appends the setting to the persistent config file (survives reboots)" },
          { text: "sudo sysctl -p",                        explanation: "applies the settings immediately without rebooting" }
        ],
        example: "# Verify the new limits:\nsysctl fs.inotify.max_user_instances\n# fs.inotify.max_user_instances = 8192\n\nsysctl fs.inotify.max_user_watches\n# fs.inotify.max_user_watches = 524288",
        why: "If you ever see 'Error: ENOSPC: System limit for number of file watchers reached' when running Node.js in a container, these limits are the fix. Set them once and forget."
      },
    ],
  },

  // ── Closing: What's Next ──────────────────────────────────────────────────

  {
    type: 'note',
    variant: 'info',
    content: `
      <strong>✅ Pi prepped? Here's what's next.</strong> With the toolbelt installed,
      diagnostics ready, and the system tuned, the Pi is a proper headless server. Head to the
      <strong>Setup Guide for Raspberry Pi 5</strong> to run the pre-flight checks and install
      k3s. The Krew plugins you set up here (<code>ctx</code>, <code>ns</code>, <code>tail</code>)
      will make everything that follows faster to operate.
    `,
  },

];
