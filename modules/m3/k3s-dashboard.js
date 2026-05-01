window.commandData = [

  {
    id: 400, section: "dashboard", sectionTitle: "K3s Dashboard",
    commandTitle: "Install Kubernetes Dashboard",
    command: "kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml",
    searchTerms: "kubernetes dashboard install apply web ui v2.7.0",
    description: "Installs the official Kubernetes web dashboard into the kubernetes-dashboard namespace. Gives you a browser UI for pods, logs, deployments and resource usage — no kubectl needed once it's up.",
    parts: [
      { text: "kubectl apply -f <url>", explanation: "pulls the manifest directly from GitHub and applies it in one shot" },
      { text: "v2.7.0",                explanation: "always pin the version — unpinned 'latest' URLs can break on dashboard updates" }
    ],
    example: "namespace/kubernetes-dashboard created\nserviceaccount/kubernetes-dashboard created\ndeployment.apps/kubernetes-dashboard created\n\n# Wait for the pod to become ready (~30s):\nkubectl wait --for=condition=ready pod \\\n  -l k8s-app=kubernetes-dashboard \\\n  -n kubernetes-dashboard \\\n  --timeout=300s",
    why: "K3s doesn't bundle a dashboard — it only has Traefik and CoreDNS out of the box. This is a one-time install that persists across k3s restarts."
  },

  {
    id: 401, section: "dashboard", sectionTitle: "K3s Dashboard",
    commandTitle: "Create Admin ServiceAccount",
    command: "kubectl apply -f dashboard-admin.yaml",
    searchTerms: "serviceaccount clusterrolebinding admin rbac dashboard user create",
    description: "Creates a ServiceAccount named admin-user with cluster-admin privileges. Required before you can generate a login token for the dashboard.",
    parts: [
      { text: "kind: ServiceAccount",     explanation: "the identity that will log into the dashboard" },
      { text: "kind: ClusterRoleBinding", explanation: "grants the ServiceAccount the built-in cluster-admin role — full access to all resources" },
      { text: "namespace: kubernetes-dashboard", explanation: "must live in the same namespace as the dashboard itself" }
    ],
    example: "# dashboard-admin.yaml\napiVersion: v1\nkind: ServiceAccount\nmetadata:\n  name: admin-user\n  namespace: kubernetes-dashboard\n---\napiVersion: rbac.authorization.k8s.io/v1\nkind: ClusterRoleBinding\nmetadata:\n  name: admin-user\nroleRef:\n  apiGroup: rbac.authorization.k8s.io\n  kind: ClusterRole\n  name: cluster-admin\nsubjects:\n- kind: ServiceAccount\n  name: admin-user\n  namespace: kubernetes-dashboard",
    why: "The dashboard refuses anonymous access. cluster-admin is acceptable on a private home Pi — restrict to read-only if the dashboard URL is accessible by others."
  },

  {
    id: 402, section: "dashboard", sectionTitle: "K3s Dashboard",
    commandTitle: "Generate Login Token",
    command: "kubectl -n kubernetes-dashboard create token admin-user",
    searchTerms: "create token admin-user dashboard login bearer jwt",
    description: "Generates a short-lived JWT bearer token for the admin-user. Copy and paste this into the dashboard's Token login field.",
    parts: [
      { text: "kubectl -n kubernetes-dashboard", explanation: "targets the kubernetes-dashboard namespace where the ServiceAccount lives" },
      { text: "create token",                    explanation: "generates a signed JWT using the ServiceAccount's credentials" },
      { text: "admin-user",                      explanation: "the ServiceAccount created in the previous step" }
    ],
    example: "eyJhbGciOiJSUzI1NiIsImtpZCI6Ii...\n\n# Token expires after ~1 hour by default.\n# For a longer-lived token (24h):\nkubectl -n kubernetes-dashboard create token admin-user --duration=86400s",
    why: "Tokens expire — if you get 'Unauthorized' after logging in, just generate a fresh one. Use --duration for longer sessions when you don't want to re-generate every hour."
  },

  {
    id: 403, section: "dashboard", sectionTitle: "K3s Dashboard",
    commandTitle: "Create Dashboard Ingress",
    command: "kubectl apply -f dashboard-ingress.yaml",
    searchTerms: "ingress dashboard hostname traefik cloudflare expose subdomain",
    description: "Exposes the dashboard through Traefik so it's reachable at dashboard.yourdomain.com via your Cloudflare tunnel — no port-forwarding needed.",
    parts: [
      { text: "namespace: kubernetes-dashboard",  explanation: "Ingress must be in the same namespace as the Service it routes to" },
      { text: "host: dashboard.yourdomain.com",   explanation: "the subdomain Cloudflare will route through the tunnel" },
      { text: "port: number: 443",                explanation: "the dashboard Service listens on 443 internally (uses its own self-signed cert)" }
    ],
    example: "# dashboard-ingress.yaml\napiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: kubernetes-dashboard\n  namespace: kubernetes-dashboard\n  annotations:\n    traefik.ingress.kubernetes.io/router.entrypoints: web\nspec:\n  rules:\n    - host: dashboard.yourdomain.com\n      http:\n        paths:\n          - path: /\n            pathType: Prefix\n            backend:\n              service:\n                name: kubernetes-dashboard\n                port:\n                  number: 443\n\n# Then restart Cloudflare tunnel:\nsudo systemctl restart cloudflared",
    why: "Without an Ingress the dashboard is only reachable via 'kubectl port-forward' — which requires an active SSH session. The Ingress makes it permanently available."
  },

  {
    id: 404, section: "dashboard", sectionTitle: "K3s Dashboard",
    commandTitle: "Add Dashboard to Cloudflare Config",
    command: "nano ~/.cloudflared/config.yml",
    searchTerms: "cloudflared config yml dashboard hostname add update restart",
    description: "Updates the Cloudflare tunnel config to route dashboard.yourdomain.com to your local Traefik ingress, then restarts the tunnel service to apply it.",
    parts: [
      { text: "- hostname: dashboard.yourdomain.com", explanation: "add this block before the wildcard *.yourdomain.com entry" },
      { text: "service: http://localhost:80",          explanation: "points to Traefik which then forwards to the dashboard via the Ingress rule" },
      { text: "sudo systemctl restart cloudflared",    explanation: "required to reload config.yml changes — the tunnel does not hot-reload" }
    ],
    example: "# Add to ingress: block in config.yml:\ningress:\n  - hostname: dashboard.yourdomain.com\n    service: http://localhost:80\n  - hostname: api.yourdomain.com\n    service: http://localhost:80\n  - hostname: \"*.yourdomain.com\"\n    service: http://localhost:80\n  - service: http_status:404\n\n# Then:\nsudo systemctl restart cloudflared\nsudo systemctl status cloudflared",
    why: "The hostname entry must appear before the wildcard catch-all. Cloudflare matches ingress rules top-to-bottom and stops at the first match."
  }
];