window.commandData = [

  // ── Verification & Testing ────────────────────────────────
  {
    id: 600, section: "verification", sectionTitle: "Verification & Testing",
    commandTitle: "Verify All Pods Are Running",
    command: "kubectl get pods -A",
    searchTerms: "kubectl get pods all namespaces running status verify check",
    description: "Lists every pod across all namespaces with its status. All pods should show Running or Completed. Any CrashLoopBackOff or ImagePullBackOff needs immediate attention.",
    parts: [
      { text: "kubectl get pods", explanation: "lists pod resources" },
      { text: "-A",               explanation: "across all namespaces — includes kube-system (Traefik, CoreDNS), dashboard, and your apps" }
    ],
    example: "NAMESPACE              NAME                              READY   STATUS\nkube-system            coredns-57f9...                   1/1     Running\nkube-system            traefik-7d6f...                   1/1     Running\nkube-system            local-path-provisioner-...        1/1     Running\ndefault                postgres-...                      1/1     Running\ndefault                node-api-...                      1/1     Running\nkubernetes-dashboard   kubernetes-dashboard-...          1/1     Running\n\n# Watch for changes in real-time:\nkubectl get pods -A -w",
    why: "The first check after any 'kubectl apply'. If a system pod like CoreDNS or local-path-provisioner is down, your app pods will behave unexpectedly even if they show Running."
  },

  {
    id: 601, section: "verification", sectionTitle: "Verification & Testing",
    commandTitle: "Check All Ingress Routes",
    command: "kubectl get ingress -A",
    searchTerms: "ingress routes list check all namespaces hosts address kubectl",
    description: "Lists all Ingress rules across namespaces. Shows which hostnames map to which services and the assigned Traefik address. Use this to spot missing routes before testing Cloudflare.",
    parts: [
      { text: "kubectl get ingress -A", explanation: "lists Ingress resources across all namespaces with hosts and backend addresses" }
    ],
    example: "NAMESPACE              NAME                   HOSTS                       ADDRESS\ndefault                node-api               api.yourdomain.com          192.168.1.100\ndefault                nginx-welcome          nginx.yourdomain.com        192.168.1.100\nkubernetes-dashboard   kubernetes-dashboard   dashboard.yourdomain.com    192.168.1.100\n\n# If ADDRESS is empty, Traefik hasn't assigned an IP yet:\nkubectl get svc -n kube-system traefik",
    why: "An empty ADDRESS column means Traefik hasn't picked up the Ingress yet — usually because Traefik itself is not running or the namespace/annotation is wrong."
  },

  {
    id: 602, section: "verification", sectionTitle: "Verification & Testing",
    commandTitle: "Test DNS Resolution via Cloudflare Tunnel",
    command: "curl -H \"Host: api.yourdomain.com\" http://localhost/health",
    searchTerms: "curl test dns localhost host header cloudflare tunnel routing verify",
    description: "Simulates exactly what Cloudflare's tunnel does — sends a request to Traefik with a specific Host header. If this returns 200 but the public domain doesn't, the issue is in the Cloudflare config.",
    parts: [
      { text: "curl",                           explanation: "makes an HTTP GET request from the Pi itself" },
      { text: "-H \"Host: api.yourdomain.com\"", explanation: "overrides the Host header — Traefik uses this to match Ingress rules, not the URL" },
      { text: "http://localhost/health",         explanation: "hits Traefik on port 80; swap /health for any route your Node.js app exposes" }
    ],
    example: "# Healthy Node.js response:\n{\"status\":\"ok\",\"db\":\"connected\",\"uptime\":3600}\n\n# 404 from Traefik → Ingress hostname doesn't match what you passed in -H\n# 503 from Traefik → Service exists but no healthy pod endpoints\n# Connection refused → Traefik isn't running on port 80",
    why: "This test isolates the Cloudflare layer. If curl succeeds but https://api.yourdomain.com times out, only the Cloudflare tunnel config.yml needs fixing — not your k3s setup."
  },

  {
    id: 603, section: "verification", sectionTitle: "Verification & Testing",
    commandTitle: "Monitor Cloudflare Tunnel Status",
    command: "cloudflared tunnel list && cloudflared tunnel info my-pi",
    searchTerms: "cloudflared tunnel list info status connections monitor",
    description: "Lists all registered tunnels and shows connection details for the my-pi tunnel — how many edge connections are active and which Cloudflare PoPs they're connected to.",
    parts: [
      { text: "cloudflared tunnel list",    explanation: "shows all tunnels in your Cloudflare account with their IDs and status" },
      { text: "cloudflared tunnel info my-pi", explanation: "shows active connections, connector IDs, and edge server locations for this specific tunnel" }
    ],
    example: "ID                                   NAME    CREATED              CONNECTIONS\nabc123def456-7890-abcd-ef01-234567   my-pi   2024-01-10 09:00:00  4xQAQ\n\n# tunnel info output:\nConnector ID: xyz789\nStarted: 2024-01-15 08:30:00\nConnections: 4 active connections to edges:\n  - LHR (London) — 2 connections\n  - AMS (Amsterdam) — 2 connections",
    why: "CONNECTIONS showing 0 means your systemd service isn't running or the Pi has no internet. 4 connections is normal — cloudflared maintains multiple edge connections for redundancy."
  },

  {
    id: 604, section: "verification", sectionTitle: "Verification & Testing",
    commandTitle: "Monitor Pod Resource Usage",
    command: "kubectl top pods -A",
    searchTerms: "kubectl top pods cpu memory resource usage monitor all namespaces",
    description: "Shows live CPU (millicores) and memory (MiB) per pod. Critical on the Pi 5 — all pods share ~8 GB RAM and 4 cores with the OS itself.",
    parts: [
      { text: "kubectl top pods", explanation: "shows CPU (m = millicores, 1000m = 1 core) and memory for each running pod" },
      { text: "-A",               explanation: "across all namespaces so you see total cluster consumption at a glance" }
    ],
    example: "NAME                    CPU(cores)   MEMORY(MiB)\nnode-api-abc12          12m          85Mi\npostgres-def34          22m          134Mi\ntraefik-ghi56           5m           28Mi\ncoredns-jkl78           3m           18Mi\nkubernetes-dashboard    8m           45Mi\n\n# Total: ~50m CPU, ~310 MiB RAM in steady state\n# Pi 5 has ~4000m CPU and 8192 MiB available",
    why: "If any pod shows memory near its limit (set in resources.limits.memory) it's at risk of OOMKill. Postgres is the usual culprit — its default shared_buffers is too high for a Pi."
  },

  {
    id: 605, section: "verification", sectionTitle: "Verification & Testing",
    commandTitle: "Follow Pod Logs in Real-Time",
    command: "kubectl logs -l app=node-api -f",
    searchTerms: "kubectl logs follow realtime app label selector node-api stream tail",
    description: "Streams live stdout/stderr from your Node.js pod. The -l selector works even after a pod restart generates a new pod name.",
    parts: [
      { text: "kubectl logs",        explanation: "fetches container stdout and stderr" },
      { text: "-l app=node-api",     explanation: "selects pods by label rather than by name — the name changes on every restart" },
      { text: "-f",                  explanation: "follows (tails) the log stream — Ctrl+C to stop" }
    ],
    example: "Server listening on port 3000\nConnected to PostgreSQL at postgres:5432/appdb\nGET /health 200 4ms\nPOST /api/users 201 23ms\nGET /api/users 200 8ms\n\n# Also useful:\nkubectl logs -l app=postgres -f       # postgres logs\nkubectl logs -l app=node-api --previous  # logs from the last crashed container",
    why: "--previous is the most useful flag you'll use when debugging CrashLoopBackOff — it shows what the container logged just before it died."
  }
];