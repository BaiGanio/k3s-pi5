// modules/k3s-pi5/cloudflare-tunnel-pi5.js
// Cloudflare Tunnel on Pi 5 — expose local k3s services to the internet with no open ports

window.pageBlocks = [

  // ── What is a Cloudflare Tunnel? ──────────────────────────────────────────

  {
    type: 'prose',
    title: 'Cloudflare Tunnel: Public Access Without Open Ports',
    content: `
      <p>
        <strong>A Cloudflare Tunnel makes your Pi reachable from anywhere without opening a
        single inbound port.</strong> Instead of forwarding ports on your router and exposing
        your home IP, the <code>cloudflared</code> daemon dials <em>outbound</em> to
        Cloudflare's edge and holds that connection open. Public requests hit Cloudflare, get
        TLS-terminated there, and are routed back down the tunnel to the Traefik ingress
        running on port 80 of your Pi.
      </p>
      <p>
        The result: no port forwarding, no static public IP, no firewall holes. Your router
        stays closed, and Cloudflare's network sits in front as TLS, DDoS protection, and a
        stable public hostname.
      </p>

      <h4>What's Inside</h4>
      <p>
        Two sections, run in order:
      </p>
      <ul>
        <li><strong>Pre-flight Checks</strong> — is <code>cloudflared</code> installed, is it up to date, and do you already have a tunnel? Creating a duplicate tunnel name fails, and a stale binary logs confusing warnings — catch both here.</li>
        <li><strong>Cloudflare Tunnel</strong> — install the ARM64 binary, authenticate against your account, create a named tunnel, write the routing config, create the DNS records, test it in the foreground, then run it 24/7 as a systemd service.</li>
      </ul>

      <h4>How to Use This</h4>
      <p>
        <strong>Work top to bottom.</strong> The step people get wrong is DNS routing:
        <code>config.yml</code> only decides where traffic goes <em>once it has reached the
        Pi</em>, but each hostname still needs a CNAME pointing at the tunnel or the request
        never leaves Cloudflare's edge. If your domain throws a 1016 error, that missing CNAME
        is almost always why.
      </p>
    `,
  },

  // ── Three rules for tunnels ───────────────────────────────────────────────

  {
    type: 'note',
    variant: 'tip',
    content: `
      <strong>Three rules for Cloudflare Tunnels on a Pi 5:</strong>
      <ol style="margin-top: 0.5rem; padding-left: 1.5rem;">
        <li><strong>Outbound only.</strong> The whole point is that no inbound ports are open.
            If you find yourself port-forwarding on the router, you've misunderstood the
            model — <code>cloudflared</code> dials out, traffic comes back down the same pipe.</li>
        <li><strong>config.yml routes, DNS delivers.</strong> They are two separate steps. A
            perfect <code>config.yml</code> with no matching CNAME means the request never
            arrives (Cloudflare 1016). Every hostname needs a route.</li>
        <li><strong>Test in the foreground first.</strong> Run <code>cloudflared tunnel run</code>
            interactively before you wrap it in systemd. If it fails there, the service will
            fail too — and debugging live beats reading <code>journalctl</code>.</li>
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
        <strong>Check the ground before you build the tunnel.</strong> Three quick questions:
        Is <code>cloudflared</code> installed at all? Is it current — a stale binary logs a
        <code>WRN Your version is outdated</code> at startup but won't refuse to run, so it's
        easy to miss? And do you already have a tunnel — because creating a second one with the
        same name fails outright?
      </p>
      <p>
        If a tunnel already exists, you can skip <code>tunnel create</code> entirely and go
        straight to the config file; you just need the credentials JSON that was generated when
        it was first created.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'preflight',
    sectionTitle: 'Pre-flight Checks',
    items: [
      {
        id: 97,
        commandTitle: "Check for cloudflared Updates",
        command: "LOCAL=$(cloudflared --version 2>/dev/null | grep -oE '[0-9]+\\.[0-9]+\\.[0-9]+' | head -1); LATEST=$(curl -s https://api.github.com/repos/cloudflare/cloudflared/releases/latest | jq -r .tag_name); echo \"Installed: ${LOCAL:-none}  |  Latest: $LATEST\"; if [ -n \"$LOCAL\" ] && [ \"$LOCAL\" != \"$LATEST\" ]; then echo \"\"; echo \"⚠️  Update available — run:\"; echo \"  wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 && chmod +x cloudflared-linux-arm64 && sudo mv cloudflared-linux-arm64 /usr/local/bin/cloudflared\"; fi",
        searchTerms: "cloudflared update upgrade version check latest outdated",
        description: "Compares your installed cloudflared version against the latest GitHub release. If they differ, it prints the exact <code>wget</code> one-liner you need to update — no guesswork, just copy and paste.",
        parts: [
          { text: "cloudflared --version | grep -oE ...",    explanation: "extracts just the semver (e.g. 2026.5.0) from the version string" },
          { text: "curl -s .../releases/latest | jq -r .tag_name", explanation: "fetches the latest release tag from GitHub's API — no auth required" },
          { text: "[ \"$LOCAL\" != \"$LATEST\" ]",          explanation: "compares the two versions; if they differ, the block inside prints the update command" },
          { text: "2>/dev/null",                             explanation: "suppresses errors if cloudflared isn't installed yet — LOCAL becomes 'none'" }
        ],
        example: "# Up to date:\nInstalled: 2026.6.1  |  Latest: 2026.6.1\n\n# Outdated:\nInstalled: 2026.5.0  |  Latest: 2026.6.1\n\n⚠️  Update available — run:\n  wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 && chmod +x cloudflared-linux-arm64 && sudo mv cloudflared-linux-arm64 /usr/local/bin/cloudflared",
        why: "cloudflared logs a warning at startup when outdated but won't refuse to run. Catching it here prevents the 'WRN Your version X is outdated' surprise in journalctl later. The update command is the same as the install command — download, chmod, move."
      },
      {
        id: 98,
        commandTitle: "Check if cloudflared Is Installed",
        command: "which cloudflared && cloudflared --version || echo 'cloudflared NOT installed'",
        searchTerms: "cloudflared installed check which version binary path",
        description: "Checks whether the <code>cloudflared</code> binary exists on your PATH and prints its version. If not found, the <code>||</code> fallback prints a clear message instead of a cryptic error.",
        parts: [
          { text: "which cloudflared",     explanation: "locates the binary on PATH — returns the full path if found, empty if not" },
          { text: "cloudflared --version", explanation: "prints the installed version — only runs if 'which' succeeded" },
          { text: "|| echo '...'",         explanation: "fallback: runs only if the left side failed — tells you cloudflared isn't there" }
        ],
        example: "# Installed:\n/usr/local/bin/cloudflared\ncloudflared version 2024.10.0 (built 2024-10-01)\n\n# Not installed:\ncloudflared NOT installed",
        why: "Skip the download step if cloudflared is already present. This also catches partial installs — if 'which' finds a broken binary, cloudflared --version will fail and the || branch fires."
      },
      {
        id: 99,
        commandTitle: "List Existing Tunnels",
        command: "cloudflared tunnel list",
        searchTerms: "cloudflared tunnel list existing check status connections",
        description: "Shows all tunnels registered in your Cloudflare account with their IDs, names, creation dates, and active connection counts. Run this before creating a new tunnel to avoid duplicates.",
        parts: [
          { text: "cloudflared tunnel list", explanation: "queries Cloudflare's API for all tunnels linked to your account" },
          { text: "CONNECTIONS column",      explanation: "number of active edge connections — 0 means the tunnel exists but isn't running anywhere" }
        ],
        example: "ID                                   NAME    CREATED              CONNECTIONS\nabc123def456-7890-abcd-ef01-234567890abc  my-pi   2024-06-15T10:30:00Z  2xLHR\nxyz789ghi012-3456-wxyz-7890-123456789012  old-tun  2024-05-01T08:00:00Z  0\n\n# 0 CONNECTIONS = tunnel registered but not running\n# 2xLHR = 2 connections through London edge — healthy!",
        why: "Creating a second tunnel with the same name will fail. If you already have a tunnel, you can skip 'tunnel create' and go straight to the config file — you just need the credentials JSON that was generated at creation time."
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: CLOUDFLARE TUNNEL
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Cloudflare Tunnel',
    content: `
      <p>
        <strong>The build sequence, start to finish.</strong> Install the ARM64 binary,
        authenticate in a browser (which saves a <code>cert.pem</code> proving you own the
        account), then create a named tunnel — that generates a per-tunnel credentials JSON
        file named after the tunnel's UUID, not its name. Capture that UUID, write the
        <code>config.yml</code> that maps your hostnames to the local Traefik ingress, and
        create the DNS records that actually deliver traffic to the tunnel.
      </p>
      <p>
        Once the pieces are in place, test the tunnel in the foreground to confirm it connects.
        Only then wrap it in a systemd service so it starts on boot, restarts on failure, and
        survives your SSH session ending. Two things trip people up: the credentials file is
        named by <strong>UUID</strong> (not tunnel name), and <strong>routing DNS is a separate
        step</strong> from writing <code>config.yml</code>.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'cloudflare',
    sectionTitle: 'Cloudflare Tunnel',
    items: [
      {
        id: 100,
        commandTitle: "Install cloudflared (ARM64)",
        command: "wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 && chmod +x cloudflared-linux-arm64 && sudo mv cloudflared-linux-arm64 /usr/local/bin/cloudflared",
        searchTerms: "cloudflared install wget arm64 raspberry pi binary",
        description: "Downloads the cloudflared ARM64 binary, makes it executable, and moves it to the system PATH. Required before any tunnel commands.",
        parts: [
          { text: "wget -q ...",          explanation: "silently downloads the latest ARM64 release from GitHub" },
          { text: "chmod +x ...",         explanation: "makes the binary executable" },
          { text: "sudo mv ... /usr/local/bin/cloudflared", explanation: "installs it system-wide so any user can run cloudflared" }
        ],
        example: "cloudflared --version\n# cloudflared version 2024.x.x",
        why: "The Pi 5 runs ARM64. Downloading the wrong architecture binary will silently fail or produce an 'Exec format error'."
      },
      {
        id: 101,
        commandTitle: "Authenticate with Cloudflare",
        command: "cloudflared tunnel login",
        searchTerms: "cloudflared tunnel login authenticate cert.pem",
        description: "Authenticates your Pi with your Cloudflare account. Opens a browser, you log in and select a domain, and a certificate is saved locally at ~/.cloudflared/cert.pem.",
        parts: [
          { text: "cloudflared", explanation: "Cloudflare's tunnel client" },
          { text: "tunnel",      explanation: "subcommand for tunnel operations" },
          { text: "login",       explanation: "authenticate with your Cloudflare account" }
        ],
        example: "Please open the following URL and log in with your Cloudflare account:\nhttps://dash.cloudflare.com/argotunnel?...\n\n# After login:\nYou have successfully logged in.\nIf you wish to copy your credentials to a server, they have been saved to:\n/home/pi/.cloudflared/cert.pem",
        why: "The certificate proves you own the Cloudflare account. Without it, tunnel creation will be rejected."
      },
      {
        id: 102,
        commandTitle: "Create a Tunnel",
        command: "cloudflared tunnel create my-pi",
        searchTerms: "cloudflared tunnel create name credentials json",
        description: "Creates a named tunnel. \"my-pi\" is just a label — pick something meaningful. Generates a unique credentials JSON file for this tunnel.",
        parts: [
          { text: "cloudflared tunnel create", explanation: "registers a new tunnel in your Cloudflare account" },
          { text: "my-pi",                     explanation: "the name you choose — used to reference this tunnel later" }
        ],
        example: "Tunnel credentials written to /home/pi/.cloudflared/abc123def456.json\nTunnel my-pi created with ID abc123def456",
        why: "Each tunnel gets unique credentials. You reference this name in config.yml and when running the tunnel."
      },
      {
        id: 103,
        commandTitle: "Save Tunnel ID to Variable",
        command: "TUNNEL_ID=$(cloudflared tunnel list | grep my-pi | awk '{print $1}')\necho $TUNNEL_ID",
        searchTerms: "tunnel id save variable awk grep",
        description: "Captures the tunnel UUID into a shell variable so you can use it in the config file without copy-pasting.",
        parts: [
          { text: "cloudflared tunnel list", explanation: "lists all tunnels in your account" },
          { text: "grep my-pi",             explanation: "filters to only the row for your tunnel" },
          { text: "awk '{print $1}'",       explanation: "extracts the first column — the UUID" },
          { text: "echo $TUNNEL_ID",        explanation: "prints the captured value to confirm it" }
        ],
        example: "abc123def456-7890-abcd-ef01-234567890abc",
        why: "The credentials file is named after the UUID, not the tunnel name. You need this to write the config.yml correctly."
      },
      {
        id: 104,
        commandTitle: "Create Tunnel Config File",
        command: "nano ~/.cloudflared/config.yml",
        searchTerms: "config yml cloudflared ingress hostname service",
        description: "Creates the tunnel routing config. Maps your Cloudflare domain(s) to the k3s Traefik ingress running on port 80 of the Pi.",
        parts: [
          { text: "tunnel: my-pi",                          explanation: "must match the tunnel name you created" },
          { text: "credentials-file:",                      explanation: "path to the JSON file generated by tunnel create" },
          { text: "- hostname: yourdomain.com",             explanation: "routes root domain to your local k3s Traefik ingress" },
          { text: "- hostname: \"*.yourdomain.com\"",       explanation: "catches all subdomains — app.yourdomain.com, api.yourdomain.com, etc." },
          { text: "- service: http_status:404",             explanation: "catch-all: returns 404 for any unmapped hostname" }
        ],
        example: "# ~/.cloudflared/config.yml\ntunnel: my-pi\ncredentials-file: /home/pi/.cloudflared/abc123def456.json\n\ningress:\n  - hostname: yourdomain.com\n    service: http://localhost\n  - hostname: \"*.yourdomain.com\"\n    service: http://localhost\n  - service: http_status:404",
        why: "Without this file, cloudflared doesn't know where to forward traffic. The wildcard hostname entry is what lets subdomains like api.yourdomain.com reach your Node.js services."
      },
      {
        id: 108,
        commandTitle: "Route DNS to the Tunnel",
        command: "cloudflared tunnel route dns my-pi dashboard.yourdomain.com",
        searchTerms: "cloudflared tunnel route dns cname subdomain wildcard record 1016",
        description: "Creates the DNS record that points a hostname at your tunnel. This is the step most people miss: <code>config.yml</code> only <em>routes</em> traffic once it reaches the Pi, but the hostname still needs a CNAME to <code>&lt;tunnel-id&gt;.cfargotunnel.com</code> or the request never leaves Cloudflare's edge. Run it once per subdomain you expose.",
        parts: [
          { text: "cloudflared tunnel route dns", explanation: "creates a proxied CNAME in Cloudflare DNS pointing the hostname at this tunnel" },
          { text: "my-pi",                        explanation: "the tunnel name (or UUID) the record should point to" },
          { text: "dashboard.yourdomain.com",     explanation: "the exact hostname to route — run again for api.yourdomain.com, etc." }
        ],
        example: "# One record per subdomain you use:\ncloudflared tunnel route dns my-pi dashboard.yourdomain.com\ncloudflared tunnel route dns my-pi api.yourdomain.com\n# INF Added CNAME dashboard.yourdomain.com which will route to this tunnel...\n\n# Want one wildcard instead? cloudflared can't create wildcard records —\n# add it by hand in the Cloudflare dashboard (DNS → Records):\n#   Type: CNAME   Name: *   Target: <tunnel-id>.cfargotunnel.com   Proxied: ON\n\n# Verify it resolves to the tunnel:\ndig +short dashboard.yourdomain.com",
        why: "If the browser shows a Cloudflare 1016 / DNS error, or the request simply never reaches the Pi, this missing CNAME is almost always why. The wildcard '*.yourdomain.com' block in config.yml does nothing until a matching wildcard CNAME exists in DNS."
      },
      {
        id: 105,
        commandTitle: "Test Tunnel Manually",
        command: "cloudflared tunnel run my-pi",
        searchTerms: "cloudflared tunnel run test connection edge",
        description: "Starts the tunnel in the foreground to verify connectivity before setting up a systemd service. Press Ctrl+C to stop.",
        parts: [
          { text: "cloudflared tunnel run", explanation: "connects the tunnel to Cloudflare's edge network" },
          { text: "my-pi",                  explanation: "the tunnel name to run" }
        ],
        example: "2024/01/01 10:00:00 INF Starting tunnel tunnelID=abc123\n2024/01/01 10:00:01 INF Registered tunnel connection connIndex=0 ip=198.41.200.x\n2024/01/01 10:00:01 INF Connection abc123 registered with protocol=h2mux",
        why: "Always test manually first. If this fails, your systemd service will also fail — and it's much easier to debug interactively."
      },
      {
        id: 106,
        commandTitle: "Create Systemd Service for Tunnel",
        command: "sudo nano /etc/systemd/system/cloudflared.service",
        searchTerms: "systemd service cloudflared auto-start boot persistent",
        description: "Creates a systemd unit so the tunnel starts automatically on boot and restarts on failure.",
        parts: [
          { text: "After=network.target",                    explanation: "ensures tunnel starts only after networking is up" },
          { text: "ExecStart=... tunnel run my-pi",          explanation: "the command systemd runs to start the tunnel" },
          { text: "Restart=on-failure",                      explanation: "automatically restarts if the process crashes" },
          { text: "RestartSec=5s",                           explanation: "waits 5 seconds before attempting a restart" }
        ],
        example: "[Unit]\nDescription=Cloudflare Tunnel\nAfter=network.target\nWants=network-online.target\n\n[Service]\nType=simple\nUser=pi\nWorkingDirectory=/home/pi/.cloudflared\nExecStart=/usr/local/bin/cloudflared tunnel run my-pi\nRestart=on-failure\nRestartSec=5s\n\n[Install]\nWantedBy=multi-user.target",
        why: "Without a systemd service the tunnel dies when your SSH session ends. This keeps it running 24/7."
      },
      {
        id: 107,
        commandTitle: "Enable & Start Tunnel Service",
        command: "sudo systemctl daemon-reload && sudo systemctl enable cloudflared && sudo systemctl start cloudflared",
        searchTerms: "systemctl enable start daemon-reload cloudflared",
        description: "Reloads systemd to pick up the new unit file, enables it on boot, and starts it immediately.",
        parts: [
          { text: "daemon-reload",        explanation: "tells systemd to re-read unit files from disk" },
          { text: "enable cloudflared",   explanation: "creates symlinks so it starts on boot" },
          { text: "start cloudflared",    explanation: "starts the tunnel right now without rebooting" }
        ],
        example: "# Check it's running:\nsudo systemctl status cloudflared\n# ● cloudflared.service - Cloudflare Tunnel\n#    Active: active (running) since ...\n\n# Follow live logs:\nsudo journalctl -u cloudflared -f",
        why: "daemon-reload is required whenever you create or edit a unit file — systemd won't see changes otherwise."
      },
    ],
  },

  // ── Closing: What's Next ──────────────────────────────────────────────────

  {
    type: 'note',
    variant: 'info',
    content: `
      <strong>✅ Tunnel up? Here's what's next.</strong> Once
      <code>systemctl status cloudflared</code> shows <code>active (running)</code> and your
      domain resolves, your local k3s services are reachable worldwide — with Cloudflare TLS
      and DDoS protection in front, and not a single port open on your router. To route
      individual apps to their own hostnames, see the <strong>Nginx Ingress Controller with
      Traefik</strong> module. To carry non-HTTP services — Postgres, Redis, SSH — over the
      same tunnel, see <strong>Cloudflare Tunnel — TCP, Databases & SSH</strong>.
    `,
  },

];
