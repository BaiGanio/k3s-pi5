// modules/k3s-pi5/aperio-deploy.js
// Deploy Aperio (Node.js AI coding agent) to k3s on a Raspberry Pi 5.
//
// Build/ship model: the ARM64 image is built in GitHub CI (QEMU cross-compile)
// and pushed to ghcr.io. The Pi never builds — it only pulls. A webhook
// receiver on the Pi listens for GitHub notifications and triggers a
// re-deploy. No local models — AI runs on cloud providers (Anthropic,
// DeepSeek, Gemini) with minimal RAM footprint, fitting comfortably on the
// Pi 5's 8 GB with the rest of the stack.
//
// Every manifest is created inline with cat > file <<'EOF' … EOF — no
// external files needed. The user creates everything directly on the Pi.

window.pageBlocks = [

  // ── What is Aperio? ──────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Deploy Aperio: AI Coding Agent on k3s',
    content: `
      <p>
        <strong>Aperio is a personal AI memory layer — a self-hosted coding
        agent and knowledge base.</strong> Built on Express + WebSocket (v0.67.3), it
        connects to cloud AI providers (Anthropic Claude, DeepSeek, Gemini, or
        Claude Code / Codex via CLI) so the Pi 5's 8 GB RAM is never asked to
        load a local model. Postgres with pgvector stores embeddings, conversation
        history, and your personal knowledge graph. Everything deploys to your
        existing k3s cluster through a simple set of manifests, with a browser-based
        setup wizard handling the rest.
      </p>

      <h4>The Constraint: Cloud-Only Models</h4>
      <p>
        The Pi 5 has 8 GB RAM — not enough for a usable local LLM alongside k3s,
        Postgres, and the app itself. <strong>Aperio is configured to use cloud
        providers only</strong> (Anthropic Claude, DeepSeek, Gemini, Claude Code,
        Codex). The built-in providers (<code>llamacpp</code> for local models,
        <code>transformers</code> for embeddings) are left disabled — they'd need
        several GB just for quantized weights. This keeps the pod's memory request
        at 512 Mi and the total cluster footprint under 2.5 GB — with plenty of
        headroom for other workloads.
      </p>

      <h4>The Build & Ship Model (read this first)</h4>
      <p>
        The Pi does <strong>not</strong> build the image. A Node.js + npm install
        on ARM64 with native compilation for <code>sharp</code>, <code>better-sqlite3</code>,
        and other native deps is slow and can OOM a constrained Pi. Instead:
      </p>
      <ul>
        <li><strong>GitHub CI builds</strong> — QEMU cross-compiles a multi-stage <code>docker/Dockerfile</code> (<code>node:24-slim</code>, non-root <code>aperio</code> user) for <code>linux/arm64</code>, pushes to <code>ghcr.io/baiganio/aperio:latest</code> and <code>:&lt;sha&gt;</code>.</li>
        <li><strong>The Pi pulls</strong> — the Deployment references <code>ghcr.io/baiganio/aperio:latest</code> with <code>imagePullPolicy: Always</code>. A deploy is a pull, measured in seconds.</li>
        <li><strong>Webhook triggers deploys</strong> — GitHub Actions optionally sends an HMAC-signed POST → the Pi's webhook receiver → <code>aperio-watch-deploy.sh</code> applies manifests, restarts, and runs migrations. The webhook step is <strong>commented out</strong> in the workflow — uncomment it once you've set up the receiver.</li>
      </ul>

      <h4>The Demo Loop</h4>
      <p>
        <strong><code>git push</code> to <code>master</code> → GitHub CI builds &
        pushes the ARM64 image → uncomment the webhook step → Pi pulls the new
        image → live at <code>http://aperio.local</code>.</strong>
        No CI server on the Pi. No Docker build on the Pi. No model downloads.
      </p>

      <h4>What's Inside</h4>
      <ul>
        <li><strong>Architecture</strong> — the full deployment diagram: how Aperio, Postgres (pgvector), Traefik, and the webhook receiver fit together.</li>
        <li><strong>Deploy the Stack</strong> — create every manifest inline on the Pi with <code>cat > file &lt;&lt;'EOF'</code> heredocs, then apply. You never need external files — everything is in this module.</li>
        <li><strong>CI/CD</strong> — webhook receiver setup, HMAC secrets, GitHub workflow integration — all config files inline.</li>
        <li><strong>Verify & Troubleshoot</strong> — health checks, ImagePullBackOff fixes, Postgres connectivity, webhook debugging.</li>
      </ul>
    `,
  },

  // ── Architecture ─────────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Architecture',
    content: `
      <p>
        Aperio runs in its own <code>aperio</code> namespace alongside any other
        workloads in your cluster. The Postgres database uses <strong>pgvector</strong>
        for embedding storage and is exposed on a non-standard Kubernetes Service
        port (<strong>8008</strong>) to avoid collisions with other Postgres
        instances. Traefik (built into k3s) handles ingress routing, and a
        <code>webhook</code> systemd service listens on port 9001 for GitHub
        deploy notifications.
      </p>

      <pre><code>┌────────────────────────────────────────────────────────────┐
│  Raspberry Pi 5 (ARM64, 8 GB)                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  k3s (lightweight Kubernetes)                        │  │
│  │                                                      │  │
│  │  ┌──────────────┐ ┌──────────────┐                  │  │
│  │  │  postgres    │ │   aperio     │                  │  │
│  │  │  StatefulSet │ │  Deployment  │                  │  │
│  │  │  :5432       │ │  :31337      │                  │  │
│  │  │  svc:8008    │ │  svc:31337   │                  │  │
│  │  │    pgvector  │ │  Node.js     │                  │  │
│  │  └──────┬───────┘ └──────┬───────┘                  │  │
│  │         │  aperio DB     │                          │  │
│  │         └────────────────┘                          │  │
│  │                                                      │  │
│  │  ┌────────────────────────────────────────────┐      │  │
│  │  │  Traefik Ingress (built into k3s)          │      │  │
│  │  │  aperio.local → aperio:31337                │      │  │
│  │  └────────────────────────────────────────────┘      │  │
│  │                                                      │  │
│  │  ┌────────────────────────────────────────────┐      │  │
│  │  │  Webhook Receiver (port 9001)              │      │  │
│  │  │  GitHub → POST → aperio-watch-deploy.sh    │      │  │
│  │  │  → pull ghcr.io image → rollout → migrate   │      │  │
│  │  └────────────────────────────────────────────┘      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘</code></pre>

      <p>
        <strong>Port mapping for PostgreSQL:</strong> The Aperio Postgres uses
        port <strong>8008</strong> on the Kubernetes Service level to avoid
        collisions with any other Postgres in the cluster (e.g. the bgapi
        Postgres on port 5432). Internal container port is still 5432 — the
        Service remaps it.
      </p>

      <pre><code>Postgres container:       5432  (internal)
Kubernetes Service:       8008  (in-cluster DNS)
NodePort (external):     30808  (host → cluster)</code></pre>
    `,
  },

  // ── Prerequisites ────────────────────────────────────────────────────────

  {
    type: 'note',
    variant: 'tip',
    content: `
      <strong>Before you deploy Aperio, you need:</strong>
      <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
        <li><strong>Raspberry Pi 5</strong> with 64-bit OS (Raspberry Pi OS Lite or Ubuntu Server), 8 GB RAM.</li>
        <li><strong>k3s installed and running</strong> — see the k3s Setup Guide module if you haven't yet.</li>
        <li><strong>kubectl</strong> configured to reach the cluster.</li>
        <li><strong>Cloud AI API key</strong> — at least one of: Anthropic Claude, DeepSeek, Gemini, Claude Code (CLI), or Codex (CLI). You'll set it in the browser setup wizard at <code>/setup</code> after first deploy. Aperio writes a <code>.env</code> file on the persistent volume.</li>
        <li><strong>Cloudflare Tunnel</strong> or <strong>Tailscale Funnel</strong> — the webhook receiver on port 9001 must be reachable from GitHub's runners (unless you use a self-hosted runner on the Pi itself).</li>
        <li><strong>ghcr.io access</strong> — the aperio image is public on ghcr.io, so no pull secret is needed. If the repo goes private, add <code>imagePullSecrets</code> to the Deployment.</li>
      </ul>
    `,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: DEPLOY THE STACK
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Deploy the Stack',
    content: `
      <p>
        Every manifest is created <strong>inline on the Pi</strong> with
        <code>cat > file &lt;&lt;'EOF'</code> heredocs — you never need external
        files. Work through each step in order: the namespace and secrets must
        exist before any other resource, Postgres must be ready before Aperio
        starts, and migrations run last. After the initial deploy, the CI/CD
        webhook handles updates automatically.
      </p>
      <p>
        The image is built by GitHub CI — no local Docker build on the Pi. k3s
        pulls <code>ghcr.io/baiganio/aperio:latest</code> directly when you
        apply the Deployment.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'aperio-deploy',
    sectionTitle: 'Aperio · Deploy the Stack',
    items: [
      {
        id: 700,
        commandTitle: 'Create the Namespace & Secret',
        command: 'kubectl apply -f namespace.yaml -f secrets.yaml',
        searchTerms: 'namespace secret postgres password base64 opaque create manifest folder aperio-k3s isolate',
        description: 'Make a working folder for the manifests you\'ll build up, then create the first two. Everything lives in a dedicated <code>aperio</code> namespace — <code>kubectl delete namespace aperio</code> wipes the whole stack. The Secret holds the Postgres password as base64. <b>Change the placeholder password</b> before applying.',
        parts: [
          { text: "mkdir -p ~/aperio-k3s", explanation: "the folder you'll create every manifest in; every command assumes you're in this directory" },
          { text: "cat > file <<'EOF' … EOF", explanation: "writes the file verbatim — the quoted 'EOF' stops the shell from expanding $vars inside" },
          { text: "postgres-password", explanation: "base64 of 'aperio_secret' — regenerate with: echo -n 'YourPassword' | base64; replace the placeholder" },
        ],
        example: "# A folder to build the manifests in (run this on the Pi):\nmkdir -p ~/aperio-k3s && cd ~/aperio-k3s\n\n# --- namespace.yaml ---\ncat > namespace.yaml <<'EOF'\n---\n# Namespace for all Aperio resources\napiVersion: v1\nkind: Namespace\nmetadata:\n  name: aperio\n  labels:\n    app.kubernetes.io/part-of: aperio\nEOF\n\n# --- secrets.yaml (CHANGE the password!) ---\ncat > secrets.yaml <<'EOF'\n---\n# Secrets for the Aperio stack.\n# The Postgres password is base64-encoded. Generate a new one with:\n#   echo -n \"YourStrongPassword\" | base64\napiVersion: v1\nkind: Secret\nmetadata:\n  name: aperio-secrets\n  namespace: aperio\n  labels:\n    app.kubernetes.io/part-of: aperio\ntype: Opaque\ndata:\n  # Change this! \"aperio_secret\" base64-encoded — replace with your own.\n  postgres-password: YXBlcmlvX3NlY3JldA==\n  # Anthropic / DeepSeek / Gemini / Voyage keys — add as needed (base64-encoded)\n  # anthropic-api-key:\nEOF\n\nkubectl apply -f namespace.yaml -f secrets.yaml\nkubectl -n aperio get secret aperio-secrets",
        why: "The password in the Secret is used by both Postgres (to set the initial superuser password) and Aperio (to connect). The placeholder 'aperio_secret' is in the public repo — change it before deploying. If you forget and deploy with the placeholder, anyone reading this module can connect to your database. Rotate it now, before anything else.",
      },
      {
        id: 701,
        commandTitle: 'Create the ConfigMap',
        command: 'kubectl apply -f configmap.yaml',
        searchTerms: 'configmap config first-boot ai provider embeddings defaults setup wizard',
        description: "Creates a ConfigMap with first-boot defaults for Aperio: AI provider, embeddings backend, and the config precedence mode. The values here are only starting defaults — once you run the setup wizard in the browser, your choices are saved to a <code>.env</code> file on the persistent volume and win on every restart.",
        parts: [
          { text: 'AI_PROVIDER', explanation: 'commented out by default — uncomment to pre-set Anthropic/DeepSeek/Gemini before the wizard' },
          { text: 'EMBEDDING_PROVIDER', explanation: 'commented out — defaults to transformers (local, no API key needed)' },
          { text: 'APERIO_CONFIG_PRECEDENCE=db', explanation: 'set in aperio.yaml\'s env — lets UI Settings override the .env file' },
        ],
        example: "cd ~/aperio-k3s\ncat > configmap.yaml <<'EOF'\n---\n# ConfigMap — first-boot configuration for Aperio.\n#\n# EDIT THIS FILE BEFORE APPLYING on your Pi. Uncomment the lines for\n# the provider you want and set the values. If everything stays commented,\n# Aperio uses its built-in defaults, then the browser setup wizard at /setup\n# lets you switch providers without touching YAML.\n#\n# Once you save settings in the Web UI → Settings, they're stored in the\n# database and override whatever is in this ConfigMap on every pod start.\napiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: aperio-config\n  namespace: aperio\n  labels:\n    app.kubernetes.io/part-of: aperio\ndata:\n  # AI Provider — uncomment and set before first deploy if you want\n  # to skip the setup wizard. Options:\n  #   llamacpp, anthropic, deepseek, gemini, claude-code, codex\n  #\n  # AI_PROVIDER: \"anthropic\"\n  # Embeddings — options: transformers (local), voyage (cloud)\n  #\n  # EMBEDDING_PROVIDER: \"transformers\"\nEOF\n\nkubectl apply -f configmap.yaml\nkubectl -n aperio get configmap aperio-config",
        why: "The ConfigMap is a convenience, not a requirement. You can leave everything commented and let the setup wizard handle provider selection in the browser. The ConfigMap exists so you can pre-seed a provider + API key before the pod starts — useful for automated deploys where there's no browser to run the wizard.",
      },
      {
        id: 702,
        commandTitle: 'Create PostgreSQL (pgvector)',
        command: 'kubectl apply -f postgres.yaml',
        searchTerms: 'postgres pgvector statefulset pvc headless service 8008 pgvector/pg16 persistent volume claim',
        description: "Creates a <b>StatefulSet</b> running <code>pgvector/pgvector:pg16</code> — Postgres 16 with vector embedding support, ARM64 compatible. A <b>headless Service</b> gives the pod a stable DNS name at <code>postgres.aperio.svc.cluster.local</code>. The Service exposes port <b>8008</b> (not 5432) to avoid collisions with other Postgres instances in the cluster. A 5 Gi PVC is auto-bound by k3s's local-path provisioner.",
        parts: [
          { text: "pgvector/pgvector:pg16", explanation: "ARM64-compatible Postgres with pgvector extension — the only Postgres image Aperio supports" },
          { text: "clusterIP: None (headless)", explanation: "stable per-pod DNS name instead of a load-balanced random one" },
          { text: "svc port 8008 → container 5432", explanation: "avoids port collision with any other Postgres on 5432 in the cluster" },
          { text: "volumeClaimTemplates", explanation: "StatefulSet auto-provisions a PVC; k3s local-path binds it to /var/lib/rancher/k3s/storage" },
        ],
        example: "cd ~/aperio-k3s\ncat > postgres.yaml <<'EOF'\n---\n# PostgreSQL (pgvector) — Aperio's database.\n#\n# Uses pgvector/pgvector:pg16 for vector-embedding support. Aperio's\n# migrate.js handles schema setup on first run — no init Job needed.\napiVersion: v1\nkind: Service\nmetadata:\n  name: postgres\n  namespace: aperio\n  labels:\n    app: postgres\n    app.kubernetes.io/part-of: aperio\nspec:\n  type: ClusterIP\n  clusterIP: None          # Headless — StatefulSet pod gets stable DNS\n  ports:\n    - port: 8008\n      targetPort: 5432\n      name: postgres\n  selector:\n    app: postgres\n---\napiVersion: apps/v1\nkind: StatefulSet\nmetadata:\n  name: postgres\n  namespace: aperio\n  labels:\n    app: postgres\n    app.kubernetes.io/part-of: aperio\nspec:\n  serviceName: postgres\n  replicas: 1\n  selector:\n    matchLabels:\n      app: postgres\n  template:\n    metadata:\n      labels:\n        app: postgres\n    spec:\n      containers:\n        - name: postgres\n          # pgvector-enabled Postgres 16 — ARM64 compatible (runs on Pi 5)\n          image: pgvector/pgvector:pg16\n          ports:\n            - containerPort: 5432\n              name: postgres\n          env:\n            - name: POSTGRES_USER\n              value: \"aperio\"\n            - name: POSTGRES_PASSWORD\n              valueFrom:\n                secretKeyRef:\n                  name: aperio-secrets\n                  key: postgres-password\n            - name: POSTGRES_DB\n              value: \"aperio\"\n            # Keep data in a subdirectory so the volume root stays clean.\n            - name: PGDATA\n              value: \"/var/lib/postgresql/data/pgdata\"\n          resources:\n            requests:\n              memory: \"256Mi\"\n              cpu: \"100m\"\n            limits:\n              memory: \"1Gi\"\n              cpu: \"1000m\"\n          volumeMounts:\n            - name: data\n              mountPath: /var/lib/postgresql/data\n          readinessProbe:\n            exec:\n              command: [\"pg_isready\", \"-U\", \"aperio\", \"-d\", \"aperio\"]\n            initialDelaySeconds: 10\n            periodSeconds: 10\n            timeoutSeconds: 5\n            failureThreshold: 10\n          livenessProbe:\n            exec:\n              command: [\"pg_isready\", \"-U\", \"aperio\", \"-d\", \"aperio\"]\n            initialDelaySeconds: 30\n            periodSeconds: 30\n            timeoutSeconds: 5\n  volumeClaimTemplates:\n    - metadata:\n        name: data\n        labels:\n          app.kubernetes.io/part-of: aperio\n      spec:\n        accessModes:\n          - ReadWriteOnce\n        resources:\n          requests:\n            storage: 5Gi\nEOF\n\nkubectl apply -f postgres.yaml\n\n# Wait for Postgres to be ready before proceeding:\nkubectl -n aperio wait --for=condition=ready pod -l app=postgres --timeout=300s\n\n# Verify it's accepting connections:\nkubectl -n aperio exec postgres-0 -- pg_isready -U aperio -d aperio",
        why: "The headless Service gives the StatefulSet pod a stable DNS name, so Aperio can connect to postgres.aperio.svc.cluster.local:8008 regardless of restarts — the DNS name always resolves to the pod's IP. The port remap (8008 → 5432) is essential: if you deploy another Postgres in the cluster on port 5432 (like bgapi's Postgres), there's no collision.",
      },
      {
        id: 703,
        commandTitle: 'Create the Aperio Deployment',
        command: 'kubectl apply -f aperio.yaml',
        searchTerms: 'aperio deployment service clusterip pvc persistent volume ghcr.io pull always readiness liveness probe',
        description: "Creates the Aperio <b>Deployment</b> (1 replica, 512 Mi–1 Gi mem, ARM64 image from ghcr.io) + <b>ClusterIP Service</b> on port 31337 + a 1 Gi PVC for the <code>/app/var</code> runtime state (.env, logs, sessions). The Deployment pulls <code>ghcr.io/baiganio/aperio:latest</code> — a public image, no pull secret needed. The env var <code>DATABASE_URL</code> is constructed from the Secret and points at Postgres on port 8008.",
        parts: [
          { text: "image: ghcr.io/baiganio/aperio:latest", explanation: "public ghcr.io image — no imagePullSecrets needed; imagePullPolicy: Always ensures fresh pulls" },
          { text: "DATABASE_URL", explanation: "postgresql://aperio:<password>@postgres.aperio.svc.cluster.local:8008/aperio — the Secret's password is injected via env var" },
          { text: "APERIO_ALLOWED_PATHS_TO_READ / _WRITE", explanation: "security gate — the agent can only read from /app and write to /app/var" },
          { text: "readiness + liveness probes", explanation: "k3s checks GET / on port 31337; delays give Node.js and Postgres time to initialise" },
        ],
        example: "cd ~/aperio-k3s\ncat > aperio.yaml <<'EOF'\n---\n# Aperio — Deployment + ClusterIP Service.\n#\n# The image is built on GitHub CI (QEMU cross-compile for ARM64), pushed to\n# ghcr.io, then pulled by k3s. For public repos the image is public — no\n# imagePullSecrets needed. If your repo is private, add imagePullSecrets.\napiVersion: v1\nkind: Service\nmetadata:\n  name: aperio\n  namespace: aperio\n  labels:\n    app: aperio\n    app.kubernetes.io/part-of: aperio\nspec:\n  type: ClusterIP\n  ports:\n    - port: 31337\n      targetPort: 31337\n      name: http\n  selector:\n    app: aperio\n---\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: aperio\n  namespace: aperio\n  labels:\n    app: aperio\n    app.kubernetes.io/part-of: aperio\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: aperio\n  template:\n    metadata:\n      labels:\n        app: aperio\n    spec:\n      containers:\n        - name: aperio\n          # Built in GitHub CI, pushed to ghcr.io\n          image: ghcr.io/baiganio/aperio:latest\n          imagePullPolicy: Always\n          ports:\n            - containerPort: 31337\n              name: http\n          envFrom:\n            # First-boot defaults (AI provider, embeddings, etc.)\n            # Overridable via Web UI → Settings (saved to DB, takes precedence)\n            - configMapRef:\n                name: aperio-config\n          env:\n            # ---- Database ----\n            - name: DB_BACKEND\n              value: \"postgres\"\n            - name: DATABASE_URL\n              value: \"postgresql://aperio:$(POSTGRES_PASSWORD)@postgres.aperio.svc.cluster.local:8008/aperio\"\n            - name: POSTGRES_PASSWORD\n              valueFrom:\n                secretKeyRef:\n                  name: aperio-secrets\n                  key: postgres-password\n            # ---- Security / Paths ----\n            - name: APERIO_ALLOWED_PATHS_TO_READ\n              value: \"/app\"\n            - name: APERIO_ALLOWED_PATHS_TO_WRITE\n              value: \"/app/var\"\n            # Let DB-saved UI settings override env vars (default is \"env\")\n            - name: APERIO_CONFIG_PRECEDENCE\n              value: \"db\"\n            # ---- Runtime ----\n            - name: NODE_ENV\n              value: \"production\"\n            - name: PORT\n              value: \"31337\"\n            - name: HOST\n              value: \"0.0.0.0\"\n          resources:\n            requests:\n              memory: \"512Mi\"\n              cpu: \"250m\"\n            limits:\n              memory: \"1Gi\"\n              cpu: \"1000m\"\n          volumeMounts:\n            - name: var\n              mountPath: /app/var\n          readinessProbe:\n            httpGet:\n              path: /\n              port: 31337\n            initialDelaySeconds: 30\n            periodSeconds: 10\n            timeoutSeconds: 5\n          livenessProbe:\n            httpGet:\n              path: /\n              port: 31337\n            initialDelaySeconds: 60\n            periodSeconds: 30\n            timeoutSeconds: 5\n      volumes:\n        - name: var\n          persistentVolumeClaim:\n            claimName: aperio-var\n---\napiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: aperio-var\n  namespace: aperio\n  labels:\n    app.kubernetes.io/part-of: aperio\nspec:\n  accessModes:\n    - ReadWriteOnce\n  resources:\n    requests:\n      storage: 1Gi\nEOF\n\nkubectl apply -f aperio.yaml\n\n# Wait for Aperio to be ready:\nkubectl -n aperio wait --for=condition=ready pod -l app=aperio --timeout=120s\n\nkubectl -n aperio get pods,svc",
        why: "The DATABASE_URL env var uses Kubernetes' $(POSTGRES_PASSWORD) syntax to interpolate the Secret value at container startup — the connection string never appears in plaintext in the manifest. The readiness probe with initialDelaySeconds: 30 gives Node.js time to start and connect to Postgres before k3s starts routing traffic.",
      },
      {
        id: 704,
        commandTitle: 'Create the Ingress (Traefik IngressRoute)',
        command: 'kubectl apply -f ingress.yaml',
        searchTerms: 'ingress traefik ingressroute host router aperio.local web entrypoint',
        description: "Creates a Traefik <b>IngressRoute</b> (k3s's built-in ingress controller) that routes <code>aperio.local → aperio:31337</code>. Traefik matches the <code>Host()</code> header — you'll need to add <code>aperio.local</code> to your laptop's <code>/etc/hosts</code> to test it (or port-forward to skip DNS).",
        parts: [
          { text: "IngressRoute (Traefik CRD)", explanation: 'k3s ships with Traefik; IngressRoute is a Traefik CRD, not a standard Kubernetes Ingress' },
          { text: "Host(`aperio.local`)", explanation: "Traefik only routes requests whose Host header matches this exactly" },
          { text: "entryPoints: web", explanation: "Traefik's port 80 entrypoint — no TLS here (add Cloudflare Tunnel for HTTPS)" },
        ],
        example: "cd ~/aperio-k3s\ncat > ingress.yaml <<'EOF'\n---\n# Traefik IngressRoute — exposes Aperio at aperio.local:80.\n#\n# k3s ships with Traefik as the default ingress controller. This IngressRoute\n# is a Traefik CRD (not a standard Kubernetes Ingress) because k3s's bundled\n# Traefik expects this format.\n#\n# After applying, add to your laptop's /etc/hosts:\n#   <raspberry-pi-ip>  aperio.local\n# Then open http://aperio.local in your browser.\napiVersion: traefik.io/v1alpha1\nkind: IngressRoute\nmetadata:\n  name: aperio\n  namespace: aperio\n  labels:\n    app.kubernetes.io/part-of: aperio\nspec:\n  entryPoints:\n    - web           # Traefik's port 80 entrypoint\n  routes:\n    - kind: Rule\n      match: Host(`aperio.local`)\n      services:\n        - name: aperio\n          port: 31337\n---\n# Fallback: standard Kubernetes Ingress (uncomment and delete the IngressRoute\n# above if you are not using k3s's default Traefik).\n#\n# apiVersion: networking.k8s.io/v1\n# kind: Ingress\n# metadata:\n#   name: aperio\n#   namespace: aperio\n#   annotations:\n#     traefik.ingress.kubernetes.io/router.entrypoints: web\n# spec:\n#   rules:\n#     - host: aperio.local\n#       http:\n#         paths:\n#           - path: /\n#             pathType: Prefix\n#             backend:\n#               service:\n#                 name: aperio\n#                 port:\n#                   number: 31337\nEOF\n\nkubectl apply -f ingress.yaml\nkubectl -n aperio get ingressroute",
        why: "A standard Kubernetes Ingress (commented at the bottom) also works if you later swap Traefik for nginx. But on k3s, the IngressRoute CRD is the native format and gives you more Traefik-specific features. The Host() rule is case-insensitive but must match exactly what the browser sends.",
      },
      {
        id: 705,
        commandTitle: 'Run Database Migrations',
        command: 'kubectl -n aperio exec deploy/aperio -- node db/migrate.js',
        searchTerms: 'migrate database schema tables pgvector postgres migrate.js exec idempotent',
        description: "Executes Aperio's migration script inside the running pod. On first run, this creates the database schema (conversations, messages, embeddings tables, pgvector indexes). On subsequent runs, it's a no-op (idempotent). Run it once after initial deploy, or after any update that includes schema changes.",
        parts: [
          { text: "kubectl -n aperio exec", explanation: "runs a command inside an existing container — no need to build a separate migration image" },
          { text: "deploy/aperio", explanation: "targets the Deployment's pod by name; kubectl picks any running replica" },
          { text: "node db/migrate.js", explanation: "Aperio's built-in migration script — idempotent, safe to run multiple times" },
        ],
        example: "# Run this once after the pod is ready:\nkubectl -n aperio exec deploy/aperio -- node db/migrate.js\n\n# Expected output (first run):\n# → Creating tables...\n# → conversations table created\n# → messages table created\n# → embeddings table created\n# → pgvector extension enabled\n# → Migrations complete\n\n# Expected output (subsequent runs):\n# → Migrations already up to date\n\n# If it fails, check Postgres connectivity:\nkubectl -n aperio exec deploy/aperio -- env | grep DATABASE_URL\nkubectl -n aperio logs deploy/aperio --tail=20",
        why: "Migrations are built into the app image rather than a separate Job or init container. This keeps the manifest count low and means you run them explicitly rather than having a Job pod start, run, and disappear where you can't inspect failures. The CI/CD webhook script also runs migrations automatically after each deploy.",
      },
      {
        id: 706,
        commandTitle: 'Verify the Full Stack',
        command: 'kubectl -n aperio get pods,svc,ingressroute',
        searchTerms: 'verify pods services ingress healthy status ready running all-in-one deploy complete',
        description: 'One-command status check for the entire Aperio stack. Both pods should show <code>1/1 Ready</code>, both Services should have ports assigned, and the IngressRoute should exist. This is your smoke test — if everything passes, the stack is running.',
        parts: [
          { text: '1/1 Ready', explanation: 'both containers have passed their readiness probes — the stack is healthy' },
          { text: 'RESTARTS 0', explanation: 'no crashes since deploy — a good sign the config is correct' },
          { text: 'IngressRoute present', explanation: 'Traefik is aware of the route — DNS is the next step' },
        ],
        example: 'kubectl -n aperio get pods,svc,ingressroute\n\n# Expected healthy output:\n# NAME                           READY   STATUS    RESTARTS   AGE\n# pod/aperio-xxxxxxxxx-yyyyy     1/1     Running   0          2m\n# pod/postgres-0                 1/1     Running   0          3m\n#\n# NAME                 TYPE        CLUSTER-IP     PORT(S)    AGE\n# service/aperio       ClusterIP   10.43.x.x      31337/TCP  2m\n# service/postgres     ClusterIP   None           8008/TCP   3m\n#\n# NAME                                        AGE\n# ingressroute.traefik.io/aperio              1m\n#\n# Test access (port-forward bypasses DNS):\nkubectl -n aperio port-forward svc/aperio 31337:31337 &\ncurl -s http://localhost:31337 | head -5\nkill %1\n\n# Or add DNS and open in browser:\n# echo "<pi-ip>  aperio.local" | sudo tee -a /etc/hosts\n# open http://aperio.local',
        why: "Always verify before moving on. If either pod isn't 1/1 Ready, fix it before configuring the CI/CD webhook — a broken stack with a working webhook is a broken stack that auto-deploys more broken versions. Postgres must be healthy first; Aperio's logs will show connection refused until the DB is up.",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: CI/CD — WEBHOOK SETUP
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'CI/CD — Automatic Deploy from GitHub',
    content: `
      <p>
        <strong>Push to <code>master</code>, the Pi redeploys automatically.</strong> The
        pipeline works in two halves (once you uncomment the webhook step in
        <code>.github/workflows/cd.k3s-deploy.yml</code>):
      </p>
      <ol>
        <li><strong>GitHub</strong> — on push to <code>master</code>, the
            <code>cd.k3s-deploy</code> workflow builds the ARM64 image via QEMU
            cross-compile, pushes to <code>ghcr.io</code> (tagged <code>:latest</code>
            and <code>:&lt;sha&gt;</code>), then (once uncommented) sends an
            HMAC-signed POST to the Pi.</li>
        <li><strong>Pi</strong> — the <code>webhook</code> receiver validates
            the HMAC signature and runs <code>aperio-watch-deploy.sh</code>:
            apply manifests → rollout restart (pulls new image) → run
            migrations.</li>
      </ol>
      <p>
        The image is never built on the Pi — GitHub's runners handle the
        cross-compilation. The Pi only pulls, which takes seconds for a
        ~300 MB Node.js image on a local network or reasonable broadband.
      </p>

      <pre><code>git push → GitHub CI    webhook POST       Pi
  master    builds ARM64 ─────────────────→  validates HMAC
            pushes ghcr.io                    pulls new image
                                              rollout restart
                                              runs migrations
                                              → LIVE at aperio.local</code></pre>
    `,
  },

  {
    type: 'commands',
    section: 'aperio-cicd',
    sectionTitle: 'Aperio · CI/CD Setup',
    items: [
      {
        id: 720,
        commandTitle: 'Create the Webhook Config & Service',
        command: 'sudo systemctl enable --now aperio-webhook',
        searchTerms: 'webhook apt install systemd service receiver HMAC GitHub Actions deploy trigger config',
        description: 'Creates the webhook receiver config (HMAC-signed JSON) and a systemd service that keeps it running on port 9001. The <code>webhook</code> binary is a lightweight Go HTTP server — install it with <code>apt</code>, then drop in the config and service files. The webhook listens for GitHub POSTs and runs <code>aperio-watch-deploy.sh</code> when the HMAC signature matches.',
        parts: [
          { text: 'apt install webhook', explanation: 'lightweight Go binary — no runtime dependencies, ~10 MB' },
          { text: 'aperio-webhook.conf', explanation: 'JSON config: maps a hook ID to a shell command, with HMAC-SHA256 signature validation' },
          { text: 'aperio-webhook.service', explanation: 'systemd unit — auto-restarts on failure, logs to journald' },
          { text: 'port 9001', explanation: 'the webhook listens here; your Cloudflare Tunnel or Tailscale Funnel must route to localhost:9001' },
        ],
        example: "# On the Pi:\nsudo apt update && sudo apt install -y webhook\n\ncd ~/aperio-k3s\n\n# --- aperio-webhook.conf ---\n# Generate a real HMAC secret first:\n#   openssl rand -hex 32\n# Replace CHANGE-ME-long-random-secret with the output.\ncat > aperio-webhook.conf <<'EOF'\n[\n  {\n    \"id\": \"aperio-deploy\",\n    \"execute-command\": \"/home/pi/aperio-k3s/aperio-watch-deploy.sh\",\n    \"command-working-directory\": \"/home/pi/aperio\",\n    \"pass-environment-to-command\": [],\n    \"trigger-rule\": {\n      \"match\": {\n        \"type\": \"payload-hmac-sha256\",\n        \"secret\": \"CHANGE-ME-long-random-secret\",\n        \"parameter\": {\n          \"source\": \"header\",\n          \"name\": \"X-Hub-Signature-256\"\n        }\n      }\n    }\n  }\n]\nEOF\n\n# --- aperio-webhook.service ---\ncat > aperio-webhook.service <<'EOF'\n[Unit]\nDescription=Aperio — webhook receiver for real-time CD\nAfter=network-online.target\nWants=network-online.target\n\n[Service]\nType=simple\nUser=pi\nWorkingDirectory=/home/pi/aperio\nExecStart=/usr/bin/webhook -hooks /etc/webhook.d/aperio.conf -port 9001 -verbose\nRestart=on-failure\nRestartSec=5\n\n# Log to journald\nStandardOutput=journal\nStandardError=journal\nSyslogIdentifier=aperio-webhook\n\n[Install]\nWantedBy=multi-user.target\nEOF\n\n# Install files:\nsudo mkdir -p /etc/webhook.d\nsudo cp aperio-webhook.conf /etc/webhook.d/aperio.conf\nsudo cp aperio-webhook.service /etc/systemd/system/\nsudo systemctl daemon-reload\nsudo systemctl enable --now aperio-webhook\n\n# Verify it's running:\ncurl -s http://localhost:9001\n# → {\"status\":\"ok\"} or similar\n\n# Watch logs:\nsudo journalctl -u aperio-webhook -f",
        why: "The webhook binary is simpler than running a full Node.js/Python HTTP server for this one job. It handles HMAC validation natively, runs as a non-root systemd service, and logs to journald. The separate config file means you can update the secret or command without touching the systemd unit — just edit /etc/webhook.d/aperio.conf and restart.",
      },
      {
        id: 721,
        commandTitle: 'Create the Watch-Deploy Script',
        command: 'chmod +x ~/aperio-k3s/aperio-watch-deploy.sh',
        searchTerms: 'watch-deploy script pull ghcr rollout restart kubectl apply migrations deploy watch',
        description: 'Creates the deploy script the webhook runs. It applies any changed manifests, triggers a <code>rollout restart</code> (which causes k3s to pull the new image from ghcr.io), waits for the rollout to complete, and runs database migrations. The script only pulls — the image was already built and pushed by GitHub CI.',
        parts: [
          { text: 'kubectl apply -f', explanation: 'applies any manifest changes (configmap, resource limits, etc.) alongside the image update' },
          { text: 'rollout restart', explanation: 'triggers a rolling restart of the Deployment — k3s pulls the latest image from ghcr.io' },
          { text: 'rollout status --timeout=180s', explanation: 'blocks until the new pod is ready or 3 minutes pass — keeps the webhook honest' },
          { text: 'node db/migrate.js', explanation: 'runs schema migrations inside the new pod — idempotent, safe to run every deploy' },
        ],
        example: "cd ~/aperio-k3s\ncat > aperio-watch-deploy.sh <<'SCRIPT'\n#!/usr/bin/env bash\n# aperio-watch-deploy.sh — pull new image from ghcr.io and redeploy to k3s.\n#\n# Called by the webhook receiver (aperio-webhook.service) after GitHub CI\n# builds and pushes the ARM64 image to ghcr.io. This script just applies\n# manifest changes, triggers a rollout (which pulls the new image), and\n# runs migrations.\n\nset -euo pipefail\n\nNAMESPACE=\"${NAMESPACE:-aperio}\"\nKUBECTL=\"${KUBECTL:-kubectl}\"\nWEBHOOK_CONF_DIR=\"${WEBHOOK_CONF_DIR:-/home/pi/aperio-k3s}\"\n\nlog() { echo \"[$(date -Iseconds)] $*\"; }\n\n# 1. Apply any manifest changes\nif [ -d \"$WEBHOOK_CONF_DIR\" ]; then\n  log \"Applying Kubernetes manifests from $WEBHOOK_CONF_DIR ...\"\n  \"$KUBECTL\" apply -f \"$WEBHOOK_CONF_DIR/namespace.yaml\" 2>/dev/null || true\n  \"$KUBECTL\" apply -f \"$WEBHOOK_CONF_DIR/postgres.yaml\" 2>/dev/null || true\n  \"$KUBECTL\" apply -f \"$WEBHOOK_CONF_DIR/aperio.yaml\" 2>/dev/null || true\n  \"$KUBECTL\" apply -f \"$WEBHOOK_CONF_DIR/ingress.yaml\" 2>/dev/null || true\nfi\n\n# 2. Rollout restart — k3s pulls the new ghcr.io image\nlog \"Rolling out restart for deploy/aperio ...\"\n\"$KUBECTL\" -n \"$NAMESPACE\" rollout restart deploy/aperio 2>&1\n\nlog \"Waiting for rollout to complete ...\"\nif \"$KUBECTL\" -n \"$NAMESPACE\" rollout status deploy/aperio --timeout=180s 2>&1; then\n  log \"Rollout successful — new image pulled and running.\"\nelse\n  log \"WARNING: rollout did not complete in time.\"\nfi\n\n# 3. Run database migrations\nlog \"Running database migrations ...\"\nif \"$KUBECTL\" -n \"$NAMESPACE\" exec deploy/aperio -- node db/migrate.js 2>&1; then\n  log \"Migrations completed successfully.\"\nelse\n  log \"WARNING: migrations failed.\"\nfi\n\nlog \"Done.\"\nSCRIPT\n\nchmod +x aperio-watch-deploy.sh\n\n# Test it manually (should succeed if the stack is already deployed):\n./aperio-watch-deploy.sh",
        why: "The script pins the image name in the Deployment YAML, not in the script itself — the webhook only triggers a restart; the image tag (ghcr.io/baiganio/aperio:latest) is defined in aperio.yaml. migrations run every time (idempotent), so schema updates in a new image are applied immediately after the rollout.",
      },
      {
        id: 722,
        commandTitle: 'Make the Webhook Reachable & Set GitHub Secrets',
        command: 'cloudflared tunnel route dns <tunnel-id> aperio-webhook',
        searchTerms: 'cloudflare tunnel tailscale funnel expose webhook port 9001 github reachable public secrets actions workflow',
        description: 'Makes the Pi\'s webhook receiver (port 9001) reachable from GitHub\'s runners via Cloudflare Tunnel or Tailscale Funnel. Then configure two GitHub secrets in the Aperio repo: <code>APERIO_PI_WEBHOOK_URL</code> and <code>APERIO_PI_WEBHOOK_SECRET</code>. Finally, <strong>uncomment the webhook notification step</strong> in <code>.github/workflows/cd.k3s-deploy.yml</code>.',
        parts: [
          { text: 'Cloudflare Tunnel', explanation: 'add another ingress rule to your existing cloudflared config pointing at localhost:9001 — uses your existing tunnel infrastructure' },
          { text: 'Tailscale Funnel', explanation: 'sudo tailscale funnel 9001 — simplest if you already use Tailscale; gives you a public *.ts.net URL' },
          { text: 'GitHub Secrets', explanation: 'two secrets: APERIO_PI_WEBHOOK_URL and APERIO_PI_WEBHOOK_SECRET — the workflow references them as ${{ secrets.… }}' },
          { text: 'Uncomment webhook step', explanation: 'in cd.k3s-deploy.yml, the "Notify Pi" step (~lines 60–90) is commented out — remove the # to activate it' },
        ],
        example: "# Option 1 — Cloudflare Tunnel (add to your existing config):\n# Edit your cloudflared config.yml and add ABOVE the wildcard:\n# ingress:\n#   - hostname: aperio-webhook.yourdomain.com\n#     service: http://localhost:9001\n#   - hostname: \"*.yourdomain.com\"\n#     service: http://localhost:80\n#   - service: http_status:404\n# cloudflared tunnel route dns <tunnel-id> aperio-webhook.yourdomain.com\n# sudo systemctl restart cloudflared\n\n# Option 2 — Tailscale Funnel:\n# sudo tailscale funnel 9001\n\n# --- GitHub: Settings → Secrets and variables → Actions ---\n# Secret 1:\n#   Name:  APERIO_PI_WEBHOOK_URL\n#   Value: https://aperio-webhook.yourdomain.com\n#          (or https://your-pi.ts.net:9001 for Tailscale)\n#\n# Secret 2:\n#   Name:  APERIO_PI_WEBHOOK_SECRET\n#   Value: a1b2c3d4e5f6... (your 64-char hex secret from step 720)\n\n# --- In the aperio repo ---\n# Edit .github/workflows/cd.k3s-deploy.yml\n# Uncomment the \"Notify Pi — trigger deploy webhook\" step (lines ~60-90)\n# Commit and push to master:\ngit commit --allow-empty -m \"test: trigger CD pipeline\"\ngit push origin master\n\n# Watch the Actions tab in GitHub and:\nsudo journalctl -u aperio-webhook -f   # on the Pi",
        why: "GitHub's hosted runners are in Azure data centers — they can't reach your home LAN without a tunnel or public endpoint. The self-hosted runner option (install the GitHub runner on the Pi itself, then use http://localhost:9001 as the webhook URL) is the simplest for testing, but uses Pi resources. Cloudflare Tunnel or Tailscale Funnel are zero-cost, zero-maintenance options that don't require opening router ports.",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: VERIFY & TROUBLESHOOT
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Verify & Troubleshoot',
    content: `
      <p>
        <strong>Verify before you fix.</strong> Most "my app is down" problems
        are networking (DNS, ingress, tunnel), not application code. Work
        outside-in: is the pod running? is the service reachable from inside
        the cluster? does the ingress resolve? is the tunnel up?
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'aperio-verify',
    sectionTitle: 'Aperio · Verify & Troubleshoot',
    items: [
      {
        id: 730,
        commandTitle: 'Health Check — All Pods & Services',
        command: 'kubectl -n aperio get pods,svc,ingressroute',
        searchTerms: 'health check pods services ingress verify status ready running all-in-one',
        description: 'One-command health check for the entire Aperio stack. Shows all pods, their readiness status, restart counts, services with ports, and the Traefik IngressRoute. Run this first whenever something seems wrong.',
        parts: [
          { text: '-n aperio', explanation: 'scoped to the aperio namespace — shows only Aperio resources, not the whole cluster' },
          { text: 'pods,svc,ingressroute', explanation: 'comma-separated resource types — queries all three at once' },
          { text: 'READY 1/1', explanation: 'both pods should show 1/1 — any other value means a container isn\'t healthy' },
          { text: 'RESTARTS', explanation: '> 0 means a container crashed and k3s restarted it — check logs immediately' },
        ],
        example: 'kubectl -n aperio get pods,svc,ingressroute\n\n# Expected healthy output:\n# NAME                           READY   STATUS    RESTARTS   AGE\n# pod/aperio-xxxxxxxxx-yyyyy     1/1     Running   0          1h\n# pod/postgres-0                 1/1     Running   0          2h\n#\n# NAME                 TYPE        CLUSTER-IP     PORT(S)    AGE\n# service/aperio       ClusterIP   10.43.x.x      31337/TCP  1h\n# service/postgres     ClusterIP   None           8008/TCP   2h\n#\n# NAME                                        AGE\n# ingressroute.traefik.io/aperio              1h\n\n# If either pod is NOT 1/1 Ready, check logs:\nkubectl -n aperio logs deploy/aperio --tail=50\nkubectl -n aperio logs postgres-0 --tail=50',
        why: 'This is your first diagnostic stop — always. A red herring pod crash is usually a symptom, not the cause. If postgres-0 is crash-looping, aperio will fail too because it can\'t connect to the DB. Fix the database first, then the app.',
      },
      {
        id: 731,
        commandTitle: 'Fix ImagePullBackOff',
        command: 'kubectl -n aperio describe pod -l app=aperio | grep -A5 "Failed"',
        searchTerms: 'imagepullbackoff errImagePull pull failed ghcr.io rate limit network arm64 architecture',
        description: 'Diagnoses why k3s can\'t pull the Aperio image from ghcr.io. Common causes: ghcr.io rate limiting (wait and retry), network connectivity (can the Pi reach ghcr.io?), or private repo without pull secrets (the default image is public — no secret needed).',
        parts: [
          { text: 'describe pod', explanation: 'shows Events at the bottom — the most recent failure reason is usually the last event' },
          { text: 'grep -A5 "Failed"', explanation: 'shows the failure line plus 5 lines after for the full error message' },
          { text: 'ghcr.io rate limit', explanation: 'anonymous pulls are rate-limited (~100/hour); wait a few minutes or authenticate' },
        ],
        example: '# Check why the pull failed:\nkubectl -n aperio describe pod -l app=aperio | grep -A5 "Failed"\n# → Failed to pull image "ghcr.io/baiganio/aperio:latest":\n#   ... toomanyrequests: You have reached your pull rate limit.\n\n# Quick fix — verify network and retry:\ncurl -s https://ghcr.io | head    # can the Pi reach ghcr.io?\nkubectl -n aperio delete pod -l app=aperio  # force re-pull\nkubectl -n aperio rollout status deploy/aperio --timeout=180s\n\n# If the image is private (repo went private), add imagePullSecrets:\n# kubectl -n aperio create secret docker-registry ghcr-secret \\\n#   --docker-server=ghcr.io \\\n#   --docker-username=<github-user> \\\n#   --docker-password=<github-pat-with-read:packages>\n# Then add imagePullSecrets to aperio.yaml\'s Deployment spec.',
        why: 'ImagePullBackOff is the most common failure mode on a fresh deploy. The image is public on ghcr.io, so authentication isn\'t the issue — it\'s almost always network (DNS, firewall, or ghcr.io rate limit). If you\'re not rate-limited and the Pi can reach the internet, check that the image tag exists and the architecture matches (ARM64).',
      },
      {
        id: 732,
        commandTitle: 'Debug Postgres Connectivity',
        command: 'kubectl -n aperio exec deploy/aperio -- env | grep DATABASE_URL',
        searchTerms: 'postgres connection refused database url env var password mismatch troubleshoot debug pg_isready',
        description: 'Checks the <code>DATABASE_URL</code> environment variable inside the Aperio pod. This is the single most common config error — if the password, host, or port is wrong, Aperio can\'t connect to Postgres and will crash-loop.',
        parts: [
          { text: 'DATABASE_URL', explanation: 'connection string: postgresql://aperio:<password>@postgres.aperio.svc.cluster.local:8008/aperio' },
          { text: 'postgres.aperio.svc.cluster.local', explanation: 'the headless Service DNS — resolves to the StatefulSet pod\'s IP' },
          { text: ':8008', explanation: 'the Service port — NOT the container port 5432' },
        ],
        example: '# Check the connection string:\nkubectl -n aperio exec deploy/aperio -- env | grep DATABASE_URL\n# → postgresql://aperio:<masked>@postgres.aperio.svc.cluster.local:8008/aperio\n\n# Verify Postgres is accepting connections:\nkubectl -n aperio exec postgres-0 -- pg_isready -U aperio -d aperio\n# → /var/run/postgresql:5432 - accepting connections\n\n# Test connectivity from the aperio pod:\nkubectl -n aperio exec deploy/aperio -- sh -c \\\n  "nc -zv postgres.aperio.svc.cluster.local 8008"\n# → Connection to postgres.aperio.svc.cluster.local 8008 port [tcp/*] succeeded!\n\n# If connection is refused, check the password matches:\nkubectl -n aperio get secret aperio-secrets -o jsonpath=\'{.data.postgres-password}\' | base64 -d\n# Verify this matches what\'s in secrets.yaml',
        why: 'The most subtle Postgres error is password mismatch after a namespace wipe. If you delete and recreate the namespace, the PVC is also deleted (unless you backed it up), and a new Postgres instance starts with a fresh data directory. The password in secrets.yaml must match what the init scripts set — or you get "password authentication failed" in the logs.',
      },
      {
        id: 733,
        commandTitle: 'Debug Webhook — Test Manually',
        command: 'curl -X POST http://localhost:9001 -H "X-Hub-Signature-256: sha256=..." -d \'{"test":true}\'',
        searchTerms: 'webhook debug test curl hmac signature manual trigger journalctl log diagnose',
        description: 'Tests the webhook receiver manually from the Pi itself. Sends a signed POST to <code>localhost:9001</code> that mimics what GitHub Actions would send. Use this to isolate whether the problem is the webhook config, the HMAC secret, or network connectivity from GitHub.',
        parts: [
          { text: 'X-Hub-Signature-256', explanation: 'the HMAC-SHA256 header GitHub sends — the webhook binary validates this against the configured secret' },
          { text: 'openssl sha256 -hmac', explanation: 'generates the HMAC signature locally so you can construct a valid test request' },
          { text: 'journalctl -u aperio-webhook -f', explanation: 'watch the webhook logs in real-time to see if the request arrives and what happens' },
        ],
        example: '# On the Pi, test the webhook locally:\nSECRET="your-hex-secret-from-config"\nBODY=\'{"test":true}\'\nSIG=$(echo -n "$BODY" | openssl sha256 -hmac "$SECRET" | awk \'{print $2}\')\ncurl -v -X POST http://localhost:9001 \\\n  -H "Content-Type: application/json" \\\n  -H "X-Hub-Signature-256: sha256=$SIG" \\\n  -d "$BODY"\n\n# Watch the webhook logs in another terminal:\nsudo journalctl -u aperio-webhook -f\n\n# Common failures:\n# - "404 page not found" → wrong hook path (check /etc/webhook.d/aperio.conf)\n# - "401 Unauthorized" → signature mismatch (secret in config != test secret)\n# - No response → webhook service not running (sudo systemctl status aperio-webhook)\n# - 200 but deploy script fails → check ~/aperio-k3s/ exists and is readable',
        why: 'Always test locally before debugging network connectivity. If the webhook works from localhost but not from GitHub, the issue is the tunnel/network — the webhook config itself is fine. The HMAC signature must use exactly the same secret and payload as what the receiver expects.',
      },
    ],
  },

  // ── Memory Budget ────────────────────────────────────────────────────────

  {
    type: 'note',
    variant: 'tip',
    content: `
      <strong>Memory budget on an 8 GB Pi 5 with Aperio deployed:</strong>
      <table style="width:100%; border-collapse:collapse; margin-top:0.5rem;">
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:0.25rem 0.5rem;">k3s + system overhead</td>
          <td style="padding:0.25rem 0.5rem;">~800 MB</td>
        </tr>
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:0.25rem 0.5rem;">Postgres (pgvector)</td>
          <td style="padding:0.25rem 0.5rem;">256 MB request, 1 GB limit</td>
        </tr>
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:0.25rem 0.5rem;">Aperio (Node.js)</td>
          <td style="padding:0.25rem 0.5rem;">512 MB request, 1 GB limit</td>
        </tr>
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:0.25rem 0.5rem;">Webhook receiver</td>
          <td style="padding:0.25rem 0.5rem;">~10 MB (host-level systemd service)</td>
        </tr>
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:0.25rem 0.5rem;"><strong>Total worst-case</strong></td>
          <td style="padding:0.25rem 0.5rem;"><strong>~2.8 GB</strong></td>
        </tr>
        <tr>
          <td style="padding:0.25rem 0.5rem;"><strong>Headroom</strong></td>
          <td style="padding:0.25rem 0.5rem;"><strong>~5.2 GB</strong> — plenty for bgapi, other workloads, or bursting</td>
        </tr>
      </table>
      <p style="margin-top:0.75rem;">
        This is why cloud-only AI providers are non-negotiable for Aperio on a
        Pi 5. A single 7B-parameter local LLM (quantized) needs 4–6 GB just
        for the model weights. With cloud providers, the AI compute happens on
        someone else's GPU and your Pi only handles the chat UI, database, and
        orchestration — well within its 8 GB budget.
      </p>
    `,
  },

  // ── Quick Reference ──────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Quick Reference',
    content: `
      <h4>Essential Commands</h4>
      <table style="width:100%; border-collapse:collapse;">
        <tr style="text-align:left; border-bottom:1px solid var(--border);">
          <th style="padding:0.25rem 0.5rem;">Task</th>
          <th style="padding:0.25rem 0.5rem;">Command</th>
        </tr>
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:0.25rem 0.5rem;">Deploy from scratch</td>
          <td style="padding:0.25rem 0.5rem;"><code>cd ~/aperio-k3s && for f in namespace secrets configmap postgres aperio ingress; do kubectl apply -f $f.yaml; done</code></td>
        </tr>
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:0.25rem 0.5rem;">Manual restart (pull new image)</td>
          <td style="padding:0.25rem 0.5rem;"><code>kubectl -n aperio rollout restart deploy/aperio</code></td>
        </tr>
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:0.25rem 0.5rem;">Run migrations</td>
          <td style="padding:0.25rem 0.5rem;"><code>kubectl -n aperio exec deploy/aperio -- node db/migrate.js</code></td>
        </tr>
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:0.25rem 0.5rem;">View logs</td>
          <td style="padding:0.25rem 0.5rem;"><code>kubectl -n aperio logs deploy/aperio --tail=100 -f</code></td>
        </tr>
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:0.25rem 0.5rem;">Port-forward (no DNS)</td>
          <td style="padding:0.25rem 0.5rem;"><code>kubectl -n aperio port-forward svc/aperio 31337:31337</code></td>
        </tr>
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:0.25rem 0.5rem;">Wipe and redeploy</td>
          <td style="padding:0.25rem 0.5rem;"><code>kubectl delete namespace aperio && cd ~/aperio-k3s && for f in namespace secrets configmap postgres aperio ingress; do kubectl apply -f $f.yaml; done</code></td>
        </tr>
        <tr>
          <td style="padding:0.25rem 0.5rem;">Check webhook</td>
          <td style="padding:0.25rem 0.5rem;"><code>sudo journalctl -u aperio-webhook -f</code></td>
        </tr>
      </table>

      <h4 style="margin-top:1.5rem;">File Locations</h4>
      <table style="width:100%; border-collapse:collapse;">
        <tr style="text-align:left; border-bottom:1px solid var(--border);">
          <th style="padding:0.25rem 0.5rem;">What</th>
          <th style="padding:0.25rem 0.5rem;">Where</th>
        </tr>
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:0.25rem 0.5rem;">Kubernetes manifests</td>
          <td style="padding:0.25rem 0.5rem;"><code>/home/pi/aperio-k3s/</code> — created inline by the commands above</td>
        </tr>
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:0.25rem 0.5rem;">Webhook config</td>
          <td style="padding:0.25rem 0.5rem;"><code>/etc/webhook.d/aperio.conf</code></td>
        </tr>
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:0.25rem 0.5rem;">Webhook systemd unit</td>
          <td style="padding:0.25rem 0.5rem;"><code>/etc/systemd/system/aperio-webhook.service</code></td>
        </tr>
        <tr>
          <td style="padding:0.25rem 0.5rem;">GitHub workflow</td>
          <td style="padding:0.25rem 0.5rem;"><code>.github/workflows/cd.k3s-deploy.yml</code> in the aperio repo</td>
        </tr>
      </table>
    `,
  },

];
