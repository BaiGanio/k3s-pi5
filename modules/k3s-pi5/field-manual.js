// modules/k3s-pi5/field-manual.js
// Field Manual — your operating reference for the k3s cluster on a Pi 5

window.pageBlocks = [

  // ── What is the Field Manual? ─────────────────────────────────────────────

  {
    type: 'prose',
    title: 'The Field Manual',
    content: `
      <p>
        <strong>The Field Manual is your operating reference.</strong> It is not a tutorial or a
        walkthrough — it is the compact, searchable set of commands, checks, and diagnostic
        procedures you reach for when you are <em>already running</em> a k3s cluster on a
        Raspberry Pi 5 and you need to verify, fix, or secure something <em>right now</em>.
      </p>

      <h4>What's Inside</h4>
      <p>
        Five sections, each focused on a different operational need:
      </p>
      <ul>
        <li><strong>Sample Applications</strong> — deploy and test known-good workloads (Nginx, Node.js + Postgres) to validate your cluster before trusting it with your own code</li>
        <li><strong>Verification & Testing</strong> — systematic checks: are all pods running? do ingress routes resolve? is the Cloudflare tunnel healthy? what's the memory pressure?</li>
        <li><strong>Troubleshooting</strong> — diagnostic recipes for the six most common failure modes on a Pi 5 cluster: ImagePullBackOff, 503 errors, stuck PVCs, Cloudflare 522s, OOM evictions, and dashboard unreachable</li>
        <li><strong>kubectl Quick Reference</strong> — the commands you use every day: pod management, deployments, services, ConfigMaps and Secrets, namespaces, scaling, shell access, and rolling updates</li>
        <li><strong>Security Notes</strong> — password rotation, dashboard token management, k3s upgrades, persistent data backups, and network policies — the minimum viable security surface for a home lab exposed to the internet</li>
      </ul>

      <h4>How to Use This</h4>
      <p>
        <strong>Use the search bar.</strong> Every command and diagnostic is tagged with
        search terms. Type "503" and you land on the exact troubleshooting recipe. Type
        "backup" and you get the tar command with the date-stamped filename. You do not
        need to memorise these — you need to know they exist and be able to find them
        in under ten seconds when something breaks.
      </p>
      <p>
        <strong>Work outside-in.</strong> When something is unreachable from the internet,
        start at the Verification section (is the tunnel up? does the ingress resolve
        locally?) before you touch pod configs. Most "my app is down" problems are DNS
        or ingress routing, not application code.
      </p>
    `,
  },

  // ── Field Manual Principles ──────────────────────────────────────────────

  {
    type: 'note',
    variant: 'tip',
    content: `
      <strong>Three rules for operating a Pi 5 cluster:</strong>
      <ol style="margin-top: 0.5rem; padding-left: 1.5rem;">
        <li><strong>Verify before you fix.</strong> Run <code>kubectl get pods -A</code> first — always.
            A red herring pod crash is usually a symptom, not the cause.</li>
        <li><strong>ARM64 or nothing.</strong> The Pi 5 is ARM64. An <code>amd64</code>-only image will
            sit in ImagePullBackOff forever. Alpine-tagged images almost always include ARM64 support.</li>
        <li><strong>Back up before you mutate.</strong> Run the pg_dump + tar commands in Security Notes
            before any k3s upgrade, Postgres config change, or destructive operation. The Pi 5 has no
            snapshot infrastructure — you are the backup system.</li>
      </ol>
    `,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: SAMPLE APPLICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Sample Applications',
    content: `
      <p>
        Before you deploy your own code, validate the cluster with known-good workloads.
        These sample apps test every layer — pod scheduling, ClusterIP services, DNS
        resolution, Traefik ingress routing, and PostgreSQL connectivity. If any of these
        fail, your own app will fail too.
      </p>
      <p>
        <strong>Deploy in order:</strong> Nginx first (simplest, tests only the networking
        stack), then the Node.js + Postgres stack (tests DNS, Secrets, ConfigMaps, and
        database connectivity). The Nginx smoke test isolates infrastructure problems from
        application problems — if Nginx serves through Cloudflare but Node.js doesn't, the
        issue is in your app config, not your cluster.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'sample-apps',
    sectionTitle: 'Sample Applications',
    items: [
      {
        id: 100,
        commandTitle: 'Deploy Nginx Smoke Test',
        command: 'kubectl apply -f nginx-deployment.yaml',
        searchTerms: 'nginx deploy deployment smoke test arm64 service ingress welcome',
        description: 'Deploys a simple Nginx pod as an infrastructure smoke test. Confirms pod scheduling, ClusterIP services, and Traefik Ingress routing all work before you deploy Node.js.',
        parts: [
          { text: 'kind: Deployment',    explanation: 'manages the Nginx pod lifecycle — restarts it if it crashes' },
          { text: 'kind: Service',       explanation: 'gives the pod a stable ClusterIP; other pods reach it by service name' },
          { text: 'kind: Ingress',       explanation: 'routes nginx.yourdomain.com → the Service via Traefik' },
          { text: 'image: nginx:latest', explanation: 'official Nginx image — multi-arch, ARM64 compatible out of the box' },
          { text: 'resources.limits',    explanation: 'critical on the Pi — without limits a runaway pod can starve the whole node' },
        ],
        example: '# nginx-deployment.yaml\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: nginx-welcome\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: nginx\n  template:\n    metadata:\n      labels:\n        app: nginx\n    spec:\n      containers:\n      - name: nginx\n        image: nginx:latest\n        ports:\n        - containerPort: 80\n        resources:\n          requests:\n            memory: "64Mi"\n            cpu: "100m"\n          limits:\n            memory: "128Mi"\n            cpu: "250m"\n---\napiVersion: v1\nkind: Service\nmetadata:\n  name: nginx-welcome\nspec:\n  selector:\n    app: nginx\n  ports:\n  - port: 80\n    targetPort: 80\n  type: ClusterIP\n---\napiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: nginx-welcome\n  annotations:\n    traefik.ingress.kubernetes.io/router.entrypoints: web\nspec:\n  rules:\n  - host: nginx.yourdomain.com\n    http:\n      paths:\n      - path: /\n        pathType: Prefix\n        backend:\n          service:\n            name: nginx-welcome\n            port:\n              number: 80\n\n# Deploy and watch:\nkubectl apply -f nginx-deployment.yaml\nkubectl get pods -l app=nginx -w',
        why: 'Always validate the stack with the simplest possible workload first. If Nginx doesn\'t serve through Cloudflare → Traefik → Pod, neither will your Node.js app.',
      },
      {
        id: 101,
        commandTitle: 'Deploy Node.js API (with Postgres)',
        command: 'kubectl apply -f node-api-deployment.yaml',
        searchTerms: 'node.js nodejs api rest postgres postgresql deploy configmap secret env',
        description: 'Deploys a Node.js REST API backed by PostgreSQL. Non-sensitive config goes in a ConfigMap; the DB password goes in a Secret. Both are injected as environment variables via envFrom.',
        parts: [
          { text: 'kind: ConfigMap',                   explanation: 'holds DB_HOST, DB_PORT, DB_NAME, DB_USER, PORT — safe to commit to git' },
          { text: 'kind: Secret',                      explanation: 'holds DB_PASSWORD — base64-encoded at rest, never appears in logs' },
          { text: 'envFrom: configMapRef / secretRef', explanation: 'injects all keys from both resources as environment variables into the container' },
          { text: 'image: node:20-alpine',             explanation: 'lightweight Node.js LTS base image — ARM64 compatible, ~180 MB' },
          { text: 'service port 80 → targetPort 3000', explanation: 'the Service translates external port 80 to the Node.js app\'s internal port 3000' },
        ],
        example: '# node-api-deployment.yaml\napiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: node-api-config\ndata:\n  DB_HOST: postgres\n  DB_PORT: "5432"\n  DB_NAME: appdb\n  DB_USER: appuser\n  PORT: "3000"\n---\napiVersion: v1\nkind: Secret\nmetadata:\n  name: node-api-secret\ntype: Opaque\nstringData:\n  DB_PASSWORD: "changeme123"\n---\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: node-api\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: node-api\n  template:\n    metadata:\n      labels:\n        app: node-api\n    spec:\n      containers:\n      - name: node-api\n        image: node:20-alpine\n        ports:\n        - containerPort: 3000\n        envFrom:\n        - configMapRef:\n            name: node-api-config\n        - secretRef:\n            name: node-api-secret\n        env:\n        - name: DATABASE_URL\n          value: "postgresql://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)"\n        resources:\n          requests:\n            memory: "128Mi"\n            cpu: "100m"\n          limits:\n            memory: "256Mi"\n            cpu: "500m"\n---\napiVersion: v1\nkind: Service\nmetadata:\n  name: node-api\nspec:\n  selector:\n    app: node-api\n  ports:\n  - port: 80\n    targetPort: 3000\n  type: ClusterIP\n\n# Deploy:\nkubectl apply -f node-api-deployment.yaml',
        why: 'DATABASE_URL is constructed from the individual env vars — this makes it easy to change DB_HOST or DB_PASSWORD in one place without touching the connection string format.',
      },
      {
        id: 102,
        commandTitle: 'Verify Node.js Deployment',
        command: 'kubectl get deployment,svc,pods -l app=node-api',
        searchTerms: 'kubectl get deployment svc pods label verify status node-api',
        description: 'Lists everything with label app=node-api: the Deployment, its Service, and the running Pods. All-in-one status check.',
        parts: [
          { text: 'kubectl get',         explanation: 'generic resource retriever' },
          { text: 'deployment,svc,pods', explanation: 'comma-separated resource types — queries all three at once' },
          { text: '-l app=node-api',     explanation: 'label selector — only shows resources matching this label' },
        ],
        example: 'NAME                    READY   UP-TO-DATE   AVAILABLE\ndeployment.apps/node-api   1/1     1            1\n\nNAME             READY   STATUS    RESTARTS\nnode-api-abc12   1/1     Running   0\n\n# Logs:\nServer listening on port 3000\nConnected to PostgreSQL at postgres:5432/appdb\nGET /health 200 4ms',
        why: 'RESTARTS > 0 means the container crashed and k3s restarted it. Check logs immediately — the startup error is usually a missing env var or Postgres connection refused.',
      },
      {
        id: 103,
        commandTitle: 'Test Postgres Connection from Node.js Pod',
        command: 'kubectl exec -it $(kubectl get pod -l app=node-api -o jsonpath=\'{.items[0].metadata.name}\') -- node -e "const { Pool } = require(\'pg\'); const p = new Pool({ connectionString: process.env.DATABASE_URL }); p.query(\'SELECT NOW()\').then(r => { console.log(r.rows[0]); p.end(); });"',
        searchTerms: 'exec node postgres pg pool connect query test DATABASE_URL end-to-end',
        description: 'Shells into the running Node.js pod and fires a one-liner pg query using the pod\'s injected DATABASE_URL. Confirms DNS, credentials, and the pg library all work together.',
        parts: [
          { text: 'kubectl get pod -l app=node-api -o jsonpath=...', explanation: 'resolves the live pod name dynamically — survives pod restarts without copy-pasting' },
          { text: 'new Pool({ connectionString: process.env.DATABASE_URL })', explanation: 'uses the env var injected by the Secret/ConfigMap — tests the real runtime config' },
          { text: 'SELECT NOW()',                                    explanation: 'simplest valid Postgres query — if it returns a timestamp, the connection is healthy' },
        ],
        example: '{ now: 2024-01-15T10:30:00.000Z }\n\n# Common errors:\n# ECONNREFUSED → postgres pod isn\'t running or Service name is wrong\n# password authentication failed → Secret value doesn\'t match POSTGRES_PASSWORD\n# database "appdb" does not exist → POSTGRES_DB in ConfigMap was changed after initial volume creation',
        why: 'Faster than reading app logs to diagnose DB issues. Tests the exact connection string the app uses — not a local psql with hardcoded creds.',
      },
      {
        id: 104,
        commandTitle: 'Run a psql Session Against Postgres',
        command: 'kubectl run -it --rm postgres-client --image=postgres:15-alpine --restart=Never -- psql -h postgres -U appuser -d appdb',
        searchTerms: 'psql run client interactive postgres kubectl temporary pod query',
        description: 'Spins up a temporary postgres:15-alpine pod, opens an interactive psql session connected to your in-cluster Postgres, then deletes the pod when you exit.',
        parts: [
          { text: '--rm',                explanation: 'deletes the pod automatically when the session ends — no cleanup needed' },
          { text: 'postgres:15-alpine',  explanation: 'same image as the server — guarantees client/server protocol compatibility' },
          { text: 'restart=Never',       explanation: 'creates a Pod directly (not a Deployment) — correct for one-shot interactive tasks' },
          { text: '-h postgres',         explanation: 'hostname \'postgres\' resolves via CoreDNS to the ClusterIP Service' },
          { text: '-U appuser -d appdb', explanation: 'the user and database from your postgres-config ConfigMap' },
        ],
        example: 'psql (15.6)\nType "help" for help.\n\nappdb=# \\dt\n# Lists all tables in your Node.js app\'s database\n\nappdb=# SELECT count(*) FROM users;\nappdb=# \\q',
        why: 'Useful for running migrations manually, inspecting data, or debugging a Node.js query that\'s returning unexpected results. The pod is gone the moment you type \\q.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: VERIFICATION & TESTING
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Verification & Testing',
    content: `
      <p>
        <strong>Systematic verification — not guesswork.</strong> These commands give you a
        structured health check of your cluster. Run them in order: first confirm all pods
        are alive, then check ingress routes, then test DNS resolution through the
        Cloudflare tunnel, then inspect resource usage. By the time you finish this sequence,
        you know exactly which layer is healthy and which is broken.
      </p>
      <p>
        <strong>This is your first move after any change.</strong> Deployed a new app?
        Run the pod and ingress checks. Changed a ConfigMap? Follow the logs. The Pi 5
        won't tell you something is wrong — you have to look.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'verification',
    sectionTitle: 'Verification & Testing',
    items: [
      {
        id: 200,
        commandTitle: 'Verify All Pods Are Running',
        command: 'kubectl get pods -A',
        searchTerms: 'kubectl get pods all namespaces running status verify check',
        description: 'Lists every pod across all namespaces with its status. All pods should show Running or Completed. Any CrashLoopBackOff or ImagePullBackOff needs immediate attention.',
        parts: [
          { text: 'kubectl get pods', explanation: 'lists pod resources' },
          { text: '-A',               explanation: 'across all namespaces — includes kube-system (Traefik, CoreDNS), dashboard, and your apps' },
        ],
        example: 'NAMESPACE              NAME                              READY   STATUS\nkube-system            coredns-57f9...                   1/1     Running\nkube-system            traefik-7d6f...                   1/1     Running\nkube-system            local-path-provisioner-...        1/1     Running\ndefault                postgres-...                      1/1     Running\ndefault                node-api-...                      1/1     Running\nkubernetes-dashboard   kubernetes-dashboard-...          1/1     Running\n\n# Watch for changes in real-time:\nkubectl get pods -A -w',
        why: 'The first check after any \'kubectl apply\'. If a system pod like CoreDNS or local-path-provisioner is down, your app pods will behave unexpectedly even if they show Running.',
      },
      {
        id: 201,
        commandTitle: 'Check All Ingress Routes',
        command: 'kubectl get ingress -A',
        searchTerms: 'ingress routes list check all namespaces hosts address kubectl',
        description: 'Lists all Ingress rules across namespaces. Shows which hostnames map to which services and the assigned Traefik address. Use this to spot missing routes before testing Cloudflare.',
        parts: [
          { text: 'kubectl get ingress -A', explanation: 'lists Ingress resources across all namespaces with hosts and backend addresses' },
        ],
        example: 'NAMESPACE              NAME                   HOSTS                       ADDRESS\ndefault                node-api               api.yourdomain.com          192.168.1.100\ndefault                nginx-welcome          nginx.yourdomain.com        192.168.1.100\nkubernetes-dashboard   kubernetes-dashboard   dashboard.yourdomain.com    192.168.1.100\n\n# If ADDRESS is empty, Traefik hasn\'t assigned an IP yet:\nkubectl get svc -n kube-system traefik',
        why: 'An empty ADDRESS column means Traefik hasn\'t picked up the Ingress yet — usually because Traefik itself is not running or the namespace/annotation is wrong.',
      },
      {
        id: 202,
        commandTitle: 'Test DNS Resolution via Cloudflare Tunnel',
        command: 'curl -H "Host: api.yourdomain.com" http://localhost/health',
        searchTerms: 'curl test dns localhost host header cloudflare tunnel routing verify',
        description: 'Simulates exactly what Cloudflare\'s tunnel does — sends a request to Traefik with a specific Host header. If this returns 200 but the public domain doesn\'t, the issue is in the Cloudflare config.',
        parts: [
          { text: 'curl',                           explanation: 'makes an HTTP GET request from the Pi itself' },
          { text: '-H "Host: api.yourdomain.com"',  explanation: 'overrides the Host header — Traefik uses this to match Ingress rules, not the URL' },
          { text: 'http://localhost/health',         explanation: 'hits Traefik on port 80; swap /health for any route your Node.js app exposes' },
        ],
        example: '# Healthy Node.js response:\n{"status":"ok","db":"connected","uptime":3600}\n\n# 404 from Traefik → Ingress hostname doesn\'t match what you passed in -H\n# 503 from Traefik → Service exists but no healthy pod endpoints\n# Connection refused → Traefik isn\'t running on port 80',
        why: 'This test isolates the Cloudflare layer. If curl succeeds but https://api.yourdomain.com times out, only the Cloudflare tunnel config.yml needs fixing — not your k3s setup.',
      },
      {
        id: 203,
        commandTitle: 'Monitor Cloudflare Tunnel Status',
        command: 'cloudflared tunnel list && cloudflared tunnel info my-pi',
        searchTerms: 'cloudflared tunnel list info status connections monitor',
        description: 'Lists all registered tunnels and shows connection details for the my-pi tunnel — how many edge connections are active and which Cloudflare PoPs they\'re connected to.',
        parts: [
          { text: 'cloudflared tunnel list',     explanation: 'shows all tunnels in your Cloudflare account with their IDs and status' },
          { text: 'cloudflared tunnel info my-pi', explanation: 'shows active connections, connector IDs, and edge server locations for this specific tunnel' },
        ],
        example: 'ID                                   NAME    CREATED              CONNECTIONS\nabc123def456-7890-abcd-ef01-234567   my-pi   2024-01-10 09:00:00  4xQAQ\n\n# tunnel info output:\nConnector ID: xyz789\nStarted: 2024-01-15 08:30:00\nConnections: 4 active connections to edges:\n  - LHR (London) — 2 connections\n  - AMS (Amsterdam) — 2 connections',
        why: 'CONNECTIONS showing 0 means your systemd service isn\'t running or the Pi has no internet. 4 connections is normal — cloudflared maintains multiple edge connections for redundancy.',
      },
      {
        id: 204,
        commandTitle: 'Monitor Pod Resource Usage',
        command: 'kubectl top pods -A',
        searchTerms: 'kubectl top pods cpu memory resource usage monitor all namespaces',
        description: 'Shows live CPU (millicores) and memory (MiB) per pod. Critical on the Pi 5 — all pods share ~8 GB RAM and 4 cores with the OS itself.',
        parts: [
          { text: 'kubectl top pods', explanation: 'shows CPU (m = millicores, 1000m = 1 core) and memory for each running pod' },
          { text: '-A',               explanation: 'across all namespaces so you see total cluster consumption at a glance' },
        ],
        example: 'NAME                    CPU(cores)   MEMORY(MiB)\nnode-api-abc12          12m          85Mi\npostgres-def34          22m          134Mi\ntraefik-ghi56           5m           28Mi\ncoredns-jkl78           3m           18Mi\nkubernetes-dashboard    8m           45Mi\n\n# Total: ~50m CPU, ~310 MiB RAM in steady state\n# Pi 5 has ~4000m CPU and 8192 MiB available',
        why: 'If any pod shows memory near its limit (set in resources.limits.memory) it\'s at risk of OOMKill. Postgres is the usual culprit — its default shared_buffers is too high for a Pi.',
      },
      {
        id: 205,
        commandTitle: 'Follow Pod Logs in Real-Time',
        command: 'kubectl logs -l app=node-api -f',
        searchTerms: 'kubectl logs follow realtime app label selector node-api stream tail',
        description: 'Streams live stdout/stderr from your Node.js pod. The -l selector works even after a pod restart generates a new pod name.',
        parts: [
          { text: 'kubectl logs',    explanation: 'fetches container stdout and stderr' },
          { text: '-l app=node-api', explanation: 'selects pods by label rather than by name — the name changes on every restart' },
          { text: '-f',              explanation: 'follows (tails) the log stream — Ctrl+C to stop' },
        ],
        example: 'Server listening on port 3000\nConnected to PostgreSQL at postgres:5432/appdb\nGET /health 200 4ms\nPOST /api/users 201 23ms\nGET /api/users 200 8ms\n\n# Also useful:\nkubectl logs -l app=postgres -f       # postgres logs\nkubectl logs -l app=node-api --previous  # logs from the last crashed container',
        why: '--previous is the most useful flag you\'ll use when debugging CrashLoopBackOff — it shows what the container logged just before it died.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: TROUBLESHOOTING
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Troubleshooting',
    content: `
      <p>
        <strong>Diagnostic recipes, not vague advice.</strong> Each entry below targets a
        specific failure mode you <em>will</em> encounter on a Pi 5 cluster. They follow the
        same pattern: identify the symptom, run the diagnostic command, read the output, and
        follow the fix path. No theory — just the exact kubectl commands that reveal the
        root cause.
      </p>
      <p>
        <strong>Work outside-in.</strong> A 503 from the browser could be a crashed pod, a
        broken Service, a misconfigured Ingress, or a dead Cloudflare tunnel. Start with the
        Cloudflare layer (Error 522 recipe), then the ingress (503 recipe), then the pod
        itself. Each recipe tells you when to move to the next layer.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'troubleshooting',
    sectionTitle: 'Troubleshooting',
    items: [
      {
        id: 300,
        commandTitle: 'Debug: Pod Won\'t Start (ImagePullBackOff)',
        command: 'kubectl describe pod <pod-name> | grep -A 10 Events',
        searchTerms: 'imagepullbackoff describe pod events arm64 architecture',
        description: 'Describes the pod and filters to the Events section — shows exactly why the image couldn\'t be pulled. Usually an ARM64 incompatibility or a wrong tag.',
        parts: [
          { text: 'kubectl describe pod <pod-name>', explanation: 'shows full pod spec, conditions, and events' },
          { text: 'grep -A 10 Events',               explanation: 'prints 10 lines after \'Events:\' — where the pull error will appear' },
        ],
        example: 'Events:\n  Warning  Failed   Back-off pulling image "some-amd64-image:latest"\n  Warning  Failed   Failed to pull image: no match for platform linux/arm64\n\n# Fix: use ARM64-compatible images only:\n# ✅ node:20-alpine, postgres:15-alpine, nginx:latest\n# ❌ Images tagged \'amd64\', \'windows\', \'nanoserver\'',
        why: 'The Pi 5 is ARM64. Many Docker Hub images are amd64-only. Alpine-tagged images almost always include ARM64 support.',
      },
      {
        id: 301,
        commandTitle: 'Debug: App Running But Returning 503',
        command: 'kubectl describe pod <pod-name> && kubectl logs <pod-name> && kubectl get svc <service-name>',
        searchTerms: '503 service unavailable crashloopbackoff exec logs svc cluster-ip',
        description: 'Three-step debug sequence for a running pod that isn\'t serving traffic. Covers pod state, app logs, and service networking.',
        parts: [
          { text: 'kubectl describe pod',  explanation: 'shows restart count and last termination reason' },
          { text: 'kubectl logs',          explanation: 'shows app stdout — look for uncaught exceptions or DB connection errors' },
          { text: 'kubectl get svc',       explanation: 'confirms the Service has a CLUSTER-IP (not <pending>)' },
        ],
        example: '# Quick cluster-internal connectivity test:\nkubectl exec -it <pod-name> -- wget -qO- http://localhost:3000/health\n\n# If that works but the ingress returns 503:\nkubectl get ingress <name> -o yaml | grep -A 5 backend',
        why: '503 from Cloudflare tunnel almost always means Traefik can\'t reach the Service. Check the Ingress backend port matches the Service port.',
      },
      {
        id: 302,
        commandTitle: 'Debug: Postgres PVC Stuck in Pending',
        command: 'kubectl describe pvc database-pvc',
        searchTerms: 'pvc pending describe storage class provisioner binding',
        description: 'Shows why a PersistentVolumeClaim hasn\'t bound to a volume. Common causes: wrong storageClassName or missing /mnt/k3s-data/databases directory.',
        parts: [
          { text: 'kubectl describe pvc database-pvc', explanation: 'shows Events and conditions explaining why binding failed' },
        ],
        example: 'Events:\n  Warning  ProvisioningFailed  \n    storageclass.storage.k8s.io "local-path" not found\n\n# Fix: confirm k3s local-path provisioner is running:\nkubectl get pods -n kube-system | grep local-path',
        why: 'The PostgreSQL pod won\'t start until its PVC is Bound. Fix the PVC first, then the pod will schedule automatically.',
      },
      {
        id: 303,
        commandTitle: 'Debug: Cloudflare Tunnel Error 522',
        command: 'sudo systemctl status cloudflared && sudo journalctl -u cloudflared -n 50',
        searchTerms: 'cloudflare error 522 origin unreachable tunnel logs journalctl',
        description: 'Error 522 means Cloudflare\'s edge reached the Pi but got no response from cloudflared (or cloudflared couldn\'t reach localhost:80). Check service status and recent logs.',
        parts: [
          { text: 'systemctl status cloudflared',    explanation: 'shows if the service is active and recent log lines' },
          { text: 'journalctl -u cloudflared -n 50', explanation: 'last 50 log lines from the tunnel — look for connection errors' },
        ],
        example: '# Check Traefik is actually listening on port 80:\ncurl http://localhost/\n\n# Verify tunnel config hostname matches Cloudflare DNS:\ncat ~/.cloudflared/config.yml\n\n# Restart tunnel after config changes:\nsudo systemctl restart cloudflared',
        why: '522 is always a connectivity issue between cloudflared and localhost:80. Either Traefik isn\'t running or the config.yml has the wrong service URL.',
      },
      {
        id: 304,
        commandTitle: 'Debug: High Memory / Pod Eviction',
        command: 'kubectl top pods -A && kubectl get events -A --sort-by=\'.lastTimestamp\' | grep -i evict',
        searchTerms: 'oom memory limit exceeded eviction top pods events',
        description: 'Identifies which pods are consuming the most memory and shows any recent eviction events. The Pi 5 has limited RAM shared between k3s, the OS, and all your pods.',
        parts: [
          { text: 'kubectl top pods -A',              explanation: 'shows current memory usage per pod in MiB' },
          { text: 'kubectl get events -A',            explanation: 'lists cluster events across all namespaces' },
          { text: '--sort-by=\'.lastTimestamp\'',     explanation: 'most recent events first' },
          { text: 'grep -i evict',                    explanation: 'filters to eviction-related events only' },
        ],
        example: '# If Postgres is using too much memory, tune it:\n# Add to postgres container env:\n# - name: POSTGRES_INITDB_ARGS\n#   value: "-c shared_buffers=64MB -c max_connections=20"\n\n# Scale down non-essential deployments:\nkubectl scale deployment nginx-welcome --replicas=0',
        why: 'PostgreSQL defaults are tuned for servers with GBs of RAM. On the Pi, explicitly limit shared_buffers or pods will get OOMKilled under load.',
      },
      {
        id: 305,
        commandTitle: 'Debug: Dashboard Unreachable (End-to-End Checklist)',
        command: 'curl -s "https://1.1.1.1/dns-query?name=dashboard.yourdomain.com&type=CNAME" -H "accept: application/dns-json" | jq \'.Answer\' && echo \'--- local ingress ---\' && curl -sI -H "Host: dashboard.yourdomain.com" http://localhost/',
        searchTerms: 'dashboard not loading unreachable 500 dns cname serverstransport ivan ip sans checklist delete recreate stale reference stuck',
        description: 'Works the dashboard path from the outside in — the two most common failures are on <b>different layers</b>, so check them separately. Layer 1 (DNS): does the hostname resolve to the tunnel? Layer 2 (ingress/TLS): does Traefik return the dashboard HTML locally, or a 500?',
        parts: [
          { text: 'curl .../dns-query ... | jq \'.Answer\'', explanation: 'DNS check — a non-null Answer with data \'<uuid>.cfargotunnel.com\' means the wildcard/route CNAME exists. null/empty = no DNS record, traffic never reaches the Pi' },
          { text: 'curl -sI -H "Host: dashboard..." http://localhost/', explanation: 'ingress check — bypasses Cloudflare and hits Traefik directly. Want HTTP 200 (dashboard HTML). A 500 means the backend TLS handshake failed' },
        ],
        example: '# ✅ Healthy — Answer present + local 200:\n[ { "name": "dashboard.yourdomain.com", "data": "48d8...cfargotunnel.com" } ]\n--- local ingress ---\nHTTP/1.1 200 OK\n\n# ❌ Answer is null → DNS missing. Create the route:\ncloudflared tunnel route dns <tunnel-name> dashboard.yourdomain.com\n#   (or add a wildcard CNAME \'*\' → <uuid>.cfargotunnel.com, Proxied ON)\n\n# ❌ Local curl returns 500 (x509 ... doesn\'t contain any IP SANs):\n#   The dashboard\'s self-signed cert isn\'t being trusted. The Ingress needs\n#   BOTH annotations + a ServersTransport with insecureSkipVerify:\n#     traefik.ingress.kubernetes.io/service.serversscheme: https\n#     traefik.ingress.kubernetes.io/service.serverstransport: kubernetes-dashboard-dashboard-transport@kubernetescrd\n#   Check the CRD group first: sudo k3s kubectl get crd | grep serverstransport\n\n# ❌ Local curl STILL returns 500 (x509) even though the annotations AND the\n#    ServersTransport (with insecureSkipVerify: true) are all present and correct:\n#   The Ingress can hold a stale ServersTransport reference that never re-resolves —\n#   Traefik silently falls back to its DEFAULT transport, which verifies the cert.\n#   Editing/re-applying the Ingress in place does not always fix it. Delete and\n#   recreate it so Traefik re-reads the reference from scratch:\n#     sudo k3s kubectl -n kubernetes-dashboard delete ingress kubernetes-dashboard\n#     # then re-apply the dashboard Ingress (see the k3s Dashboard article)\n\n# ❌ Local curl returns \'service not found\' in Traefik logs:\n#   The Ingress is in the wrong namespace. It MUST live in kubernetes-dashboard\n#   (same namespace as the Service), not default.\nsudo k3s kubectl get ingress -A',
        why: 'The dashboard breaks in two independent places and people conflate them. If DNS resolves but you still can\'t load it, stop looking at Cloudflare — the problem is the ingress/ServersTransport on the Pi. If the local curl returns 200 but the browser can\'t reach it, stop looking at the cluster — the problem is DNS or the tunnel. This one command tells you which half to debug. And if the local curl 500s with a picture-perfect config, the reference itself is stuck — delete and recreate the Ingress rather than editing it in place.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: KUBECTL QUICK REFERENCE
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'kubectl Quick Reference',
    content: `
      <p>
        <strong>The commands you use every day.</strong> This section covers the kubectl
        primitives you need to operate the cluster: pod management, deployments, services,
        ConfigMaps and Secrets, namespaces, scaling, shell access, and rolling updates.
        Each entry is a compact reference — the exact command, what each part does, sample
        output, and why you reach for it.
      </p>
      <p>
        <strong>These are the 80/20 of kubectl.</strong> You do not need to memorise every
        kubectl subcommand. These nine patterns cover virtually every operational task on a
        single-node Pi 5 cluster. Everything else is a variation.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'quick-reference',
    sectionTitle: 'kubectl Quick Reference',
    items: [
      {
        id: 400,
        commandTitle: 'Pod Management Essentials',
        command: 'kubectl get pods\nkubectl describe pod <name>\nkubectl logs <pod>\nkubectl exec -it <pod> -- /bin/sh\nkubectl delete pod <name>',
        searchTerms: 'kubectl get pods describe logs exec delete sh shell management',
        description: 'The five commands you\'ll use in 90% of debugging sessions: list, inspect, read logs, shell in, and delete (which forces a fresh pod from the Deployment).',
        parts: [
          { text: 'kubectl get pods',                 explanation: 'lists pods in the current namespace with STATUS and RESTARTS count' },
          { text: 'kubectl describe pod <name>',      explanation: 'full detail: events, resource limits, volume mounts, liveness probe results' },
          { text: 'kubectl logs <pod>',               explanation: 'stdout/stderr from the container\'s process' },
          { text: 'kubectl exec -it <pod> -- /bin/sh', explanation: 'interactive shell inside the container — use /bin/sh not /bin/bash in Alpine images' },
          { text: 'kubectl delete pod <name>',        explanation: 'forces a pod restart; the Deployment controller creates a replacement immediately' },
        ],
        example: '# List only pods with issues:\nkubectl get pods -A | grep -v Running | grep -v Completed\n\n# Shell into postgres pod:\nkubectl exec -it $(kubectl get pod -l app=postgres -o jsonpath=\'{.items[0].metadata.name}\') -- /bin/sh\n\n# Force restart a deployment (delete all its pods):\nkubectl rollout restart deployment/node-api',
        why: 'kubectl delete pod is a safe way to force-restart a misbehaving pod — the Deployment immediately creates a replacement. It doesn\'t delete the Deployment or Service.',
      },
      {
        id: 401,
        commandTitle: 'Deployment Management',
        command: 'kubectl get deployments\nkubectl scale deployment <name> --replicas=2\nkubectl set image deployment/<name> app=image:tag\nkubectl rollout status deployment/<name>\nkubectl rollout undo deployment/<name>',
        searchTerms: 'kubectl deployment scale set image rollout status undo restart',
        description: 'Core deployment lifecycle commands — list, scale, update image, watch rollout progress, and roll back if something goes wrong.',
        parts: [
          { text: 'kubectl scale deployment <name> --replicas=2', explanation: 'scales to 2 pods; set to 0 to pause an app without deleting it' },
          { text: 'kubectl set image deployment/<name> app=image:tag', explanation: 'triggers a rolling update to the new image; format is container-name=image:tag' },
          { text: 'kubectl rollout status',                           explanation: 'watches the rollout until all pods are on the new version' },
          { text: 'kubectl rollout undo',                             explanation: 'reverts to the previous Deployment revision — your escape hatch' },
        ],
        example: '# Scale down to free RAM during development:\nkubectl scale deployment nginx-welcome --replicas=0\n\n# Update Node.js app to new image:\nkubectl set image deployment/node-api node-api=myapp:v2.0\nkubectl rollout status deployment/node-api\n\n# Something broke — roll back:\nkubectl rollout undo deployment/node-api\nkubectl rollout status deployment/node-api',
        why: 'rollout undo is critical on a Pi where you can\'t easily spin up a second environment to test. Always have an undo path before updating a production deployment.',
      },
      {
        id: 402,
        commandTitle: 'Service & Endpoint Inspection',
        command: 'kubectl get svc,endpoints -A',
        searchTerms: 'kubectl get svc endpoints service list all namespaces clusterip',
        description: 'Lists every Service and its resolved Endpoints across all namespaces. An Endpoint with no addresses means the label selector isn\'t matching any running pods.',
        parts: [
          { text: 'kubectl get svc,endpoints', explanation: 'comma-separated resource types — queries both at once' },
          { text: '-A',                         explanation: 'across all namespaces' },
        ],
        example: 'NAMESPACE   NAME          TYPE        CLUSTER-IP     PORT(S)\ndefault     node-api      ClusterIP   10.43.200.10   80/TCP\ndefault     postgres      ClusterIP   10.43.100.5    5432/TCP\n\nNAMESPACE   NAME          ENDPOINTS\ndefault     node-api      10.42.0.15:3000\ndefault     postgres      10.42.0.10:5432',
        why: 'If ENDPOINTS is empty for a service, the Service\'s label selector doesn\'t match any running pod. Check pod labels with \'kubectl get pods --show-labels\'.',
      },
      {
        id: 403,
        commandTitle: 'ConfigMap & Secret Management',
        command: 'kubectl get configmap,secret\nkubectl create configmap <name> --from-literal=key=value\nkubectl create secret generic <name> --from-literal=key=value',
        searchTerms: 'configmap secret kubectl create from-literal env vars',
        description: 'Lists and creates ConfigMaps and Secrets. These inject environment variables into pods — use ConfigMaps for non-sensitive data, Secrets for passwords.',
        parts: [
          { text: 'kubectl get configmap,secret', explanation: 'lists both resource types in the current namespace' },
          { text: '--from-literal=key=value',      explanation: 'creates a single key-value pair directly from the command line' },
        ],
        example: '# View ConfigMap data (decoded):\nkubectl get configmap postgres-config -o yaml\n\n# View Secret data (base64 decoded):\nkubectl get secret postgres-secret -o jsonpath=\'{.data.POSTGRES_PASSWORD}\' | base64 -d',
        why: 'Secrets are base64-encoded at rest, not encrypted. Never commit Secret YAML to git — use \'kubectl create secret\' from the command line instead.',
      },
      {
        id: 404,
        commandTitle: 'Namespace Operations',
        command: 'kubectl get ns\nkubectl create ns <name>\nkubectl config set-context --current --namespace=<name>',
        searchTerms: 'kubectl namespace get create set-context default',
        description: 'Namespace basics — list, create, and switch your default namespace. Switching saves you from adding -n to every command.',
        parts: [
          { text: 'kubectl get ns',               explanation: 'lists all namespaces with their status and age' },
          { text: 'kubectl create ns',            explanation: 'creates a new namespace for isolating workloads' },
          { text: 'kubectl config set-context',   explanation: 'switches your default namespace for all subsequent commands' },
        ],
        example: '# Switch to a namespace:\nkubectl config set-context --current --namespace=staging\n\n# Switch back to default:\nkubectl config set-context --current --namespace=default\n\n# View all namespaces:\nkubectl get ns',
        why: 'Use namespaces to separate staging from production on a single Pi. It\'s the cheapest form of environment isolation without spinning up a second cluster.',
      },
      {
        id: 405,
        commandTitle: 'Fix kubectl Permission Issues',
        command: 'sudo chown -R $USER:$USER ~/.kube',
        searchTerms: 'kubectl permission denied sudo chown fix',
        description: 'Fixes \'Permission denied\' errors when kubectl was run with sudo. K3s\'s kubeconfig is root-owned by default; this gives your user ownership of your local kubeconfig.',
        parts: [
          { text: 'sudo chown -R $USER:$USER', explanation: 'recursively changes file ownership to the current user' },
          { text: '~/.kube',                   explanation: 'the directory where kubeconfig files live' },
        ],
        example: '# Before fix:\n$ kubectl get nodes\nError: loading config file ~/.kube/config: permission denied\n\n# After fix:\n$ kubectl get nodes\nNAME       STATUS   ROLES    AGE\npi5-k3s    Ready    master   24h',
        why: 'Every kubectl command with sudo runs as root and writes root-owned files to your home directory. This one-time step prevents permission headaches across all future sessions.',
      },
      {
        id: 406,
        commandTitle: 'Scale a Deployment',
        command: 'kubectl scale deployment node-api --replicas=2',
        searchTerms: 'scale deployment replicas up down kubectl',
        description: 'Instantly scales a Deployment to the specified number of pod replicas. Set to 0 to pause an app without deleting it.',
        parts: [
          { text: 'kubectl scale deployment', explanation: 'changes the desired replica count for a Deployment' },
          { text: 'node-api',                 explanation: 'the name of the Deployment to scale' },
          { text: '--replicas=2',             explanation: 'the new desired number of running pods' },
        ],
        example: 'deployment.apps/node-api scaled\n\n# Verify:\nkubectl get pods -l app=node-api\n# NAME             READY   STATUS\n# node-api-abc12   1/1     Running\n# node-api-def34   1/1     Running',
        why: 'On the Pi 5, more than 2 replicas of a Node.js app will start competing for RAM. Scale up for load testing, scale to 0 to free resources.',
      },
      {
        id: 407,
        commandTitle: 'Shell Into a Running Pod',
        command: 'kubectl exec -it <pod-name> -- /bin/sh',
        searchTerms: 'exec shell sh bash interactive pod debug kubectl',
        description: 'Opens an interactive shell inside a running container. Essential for debugging — check environment variables, test DB connectivity, inspect the filesystem.',
        parts: [
          { text: 'kubectl exec -it', explanation: 'executes a command interactively (-i) with a TTY (-t)' },
          { text: '<pod-name>',       explanation: 'get the name from \'kubectl get pods\'' },
          { text: '-- /bin/sh',       explanation: 'the command to run — /bin/sh works in Alpine images (/bin/bash won\'t)' },
        ],
        example: '# Inside the node-api pod:\nenv | grep DB           # check DB env vars are injected\nwget -qO- http://postgres:5432  # test postgres service DNS\nnode -e "console.log(process.env.DATABASE_URL)"',
        why: 'Environment variables visible inside the pod may differ from what you expect — this is the definitive way to confirm your ConfigMap and Secret are mounted correctly.',
      },
      {
        id: 408,
        commandTitle: 'Rolling Update — Change Image',
        command: 'kubectl set image deployment/node-api node-api=node:20-alpine',
        searchTerms: 'set image deployment rolling update rollout kubectl',
        description: 'Updates the container image for a Deployment. K3s performs a rolling update — starts new pods before terminating old ones, so there\'s no downtime.',
        parts: [
          { text: 'kubectl set image',       explanation: 'updates the image field in the Deployment spec' },
          { text: 'deployment/node-api',     explanation: 'the Deployment to update' },
          { text: 'node-api=node:20-alpine', explanation: 'container-name=new-image-tag format' },
        ],
        example: 'deployment.apps/node-api image updated\n\n# Watch the rollout:\nkubectl rollout status deployment/node-api\n# Waiting for rollout to finish: 1 old replicas are pending termination\n# deployment "node-api" successfully rolled out\n\n# Roll back if something went wrong:\nkubectl rollout undo deployment/node-api',
        why: 'rollout undo is your escape hatch. Always verify the new image works in a test namespace before updating production.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: SECURITY NOTES
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Security Notes',
    content: `
      <p>
        <strong>Minimum viable security for a home lab exposed to the internet.</strong>
        Your Pi 5 cluster sits behind Cloudflare, but Cloudflare is not a substitute for
        cluster-level security. These procedures cover the five things that matter most:
        credential rotation, token management, keeping k3s updated, backing up persistent
        data before you break something, and network policies to limit blast radius.
      </p>
      <p>
        <strong>Secrets are base64-encoded, not encrypted.</strong> Anyone with kubectl
        access to your cluster can decode them. Treat your kubeconfig like a root SSH key.
        Never commit Secret YAML to git, and rotate passwords after any suspected exposure.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'security',
    sectionTitle: 'Security Notes',
    items: [
      {
        id: 500,
        commandTitle: 'Change Default Postgres Password',
        command: 'kubectl create secret generic postgres-secret --from-literal=POSTGRES_PASSWORD=\'your-new-secure-password\' --dry-run=client -o yaml | kubectl apply -f -',
        searchTerms: 'secret postgres password change rotate kubectl create dry-run apply',
        description: 'Rotates the Postgres password Secret without editing YAML by hand. The --dry-run=client -o yaml pipe trick generates the Secret manifest and applies it atomically.',
        parts: [
          { text: '--from-literal=POSTGRES_PASSWORD=\'...\'', explanation: 'sets the password directly from the command line — never put real passwords in YAML files committed to git' },
          { text: '--dry-run=client -o yaml',                 explanation: 'generates the Secret manifest without creating it — piped to kubectl apply for atomic update' },
          { text: 'kubectl apply -f -',                       explanation: 'reads YAML from stdin and applies it — updates the Secret in-place' },
        ],
        example: '# After rotating the secret, restart pods to pick it up:\nkubectl rollout restart deployment/postgres\nkubectl rollout restart deployment/node-api\n\n# Verify the new secret value (base64 decoded):\nkubectl get secret postgres-secret -o jsonpath=\'{.data.POSTGRES_PASSWORD}\' | base64 -d',
        why: 'Pods cache Secret values at startup. Restarting both Postgres and your Node.js app ensures they both use the new password — otherwise you\'ll get authentication failures.',
      },
      {
        id: 501,
        commandTitle: 'Regenerate Dashboard Token',
        command: 'kubectl -n kubernetes-dashboard create token admin-user --duration=3600s',
        searchTerms: 'dashboard token regenerate rotate expire duration admin-user',
        description: 'Generates a fresh dashboard token. Default tokens expire in 1 hour. Specify --duration for longer sessions. Never share this token — it has cluster-admin access.',
        parts: [
          { text: 'create token admin-user',  explanation: 'generates a new signed JWT; previous tokens are not invalidated automatically' },
          { text: '--duration=3600s',         explanation: 'token lifetime in seconds (3600s = 1 hour). Use 86400s for 24 hours' },
        ],
        example: '# For a 7-day token (home lab convenience):\nkubectl -n kubernetes-dashboard create token admin-user --duration=604800s\n\n# To invalidate all tokens for the ServiceAccount:\nkubectl -n kubernetes-dashboard delete secret $(kubectl -n kubernetes-dashboard get secret | grep admin-user | awk \'{print $1}\')',
        why: 'The token has cluster-admin access to everything in your cluster. Treat it like a root SSH key — don\'t paste it in chat or commit it to git.',
      },
      {
        id: 502,
        commandTitle: 'Update k3s',
        command: 'sudo systemctl stop k3s && curl -sfL https://get.k3s.io | sudo sh - && sudo systemctl start k3s',
        searchTerms: 'k3s update upgrade version systemctl stop start curl install',
        description: 'Updates k3s to the latest stable release. Stops the current k3s process, re-runs the installer (which upgrades in-place), then restarts. Pods resume after the node comes back Ready.',
        parts: [
          { text: 'sudo systemctl stop k3s',                   explanation: 'gracefully stops k3s and all managed pods' },
          { text: 'curl -sfL https://get.k3s.io | sudo sh -',  explanation: 're-runs the official installer — detects existing install and upgrades it' },
          { text: 'sudo systemctl start k3s',                  explanation: 'starts the upgraded k3s; pods restart automatically within ~30 seconds' },
        ],
        example: '# Pin to a specific version instead of latest:\ncurl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=v1.29.5+k3s1 sudo sh -\n\n# Verify the upgrade:\nkubectl version --short\nkubectl get nodes',
        why: 'Keeping k3s updated patches security vulnerabilities in the Kubernetes control plane and containerd. After updating, verify all pods recover with \'kubectl get pods -A -w\'.',
      },
      {
        id: 503,
        commandTitle: 'Back Up Persistent Data',
        command: 'sudo tar -czf ~/k3s-backup-$(date +%Y%m%d).tar.gz /mnt/k3s-data/',
        searchTerms: 'backup tar postgres data persistent storage k3s-data compress',
        description: 'Creates a compressed tar archive of all persistent data (databases, application files). Run this before any k3s upgrade or destructive operation.',
        parts: [
          { text: 'tar -czf',        explanation: 'creates (-c) a gzip-compressed (-z) archive to the file (-f) specified' },
          { text: '$(date +%Y%m%d)', explanation: 'appends today\'s date to the filename — e.g. k3s-backup-20240115.tar.gz' },
          { text: '/mnt/k3s-data/',  explanation: 'the directory containing all your Postgres data and application files' },
        ],
        example: '# Backup with Postgres in a consistent state:\n# 1. Dump Postgres first (while running):\nkubectl exec -it $(kubectl get pod -l app=postgres -o jsonpath=\'{.items[0].metadata.name}\') \\\n  -- pg_dump -U appuser appdb > ~/appdb-$(date +%Y%m%d).sql\n\n# 2. Then tar the raw data directory:\nsudo tar -czf ~/k3s-backup-$(date +%Y%m%d).tar.gz /mnt/k3s-data/\n\n# 3. Copy to a remote machine:\nscp ~/k3s-backup-*.tar.gz user@remote-host:~/backups/',
        why: 'pg_dump produces a portable SQL backup that survives Postgres version upgrades. The tar backup of raw data files is for disaster recovery — it only works with the exact same Postgres version.',
      },
      {
        id: 504,
        commandTitle: 'Enable Network Policies',
        command: 'kubectl apply -f network-policy-default-deny.yaml',
        searchTerms: 'network policy deny all ingress egress restrict traffic pods namespace',
        description: 'Applies a default-deny NetworkPolicy that blocks all traffic between pods unless explicitly allowed. After applying, add allow policies for Node.js → Postgres and Traefik → your services.',
        parts: [
          { text: 'podSelector: {}',                   explanation: 'empty selector matches all pods in the namespace — applies the deny to everything' },
          { text: 'policyTypes: [Ingress, Egress]',    explanation: 'denies both incoming and outgoing traffic by default' },
        ],
        example: '# network-policy-default-deny.yaml\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: default-deny-all\n  namespace: default\nspec:\n  podSelector: {}\n  policyTypes:\n  - Ingress\n  - Egress\n\n# Then allow node-api to reach postgres:\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: allow-node-api-to-postgres\n  namespace: default\nspec:\n  podSelector:\n    matchLabels:\n      app: postgres\n  ingress:\n  - from:\n    - podSelector:\n        matchLabels:\n          app: node-api\n    ports:\n    - port: 5432',
        why: 'Without NetworkPolicies, any compromised pod in your cluster can reach Postgres directly. This is the single most impactful security improvement for a home lab exposed to the internet.',
      },
    ],
  },

  // ── Closing: Read the Search Bar ──────────────────────────────────────────

  {
    type: 'note',
    variant: 'info',
    content: `
      <strong>🔍 Pro tip: use the search bar.</strong> Every command, diagnostic, and
      security procedure in this Field Manual is tagged with search terms. Type "OOM",
      "522", "ImagePullBackOff", "backup", or "rollout undo" and you land directly on
      the relevant entry. The Field Manual is designed to be <em>found</em>, not
      <em>read cover to cover</em>. Bookmark the page, not the commands.
    `,
  },

];
