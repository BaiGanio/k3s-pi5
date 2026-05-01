window.commandData = [

  {
    id: 500, section: "apps", sectionTitle: "Sample Applications",
    commandTitle: "Deploy Nginx Smoke Test",
    command: "kubectl apply -f nginx-deployment.yaml",
    searchTerms: "nginx deploy deployment smoke test arm64 service ingress welcome",
    description: "Deploys a simple Nginx pod as an infrastructure smoke test. Confirms pod scheduling, ClusterIP services, and Traefik Ingress routing all work before you deploy Node.js.",
    parts: [
      { text: "kind: Deployment",    explanation: "manages the Nginx pod lifecycle — restarts it if it crashes" },
      { text: "kind: Service",       explanation: "gives the pod a stable ClusterIP; other pods reach it by service name" },
      { text: "kind: Ingress",       explanation: "routes nginx.yourdomain.com → the Service via Traefik" },
      { text: "image: nginx:latest", explanation: "official Nginx image — multi-arch, ARM64 compatible out of the box" },
      { text: "resources.limits",    explanation: "critical on the Pi — without limits a runaway pod can starve the whole node" }
    ],
    example: "# nginx-deployment.yaml\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: nginx-welcome\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: nginx\n  template:\n    metadata:\n      labels:\n        app: nginx\n    spec:\n      containers:\n      - name: nginx\n        image: nginx:latest\n        ports:\n        - containerPort: 80\n        resources:\n          requests:\n            memory: \"64Mi\"\n            cpu: \"100m\"\n          limits:\n            memory: \"128Mi\"\n            cpu: \"250m\"\n---\napiVersion: v1\nkind: Service\nmetadata:\n  name: nginx-welcome\nspec:\n  selector:\n    app: nginx\n  ports:\n  - port: 80\n    targetPort: 80\n  type: ClusterIP\n---\napiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: nginx-welcome\n  annotations:\n    traefik.ingress.kubernetes.io/router.entrypoints: web\nspec:\n  rules:\n  - host: nginx.yourdomain.com\n    http:\n      paths:\n      - path: /\n        pathType: Prefix\n        backend:\n          service:\n            name: nginx-welcome\n            port:\n              number: 80\n\n# Deploy and watch:\nkubectl apply -f nginx-deployment.yaml\nkubectl get pods -l app=nginx -w",
    why: "Always validate the stack with the simplest possible workload first. If Nginx doesn't serve through Cloudflare → Traefik → Pod, neither will your Node.js app."
  },

  {
    id: 501, section: "apps", sectionTitle: "Sample Applications",
    commandTitle: "Deploy Node.js API (with Postgres)",
    command: "kubectl apply -f node-api-deployment.yaml",
    searchTerms: "node.js nodejs api rest postgres postgresql deploy configmap secret env",
    description: "Deploys a Node.js REST API backed by PostgreSQL. Non-sensitive config goes in a ConfigMap; the DB password goes in a Secret. Both are injected as environment variables via envFrom.",
    parts: [
      { text: "kind: ConfigMap",                   explanation: "holds DB_HOST, DB_PORT, DB_NAME, DB_USER, PORT — safe to commit to git" },
      { text: "kind: Secret",                      explanation: "holds DB_PASSWORD — base64-encoded at rest, never appears in logs" },
      { text: "envFrom: configMapRef / secretRef", explanation: "injects all keys from both resources as environment variables into the container" },
      { text: "image: node:20-alpine",             explanation: "lightweight Node.js LTS base image — ARM64 compatible, ~180 MB" },
      { text: "service port 80 → targetPort 3000", explanation: "the Service translates external port 80 to the Node.js app's internal port 3000" }
    ],
    example: "# node-api-deployment.yaml\napiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: node-api-config\ndata:\n  DB_HOST: postgres\n  DB_PORT: \"5432\"\n  DB_NAME: appdb\n  DB_USER: appuser\n  PORT: \"3000\"\n---\napiVersion: v1\nkind: Secret\nmetadata:\n  name: node-api-secret\ntype: Opaque\nstringData:\n  DB_PASSWORD: \"changeme123\"\n---\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: node-api\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: node-api\n  template:\n    metadata:\n      labels:\n        app: node-api\n    spec:\n      containers:\n      - name: node-api\n        image: node:20-alpine\n        ports:\n        - containerPort: 3000\n        envFrom:\n        - configMapRef:\n            name: node-api-config\n        - secretRef:\n            name: node-api-secret\n        resources:\n          requests:\n            memory: \"128Mi\"\n            cpu: \"100m\"\n          limits:\n            memory: \"256Mi\"\n            cpu: \"500m\"\n---\napiVersion: v1\nkind: Service\nmetadata:\n  name: node-api\nspec:\n  selector:\n    app: node-api\n  ports:\n  - port: 80\n    targetPort: 3000\n  type: ClusterIP\n---\napiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: node-api\n  annotations:\n    traefik.ingress.kubernetes.io/router.entrypoints: web\nspec:\n  rules:\n  - host: api.yourdomain.com\n    http:\n      paths:\n      - path: /\n        pathType: Prefix\n        backend:\n          service:\n            name: node-api\n            port:\n              number: 80",
    why: "Separating config (ConfigMap) from credentials (Secret) follows the 12-factor app pattern. You can update DB_HOST without touching the secret, and rotate passwords without redeploying config."
  },

  {
    id: 502, section: "apps", sectionTitle: "Sample Applications",
    commandTitle: "Deploy PostgreSQL Database",
    command: "kubectl apply -f postgres-deployment.yaml",
    searchTerms: "postgres postgresql deploy alpine persistent pvc secret configmap 5432",
    description: "Deploys PostgreSQL 15 (Alpine) connected to the database-pvc PersistentVolumeClaim. Data survives pod restarts. Must be deployed before the Node.js API or the API will crash on startup.",
    parts: [
      { text: "image: postgres:15-alpine",                      explanation: "ARM64-compatible, ~80 MB — much lighter than the default debian-based image" },
      { text: "mountPath: /var/lib/postgresql/data",            explanation: "the directory Postgres writes WAL logs and table files to — must be on persistent storage" },
      { text: "subPath: postgres",                              explanation: "namespaces data inside the PVC so the volume can be shared with other services later" },
      { text: "claimName: database-pvc",                        explanation: "references the PVC from the Persistent Storage section — must exist before applying this" },
      { text: "type: ClusterIP",                                explanation: "Postgres is internal-only — Node.js pods reach it via 'postgres:5432', the internet cannot" }
    ],
    example: "# postgres-deployment.yaml\napiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: postgres-config\ndata:\n  POSTGRES_DB: appdb\n  POSTGRES_USER: appuser\n---\napiVersion: v1\nkind: Secret\nmetadata:\n  name: postgres-secret\ntype: Opaque\nstringData:\n  POSTGRES_PASSWORD: \"changeme123\"\n---\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: postgres\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: postgres\n  template:\n    metadata:\n      labels:\n        app: postgres\n    spec:\n      containers:\n      - name: postgres\n        image: postgres:15-alpine\n        ports:\n        - containerPort: 5432\n        envFrom:\n        - configMapRef:\n            name: postgres-config\n        - secretRef:\n            name: postgres-secret\n        volumeMounts:\n        - name: postgres-storage\n          mountPath: /var/lib/postgresql/data\n          subPath: postgres\n        resources:\n          requests:\n            memory: \"256Mi\"\n            cpu: \"250m\"\n          limits:\n            memory: \"512Mi\"\n            cpu: \"500m\"\n      volumes:\n      - name: postgres-storage\n        persistentVolumeClaim:\n          claimName: database-pvc\n---\napiVersion: v1\nkind: Service\nmetadata:\n  name: postgres\nspec:\n  selector:\n    app: postgres\n  ports:\n  - port: 5432\n    targetPort: 5432\n  type: ClusterIP",
    why: "Deploy order matters: PVC → PostgreSQL → Node.js API. The Node.js app reads DATABASE_URL on startup — if Postgres isn't ready, the API pod enters CrashLoopBackOff."
  },

  {
    id: 503, section: "apps", sectionTitle: "Sample Applications",
    commandTitle: "Verify Node.js App Deployment",
    command: "kubectl get deployment node-api && kubectl get pods -l app=node-api && kubectl logs -l app=node-api",
    searchTerms: "get deployment pods logs verify check running node-api status",
    description: "Three quick checks after deploying: confirm the Deployment exists, the pod is Running, and the app logs show a successful startup (listening on port, DB connected).",
    parts: [
      { text: "kubectl get deployment node-api",    explanation: "shows READY count — should show 1/1 after ~30 seconds" },
      { text: "kubectl get pods -l app=node-api",   explanation: "shows pod STATUS — Running means the container is up; CrashLoopBackOff means check logs" },
      { text: "kubectl logs -l app=node-api",       explanation: "shows stdout from your Node.js process — look for 'listening on port 3000' and no DB errors" }
    ],
    example: "NAME       READY   UP-TO-DATE   AVAILABLE\nnode-api   1/1     1            1\n\nNAME             READY   STATUS    RESTARTS\nnode-api-abc12   1/1     Running   0\n\n# Logs:\nServer listening on port 3000\nConnected to PostgreSQL at postgres:5432/appdb\nGET /health 200 4ms",
    why: "RESTARTS > 0 means the container crashed and k3s restarted it. Check logs immediately — the startup error is usually a missing env var or Postgres connection refused."
  },

  {
    id: 504, section: "apps", sectionTitle: "Sample Applications",
    commandTitle: "Test Postgres Connection from Node.js Pod",
    command: "kubectl exec -it $(kubectl get pod -l app=node-api -o jsonpath='{.items[0].metadata.name}') -- node -e \"const { Pool } = require('pg'); const p = new Pool({ connectionString: process.env.DATABASE_URL }); p.query('SELECT NOW()').then(r => { console.log(r.rows[0]); p.end(); });\"",
    searchTerms: "exec node postgres pg pool connect query test DATABASE_URL end-to-end",
    description: "Shells into the running Node.js pod and fires a one-liner pg query using the pod's injected DATABASE_URL. Confirms DNS, credentials, and the pg library all work together.",
    parts: [
      { text: "kubectl get pod -l app=node-api -o jsonpath=...", explanation: "resolves the live pod name dynamically — survives pod restarts without copy-pasting" },
      { text: "new Pool({ connectionString: process.env.DATABASE_URL })", explanation: "uses the env var injected by the Secret/ConfigMap — tests the real runtime config" },
      { text: "SELECT NOW()",                                    explanation: "simplest valid Postgres query — if it returns a timestamp, the connection is healthy" }
    ],
    example: "{ now: 2024-01-15T10:30:00.000Z }\n\n# Common errors:\n# ECONNREFUSED → postgres pod isn't running or Service name is wrong\n# password authentication failed → Secret value doesn't match POSTGRES_PASSWORD\n# database \"appdb\" does not exist → POSTGRES_DB in ConfigMap was changed after initial volume creation",
    why: "Faster than reading app logs to diagnose DB issues. Tests the exact connection string the app uses — not a local psql with hardcoded creds."
  },

  {
    id: 505, section: "apps", sectionTitle: "Sample Applications",
    commandTitle: "Run a psql Session Against Postgres",
    command: "kubectl run -it --rm postgres-client --image=postgres:15-alpine --restart=Never -- psql -h postgres -U appuser -d appdb",
    searchTerms: "psql run client interactive postgres kubectl temporary pod query",
    description: "Spins up a temporary postgres:15-alpine pod, opens an interactive psql session connected to your in-cluster Postgres, then deletes the pod when you exit.",
    parts: [
      { text: "--rm",                        explanation: "deletes the pod automatically when the session ends — no cleanup needed" },
      { text: "postgres:15-alpine",          explanation: "same image as the server — guarantees client/server protocol compatibility" },
      { text: "restart=Never",               explanation: "creates a Pod directly (not a Deployment) — correct for one-shot interactive tasks" },
      { text: "-h postgres",                 explanation: "hostname 'postgres' resolves via CoreDNS to the ClusterIP Service" },
      { text: "-U appuser -d appdb",         explanation: "the user and database from your postgres-config ConfigMap" }
    ],
    example: "psql (15.6)\nType \"help\" for help.\n\nappdb=# \\dt\n# Lists all tables in your Node.js app's database\n\nappdb=# SELECT count(*) FROM users;\nappdb=# \\q",
    why: "Useful for running migrations manually, inspecting data, or debugging a Node.js query that's returning unexpected results. The pod is gone the moment you type \\q."
  }
];