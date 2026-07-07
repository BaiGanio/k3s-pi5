// modules/k3s-pi5/cloudflare-tcp.js
// Cloudflare Tunnel — TCP, Databases & SSH: carry non-HTTP services over the same tunnel

window.pageBlocks = [

  // ── What is this module? ──────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'TCP, Databases & SSH: Beyond HTTP',
    content: `
      <p>
        <strong>The HTTP tunnel only carries HTTP.</strong> In the <em>Cloudflare Tunnel on Pi 5</em>
        module you set up the HTTP routes — <code>baiganio.io</code>, <code>dashboard.</code> and
        <code>api. → http://localhost:80</code> — which send web traffic to Traefik. But a
        database or an SSH server does not speak HTTP;
        it speaks its own raw <strong>TCP</strong> protocol. Push Postgres wire-protocol bytes
        through an HTTP route and the connection just fails. This module adds the explicit
        <code>tcp://</code> and <code>ssh://</code> routes that carry those services over the
        <em>same</em> tunnel — no second tunnel, no open ports on your router.
      </p>

      <h4>HTTP vs Non-HTTP: the mental model</h4>
      <ul>
        <li><strong>HTTP apps</strong> ride an <code>http://localhost:80</code> route into Traefik, which routes by hostname. The <em>client</em> (a browser) needs nothing special.</li>
        <li><strong>TCP / SSH</strong> bypass Traefik entirely — an explicit route forwards raw bytes straight to a local port. But the <em>client</em> (your Mac) now needs <code>cloudflared</code> installed too, running a local proxy (<code>cloudflared access tcp</code>) or an SSH <code>ProxyCommand</code>. This asymmetry catches people out: HTTP is server-side only; TCP/SSH is server <em>and</em> client.</li>
      </ul>

      <h4>What's Inside</h4>
      <ul>
        <li><strong>Route a TCP service</strong> — add a <code>tcp://</code> entry above the HTTP entries for the SQL Server / Postgres NodePorts.</li>
        <li><strong>Lock it behind Cloudflare Access</strong> — the DB hostnames are publicly resolvable, so a Zero Trust policy is mandatory for <code>db.</code>/<code>pg.</code> (SSH is the exception — its own key auth guards it).</li>
        <li><strong>Reach the database from your Mac</strong> — a local <code>cloudflared</code> proxy so <code>psql</code>/TablePlus/DBeaver connect to <code>localhost</code>.</li>
        <li><strong>SSH from anywhere</strong> — a <code>ProxyCommand</code> that reaches the Pi off your LAN without opening port 22, and without an Access application.</li>
      </ul>

      <h4>How to Use This</h4>
      <p>
        This assumes you already have a working tunnel. <strong>Note:</strong> the
        <code>baiganio.io</code> setup uses <em>explicit per-host CNAMEs</em>, not a wildcard — so
        each of <code>db.</code>, <code>pg.</code> and <code>ssh.</code> needs its own
        <code>cloudflared tunnel route dns</code> record (created in the main tunnel module),
        <em>plus</em> an entry in <code>config.yml</code>. And because the databases run as k3s
        pods (not on the host's <code>localhost</code>), each <code>tcp://</code> route points at a
        <strong>NodePort</strong>, not the raw DB port — see the note at the bottom.
        <strong>Do the Access policy before you expose the DB routes</strong>, not after.
      </p>
    `,
  },

  // ── Three rules for TCP over the tunnel ───────────────────────────────────

  {
    type: 'note',
    variant: 'warning',
    content: `
      <strong>Three rules for non-HTTP services over the tunnel:</strong>
      <ol style="margin-top: 0.5rem; padding-left: 1.5rem;">
        <li><strong>Access is mandatory for raw DB ports — SSH is the exception.</strong>
            <code>db.baiganio.io</code> and <code>pg.baiganio.io</code> forward straight to a
            NodePort with no auth of their own, so a Cloudflare Access policy is the only thing
            between them and the credential-stuffing bots — create it <em>first</em>.
            <code>ssh.baiganio.io</code> is different: SSH's own key auth is the gate, so this
            deployment runs it <em>without</em> an Access application (see the SSH card). You
            <em>may</em> still wrap it in Access for a second layer, but it isn't required.</li>
        <li><strong>Explicit routes go ABOVE the HTTP entries.</strong> cloudflared matches
            top-to-bottom and stops at the first hit. A <code>tcp://</code> entry <em>below</em>
            an <code>http://localhost</code> entry (or a wildcard) gets swallowed and treated as
            HTTP — which fails. And restart cloudflared: <code>config.yml</code> is not
            hot-reloaded.</li>
        <li><strong>The client needs cloudflared too.</strong> Unlike HTTP, TCP/SSH require
            <code>cloudflared</code> on your Mac plus a local proxy or SSH
            <code>ProxyCommand</code>. There is no browser doing the work for you.</li>
      </ol>
    `,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: TCP & SSH OVER THE TUNNEL
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'TCP & SSH over the Tunnel',
    content: `
      <p>
        <strong>Two moves on the Pi, two on your Mac.</strong> On the Pi: add the explicit
        <code>tcp://</code>/<code>ssh://</code> route to <code>config.yml</code> (above the
        HTTP entries) and restart the tunnel. In the Cloudflare Zero Trust dashboard: create a
        Public DNS Access application for the DB hostnames with a policy that only lets
        <em>you</em> in (SSH is exempt — see its card).
      </p>
      <p>
        Then on your Mac you connect. For a database, run a local <code>cloudflared access tcp</code>
        proxy and point your client at <code>localhost</code> as if the DB were sitting on your
        machine. For SSH, a one-line <code>ProxyCommand</code> in <code>~/.ssh/config</code> makes
        plain <code>ssh</code> reach the Pi from any network — while the fast LAN path still works
        when you're home.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'tcp',
    sectionTitle: 'TCP & SSH over the Tunnel',
    items: [
      {
        id: 500,
        commandTitle: "Route a TCP Service Through the Tunnel",
        command: "nano ~/.cloudflared/config.yml",
        searchTerms: "cloudflared tcp postgres redis mysql database tunnel service config non-http",
        description: "HTTP apps (root, <code>dashboard.</code>, <code>api.</code>) ride <code>http://localhost:80</code> into Traefik. But SQL Server and Postgres speak <b>raw TCP, not HTTP</b> — Traefik can't carry them. Add explicit <code>tcp://</code>/<code>ssh://</code> entries <b>above</b> the HTTP block, then restart cloudflared. Because the DBs run as k3s pods, the <code>tcp://</code> targets are the <b>NodePorts</b> (31433 / 30432), not 1433 / 5432 — see the bottom note. And each hostname needs its own DNS route (no wildcard here).",
        parts: [
          { text: "- hostname: db.baiganio.io",   explanation: "SQL Server — needs its own `cloudflared tunnel route dns` record (explicit per-host, no wildcard)" },
          { text: "service: tcp://localhost:31433", explanation: "forwards raw TCP to the sqlserver-nodeport NodePort on the host; Postgres uses 30432" },
          { text: "placement ABOVE the HTTP block", explanation: "cloudflared matches top-to-bottom and stops at the first hit — below an http:// entry it'd be swallowed and treated as HTTP" },
          { text: "sudo systemctl restart cloudflared", explanation: "config.yml is NOT hot-reloaded — the tunnel must restart to see the new route" }
        ],
        example: "# ~/.cloudflared/config.yml\ntunnel: 3i-atlas\ncredentials-file: /home/lk/.cloudflared/c8a4afad-c3bc-4b46-a1b9-1650cbc7fd52.json\n\ningress:\n  # ── Non-HTTP: MUST be above the HTTP entries ──\n  - hostname: ssh.baiganio.io\n    service: ssh://localhost:22          # Pi's own sshd, on the host\n  - hostname: db.baiganio.io\n    service: tcp://localhost:31433       # SQL Server via sqlserver-nodeport\n  - hostname: pg.baiganio.io\n    service: tcp://localhost:30432       # Postgres via postgres-nodeport\n  # ── HTTP: into Traefik on :80 ──\n  - hostname: baiganio.io\n    service: http://localhost:80\n  - hostname: dashboard.baiganio.io\n    service: http://localhost:80\n  - hostname: api.baiganio.io\n    service: http://localhost:80\n  - service: http_status:404\n\n# Apply it:\nsudo systemctl restart cloudflared",
        why: "An http:// route sends everything to Traefik on port 80 as HTTP. A database behind that receives an HTTP request instead of the wire protocol and the connection fails. Explicit tcp:// entries bypass Traefik entirely and forward bytes untouched. ssh:// points at the host's real sshd on :22 (not a NodePort) because cloudflared and sshd share the host."
      },
      {
        id: 501,
        commandTitle: "Lock the DB Hostnames Behind Cloudflare Access",
        command: "cloudflared access login https://db.baiganio.io",
        searchTerms: "cloudflare access zero trust policy protect database public dns self-hosted application login token",
        description: "<code>db.baiganio.io</code> and <code>pg.baiganio.io</code> are publicly resolvable and forward to a raw DB port — you do <b>not</b> want those open on the internet. In the newer Zero Trust UI: <b>Access → Applications → Add → Self-hosted and private → Public DNS</b> (their CNAMEs are public, so 'Public DNS', not 'Private destinations'). Add both hostnames as destinations, with one policy allowing your email. Then this command authenticates your client and caches a short-lived token. <b>SSH is NOT set up as an Access app here</b> — see the SSH card.",
        parts: [
          { text: "Access → Applications → Public DNS", explanation: "the sub-type for hostnames that have a public, proxied CNAME (which db/pg do) — not 'Private destinations' (that's WARP-only)" },
          { text: "destinations: db.baiganio.io + pg.baiganio.io", explanation: "one app can cover both DBs so they share a single policy" },
          { text: "policy: allow email = lkikov@proton.me", explanation: "the rule that gates who can reach the DBs — everyone else is blocked at Cloudflare's edge" },
          { text: "cloudflared access login <url>",                explanation: "opens a browser to authenticate, then caches a token so tcp sessions don't prompt every time" }
        ],
        example: "# After creating the Public DNS app + policy in the dashboard:\ncloudflared access login https://db.baiganio.io\ncloudflared access login https://pg.baiganio.io\n# A browser opens → log in → \"Successfully fetched your token\"\n\n# Without a policy, anyone who guesses the hostname can reach the raw DB port.\n# With one, unauthenticated connections are rejected before they touch the Pi.",
        why: "A raw database port has no business being on the open internet — the tunnel hides your home IP, but Access is what authenticates the person connecting. Treat it as mandatory for the DB hostnames. SSH is the deliberate exception: SSH's own key auth is the gate, so ssh.baiganio.io runs without an Access app."
      },
      {
        id: 502,
        commandTitle: "Reach the Database From Your Mac",
        command: "cloudflared access tcp --hostname pg.baiganio.io --url localhost:5432",
        searchTerms: "cloudflared access tcp database postgres sqlserver psql sqlcmd client mac connect proxy tableplus",
        description: "Opens a local proxy on your Mac: <code>localhost:&lt;port&gt;</code> → through the tunnel → the DB NodePort on the Pi. Leave it running in one terminal, then point <code>psql</code>/<code>sqlcmd</code> or a GUI (TablePlus, DBeaver) at <code>localhost</code>. The Mac-side <code>--url</code> port is just what your client connects to; the tunnel hostname already knows which NodePort it maps to. Requires <code>cloudflared</code> on the Mac (<code>brew install cloudflared</code>).",
        parts: [
          { text: "cloudflared access tcp", explanation: "runs a local TCP proxy that forwards through the authenticated tunnel" },
          { text: "--hostname pg.baiganio.io", explanation: "the tunnel hostname you configured with a tcp:// service (db.baiganio.io for SQL Server)" },
          { text: "--url localhost:5432", explanation: "the local port on your Mac the proxy listens on — connect your client here (pick any free port)" }
        ],
        example: "# Postgres (ScroogeCorp):\ncloudflared access tcp --hostname pg.baiganio.io --url localhost:5432\npsql -h localhost -p 5432 -U postgres scroogecorp\n\n# SQL Server (in a second terminal):\ncloudflared access tcp --hostname db.baiganio.io --url localhost:1433\n# then point TablePlus/Azure Data Studio at localhost:1433 (user sa)\n\n# The Mac-side port is arbitrary — db.baiganio.io maps to NodePort 31433,\n# pg.baiganio.io to 30432, server-side; your client never sees that.",
        why: "Your database is never a publicly open port — the only path in is an authenticated cloudflared session. Compare to forwarding 5432 on your router: that exposes Postgres to the entire internet and the credential-stuffing bots that scan it."
      },
      {
        id: 503,
        commandTitle: "SSH to the Pi From Anywhere",
        command: "ssh lk@ssh.baiganio.io",
        searchTerms: "cloudflared access ssh proxycommand tunnel remote ssh config away from home lan ip",
        description: "At home, <code>ssh lk@192.168.x.x</code> is simplest (same LAN). Away from home the private IP is unreachable — route SSH through the tunnel instead. Install <code>cloudflared</code> on your Mac (<code>brew install cloudflared</code>), add a <code>ProxyCommand</code> to <code>~/.ssh/config</code>, and then plain <code>ssh</code> just works from anywhere — no open port 22, no public IP needed. <b>This is a different setup from the databases:</b> <code>ssh.baiganio.io</code> is <b>not</b> a Cloudflare Access application — it needs only the <code>ssh://localhost:22</code> route in <code>config.yml</code>, its public CNAME, and this ProxyCommand. SSH's own key auth is the gate.",
        parts: [
          { text: "brew install cloudflared", explanation: "the client needs cloudflared to speak to the tunnel — install it on your Mac once" },
          { text: "ProxyCommand cloudflared access ssh --hostname %h", explanation: "tells ssh to tunnel the connection through cloudflared; %h expands to the host you're connecting to" },
          { text: "ssh lk@ssh.baiganio.io", explanation: "with the config in place, this reaches the Pi from any network on earth" }
        ],
        example: "# ~/.ssh/config on your Mac:\nHost ssh.baiganio.io\n  ProxyCommand cloudflared access ssh --hostname %h\n  User lk\n\n# Then, from anywhere:\nssh ssh.baiganio.io\n\n# At home you can still use the fast LAN path:\nssh lk@192.168.x.x",
        why: "The LAN IP only works on your home network. The tunnel gives you SSH from anywhere without opening port 22 to the internet or needing a static public IP. Unlike the raw DB ports, SSH authenticates itself (keys), so an Access app is optional here — this deployment omits it. If you want a second factor at the edge, you can still add a Public DNS Access app for ssh.baiganio.io, but it isn't required for the ProxyCommand to work."
      },
    ],
  },

  // ── Clarification: reaching an in-cluster database ────────────────────────

  {
    type: 'note',
    variant: 'info',
    content: `
      <strong>ℹ️ The NodePort bridge — why the tcp:// ports are 31433 / 30432.</strong>
      cloudflared runs on the Pi <em>host</em> and dials <code>localhost:&lt;port&gt;</code> — but
      BGAPI's SQL Server and Postgres run as pods behind <em>headless</em> Services
      (<code>clusterIP: None</code>, for stable StatefulSet DNS). They are NOT on the host's
      <code>localhost</code>, so <code>tcp://localhost:1433</code> / <code>:5432</code> would hit
      nothing. Bridge the gap with a <strong>NodePort</strong> Service (a headless Service can't
      also be a NodePort, so these are separate Services pointing at the same pods):
      <ul style="margin-top: 0.5rem;">
        <li><strong>Permanent (this deployment):</strong> <code>sqlserver-nodeport.yaml</code>
            publishes 1433 as node port <code>31433</code>, and <code>postgres-nodeport.yaml</code>
            publishes 5432 as <code>30432</code>. Apply them, then the config routes
            <code>tcp://localhost:31433 → db.baiganio.io</code> and
            <code>tcp://localhost:30432 → pg.baiganio.io</code>:
            <br><code>kubectl -n bgapi apply -f sqlserver-nodeport.yaml -f postgres-nodeport.yaml</code></li>
        <li><strong>Quick / occasional:</strong> <code>kubectl -n bgapi port-forward svc/postgres 5432:5432</code>
            on the Pi exposes it at <code>localhost:5432</code> only for as long as the command runs —
            fine for a one-off, but it dies with your shell, so it can't back a 24/7 tunnel.</li>
      </ul>
      For day-to-day BGAPI database work you usually don't need any of this — <code>kubectl exec</code>
      into the pod, or a plain in-cluster port-forward straight to your Mac, is simpler. Reach for
      the tunnel (and the NodePorts) only when you want a GUI client connected from <em>outside</em>
      your LAN.
    `,
  },

];
