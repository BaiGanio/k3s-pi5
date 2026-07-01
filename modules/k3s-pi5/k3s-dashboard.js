window.commandData = [

  {
    id: 400, section: "dashboard", sectionTitle: "K3s Dashboard",
    commandTitle: "Install Kubernetes Dashboard",
    command: "sudo k3s kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml",
    searchTerms: "kubernetes dashboard install apply web ui v2.7.0",
    description: "Installs the official Kubernetes web dashboard into the kubernetes-dashboard namespace. Gives you a browser UI for pods, logs, deployments and resource usage — no kubectl needed once it's up.",
    parts: [
      { text: "sudo k3s kubectl apply -f <url>", explanation: "uses k3s's built-in kubectl as root to pull the manifest from GitHub and apply it" },
      { text: "v2.7.0",                explanation: "always pin the version — unpinned 'latest' URLs can break on dashboard updates" }
    ],
    example: "namespace/kubernetes-dashboard created\nserviceaccount/kubernetes-dashboard created\ndeployment.apps/kubernetes-dashboard created\n\n# Wait for the pod to become ready (~30s):\nsudo k3s kubectl wait --for=condition=ready pod \\\n  -l k8s-app=kubernetes-dashboard \\\n  -n kubernetes-dashboard \\\n  --timeout=300s",
    why: "K3s doesn't bundle a dashboard — it only has Traefik and CoreDNS out of the box. This is a one-time install that persists across k3s restarts."
  },

  {
    id: 401, section: "dashboard", sectionTitle: "K3s Dashboard",
    commandTitle: "Create Admin ServiceAccount",
    command: "sudo k3s kubectl apply -f - <<'EOF'\napiVersion: v1\nkind: ServiceAccount\nmetadata:\n  name: admin-user\n  namespace: kubernetes-dashboard\n---\napiVersion: rbac.authorization.k8s.io/v1\nkind: ClusterRoleBinding\nmetadata:\n  name: admin-user\nroleRef:\n  apiGroup: rbac.authorization.k8s.io\n  kind: ClusterRole\n  name: cluster-admin\nsubjects:\n- kind: ServiceAccount\n  name: admin-user\n  namespace: kubernetes-dashboard\nEOF",
    searchTerms: "serviceaccount clusterrolebinding admin rbac dashboard user create",
    description: "Creates a ServiceAccount named admin-user with cluster-admin privileges. Required before you can generate a login token for the dashboard. The YAML is inlined via heredoc — no separate file needed.",
    parts: [
      { text: "kubectl apply -f - <<'EOF'", explanation: "reads YAML from stdin (the heredoc) instead of a file — everything between here and EOF is the manifest" },
      { text: "kind: ServiceAccount",        explanation: "the identity that will log into the dashboard" },
      { text: "kind: ClusterRoleBinding",    explanation: "grants the ServiceAccount the built-in cluster-admin role — full access to all resources" },
      { text: "EOF",                         explanation: "closes the heredoc — kubectl applies everything in one transaction" }
    ],
    example: "serviceaccount/admin-user created\nclusterrolebinding.rbac.authorization.k8s.io/admin-user created\n\n# Verify:\nsudo k3s kubectl -n kubernetes-dashboard get sa admin-user",
    why: "The dashboard refuses anonymous access. cluster-admin is acceptable on a private home Pi — restrict to read-only if the dashboard URL is accessible by others."
  },

  {
    id: 402, section: "dashboard", sectionTitle: "K3s Dashboard",
    commandTitle: "Generate Login Token",
    command: "sudo k3s kubectl -n kubernetes-dashboard create token admin-user",
    searchTerms: "create token admin-user dashboard login bearer jwt",
    description: "Generates a short-lived JWT bearer token for the admin-user. Copy and paste this into the dashboard's Token login field.",
    parts: [
      { text: "sudo k3s kubectl -n kubernetes-dashboard", explanation: "targets the kubernetes-dashboard namespace where the ServiceAccount lives" },
      { text: "create token",                    explanation: "generates a signed JWT using the ServiceAccount's credentials" },
      { text: "admin-user",                      explanation: "the ServiceAccount created in the previous step" }
    ],
    example: "eyJhbGciOiJSUzI1NiIsImtpZCI6Ii...\n\n# Token expires after ~1 hour by default.\n# For a longer-lived token (24h):\nsudo k3s kubectl -n kubernetes-dashboard create token admin-user --duration=86400s",
    why: "Tokens expire — if you get 'Unauthorized' after logging in, just generate a fresh one. Use --duration for longer sessions when you don't want to re-generate every hour."
  },

  {
    id: 403, section: "dashboard", sectionTitle: "K3s Dashboard",
    commandTitle: "Create Dashboard Ingress",
    command: "sudo k3s kubectl apply -f - <<'EOF'\napiVersion: traefik.io/v1alpha1\nkind: ServersTransport\nmetadata:\n  name: dashboard-transport\n  namespace: kubernetes-dashboard\nspec:\n  insecureSkipVerify: true\n---\napiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: kubernetes-dashboard\n  namespace: kubernetes-dashboard\n  annotations:\n    traefik.ingress.kubernetes.io/router.entrypoints: web\n    traefik.ingress.kubernetes.io/service.serversscheme: https\n    traefik.ingress.kubernetes.io/service.serverstransport: kubernetes-dashboard-dashboard-transport@kubernetescrd\nspec:\n  rules:\n    - host: dashboard.yourdomain.com\n      http:\n        paths:\n          - path: /\n            pathType: Prefix\n            backend:\n              service:\n                name: kubernetes-dashboard\n                port:\n                  number: 443\nEOF",
    searchTerms: "ingress dashboard hostname traefik cloudflare expose subdomain",
    description: "Exposes the dashboard through Traefik so it's reachable at dashboard.yourdomain.com via your Cloudflare tunnel — no port-forwarding needed. The YAML is inlined via heredoc — no separate file needed. <br><br>The dashboard serves its own self-signed TLS on port 443, so this needs <b>two</b> pieces to work together: <code>serversscheme: https</code> tells Traefik to speak HTTPS to the backend, and the <code>ServersTransport</code> with <code>insecureSkipVerify: true</code> (attached via the <code>serverstransport</code> annotation) stops Traefik from rejecting the dashboard's self-signed cert. With only the first, Traefik still returns a <code>500</code>: <code>x509: cannot validate certificate ... doesn't contain any IP SANs</code>.",
    parts: [
      { text: "kubectl apply -f - <<'EOF'",                                        explanation: "reads YAML from stdin (the heredoc) instead of a file" },
      { text: "kind: ServersTransport",                                             explanation: "a Traefik CRD that configures how Traefik dials the backend — here, how it treats the backend's TLS" },
      { text: "insecureSkipVerify: true",                                           explanation: "tells Traefik NOT to verify the dashboard's self-signed cert — required because that cert has no IP SANs and fails verification, causing the 500" },
      { text: "router.entrypoints: web",                                            explanation: "tells Traefik to accept traffic on port 80 (HTTP) — Cloudflare tunnel forwards here" },
      { text: "service.serversscheme: https",                                       explanation: "tells Traefik the backend Service speaks HTTPS, not HTTP — without it Traefik sends plain HTTP and gets a 500" },
      { text: "service.serverstransport: ...@kubernetescrd",                        explanation: "attaches the ServersTransport above to this route — the value is <namespace>-<name>@kubernetescrd (here kubernetes-dashboard-dashboard-transport@kubernetescrd)" },
      { text: "host: dashboard.yourdomain.com",                                     explanation: "the subdomain Cloudflare will route through the tunnel — replace with your domain" },
      { text: "port: number: 443",                                                  explanation: "the dashboard Service port — the pod itself listens on 8443, the Service maps 443→8443" }
    ],
    example: "serverstransport.traefik.io/dashboard-transport created\ningress.networking.k8s.io/kubernetes-dashboard created\n\n# If the ServersTransport apply errors, check your Traefik CRD API group —\n# older k3s builds use traefik.containo.us instead of traefik.io:\nsudo k3s kubectl get crd | grep serverstransport\n\n# Verify the Ingress:\nsudo k3s kubectl -n kubernetes-dashboard get ingress\n# NAME                    HOSTS                        ADDRESS\n# kubernetes-dashboard    dashboard.yourdomain.com     192.168.x.x\n\n# Test locally (should return dashboard login HTML, not a 500):\ncurl -H \"Host: dashboard.yourdomain.com\" http://localhost/\n\n# Then restart Cloudflare tunnel:\nsudo systemctl restart cloudflared",
    why: "Without an Ingress the dashboard is only reachable via 'kubectl port-forward' — which requires an active SSH session. The Ingress makes it permanently available. The self-signed-cert gotcha bites everyone: 'serversscheme: https' alone still returns a 500 (x509 ... no IP SANs). You need the ServersTransport with insecureSkipVerify to complete the handshake — that's why both go in one manifest here."
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
