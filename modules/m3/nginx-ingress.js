window.commandData_nginxIngress = [

  {
    id: 300, section: "ingress", sectionTitle: "Nginx Ingress Controller",
    commandTitle: "Check Traefik Is Running (K3s Default)",
    command: "kubectl get pods -n kube-system | grep traefik",
    searchTerms: "traefik ingress controller k3s kube-system pods running check",
    description: "K3s ships with Traefik as its default ingress controller. Verify the pod is Running before creating any Ingress resources — without it, all routing is dead.",
    parts: [
      { text: "kubectl get pods -n kube-system", explanation: "lists pods in the kube-system namespace where k3s installs its system components" },
      { text: "| grep traefik",                  explanation: "filters to only show Traefik pods" }
    ],
    example: "traefik-7d6f6659b7-q8j2x   1/1   Running   0   2d\n\n# If no output, reinstall Traefik:\nkubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v2.10/docs/content/reference/dynamic-configuration/traefik.toml",
    why: "If Traefik isn't Running, none of your Ingress rules do anything. Cloudflare's tunnel will connect to the Pi but every request will return a connection refused."
  },

  {
    id: 301, section: "ingress", sectionTitle: "Nginx Ingress Controller",
    commandTitle: "Verify Traefik Service & External IP",
    command: "kubectl get svc -n kube-system traefik",
    searchTerms: "traefik service loadbalancer external ip port 80 443 check",
    description: "Shows the Traefik LoadBalancer service. EXTERNAL-IP should be your Pi's LAN IP, confirming Traefik is accepting traffic on ports 80 and 443.",
    parts: [
      { text: "kubectl get svc -n kube-system", explanation: "lists services in the kube-system namespace" },
      { text: "traefik",                         explanation: "filters to the Traefik service by name" }
    ],
    example: "NAME      TYPE           CLUSTER-IP     EXTERNAL-IP      PORT(S)\ntraefik   LoadBalancer   10.43.123.45   192.168.1.100    80:30080/TCP, 443:30443/TCP\n\n# If EXTERNAL-IP is <pending>:\nkubectl describe svc -n kube-system traefik | grep Events -A 10",
    why: "The EXTERNAL-IP is what the Cloudflare tunnel forwards traffic to. <pending> means the Pi's kube-vip or MetalLB isn't assigning an IP — common on fresh k3s installs without a proper LAN setup."
  },

  {
    id: 302, section: "ingress", sectionTitle: "Nginx Ingress Controller",
    commandTitle: "Create an Ingress Rule",
    command: "kubectl apply -f node-api-ingress.yaml",
    searchTerms: "ingress yaml apply traefik annotation hostname routing pathtype prefix",
    description: "Deploys an Ingress resource that routes a subdomain through Traefik to a Kubernetes Service. The Traefik annotation is required — without it, the entrypoint defaults may not match.",
    parts: [
      { text: "annotations: traefik.ingress.kubernetes.io/router.entrypoints: web", explanation: "tells Traefik to accept this route on the HTTP (port 80) entrypoint" },
      { text: "host: api.yourdomain.com",                                            explanation: "the hostname Cloudflare tunnel will route to this Ingress" },
      { text: "pathType: Prefix",                                                    explanation: "matches all paths starting with / — required field in Kubernetes 1.18+" },
      { text: "port: number: 80",                                                    explanation: "the port on the Service, not the container — make sure these match" }
    ],
    example: "# node-api-ingress.yaml\napiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: node-api\n  annotations:\n    traefik.ingress.kubernetes.io/router.entrypoints: web\nspec:\n  rules:\n  - host: api.yourdomain.com\n    http:\n      paths:\n      - path: /\n        pathType: Prefix\n        backend:\n          service:\n            name: node-api\n            port:\n              number: 80",
    why: "Each Ingress rule is how your Node.js service becomes accessible as api.yourdomain.com. Without the Traefik annotation the route may only be registered on the HTTPS entrypoint."
  },

  {
    id: 303, section: "ingress", sectionTitle: "Nginx Ingress Controller",
    commandTitle: "List All Ingress Rules",
    command: "kubectl get ingress -A",
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
    command: "curl -H \"Host: api.yourdomain.com\" http://localhost/health",
    searchTerms: "curl test localhost host header traefik ingress routing dns bypass",
    description: "Sends a request to Traefik on localhost with a spoofed Host header — simulates exactly what Cloudflare's tunnel does. Confirms routing works without needing DNS to propagate.",
    parts: [
      { text: "curl",                           explanation: "makes an HTTP GET request" },
      { text: "-H \"Host: api.yourdomain.com\"", explanation: "overrides the Host header — Traefik uses this to match Ingress rules" },
      { text: "http://localhost/health",         explanation: "hits Traefik on port 80; /health is a standard Node.js liveness endpoint" }
    ],
    example: "# Healthy Node.js response:\n{\"status\":\"ok\",\"db\":\"connected\",\"uptime\":3600}\n\n# 404 from Traefik means the Ingress hostname doesn't match:\ncurl -v -H \"Host: api.yourdomain.com\" http://localhost/ 2>&1 | grep '< HTTP'",
    why: "This isolates whether a 502/504 from Cloudflare is a tunnel config problem or an ingress/app problem. If curl returns 200, the Cloudflare config.yml is the issue."
  },

  {
    id: 305, section: "ingress", sectionTitle: "Nginx Ingress Controller",
    commandTitle: "Describe Ingress (Debug Routing)",
    command: "kubectl describe ingress node-api",
    searchTerms: "describe ingress backend rules events debug routing traefik",
    description: "Shows the full Ingress spec including backend service resolution and any Events. Use this when an Ingress rule exists but traffic isn't reaching the service.",
    parts: [
      { text: "kubectl describe ingress", explanation: "shows the full Ingress resource including rules, default backend, and Events" },
      { text: "node-api",                 explanation: "the name of the Ingress resource to inspect" }
    ],
    example: "Rules:\n  Host             Path  Backends\n  api.yourdomain   /     node-api:80 (10.42.0.15:3000)\n\nEvents:\n  Warning  FailedSync  service \"node-api\" not found\n\n# Fix: check service exists in same namespace:\nkubectl get svc node-api",
    why: "\"service not found\" in Events means the Ingress and Service names don't match — a common copy-paste mistake. The backend IP (10.42.x.x) confirms the endpoint was resolved correctly."
  },

  {
    id: 306, section: "ingress", sectionTitle: "Nginx Ingress Controller",
    commandTitle: "Alternative: Install Nginx Ingress Controller",
    command: "kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/baremetal/deploy.yaml",
    searchTerms: "nginx ingress controller install baremetal alternative traefik",
    description: "Installs the official Nginx Ingress Controller as an alternative to the Traefik default. Use this if you need Nginx-specific annotations or are more familiar with Nginx config.",
    parts: [
      { text: "baremetal/deploy.yaml",      explanation: "the bare-metal variant — designed for environments without a cloud load balancer, like a Pi" },
      { text: "controller-v1.10.0",         explanation: "always pin controller versions to avoid unexpected behaviour on update" }
    ],
    example: "# After installing, Ingress annotations change:\n# Traefik: traefik.ingress.kubernetes.io/router.entrypoints: web\n# Nginx:   kubernetes.io/ingress.class: nginx\n\n# Verify Nginx controller pod:\nkubectl get pods -n ingress-nginx",
    why: "Traefik is simpler for k3s beginners, but Nginx Ingress has a larger community, more examples online, and better rate-limiting and auth annotation support for production Node.js APIs."
  }
];