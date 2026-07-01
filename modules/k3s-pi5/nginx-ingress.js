window.commandData = [

  {
    id: 300, section: "ingress", sectionTitle: "Nginx Ingress Controller",
    commandTitle: "Check Traefik Is Running (K3s Default)",
    command: "sudo k3s kubectl get pods -n kube-system | grep traefik",
    searchTerms: "traefik ingress controller k3s kube-system pods running check",
    description: "K3s ships with Traefik as its default ingress controller. Verify the pod is Running before creating any Ingress resources — without it, all routing is dead.",
    parts: [
      { text: "sudo k3s kubectl get pods -n kube-system", explanation: "lists pods in the kube-system namespace where k3s installs its system components" },
      { text: "| grep traefik",                           explanation: "filters to only show Traefik pods" }
    ],
    example: "traefik-7d6f6659b7-q8j2x   1/1   Running   0   2d\n\n# If no output, Traefik may not be running:\nsudo k3s kubectl get pods -n kube-system",
    why: "If Traefik isn't Running, none of your Ingress rules do anything. Cloudflare's tunnel will connect to the Pi but every request will return a connection refused."
  },

  {
    id: 301, section: "ingress", sectionTitle: "Nginx Ingress Controller",
    commandTitle: "Verify Traefik Service & External IP",
    command: "sudo k3s kubectl get svc -n kube-system traefik",
    searchTerms: "traefik service loadbalancer external ip port 80 443 check",
    description: "Shows the Traefik LoadBalancer service. EXTERNAL-IP should be your Pi's LAN IP, confirming Traefik is accepting traffic on ports 80 and 443.",
    parts: [
      { text: "sudo k3s kubectl get svc -n kube-system", explanation: "lists services in the kube-system namespace" },
      { text: "traefik",                                 explanation: "filters to the Traefik service by name" }
    ],
    example: "NAME      TYPE           CLUSTER-IP     EXTERNAL-IP      PORT(S)\ntraefik   LoadBalancer   10.43.123.45   192.168.1.100    80:30080/TCP, 443:30443/TCP\n\n# If EXTERNAL-IP is <pending>:\nsudo k3s kubectl describe svc -n kube-system traefik | grep Events -A 10",
    why: "The EXTERNAL-IP is what the Cloudflare tunnel forwards traffic to. <pending> means the Pi's kube-vip or MetalLB isn't assigning an IP — common on fresh k3s installs without a proper LAN setup."
  },

  {
    id: 302, section: "ingress", sectionTitle: "Nginx Ingress Controller",
    commandTitle: "Create an Ingress Rule (Expose the Dashboard)",
    command: "sudo k3s kubectl apply -f - <<'EOF'\napiVersion: traefik.io/v1alpha1\nkind: ServersTransport\nmetadata:\n  name: dashboard-transport\n  namespace: kubernetes-dashboard\nspec:\n  insecureSkipVerify: true\n---\napiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: kubernetes-dashboard\n  namespace: kubernetes-dashboard\n  annotations:\n    traefik.ingress.kubernetes.io/router.entrypoints: web\n    traefik.ingress.kubernetes.io/service.serversscheme: https\n    traefik.ingress.kubernetes.io/service.serverstransport: kubernetes-dashboard-dashboard-transport@kubernetescrd\nspec:\n  rules:\n    - host: dashboard.yourdomain.com\n      http:\n        paths:\n          - path: /\n            pathType: Prefix\n            backend:\n              service:\n                name: kubernetes-dashboard\n                port:\n                  number: 443\nEOF",
    searchTerms: "ingress yaml apply traefik annotation hostname routing pathtype prefix dashboard kubernetes-dashboard serverstransport serversscheme https 443 insecureskipverify 500",
    description: "Creates the Ingress that exposes the already-installed <code>kubernetes-dashboard</code> Service at <code>dashboard.yourdomain.com</code> through Traefik. This is the real route running on this cluster — not a throwaway demo. Assumes you've already installed the dashboard (see the <b>k3s Dashboard</b> article). <br><br>The dashboard serves <b>HTTPS on port 443 with a self-signed cert</b>, so a plain HTTP Ingress returns a <code>500</code>. It needs <b>two</b> extra pieces working together: <code>serversscheme: https</code> (speak HTTPS to the backend) and a <code>ServersTransport</code> with <code>insecureSkipVerify: true</code>, attached via the <code>serverstransport</code> annotation (don't reject the self-signed cert). With only the first, Traefik still returns <code>500: x509: cannot validate certificate ... doesn't contain any IP SANs</code>. <br><br>The Ingress must live in the <b>same namespace</b> as the Service — <code>kubernetes-dashboard</code>, not <code>default</code> — or Traefik logs <code>service not found</code>.",
    parts: [
      { text: "kind: ServersTransport / insecureSkipVerify: true",                    explanation: "tells Traefik NOT to verify the dashboard's self-signed cert — required because that cert has no IP SANs and fails verification, causing the 500" },
      { text: "router.entrypoints: web",                                              explanation: "tells Traefik to accept this route on the HTTP (port 80) entrypoint — the Cloudflare tunnel forwards here" },
      { text: "service.serversscheme: https",                                         explanation: "tells Traefik the backend speaks HTTPS, not HTTP — without it Traefik sends plain HTTP to port 443 and gets a 500" },
      { text: "service.serverstransport: ...@kubernetescrd",                          explanation: "attaches the ServersTransport above — the value is <namespace>-<name>@kubernetescrd (here kubernetes-dashboard-dashboard-transport@kubernetescrd)" },
      { text: "namespace: kubernetes-dashboard",                                       explanation: "the Ingress MUST be in the same namespace as the Service it points at, or Traefik reports 'service not found'" },
      { text: "host: dashboard.yourdomain.com",                                        explanation: "the hostname Cloudflare tunnel routes to this Ingress — replace with your domain" },
      { text: "port: number: 443",                                                    explanation: "the dashboard Service port — the pod listens on 8443, the Service maps 443→8443" }
    ],
    example: "serverstransport.traefik.io/dashboard-transport created\ningress.networking.k8s.io/kubernetes-dashboard created\n\n# Verify:\nsudo k3s kubectl -n kubernetes-dashboard get ingress\n# NAME                    HOSTS                       ADDRESS\n# kubernetes-dashboard    dashboard.yourdomain.com    192.168.x.x\n\n# Test locally — want 200, not 500 (bypasses Cloudflare/DNS):\ncurl -sI -H \"Host: dashboard.yourdomain.com\" http://localhost/\n\n# ❌ Still a 500 (x509 ... no IP SANs) even though the config above is correct?\n#    The Ingress can hold a STALE ServersTransport reference — editing it in place\n#    doesn't always take. Delete and recreate it so Traefik re-reads the reference:\nsudo k3s kubectl -n kubernetes-dashboard delete ingress kubernetes-dashboard\n#    then re-apply the manifest above.",
    why: "This is the exact route that serves dashboard.yourdomain.com. The self-signed-cert gotcha bites everyone: 'serversscheme: https' alone still 500s (x509 ... no IP SANs) — you need the ServersTransport with insecureSkipVerify to complete the handshake, which is why both go in one manifest. And if it 500s even when the config is picture-perfect, the reference is stuck: delete and recreate the Ingress rather than editing it in place. Swap the service name/port and host for your own app once you understand the pattern."
  },

  {
    id: 303, section: "ingress", sectionTitle: "Nginx Ingress Controller",
    commandTitle: "List All Ingress Rules",
    command: "sudo k3s kubectl get ingress -A",
    searchTerms: "kubectl get ingress all namespaces list hosts address routes",
    description: "Lists every Ingress resource across all namespaces. Shows hostnames, service backends, and the assigned ADDRESS. Use this to audit routing and spot hostname conflicts.",
    parts: [
      { text: "kubectl get ingress", explanation: "lists Ingress resources" },
      { text: "-A",                  explanation: "across all namespaces (--all-namespaces)" }
    ],
    example: "NAMESPACE              NAME                   CLASS    HOSTS                       ADDRESS\ndefault                node-api               <none>   api.yourdomain.com          192.168.1.100\ndefault                nginx-welcome          <none>   nginx.yourdomain.com        192.168.1.100\nkubernetes-dashboard   kubernetes-dashboard   <none>   dashboard.yourdomain.com    192.168.1.100",
    why: "Two Ingresses with the same hostname will conflict silently — one will win and the other will 404. This command surfaces that immediately."
  },

  {
    id: 304, section: "ingress", sectionTitle: "Nginx Ingress Controller",
    commandTitle: "Test Ingress Routing Without DNS",
    command: "curl -sI -H \"Host: dashboard.yourdomain.com\" http://localhost/",
    searchTerms: "curl test localhost host header traefik ingress routing dns bypass dashboard 500 200",
    description: "Sends a request to Traefik on localhost with a spoofed Host header — simulates exactly what Cloudflare's tunnel does. Confirms routing works without needing DNS to propagate.",
    parts: [
      { text: "curl -sI",                              explanation: "makes an HTTP request and prints only the status line + response headers" },
      { text: "-H \"Host: dashboard.yourdomain.com\"", explanation: "overrides the Host header — Traefik uses this to match Ingress rules, exactly like the Cloudflare tunnel does" },
      { text: "http://localhost/",                     explanation: "hits Traefik on port 80 directly, bypassing Cloudflare and DNS" }
    ],
    example: "# 200 = routing AND backend TLS both work:\nHTTP/1.1 200 OK\n\n# 500 = Traefik reached the backend but the TLS handshake failed —\n#       missing/stale ServersTransport or serversscheme (see 'Create an Ingress Rule').\n# 404 = the Host header matches no Ingress rule:\ncurl -v -H \"Host: dashboard.yourdomain.com\" http://localhost/ 2>&1 | grep '< HTTP'",
    why: "This isolates whether a 5xx from Cloudflare is a tunnel config problem or an ingress/app problem. If curl returns 200 here, the Ingress and Service are fine — look at the Cloudflare tunnel/DNS side instead."
  },

  {
    id: 305, section: "ingress", sectionTitle: "Nginx Ingress Controller",
    commandTitle: "Describe Ingress (Debug Routing)",
    command: "sudo k3s kubectl -n kubernetes-dashboard describe ingress kubernetes-dashboard",
    searchTerms: "describe ingress backend rules events debug routing traefik dashboard namespace",
    description: "Shows the full Ingress spec including backend service resolution, annotations, and any Events. Use this when an Ingress rule exists but traffic isn't reaching the service.",
    parts: [
      { text: "sudo k3s kubectl -n kubernetes-dashboard describe ingress", explanation: "shows the full Ingress resource including rules, backend, annotations, and Events" },
      { text: "kubernetes-dashboard",                                       explanation: "the name of the Ingress resource to inspect" }
    ],
    example: "Rules:\n  Host                      Path  Backends\n  dashboard.yourdomain.com  /     kubernetes-dashboard:443 (10.42.0.x:8443)\nAnnotations:\n  traefik.ingress.kubernetes.io/service.serversscheme: https\n  traefik.ingress.kubernetes.io/service.serverstransport: kubernetes-dashboard-dashboard-transport@kubernetescrd\n\n# 'service not found' in Events means the Ingress isn't in the same namespace\n# as the Service. Confirm the Service exists in kubernetes-dashboard:\nsudo k3s kubectl -n kubernetes-dashboard get svc kubernetes-dashboard",
    why: "\"service not found\" in Events means the Ingress and Service are in different namespaces, or the names don't match. The backend IP (10.42.x.x:8443) confirms the endpoint was resolved correctly."
  },

  {
    id: 306, section: "ingress", sectionTitle: "Nginx Ingress Controller",
    commandTitle: "Alternative: Install Nginx Ingress Controller",
    command: "sudo k3s kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/baremetal/deploy.yaml",
    searchTerms: "nginx ingress controller install baremetal alternative traefik",
    description: "Installs the official Nginx Ingress Controller as an alternative to the Traefik default. Use this if you need Nginx-specific annotations or are more familiar with Nginx config.",
    parts: [
      { text: "baremetal/deploy.yaml",      explanation: "the bare-metal variant — designed for environments without a cloud load balancer, like a Pi" },
      { text: "controller-v1.10.0",         explanation: "always pin controller versions to avoid unexpected behaviour on update" }
    ],
    example: "# After installing, Ingress annotations change:\n# Traefik: traefik.ingress.kubernetes.io/router.entrypoints: web\n# Nginx:   kubernetes.io/ingress.class: nginx\n\n# Verify Nginx controller pod:\nsudo k3s kubectl get pods -n ingress-nginx",
    why: "Traefik is simpler for k3s beginners, but Nginx Ingress has a larger community, more examples online, and better rate-limiting and auth annotation support for production Node.js APIs."
  }
];
