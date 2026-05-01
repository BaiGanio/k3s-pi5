window.commandData = [

  // ── Security Notes ─────────────────────────────────────────
  {
    id: 800, section: "security", sectionTitle: "Security Notes",
    commandTitle: "Change Default Postgres Password",
    command: "kubectl create secret generic postgres-secret --from-literal=POSTGRES_PASSWORD='your-new-secure-password' --dry-run=client -o yaml | kubectl apply -f -",
    searchTerms: "secret postgres password change rotate kubectl create dry-run apply",
    description: "Rotates the Postgres password Secret without editing YAML by hand. The --dry-run=client -o yaml pipe trick generates the Secret manifest and applies it atomically.",
    parts: [
      { text: "--from-literal=POSTGRES_PASSWORD='...'", explanation: "sets the password directly from the command line — never put real passwords in YAML files committed to git" },
      { text: "--dry-run=client -o yaml",               explanation: "generates the Secret manifest without creating it — piped to kubectl apply for atomic update" },
      { text: "kubectl apply -f -",                     explanation: "reads YAML from stdin and applies it — updates the Secret in-place" }
    ],
    example: "# After rotating the secret, restart pods to pick it up:\nkubectl rollout restart deployment/postgres\nkubectl rollout restart deployment/node-api\n\n# Verify the new secret value (base64 decoded):\nkubectl get secret postgres-secret -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d",
    why: "Pods cache Secret values at startup. Restarting both Postgres and your Node.js app ensures they both use the new password — otherwise you'll get authentication failures."
  },

  {
    id: 801, section: "security", sectionTitle: "Security Notes",
    commandTitle: "Regenerate Dashboard Token",
    command: "kubectl -n kubernetes-dashboard create token admin-user --duration=3600s",
    searchTerms: "dashboard token regenerate rotate expire duration admin-user",
    description: "Generates a fresh dashboard token. Default tokens expire in 1 hour. Specify --duration for longer sessions. Never share this token — it has cluster-admin access.",
    parts: [
      { text: "create token admin-user",  explanation: "generates a new signed JWT; previous tokens are not invalidated automatically" },
      { text: "--duration=3600s",         explanation: "token lifetime in seconds (3600s = 1 hour). Use 86400s for 24 hours" }
    ],
    example: "# For a 7-day token (home lab convenience):\nkubectl -n kubernetes-dashboard create token admin-user --duration=604800s\n\n# To invalidate all tokens for the ServiceAccount:\nkubectl -n kubernetes-dashboard delete secret $(kubectl -n kubernetes-dashboard get secret | grep admin-user | awk '{print $1}')",
    why: "The token has cluster-admin access to everything in your cluster. Treat it like a root SSH key — don't paste it in chat or commit it to git."
  },

  {
    id: 802, section: "security", sectionTitle: "Security Notes",
    commandTitle: "Update k3s",
    command: "sudo systemctl stop k3s && curl -sfL https://get.k3s.io | sudo sh - && sudo systemctl start k3s",
    searchTerms: "k3s update upgrade version systemctl stop start curl install",
    description: "Updates k3s to the latest stable release. Stops the current k3s process, re-runs the installer (which upgrades in-place), then restarts. Pods resume after the node comes back Ready.",
    parts: [
      { text: "sudo systemctl stop k3s",          explanation: "gracefully stops k3s and all managed pods" },
      { text: "curl -sfL https://get.k3s.io | sudo sh -", explanation: "re-runs the official installer — detects existing install and upgrades it" },
      { text: "sudo systemctl start k3s",          explanation: "starts the upgraded k3s; pods restart automatically within ~30 seconds" }
    ],
    example: "# Pin to a specific version instead of latest:\ncurl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=v1.29.5+k3s1 sudo sh -\n\n# Verify the upgrade:\nkubectl version --short\nkubectl get nodes",
    why: "Keeping k3s updated patches security vulnerabilities in the Kubernetes control plane and containerd. After updating, verify all pods recover with 'kubectl get pods -A -w'."
  },

  {
    id: 803, section: "security", sectionTitle: "Security Notes",
    commandTitle: "Back Up Persistent Data",
    command: "sudo tar -czf ~/k3s-backup-$(date +%Y%m%d).tar.gz /mnt/k3s-data/",
    searchTerms: "backup tar postgres data persistent storage k3s-data compress",
    description: "Creates a compressed tar archive of all persistent data (databases, application files). Run this before any k3s upgrade or destructive operation.",
    parts: [
      { text: "tar -czf",             explanation: "creates (-c) a gzip-compressed (-z) archive to the file (-f) specified" },
      { text: "$(date +%Y%m%d)",      explanation: "appends today's date to the filename — e.g. k3s-backup-20240115.tar.gz" },
      { text: "/mnt/k3s-data/",       explanation: "the directory containing all your Postgres data and application files" }
    ],
    example: "# Backup with Postgres in a consistent state:\n# 1. Dump Postgres first (while running):\nkubectl exec -it $(kubectl get pod -l app=postgres -o jsonpath='{.items[0].metadata.name}') \\\n  -- pg_dump -U appuser appdb > ~/appdb-$(date +%Y%m%d).sql\n\n# 2. Then tar the raw data directory:\nsudo tar -czf ~/k3s-backup-$(date +%Y%m%d).tar.gz /mnt/k3s-data/\n\n# 3. Copy to a remote machine:\nscp ~/k3s-backup-*.tar.gz user@remote-host:~/backups/",
    why: "pg_dump produces a portable SQL backup that survives Postgres version upgrades. The tar backup of raw data files is for disaster recovery — it only works with the exact same Postgres version."
  },

  {
    id: 804, section: "security", sectionTitle: "Security Notes",
    commandTitle: "Enable Network Policies",
    command: "kubectl apply -f network-policy-default-deny.yaml",
    searchTerms: "network policy deny all ingress egress restrict traffic pods namespace",
    description: "Applies a default-deny NetworkPolicy that blocks all traffic between pods unless explicitly allowed. After applying, add allow policies for Node.js → Postgres and Traefik → your services.",
    parts: [
      { text: "podSelector: {}",            explanation: "empty selector matches all pods in the namespace — applies the deny to everything" },
      { text: "policyTypes: [Ingress, Egress]", explanation: "denies both incoming and outgoing traffic by default" }
    ],
    example: "# network-policy-default-deny.yaml\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: default-deny-all\n  namespace: default\nspec:\n  podSelector: {}\n  policyTypes:\n  - Ingress\n  - Egress\n\n# Then allow node-api to reach postgres:\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: allow-node-api-to-postgres\n  namespace: default\nspec:\n  podSelector:\n    matchLabels:\n      app: postgres\n  ingress:\n  - from:\n    - podSelector:\n        matchLabels:\n          app: node-api\n    ports:\n    - port: 5432",
    why: "Without NetworkPolicies, any compromised pod in your cluster can reach Postgres directly. This is the single most impactful security improvement for a home lab exposed to the internet."
  }
];