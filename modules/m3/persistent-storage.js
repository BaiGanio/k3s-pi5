window.commandData_persistentStorage = [

  {
    id: 200, section: "storage", sectionTitle: "Persistent Storage",
    commandTitle: "Check Default Storage Class",
    command: "kubectl get storageclass",
    searchTerms: "storageclass local-path provisioner kubectl get",
    description: "Lists available storage classes. K3s ships with local-path-provisioner, which automatically creates volumes in /var/lib/rancher/k3s/storage/.",
    parts: [
      { text: "kubectl get storageclass", explanation: "lists all StorageClass resources in the cluster" }
    ],
    example: "NAME                   PROVISIONER             RECLAIM POLICY   VOLUME BINDING MODE\nlocal-path (default)   rancher.io/local-path   Delete           WaitForFirstConsumer",
    why: "Before creating PVCs, confirm local-path is present and marked (default). If it's missing, dynamic provisioning won't work and your PostgreSQL pod will stay Pending."
  },

  {
    id: 201, section: "storage", sectionTitle: "Persistent Storage",
    commandTitle: "Create Data Directories on Pi",
    command: "sudo mkdir -p /mnt/k3s-data/{databases,applications} && sudo chown -R 1000:1000 /mnt/k3s-data && sudo chmod -R 755 /mnt/k3s-data",
    searchTerms: "mkdir data directory postgres persistent chown chmod mnt",
    description: "Creates organised directories for persistent data on the Pi's filesystem. UID 1000 matches the default postgres container user so the pod can write without permission errors.",
    parts: [
      { text: "mkdir -p /mnt/k3s-data/{databases,applications}", explanation: "brace expansion creates both subdirs in one command" },
      { text: "chown -R 1000:1000",                              explanation: "sets ownership to UID/GID 1000 — the postgres container runs as this user" },
      { text: "chmod -R 755",                                    explanation: "allows read/execute for all, write only for owner" }
    ],
    example: "ls -la /mnt/k3s-data/\n# drwxr-xr-x 2 1000 1000 databases/\n# drwxr-xr-x 2 1000 1000 applications/",
    why: "Storing data under /mnt separates cluster data from OS files. You can later mount a USB drive here for extra capacity without changing any Kubernetes manifests."
  },

  {
    id: 202, section: "storage", sectionTitle: "Persistent Storage",
    commandTitle: "Apply PersistentVolume & PVC",
    command: "kubectl apply -f pv-postgres.yaml",
    searchTerms: "persistentvolume pvc claim yaml apply postgres 5gi storage hostpath",
    description: "Creates a PersistentVolume (5 GB backed by /mnt/k3s-data/databases) and a PersistentVolumeClaim in the default namespace that the PostgreSQL Deployment binds to.",
    parts: [
      { text: "kind: PersistentVolume",                   explanation: "cluster-level resource that defines the actual storage on the Pi" },
      { text: "kind: PersistentVolumeClaim",              explanation: "namespace-scoped handle that pods reference to claim storage" },
      { text: "storageClassName: local-path",             explanation: "must match the StorageClass name from 'kubectl get storageclass'" },
      { text: "hostPath: path: /mnt/k3s-data/databases",  explanation: "the directory on the Pi that backs this volume" },
      { text: "subPath: postgres",                        explanation: "Postgres data goes into a postgres/ subdirectory of the PVC to avoid conflicts" }
    ],
    example: "# pv-postgres.yaml\napiVersion: v1\nkind: PersistentVolume\nmetadata:\n  name: database-pv\nspec:\n  capacity:\n    storage: 5Gi\n  accessModes:\n    - ReadWriteOnce\n  storageClassName: local-path\n  hostPath:\n    path: /mnt/k3s-data/databases\n    type: Directory\n---\napiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: database-pvc\n  namespace: default\nspec:\n  accessModes:\n    - ReadWriteOnce\n  storageClassName: local-path\n  resources:\n    requests:\n      storage: 5Gi\n\n# Apply and verify:\nkubectl apply -f pv-postgres.yaml\nkubectl get pv && kubectl get pvc",
    why: "Without this PVC, PostgreSQL data is lost every pod restart. This is the foundation that makes your Node.js app's database durable across deployments."
  },

  {
    id: 203, section: "storage", sectionTitle: "Persistent Storage",
    commandTitle: "Verify PV & PVC Are Bound",
    command: "kubectl get pv && kubectl get pvc",
    searchTerms: "kubectl get pv pvc bound pending status verify storage",
    description: "Confirms the PersistentVolume and PersistentVolumeClaim are in the Bound state. A PVC stuck in Pending will block the PostgreSQL pod from scheduling.",
    parts: [
      { text: "kubectl get pv",  explanation: "cluster-wide list of PersistentVolumes and their binding status" },
      { text: "kubectl get pvc", explanation: "namespace-level list of PersistentVolumeClaims" }
    ],
    example: "NAME          CAPACITY   ACCESS MODES   STATUS\ndatabase-pv   5Gi        RWO            Bound\n\nNAME           STATUS   VOLUME        CAPACITY\ndatabase-pvc   Bound    database-pv   5Gi\n\n# If STATUS is Pending, investigate:\nkubectl describe pvc database-pvc",
    why: "The PostgreSQL Deployment will stay in Pending state until its PVC shows Bound. Always confirm this before deploying the database."
  },

  {
    id: 204, section: "storage", sectionTitle: "Persistent Storage",
    commandTitle: "Deploy PostgreSQL with Persistent Storage",
    command: "kubectl apply -f postgres-deployment.yaml",
    searchTerms: "postgres postgresql deploy alpine persistent pvc secret configmap node.js",
    description: "Deploys PostgreSQL 15 (Alpine) connected to the database-pvc PVC. Uses a Secret for the password and ConfigMap for DB name/user. Safe to use as the backend for a Node.js app via DATABASE_URL.",
    parts: [
      { text: "image: postgres:15-alpine",                      explanation: "ARM64-compatible, ~80 MB image vs 300 MB for the debian variant" },
      { text: "mountPath: /var/lib/postgresql/data",            explanation: "the directory Postgres writes WAL and table files to — must be on the PVC" },
      { text: "subPath: postgres",                              explanation: "namespaces the data inside the PVC so multiple services can share one volume" },
      { text: "claimName: database-pvc",                        explanation: "references the PVC created in the previous step" },
      { text: "type: ClusterIP",                                explanation: "Postgres is internal-only — reachable from Node.js pods but not from the internet" }
    ],
    example: "# postgres-deployment.yaml\napiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: postgres-config\ndata:\n  POSTGRES_DB: appdb\n  POSTGRES_USER: appuser\n---\napiVersion: v1\nkind: Secret\nmetadata:\n  name: postgres-secret\ntype: Opaque\nstringData:\n  POSTGRES_PASSWORD: \"changeme123\"\n---\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: postgres\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: postgres\n  template:\n    metadata:\n      labels:\n        app: postgres\n    spec:\n      containers:\n      - name: postgres\n        image: postgres:15-alpine\n        ports:\n        - containerPort: 5432\n        envFrom:\n        - configMapRef:\n            name: postgres-config\n        - secretRef:\n            name: postgres-secret\n        volumeMounts:\n        - name: postgres-storage\n          mountPath: /var/lib/postgresql/data\n          subPath: postgres\n        resources:\n          requests:\n            memory: \"256Mi\"\n            cpu: \"250m\"\n          limits:\n            memory: \"512Mi\"\n            cpu: \"500m\"\n      volumes:\n      - name: postgres-storage\n        persistentVolumeClaim:\n          claimName: database-pvc\n---\napiVersion: v1\nkind: Service\nmetadata:\n  name: postgres\nspec:\n  selector:\n    app: postgres\n  ports:\n  - port: 5432\n    targetPort: 5432\n  type: ClusterIP",
    why: "The Node.js app connects via DATABASE_URL=postgresql://appuser:changeme123@postgres:5432/appdb — the 'postgres' hostname resolves via CoreDNS to the ClusterIP service automatically."
  },

  {
    id: 205, section: "storage", sectionTitle: "Persistent Storage",
    commandTitle: "Test PostgreSQL Connection from Node.js Pod",
    command: "kubectl exec -it $(kubectl get pod -l app=node-api -o jsonpath='{.items[0].metadata.name}') -- node -e \"const { Pool } = require('pg'); const p = new Pool({ connectionString: process.env.DATABASE_URL }); p.query('SELECT NOW()').then(r => { console.log(r.rows[0]); p.end(); });\"",
    searchTerms: "exec node postgres pg pool connect query test cluster end-to-end",
    description: "Shells into the running Node.js pod and runs a one-liner pg query to verify the DATABASE_URL env var, DNS resolution, and Postgres credentials are all working.",
    parts: [
      { text: "kubectl get pod -l app=node-api -o jsonpath=...", explanation: "dynamically resolves the live pod name — no copy-paste needed" },
      { text: "new Pool({ connectionString })",                   explanation: "uses the pg library with DATABASE_URL from the pod environment" },
      { text: "SELECT NOW()",                                     explanation: "simplest Postgres query — if it returns a timestamp, the connection is healthy" }
    ],
    example: "{ now: 2024-01-15T10:30:00.000Z }\n\n# If it hangs or errors:\n# - Check postgres pod is Running: kubectl get pods -l app=postgres\n# - Check DATABASE_URL is set: kubectl exec <pod> -- env | grep DATABASE_URL\n# - Check service exists: kubectl get svc postgres",
    why: "Confirms the full chain: Node.js pod → CoreDNS → postgres ClusterIP → container:5432. Faster to run this than to deploy the full app and wait for HTTP errors."
  },

  {
    id: 206, section: "storage", sectionTitle: "Persistent Storage",
    commandTitle: "Debug: PVC Stuck in Pending",
    command: "kubectl describe pvc database-pvc",
    searchTerms: "pvc pending describe storageclass provisioner binding debug",
    description: "Shows Events explaining why a PVC hasn't bound. Common causes: wrong storageClassName, missing /mnt/k3s-data/databases directory, or local-path-provisioner pod not running.",
    parts: [
      { text: "kubectl describe pvc database-pvc", explanation: "shows full PVC spec, status conditions, and Events with the root cause" }
    ],
    example: "Events:\n  Warning  ProvisioningFailed:\n    storageclass.storage.k8s.io \"local-path\" not found\n\n# Fixes:\n# 1. Confirm provisioner: kubectl get pods -n kube-system | grep local-path\n# 2. Confirm storageClassName matches: kubectl get storageclass\n# 3. Confirm directory exists on Pi: ls /mnt/k3s-data/databases",
    why: "The Postgres pod will never start until its PVC is Bound. Fix the PVC first — the pod will self-heal once the claim is satisfied."
  }
];