// modules/k3s-pi5/bgapi-deploy.js
// Deploy BGAPI (.NET + SQL Server + Postgres) to k3s on a Raspberry Pi 5.
// Every manifest/script card below teaches you to CREATE the file on the Pi
// (cat > ... <<'EOF') — nothing is assumed to pre-exist. Build the manifests in
// ~/bgapi-k3s as you go.
window.commandData = [
  {
    id: 600, section: "bgapi-build", sectionTitle: "BGAPI · Build & Import Image",
    commandTitle: "Clone BGAPI onto the Pi",
    command: "git clone https://teamkepler@dev.azure.com/teamkepler/BGAPI/_git/BGAPI",
    searchTerms: "bgapi clone git azure devops repo dotnet .net pi source checkout home pi",
    description: "BGAPI is a .NET 10 Web API hosted on <b>Azure DevOps</b>. Clone it to <code>/home/pi/BGAPI</code> — build it natively on the Pi and the image comes out <code>linux/arm64</code>. The <code>Docs/sql/</code> folder in the repo is what the <code>db-init</code> Job later mounts to seed the reference databases, so the clone path matters: the manifests below assume <code>/home/pi/BGAPI</code>.",
    parts: [
      { text: "git clone …/_git/BGAPI", explanation: "pulls the repo including APIs/BGAPI/Dockerfile and Docs/sql/*.sql" },
      { text: "teamkepler@", explanation: "the Azure DevOps org — you'll be prompted for a PAT (personal access token) as the password" },
      { text: "clone to /home/pi/BGAPI", explanation: "the db-init Job (hostPath) and the CD script both default to this path" }
    ],
    example: "cd /home/pi\ngit clone https://teamkepler@dev.azure.com/teamkepler/BGAPI/_git/BGAPI\ncd BGAPI\n\n# The two pieces k3s needs are now on disk:\nls APIs/BGAPI/Dockerfile      # → the build recipe\nls Docs/sql                   # → geography.sql  techcorp.sql",
    why: "Building on the Pi guarantees a native ARM64 image. The alternative — cross-building on your Mac and pushing to a registry — adds a registry and buildx to the loop for zero benefit on a single-node homelab."
  },

  {
    id: 601, section: "bgapi-build", sectionTitle: "BGAPI · Build & Import Image",
    commandTitle: "Build the ARM64 Image",
    command: "docker build -f APIs/BGAPI/Dockerfile -t bgapi:local .",
    searchTerms: "docker build dockerfile bgapi arm64 dotnet sdk aspnet image pi5 tag local swap oom",
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
    searchTerms: "k3s ctr images import containerd docker save local image pipe pull policy never rebuild",
    description: "k3s runs its own <b>containerd</b>, a separate image store from Docker's. A freshly built <code>bgapi:local</code> lives in Docker's daemon and is invisible to k3s until you pipe it across. <code>docker save</code> streams a tarball; <code>k3s ctr images import -</code> reads it from stdin.",
    parts: [
      { text: "docker save bgapi:local", explanation: "serialises the image (all layers) to a tar stream on stdout" },
      { text: "| sudo k3s ctr images import -", explanation: "imports the stream into k3s's containerd; the trailing - means 'read stdin'" },
      { text: "re-run on every rebuild", explanation: "the CD script (last section) automates exactly this step after each build" }
    ],
    example: "docker save bgapi:local | sudo k3s ctr images import -\n\n# Confirm k3s can now see it:\nsudo k3s ctr images ls | grep bgapi\n# docker.io/library/bgapi:local ...",
    why: "This is the #1 cause of ImagePullBackOff on single-node k3s: the image builds fine but was never imported, so the scheduler can't find it. Any time you rebuild, you must re-import."
  },

  {
    id: 610, section: "bgapi-deploy", sectionTitle: "BGAPI · Deploy the Stack",
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
    id: 611, section: "bgapi-deploy", sectionTitle: "BGAPI · Deploy the Stack",
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
    id: 613, section: "bgapi-deploy", sectionTitle: "BGAPI · Deploy the Stack",
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
    id: 614, section: "bgapi-deploy", sectionTitle: "BGAPI · Deploy the Stack",
    commandTitle: "Create the db-init Job (seed reference DBs)",
    command: "kubectl apply -f db-init-job.yaml",
    searchTerms: "db-init job seed geography techcorp sql scripts sqlcmd hostpath reference databases init container wait create manifest",
    description: "A one-shot <b>Job</b> seeds the two read-only reference databases into SQL Server. An <code>initContainer</code> polls until SQL answers <code>SELECT 1</code>, then <code>sqlcmd -i</code> runs <code>geography.sql</code> and <code>techcorp.sql</code>. The scripts are mounted from the cloned repo via <code>hostPath: /home/pi/BGAPI/Docs/sql</code> — adjust that path if you cloned elsewhere.",
    parts: [
      { text: "initContainer wait-for-sqlserver", explanation: "retries SELECT 1 up to 30× so the seed never races an unready database" },
      { text: "hostPath /home/pi/BGAPI/Docs/sql", explanation: "the .sql files from the repo checkout — this is why the clone path matters" },
      { text: "ttlSecondsAfterFinished: 300", explanation: "the completed Job auto-deletes after 5 min so it doesn't clutter the namespace" }
    ],
    example: "cd ~/bgapi-k3s\ncat > db-init-job.yaml <<'EOF'\n---\n# One-shot Job that seeds the Geography and TechCorp reference databases.\n# Runs sqlcmd against the SQL Server service using the SQL scripts in Docs/sql/.\n#\n# This mirrors the docker-compose `mssql-init` container.\napiVersion: batch/v1\nkind: Job\nmetadata:\n  name: db-init\n  namespace: bgapi\n  labels:\n    app: db-init\n    app.kubernetes.io/part-of: bgapi\nspec:\n  ttlSecondsAfterFinished: 300   # Auto-cleanup after 5 min\n  backoffLimit: 3\n  template:\n    metadata:\n      labels:\n        app: db-init\n    spec:\n      restartPolicy: Never\n      initContainers:\n        # Wait for SQL Server to be ready before running the Job\n        - name: wait-for-sqlserver\n          image: mcr.microsoft.com/azure-sql-edge:latest\n          command:\n            - /bin/bash\n            - -c\n            - |\n              echo \"Waiting for SQL Server to be ready...\"\n              for i in $(seq 1 30); do\n                if /opt/mssql-tools18/bin/sqlcmd \\\n                  -S sqlserver.bgapi.svc.cluster.local \\\n                  -U sa -P \"$SA_PASSWORD\" -C \\\n                  -Q \"SELECT 1\" &>/dev/null; then\n                  echo \"SQL Server is ready.\"\n                  exit 0\n                fi\n                echo \"Attempt $i/30 — retrying in 5s...\"\n                sleep 5\n              done\n              echo \"SQL Server did not become ready in time.\"\n              exit 1\n          env:\n            - name: SA_PASSWORD\n              valueFrom:\n                secretKeyRef:\n                  name: bgapi-secrets\n                  key: sa-password\n      containers:\n        - name: seed-databases\n          image: mcr.microsoft.com/azure-sql-edge:latest\n          command:\n            - /bin/bash\n            - -c\n            - |\n              set -e\n              echo \"Seeding Geography database...\"\n              /opt/mssql-tools18/bin/sqlcmd \\\n                -S sqlserver.bgapi.svc.cluster.local \\\n                -U sa -P \"$SA_PASSWORD\" -C \\\n                -i /sql/geography.sql\n              echo \"Geography seeded.\"\n\n              echo \"Seeding TechCorp database...\"\n              /opt/mssql-tools18/bin/sqlcmd \\\n                -S sqlserver.bgapi.svc.cluster.local \\\n                -U sa -P \"$SA_PASSWORD\" -C \\\n                -i /sql/techcorp.sql\n              echo \"TechCorp seeded.\"\n\n              echo \"All databases seeded successfully.\"\n          env:\n            - name: SA_PASSWORD\n              valueFrom:\n                secretKeyRef:\n                  name: bgapi-secrets\n                  key: sa-password\n          volumeMounts:\n            - name: sql-scripts\n              mountPath: /sql\n      volumes:\n        - name: sql-scripts\n          hostPath:\n            # Path to the SQL scripts on the Pi.\n            # Adjust if you cloned the repo elsewhere.\n            path: /home/pi/BGAPI/Docs/sql\n            type: Directory\nEOF\n\nkubectl apply -f db-init-job.yaml\nkubectl -n bgapi wait --for=condition=complete job/db-init --timeout=120s\nkubectl -n bgapi logs job/db-init   # 'All databases seeded successfully.'",
    why: "Geography and TechCorp are static reference data the app reads but never migrates — so they're seeded from raw SQL, not EF migrations. Keeping them in a separate Job means re-seeding never needs an API restart, and the API image stays free of bulk seed data."
  },

  {
    id: 615, section: "bgapi-deploy", sectionTitle: "BGAPI · Deploy the Stack",
    commandTitle: "Create the API Deployment",
    command: "kubectl apply -f bgapi.yaml",
    searchTerms: "bgapi deployment service connection strings dbconn geography techcorp scroogecorp env 62010 readiness probe create manifest",
    description: "The API Deployment + ClusterIP Service on port 62010. Its <code>env</code> carries the four connection strings — <code>dbconn</code>, <code>geography_dbconn</code>, <code>techcorp_dbconn</code> (all SQL Server) and <code>scroogecorp_dbconn</code> (Postgres) — plus the <code>ExternalDbProviders</code> flags. On startup the API migrates both <code>bgapi-local</code> and the Postgres schema, so the readiness probe (Swagger JSON) only passes once both are ready.",
    parts: [
      { text: "image: bgapi:local + imagePullPolicy: Never", explanation: "uses the image you imported into containerd — never pulls from a registry" },
      { text: "ConnectionStrings__scroogecorp_dbconn", explanation: "the Postgres connection for ScroogeCorpDbContext — Host=postgres.bgapi.svc.cluster.local" },
      { text: "readinessProbe → /swagger/v1/swagger.json", explanation: "a 200 here means the app booted AND both migrations succeeded" }
    ],
    example: "cd ~/bgapi-k3s\ncat > bgapi.yaml <<'EOF'\n---\n# BGAPI .NET API — Deployment + ClusterIP Service.\n#\n# The API applies EF Core migrations on startup against the `bgapi-local`\n# database, so no separate migration Job is needed.\napiVersion: v1\nkind: Service\nmetadata:\n  name: bgapi\n  namespace: bgapi\n  labels:\n    app: bgapi\n    app.kubernetes.io/part-of: bgapi\nspec:\n  type: ClusterIP\n  ports:\n    - port: 62010\n      targetPort: 62010\n      name: http\n  selector:\n    app: bgapi\n---\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: bgapi\n  namespace: bgapi\n  labels:\n    app: bgapi\n    app.kubernetes.io/part-of: bgapi\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: bgapi\n  template:\n    metadata:\n      labels:\n        app: bgapi\n    spec:\n      containers:\n        - name: bgapi\n          image: bgapi:local\n          imagePullPolicy: Never    # Local image imported via `k3s ctr images import`\n          ports:\n            - containerPort: 62010\n              name: http\n          env:\n            - name: ASPNETCORE_URLS\n              value: \"http://+:62010\"\n            - name: ASPNETCORE_ENVIRONMENT\n              value: \"Development\"\n            # ---- Connection strings ----\n            # All three databases point to the same SQL Server instance but\n            # different catalogs — mirrors the docker-compose setup.\n            - name: ConnectionStrings__dbconn\n              value: \"Server=sqlserver.bgapi.svc.cluster.local,1433;Initial Catalog=bgapi-local;TrustServerCertificate=True;Integrated Security=False;User ID=sa;Password=YourStrong!Passw0rd;\"\n            - name: ConnectionStrings__geography_dbconn\n              value: \"Server=sqlserver.bgapi.svc.cluster.local,1433;Initial Catalog=Geography;TrustServerCertificate=True;Integrated Security=False;User ID=sa;Password=YourStrong!Passw0rd;\"\n            - name: ConnectionStrings__techcorp_dbconn\n              value: \"Server=sqlserver.bgapi.svc.cluster.local,1433;Initial Catalog=TechCorp;TrustServerCertificate=True;Integrated Security=False;User ID=sa;Password=YourStrong!Passw0rd;\"\n            # ScroogeCorp bounded context — its own PostgreSQL database.\n            # ScroogeCorpDbContext applies its EF Core migrations here on startup.\n            - name: ConnectionStrings__scroogecorp_dbconn\n              value: \"Host=postgres.bgapi.svc.cluster.local;Port=5432;Database=scroogecorp;Username=postgres;Password=YourStrong!Passw0rd;\"\n            - name: ExternalDbProviders__geography_dbconn\n              value: \"mssql\"\n            - name: ExternalDbProviders__techcorp_dbconn\n              value: \"mssql\"\n          resources:\n            requests:\n              memory: \"256Mi\"\n              cpu: \"250m\"\n            limits:\n              memory: \"512Mi\"\n              cpu: \"1000m\"\n          readinessProbe:\n            httpGet:\n              path: /swagger/v1/swagger.json\n              port: 62010\n            initialDelaySeconds: 30\n            periodSeconds: 10\n            timeoutSeconds: 5\n          livenessProbe:\n            httpGet:\n              path: /swagger/v1/swagger.json\n              port: 62010\n            initialDelaySeconds: 60\n            periodSeconds: 30\n            timeoutSeconds: 5\nEOF\n\nkubectl apply -f bgapi.yaml\nkubectl -n bgapi wait --for=condition=ready pod -l app=bgapi --timeout=180s",
    why: "The connection strings are inline plaintext here to match the existing style — the password mirrors the Secret. If you rotate the Secret, update these too. Everything the API needs to reach both databases lives in this one env block."
  },

  {
    id: 616, section: "bgapi-deploy", sectionTitle: "BGAPI · Deploy the Stack",
    commandTitle: "Create the Ingress (Traefik)",
    command: "kubectl apply -f ingress.yaml",
    searchTerms: "traefik ingressroute bgapi.local host rule web entrypoint 62010 hosts file swagger route create manifest",
    description: "k3s bundles <b>Traefik</b> as its ingress controller. Create a Traefik <code>IngressRoute</code> CRD (not a vanilla Ingress) matching <code>Host(`bgapi.local`)</code> on the <code>web</code> (port 80) entrypoint, forwarding to the <code>bgapi</code> Service on 62010. Add a hosts-file entry on your laptop to resolve the name.",
    parts: [
      { text: "entryPoints: [web]", explanation: "Traefik's port-80 entrypoint — the standard HTTP door into the cluster" },
      { text: "match: Host(`bgapi.local`)", explanation: "routes only requests for that hostname to the API" },
      { text: "commented nginx Ingress", explanation: "the file includes a portable standard-Ingress fallback if you ever swap Traefik for nginx" }
    ],
    example: "cd ~/bgapi-k3s\ncat > ingress.yaml <<'EOF'\n---\n# Traefik IngressRoute — exposes BGAPI at bgapi.local:80.\n#\n# k3s ships with Traefik as the default ingress controller. This IngressRoute\n# is a Traefik CRD (not a standard Kubernetes Ingress) because k3s's bundled\n# Traefik expects this format.\n#\n# After applying, add to your laptop's /etc/hosts:\n#   <raspberry-pi-ip>  bgapi.local\n# Then open http://bgapi.local/swagger\napiVersion: traefik.io/v1alpha1\nkind: IngressRoute\nmetadata:\n  name: bgapi\n  namespace: bgapi\n  labels:\n    app.kubernetes.io/part-of: bgapi\nspec:\n  entryPoints:\n    - web           # Traefik's port 80 entrypoint\n  routes:\n    - kind: Rule\n      match: Host(`bgapi.local`)\n      services:\n        - name: bgapi\n          port: 62010\n---\n# Fallback: standard Kubernetes Ingress (works if you swap Traefik for nginx).\n# Uncomment and delete the IngressRoute above if you are not using k3s's\n# default Traefik.\n#\n# apiVersion: networking.k8s.io/v1\n# kind: Ingress\n# metadata:\n#   name: bgapi\n#   namespace: bgapi\n# spec:\n#   rules:\n#     - host: bgapi.local\n#       http:\n#         paths:\n#           - path: /\n#             pathType: Prefix\n#             backend:\n#               service:\n#                 name: bgapi\n#                 port:\n#                   number: 62010\nEOF\n\nkubectl apply -f ingress.yaml\nkubectl -n bgapi get ingressroute\n\n# On your laptop's /etc/hosts (Pi at 192.168.1.100):\n# 192.168.1.100   bgapi.local\n# → then browse http://bgapi.local/swagger",
    why: "The IngressRoute format is k3s-specific. Prefer a real domain over TLS? Route bgapi.local through the Cloudflare Tunnel wildcard instead (see the Cloudflare Tunnel module)."
  },

  {
    id: 617, section: "bgapi-deploy", sectionTitle: "BGAPI · Deploy the Stack",
    commandTitle: "Bundle It All — deploy.sh",
    command: "chmod +x deploy.sh && ./deploy.sh",
    searchTerms: "deploy.sh script one command ordered wait condition ready rollout redeploy teardown convenience create",
    description: "You've now created all seven manifests in <code>~/bgapi-k3s</code>. This script applies them in dependency order with a <b>wait at each gate</b>: namespace → secret → SQL Server + Postgres (ready) → db-init (complete) → API → ingress. Create it once; from then on a single <code>./deploy.sh</code> stands the whole stack up (handy after a <code>kubectl delete namespace bgapi</code>).",
    parts: [
      { text: "wait --for=condition=ready pod -l app=sqlserver / app=postgres", explanation: "blocks until each database answers — the API's migration step would crash-loop otherwise" },
      { text: "wait --for=condition=complete job/db-init", explanation: "blocks until Geography + TechCorp are seeded before the API serves reads" },
      { text: "run it after creating every .yaml above", explanation: "deploy.sh only re-applies files that already exist in the folder" }
    ],
    example: "cd ~/bgapi-k3s\ncat > deploy.sh <<'EOF'\n#!/usr/bin/env bash\n# deploy.sh — apply all BGAPI k3s manifests in order.\n#\n# Usage:\n#   chmod +x deploy.sh\n#   ./deploy.sh\n#\n# Or apply a single file:\n#   kubectl apply -f bgapi.yaml\n\nset -euo pipefail\n\nSCRIPT_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")\" && pwd)\"\nKUBECTL=\"${KUBECTL:-kubectl}\"\n\necho \"=== BGAPI k3s deploy ===\"\necho \"Using kubectl: $(command -v \"$KUBECTL\")\"\necho\n\napply() {\n  local file=\"$1\"\n  echo \"→ Applying $file ...\"\n  \"$KUBECTL\" apply -f \"$SCRIPT_DIR/$file\"\n}\n\n# Order matters: namespace first, then secrets, then infrastructure, then app.\napply namespace.yaml\napply secrets.yaml\napply sqlserver.yaml\napply postgres.yaml\n\necho\necho \"→ Waiting for SQL Server to be ready...\"\n\"$KUBECTL\" -n bgapi wait --for=condition=ready pod -l app=sqlserver --timeout=300s\n\necho\necho \"→ Waiting for PostgreSQL to be ready...\"\n\"$KUBECTL\" -n bgapi wait --for=condition=ready pod -l app=postgres --timeout=300s\n\napply db-init-job.yaml\n\necho\necho \"→ Waiting for db-init Job to complete...\"\n\"$KUBECTL\" -n bgapi wait --for=condition=complete job/db-init --timeout=120s\n\napply bgapi.yaml\napply ingress.yaml\n\necho\necho \"→ Waiting for BGAPI to be ready...\"\n\"$KUBECTL\" -n bgapi wait --for=condition=ready pod -l app=bgapi --timeout=120s\n\necho\necho \"=== Deploy complete ===\"\necho\n\"$KUBECTL\" -n bgapi get pods,svc,ingressroute\necho\necho \"Port-forward to test:  kubectl -n bgapi port-forward svc/bgapi 62010:62010\"\necho \"Ingress (if DNS set):  http://bgapi.local/swagger\"\nEOF\n\nchmod +x deploy.sh\n./deploy.sh",
    why: "Applying everything at once technically works — Kubernetes reconciles eventually — but you'd watch the API CrashLoopBackOff a few times while the databases boot. Gating the rollout turns a noisy startup into a clean, legible one, and makes teardown-and-redeploy a single command."
  },

  {
    id: 620, section: "bgapi-data", sectionTitle: "BGAPI · Databases & Migrations",
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
    id: 621, section: "bgapi-data", sectionTitle: "BGAPI · Databases & Migrations",
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

  {
    id: 630, section: "bgapi-verify", sectionTitle: "BGAPI · Verify",
    commandTitle: "Watch Pods & Port-Forward Swagger",
    command: "kubectl -n bgapi port-forward svc/bgapi 62010:62010",
    searchTerms: "port-forward swagger verify pods running completed readiness probe bgapi 62010 curl json health sqlserver postgres",
    description: "Confirm the workloads reached their expected states: <code>sqlserver-0</code> and <code>postgres-0</code> Running, <code>db-init</code> Completed, <code>bgapi</code> Running. Then port-forward the API and hit its Swagger JSON — the same path the readiness probe uses — so a 200 means the pod is genuinely healthy (both migrations included).",
    parts: [
      { text: "get pods", explanation: "sqlserver + postgres Running, db-init Completed, bgapi Running = healthy stack" },
      { text: "port-forward svc/bgapi 62010:62010", explanation: "tunnels the ClusterIP Service to your machine, bypassing ingress" },
      { text: "/swagger/v1/swagger.json", explanation: "the readiness/liveness probe path — a clean 200 proves the API is up" }
    ],
    example: "kubectl -n bgapi get pods\n#  sqlserver-0            1/1  Running\n#  postgres-0             1/1  Running\n#  db-init-xxxxx          0/1  Completed\n#  bgapi-xxxxxxxxxx-xxxxx 1/1  Running\n\nkubectl -n bgapi port-forward svc/bgapi 62010:62010 &\ncurl -s http://localhost:62010/swagger/v1/swagger.json | head -c 120",
    why: "Port-forward isolates the API from the ingress path: if this works but bgapi.local doesn't, the problem is Traefik/DNS, not the app. Testing the layers separately is how you avoid chasing an ingress bug that's actually a crashed pod."
  },

  {
    id: 631, section: "bgapi-verify", sectionTitle: "BGAPI · Verify",
    commandTitle: "Test a ScroogeCorp Endpoint",
    command: "curl -X POST http://localhost:62010/api/scrooge-corp/financing-requests -H 'Content-Type: application/json' -d '{...}'",
    searchTerms: "scrooge corp financing request endpoint curl post cqrs mediator ddd verify write read money iban postgres dapper",
    description: "The <code>ScroogeCorp</code> slice is the DDD/CQRS vertical: a POST creates a <code>FinancingRequest</code> aggregate (write side, EF Core → <b>Postgres</b>) and returns its id; a GET reads it back via the Dapper read side. A successful round-trip proves the Postgres migration, DI and Npgsql wiring are all correct end-to-end.",
    parts: [
      { text: "POST /api/scrooge-corp/financing-requests", explanation: "the command side — creates the aggregate in Postgres, returns its id (thin controller → _mediator.Send)" },
      { text: "amount / debtorIban", explanation: "Money and Iban value objects — self-validating records, rejected at the domain boundary if malformed" },
      { text: "GET the returned id", explanation: "the Dapper read path — reads a flat DTO from Postgres (Redis cache-aside when configured)" }
    ],
    example: "curl -X POST http://localhost:62010/api/scrooge-corp/financing-requests \\\n  -H 'Content-Type: application/json' \\\n  -d '{\n    \"debtorName\": \"Scrooge McDuck\",\n    \"amount\": {\"amount\": 1000000, \"currency\": \"USD\"},\n    \"debtorIban\": \"GB29NWBK60161331926819\",\n    \"documentId\": \"test-doc-001\"\n  }'\n# → returns the new FinancingRequest id; GET it back to hit the Dapper read path",
    why: "This endpoint touches every layer the interview cares about — DDD invariants, CQRS split, EF write / Dapper read — now against Postgres. If it round-trips in the cluster, the deployment has proven the app, not just the plumbing. (Redis is optional: absent, the read path just skips the cache-aside.)"
  },

  {
    id: 640, section: "bgapi-cd", sectionTitle: "BGAPI · Real-time CD (Webhook)",
    commandTitle: "Why Webhook, and Install It",
    command: "sudo apt install -y webhook",
    searchTerms: "webhook receiver install real-time cd continuous deployment push trigger vs polling instant deploy go binary",
    description: "The polling approach (a systemd timer) checks the remote every few minutes — simple, but laggy and always fetching. The <code>webhook</code> binary (a tiny Go HTTP receiver) flips it to <b>push</b>: Azure DevOps calls a URL the moment you push, the receiver runs a deploy script, nothing polls in between. Instant deploys, zero idle work.",
    parts: [
      { text: "apt install webhook", explanation: "a single ~5 MB Go binary — an HTTP endpoint that runs a command when a request matches your rules" },
      { text: "push, not poll", explanation: "deploy fires within seconds of git push instead of on the next timer tick" },
      { text: "three files to create next", explanation: "the deploy script, the hook config, and a systemd unit — all built below" }
    ],
    example: "sudo apt update && sudo apt install -y webhook\nwebhook --version\n\n# Next: create the deploy script it runs, the hook config that\n# HMAC-verifies callers, and a service to keep it alive.",
    why: "For a single-node homelab either works. The webhook wins when you're iterating fast and want a push to land in seconds — the tight edit → deploy → check loop you want while prepping a demo."
  },

  {
    id: 641, section: "bgapi-cd", sectionTitle: "BGAPI · Real-time CD (Webhook)",
    commandTitle: "Create the Deploy Script",
    command: "cat > ~/bgapi-k3s/watch-deploy.sh <<'EOF' ... EOF",
    searchTerms: "watch-deploy.sh deploy script git fetch build import rollout idempotent last-deployed-sha branch create webhook execute-command",
    description: "The receiver runs a script that does the actual work: fetch the branch, and if there are new commits, pull → <code>docker build</code> → import into containerd → <code>kubectl rollout restart</code>. It's <b>idempotent</b> — if the remote SHA matches the last deployed, it exits in ~1s. Create it in <code>~/bgapi-k3s</code>. Note the <code>BRANCH</code> default is <code>dev</code>; set <code>WATCH_BRANCH</code> if you deploy from another branch.",
    parts: [
      { text: "REPO_DIR=/home/pi/BGAPI", explanation: "the script lives in ~/bgapi-k3s but operates on the cloned repo (it cd's there for git + docker build)" },
      { text: "BRANCH=${WATCH_BRANCH:-dev}", explanation: "which branch to deploy — override with the WATCH_BRANCH env var (e.g. master)" },
      { text: ".last-deployed-sha", explanation: "records what was deployed so a re-trigger with no new commits is a cheap no-op" }
    ],
    example: "cd ~/bgapi-k3s\ncat > watch-deploy.sh <<'EOF'\n#!/usr/bin/env bash\n# watch-deploy.sh — poll the git remote, rebuild on new commits, redeploy to k3s.\n#\n# Called by systemd timer every N minutes. Idempotent: if no new commits\n# exist, exits immediately without rebuilding. Stores the last-deployed SHA\n# in .last-deployed-sha so it survives reboots and timer cycles.\n#\n# Usage (manual):\n#   ./watch-deploy.sh\n#\n# Or let the systemd timer run it (see bgapi-watch.timer).\n\nset -euo pipefail\n\n# ---- Config ----------------------------------------------------------------\nREPO_DIR=\"${REPO_DIR:-/home/pi/BGAPI}\"\nSTATE_FILE=\"$REPO_DIR/.last-deployed-sha\"\nBRANCH=\"${WATCH_BRANCH:-dev}\"\nNAMESPACE=\"${NAMESPACE:-bgapi}\"\nKUBECTL=\"${KUBECTL:-kubectl}\"\n# ---------------------------------------------------------------------------\n\nlog() { echo \"[$(date -Iseconds)] $*\"; }\n\ncd \"$REPO_DIR\" || { log \"ERROR: repo dir $REPO_DIR not found\"; exit 1; }\n\n# ------------------------------------------------------------------\n# 1. Fetch the remote and compare SHAs\n# ------------------------------------------------------------------\nlog \"Fetching origin/$BRANCH ...\"\ngit fetch origin \"$BRANCH\" 2>&1 || { log \"ERROR: git fetch failed\"; exit 1; }\n\nREMOTE_SHA=$(git rev-parse \"origin/$BRANCH\" 2>/dev/null) || { log \"ERROR: cannot resolve origin/$BRANCH\"; exit 1; }\nLAST_SHA=\"\"\nif [ -f \"$STATE_FILE\" ]; then\n  LAST_SHA=$(cat \"$STATE_FILE\")\nfi\n\nif [ \"$REMOTE_SHA\" = \"$LAST_SHA\" ]; then\n  log \"No new commits. HEAD: ${REMOTE_SHA:0:8}\"\n  exit 0\nfi\n\nlog \"NEW COMMITS: ${LAST_SHA:0:8} → ${REMOTE_SHA:0:8}\"\n\n# ------------------------------------------------------------------\n# 2. Pull and build the Docker image\n# ------------------------------------------------------------------\nlog \"Pulling $BRANCH ...\"\ngit checkout \"$BRANCH\" 2>&1\ngit pull origin \"$BRANCH\" 2>&1\n\nlog \"Building bgapi:local (this will take several minutes on a Pi) ...\"\ndocker build -f APIs/BGAPI/Dockerfile -t bgapi:local . 2>&1\n\nlog \"Importing image into k3s containerd ...\"\ndocker save bgapi:local | sudo k3s ctr images import - 2>&1\n\n# ------------------------------------------------------------------\n# 3. Redeploy to k3s\n# ------------------------------------------------------------------\nlog \"Triggering rollout restart for deploy/bgapi ...\"\n\"$KUBECTL\" -n \"$NAMESPACE\" rollout restart deploy/bgapi 2>&1\n\nlog \"Waiting for rollout to complete ...\"\nif \"$KUBECTL\" -n \"$NAMESPACE\" rollout status deploy/bgapi --timeout=180s 2>&1; then\n  log \"Rollout successful.\"\nelse\n  log \"WARNING: rollout did not complete in time. Check with: kubectl -n $NAMESPACE get pods\"\nfi\n\n# ------------------------------------------------------------------\n# 4. Record the deployed SHA\n# ------------------------------------------------------------------\necho \"$REMOTE_SHA\" > \"$STATE_FILE\"\nlog \"Deployed $REMOTE_SHA — recorded to $STATE_FILE\"\nlog \"Done.\"\nEOF\n\nchmod +x watch-deploy.sh\n\n# Test it by hand once (deploys if there are new commits):\n./watch-deploy.sh",
    why: "The webhook, the (optional) polling timer, and manual runs all call this same script — one idempotent deploy path, no logic duplicated. Idempotency is what makes it safe to trigger on every push without worrying about redundant rebuilds."
  },

  {
    id: 642, section: "bgapi-cd", sectionTitle: "BGAPI · Real-time CD (Webhook)",
    commandTitle: "Create the Hook Config (HMAC-verified)",
    command: "sudo cp ~/bgapi-k3s/webhook.conf /etc/webhook.conf",
    searchTerms: "webhook.conf hmac sha256 secret trigger-rule execute-command payload signature verify azure devops security create",
    description: "<code>webhook.conf</code> declares one hook: the URL path (<code>id</code>), the command to run (your <code>watch-deploy.sh</code>), and a <b>trigger-rule</b> that HMAC-verifies each request. Only a caller who knows the shared secret can fire a deploy. Create it, set a strong secret, then copy it to <code>/etc/webhook.conf</code> where the service reads it.",
    parts: [
      { text: "id: bgapi-deploy", explanation: "becomes the URL path: https://…/hooks/bgapi-deploy" },
      { text: "execute-command: /home/pi/bgapi-k3s/watch-deploy.sh", explanation: "the idempotent deploy script you just created" },
      { text: "trigger-rule → payload-hmac-sha256", explanation: "rejects any request whose HMAC signature doesn't match your secret — mandatory before exposing it" }
    ],
    example: "cd ~/bgapi-k3s\ncat > webhook.conf <<'EOF'\n[\n  {\n    \"id\": \"bgapi-deploy\",\n    \"execute-command\": \"/home/pi/bgapi-k3s/watch-deploy.sh\",\n    \"command-working-directory\": \"/home/pi/BGAPI\",\n    \"pass-environment-to-command\": [],\n    \"trigger-rule\": {\n      \"match\": {\n        \"type\": \"payload-hmac-sha256\",\n        \"secret\": \"CHANGE-ME-long-random-secret\",\n        \"parameter\": {\n          \"source\": \"header\",\n          \"name\": \"X-Hub-Signature-256\"\n        }\n      }\n    }\n  }\n]\nEOF\n\n# Set a strong secret (replace CHANGE-ME-long-random-secret):\nopenssl rand -hex 32\nnano webhook.conf\n\n# Install it where the service looks:\nsudo cp webhook.conf /etc/webhook.conf",
    why: "The HMAC rule is the whole security model. The receiver runs a shell script that rebuilds and redeploys your app — an unauthenticated endpoint doing that, reachable through a public tunnel, is a remote-code-execution invitation. The secret is what makes exposing it safe."
  },

  {
    id: 643, section: "bgapi-cd", sectionTitle: "BGAPI · Real-time CD (Webhook)",
    commandTitle: "Run the Receiver as a Service",
    command: "sudo systemctl enable --now bgapi-webhook.service",
    searchTerms: "systemd service webhook receiver port 9000 enable start persistent daemon bgapi-webhook unit restart boot create",
    description: "Running <code>webhook</code> from a terminal dies when you log out. Create a systemd unit so it starts on boot and restarts on failure. It runs <code>webhook -hooks /etc/webhook.conf -port 9000 -verbose</code>, listening on <code>localhost:9000</code> for the tunnel to forward requests to it.",
    parts: [
      { text: "ExecStart … -port 9000", explanation: "the local port the receiver listens on; the Cloudflare Tunnel maps a hostname to it" },
      { text: "Restart=on-failure", explanation: "survives crashes; journald keeps the log of every deploy it fires" },
      { text: "enable --now", explanation: "starts it immediately and on every boot" }
    ],
    example: "cd ~/bgapi-k3s\ncat > bgapi-webhook.service <<'EOF'\n# bgapi-webhook.service — real-time CD receiver.\n#\n# Runs the `webhook` binary (sudo apt install -y webhook) as a persistent\n# service listening on localhost:9000. Azure DevOps Service Hooks calls it\n# through the Cloudflare Tunnel on every push; a matching HMAC signature\n# triggers /home/pi/bgapi-k3s/watch-deploy.sh (build → import → rollout).\n#\n# This is the push-based alternative to bgapi-watch.timer (5-min polling).\n# Use one or the other — not both.\n[Unit]\nDescription=BGAPI — webhook receiver for real-time CD\nAfter=network-online.target docker.service\nWants=network-online.target docker.service\n\n[Service]\nType=simple\nUser=pi\nWorkingDirectory=/home/pi/BGAPI\nExecStart=/usr/bin/webhook -hooks /etc/webhook.conf -port 9000 -verbose\nRestart=on-failure\nRestartSec=5\n\n# Log to journald\nStandardOutput=journal\nStandardError=journal\nSyslogIdentifier=bgapi-webhook\n\n[Install]\nWantedBy=multi-user.target\nEOF\n\nsudo cp bgapi-webhook.service /etc/systemd/system/\nsudo systemctl daemon-reload\nsudo systemctl enable --now bgapi-webhook.service\nsudo systemctl status bgapi-webhook.service",
    why: "A CD trigger you have to babysit isn't CD. As a service it survives reboots and crashes, and journald (`journalctl -u bgapi-webhook -f`) becomes the audit log for 'why did the app just restart?'"
  },

  {
    id: 644, section: "bgapi-cd", sectionTitle: "BGAPI · Real-time CD (Webhook)",
    commandTitle: "Expose It & Wire the Azure DevOps Hook",
    command: "cloudflared tunnel route + Azure DevOps Service Hook",
    searchTerms: "cloudflare tunnel expose webhook azure devops service hooks push trigger hostname ingress config.yml deploy access policy",
    description: "The receiver is on <code>localhost:9000</code>; Azure DevOps is on the public internet. Bridge them with your existing <b>Cloudflare Tunnel</b>: add a hostname route to <code>config.yml</code> pointing at <code>http://localhost:9000</code>, above the wildcard. Then in Azure DevOps → <b>Project Settings → Service Hooks</b>, add a <i>Web Hooks</i> subscription on <b>Code pushed</b> targeting that URL, with the same HMAC secret.",
    parts: [
      { text: "config.yml: deploy.yourdomain.com → http://localhost:9000", explanation: "add above the wildcard, then restart cloudflared (config.yml isn't hot-reloaded)" },
      { text: "Azure DevOps → Service Hooks → Web Hooks", explanation: "subscribe to the 'Code pushed' event, filtered to your branch" },
      { text: "URL: https://deploy.yourdomain.com/hooks/bgapi-deploy", explanation: "the tunnel hostname + the hook id from webhook.conf; the HMAC secret must match" }
    ],
    example: "# ~/.cloudflared/config.yml — add ABOVE the wildcard entry:\ningress:\n  - hostname: deploy.yourdomain.com\n    service: http://localhost:9000\n  - hostname: \"*.yourdomain.com\"\n    service: http://localhost:80\n  - service: http_status:404\nsudo systemctl restart cloudflared\n\n# Azure DevOps → Project Settings → Service Hooks → + →\n#   Web Hooks → trigger 'Code pushed' → URL above → same secret → save.\n# git push  →  hook fires  →  Pi rebuilds & redeploys in one loop.",
    why: "This closes the loop without opening a single inbound port on your router: Azure DevOps reaches the Pi only through the authenticated tunnel, and the HMAC secret ensures only it can trigger a deploy. Lock it down further with a Cloudflare Access policy on deploy.yourdomain.com."
  }
];
