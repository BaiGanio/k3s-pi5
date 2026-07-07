// modules/k3s-pi5/nginx-ingress.js
// Ingress & Traefik — the cluster's HTTP router: how routes work, and how to debug them

window.pageBlocks = [

  // ── What is Ingress? ──────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Ingress & Traefik: The Cluster\'s Router',
    content: `
      <p>
        <strong>Ingress is how the outside world reaches one specific app inside your
        cluster.</strong> The Cloudflare tunnel gets all traffic <em>to</em> the Pi, but it
        dumps everything at one door — Traefik on port 80. Something then has to decide that
        <code>dashboard.yourdomain.com</code> goes to the dashboard and
        <code>api.yourdomain.com</code> goes to your API. That "something" is an
        <strong>Ingress rule</strong>, and the component that reads those rules and does the
        routing is the <strong>ingress controller</strong> — which on k3s is <strong>Traefik</strong>,
        already installed.
      </p>

      <h4>The Request Chain</h4>
      <p>
        Every internet-reachable app on your cluster follows the same path — and each of your
        modules owns one link:
      </p>
      <ul>
        <li><strong>Browser → Cloudflare edge → tunnel → cloudflared on the Pi</strong> — the outer pipe, set up in <em>Cloudflare Tunnel on Pi 5</em>. It knows nothing about which app.</li>
        <li><strong>→ Traefik (listening on :80)</strong> — the ingress controller. k3s ships it; you just verify it's healthy.</li>
        <li><strong>→ [an Ingress rule matches the Host header]</strong> — <em>this</em> module. The rule maps a hostname to a Service.</li>
        <li><strong>→ Service → Pod</strong> — your actual app.</li>
      </ul>
      <p>
        So if you can already see the dashboard at <code>dashboard.yourdomain.com</code>, it's
        because the <em>k3s Dashboard</em> module already created an Ingress for it. Ingress
        isn't a new thing you're bolting on — it's the layer that made the dashboard reachable
        in the first place.
      </p>

      <h4>What This Module Is For</h4>
      <p>
        This is the <strong>routing-layer</strong> module: confirm Traefik is running and has an
        address, create an Ingress rule, list and audit your routes, and — most usefully —
        <strong>debug</strong> them when a hostname returns a 404 or a 500. The dashboard is the
        worked example throughout because it's the one real route you already have running. Treat
        it as a <em>template</em>: swap the service name, host, and port and the same pattern
        exposes any app.
      </p>

      <h4>Standard <code>Ingress</code> vs Traefik <code>IngressRoute</code></h4>
      <p>
        On k3s there are <strong>two ways to write a route</strong>, and you'll meet both across
        these modules — this is worth understanding clearly so it stops being confusing:
      </p>
      <ul>
        <li><strong>Standard <code>kind: Ingress</code></strong> (this module + the k3s Dashboard) — the portable, vendor-neutral Kubernetes object. It works on any cluster; Traefik-specific behaviour is bolted on through <code>traefik.ingress.kubernetes.io/...</code> annotations.</li>
        <li><strong>Traefik <code>kind: IngressRoute</code></strong> (what the <em>Deploy BGAPI</em> module uses) — Traefik's own CRD. More expressive (its <code>Host(\`...\`)</code> matcher, middlewares, and entrypoints are first-class), but k3s/Traefik-only and not portable.</li>
      </ul>
      <p>
        <strong>Both are read by the same Traefik</strong> and produce the same result — a
        hostname routed to a Service. Use standard <code>Ingress</code> when you want portable
        manifests; use <code>IngressRoute</code> when you want Traefik's richer matching (BGAPI
        chose it for exactly that). Seeing two different-looking route files across the modules
        is expected, not a mistake.
      </p>

      <h4>Traefik vs the Nginx Ingress Controller</h4>
      <p>
        Traefik is the k3s default: already installed, wired to ports 80/443, lighter on RAM
        (it matters on a Pi), and the source of the <code>ServersTransport</code>/<code>Middleware</code>
        CRDs. The <strong>Nginx Ingress Controller</strong> (installed by the last command here,
        as an <em>alternative</em>) has a larger community, richer auth/rate-limit annotations,
        and portable manifests — but you'd have to install and maintain it, disable Traefik to
        avoid a port fight, and it's heavier. <strong>For a Pi 5 home lab, stay on Traefik</strong>
        unless you specifically need something it lacks.
      </p>
    `,
  },

  // ── Three rules for ingress ───────────────────────────────────────────────

  {
    type: 'note',
    variant: 'tip',
    content: `
      <strong>Three rules for routing on a k3s Pi 5:</strong>
      <ol style="margin-top: 0.5rem; padding-left: 1.5rem;">
        <li><strong>Traefik is already the controller.</strong> Don't install a second one
            unless you mean it — two controllers fighting over ports 80/443 is chaos. The Nginx
            install here is an <em>alternative</em>, not an addition.</li>
        <li><strong>Ingress lives with its Service.</strong> The Ingress must be in the
            <em>same namespace</em> as the Service it points at, or Traefik logs
            <code>service not found</code> and the route 404s.</li>
        <li><strong>Test with a Host header before blaming DNS.</strong>
            <code>curl -H "Host: app.yourdomain.com" http://localhost/</code> hits Traefik
            directly. A <code>200</code> means the cluster side is fine — look at Cloudflare/DNS.
            A <code>404</code>/<code>500</code> means fix the Ingress first.</li>
      </ol>
    `,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: INGRESS & TRAEFIK
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Nginx Ingress Controller',
    content: `
      <p>
        <strong>Verify, create, then debug — in that order.</strong> Start by confirming the
        controller you're relying on is actually alive: is the Traefik pod Running, and does its
        LoadBalancer Service have your Pi's LAN IP? If either is wrong, no Ingress rule you write
        will do anything, and Cloudflare will just get connection-refused.
      </p>
      <p>
        With Traefik healthy, create an Ingress rule — the dashboard route is the worked example,
        and it doubles as the template for your own apps. The last three commands are your
        debugging kit: list every route to spot hostname clashes, replay what the tunnel does
        with a spoofed <code>Host</code> header, and <code>describe</code> an Ingress to see how
        Traefik resolved (or failed to resolve) the backend. The final command installs the
        Nginx controller instead, if you ever decide to switch off Traefik.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'ingress',
    sectionTitle: 'Nginx Ingress Controller',
    items: [
      {
        id: 300,
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
        id: 301,
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
        id: 302,
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
        id: 303,
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
        id: 304,
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
        id: 305,
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
        id: 306,
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
      },
    ],
  },

  // ── Closing: What's Next ──────────────────────────────────────────────────

  {
    type: 'note',
    variant: 'info',
    content: `
      <strong>ℹ️ How this connects to the rest of your cluster.</strong> This module is the
      mental model and debugging kit for the routing layer — you don't hand-write an Ingress for
      every app. <strong>BGAPI creates its own route</strong> (a Traefik <code>IngressRoute</code>)
      in the <em>Deploy BGAPI</em> module, so it's self-contained; come back here when
      <code>bgapi.local</code> returns a 404 or 500 and you need to find out which layer broke.
      A future Node.js app you add to the cluster would use the standard <code>Ingress</code>
      pattern shown above. For the full outside-in "which layer is broken?" checklist, see the
      <strong>Field Manual</strong>.
    `,
  },

];
