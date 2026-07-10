// modules/k3s-pi5/bgapi-deploy.js
// Deploy BGAPI (.NET + SQL Server + Postgres) to k3s on a Raspberry Pi 5.
//
// Build/ship model: the ARM64 image is built on your Mac (Apple Silicon is
// native arm64) and pushed to a PRIVATE Docker Hub repo (bgteam/bgapi). The Pi
// never builds — it only pulls. Seed SQL rides in a ConfigMap (no repo on the
// Pi). Public access is api.yourdomain.com via the Cloudflare Tunnel wildcard.
// Real-time CD: docker push → Docker Hub webhook → Pi pulls → live in seconds.

window.pageBlocks = [

  // ── What is this module? ──────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Deploy BGAPI: .NET + SQL Server + Postgres on k3s',
    content: `
      <p>
        <strong>This is the payoff module — a real .NET 10 Web API running on your Pi 5
        cluster, publicly reachable at <code>api.yourdomain.com</code>.</strong> BGAPI uses
        <strong>polyglot persistence</strong>: the legacy bounded contexts live on SQL Server
        (via <code>azure-sql-edge</code>, the only Microsoft SQL engine with an ARM64 build),
        while the newer <strong>ScroogeCorp</strong> context lives in its own PostgreSQL
        database. The API migrates both schemas itself on startup.
      </p>

      <h4>The Build & Ship Model (read this first)</h4>
      <p>
        The Pi does <strong>not</strong> build the image. A .NET build is slow on a Pi and can
        OOM it. Instead:
      </p>
      <ul>
        <li><strong>Build on your Mac</strong> — Apple Silicon is ARM64, so <code>docker build</code> produces a native <code>linux/arm64</code> image with no emulation.</li>
        <li><strong>Push to Docker Hub</strong> — a <em>private</em> <code>bgteam/bgapi</code> repo (the image is your proprietary binary; keep it private).</li>
        <li><strong>The Pi pulls</strong> — its Deployment references <code>bgteam/bgapi:&lt;tag&gt;</code> with a pull secret. Deploys are a pull, measured in seconds.</li>
      </ul>
      <p>
        The seed SQL for the SQL Server reference databases rides in a <strong>ConfigMap</strong>
        (~217 KB, well under the 1 MB limit) — so the Pi needs <strong>no git checkout, no
        repo, and no hostPath</strong>. Everything on the Pi is a manifest in
        <code>~/bgapi-k3s</code>, a pull secret, and (for CD) a webhook receiver.
      </p>

      <h4>What's Inside</h4>
      <ul>
        <li><strong>Build & Ship the Image</strong> — clone + build on your Mac, push to Docker Hub.</li>
        <li><strong>Deploy the Stack</strong> — namespace, secrets, pull secret, seed ConfigMap, SQL Server, Postgres, the DB NodePorts (Cloudflare Tunnel bridge), db-init, the API, and the public Ingress — bundled into one <code>deploy.sh</code>.</li>
        <li><strong>Databases & Migrations</strong> — how migrate-on-startup works across two engines, and how to inspect both.</li>
        <li><strong>Verify</strong> — pods healthy, Swagger up (locally and at <code>api.yourdomain.com</code>), a ScroogeCorp round-trip.</li>
        <li><strong>Real-time CD</strong> — a Docker Hub push webhook that makes the Pi pull the new image the moment you push from your Mac.</li>
      </ul>

      <h4>The Demo Loop</h4>
      <p>
        <strong><code>docker push</code> on your Mac → Docker Hub fires a webhook → the Pi pulls
        the new tag → live at <code>api.yourdomain.com</code> in seconds.</strong> No CI
        pipeline, no build on the Pi. Before a live demo, build/push once so the image is warm.
      </p>
    `,
  },

  // ── Three rules ───────────────────────────────────────────────────────────

  {
    type: 'note',
    variant: 'tip',
    content: `
      <strong>Three rules for running BGAPI on a Pi 5:</strong>
      <ol style="margin-top: 0.5rem; padding-left: 1.5rem;">
        <li><strong>Build off the Pi; the Pi only pulls.</strong> Your Mac (ARM64) builds and
            pushes to Docker Hub; the Pi pulls a pre-baked image. Never run the .NET
            <code>docker build</code> on the Pi — it's slow and OOMs under memory pressure.</li>
        <li><strong>Tag every build, deploy by tag.</strong> Tag with the git short-SHA and
            deploy with <code>kubectl set image</code>, so you always know exactly which build
            is live and k3s actually pulls it. Private repo ⇒ the Pi needs a pull secret.</li>
        <li><strong>Databases before the API.</strong> The API runs EF Core migrations on
            startup — if SQL Server or Postgres isn't ready yet it CrashLoopBackOffs.
            <code>deploy.sh</code> waits at each gate so startup is clean, not noisy.</li>
      </ol>
    `,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: BUILD & SHIP THE IMAGE (MAC → DOCKER HUB)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'BGAPI · Build & Ship the Image',
    content: `
      <p>
        <strong>All of this runs on your Mac, not the Pi.</strong> Clone the repo, build the
        image (native ARM64 on Apple Silicon), and push it to your private Docker Hub repo. Tag
        each build with the git short-SHA so every image is traceable to a commit and the Pi
        always pulls a specific, known version.
      </p>
      <p>
        You keep the repo on your Mac for two reasons: building the image, and generating the
        seed-SQL ConfigMap later (the <code>Docs/sql</code> files come from here). The Pi never
        sees the source.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'bgapi-build',
    sectionTitle: 'BGAPI · Build & Ship the Image',
    items: [
      {
        id: 600,
        commandTitle: "Clone & Build the ARM64 Image (on your Mac)",
        command: "docker build -f APIs/BGAPI/Dockerfile -t bgteam/bgapi:$(git rev-parse --short HEAD) .",
        searchTerms: "docker build mac apple silicon arm64 dotnet sdk aspnet image tag git sha clone bgapi native",
        description: "On your <b>Mac</b> (Apple Silicon = ARM64), clone BGAPI and build the image natively — no buildx, no emulation. The Dockerfile uses <code>mcr.microsoft.com/dotnet/sdk:10.0</code> / <code>aspnet:10.0</code> (both publish <code>linux/arm64</code>). Build context is the <b>repo root</b> (the trailing <code>.</code>) because the Dockerfile <code>COPY . .</code> pulls in the whole <code>Core → Infrastructure → APIs</code> solution. Tag with the git short-SHA so the image maps to a commit.",
        parts: [
          { text: "runs on your Mac, not the Pi", explanation: "Apple Silicon is arm64 — a plain docker build yields a native linux/arm64 image, far faster than the Pi and with no OOM risk" },
          { text: "-f APIs/BGAPI/Dockerfile", explanation: "the Dockerfile lives under the API project, but the build context is the repo root" },
          { text: "-t bgteam/bgapi:$(git rev-parse --short HEAD)", explanation: "tag = your Docker Hub repo + the git short-SHA, so every build is traceable and uniquely named" }
        ],
        example: "# On your Mac:\ngit clone https://teamkepler@dev.azure.com/teamkepler/BGAPI/_git/BGAPI\ncd BGAPI\n\nTAG=$(git rev-parse --short HEAD)\ndocker build -f APIs/BGAPI/Dockerfile -t bgteam/bgapi:$TAG .\n\n# Also tag :latest for the very first bring-up (the Deployment references it):\ndocker tag bgteam/bgapi:$TAG bgteam/bgapi:latest\n\ndocker images | grep bgteam/bgapi",
        why: "Building on the Mac keeps the heavy work off the Pi entirely — the Pi just pulls the finished image. Apple Silicon means the arm64 build is native, so there's no QEMU emulation slowdown and no cross-build complexity."
      },
      {
        id: 601,
        commandTitle: "Push to Docker Hub (private repo)",
        command: "docker push bgteam/bgapi:$(git rev-parse --short HEAD) && docker push bgteam/bgapi:latest",
        searchTerms: "docker push docker hub private repo login access token registry bgteam bgapi pull secret proprietary",
        description: "Log in to Docker Hub and push both tags. <b>Set the <code>bgteam/bgapi</code> repo to Private</b> in Docker Hub (Repository → Settings → Make private) — the image contains your proprietary .NET binary, so it must not be world-pullable. A private repo means the Pi needs a pull secret (next section). This is separate from <code>api.yourdomain.com</code> being public: the API endpoint is public, the image is not.",
        parts: [
          { text: "docker login", explanation: "authenticate to Docker Hub as bgteam — use an access token (Account Settings → Security), not your password" },
          { text: "docker push …:<sha> + …:latest", explanation: "push the pinned SHA tag (for precise rollouts) and :latest (for the first deploy)" },
          { text: "repo visibility: Private", explanation: "keeps the compiled app private; the Pi authenticates with an imagePullSecret to pull it" }
        ],
        example: "docker login    # username: bgteam, password: <access token>\n\nTAG=$(git rev-parse --short HEAD)\ndocker push bgteam/bgapi:$TAG\ndocker push bgteam/bgapi:latest\n\n# In the Docker Hub UI: open bgteam/bgapi → Settings → Make private.\n# Verify it's there:\n#   https://hub.docker.com/r/bgteam/bgapi/tags",
        why: "Docker Hub's free tier includes one private repo — perfect for a single app. Keeping it private protects the binary; the public part is only the running HTTP endpoint at api.yourdomain.com."
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: DEPLOY THE STACK
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'BGAPI · Deploy the Stack',
    content: `
      <p>
        <strong>Build every manifest in <code>~/bgapi-k3s</code> on the Pi, then stand the stack
        up in dependency order.</strong> Each card writes a file with <code>cat &gt; … &lt;&lt;'EOF'</code>
        — nothing is assumed to pre-exist. The order matters: namespace and secrets first, then
        the pull secret and the seed-SQL ConfigMap, then the databases, then the seed Job, then
        the API and its public Ingress.
      </p>
      <p>
        The API applies its migrations on startup, so it must not start before the databases are
        ready — which is exactly what <code>deploy.sh</code> (the last card) enforces with a wait
        at each gate. Run the manifests by hand once to understand them, then use
        <code>deploy.sh</code> forever after.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'bgapi-deploy',
    sectionTitle: 'BGAPI · Deploy the Stack',
    items: [
      {
        id: 610,
        commandTitle: "Create the Namespace & Secret",
        command: "kubectl apply -f namespace.yaml -f secrets.yaml",
        searchTerms: "namespace secret sa password postgres base64 opaque create manifest folder bgapi-k3s isolate",
        description: "Make a working folder for the manifests you'll build up, then create the first two. Everything lives in a dedicated <code>bgapi</code> namespace (a <code>kubectl delete namespace bgapi</code> wipes the whole stack). The Secret holds two base64 passwords — one for SQL Server's SA account, one for the PostgreSQL superuser. <b>Change them</b> before anything real.",
        parts: [
          { text: "mkdir -p ~/bgapi-k3s", explanation: "the folder you'll create every manifest in; the article assumes you 'cd' here" },
          { text: "cat > file <<'EOF' … EOF", explanation: "writes the file verbatim — the quoted 'EOF' stops the shell from expanding $vars inside" },
          { text: "sa-password / postgres-password", explanation: "base64 of 'YourStrong!Passw0rd'; regenerate with: echo -n 'NewPass' | base64" }
        ],
        example: "# A folder to build the manifests in:\nmkdir -p ~/bgapi-k3s && cd ~/bgapi-k3s\n\n# --- namespace.yaml ---\ncat > namespace.yaml <<'EOF'\n---\n# Namespace for all BGAPI resources\napiVersion: v1\nkind: Namespace\nmetadata:\n  name: bgapi\n  labels:\n    app.kubernetes.io/part-of: bgapi\nEOF\n\n# --- secrets.yaml (change the passwords!) ---\ncat > secrets.yaml <<'EOF'\n---\n# Secrets for the BGAPI stack.\n# The SA password is base64-encoded. Generate a new one with:\n#   echo -n \"YourStrong!Passw0rd\" | base64\napiVersion: v1\nkind: Secret\nmetadata:\n  name: bgapi-secrets\n  namespace: bgapi\n  labels:\n    app.kubernetes.io/part-of: bgapi\ntype: Opaque\ndata:\n  # \"YourStrong!Passw0rd\" — change this if you use a different password\n  # sa-password       → SQL Server (Azure SQL Edge) SA account\n  # postgres-password → PostgreSQL 'postgres' superuser (ScroogeCorp context)\n  sa-password: WW91clN0cm9uZyFQYXNzdzByZA==\n  postgres-password: WW91clN0cm9uZyFQYXNzdzByZA==\nEOF\n\nkubectl apply -f namespace.yaml -f secrets.yaml\nkubectl -n bgapi get secret bgapi-secrets",
        why: "The password appears in the Secret (SQL Server + Postgres read it) and again in the plaintext connection strings in bgapi.yaml (the API). Rotate one and forget the other and the API can't log in — a future hardening step is to source the API's connection strings from the Secret too."
      },
      {
        id: 611,
        commandTitle: "Create the Docker Hub Pull Secret",
        command: "kubectl -n bgapi create secret docker-registry dockerhub --docker-username=bgteam --docker-password=<access-token>",
        searchTerms: "imagepullsecret docker-registry dockerhub private repo pull secret access token bgteam authenticate containerd 401 unauthorized",
        description: "Because <code>bgteam/bgapi</code> is a <b>private</b> repo, k3s must authenticate to pull it. Create a <code>docker-registry</code> Secret named <code>dockerhub</code> in the <code>bgapi</code> namespace, using your Docker Hub username and an <b>access token</b> (not your password). The API Deployment references it via <code>imagePullSecrets</code>. Create it once; if you delete the namespace, recreate it before <code>deploy.sh</code>.",
        parts: [
          { text: "secret docker-registry dockerhub", explanation: "a Kubernetes secret of type kubernetes.io/dockerconfigjson — what the kubelet uses to log in to a registry" },
          { text: "--docker-username=bgteam", explanation: "your Docker Hub account name" },
          { text: "--docker-password=<access-token>", explanation: "a Docker Hub access token (hub.docker.com → Account Settings → Security → New Access Token) — safer than your password" }
        ],
        example: "# The namespace must exist first (previous step).\nkubectl -n bgapi create secret docker-registry dockerhub \\\n  --docker-username=bgteam \\\n  --docker-password='dckr_pat_xxxxxxxxxxxxxxxx' \\\n  --docker-email='you@example.com'\n\n# Verify:\nkubectl -n bgapi get secret dockerhub\n# NAME       TYPE                             DATA\n# dockerhub  kubernetes.io/dockerconfigjson   1",
        why: "Without this, a private-repo pull fails with 'ErrImagePull / 401 Unauthorized' — the image builds and pushes fine but the Pi can't fetch it. It's imperative (contains credentials), so it isn't a committed manifest; recreate it after a namespace wipe."
      },
      {
        id: 612,
        commandTitle: "Create the Seed-SQL ConfigMap (no repo on the Pi)",
        command: "kubectl -n bgapi apply -f seed-sql-configmap.yaml",
        searchTerms: "configmap seed sql geography techcorp reference database no clone repo hostpath from-file mac 1mb limit db-init mount",
        description: "The two reference databases are seeded from <code>geography.sql</code> and <code>techcorp.sql</code> (~217 KB total — comfortably under the 1 MB ConfigMap limit). Instead of cloning the whole .NET repo onto the Pi just for two files, bake them into a <b>ConfigMap</b> that the <code>db-init</code> Job mounts. Generate it <b>on your Mac</b> (you already have the repo there), copy it to the Pi, and <code>deploy.sh</code> applies it — so the Pi needs no git, no PAT, and no hostPath.",
        parts: [
          { text: "generated on your Mac", explanation: "kubectl create configmap --from-file against the repo's Docs/sql — the Pi never needs the source" },
          { text: "--dry-run=client -o yaml", explanation: "produces a reusable manifest file so deploy.sh can recreate it after a namespace wipe" },
          { text: "mounted by db-init at /sql", explanation: "the Job reads /sql/geography.sql and /sql/techcorp.sql — same paths as before, no hostPath" }
        ],
        example: "# --- On your Mac, in the BGAPI repo (kubectl pointed at the Pi cluster) ---\nkubectl create configmap bgapi-seed-sql -n bgapi \\\n  --from-file=geography.sql=Docs/sql/geography.sql \\\n  --from-file=techcorp.sql=Docs/sql/techcorp.sql \\\n  --dry-run=client -o yaml > seed-sql-configmap.yaml\n\n# Copy it into the manifests folder on the Pi:\nscp seed-sql-configmap.yaml pi@raspberrypi:~/bgapi-k3s/\n\n# --- On the Pi ---\nkubectl -n bgapi apply -f seed-sql-configmap.yaml\nkubectl -n bgapi get configmap bgapi-seed-sql\n# NAME             DATA\n# bgapi-seed-sql   2",
        why: "Cloning a whole .NET solution onto the Pi just to read two SQL files is wasteful and couples the Job to a host path. A ConfigMap is portable, versioned in the cluster, and lets deploy.sh rebuild the entire stack from files in ~/bgapi-k3s. (If techcorp.sql ever exceeds ~1 MB, switch back to a hostPath or an init-container fetch.)"
      },
      {
        id: 613,
        commandTitle: "Create SQL Server (Azure SQL Edge)",
        command: "kubectl apply -f sqlserver.yaml",
        searchTerms: "sqlserver azure sql edge statefulset arm64 mssql pvc 1433 headless service create manifest legacy",
        description: "SQL Server 2022 has <b>no ARM64 build</b>, so the legacy BGAPI contexts run on <code>azure-sql-edge</code> — the only Microsoft SQL engine native to ARM. Create it as a <b>StatefulSet</b> with a 10Gi PVC (k3s's local-path provisioner binds it automatically) and a <b>headless Service</b> giving the pod the stable DNS name <code>sqlserver.bgapi.svc.cluster.local</code>.",
        parts: [
          { text: "StatefulSet + volumeClaimTemplate", explanation: "stable identity + persistent /var/opt/mssql, so data survives pod restarts" },
          { text: "clusterIP: None (headless)", explanation: "stable per-pod DNS name instead of a load-balanced random one" },
          { text: "MSSQL_MEMORY_LIMIT_MB: 2048", explanation: "Azure SQL Edge is greedy; capping it at 2 GB leaves headroom on the 8 GB Pi" }
        ],
        example: "cd ~/bgapi-k3s\ncat > sqlserver.yaml <<'EOF'\n---\n# SQL Server (Azure SQL Edge) — StatefulSet with persistent storage.\n#\n# Azure SQL Edge is the only Microsoft SQL engine with an ARM64 build.\n# Same T-SQL dialect and EF Core provider as full SQL Server — no code changes.\napiVersion: v1\nkind: Service\nmetadata:\n  name: sqlserver\n  namespace: bgapi\n  labels:\n    app: sqlserver\n    app.kubernetes.io/part-of: bgapi\nspec:\n  type: ClusterIP\n  clusterIP: None          # Headless — StatefulSet pods get stable DNS\n  ports:\n    - port: 1433\n      targetPort: 1433\n      name: mssql\n  selector:\n    app: sqlserver\n---\napiVersion: apps/v1\nkind: StatefulSet\nmetadata:\n  name: sqlserver\n  namespace: bgapi\n  labels:\n    app: sqlserver\n    app.kubernetes.io/part-of: bgapi\nspec:\n  serviceName: sqlserver\n  replicas: 1\n  selector:\n    matchLabels:\n      app: sqlserver\n  template:\n    metadata:\n      labels:\n        app: sqlserver\n    spec:\n      containers:\n        - name: sqlserver\n          image: mcr.microsoft.com/azure-sql-edge:latest\n          ports:\n            - containerPort: 1433\n              name: mssql\n          env:\n            - name: ACCEPT_EULA\n              value: \"Y\"\n            - name: MSSQL_SA_PASSWORD\n              valueFrom:\n                secretKeyRef:\n                  name: bgapi-secrets\n                  key: sa-password\n            - name: MSSQL_PID\n              value: \"Developer\"\n            # Limit memory — Azure SQL Edge can be greedy. 2 GB is plenty.\n            - name: MSSQL_MEMORY_LIMIT_MB\n              value: \"2048\"\n          resources:\n            requests:\n              memory: \"1Gi\"\n              cpu: \"500m\"\n            limits:\n              memory: \"2.5Gi\"\n              cpu: \"2000m\"\n          volumeMounts:\n            - name: data\n              mountPath: /var/opt/mssql\n          readinessProbe:\n            exec:\n              command:\n                - /opt/mssql-tools18/bin/sqlcmd\n                - -S\n                - localhost\n                - -U\n                - sa\n                - -P\n                - $(MSSQL_SA_PASSWORD)\n                - -C\n                - -Q\n                - \"SELECT 1\"\n            initialDelaySeconds: 30\n            periodSeconds: 10\n            timeoutSeconds: 5\n            failureThreshold: 10\n          livenessProbe:\n            exec:\n              command:\n                - /opt/mssql-tools18/bin/sqlcmd\n                - -S\n                - localhost\n                - -U\n                - sa\n                - -P\n                - $(MSSQL_SA_PASSWORD)\n                - -C\n                - -Q\n                - \"SELECT 1\"\n            initialDelaySeconds: 60\n            periodSeconds: 30\n            timeoutSeconds: 5\n  volumeClaimTemplates:\n    - metadata:\n        name: data\n        labels:\n          app.kubernetes.io/part-of: bgapi\n      spec:\n        accessModes:\n          - ReadWriteOnce\n        resources:\n          requests:\n            storage: 10Gi\nEOF\n\nkubectl apply -f sqlserver.yaml\nkubectl -n bgapi wait --for=condition=ready pod -l app=sqlserver --timeout=300s",
        why: "Azure SQL Edge is deprecated upstream but uses the same T-SQL dialect, sqlcmd tooling and EF Core provider — so the legacy contexts run unchanged. The newer ScroogeCorp context deliberately lives elsewhere (Postgres, next card)."
      },
      {
        id: 614,
        commandTitle: "Create PostgreSQL (ScroogeCorp context)",
        command: "kubectl apply -f postgres.yaml",
        searchTerms: "postgres postgresql scroogecorp bounded context polyglot persistence statefulset arm64 pg_isready 5432 npgsql create manifest",
        description: "The <b>ScroogeCorp bounded context</b> (FinancingRequest + IntakeDocument) lives in its <b>own PostgreSQL database</b> — <b>polyglot persistence</b>. Postgres is native ARM64 and actively maintained (unlike the deprecated Azure SQL Edge). Create it as a StatefulSet + 5Gi PVC + headless Service at <code>postgres.bgapi.svc.cluster.local:5432</code>; the password comes from the same <code>bgapi-secrets</code>.",
        parts: [
          { text: "postgres:16-alpine", explanation: "native ARM64, ~80 MB, actively maintained — a far lighter footprint than SQL Server" },
          { text: "own database, own DbContext", explanation: "ScroogeCorpDbContext (Npgsql) — no shared tables or foreign keys with the SQL Server contexts" },
          { text: "no seed Job needed", explanation: "the API applies ScroogeCorp's EF Core migrations on startup, so Postgres just comes up empty" }
        ],
        example: "cd ~/bgapi-k3s\ncat > postgres.yaml <<'EOF'\n---\n# PostgreSQL — home of the ScroogeCorp bounded context.\n#\n# The ScroogeCorp slice (FinancingRequest + IntakeDocument) lives in its own\n# PostgreSQL database, separate from the SQL Server catalogs used by the legacy\n# contexts — polyglot persistence. Postgres is native ARM64 and actively\n# maintained, so it's the better long-term engine on a Pi than Azure SQL Edge.\n#\n# The API's ScroogeCorpDbContext applies its EF Core migrations on startup, so\n# there is no seed Job here — Postgres comes up empty and the API creates the\n# schema itself.\napiVersion: v1\nkind: Service\nmetadata:\n  name: postgres\n  namespace: bgapi\n  labels:\n    app: postgres\n    app.kubernetes.io/part-of: bgapi\nspec:\n  type: ClusterIP\n  clusterIP: None          # Headless — StatefulSet pod gets stable DNS\n  ports:\n    - port: 5432\n      targetPort: 5432\n      name: postgres\n  selector:\n    app: postgres\n---\napiVersion: apps/v1\nkind: StatefulSet\nmetadata:\n  name: postgres\n  namespace: bgapi\n  labels:\n    app: postgres\n    app.kubernetes.io/part-of: bgapi\nspec:\n  serviceName: postgres\n  replicas: 1\n  selector:\n    matchLabels:\n      app: postgres\n  template:\n    metadata:\n      labels:\n        app: postgres\n    spec:\n      containers:\n        - name: postgres\n          image: postgres:16-alpine\n          ports:\n            - containerPort: 5432\n              name: postgres\n          env:\n            - name: POSTGRES_USER\n              value: \"postgres\"\n            - name: POSTGRES_PASSWORD\n              valueFrom:\n                secretKeyRef:\n                  name: bgapi-secrets\n                  key: postgres-password\n            - name: POSTGRES_DB\n              value: \"scroogecorp\"\n            # Keep data in a subdirectory so the volume root stays clean.\n            - name: PGDATA\n              value: \"/var/lib/postgresql/data/pgdata\"\n          resources:\n            requests:\n              memory: \"128Mi\"\n              cpu: \"100m\"\n            limits:\n              memory: \"512Mi\"\n              cpu: \"1000m\"\n          volumeMounts:\n            - name: data\n              mountPath: /var/lib/postgresql/data\n          readinessProbe:\n            exec:\n              command: [\"pg_isready\", \"-U\", \"postgres\", \"-d\", \"scroogecorp\"]\n            initialDelaySeconds: 10\n            periodSeconds: 10\n            timeoutSeconds: 5\n            failureThreshold: 10\n          livenessProbe:\n            exec:\n              command: [\"pg_isready\", \"-U\", \"postgres\", \"-d\", \"scroogecorp\"]\n            initialDelaySeconds: 30\n            periodSeconds: 30\n            timeoutSeconds: 5\n  volumeClaimTemplates:\n    - metadata:\n        name: data\n        labels:\n          app.kubernetes.io/part-of: bgapi\n      spec:\n        accessModes:\n          - ReadWriteOnce\n        resources:\n          requests:\n            storage: 5Gi\nEOF\n\nkubectl apply -f postgres.yaml\nkubectl -n bgapi wait --for=condition=ready pod -l app=postgres --timeout=300s",
        why: "Splitting ScroogeCorp onto Postgres is the interview story in one move: a new bounded context gets a new engine, its own migration history and zero coupling to the legacy schema. It also starts the escape from the deprecated Azure SQL Edge."
      },
      {
        id: 619,
        commandTitle: "Create the DB NodePort Services (Cloudflare Tunnel bridge)",
        command: "kubectl apply -f sqlserver-nodeport.yaml -f postgres-nodeport.yaml",
        searchTerms: "nodeport sqlserver postgres cloudflare tunnel bridge tcp 31433 30432 headless service host localhost db pg external client",
        description: "<b>Only needed if you reach the databases over the Cloudflare Tunnel.</b> cloudflared runs on the Pi <em>host</em> and dials <code>localhost:&lt;port&gt;</code>, but SQL Server and Postgres sit behind <b>headless</b> Services (<code>clusterIP: None</code>) — great for stable StatefulSet DNS, but not reachable on the host's localhost. A headless Service can't also be a NodePort, so these are <b>two extra Services</b> selecting the same pods, publishing 1433→<code>31433</code> and 5432→<code>30432</code> on the node. The tunnel's <code>tcp://localhost:31433</code> / <code>:30432</code> routes then have something to hit. In-cluster access and <code>kubectl port-forward</code> don't need these.",
        parts: [
          { text: "type: NodePort", explanation: "publishes the pod port on a fixed host port (30000–32767) so cloudflared's tcp:// route can reach it" },
          { text: "separate Service, same selector", explanation: "the headless Service (clusterIP: None) can't also be a NodePort — this adds a second Service pointing at the same pods" },
          { text: "nodePort: 31433 / 30432", explanation: "the host ports the Cloudflare Tunnel config maps to db.baiganio.io / pg.baiganio.io — keep them behind a Cloudflare Access policy" }
        ],
        example: "cd ~/bgapi-k3s\ncat > sqlserver-nodeport.yaml <<'EOF'\n---\n# NodePort bridge so cloudflared (on the host) can reach SQL Server.\n# The headless Service in sqlserver.yaml gives stable DNS but isn't on the\n# host's localhost; this publishes 1433 as node port 31433.\napiVersion: v1\nkind: Service\nmetadata:\n  name: sqlserver-nodeport\n  namespace: bgapi\n  labels:\n    app: sqlserver\n    app.kubernetes.io/part-of: bgapi\nspec:\n  type: NodePort\n  ports:\n    - port: 1433\n      targetPort: 1433\n      nodePort: 31433\n      name: mssql\n  selector:\n    app: sqlserver\nEOF\n\ncat > postgres-nodeport.yaml <<'EOF'\n---\n# NodePort bridge so cloudflared can reach Postgres. Publishes 5432 as 30432.\napiVersion: v1\nkind: Service\nmetadata:\n  name: postgres-nodeport\n  namespace: bgapi\n  labels:\n    app: postgres\n    app.kubernetes.io/part-of: bgapi\nspec:\n  type: NodePort\n  ports:\n    - port: 5432\n      targetPort: 5432\n      nodePort: 30432\n      name: postgres\n  selector:\n    app: postgres\nEOF\n\nkubectl -n bgapi apply -f sqlserver-nodeport.yaml -f postgres-nodeport.yaml\nkubectl -n bgapi get svc | grep nodeport\n# sqlserver-nodeport  NodePort  10.x.x.x  <none>  1433:31433/TCP\n# postgres-nodeport   NodePort  10.x.x.x  <none>  5432:30432/TCP",
        why: "These are the bridge between the host-level tunnel and the in-cluster databases. deploy.sh applies them right after the SQL Server and Postgres StatefulSets. Gate the hostnames with a Cloudflare Access policy (see the TCP module) — a NodePort is reachable by anything on the LAN, and the tunnel makes db./pg. publicly resolvable."
      },
      {
        id: 615,
        commandTitle: "Create the db-init Job (seed reference DBs)",
        command: "kubectl apply -f db-init-job.yaml",
        searchTerms: "db-init job seed geography techcorp sql scripts sqlcmd configmap reference databases init container wait create manifest",
        description: "A one-shot <b>Job</b> seeds the two read-only reference databases into SQL Server. An <code>initContainer</code> polls until SQL answers <code>SELECT 1</code>, then <code>sqlcmd -i</code> runs <code>geography.sql</code> and <code>techcorp.sql</code>. The scripts are mounted from the <b><code>bgapi-seed-sql</code> ConfigMap</b> you created — no repo checkout, no hostPath.",
        parts: [
          { text: "initContainer wait-for-sqlserver", explanation: "retries SELECT 1 up to 30× so the seed never races an unready database" },
          { text: "volume from configMap bgapi-seed-sql", explanation: "mounts geography.sql + techcorp.sql at /sql — replaces the old hostPath, so the Pi needs no repo" },
          { text: "ttlSecondsAfterFinished: 300", explanation: "the completed Job auto-deletes after 5 min so it doesn't clutter the namespace" }
        ],
        example: "cd ~/bgapi-k3s\ncat > db-init-job.yaml <<'EOF'\n---\n# One-shot Job that seeds the Geography and TechCorp reference databases.\n# Runs sqlcmd against the SQL Server service using the SQL scripts mounted\n# from the bgapi-seed-sql ConfigMap (created from Docs/sql on your Mac).\n#\n# This mirrors the docker-compose `mssql-init` container.\napiVersion: batch/v1\nkind: Job\nmetadata:\n  name: db-init\n  namespace: bgapi\n  labels:\n    app: db-init\n    app.kubernetes.io/part-of: bgapi\nspec:\n  ttlSecondsAfterFinished: 300   # Auto-cleanup after 5 min\n  backoffLimit: 3\n  template:\n    metadata:\n      labels:\n        app: db-init\n    spec:\n      restartPolicy: Never\n      initContainers:\n        # Wait for SQL Server to be ready before running the Job\n        - name: wait-for-sqlserver\n          image: mcr.microsoft.com/azure-sql-edge:latest\n          command:\n            - /bin/bash\n            - -c\n            - |\n              echo \"Waiting for SQL Server to be ready...\"\n              for i in $(seq 1 30); do\n                if /opt/mssql-tools18/bin/sqlcmd \\\n                  -S sqlserver.bgapi.svc.cluster.local \\\n                  -U sa -P \"$SA_PASSWORD\" -C \\\n                  -Q \"SELECT 1\" &>/dev/null; then\n                  echo \"SQL Server is ready.\"\n                  exit 0\n                fi\n                echo \"Attempt $i/30 — retrying in 5s...\"\n                sleep 5\n              done\n              echo \"SQL Server did not become ready in time.\"\n              exit 1\n          env:\n            - name: SA_PASSWORD\n              valueFrom:\n                secretKeyRef:\n                  name: bgapi-secrets\n                  key: sa-password\n      containers:\n        - name: seed-databases\n          image: mcr.microsoft.com/azure-sql-edge:latest\n          command:\n            - /bin/bash\n            - -c\n            - |\n              set -e\n              echo \"Seeding Geography database...\"\n              /opt/mssql-tools18/bin/sqlcmd \\\n                -S sqlserver.bgapi.svc.cluster.local \\\n                -U sa -P \"$SA_PASSWORD\" -C \\\n                -i /sql/geography.sql\n              echo \"Geography seeded.\"\n\n              echo \"Seeding TechCorp database...\"\n              /opt/mssql-tools18/bin/sqlcmd \\\n                -S sqlserver.bgapi.svc.cluster.local \\\n                -U sa -P \"$SA_PASSWORD\" -C \\\n                -i /sql/techcorp.sql\n              echo \"TechCorp seeded.\"\n\n              echo \"All databases seeded successfully.\"\n          env:\n            - name: SA_PASSWORD\n              valueFrom:\n                secretKeyRef:\n                  name: bgapi-secrets\n                  key: sa-password\n          volumeMounts:\n            - name: sql-scripts\n              mountPath: /sql\n      volumes:\n        - name: sql-scripts\n          configMap:\n            name: bgapi-seed-sql\nEOF\n\nkubectl apply -f db-init-job.yaml\nkubectl -n bgapi wait --for=condition=complete job/db-init --timeout=120s\nkubectl -n bgapi logs job/db-init   # 'All databases seeded successfully.'",
        why: "Geography and TechCorp are static reference data the app reads but never migrates — so they're seeded from raw SQL, not EF migrations. Mounting them from a ConfigMap (instead of a repo hostPath) means the Pi needs nothing checked out, and re-seeding never needs an API restart."
      },
      {
        id: 616,
        commandTitle: "Create the API Deployment (pulls from Docker Hub)",
        command: "kubectl apply -f bgapi.yaml",
        searchTerms: "bgapi deployment service connection strings dbconn geography techcorp scroogecorp env 62010 readiness probe imagepullsecret dockerhub bgteam pull always create manifest",
        description: "The API Deployment + ClusterIP Service on port 62010. It pulls <code>bgteam/bgapi</code> from Docker Hub using the <code>dockerhub</code> pull secret (<code>imagePullPolicy: Always</code> so a re-pushed tag is re-fetched). Its <code>env</code> carries the four connection strings — <code>dbconn</code>, <code>geography_dbconn</code>, <code>techcorp_dbconn</code> (all SQL Server) and <code>scroogecorp_dbconn</code> (Postgres) — plus the <code>ExternalDbProviders</code> flags. On startup it migrates both <code>bgapi-local</code> and the Postgres schema, so the readiness probe (Swagger JSON) only passes once both are ready.",
        parts: [
          { text: "image: bgteam/bgapi:latest + imagePullSecrets: dockerhub", explanation: "pulls the private image from Docker Hub — CD later pins it to a specific SHA via 'kubectl set image'" },
          { text: "imagePullPolicy: Always", explanation: "re-pulls on every pod (re)creation, so a rollout after a push always gets the new bits" },
          { text: "readinessProbe → /swagger/v1/swagger.json", explanation: "a 200 here means the app booted AND both migrations succeeded" }
        ],
        example: "cd ~/bgapi-k3s\ncat > bgapi.yaml <<'EOF'\n---\n# BGAPI .NET API — Deployment + ClusterIP Service.\n#\n# Pulls the image from the private Docker Hub repo bgteam/bgapi using the\n# 'dockerhub' pull secret. The API applies EF Core migrations on startup\n# against `bgapi-local` (SQL Server) and `scroogecorp` (Postgres), so no\n# separate migration Job is needed.\napiVersion: v1\nkind: Service\nmetadata:\n  name: bgapi\n  namespace: bgapi\n  labels:\n    app: bgapi\n    app.kubernetes.io/part-of: bgapi\nspec:\n  type: ClusterIP\n  ports:\n    - port: 62010\n      targetPort: 62010\n      name: http\n  selector:\n    app: bgapi\n---\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: bgapi\n  namespace: bgapi\n  labels:\n    app: bgapi\n    app.kubernetes.io/part-of: bgapi\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: bgapi\n  template:\n    metadata:\n      labels:\n        app: bgapi\n    spec:\n      imagePullSecrets:\n        - name: dockerhub          # auth for the private Docker Hub repo\n      containers:\n        - name: bgapi\n          image: bgteam/bgapi:latest\n          imagePullPolicy: Always  # re-pull on rollout; CD pins a SHA via set image\n          ports:\n            - containerPort: 62010\n              name: http\n          env:\n            - name: ASPNETCORE_URLS\n              value: \"http://+:62010\"\n            - name: ASPNETCORE_ENVIRONMENT\n              value: \"Development\"\n            # ---- Connection strings ----\n            # All three SQL Server catalogs live on the same instance.\n            - name: ConnectionStrings__dbconn\n              value: \"Server=sqlserver.bgapi.svc.cluster.local,1433;Initial Catalog=bgapi-local;TrustServerCertificate=True;Integrated Security=False;User ID=sa;Password=YourStrong!Passw0rd;\"\n            - name: ConnectionStrings__geography_dbconn\n              value: \"Server=sqlserver.bgapi.svc.cluster.local,1433;Initial Catalog=Geography;TrustServerCertificate=True;Integrated Security=False;User ID=sa;Password=YourStrong!Passw0rd;\"\n            - name: ConnectionStrings__techcorp_dbconn\n              value: \"Server=sqlserver.bgapi.svc.cluster.local,1433;Initial Catalog=TechCorp;TrustServerCertificate=True;Integrated Security=False;User ID=sa;Password=YourStrong!Passw0rd;\"\n            # ScroogeCorp bounded context — its own PostgreSQL database.\n            - name: ConnectionStrings__scroogecorp_dbconn\n              value: \"Host=postgres.bgapi.svc.cluster.local;Port=5432;Database=scroogecorp;Username=postgres;Password=YourStrong!Passw0rd;\"\n            - name: ExternalDbProviders__geography_dbconn\n              value: \"mssql\"\n            - name: ExternalDbProviders__techcorp_dbconn\n              value: \"mssql\"\n          resources:\n            requests:\n              memory: \"256Mi\"\n              cpu: \"250m\"\n            limits:\n              memory: \"512Mi\"\n              cpu: \"1000m\"\n          readinessProbe:\n            httpGet:\n              path: /swagger/v1/swagger.json\n              port: 62010\n            initialDelaySeconds: 30\n            periodSeconds: 10\n            timeoutSeconds: 5\n          livenessProbe:\n            httpGet:\n              path: /swagger/v1/swagger.json\n              port: 62010\n            initialDelaySeconds: 60\n            periodSeconds: 30\n            timeoutSeconds: 5\nEOF\n\nkubectl apply -f bgapi.yaml\nkubectl -n bgapi wait --for=condition=ready pod -l app=bgapi --timeout=180s",
        why: "The connection strings are inline plaintext to match the existing style — the password mirrors the Secret. The image now comes from Docker Hub (not a local containerd import), so the same manifest works whether you deploy the first time or the CD webhook rolls a new SHA."
      },
      {
        id: 617,
        commandTitle: "Create the Ingress (public api.yourdomain.com)",
        command: "kubectl apply -f ingress.yaml",
        searchTerms: "traefik ingressroute bgapi.local api.yourdomain.com public cloudflare wildcard host rule web entrypoint 62010 swagger route create manifest",
        description: "k3s bundles <b>Traefik</b> as its ingress controller. Create a Traefik <code>IngressRoute</code> matching <b>both</b> <code>Host(`bgapi.local`)</code> (LAN, via /etc/hosts) <b>and</b> <code>Host(`api.yourdomain.com`)</code> (public) on the <code>web</code> (port 80) entrypoint, forwarding to the <code>bgapi</code> Service on 62010. Because the Cloudflare Tunnel already routes <code>*.yourdomain.com → http://localhost:80</code>, the public hostname works with <b>no new DNS record and no config.yml change</b> — Traefik just needs the matching route.",
        parts: [
          { text: "match: Host(`bgapi.local`) || Host(`api.yourdomain.com`)", explanation: "one route serves both — fast LAN access AND the public demo URL" },
          { text: "entryPoints: [web]", explanation: "Traefik's port-80 entrypoint — where the Cloudflare tunnel wildcard delivers traffic" },
          { text: "no DNS / config.yml change", explanation: "the existing *.yourdomain.com wildcard CNAME + tunnel entry already cover api.yourdomain.com" }
        ],
        example: "cd ~/bgapi-k3s\ncat > ingress.yaml <<'EOF'\n---\n# Traefik IngressRoute — exposes BGAPI on the LAN and publicly.\n#\n# LAN:    http://bgapi.local/swagger        (add '<pi-ip> bgapi.local' to /etc/hosts)\n# Public: https://api.yourdomain.com/swagger (via the Cloudflare Tunnel wildcard)\n#\n# The wildcard '*.yourdomain.com → http://localhost:80' set up in the Cloudflare\n# Tunnel module already delivers api.yourdomain.com to Traefik on port 80, so no\n# new DNS record or config.yml edit is needed — only this matching route.\napiVersion: traefik.io/v1alpha1\nkind: IngressRoute\nmetadata:\n  name: bgapi\n  namespace: bgapi\n  labels:\n    app.kubernetes.io/part-of: bgapi\nspec:\n  entryPoints:\n    - web           # Traefik's port 80 entrypoint\n  routes:\n    - kind: Rule\n      match: Host(`bgapi.local`) || Host(`api.yourdomain.com`)\n      services:\n        - name: bgapi\n          port: 62010\nEOF\n\nkubectl apply -f ingress.yaml\nkubectl -n bgapi get ingressroute\n\n# LAN test — add to your laptop's /etc/hosts (Pi at 192.168.1.100):\n#   192.168.1.100   bgapi.local\n# → http://bgapi.local/swagger\n#\n# Public test (once the tunnel is up):\n#   curl -sI https://api.yourdomain.com/swagger/v1/swagger.json",
        why: "This is the public demo URL. Because the tunnel's wildcard already points at Traefik, exposing BGAPI publicly is just this one route — no per-hostname Cloudflare config. Note it puts Swagger on the open internet; if you'd rather gate it, add a Cloudflare Access policy on api.yourdomain.com (see the Cloudflare Tunnel — TCP module)."
      },
      {
        id: 618,
        commandTitle: "Bundle It All — deploy.sh",
        command: "chmod +x deploy.sh && ./deploy.sh",
        searchTerms: "deploy.sh script one command ordered wait condition ready rollout redeploy teardown convenience configmap pull secret create",
        description: "You've now created all the manifests in <code>~/bgapi-k3s</code>. This script applies them in dependency order with a <b>wait at each gate</b>: namespace → secret → seed ConfigMap → SQL Server + Postgres (ready) → DB NodePorts (for the Cloudflare Tunnel) → db-init (complete) → API → ingress. It checks the <code>dockerhub</code> pull secret and <code>bgapi-seed-sql</code> ConfigMap exist first (both are created outside the script). From then on a single <code>./deploy.sh</code> stands the whole stack up.",
        parts: [
          { text: "guards: dockerhub secret + seed ConfigMap", explanation: "both are created imperatively/from the Mac — the script fails fast with a clear message if they're missing" },
          { text: "wait --for=condition=ready pod -l app=sqlserver / app=postgres", explanation: "blocks until each database answers — the API's migration step would crash-loop otherwise" },
          { text: "wait --for=condition=complete job/db-init", explanation: "blocks until Geography + TechCorp are seeded before the API serves reads" }
        ],
        example: "cd ~/bgapi-k3s\ncat > deploy.sh <<'EOF'\n#!/usr/bin/env bash\n# deploy.sh — apply all BGAPI k3s manifests in order.\n#\n# Prereqs (created outside this script):\n#   • dockerhub pull secret   → kubectl -n bgapi create secret docker-registry ...\n#   • seed-sql-configmap.yaml → generated on your Mac from Docs/sql, scp'd here\n#\n# Usage:\n#   chmod +x deploy.sh && ./deploy.sh\n\nset -euo pipefail\n\nSCRIPT_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")\" && pwd)\"\nKUBECTL=\"${KUBECTL:-kubectl}\"\n\necho \"=== BGAPI k3s deploy ===\"\n\napply() { echo \"→ Applying $1 ...\"; \"$KUBECTL\" apply -f \"$SCRIPT_DIR/$1\"; }\n\n# Order matters: namespace first, then config, then infrastructure, then app.\napply namespace.yaml\napply secrets.yaml\n\n# --- Prereq guards -----------------------------------------------------------\nif ! \"$KUBECTL\" -n bgapi get secret dockerhub >/dev/null 2>&1; then\n  echo \"ERROR: 'dockerhub' pull secret missing. Create it:\"\n  echo \"  kubectl -n bgapi create secret docker-registry dockerhub \\\\\"\n  echo \"    --docker-username=bgteam --docker-password=<access-token>\"\n  exit 1\nfi\nif [ ! -f \"$SCRIPT_DIR/seed-sql-configmap.yaml\" ]; then\n  echo \"ERROR: seed-sql-configmap.yaml missing. Generate it on your Mac and scp it here.\"\n  exit 1\nfi\n# ---------------------------------------------------------------------------\n\napply seed-sql-configmap.yaml\napply sqlserver.yaml\napply postgres.yaml\napply sqlserver-nodeport.yaml   # NodePort bridge for the Cloudflare Tunnel (db.baiganio.io)\napply postgres-nodeport.yaml    # NodePort bridge for the Cloudflare Tunnel (pg.baiganio.io)\n\necho \"→ Waiting for SQL Server ...\"\n\"$KUBECTL\" -n bgapi wait --for=condition=ready pod -l app=sqlserver --timeout=300s\necho \"→ Waiting for PostgreSQL ...\"\n\"$KUBECTL\" -n bgapi wait --for=condition=ready pod -l app=postgres --timeout=300s\n\napply db-init-job.yaml\necho \"→ Waiting for db-init Job ...\"\n\"$KUBECTL\" -n bgapi wait --for=condition=complete job/db-init --timeout=120s\n\napply bgapi.yaml\napply ingress.yaml\necho \"→ Waiting for BGAPI ...\"\n\"$KUBECTL\" -n bgapi wait --for=condition=ready pod -l app=bgapi --timeout=180s\n\necho\necho \"=== Deploy complete ===\"\n\"$KUBECTL\" -n bgapi get pods,svc,ingressroute\necho\necho \"Local:  kubectl -n bgapi port-forward svc/bgapi 62010:62010  → http://localhost:62010/swagger\"\necho \"Public: https://api.yourdomain.com/swagger\"\nEOF\n\nchmod +x deploy.sh\n./deploy.sh",
        why: "Applying everything at once technically works — Kubernetes reconciles eventually — but you'd watch the API CrashLoopBackOff a few times while the databases boot. Gating the rollout turns a noisy startup into a clean one, and makes teardown-and-redeploy (after `kubectl delete namespace bgapi`) a single command."
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: DATABASES & MIGRATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'BGAPI · Databases & Migrations',
    content: `
      <p>
        <strong>The API is its own schema manager.</strong> There is no migration Job — on boot
        the API applies EF Core migrations for <em>both</em> engines: <code>bgapi-local</code> on
        SQL Server and <code>scroogecorp</code> on Postgres. Each context keeps its own migration
        history, so the two schemas evolve independently — the whole point of the polyglot split.
      </p>
      <p>
        Because the data layer spans two engines, you verify it in two places. These two cards
        show what "healthy" looks like on each, and how a missing catalog tells you exactly which
        slice (API migration, ScroogeCorp migration, or the db-init Job) failed.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'bgapi-data',
    sectionTitle: 'BGAPI · Databases & Migrations',
    items: [
      {
        id: 620,
        commandTitle: "Migrations Run Automatically on Startup",
        command: "kubectl -n bgapi logs deploy/bgapi | grep -i migrat",
        searchTerms: "ef core migrations migrateasync dbinitializer startup automatic bgapi-local scroogecorp postgres two contexts no job",
        description: "There is <b>no migration Job</b> — the API is its own schema manager. On boot it applies migrations for <b>both</b> databases: <code>BGAPIDbContext</code> → <code>MigrateAsync()</code> on <code>bgapi-local</code> (SQL Server), then seeds Roles/Users/Subscriptions/Courses; and <code>ScroogeCorpDbContext</code> → <code>MigrateAsync()</code> on the <code>scroogecorp</code> Postgres database. Each context has its own migration history, so the schemas evolve independently.",
        parts: [
          { text: "two contexts, two engines", explanation: "BGAPIDbContext → SQL Server; ScroogeCorpDbContext → Postgres via UseNpgsql — each MigrateAsync targets its own catalog" },
          { text: "idempotent on every restart", explanation: "MigrateAsync creates the DB if missing and applies only pending migrations — safe every boot" },
          { text: "a bad connection string = CrashLoopBackOff", explanation: "the migration runs before the app serves traffic, so failures are loud and recoverable" }
        ],
        example: "kubectl -n bgapi logs deploy/bgapi --tail=80\n# ...applying migration '..._InitialCreate' (SQL Server)...\n# ...applying migration '..._InitialScroogeCorp' (Postgres)...\n# Successfully started BGAPI web application ;)",
        why: "Migrate-on-startup keeps deploys single-step: push code, the new pod migrates both schemas itself. Separate histories per context is exactly why the ScroogeCorp move is clean — its migrations can't touch the legacy SQL Server schema. Trade-off: at >1 replica two pods could race — fine here at replicas: 1."
      },
      {
        id: 621,
        commandTitle: "Inspect Both Databases",
        command: "kubectl -n bgapi exec -it sqlserver-0 -- /opt/mssql-tools18/bin/sqlcmd ...",
        searchTerms: "inspect databases sqlcmd psql sys.databases bgapi-local geography techcorp scroogecorp financingrequests verify catalog",
        description: "The data layer spans two engines, so you inspect it in two places. On <b>SQL Server</b> you should see <code>bgapi-local</code> (API migration) plus <code>Geography</code> and <code>TechCorp</code> (db-init Job). On <b>Postgres</b> you should see the <code>FinancingRequests</code> and <code>IntakeDocuments</code> tables (created by the API's ScroogeCorp migration). The ScroogeCorp tables are <b>not</b> in SQL Server — that's the whole point of the split.",
        parts: [
          { text: "sqlcmd … SELECT name FROM sys.databases", explanation: "lists SQL Server catalogs — confirms bgapi-local + Geography + TechCorp landed" },
          { text: "psql … \\dt", explanation: "lists Postgres tables — confirms the ScroogeCorp schema was migrated in" },
          { text: "-C (sqlcmd)", explanation: "trust the self-signed server cert — mandatory with the mssql-tools18 client" }
        ],
        example: "SA='YourStrong!Passw0rd'\n\n# SQL Server catalogs:\nkubectl -n bgapi exec -it sqlserver-0 -- \\\n  /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"$SA\" -C \\\n  -Q \"SELECT name FROM sys.databases ORDER BY name\"\n# bgapi-local / Geography / TechCorp / master / model / msdb / tempdb\n\n# Postgres tables (ScroogeCorp):\nkubectl -n bgapi exec -it postgres-0 -- psql -U postgres -d scroogecorp -c '\\dt'\n# FinancingRequests | IntakeDocuments",
        why: "Splitting the catalogs makes a partial failure obvious: if bgapi-local is missing the API's SQL migration never ran; if the Postgres tables are missing the ScroogeCorp migration failed; if Geography/TechCorp are missing the db-init Job did. You can tell at a glance which slice of the data layer is broken."
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: VERIFY
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'BGAPI · Verify',
    content: `
      <p>
        <strong>Prove it works layer by layer.</strong> First confirm the pods reached their
        expected states, then hit Swagger two ways: locally via <code>port-forward</code> (tests
        the app in isolation) and publicly at <code>api.yourdomain.com</code> (tests the tunnel +
        Traefik + Ingress path). If the local one works but the public one doesn't, the problem is
        routing, not the app.
      </p>
      <p>
        Finally, a real ScroogeCorp round-trip — a POST that writes to Postgres and a GET that
        reads it back — proves the migration, DI, and Npgsql wiring end to end, not just that the
        process is up.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'bgapi-verify',
    sectionTitle: 'BGAPI · Verify',
    items: [
      {
        id: 630,
        commandTitle: "Watch Pods, Port-Forward & Hit the Public URL",
        command: "kubectl -n bgapi port-forward svc/bgapi 62010:62010",
        searchTerms: "port-forward swagger verify pods running completed readiness probe bgapi 62010 curl json public api.yourdomain.com sqlserver postgres",
        description: "Confirm the workloads reached their expected states: <code>sqlserver-0</code> and <code>postgres-0</code> Running, <code>db-init</code> Completed, <code>bgapi</code> Running. Then hit Swagger two ways — <b>locally</b> via port-forward (the app in isolation) and <b>publicly</b> at <code>https://api.yourdomain.com/swagger</code> (the full tunnel → Traefik → Ingress path). Both hit the same <code>swagger.json</code> the readiness probe uses, so a 200 means genuinely healthy.",
        parts: [
          { text: "get pods", explanation: "sqlserver + postgres Running, db-init Completed, bgapi Running = healthy stack" },
          { text: "port-forward svc/bgapi 62010:62010", explanation: "tunnels the ClusterIP Service to your machine, bypassing ingress — tests the app alone" },
          { text: "curl https://api.yourdomain.com/...", explanation: "tests the public path; if local works but this doesn't, the issue is Traefik/tunnel/DNS, not the app" }
        ],
        example: "kubectl -n bgapi get pods\n#  sqlserver-0            1/1  Running\n#  postgres-0             1/1  Running\n#  db-init-xxxxx          0/1  Completed\n#  bgapi-xxxxxxxxxx-xxxxx 1/1  Running\n\n# Local (bypasses ingress):\nkubectl -n bgapi port-forward svc/bgapi 62010:62010 &\ncurl -s http://localhost:62010/swagger/v1/swagger.json | head -c 120\n\n# Public (full path through the tunnel):\ncurl -sI https://api.yourdomain.com/swagger/v1/swagger.json\n# → open https://api.yourdomain.com/swagger in a browser for the demo",
        why: "Testing the layers separately is how you avoid chasing an ingress bug that's actually a crashed pod — or vice versa. For the demo, the public browser URL is the artifact; the port-forward is your fallback if the tunnel misbehaves on stage."
      },
      {
        id: 631,
        commandTitle: "Test a ScroogeCorp Endpoint",
        command: "curl -X POST http://localhost:62010/api/scrooge-corp/financing-requests -H 'Content-Type: application/json' -d '{...}'",
        searchTerms: "scrooge corp financing request endpoint curl post cqrs mediator ddd verify write read money iban postgres dapper api.yourdomain.com",
        description: "The <code>ScroogeCorp</code> slice is the DDD/CQRS vertical: a POST creates a <code>FinancingRequest</code> aggregate (write side, EF Core → <b>Postgres</b>) and returns its id; a GET reads it back via the Dapper read side. A successful round-trip proves the Postgres migration, DI and Npgsql wiring are all correct end-to-end. Works against <code>localhost:62010</code> (port-forward) or the public <code>api.yourdomain.com</code>.",
        parts: [
          { text: "POST /api/scrooge-corp/financing-requests", explanation: "the command side — creates the aggregate in Postgres, returns its id (thin controller → _mediator.Send)" },
          { text: "amount / debtorIban", explanation: "Money and Iban value objects — self-validating records, rejected at the domain boundary if malformed" },
          { text: "GET the returned id", explanation: "the Dapper read path — reads a flat DTO from Postgres (Redis cache-aside when configured)" }
        ],
        example: "curl -X POST http://localhost:62010/api/scrooge-corp/financing-requests \\\n  -H 'Content-Type: application/json' \\\n  -d '{\n    \"debtorName\": \"Scrooge McDuck\",\n    \"amount\": {\"amount\": 1000000, \"currency\": \"USD\"},\n    \"debtorIban\": \"GB29NWBK60161331926819\",\n    \"documentId\": \"test-doc-001\"\n  }'\n# → returns the new FinancingRequest id; GET it back to hit the Dapper read path\n\n# Same call works publicly:\n#   curl -X POST https://api.yourdomain.com/api/scrooge-corp/financing-requests ...",
        why: "This endpoint touches every layer the interview cares about — DDD invariants, CQRS split, EF write / Dapper read — now against Postgres. If it round-trips in the cluster, the deployment has proven the app, not just the plumbing. (Redis is optional: absent, the read path just skips the cache-aside.)"
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: REAL-TIME CD (DOCKER HUB WEBHOOK)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'BGAPI · Real-time CD (Docker Hub Webhook)',
    content: `
      <p>
        <strong>Close the loop: <code>docker push</code> on your Mac → the Pi pulls → live in
        seconds.</strong> Docker Hub fires a webhook the moment you push a new tag; a tiny
        receiver on the Pi catches it and runs a deploy script that does <code>kubectl set
        image</code> + <code>rollout</code>. The Pi never builds — it just pulls the pre-baked
        image you already pushed.
      </p>
      <p>
        Two security notes shape this section. Docker Hub webhooks are <strong>not HMAC-signed</strong>
        (unlike GitHub/Azure DevOps), so we gate the receiver with a <strong>secret token in the
        URL</strong> instead, and pin the image name in the deploy script so a stray call can at
        worst redeploy one of your own tags. The receiver is reachable only through the Cloudflare
        Tunnel — no inbound port on your router.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'bgapi-cd',
    sectionTitle: 'BGAPI · Real-time CD (Docker Hub Webhook)',
    items: [
      {
        id: 640,
        commandTitle: "Why a Webhook, and Install It",
        command: "sudo apt install -y webhook",
        searchTerms: "webhook receiver install real-time cd continuous deployment docker hub push trigger pull rollout go binary",
        description: "The <code>webhook</code> binary (a tiny Go HTTP receiver) turns a Docker Hub push into an instant deploy: Docker Hub calls a URL the moment you push, the receiver runs a deploy script, nothing polls in between. In this model the receiver only ever <b>pulls and rolls out</b> — the image was already built and pushed from your Mac.",
        parts: [
          { text: "apt install webhook", explanation: "a single ~5 MB Go binary — an HTTP endpoint that runs a command when a request matches your rules" },
          { text: "push, not poll", explanation: "deploy fires within seconds of docker push instead of on a timer tick" },
          { text: "pulls, never builds", explanation: "the script does kubectl set image + rollout — no docker build, no containerd import on the Pi" }
        ],
        example: "sudo apt update && sudo apt install -y webhook\nwebhook --version\n\n# Next: create the pull-deploy script it runs, the hook config that\n# checks a URL token, and a service to keep it alive.",
        why: "For a fast edit → push → live loop while prepping a demo, push-based CD lands changes in seconds. And because the Pi only pulls (never builds), each deploy is quick and can't OOM the Pi mid-demo."
      },
      {
        id: 641,
        commandTitle: "Create the Pull-Deploy Script",
        command: "cat > ~/bgapi-k3s/deploy-image.sh <<'EOF' ... EOF",
        searchTerms: "deploy-image.sh pull deploy script kubectl set image rollout status tag argument docker hub push_data.tag idempotent no build",
        description: "The receiver runs this script with the pushed tag as its argument. It pins the image to <code>bgteam/bgapi</code>, does <code>kubectl set image</code> to that tag, and waits for the rollout. No git fetch, no <code>docker build</code>, no containerd import — just a pull. Create it in <code>~/bgapi-k3s</code>.",
        parts: [
          { text: "TAG=\"${1:-latest}\"", explanation: "the pushed tag comes in as $1 from the webhook payload (push_data.tag); defaults to latest" },
          { text: "IMAGE=\"bgteam/bgapi:${TAG}\"", explanation: "image name is PINNED in the script — the webhook only supplies the tag, never the repo" },
          { text: "set image + rollout status", explanation: "points the Deployment at the new tag and blocks until the new pod is Ready (or the rollout times out)" }
        ],
        example: "cd ~/bgapi-k3s\ncat > deploy-image.sh <<'EOF'\n#!/usr/bin/env bash\n# deploy-image.sh — point the bgapi Deployment at a freshly pushed image tag.\n#\n# Called by the webhook receiver with the pushed tag as $1 (from Docker Hub's\n# push_data.tag). Pulls + rolls out only — the image is built/pushed on the Mac.\n#\n# Usage (manual):  ./deploy-image.sh <tag>\n\nset -euo pipefail\n\nTAG=\"${1:-latest}\"\nIMAGE=\"bgteam/bgapi:${TAG}\"        # repo pinned; only the tag is variable\nNAMESPACE=\"${NAMESPACE:-bgapi}\"\nKUBECTL=\"${KUBECTL:-kubectl}\"\n\nlog() { echo \"[$(date -Iseconds)] $*\"; }\n\nlog \"Deploying ${IMAGE} ...\"\n\"$KUBECTL\" -n \"$NAMESPACE\" set image deploy/bgapi bgapi=\"$IMAGE\"\n\n# If the same tag (e.g. :latest) was re-pushed, set image is a no-op — force a\n# fresh pull with a restart (imagePullPolicy: Always re-pulls on pod creation).\n\"$KUBECTL\" -n \"$NAMESPACE\" rollout restart deploy/bgapi\n\nlog \"Waiting for rollout ...\"\nif \"$KUBECTL\" -n \"$NAMESPACE\" rollout status deploy/bgapi --timeout=180s; then\n  log \"Rollout successful: ${IMAGE}\"\nelse\n  log \"WARNING: rollout did not finish. Check: kubectl -n $NAMESPACE get pods\"\nfi\nEOF\n\nchmod +x deploy-image.sh\n\n# Test by hand with a real tag you pushed:\n./deploy-image.sh $(cd /path/to/BGAPI && git rev-parse --short HEAD)",
        why: "One idempotent deploy path — the webhook, a manual run, and any future trigger all call this same script. Because it only pulls a pre-built image, the on-Pi deploy is seconds, not the 5–15 minutes an on-Pi rebuild would cost."
      },
      {
        id: 642,
        commandTitle: "Create the Hook Config (URL-token verified)",
        command: "sudo cp ~/bgapi-k3s/webhook.conf /etc/webhook.conf",
        searchTerms: "webhook.conf docker hub token url query trigger-rule pass-arguments push_data.tag execute-command security no hmac verify create",
        description: "<code>webhook.conf</code> declares one hook: the URL path (<code>id</code>), the command to run (your <code>deploy-image.sh</code>), the payload value to pass as an argument (<code>push_data.tag</code>), and a <b>trigger-rule</b>. Docker Hub webhooks can't HMAC-sign, so the rule checks a <b>secret token in the URL query</b> — only a caller who knows it can fire a deploy. Set a strong token, then copy it to <code>/etc/webhook.conf</code>.",
        parts: [
          { text: "id: bgapi-deploy", explanation: "becomes the URL path: https://…/hooks/bgapi-deploy" },
          { text: "pass-arguments-to-command → push_data.tag", explanation: "extracts the pushed tag from Docker Hub's JSON payload and passes it to deploy-image.sh as $1" },
          { text: "trigger-rule → value match on url 'token'", explanation: "requires ?token=<secret> in the URL; Docker Hub can't sign requests, so this shared secret is the gate" }
        ],
        example: "cd ~/bgapi-k3s\ncat > webhook.conf <<'EOF'\n[\n  {\n    \"id\": \"bgapi-deploy\",\n    \"execute-command\": \"/home/pi/bgapi-k3s/deploy-image.sh\",\n    \"command-working-directory\": \"/home/pi/bgapi-k3s\",\n    \"pass-arguments-to-command\": [\n      { \"source\": \"payload\", \"name\": \"push_data.tag\" }\n    ],\n    \"trigger-rule\": {\n      \"match\": {\n        \"type\": \"value\",\n        \"value\": \"CHANGE-ME-long-random-token\",\n        \"parameter\": { \"source\": \"url\", \"name\": \"token\" }\n      }\n    }\n  }\n]\nEOF\n\n# Generate a strong token and paste it in place of CHANGE-ME-long-random-token:\nopenssl rand -hex 32\nnano webhook.conf\n\n# Install it where the service reads it:\nsudo cp webhook.conf /etc/webhook.conf",
        why: "The token is the whole security model here. The receiver runs a command that redeploys your app; an unauthenticated endpoint doing that, reachable through a public tunnel, is an RCE invitation. Since Docker Hub can't send an HMAC signature, the secret URL token (over HTTPS) plus the pinned image name in the script are what make exposing it safe."
      },
      {
        id: 643,
        commandTitle: "Run the Receiver as a Service",
        command: "sudo systemctl enable --now bgapi-webhook.service",
        searchTerms: "systemd service webhook receiver port 9000 enable start persistent daemon bgapi-webhook unit restart boot kubectl create",
        description: "Running <code>webhook</code> from a terminal dies when you log out. Create a systemd unit so it starts on boot and restarts on failure. It runs <code>webhook -hooks /etc/webhook.conf -port 9000 -verbose</code>, listening on <code>localhost:9000</code> for the tunnel to forward Docker Hub's calls to.",
        parts: [
          { text: "ExecStart … -port 9000", explanation: "the local port the receiver listens on; the Cloudflare Tunnel maps a hostname to it" },
          { text: "Restart=on-failure", explanation: "survives crashes; journald keeps the log of every deploy it fires" },
          { text: "enable --now", explanation: "starts it immediately and on every boot" }
        ],
        example: "cd ~/bgapi-k3s\ncat > bgapi-webhook.service <<'EOF'\n# bgapi-webhook.service — real-time CD receiver.\n#\n# Runs the `webhook` binary (sudo apt install -y webhook) as a persistent\n# service on localhost:9000. Docker Hub calls it through the Cloudflare Tunnel\n# on every push; a matching URL token triggers /home/pi/bgapi-k3s/deploy-image.sh\n# (kubectl set image → rollout). The Pi pulls the pre-built image — no build here.\n[Unit]\nDescription=BGAPI — webhook receiver for real-time CD\nAfter=network-online.target\nWants=network-online.target\n\n[Service]\nType=simple\nUser=pi\nWorkingDirectory=/home/pi/bgapi-k3s\nExecStart=/usr/bin/webhook -hooks /etc/webhook.conf -port 9000 -verbose\nRestart=on-failure\nRestartSec=5\n\n# Log to journald\nStandardOutput=journal\nStandardError=journal\nSyslogIdentifier=bgapi-webhook\n\n[Install]\nWantedBy=multi-user.target\nEOF\n\nsudo cp bgapi-webhook.service /etc/systemd/system/\nsudo systemctl daemon-reload\nsudo systemctl enable --now bgapi-webhook.service\nsudo systemctl status bgapi-webhook.service",
        why: "A CD trigger you have to babysit isn't CD. As a service it survives reboots and crashes, and journald (`journalctl -u bgapi-webhook -f`) becomes the audit log for 'why did the app just restart?' — you'll want that log open during the demo."
      },
      {
        id: 644,
        commandTitle: "Expose It & Wire the Docker Hub Webhook",
        command: "cloudflared route (deploy.yourdomain.com) + Docker Hub webhook",
        searchTerms: "cloudflare tunnel expose webhook docker hub push trigger hostname ingress config.yml deploy.yourdomain.com token repository webhooks access policy",
        description: "The receiver is on <code>localhost:9000</code>; Docker Hub is on the public internet. Bridge them with your existing <b>Cloudflare Tunnel</b>: add a hostname route to <code>config.yml</code> pointing at <code>http://localhost:9000</code>, above the wildcard, and restart cloudflared. Then in <b>Docker Hub → your repo → Webhooks</b>, add a webhook whose URL is your tunnel hostname plus the secret token. Every push now fires it.",
        parts: [
          { text: "config.yml: deploy.yourdomain.com → http://localhost:9000", explanation: "add above the wildcard, then restart cloudflared (config.yml isn't hot-reloaded)" },
          { text: "Docker Hub → Repository → Webhooks", explanation: "Docker Hub POSTs to your URL on every push to bgteam/bgapi" },
          { text: "URL: https://deploy.yourdomain.com/hooks/bgapi-deploy?token=<secret>", explanation: "the tunnel hostname + the hook id + the URL token from webhook.conf — they must match" }
        ],
        example: "# ~/.cloudflared/config.yml — add ABOVE the wildcard entry:\ningress:\n  - hostname: deploy.yourdomain.com\n    service: http://localhost:9000\n  - hostname: \"*.yourdomain.com\"\n    service: http://localhost:80\n  - service: http_status:404\nsudo systemctl restart cloudflared\n\n# Docker Hub → hub.docker.com/r/bgteam/bgapi → Webhooks →\n#   Name:        pi-deploy\n#   Webhook URL: https://deploy.yourdomain.com/hooks/bgapi-deploy?token=<your-token>\n#   → Create\n\n# The full loop, from your Mac:\n#   docker build ... && docker push bgteam/bgapi:<sha>\n#   → Docker Hub fires the webhook\n#   → Pi runs deploy-image.sh <sha>  (set image + rollout)\n#   → live at https://api.yourdomain.com/swagger in seconds",
        why: "This closes the loop without opening a single inbound port on your router: Docker Hub reaches the Pi only through the authenticated tunnel, and the URL token ensures only it can trigger a deploy. Harden further with a Cloudflare Access policy on deploy.yourdomain.com if you like."
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: POLL-BASED CD (alternative to webhook)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Alternative: Poll-Based CD (no tunnel required)',
    content: `
      <p>
        <strong>Don't want to set up a webhook or tunnel?</strong> A systemd
        timer that polls your git remote every 5 minutes is a simpler
        alternative. The timer runs <code>watch-deploy.sh</code>, which does a
        <code>git fetch</code>, compares SHAs, and only rebuilds when new
        commits exist — each poll cycle is ~1 second when there's nothing to
        do. This approach works entirely on the LAN: the Pi pulls from GitHub
        (no inbound port needed), builds the Docker image locally, imports it
        into k3s's containerd, and rolls out.
      </p>
      <p>
        <strong>Trade-off:</strong> deploys are delayed by up to 5 minutes,
        and a Docker build on the Pi takes 10–15 minutes. The webhook approach
        (previous section) lands changes in seconds because the image is
        pre-built on your Mac. Choose this if you want zero external
        dependencies — no tunnel, no webhook binary, no Cloudflare DNS.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'bgapi-poll-cd',
    sectionTitle: 'BGAPI · Poll-Based CD (systemd timer)',
    items: [
      {
        id: 645,
        commandTitle: 'Create the Watch-Deploy Script & Timer Units',
        command: 'sudo systemctl enable --now bgapi-watch.timer',
        searchTerms: 'watch-deploy poll timer systemd git fetch sha compare rebuild docker import containerd k3s ctr oneshot',
        description: 'Creates three files inline: <code>watch-deploy.sh</code> (the poll-and-rebuild script), <code>bgapi-watch.service</code> (a oneshot systemd unit that runs it), and <code>bgapi-watch.timer</code> (fires every 5 minutes with a 30-second random jitter). The script is idempotent — if no new commits exist, it exits immediately without rebuilding.',
        parts: [
          { text: 'git fetch + SHA compare', explanation: 'the script stores the last-deployed SHA in .last-deployed-sha — only rebuilds when origin/dev has a new commit' },
          { text: 'docker build + k3s ctr images import', explanation: 'the Pi builds the image locally (slow: 10–15 min), then imports it into containerd so k3s can use it' },
          { text: 'OnUnitActiveSec=300', explanation: 'the timer fires every 5 minutes (300 seconds) after the last run completed' },
          { text: 'RandomizedDelaySec=30', explanation: 'adds up to 30 seconds of random jitter so multiple Pis don\'t all hit GitHub at once' },
        ],
        example: "cd ~/bgapi-k3s\n\n# --- watch-deploy.sh ---\ncat > watch-deploy.sh <<'SCRIPT'\n#!/usr/bin/env bash\n# watch-deploy.sh — poll the git remote, rebuild on new commits, redeploy.\n#\n# Called by systemd timer every N minutes. Idempotent: if no new commits\n# exist, exits immediately without rebuilding. Stores the last-deployed SHA\n# in .last-deployed-sha so it survives reboots and timer cycles.\n\nset -euo pipefail\n\nREPO_DIR=\"${REPO_DIR:-/home/pi/BGAPI}\"\nSTATE_FILE=\"$REPO_DIR/.last-deployed-sha\"\nBRANCH=\"${WATCH_BRANCH:-dev}\"\nNAMESPACE=\"${NAMESPACE:-bgapi}\"\nKUBECTL=\"${KUBECTL:-kubectl}\"\n\nlog() { echo \"[$(date -Iseconds)] $*\"; }\n\ncd \"$REPO_DIR\" || { log \"ERROR: repo dir $REPO_DIR not found\"; exit 1; }\n\nlog \"Fetching origin/$BRANCH ...\"\ngit fetch origin \"$BRANCH\" 2>&1 || { log \"ERROR: git fetch failed\"; exit 1; }\n\nREMOTE_SHA=$(git rev-parse \"origin/$BRANCH\" 2>/dev/null)\nLAST_SHA=\"\"\nif [ -f \"$STATE_FILE\" ]; then\n  LAST_SHA=$(cat \"$STATE_FILE\")\nfi\n\nif [ \"$REMOTE_SHA\" = \"$LAST_SHA\" ]; then\n  log \"No new commits. HEAD: ${REMOTE_SHA:0:8}\"\n  exit 0\nfi\n\nlog \"NEW COMMITS: ${LAST_SHA:0:8} → ${REMOTE_SHA:0:8}\"\n\nlog \"Pulling $BRANCH ...\"\ngit checkout \"$BRANCH\" 2>&1\ngit pull origin \"$BRANCH\" 2>&1\n\nlog \"Building bgapi:local (this will take several minutes on a Pi) ...\"\ndocker build -f APIs/BGAPI/Dockerfile -t bgapi:local . 2>&1\n\nlog \"Importing image into k3s containerd ...\"\ndocker save bgapi:local | sudo k3s ctr images import - 2>&1\n\nlog \"Triggering rollout restart for deploy/bgapi ...\"\n\"$KUBECTL\" -n \"$NAMESPACE\" rollout restart deploy/bgapi 2>&1\n\nlog \"Waiting for rollout to complete ...\"\nif \"$KUBECTL\" -n \"$NAMESPACE\" rollout status deploy/bgapi --timeout=180s 2>&1; then\n  log \"Rollout successful.\"\nelse\n  log \"WARNING: rollout did not complete in time.\"\nfi\n\necho \"$REMOTE_SHA\" > \"$STATE_FILE\"\nlog \"Deployed $REMOTE_SHA — recorded to $STATE_FILE\"\nlog \"Done.\"\nSCRIPT\nchmod +x watch-deploy.sh\n\n# --- bgapi-watch.service (oneshot — runs once per timer tick) ---\ncat > bgapi-watch.service <<'EOF'\n[Unit]\nDescription=BGAPI — poll git remote and redeploy on new commits\nAfter=network-online.target docker.service\nWants=network-online.target docker.service\n\n[Service]\nType=oneshot\nUser=pi\nWorkingDirectory=/home/pi/BGAPI\nExecStart=/home/pi/bgapi-k3s/watch-deploy.sh\n\n# Log to journald\nStandardOutput=journal\nStandardError=journal\nSyslogIdentifier=bgapi-watch\n\n# Timeout: builds can take 15+ min on a Pi\nTimeoutStartSec=1800\nEOF\n\n# --- bgapi-watch.timer ---\ncat > bgapi-watch.timer <<'EOF'\n[Unit]\nDescription=BGAPI git watcher — poll every 5 minutes\nRequires=bgapi-watch.service\n\n[Timer]\nOnBootSec=60\nOnUnitActiveSec=300\nRandomizedDelaySec=30\nUnit=bgapi-watch.service\n\n[Install]\nWantedBy=timers.target\nEOF\n\n# Install and start the timer:\nsudo cp bgapi-watch.service /etc/systemd/system/\nsudo cp bgapi-watch.timer /etc/systemd/system/\nsudo systemctl daemon-reload\nsudo systemctl enable --now bgapi-watch.timer\n\n# Verify:\nsystemctl status bgapi-watch.timer\nsystemctl list-timers | grep bgapi",
        why: "The timer-based approach has no external dependencies — no tunnel, no webhook binary, no Cloudflare DNS. The trade-off is speed: a Docker build on the Pi takes 10–15 minutes, so a push-to-live cycle is ~20 minutes. For faster deploys, use the webhook approach (previous section) which pulls a pre-built image in seconds.",
      },
    ],
  },

  // ── Closing ────────────────────────────────────────────────────────────────

  {
    type: 'note',
    variant: 'info',
    content: `
      <strong>✅ The demo loop, end to end.</strong> Build and push from your Mac
      (<code>docker push bgteam/bgapi:&lt;sha&gt;</code>) → Docker Hub fires the webhook → the Pi
      pulls the new tag and rolls out → the change is live at
      <code>https://api.yourdomain.com/swagger</code> in seconds, with the databases persisting
      across restarts on the Pi's disk. Keep <code>journalctl -u bgapi-webhook -f</code> and
      <code>kubectl -n bgapi get pods -w</code> open during the demo so the audience can watch the
      rollout happen. If anything misbehaves on stage, the <strong>Field Manual</strong> has the
      ImagePullBackOff, 503, and CrashLoopBackOff recipes; back up the databases first with
      <strong>SD Card Backup</strong>.
    `,
  },

];
