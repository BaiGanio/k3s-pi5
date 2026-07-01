window.commandData = [

  // ── TCP & SSH over the Tunnel ─────────────────────────────
  {
    id: 500, section: "tcp", sectionTitle: "TCP & SSH over the Tunnel",
    commandTitle: "Route a TCP Service Through the Tunnel",
    command: "nano ~/.cloudflared/config.yml",
    searchTerms: "cloudflared tcp postgres redis mysql database tunnel service config non-http",
    description: "HTTP apps ride the <code>*.yourdomain.com → http://localhost</code> wildcard straight into Traefik. But databases (Postgres, Redis, MySQL) speak <b>raw TCP, not HTTP</b> — the wildcard can't carry them. Add an explicit <code>tcp://</code> entry <b>above</b> the wildcard, then restart cloudflared. The DNS side is already handled by your wildcard CNAME — no new DNS record needed.",
    parts: [
      { text: "- hostname: db.yourdomain.com",   explanation: "the subdomain — already resolves via your wildcard CNAME, so nothing to add in DNS" },
      { text: "service: tcp://localhost:5432",   explanation: "forwards raw TCP to the local Postgres port; use 6379 for Redis, 3306 for MySQL" },
      { text: "placement ABOVE the wildcard",    explanation: "cloudflared matches top-to-bottom and stops at the first hit — below the wildcard it'd be swallowed by http://localhost and treated as HTTP" },
      { text: "sudo systemctl restart cloudflared", explanation: "config.yml is NOT hot-reloaded — the tunnel must restart to see the new route" }
    ],
    example: "# ~/.cloudflared/config.yml\ntunnel: 3i-atlas\ncredentials-file: /home/lk/.cloudflared/<uuid>.json\n\ningress:\n  - hostname: db.yourdomain.com      # ← explicit TCP entry, ABOVE the wildcard\n    service: tcp://localhost:5432\n  - hostname: ssh.yourdomain.com\n    service: ssh://localhost:22\n  - hostname: dashboard.yourdomain.com\n    service: http://localhost:80\n  - hostname: \"*.yourdomain.com\"      # ← wildcard catch-all (HTTP only)\n    service: http://localhost\n  - service: http_status:404\n\n# Apply it:\nsudo systemctl restart cloudflared",
    why: "The wildcard sends everything to Traefik on port 80 as HTTP. A database behind that receives an HTTP request instead of the Postgres wire protocol and the connection fails. Explicit tcp:// entries bypass Traefik entirely and forward bytes untouched."
  },

  {
    id: 501, section: "tcp", sectionTitle: "TCP & SSH over the Tunnel",
    commandTitle: "Lock TCP Hostnames Behind Cloudflare Access",
    command: "cloudflared access login https://db.yourdomain.com",
    searchTerms: "cloudflare access zero trust policy protect database ssh authentication login token",
    description: "A wildcard CNAME means <code>db.yourdomain.com</code> is publicly resolvable — you do <b>not</b> want an open, unauthenticated database or SSH port on the internet. First create a self-hosted <b>Access application</b> in the Cloudflare Zero Trust dashboard (Access → Applications → Add → Self-hosted) for the hostname, with a policy that only allows your email. Then this command authenticates your client and caches a short-lived token.",
    parts: [
      { text: "Zero Trust dashboard → Access → Applications", explanation: "where you create the self-hosted app + policy — this is console-based, not CLI" },
      { text: "policy: allow email = you@example.com",         explanation: "the rule that gates who can reach db/ssh — everyone else is blocked at Cloudflare's edge" },
      { text: "cloudflared access login <url>",                explanation: "opens a browser to authenticate, then caches a token so tcp/ssh sessions don't prompt every time" }
    ],
    example: "# After creating the Access app + policy in the dashboard:\ncloudflared access login https://db.yourdomain.com\n# A browser opens → log in → \"Successfully fetched your token\"\n\n# Without a policy, anyone who guesses the hostname can reach the raw port.\n# With one, unauthenticated connections are rejected before they touch the Pi.",
    why: "Exposing a database or SSH over a tunnel is only safe with Access in front. The tunnel hides your home IP, but Access is what actually authenticates the person connecting. Treat it as mandatory for anything non-HTTP."
  },

  {
    id: 502, section: "tcp", sectionTitle: "TCP & SSH over the Tunnel",
    commandTitle: "Reach the Database From Your Mac",
    command: "cloudflared access tcp --hostname db.yourdomain.com --url localhost:5432",
    searchTerms: "cloudflared access tcp database postgres psql client mac connect proxy",
    description: "Opens a local proxy on your Mac: <code>localhost:5432</code> → through the tunnel → Postgres on the Pi. Leave it running in one terminal, then point <code>psql</code> or any DB GUI (TablePlus, DBeaver) at <code>localhost</code>. Requires <code>cloudflared</code> on the Mac (<code>brew install cloudflared</code>).",
    parts: [
      { text: "cloudflared access tcp", explanation: "runs a local TCP proxy that forwards through the authenticated tunnel" },
      { text: "--hostname db.yourdomain.com", explanation: "the tunnel hostname you configured with a tcp:// service" },
      { text: "--url localhost:5432", explanation: "the local port on your Mac the proxy listens on — connect your client here" }
    ],
    example: "# Terminal 1 — start the proxy (leave running):\ncloudflared access tcp --hostname db.yourdomain.com --url localhost:5432\n\n# Terminal 2 — connect as if the DB were local:\npsql -h localhost -p 5432 -U lk mydb\n# or point TablePlus/DBeaver at localhost:5432",
    why: "Your database is never a publicly open port — the only path in is an authenticated cloudflared session. Compare to forwarding 5432 on your router: that exposes Postgres to the entire internet and the credential-stuffing bots that scan it."
  },

  {
    id: 503, section: "tcp", sectionTitle: "TCP & SSH over the Tunnel",
    commandTitle: "SSH to the Pi From Anywhere",
    command: "ssh lk@ssh.yourdomain.com",
    searchTerms: "cloudflared access ssh proxycommand tunnel remote ssh config away from home lan ip",
    description: "At home, <code>ssh lk@192.168.x.x</code> is simplest (same LAN). Away from home the private IP is unreachable — route SSH through the tunnel instead. Install <code>cloudflared</code> on your Mac (<code>brew install cloudflared</code>), add a <code>ProxyCommand</code> to <code>~/.ssh/config</code>, and then plain <code>ssh</code> just works from anywhere — no open port 22, no public IP needed.",
    parts: [
      { text: "brew install cloudflared", explanation: "the client needs cloudflared to speak to the tunnel — install it on your Mac once" },
      { text: "ProxyCommand cloudflared access ssh --hostname %h", explanation: "tells ssh to tunnel the connection through cloudflared; %h expands to the host you're connecting to" },
      { text: "ssh lk@ssh.yourdomain.com", explanation: "with the config in place, this reaches the Pi from any network on earth" }
    ],
    example: "# ~/.ssh/config on your Mac:\nHost ssh.yourdomain.com\n  ProxyCommand cloudflared access ssh --hostname %h\n  User lk\n\n# Then, from anywhere:\nssh ssh.yourdomain.com\n\n# At home you can still use the fast LAN path:\nssh lk@192.168.x.x",
    why: "The LAN IP only works on your home network. The tunnel gives you SSH from anywhere without opening port 22 to the internet or needing a static public IP. Pair it with a Cloudflare Access policy (previous step) so only you can even reach the login prompt."
  }
];
