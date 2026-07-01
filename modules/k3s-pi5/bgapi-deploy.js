window.commandData = [

  // ── Build & Import the Image ──────────────────────────────
  {
    id: 600, section: "bgapi-build", sectionTitle: "BGAPI · Build & Import Image",
    commandTitle: "Clone BGAPI onto the Pi",
    command: "git clone https://teamkepler@dev.azure.com/teamkepler/BGAPI/_git/BGAPI",
    searchTerms: "bgapi clone git azure devops repo dotnet .net pi source checkout",
    description: "BGAPI is a .NET 10 Web API hosted on <b>Azure DevOps</b>. Clone it directly onto the Pi — the image is built natively on the Pi so it comes out <code>linux/arm64</code> with no cross-build gymnastics. The <code>Docs/sql/</code> folder that ships in the repo is also what the <code>db-init</code> Job later mounts to seed the reference databases, so cloning here does double duty.",
    parts: [
      { text: "git clone …/_git/BGAPI", explanation: "pulls the repo including APIs/BGAPI/Dockerfile and Docs/sql/*.sql" },
      { text: "teamkepler@", explanation: "the Azure DevOps org — you'll be prompted for a PAT (personal access token) as the password" },
      { text: "clone to /home/pi/BGAPI", explanation: "the db-init Job and watch-deploy.sh both default to this path; keep it unless you update the manifests" }
    ],
    example: "cd /home/pi\ngit clone https://teamkepler@dev.azure.com/teamkepler/BGAPI/_git/BGAPI\ncd BGAPI\n\n# The two pieces k3s needs are now on disk:\nls APIs/BGAPI/Dockerfile      # → the build recipe\nls Docs/sql                   # → geography.sql  techcorp.sql",
    why: "Building on the Pi guarantees a native ARM64 image. The alternative — cross-building on your Mac and pushing to a registry — adds a registry and buildx to the loop for zero benefit on a single-node homelab."
  },
  {
    id: 601, section: "bgapi-build", sectionTitle: "BGAPI · Build & Import Image",
    commandTitle: "Build the ARM64 Image",
    command: "docker build -f APIs/BGAPI/Dockerfile -t bgapi:local .",
    searchTerms: "docker build dockerfile bgapi arm64 dotnet sdk aspnet image pi5 tag local",
    description: "The Dockerfile uses <code>mcr.microsoft.com/dotnet/sdk:10.0</code> and <code>aspnet:10.0</code> — both publish <code>linux/arm64</code> tags — so the build is native on a Pi 5. Build context is the <b>repo root</b> (the trailing <code>.</code>), not the API folder, because the Dockerfile <code>COPY . .</code> pulls in the whole <code>Core → Infrastructure → APIs</code> solution.",
    parts: [
      { text: "-f APIs/BGAPI/Dockerfile", explanation: "the Dockerfile lives under the API project, but the build context is the root" },
      { text: "-t bgapi:local", explanation: "the tag the k3s Deployment references; imagePullPolicy: Never means it must exist locally in containerd" },
      { text: ".", explanation: "build context = repo root; the multi-stage build restores, builds and publishes the whole solution" }
    ],
    example: "cd /home/pi/BGAPI\ndocker build -f APIs/BGAPI/Dockerfile -t bgapi:local .\n\n# ~5–15 min on a Pi 5. If the SDK restore OOMs, add swap first:\n# sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile \\\n#   && sudo mkswap /swapfile && sudo swapon /swapfile\n\ndocker images | grep bgapi   # verify bgapi:local exists",
    why: "The image tag and the Deployment's <code>image: bgapi:local</code> must match exactly. With <code>imagePullPolicy: Never</code>, a typo means ImagePullBackOff instead of a helpful error — k3s won't reach out to a registry to recover."
  },
  {
    id: 602, section: "bgapi-build", sectionTitle: "BGAPI · Build & Import Image",
    commandTitle: "Import the Image into k3s",
    command: "docker save bgapi:local | sudo k3s ctr images import -",
    searchTerms: "k3s ctr images import containerd docker save local image pipe pull policy never",
    description: "k3s runs its own <b>containerd</b>, which is a separate image store from Docker's. A freshly built <code>bgapi:local</code> lives in Docker's daemon and is invisible to k3s until you pipe it across. <code>docker save</code> streams a tarball; <code>k3s ctr images import -</code> reads it from stdin.",
    parts: [
      { text: "docker save bgapi:local", explanation: "serialises the image (all layers) to a tar stream on stdout" },
      { text: "| sudo k3s ctr images import -", explanation: "imports the stream into k3s's containerd; the trailing - means 'read stdin'" },
      { text: "sudo", explanation: "k3s ctr talks to the root-owned containerd socket" }
    ],
    example: "docker save bgapi:local | sudo k3s ctr images import -\n\n# Confirm k3s can now see it:\nsudo k3s ctr images ls | grep bgapi\n# docker.io/library/bgapi:local ...",
    why: "This is the #1 cause of ImagePullBackOff on a single-node k3s: the image builds fine but was never imported, so the scheduler can't find it. Any time you rebuild, you must re-import — the automated watcher (last section) does this step for you."
  },

  // ── Deploy the Stack ──────────────────────────────────────
  {
    id: 610, section: "bgapi-deploy", sectionTitle: "BGAPI · Deploy the Stack",
    commandTitle: "Namespace & SA-Password Secret",
    command: "kubectl apply -f namespace.yaml -f secrets.yaml",
    searchTerms: "namespace secret sa password base64 sqlserver bgapi opaque kubectl apply isolate",
    description: "Everything lives in a dedicated <code>bgapi</code> namespace so a <code>kubectl delete namespace bgapi</code> wipes the whole stack cleanly. The SA password is a base64-encoded <code>Opaque</code> Secret that both SQL Server (as <code>MSSQL_SA_PASSWORD</code>) and the db-init Job read — one source of truth for the credential.",
    parts: [
      { text: "namespace.yaml", explanation: "creates the bgapi namespace that isolates all resources" },
      { text: "secrets.yaml", explanation: "the SA password, base64-encoded under key sa-password" },
      { text: "change the default", explanation: 'regenerate with: echo -n "NewStrong!Passw0rd" | base64 — then update the connection strings in bgapi.yaml to match' }
    ],
    example: "# Rotate the password before anything real:\necho -n 'YourStrong!Passw0rd' | base64\n#   WW91clN0cm9uZyFQYXNzdzByZA==\n\nkubectl apply -f namespace.yaml\nkubectl apply -f secrets.yaml\nkubectl -n bgapi get secret bgapi-secrets",
    why: "The password appears in two independent places — the Secret (SQL Server + Job) and the plaintext connection strings in bgapi.yaml (the API). If you rotate one and forget the other, the API authenticates against a database it can no longer log into. A future hardening step is to source the API's connection strings from the Secret too."
  },
  {
    id: 611, section: "bgapi-deploy", sectionTitle: "BGAPI · Deploy the Stack",
    commandTitle: "SQL Server (Azure SQL Edge)",
    command: "kubectl apply -f sqlserver.yaml",
    searchTerms: "sqlserver azure sql edge statefulset arm64 mssql persistent volume claim 1433 headless service pvc",
    description: "SQL Server 2022 has <b>no ARM64 build</b>, so the stack uses <code>mcr.microsoft.com/azure-sql-edge</code> — the only Microsoft SQL engine that runs natively on ARM. It ships as a <b>StatefulSet</b> with a 10Gi <code>PersistentVolumeClaim</code> (k3s's local-path provisioner binds it automatically) and a <b>headless Service</b> giving the pod the stable DNS name <code>sqlserver.bgapi.svc.cluster.local</code>.",
    parts: [
      { text: "StatefulSet + volumeClaimTemplate", explanation: "stable identity + persistent /var/opt/mssql, so data survives pod restarts" },
      { text: "clusterIP: None (headless)", explanation: "gives the pod a stable per-pod DNS name instead of load-balancing a random one" },
      { text: "MSSQL_MEMORY_LIMIT_MB: 2048", explanation: "Azure SQL Edge is greedy; capping it at 2 GB leaves headroom on the 8 GB Pi" }
    ],
    example: "kubectl apply -f sqlserver.yaml\n\n# Wait for it to pass its sqlcmd 'SELECT 1' readiness probe:\nkubectl -n bgapi wait --for=condition=ready pod -l app=sqlserver --timeout=300s\nkubectl -n bgapi get pvc     # data-sqlserver-0  Bound",
    why: "Azure SQL Edge is deprecated upstream but uses the same T-SQL dialect, the same sqlcmd tooling, and the same EF Core provider — so the legacy BGAPI contexts run against it with zero code changes. The newer ScroogeCorp context deliberately does not live here — it's on Postgres (next card)."
  },
  {
    id: 614, section: "bgapi-deploy", sectionTitle: "BGAPI · Deploy the Stack",
    commandTitle: "PostgreSQL (ScroogeCorp context)",
    command: "kubectl apply -f postgres.yaml",
    searchTerms: "postgres postgresql scroogecorp bounded context polyglot persistence statefulset arm64 pg_isready 5432 npgsql financing request",
    description: "The <b>ScroogeCorp bounded context</b> (FinancingRequest + IntakeDocument) lives in its <b>own PostgreSQL database</b>, separate from the SQL Server catalogs — <b>polyglot persistence</b>. Postgres is native ARM64 and actively maintained (unlike the deprecated Azure SQL Edge), so it's the better long-term engine on a Pi. It's a StatefulSet + 5Gi PVC + headless Service at <code>postgres.bgapi.svc.cluster.local:5432</code>, with the password from the same <code>bgapi-secrets</code>.",
    parts: [
      { text: "postgres:16-alpine", explanation: "native ARM64, ~80 MB, actively maintained — a much lighter footprint than SQL Server" },
      { text: "own database, own DbContext", explanation: "ScroogeCorpDbContext (Npgsql) — no shared tables or foreign keys with the SQL Server contexts; the bounded context owns its schema" },
      { text: "no seed Job needed", explanation: "the API applies ScroogeCorp's EF Core migrations on startup, so Postgres just comes up empty and the schema is created for it" }
    ],
    example: "kubectl apply -f postgres.yaml\nkubectl -n bgapi wait --for=condition=ready pod -l app=postgres --timeout=300s\n\n# Inspect it:\nkubectl -n bgapi exec -it postgres-0 -- psql -U postgres -d scroogecorp -c '\\dt'\n#  FinancingRequests | IntakeDocuments   (created by the API on first boot)",
    why: "Splitting ScroogeCorp onto Postgres is the interview story in one move: a new bounded context gets a new engine, its own migration history, and zero coupling to the legacy schema. It also starts the escape from Azure SQL Edge — new work lands on a database with a future."
  },
  {
    id: 612, section: "bgapi-deploy", sectionTitle: "BGAPI · Deploy the Stack",
    commandTitle: "One-Command Deploy (ordered)",
    command: "./deploy.sh",
    searchTerms: "deploy.sh order namespace secret sqlserver db-init bgapi ingress wait condition ready rollout",
    description: "<code>deploy.sh</code> applies the manifests in dependency order and <b>waits at each gate</b>: namespace → secret → SQL Server + Postgres (wait ready) → db-init Job (wait complete) → API → ingress. The ordering matters — the API migrates <code>bgapi-local</code> (SQL Server) and the ScroogeCorp schema (Postgres) on startup, so both databases must be reachable first, and the reference databases should be seeded before endpoints that read them are hit.",
    parts: [
      { text: "wait --for=condition=ready pod -l app=sqlserver", explanation: "blocks until SQL Server answers SELECT 1 — the API's migration step would crash-loop otherwise" },
      { text: "wait --for=condition=complete job/db-init", explanation: "blocks until Geography + TechCorp are seeded" },
      { text: "apply bgapi.yaml + ingress.yaml", explanation: "the API Deployment/Service, then the Traefik route" }
    ],
    example: "chmod +x deploy.sh\n./deploy.sh\n\n# Or apply by hand, same order:\nkubectl apply -f namespace.yaml -f secrets.yaml -f sqlserver.yaml -f postgres.yaml\nkubectl -n bgapi wait --for=condition=ready pod -l app=sqlserver --timeout=300s\nkubectl -n bgapi wait --for=condition=ready pod -l app=postgres  --timeout=300s\nkubectl apply -f db-init-job.yaml\nkubectl -n bgapi wait --for=condition=complete job/db-init --timeout=120s\nkubectl apply -f bgapi.yaml -f ingress.yaml",
    why: "Applying everything at once technically works — Kubernetes reconciles eventually — but you'd watch the API CrashLoopBackOff a few times while SQL Server boots. Gating the rollout turns a noisy, alarming startup into a clean, legible one."
  },
  {
    id: 613, section: "bgapi-deploy", sectionTitle: "BGAPI · Deploy the Stack",
    commandTitle: "Expose via Traefik IngressRoute",
    command: "kubectl apply -f ingress.yaml",
    searchTerms: "traefik ingressroute bgapi.local host rule web entrypoint 62010 hosts file swagger route",
    description: "k3s bundles <b>Traefik</b> as its ingress controller. <code>ingress.yaml</code> is a Traefik <code>IngressRoute</code> CRD (not a vanilla Kubernetes Ingress) matching <code>Host(`bgapi.local`)</code> on the <code>web</code> (port 80) entrypoint and forwarding to the <code>bgapi</code> Service on 62010. Add a hosts-file entry on your laptop to resolve the name.",
    parts: [
      { text: "entryPoints: [web]", explanation: "Traefik's port-80 entrypoint — the standard HTTP door into the cluster" },
      { text: "match: Host(`bgapi.local`)", explanation: "routes only requests for that hostname to the API" },
      { text: "services: bgapi:62010", explanation: "the ClusterIP Service the Deployment sits behind" }
    ],
    example: "kubectl apply -f ingress.yaml\nkubectl -n bgapi get ingressroute\n\n# On your laptop's /etc/hosts (Pi at 192.168.1.100):\n# 192.168.1.100   bgapi.local\n# → then browse http://bgapi.local/swagger\n\n# Prefer a real domain over TLS? Route bgapi.local through the\n# Cloudflare Tunnel wildcard instead (see the Cloudflare Tunnel module).",
    why: "The IngressRoute format is k3s-specific. If you ever swap Traefik for nginx, the commented-out standard Ingress at the bottom of ingress.yaml is the drop-in replacement — same host, same backend, portable syntax."
  },

  // ── Databases & Migrations ────────────────────────────────
  {
    id: 620, section: "bgapi-data", sectionTitle: "BGAPI · Databases & Migrations",
    commandTitle: "Seed Geography & TechCorp (db-init Job)",
    command: "kubectl apply -f db-init-job.yaml",
    searchTerms: "db-init job seed geography techcorp sql scripts sqlcmd hostpath reference databases init container wait",
    description: "A one-shot <b>Job</b> seeds the two read-only reference databases. An <code>initContainer</code> polls SQL Server until it answers <code>SELECT 1</code>, then the main container runs <code>sqlcmd -i</code> against <code>geography.sql</code> and <code>techcorp.sql</code>. The scripts are mounted from the cloned repo via <code>hostPath: /home/pi/BGAPI/Docs/sql</code> — this mirrors the <code>mssql-init</code> container from docker-compose.",
    parts: [
      { text: "initContainer wait-for-sqlserver", explanation: "retries SELECT 1 up to 30× so the seed never races an unready database" },
      { text: "hostPath /home/pi/BGAPI/Docs/sql", explanation: "the .sql files from the repo checkout; adjust the path if you cloned elsewhere" },
      { text: "ttlSecondsAfterFinished: 300", explanation: "the completed Job auto-deletes after 5 min so it doesn't clutter the namespace" }
    ],
    example: "kubectl apply -f db-init-job.yaml\nkubectl -n bgapi wait --for=condition=complete job/db-init --timeout=120s\nkubectl -n bgapi logs job/db-init   # 'All databases seeded successfully.'\n\n# Failed on a login timeout? SQL just wasn't ready — retry:\n# kubectl -n bgapi delete job db-init && kubectl apply -f db-init-job.yaml",
    why: "Geography and TechCorp are static reference data the app reads but never migrates — so they're seeded from raw SQL, not EF migrations. Keeping them in a separate Job (rather than folding them into the API) means re-seeding never requires an API restart, and the API image stays free of bulk seed data."
  },
  {
    id: 621, section: "bgapi-data", sectionTitle: "BGAPI · Databases & Migrations",
    commandTitle: "EF Core Migrations — Automatic on Startup",
    command: "kubectl -n bgapi logs deploy/bgapi | grep -i migrat",
    searchTerms: "ef core migrations migrateasync dbinitializer startup automatic bgapi-local seed roles users no job",
    description: "There is <b>no migration Job</b> — and you don't need one. On boot the API applies migrations for <b>both</b> databases: <code>BGAPIDbContext</code> → <code>MigrateAsync()</code> on <code>bgapi-local</code> (SQL Server), then seeds Roles/Users/Subscriptions/Courses; and <code>ScroogeCorpDbContext</code> → <code>MigrateAsync()</code> on the <code>scroogecorp</code> Postgres database. Each context has its own migration history — <code>__EFMigrationsHistory</code> in SQL Server, its Postgres equivalent — so the two schemas evolve independently.",
    parts: [
      { text: "two contexts, two engines", explanation: "BGAPIDbContext → SQL Server (Npgsql-free); ScroogeCorpDbContext → Postgres via UseNpgsql — each MigrateAsync targets its own catalog" },
      { text: "idempotent on every restart", explanation: "MigrateAsync creates the DB if missing and applies only pending migrations — safe to run each boot" },
      { text: "runs during startup", explanation: "invoked from ConfigureDbContexts before the app serves traffic; a bad connection string to either DB surfaces as CrashLoopBackOff" }
    ],
    example: "kubectl -n bgapi logs deploy/bgapi --tail=80\n# ...applying migration '..._InitialCreate' (SQL Server)...\n# ...applying migration '..._InitialScroogeCorp' (Postgres)...\n# Successfully started BGAPI web application ;)\n\n# The two connections (from bgapi.yaml env):\n# ConnectionStrings__dbconn          → sqlserver...  Initial Catalog=bgapi-local\n# ConnectionStrings__scroogecorp_dbconn → Host=postgres... Database=scroogecorp",
    why: "Migrate-on-startup keeps deploys single-step: push code, the new pod migrates both schemas itself. Separate histories per context is exactly why the ScroogeCorp move is clean — its migrations never touch, and can't break, the legacy SQL Server schema. Trade-off: a failed migration crash-loops the pod (visible, recoverable), and at >1 replica two pods could race — fine here at replicas: 1."
  },
  {
    id: 622, section: "bgapi-data", sectionTitle: "BGAPI · Databases & Migrations",
    commandTitle: "Inspect the Databases",
    command: "kubectl -n bgapi exec -it sqlserver-0 -- /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"$SA\" -C -Q \"SELECT name FROM sys.databases\"",
    searchTerms: "sqlcmd exec inspect databases sys.databases bgapi-local geography techcorp verify catalog connect interactive",
    description: "Shell into the SQL Server pod and query it with <code>sqlcmd</code>. You should see three catalogs: <code>bgapi-local</code> (created by the API's migration), plus <code>Geography</code> and <code>TechCorp</code> (created by the db-init Job). The API reads these through <code>dbconn</code>, <code>geography_dbconn</code> and <code>techcorp_dbconn</code>. The ScroogeCorp tables are <b>not</b> here — they live in the separate Postgres database (inspect with <code>psql</code>, see the PostgreSQL card).",
    parts: [
      { text: "exec -it sqlserver-0", explanation: "the StatefulSet pod always has ordinal 0 — a stable, predictable name" },
      { text: "-C", explanation: "trust the self-signed server certificate (mandatory with the mssql-tools18 client)" },
      { text: "SELECT name FROM sys.databases", explanation: "lists catalogs — confirms migrations AND seeding both landed" }
    ],
    example: "SA='YourStrong!Passw0rd'\nkubectl -n bgapi exec -it sqlserver-0 -- \\\n  /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"$SA\" -C \\\n  -Q \"SELECT name FROM sys.databases ORDER BY name\"\n# bgapi-local\n# Geography\n# TechCorp\n# master / model / msdb / tempdb",
    why: "If bgapi-local is missing, the API's migration never ran — check its logs. If Geography or TechCorp is missing, the db-init Job failed or hasn't run. Splitting the catalogs this way makes a partial failure obvious: you can tell at a glance which half of the data layer is broken."
  },

  // ── Verify ────────────────────────────────────────────────
  {
    id: 630, section: "bgapi-verify", sectionTitle: "BGAPI · Verify",
    commandTitle: "Watch Pods & Port-Forward Swagger",
    command: "kubectl -n bgapi port-forward svc/bgapi 62010:62010",
    searchTerms: "port-forward swagger verify pods running completed readiness probe bgapi 62010 curl json health",
    description: "First confirm the three workloads reached their expected states: <code>sqlserver-0</code> Running, <code>db-init</code> Completed, <code>bgapi</code> Running. Then port-forward the API and hit its Swagger JSON — the same path the readiness probe uses (<code>/swagger/v1/swagger.json</code>), so a 200 here means the pod is genuinely healthy.",
    parts: [
      { text: "get pods", explanation: "sqlserver Running, db-init Completed, bgapi Running = healthy stack" },
      { text: "port-forward svc/bgapi 62010:62010", explanation: "tunnels the ClusterIP Service to your local machine, bypassing ingress" },
      { text: "/swagger/v1/swagger.json", explanation: "the readiness/liveness probe path — a clean 200 proves the API is up" }
    ],
    example: "kubectl -n bgapi get pods\n#  sqlserver-0            1/1  Running\n#  db-init-xxxxx          0/1  Completed\n#  bgapi-xxxxxxxxxx-xxxxx 1/1  Running\n\nkubectl -n bgapi port-forward svc/bgapi 62010:62010 &\ncurl -s http://localhost:62010/swagger/v1/swagger.json | head -c 120",
    why: "Port-forward isolates the API from the ingress path: if this works but bgapi.local doesn't, the problem is Traefik/DNS, not the app. Testing the layers separately is how you avoid chasing an ingress bug that's actually a crashed pod."
  },
  {
    id: 631, section: "bgapi-verify", sectionTitle: "BGAPI · Verify",
    commandTitle: "Test a ScroogeCorp Endpoint",
    command: "curl -X POST http://localhost:62010/api/scrooge-corp/financing-requests -H 'Content-Type: application/json' -d '{...}'",
    searchTerms: "scrooge corp financing request endpoint curl post cqrs mediator ddd verify write read money iban",
    description: "The <code>ScroogeCorp</code> slice is the DDD/CQRS vertical: a POST creates a <code>FinancingRequest</code> aggregate (write side, EF Core) and returns its id; a GET reads it back through the Dapper read side. This exercises the full path — controller → MediatR handler → aggregate → <code>bgapi-local</code> — so a successful round-trip proves migrations, DI and the database are all wired correctly.",
    parts: [
      { text: "POST /api/scrooge-corp/financing-requests", explanation: "the command side — creates the aggregate, returns its id (thin controller → _mediator.Send)" },
      { text: "amount / debtorIban", explanation: "Money and Iban value objects — self-validating records, rejected at the domain boundary if malformed" },
      { text: "GET the returned id", explanation: "the query side — Dapper reads a flat DTO (with a Redis cache-aside when Redis is configured)" }
    ],
    example: "curl -X POST http://localhost:62010/api/scrooge-corp/financing-requests \\\n  -H 'Content-Type: application/json' \\\n  -d '{\n    \"debtorName\": \"Scrooge McDuck\",\n    \"amount\": {\"amount\": 1000000, \"currency\": \"USD\"},\n    \"debtorIban\": \"GB29NWBK60161331926819\",\n    \"documentId\": \"test-doc-001\"\n  }'\n# → returns the new FinancingRequest id; GET it back to hit the Dapper read path",
    why: "This is the one endpoint that touches every layer the interview cares about — DDD invariants, CQRS split, EF write / Dapper read. If it round-trips in the cluster, the deployment has proven the app, not just the plumbing. (Redis is optional: absent, the read path just skips the cache-aside.)"
  },

  // ── Real-time CD via Webhook ──────────────────────────────
  {
    id: 640, section: "bgapi-cd", sectionTitle: "BGAPI · Real-time CD (Webhook)",
    commandTitle: "Why Webhook Over Polling",
    command: "sudo apt install -y webhook",
    searchTerms: "webhook receiver install real-time cd continuous deployment push trigger vs polling systemd timer instant deploy",
    description: "The polling watcher (<code>bgapi-watch.timer</code>) checks the remote every 5 minutes — simple, but up to 5 minutes of latency and a git fetch every cycle forever. The <code>webhook</code> binary (a tiny Go HTTP receiver) flips this to <b>push</b>: Azure DevOps calls a URL <i>the moment you push</i>, the receiver runs the deploy script, and nothing polls in between. Instant deploys, zero idle work.",
    parts: [
      { text: "apt install webhook", explanation: "a single ~5 MB Go binary — an HTTP endpoint that runs a command when a request matches your rules" },
      { text: "push, not poll", explanation: "deploy fires within seconds of git push instead of on the next 5-minute tick" },
      { text: "reuses watch-deploy.sh", explanation: "the receiver's execute-command is the same idempotent build → import → rollout script — no logic duplicated" }
    ],
    example: "sudo apt update && sudo apt install -y webhook\nwebhook --version\n\n# It will run the SAME script the timer would have run — the only\n# thing changing is the trigger: an inbound HTTP call vs a 5-min tick.",
    why: "For a single-node homelab either works. The webhook wins when you're iterating fast and want to see a push land in seconds — exactly the tight edit → deploy → check loop you want while prepping a demo. Keep the timer files as a fallback if the tunnel is ever down."
  },
  {
    id: 641, section: "bgapi-cd", sectionTitle: "BGAPI · Real-time CD (Webhook)",
    commandTitle: "Define the Hook (HMAC-verified)",
    command: "sudo nano /etc/webhook.conf",
    searchTerms: "webhook.conf hmac sha256 secret trigger-rule execute-command payload signature verify azure devops security",
    description: "<code>webhook.conf</code> declares one hook: an id (the URL path), the command to run, its working directory, and a <b>trigger-rule</b> that HMAC-verifies the request. Only a caller who knows the shared secret can fire a deploy — without this, anyone who finds the URL could trigger a build. The execute-command is <code>watch-deploy.sh</code>, so the webhook path and the timer path deploy identically.",
    parts: [
      { text: "id: bgapi-deploy", explanation: "becomes the URL path: http://host:9000/hooks/bgapi-deploy" },
      { text: "execute-command: watch-deploy.sh", explanation: "the existing idempotent deploy script (k3s/watch-deploy.sh) — fetch, build, import, rollout, record SHA" },
      { text: "trigger-rule → payload-hmac-sha256", explanation: "rejects any request whose HMAC signature doesn't match your secret — mandatory before exposing it" }
    ],
    example: "# /etc/webhook.conf\n[\n  {\n    \"id\": \"bgapi-deploy\",\n    \"execute-command\": \"/home/pi/BGAPI/k3s/watch-deploy.sh\",\n    \"command-working-directory\": \"/home/pi/BGAPI\",\n    \"trigger-rule\": {\n      \"match\": {\n        \"type\": \"payload-hmac-sha256\",\n        \"secret\": \"CHANGE-ME-long-random-secret\",\n        \"parameter\": { \"source\": \"header\", \"name\": \"X-Hub-Signature-256\" }\n      }\n    }\n  }\n]\n\n# Generate a strong secret:  openssl rand -hex 32",
    why: "The HMAC rule is the whole security model. The receiver runs a shell script that rebuilds and redeploys your app — an unauthenticated endpoint doing that, reachable through a public tunnel, is a remote-code-execution invitation. The secret is what makes exposing it safe."
  },
  {
    id: 642, section: "bgapi-cd", sectionTitle: "BGAPI · Real-time CD (Webhook)",
    commandTitle: "Run the Receiver as a Service",
    command: "sudo systemctl enable --now bgapi-webhook.service",
    searchTerms: "systemd service webhook receiver port 9000 enable start persistent daemon bgapi-webhook unit restart boot",
    description: "Running <code>webhook</code> from a terminal dies when you log out. Install it as a systemd service so it starts on boot and restarts on failure. The unit runs <code>webhook -hooks /etc/webhook.conf -port 9000 -verbose</code>; the receiver then listens on <code>localhost:9000</code>, waiting for the tunnel to forward requests to it.",
    parts: [
      { text: "bgapi-webhook.service", explanation: "the systemd unit (in k3s/) that supervises the webhook binary" },
      { text: "-port 9000", explanation: "the local port the receiver listens on; the Cloudflare Tunnel maps a hostname to it" },
      { text: "enable --now", explanation: "starts it immediately and on every boot" }
    ],
    example: "sudo cp /home/pi/BGAPI/k3s/bgapi-webhook.service /etc/systemd/system/\nsudo systemctl daemon-reload\nsudo systemctl enable --now bgapi-webhook.service\n\n# Confirm it's listening and healthy:\nsudo systemctl status bgapi-webhook.service\nsudo journalctl -u bgapi-webhook.service -f",
    why: "A CD trigger you have to babysit isn't CD. As a service it survives reboots and crashes, and journald gives you a single place to watch every deploy the webhook fires — the audit log for 'why did the app just restart?'"
  },
  {
    id: 643, section: "bgapi-cd", sectionTitle: "BGAPI · Real-time CD (Webhook)",
    commandTitle: "Expose It & Wire the Azure DevOps Hook",
    command: "cloudflared tunnel route + Azure DevOps Service Hook",
    searchTerms: "cloudflare tunnel expose webhook azure devops service hooks push trigger hostname ingress config.yml deploy.local",
    description: "The receiver is on <code>localhost:9000</code>; Azure DevOps lives on the public internet. Bridge them with your existing <b>Cloudflare Tunnel</b>: add a hostname route to <code>config.yml</code> pointing at <code>http://localhost:9000</code>. Then in Azure DevOps → <b>Project Settings → Service Hooks</b>, add a <i>Web Hooks</i> subscription on the <b>Code pushed</b> event targeting that URL, with the same HMAC secret.",
    parts: [
      { text: "config.yml: deploy.yourdomain.com → http://localhost:9000", explanation: "add this ingress entry above the wildcard, then restart cloudflared (it isn't hot-reloaded)" },
      { text: "Azure DevOps → Service Hooks → Web Hooks", explanation: "subscribe to the 'Code pushed' event, filtered to your branch" },
      { text: "URL: https://deploy.yourdomain.com/hooks/bgapi-deploy", explanation: "the public tunnel URL + the hook id from webhook.conf; HMAC secret must match" }
    ],
    example: "# ~/.cloudflared/config.yml — add ABOVE the wildcard entry:\ningress:\n  - hostname: deploy.yourdomain.com\n    service: http://localhost:9000\n  - hostname: \"*.yourdomain.com\"\n    service: http://localhost:80\n  - service: http_status:404\nsudo systemctl restart cloudflared\n\n# Azure DevOps → Project Settings → Service Hooks → + →\n#   Web Hooks → trigger: 'Code pushed' → URL above → save.\n# git push  →  hook fires  →  Pi rebuilds & redeploys in one loop.",
    why: "This closes the loop without opening a single inbound port on your router: Azure DevOps reaches the Pi only through the authenticated tunnel, and the HMAC secret ensures only Azure DevOps can trigger it. Lock it down further with a Cloudflare Access policy on deploy.yourdomain.com — the same pattern the Cloudflare TCP module uses for databases and SSH."
  }
];
