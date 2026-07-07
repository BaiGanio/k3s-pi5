// modules/k3s-pi5/persistent-storage.js
// Persistent Storage with k3s — make pod data survive restarts with PVs, PVCs, and local-path

window.pageBlocks = [

  // ── What is this module? ──────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Persistent Storage: Data That Survives Restarts',
    content: `
      <p>
        <strong>A pod's filesystem is disposable.</strong> Everything a container writes to its
        own filesystem vanishes the moment the pod restarts — and pods restart constantly:
        crashes, rolling updates, node reboots, <code>kubectl delete pod</code>. That's fine for
        a stateless web app, but a database that loses its data on every restart is useless. This
        module gives Postgres a home that outlives the pod.
      </p>
      <p>
        The mechanism is Kubernetes' storage abstraction. k3s ships with the
        <strong>local-path</strong> provisioner as its default StorageClass, storing volumes on
        the Pi's own disk. You put your data in a predictable place under <code>/mnt/k3s-data</code>,
        bind it to a pod through a <strong>PersistentVolume (PV)</strong> and a
        <strong>PersistentVolumeClaim (PVC)</strong>, and from then on the data lives on the host
        — the pod just mounts it.
      </p>

      <h4>The Vocabulary</h4>
      <ul>
        <li><strong>StorageClass</strong> — the "kind" of storage available. On k3s that's <code>local-path</code> (default), backed by the Pi's disk.</li>
        <li><strong>PersistentVolume (PV)</strong> — a cluster-level piece of actual storage.</li>
        <li><strong>PersistentVolumeClaim (PVC)</strong> — a pod's <em>request</em> for storage. The pod references the PVC; the PVC binds to a PV. When STATUS shows <code>Bound</code>, the two are linked and the pod can mount it.</li>
      </ul>

      <h4>What's Inside</h4>
      <ul>
        <li><strong>Check the StorageClass</strong> — confirm <code>local-path</code> is present and default.</li>
        <li><strong>Prepare the directories</strong> — create <code>/mnt/k3s-data</code> with the right owner (UID 1000 — this bites everyone).</li>
        <li><strong>Create and verify the PV/PVC</strong> — apply them, then confirm <code>Bound</code> before going further.</li>
        <li><strong>Deploy Postgres onto the volume</strong> — and test the full connection chain from a Node.js pod.</li>
        <li><strong>Debug a stuck PVC</strong> — the one failure mode you'll actually hit.</li>
      </ul>

      <h4>How to Use This</h4>
      <p>
        <strong>Verify <code>Bound</code> before you deploy the database.</strong> The single most
        common trap is deploying Postgres against a PVC that's still <code>Pending</code> — the
        pod then sits in <code>Pending</code> forever, and the error is easy to misread as an
        image or resource problem when it's really storage.
      </p>
    `,
  },

  // ── Three rules for storage ───────────────────────────────────────────────

  {
    type: 'note',
    variant: 'tip',
    content: `
      <strong>Three rules for persistent storage on a k3s Pi 5:</strong>
      <ol style="margin-top: 0.5rem; padding-left: 1.5rem;">
        <li><strong>No PVC, no persistence.</strong> A container's own filesystem is ephemeral —
            restart means the data is gone. The PVC is the <em>only</em> thing that makes Postgres
            data durable across pod restarts and redeploys.</li>
        <li><strong>Bound before deploy.</strong> A PVC stuck in <code>Pending</code> keeps the
            pod that needs it <code>Pending</code> too, indefinitely. Always confirm
            <code>kubectl get pvc</code> shows <code>Bound</code> before deploying the database.</li>
        <li><strong>Permissions matter — UID 1000.</strong> The Postgres container runs as UID
            1000 and must be able to write to the backing directory. If <code>/mnt/k3s-data</code>
            isn't <code>chown</code>ed to 1000, the pod crash-loops with permission errors on
            startup. Fix ownership <em>before</em> you deploy.</li>
      </ol>
    `,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: PERSISTENT STORAGE
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Persistent Storage',
    content: `
      <p>
        <strong>Prepare, bind, verify, then deploy — in that order.</strong> Confirm the
        <code>local-path</code> StorageClass exists, create the data directories with the correct
        owner, then apply the PV and PVC that pin your database's data to a known spot under
        <code>/mnt/k3s-data</code>. Don't skip the <code>Bound</code> check — it's the gate that
        tells you the storage is actually ready.
      </p>
      <p>
        With the claim bound, deploy Postgres so its data directory lives on the volume, and run
        the one-liner connection test from a Node.js pod to confirm the whole chain — pod →
        CoreDNS → Postgres Service → container — works end to end. The last command is your
        first stop whenever a PVC won't bind.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'storage',
    sectionTitle: 'Persistent Storage',
    items: [
      {
        id: 200,
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
        id: 201,
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
        id: 202,
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
        id: 203,
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
        id: 204,
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
        id: 205,
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
        id: 206,
        commandTitle: "Debug: PVC Stuck in Pending",
        command: "kubectl describe pvc database-pvc",
        searchTerms: "pvc pending describe storageclass provisioner binding debug",
        description: "Shows Events explaining why a PVC hasn't bound. Common causes: wrong storageClassName, missing /mnt/k3s-data/databases directory, or local-path-provisioner pod not running.",
        parts: [
          { text: "kubectl describe pvc database-pvc", explanation: "shows full PVC spec, status conditions, and Events with the root cause" }
        ],
        example: "Events:\n  Warning  ProvisioningFailed:\n    storageclass.storage.k8s.io \"local-path\" not found\n\n# Fixes:\n# 1. Confirm provisioner: kubectl get pods -n kube-system | grep local-path\n# 2. Confirm storageClassName matches: kubectl get storageclass\n# 3. Confirm directory exists on Pi: ls /mnt/k3s-data/databases",
        why: "The Postgres pod will never start until its PVC is Bound. Fix the PVC first — the pod will self-heal once the claim is satisfied."
      },
    ],
  },

  // ── Closing: What's Next ──────────────────────────────────────────────────

  {
    type: 'note',
    variant: 'info',
    content: `
      <strong>ℹ️ How this connects to the rest of your cluster.</strong> This is the pattern
      behind every stateful workload you run. <strong>BGAPI's own module</strong> deploys its
      Postgres and SQL Server with their own PVCs the same way — this module is the mental model
      that makes those manifests make sense. Two things to remember: the data now lives on the
      Pi's disk under <code>/mnt/k3s-data</code>, so it is only as safe as that disk — see
      <strong>SD Card Backup and One-Command Restore</strong> to actually protect it. And when a
      PVC won't bind or Postgres won't start, the <strong>Field Manual</strong> has the full
      "PVC stuck in Pending" and OOM-eviction recipes.
    `,
  },

];
