window.commandData = [
    // ── Troubleshooting ───────────────────────────────────────
  {
    id: 700, section: "troubleshooting", sectionTitle: "Troubleshooting",
    commandTitle: "Debug: Pod Won't Start (ImagePullBackOff)",
    command: "kubectl describe pod <pod-name> | grep -A 10 Events",
    searchTerms: "imagepullbackoff describe pod events arm64 architecture",
    description: "Describes the pod and filters to the Events section — shows exactly why the image couldn't be pulled. Usually an ARM64 incompatibility or a wrong tag.",
    parts: [
      { text: "kubectl describe pod <pod-name>", explanation: "shows full pod spec, conditions, and events" },
      { text: "grep -A 10 Events",               explanation: "prints 10 lines after 'Events:' — where the pull error will appear" }
    ],
    example: "Events:\n  Warning  Failed   Back-off pulling image \"some-amd64-image:latest\"\n  Warning  Failed   Failed to pull image: no match for platform linux/arm64\n\n# Fix: use ARM64-compatible images only:\n# ✅ node:20-alpine, postgres:15-alpine, nginx:latest\n# ❌ Images tagged 'amd64', 'windows', 'nanoserver'",
    why: "The Pi 5 is ARM64. Many Docker Hub images are amd64-only. Alpine-tagged images almost always include ARM64 support."
  },
  {
    id: 701, section: "troubleshooting", sectionTitle: "Troubleshooting",
    commandTitle: "Debug: App Running But Returning 503",
    command: "kubectl describe pod <pod-name> && kubectl logs <pod-name> && kubectl get svc <service-name>",
    searchTerms: "503 service unavailable crashloopbackoff exec logs svc cluster-ip",
    description: "Three-step debug sequence for a running pod that isn't serving traffic. Covers pod state, app logs, and service networking.",
    parts: [
      { text: "kubectl describe pod",  explanation: "shows restart count and last termination reason" },
      { text: "kubectl logs",          explanation: "shows app stdout — look for uncaught exceptions or DB connection errors" },
      { text: "kubectl get svc",       explanation: "confirms the Service has a CLUSTER-IP (not <pending>)" }
    ],
    example: "# Quick cluster-internal connectivity test:\nkubectl exec -it <pod-name> -- wget -qO- http://localhost:3000/health\n\n# If that works but the ingress returns 503:\nkubectl get ingress <name> -o yaml | grep -A 5 backend",
    why: "503 from Cloudflare tunnel almost always means Traefik can't reach the Service. Check the Ingress backend port matches the Service port."
  },
  {
    id: 702, section: "troubleshooting", sectionTitle: "Troubleshooting",
    commandTitle: "Debug: Postgres PVC Stuck in Pending",
    command: "kubectl describe pvc database-pvc",
    searchTerms: "pvc pending describe storage class provisioner binding",
    description: "Shows why a PersistentVolumeClaim hasn't bound to a volume. Common causes: wrong storageClassName or missing /mnt/k3s-data/databases directory.",
    parts: [
      { text: "kubectl describe pvc database-pvc", explanation: "shows Events and conditions explaining why binding failed" }
    ],
    example: "Events:\n  Warning  ProvisioningFailed  \n    storageclass.storage.k8s.io \"local-path\" not found\n\n# Fix: confirm k3s local-path provisioner is running:\nkubectl get pods -n kube-system | grep local-path",
    why: "The PostgreSQL pod won't start until its PVC is Bound. Fix the PVC first, then the pod will schedule automatically."
  },
  {
    id: 703, section: "troubleshooting", sectionTitle: "Troubleshooting",
    commandTitle: "Debug: Cloudflare Tunnel Error 522",
    command: "sudo systemctl status cloudflared && sudo journalctl -u cloudflared -n 50",
    searchTerms: "cloudflare error 522 origin unreachable tunnel logs journalctl",
    description: "Error 522 means Cloudflare's edge reached the Pi but got no response from cloudflared (or cloudflared couldn't reach localhost:80). Check service status and recent logs.",
    parts: [
      { text: "systemctl status cloudflared",     explanation: "shows if the service is active and recent log lines" },
      { text: "journalctl -u cloudflared -n 50",  explanation: "last 50 log lines from the tunnel — look for connection errors" }
    ],
    example: "# Check Traefik is actually listening on port 80:\ncurl http://localhost/\n\n# Verify tunnel config hostname matches Cloudflare DNS:\ncat ~/.cloudflared/config.yml\n\n# Restart tunnel after config changes:\nsudo systemctl restart cloudflared",
    why: "522 is always a connectivity issue between cloudflared and localhost:80. Either Traefik isn't running or the config.yml has the wrong service URL."
  },
  {
    id: 704, section: "troubleshooting", sectionTitle: "Troubleshooting",
    commandTitle: "Debug: High Memory / Pod Eviction",
    command: "kubectl top pods -A && kubectl get events -A --sort-by='.lastTimestamp' | grep -i evict",
    searchTerms: "oom memory limit exceeded eviction top pods events",
    description: "Identifies which pods are consuming the most memory and shows any recent eviction events. The Pi 5 has limited RAM shared between k3s, the OS, and all your pods.",
    parts: [
      { text: "kubectl top pods -A",       explanation: "shows current memory usage per pod in MiB" },
      { text: "kubectl get events -A",     explanation: "lists cluster events across all namespaces" },
      { text: "--sort-by='.lastTimestamp'", explanation: "most recent events first" },
      { text: "grep -i evict",             explanation: "filters to eviction-related events only" }
    ],
    example: "# If Postgres is using too much memory, tune it:\n# Add to postgres container env:\n# - name: POSTGRES_INITDB_ARGS\n#   value: \"-c shared_buffers=64MB -c max_connections=20\"\n\n# Scale down non-essential deployments:\nkubectl scale deployment nginx-welcome --replicas=0",
    why: "PostgreSQL defaults are tuned for servers with GBs of RAM. On the Pi, explicitly limit shared_buffers or pods will get OOMKilled under load."
  }
  
];