const commandData = [
  {
    id: 1, section: "preflight", sectionTitle: "Pre-flight Checks",
    command: "cat /etc/os-release",
    searchTerms: "cat os-release linux version",
    description: "Displays information about your operating system (name, version, pretty name).",
    parts: [
      { text: "cat",            explanation: "concatenate — outputs file contents to screen" },
      { text: "/etc/os-release",explanation: "system config file containing OS info" }
    ],
    example: 'PRETTY_NAME="Raspberry Pi OS (64-bit)"\nNAME="Raspberry Pi OS"\nVERSION_ID="2024.01"',
    why: "Confirms you're running the right OS before installing k3s (which has OS requirements)."
  },
  {
    id: 2, section: "preflight", sectionTitle: "Pre-flight Checks",
    command: "uname -a",
    searchTerms: "uname kernel arm64 architecture",
    description: "Shows complete system information: OS name, kernel version, CPU architecture, hostname.",
    parts: [
      { text: "uname", explanation: "unix name — system info tool" },
      { text: "-a",    explanation: "flag meaning 'all' (show everything)" }
    ],
    example: "Linux raspberrypi 6.6.51-v8 #1 SMP ARM64 aarch64 GNU/Linux",
    why: "Look for <strong>aarch64</strong> in output — proves you have an ARM64 CPU. K3s on Pi 5 needs this."
  },
  {
    id: 3, section: "preflight", sectionTitle: "Pre-flight Checks",
    command: "free -h",
    searchTerms: "free memory ram",
    description: "Shows RAM usage: total, used, available. The <code>-h</code> flag displays in human-readable format (GB/MB, not bytes).",
    parts: [
      { text: "free", explanation: "memory reporting tool" },
      { text: "-h",   explanation: "'human-readable' (shows 7.5G instead of raw bytes)" }
    ],
    example: "Mem:    7.5Gi   1.2Gi   6.3Gi   120Mi   128Mi   5.8Gi",
    why: "Verifies your 8GB Pi has enough free RAM. K3s + containers need ~2GB minimum available."
  },
  {
    id: 4, section: "system", sectionTitle: "System Setup",
    command: "sudo apt update && sudo apt upgrade -y",
    searchTerms: "sudo apt update upgrade install packages",
    description: "Updates system packages to latest versions. First refreshes package list, then upgrades everything.",
    parts: [
      { text: "sudo",    explanation: "superuser do — run as administrator" },
      { text: "apt",     explanation: "package manager (Debian/Ubuntu)" },
      { text: "update",  explanation: "refresh list of available packages" },
      { text: "&&",      explanation: "run next command only if this one succeeds" },
      { text: "upgrade", explanation: "install newer versions of installed packages" },
      { text: "-y",      explanation: "auto-confirm all prompts" }
    ],
    example: "Reading package lists... Done\nBuilding dependency tree... Done\n0 upgraded, 0 newly installed",
    why: "Ensures all security patches are installed before running Kubernetes. Old packages = potential vulnerabilities."
  },
  {
    id: 5, section: "system", sectionTitle: "System Setup",
    command: "sudo dphys-swapfile swapoff",
    searchTerms: "sudo dphys-swapfile disable swap",
    description: "Turns off swap memory. Swap is disk-based RAM that's much slower — Kubernetes doesn't like it.",
    parts: [
      { text: "sudo",           explanation: "run as administrator" },
      { text: "dphys-swapfile", explanation: "Raspberry Pi's swap management tool" },
      { text: "swapoff",        explanation: "command to disable swap" }
    ],
    example: "(no output on success)",
    why: "Kubernetes pods expect fast memory. Swap causes unpredictable slowdowns — better to crash than to hang."
  },
  {
    id: 6, section: "system", sectionTitle: "System Setup",
    command: "sudo ufw allow 6443/tcp",
    searchTerms: "sudo ufw allow firewall port",
    description: "Opens a firewall port for incoming traffic. 6443/tcp is the K3s API server port.",
    parts: [
      { text: "sudo",      explanation: "run as administrator" },
      { text: "ufw",       explanation: "'uncomplicated firewall' tool" },
      { text: "allow",     explanation: "permit traffic on this port" },
      { text: "6443/tcp",  explanation: "port 6443, TCP protocol (where K3s API listens)" }
    ],
    example: "Rule added\nRule added (v6)",
    why: "UFW blocks ALL ports by default. K3s won't work without these ports open (6443, 10250, 80, 443)."
  },
  {
    id: 7, section: "k3s", sectionTitle: "K3s Installation",
    command: "curl -sfL https://get.k3s.io | sh -",
    searchTerms: "curl install k3s script",
    description: "Downloads the k3s installer script from the internet and runs it immediately. This is the official installation method.",
    parts: [
      { text: "curl",             explanation: "downloads files from URLs" },
      { text: "-sfL",             explanation: "silent, fail on HTTP error, follow redirects" },
      { text: "https://get.k3s.io", explanation: "official k3s download URL" },
      { text: "|",                explanation: "pipe — sends output to the next command" },
      { text: "sh -",             explanation: "shell reads commands from the pipe and executes them" }
    ],
    example: "Downloading k3s... [####################] 100%\n[INFO] systemd: Starting k3s",
    why: "Official k3s distribution method. Download + execute in one step = faster than manual installation."
  },
  {
    id: 8, section: "k3s", sectionTitle: "K3s Installation",
    command: "sudo systemctl status k3s",
    searchTerms: "sudo systemctl k3s status",
    description: "Checks if the k3s service is running. Shows status, recent logs, and memory usage.",
    parts: [
      { text: "sudo",      explanation: "run as administrator" },
      { text: "systemctl", explanation: "system service manager" },
      { text: "status",    explanation: "check service state" },
      { text: "k3s",       explanation: "service name (registered by installer)" }
    ],
    example: "● k3s.service - Lightweight Kubernetes\n   Active: active (running) since Mon...\n   Memory: 145.3M",
    why: "<strong>Active: active (running)</strong> = K3s started successfully. Any other status = needs debugging."
  },
  {
    id: 9, section: "k3s", sectionTitle: "K3s Installation",
    command: "sudo k3s kubectl get nodes",
    searchTerms: "kubectl get nodes",
    description: "Lists all Kubernetes nodes (machines in the cluster). Shows their readiness status.",
    parts: [
      { text: "sudo k3s kubectl", explanation: "K3s's built-in kubectl (Kubernetes CLI)" },
      { text: "get",              explanation: "retrieve/list resources" },
      { text: "nodes",            explanation: "resource type (the machines in the cluster)" }
    ],
    example: "NAME       STATUS   ROLES    AGE\npi5-k3s    Ready    master   5m",
    why: "<strong>Ready</strong> status = your Pi is ready to run containers. <strong>NotReady</strong> = wait or debug."
  },
  {
    id: 10, section: "cloudflare", sectionTitle: "Cloudflare Tunnel",
    command: "cloudflared tunnel login",
    searchTerms: "cloudflared tunnel login authenticate",
    description: "Authenticates your Pi with your Cloudflare account. Opens a browser, you log in, Pi gets a certificate.",
    parts: [
      { text: "cloudflared", explanation: "Cloudflare's tunnel client" },
      { text: "tunnel",      explanation: "subcommand for tunnel operations" },
      { text: "login",       explanation: "authenticate with Cloudflare account" }
    ],
    example: "Please open the following URL and log in with your Cloudflare account:\nhttps://dash.cloudflare.com/argotunnel?...",
    why: "The certificate proves you own the Cloudflare account. Without it, the tunnel won't work."
  },
  {
    id: 11, section: "cloudflare", sectionTitle: "Cloudflare Tunnel",
    command: "cloudflared tunnel create my-pi",
    searchTerms: "cloudflared tunnel create",
    description: "Creates a named tunnel. \"my-pi\" is just a label. Generates a unique credentials file for this tunnel.",
    parts: [
      { text: "cloudflared tunnel create", explanation: "create a new tunnel" },
      { text: "my-pi",                     explanation: "name you choose — use something meaningful" }
    ],
    example: "Tunnel my-pi created with ID abc123def456\nCredentials file: ~/.cloudflared/abc123def456.json",
    why: "Creates unique credentials for this tunnel. You'll reference these in the config file later."
  },
  {
    id: 12, section: "kubernetes", sectionTitle: "Kubernetes Operations",
    command: "kubectl apply -f nginx-deployment.yaml",
    searchTerms: "kubectl apply yaml deployment",
    description: "Reads a YAML file and creates or updates Kubernetes resources (Deployments, Services, Ingress, etc.).",
    parts: [
      { text: "kubectl",                   explanation: "Kubernetes command line tool" },
      { text: "apply",                     explanation: "create or update a resource (idempotent)" },
      { text: "-f",                        explanation: "'file' — read config from this file" },
      { text: "nginx-deployment.yaml",     explanation: "file containing the resource definition" }
    ],
    example: "deployment.apps/nginx-welcome created\nservice/nginx-service created",
    why: "This is how you deploy apps to Kubernetes. YAML defines what you want; apply makes it happen."
  },
  {
    id: 13, section: "kubernetes", sectionTitle: "Kubernetes Operations",
    command: "kubectl get pods",
    searchTerms: "kubectl get pods deployment",
    description: "Lists all running containers (pods) in your cluster. Shows status, age, and readiness.",
    parts: [
      { text: "kubectl", explanation: "Kubernetes CLI" },
      { text: "get",     explanation: "list/retrieve resources" },
      { text: "pods",    explanation: "resource type to list" }
    ],
    example: "NAME                     READY   STATUS    RESTARTS\nnginx-welcome-abc123     1/1     Running   0\ndotnet-hello-def456      1/1     Running   0",
    why: "First command to run when debugging — is my app actually running? Use this constantly."
  },
  {
    id: 14, section: "kubernetes", sectionTitle: "Kubernetes Operations",
    command: "kubectl logs nginx-welcome-abc123",
    searchTerms: "kubectl logs pod debug",
    description: "Shows output from inside a container (stdout/stderr). Use to see what the app is doing or why it crashed.",
    parts: [
      { text: "kubectl",              explanation: "Kubernetes CLI" },
      { text: "logs",                 explanation: "retrieve container output" },
      { text: "nginx-welcome-abc123", explanation: "exact pod name (from 'get pods')" }
    ],
    example: '10.42.0.1 - - [10/Apr/2026:12:00:00] "GET / HTTP/1.1" 200 615',
    why: "See actual error messages. If a pod crashes, logs tell you why (port in use, missing config, etc.)."
  },
  // ── nerdctl ──────────────────────────────────────────────────────────────
  {
    id: 15, section: "nerdctl", sectionTitle: "nerdctl (Standalone Containers)",
    command: "curl -sfL https://github.com/containerd/nerdctl/releases/download/v2.0.2/nerdctl-full-2.0.2-linux-arm64.tar.gz | sudo tar -C /usr/local -xz",
    searchTerms: "nerdctl install containerd arm64 pi",
    description: "Downloads and installs the full nerdctl bundle (includes BuildKit, CNI plugins) for ARM64. The 'full' bundle means no extra steps — everything needed to build and run containers is included.",
    parts: [
      { text: "curl -sfL",       explanation: "download silently, fail on error, follow redirects" },
      { text: "nerdctl-full-...-linux-arm64.tar.gz", explanation: "the 'full' ARM64 build — includes nerdctl, BuildKit, and CNI plugins" },
      { text: "sudo tar -C /usr/local -xz", explanation: "extract the archive directly into /usr/local, putting binaries in /usr/local/bin" }
    ],
    example: "$ nerdctl version\nClient:\n  Version: v2.0.2\nServer (containerd):\n  Version: 2.0.x",
    why: "nerdctl uses the containerd already running inside k3s — no second daemon, no Docker install, no conflicts. You get Docker-compatible commands for free."
  },
  {
    id: 16, section: "nerdctl", sectionTitle: "nerdctl (Standalone Containers)",
    command: "sudo nerdctl run -d --name my-nginx -p 8080:80 nginx:alpine",
    searchTerms: "nerdctl run container start detached port",
    description: "Pulls (if needed) and starts a container in the background. Maps port 8080 on your Pi to port 80 inside the container.",
    parts: [
      { text: "nerdctl run",  explanation: "create and start a new container" },
      { text: "-d",           explanation: "detached mode — runs in background, returns container ID" },
      { text: "--name my-nginx", explanation: "gives the container a human-readable name to reference later" },
      { text: "-p 8080:80",  explanation: "maps Pi port 8080 → container port 80 (host:container)" },
      { text: "nginx:alpine", explanation: "image to use — Alpine-based nginx, small and fast" }
    ],
    example: "Unable to find image 'nginx:alpine' locally\nPulling from docker.io/library/nginx:alpine\n...\nd3f5b5a12345abc...",
    why: "Same command you'd type with Docker. If you know 'docker run', you already know this — just swap the prefix."
  },
  {
    id: 17, section: "nerdctl", sectionTitle: "nerdctl (Standalone Containers)",
    command: "sudo nerdctl stop my-nginx && sudo nerdctl rm my-nginx",
    searchTerms: "nerdctl stop remove container",
    description: "Stops a running container gracefully, then removes it. Stop sends SIGTERM and waits; rm cleans up the container record.",
    parts: [
      { text: "nerdctl stop my-nginx", explanation: "sends SIGTERM to the container, waits up to 10s for clean shutdown" },
      { text: "&&",                    explanation: "only remove if stop succeeded — prevents removing a stuck container" },
      { text: "nerdctl rm my-nginx",   explanation: "deletes the stopped container (image stays cached locally)" }
    ],
    example: "my-nginx\nmy-nginx",
    why: "Always stop before remove — skipping stop and going straight to 'rm -f' is the container equivalent of pulling the power cord."
  },
  {
    id: 18, section: "nerdctl", sectionTitle: "nerdctl (Standalone Containers)",
    command: "sudo nerdctl ps -a",
    searchTerms: "nerdctl ps list containers running stopped",
    description: "Lists all containers — running and stopped. Without -a you only see running ones.",
    parts: [
      { text: "nerdctl ps", explanation: "list containers (process status)" },
      { text: "-a",         explanation: "'all' — includes stopped/exited containers, not just running" }
    ],
    example: "CONTAINER ID  IMAGE         COMMAND   STATUS     NAMES\nd3f5b5a12345  nginx:alpine  nginx -g  Up 2 min   my-nginx",
    why: "First command to run when something isn't responding — is the container actually up, or did it exit quietly?"
  },
  {
    id: 19, section: "nerdctl", sectionTitle: "nerdctl (Standalone Containers)",
    command: "sudo nerdctl compose up -d",
    searchTerms: "nerdctl compose docker-compose up detached",
    description: "Reads a docker-compose.yml in the current directory and starts all defined services in the background. nerdctl ships with Compose built in — no separate install needed.",
    parts: [
      { text: "nerdctl compose", explanation: "built-in Compose subcommand — reads docker-compose.yml" },
      { text: "up",              explanation: "create and start all services defined in the file" },
      { text: "-d",              explanation: "detached — runs everything in background" }
    ],
    example: "WARN[0000] Found orphan containers ([old-service]) ...\nContainer my-app  Started\nContainer my-db   Started",
    why: "Your existing docker-compose.yml files work here without modification. Great for multi-container setups (app + database + cache) without needing k3s for something that simple."
  },
  {
    id: 20, section: "nerdctl", sectionTitle: "nerdctl (Standalone Containers)",
    command: "sudo nerdctl compose down",
    searchTerms: "nerdctl compose down stop remove services",
    description: "Stops and removes all containers, networks, and anonymous volumes created by 'compose up'. Named volumes are kept by default.",
    parts: [
      { text: "nerdctl compose", explanation: "built-in Compose subcommand" },
      { text: "down",            explanation: "stop containers and remove them along with their networks" }
    ],
    example: "Container my-app  Stopped\nContainer my-db   Stopped\nNetwork my-project_default  Removed",
    why: "The clean counterpart to 'compose up'. Use 'down -v' if you also want to wipe named volumes (careful — that deletes database data too)."
  },
  {
    id: 21, section: "kubernetes", sectionTitle: "Kubernetes Operations",
    command: "kubectl create namespace demo",
    searchTerms: "kubectl namespace create demo",
    description: "Creates a logical grouping called a namespace to keep your demo resources isolated from k3s system pods.",
    parts: [
      { text: "kubectl",   explanation: "Kubernetes CLI" },
      { text: "create",    explanation: "create a new resource" },
      { text: "namespace", explanation: "resource type — a virtual cluster inside your cluster" },
      { text: "demo",      explanation: "name you choose for this namespace" }
    ],
    example: "namespace/demo created",
    why: "Namespaces prevent your test nginx from mixing with system pods. Easy to nuke everything later with one command: kubectl delete namespace demo."
  },
  {
    id: 22, section: "kubernetes", sectionTitle: "Kubernetes Operations",
    command: "kubectl create deployment nginx --image=nginx:alpine --namespace=demo",
    searchTerms: "kubectl create deployment nginx image namespace",
    description: "Creates a Deployment that tells Kubernetes to run one nginx container using the lightweight Alpine-based image, inside the demo namespace.",
    parts: [
      { text: "kubectl create deployment", explanation: "imperative shortcut — generates a Deployment without writing YAML" },
      { text: "nginx",                     explanation: "name of the Deployment" },
      { text: "--image=nginx:alpine",       explanation: "container image to run — Alpine variant is small (~8MB)" },
      { text: "--namespace=demo",           explanation: "which namespace to create this in" }
    ],
    example: "deployment.apps/nginx created",
    why: "The imperative 'create deployment' is faster than writing YAML for quick tests. For production you'd use a YAML file instead so it's version-controlled."
  },
  {
    id: 23, section: "kubernetes", sectionTitle: "Kubernetes Operations",
    command: "kubectl expose deployment nginx --port=80 --type=NodePort --namespace=demo",
    searchTerms: "kubectl expose deployment service nodeport port",
    description: "Creates a Service that exposes the nginx Deployment on a port accessible from outside the cluster — i.e. from your browser on the same network as the Pi.",
    parts: [
      { text: "kubectl expose deployment nginx", explanation: "creates a Service targeting the nginx Deployment" },
      { text: "--port=80",                       explanation: "the port nginx listens on inside the container" },
      { text: "--type=NodePort",                 explanation: "exposes the service on a high port (30000–32767) on the Pi's IP" },
      { text: "--namespace=demo",                explanation: "must match the namespace the deployment lives in" }
    ],
    example: "service/nginx exposed",
    why: "Without a Service, the pod is unreachable from outside Kubernetes. NodePort is the simplest way to test on a local Pi — no load balancer needed."
  },
  {
    id: 24, section: "kubernetes", sectionTitle: "Kubernetes Operations",
    command: "kubectl get service nginx --namespace=demo",
    searchTerms: "kubectl get service nodeport port number",
    description: "Shows the Service details — most importantly the NodePort number you'll use to reach nginx in your browser.",
    parts: [
      { text: "kubectl get service", explanation: "list service resources" },
      { text: "nginx",               explanation: "name of the specific service to inspect" },
      { text: "--namespace=demo",    explanation: "namespace where the service lives" }
    ],
    example: "NAME    TYPE       CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE\nnginx   NodePort   10.43.12.200   <none>        80:31234/TCP   30s",
    why: "The number after the colon in PORT(S) — 31234 in this example — is your NodePort. Open http://<pi-ip>:31234 in your browser and you should see the nginx welcome page."
  },
  {
    id: 25, section: "kubernetes", sectionTitle: "Kubernetes Operations",
    command: "kubectl scale deployment nginx --replicas=3 --namespace=demo",
    searchTerms: "kubectl scale deployment replicas",
    description: "Scales the nginx Deployment from 1 pod up to 3. Kubernetes will spin up the extra pods automatically and load-balance traffic across all three.",
    parts: [
      { text: "kubectl scale deployment nginx", explanation: "target the nginx Deployment for scaling" },
      { text: "--replicas=3",                   explanation: "desired number of running pod copies" },
      { text: "--namespace=demo",               explanation: "namespace where the deployment lives" }
    ],
    example: "deployment.apps/nginx scaled",
    why: "This is where Kubernetes earns its keep — one command to go from 1 to 3 pods with automatic load balancing. Scale back down to 1 the same way."
  },
  {
    id: 26, section: "kubernetes", sectionTitle: "Kubernetes Operations",
    command: "kubectl delete namespace demo",
    searchTerms: "kubectl delete namespace cleanup teardown",
    description: "Deletes the entire demo namespace and everything inside it — Deployment, Service, and all pods — in one shot.",
    parts: [
      { text: "kubectl delete", explanation: "remove a resource" },
      { text: "namespace",      explanation: "resource type to delete" },
      { text: "demo",           explanation: "name of the namespace — everything inside goes with it" }
    ],
    example: "namespace \"demo\" deleted",
    why: "The cleanest teardown — no need to delete Deployments and Services one by one. This is why namespacing your experiments from the start is worth it."
  },
  // ── Production Ready ──────────────────────────────────────────────────────
  {
    id: 27, section: "production", sectionTitle: "Production Ready",
    command: "curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null && sudo apt-get install -y apt-transport-https && echo \"deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main\" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list && sudo apt-get update && sudo apt-get install -y helm",
    searchTerms: "helm install apt kubernetes package manager",
    description: "Installs Helm — the package manager for Kubernetes — via the official Helm apt repository. Helm lets you install complex apps like the Kubernetes Dashboard with a single command instead of dozens of YAML files.",
    parts: [
      { text: "curl ... | gpg --dearmor | sudo tee ...", explanation: "downloads and installs Helm's GPG signing key so apt can verify packages" },
      { text: "echo \"deb [...] ...\" | sudo tee ...",   explanation: "adds the official Helm apt repository to your sources list" },
      { text: "sudo apt-get install -y helm",            explanation: "installs the helm binary" }
    ],
    example: "Reading package lists... Done\nThe following NEW packages will be installed: helm\n...\nSetting up helm (4.x.x)",
    why: "Helm is required to install the Kubernetes Dashboard the official way. It also becomes your go-to tool for every production app you deploy going forward."
  },
  {
    id: 28, section: "production", sectionTitle: "Production Ready",
    command: "export KUBECONFIG=/etc/rancher/k3s/k3s.yaml",
    searchTerms: "kubeconfig k3s helm kubectl environment variable",
    description: "Points kubectl and Helm at k3s's kubeconfig file. k3s stores it in a non-standard location — without this, Helm commands will fail with 'connection refused'.",
    parts: [
      { text: "export",                        explanation: "sets an environment variable for the current shell session" },
      { text: "KUBECONFIG",                    explanation: "the variable kubectl and Helm both look for to find cluster credentials" },
      { text: "/etc/rancher/k3s/k3s.yaml",    explanation: "where k3s stores its kubeconfig instead of the default ~/.kube/config" }
    ],
    example: "(no output — add this line to ~/.bashrc to make it permanent)",
    why: "Every Helm command in the next steps depends on this. To make it permanent so it survives reboots, run: echo 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml' >> ~/.bashrc"
  },
  {
    id: 29, section: "production", sectionTitle: "Production Ready",
    command: "helm repo add kubernetes-dashboard https://kubernetes.github.io/dashboard/ && helm repo update",
    searchTerms: "helm repo add kubernetes dashboard chart repository",
    description: "Adds the official Kubernetes Dashboard Helm chart repository and refreshes the local chart index.",
    parts: [
      { text: "helm repo add kubernetes-dashboard", explanation: "registers the repository under the alias 'kubernetes-dashboard'" },
      { text: "https://kubernetes.github.io/dashboard/", explanation: "the official chart repository URL maintained by the Kubernetes project" },
      { text: "helm repo update",                  explanation: "fetches the latest chart versions from all registered repos" }
    ],
    example: "\"kubernetes-dashboard\" has been added to your repositories\nHang tight while we grab the latest from your chart repositories...\nUpdate Complete.",
    why: "Helm needs to know where to find the chart before it can install it. This is a one-time setup step."
  },
  {
    id: 30, section: "production", sectionTitle: "Production Ready",
    command: "helm upgrade --install kubernetes-dashboard kubernetes-dashboard/kubernetes-dashboard --create-namespace --namespace kubernetes-dashboard",
    searchTerms: "helm install kubernetes dashboard namespace",
    description: "Installs (or upgrades if already installed) the Kubernetes Dashboard into its own dedicated namespace. Helm handles all dependencies automatically.",
    parts: [
      { text: "helm upgrade --install",              explanation: "install if not present, upgrade if already installed — safe to run repeatedly" },
      { text: "kubernetes-dashboard",                explanation: "the name you give this Helm release" },
      { text: "kubernetes-dashboard/kubernetes-dashboard", explanation: "repo-alias/chart-name" },
      { text: "--create-namespace --namespace kubernetes-dashboard", explanation: "creates the namespace if it doesn't exist, then deploys everything there" }
    ],
    example: "Release \"kubernetes-dashboard\" does not exist. Installing it now.\nNAME: kubernetes-dashboard\nSTATUS: deployed",
    why: "The Helm chart installs the dashboard, Kong proxy (which handles HTTPS internally), and all required RBAC in one shot. No manual YAML juggling."
  },
  {
    id: 31, section: "production", sectionTitle: "Production Ready",
    command: "kubectl apply -f - <<EOF\napiVersion: v1\nkind: ServiceAccount\nmetadata:\n  name: admin-user\n  namespace: kubernetes-dashboard\n---\napiVersion: rbac.authorization.k8s.io/v1\nkind: ClusterRoleBinding\nmetadata:\n  name: admin-user\nroleRef:\n  apiGroup: rbac.authorization.k8s.io\n  kind: ClusterRole\n  name: cluster-admin\nsubjects:\n- kind: ServiceAccount\n  name: admin-user\n  namespace: kubernetes-dashboard\nEOF",
    searchTerms: "kubectl serviceaccount clusterrolebinding admin dashboard token rbac",
    description: "Creates an admin ServiceAccount and binds it to the cluster-admin ClusterRole. This gives the dashboard full visibility into your cluster. The dashboard only supports Bearer Token login, so this account is what you'll log in with.",
    parts: [
      { text: "ServiceAccount",      explanation: "an identity for a process running in the cluster (your login user)" },
      { text: "ClusterRoleBinding",  explanation: "grants the ServiceAccount a cluster-wide role" },
      { text: "cluster-admin",       explanation: "built-in Kubernetes role with full read/write access to everything" },
      { text: "<<EOF ... EOF",        explanation: "heredoc — pipes the YAML directly to kubectl without creating a file" }
    ],
    example: "serviceaccount/admin-user created\nclusterrolebinding.rbac.authorization.k8s.io/admin-user created",
    why: "Without this, the dashboard loads but shows empty pages — it has no permission to read your cluster's resources."
  },
  {
    id: 32, section: "production", sectionTitle: "Production Ready",
    command: "kubectl -n kubernetes-dashboard create token admin-user",
    searchTerms: "kubectl create token admin-user dashboard login bearer",
    description: "Generates a short-lived Bearer Token for the admin-user account. Copy the output — this is what you paste into the dashboard login screen.",
    parts: [
      { text: "kubectl create token", explanation: "generates a signed JWT token for the given ServiceAccount" },
      { text: "admin-user",           explanation: "the ServiceAccount created in the previous step" },
      { text: "-n kubernetes-dashboard", explanation: "namespace where the ServiceAccount lives" }
    ],
    example: "eyJhbGciOiJSUzI1NiIsImtpZCI6Ii...(long token string)...XQ",
    why: "Tokens expire after 1 hour by default. For a persistent token add '--duration=0' (never expires) — useful for a homelab, but disable if this dashboard is internet-facing."
  },
  {
    id: 33, section: "production", sectionTitle: "Production Ready",
    command: "kubectl apply -f - <<EOF\napiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: kubernetes-dashboard-ingress\n  namespace: kubernetes-dashboard\n  annotations:\n    traefik.ingress.kubernetes.io/router.entrypoints: websecure\n    traefik.ingress.kubernetes.io/router.tls: \"true\"\n    traefik.ingress.kubernetes.io/service.serversscheme: https\nspec:\n  ingressClassName: traefik\n  rules:\n  - host: dashboard.your-domain.com\n    http:\n      paths:\n      - path: /\n        pathType: Prefix\n        backend:\n          service:\n            name: kubernetes-dashboard-kong-proxy\n            port:\n              number: 443\nEOF",
    searchTerms: "traefik ingress kubernetes dashboard kong proxy https annotation",
    description: "Creates a Traefik Ingress rule that routes traffic for your domain to the dashboard's Kong proxy over HTTPS. Replace dashboard.your-domain.com with your actual subdomain configured in Cloudflare.",
    parts: [
      { text: "ingressClassName: traefik",          explanation: "tells k3s to use its built-in Traefik ingress controller" },
      { text: "traefik.ingress.kubernetes.io/service.serversscheme: https", explanation: "critical annotation — tells Traefik that the backend (Kong) speaks HTTPS, not HTTP" },
      { text: "kubernetes-dashboard-kong-proxy",     explanation: "the internal service name created by the Helm chart — Kong handles auth and proxies to the actual dashboard" },
      { text: "host: dashboard.your-domain.com",    explanation: "the public hostname Traefik will match against incoming requests" }
    ],
    example: "ingress.networking.k8s.io/kubernetes-dashboard-ingress created",
    why: "This is the glue between Cloudflare Tunnel → Traefik → Dashboard. Without the serversscheme annotation Traefik sends HTTP to Kong, which expects HTTPS, and you get a cryptic 502 error."
  },
  {
    id: 34, section: "production", sectionTitle: "Production Ready",
    command: "cloudflared tunnel route dns <your-tunnel-name> dashboard.your-domain.com",
    searchTerms: "cloudflared tunnel route dns subdomain dashboard",
    description: "Adds a DNS record in Cloudflare pointing dashboard.your-domain.com at your tunnel. No ports need to be opened on your Pi's firewall.",
    parts: [
      { text: "cloudflared tunnel route dns", explanation: "creates a CNAME record in Cloudflare DNS pointing to your tunnel's .cfargotunnel.com address" },
      { text: "<your-tunnel-name>",           explanation: "the tunnel name you created earlier (e.g. my-pi)" },
      { text: "dashboard.your-domain.com",    explanation: "the subdomain — must match the host in the Ingress rule above" }
    ],
    example: "2026-04-10T12:00:00Z INF Added CNAME dashboard.your-domain.com which will route to this tunnel tunnelID=abc123",
    why: "This wires Cloudflare's edge network to your tunnel without touching your router or firewall. Traffic flows: Browser → Cloudflare edge → tunnel → Pi → Traefik → Dashboard."
  },
  {
    id: 35, section: "production", sectionTitle: "Production Ready",
    command: "kubectl apply -f - <<EOF\napiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: cloudflared-config\n  namespace: cloudflared\ndata:\n  config.yaml: |\n    tunnel: <your-tunnel-id>\n    credentials-file: /etc/cloudflared/creds/credentials.json\n    ingress:\n      - hostname: dashboard.your-domain.com\n        service: https://kubernetes-dashboard-kong-proxy.kubernetes-dashboard.svc.cluster.local:443\n        originRequest:\n          noTLSVerify: true\n      - service: http_status:404\nEOF",
    searchTerms: "cloudflared configmap tunnel ingress kubernetes service cluster local",
    description: "Alternatively: configure cloudflared running inside the cluster (as a Deployment) to route directly to the dashboard service by its internal DNS name — bypassing Traefik entirely for a simpler setup.",
    parts: [
      { text: "tunnel: <your-tunnel-id>",    explanation: "the UUID of your tunnel from 'cloudflared tunnel create'" },
      { text: "credentials-file",            explanation: "path to your tunnel credentials JSON, mounted as a Kubernetes Secret" },
      { text: "kubernetes-dashboard-kong-proxy.kubernetes-dashboard.svc.cluster.local", explanation: "the full internal DNS name of the dashboard service — only resolvable inside the cluster" },
      { text: "noTLSVerify: true",           explanation: "skips certificate validation for the internal connection — safe since traffic never leaves the cluster" }
    ],
    example: "configmap/cloudflared-config created",
    why: "This is the alternative to the Traefik Ingress approach: cloudflared runs as a pod inside k3s and routes straight to the dashboard service. Simpler, but you lose Traefik's middleware features (rate limiting, auth headers, etc.)."
  },
  {
    id: 36, section: "production", sectionTitle: "Production Ready",
    command: "kubectl get pods -n kubernetes-dashboard && kubectl get ingress -n kubernetes-dashboard",
    searchTerms: "kubectl get pods ingress dashboard verify check",
    description: "Verifies the full setup: checks all dashboard pods are Running, and confirms the Ingress rule is active with the correct host assigned.",
    parts: [
      { text: "kubectl get pods -n kubernetes-dashboard",   explanation: "lists all pods in the dashboard namespace — all should show Running" },
      { text: "&&",                                          explanation: "run the second command only if the first exits cleanly" },
      { text: "kubectl get ingress -n kubernetes-dashboard", explanation: "shows the Ingress rule and confirms the hostname is correctly registered with Traefik" }
    ],
    example: "NAME                                    READY   STATUS    RESTARTS\nkubernetes-dashboard-kong-...           1/1     Running   0\nkubernetes-dashboard-web-...            1/1     Running   0\n\nNAME                            CLASS     HOSTS                      ADDRESS\nkubernetes-dashboard-ingress    traefik   dashboard.your-domain.com  192.168.x.x",
    why: "If pods aren't Running or the Ingress ADDRESS is empty, something is wrong before you even open the browser. Fix here first, not after debugging Cloudflare."
  }
];

// Derive unique sections preserving order
const sectionOrder = [];
const seenSections = {};
commandData.forEach(cmd => {
  if (!seenSections[cmd.section]) {
    seenSections[cmd.section] = true;
    sectionOrder.push({ id: cmd.section, title: cmd.sectionTitle });
  }
});

// ─── RENDER ──────────────────────────────────────────────────────────────────
const commandList   = document.getElementById('commandList');
const searchInput   = document.getElementById('searchInput');
const filterControls = document.getElementById('filterControls');
const noResults     = document.getElementById('noResults');

let activeFilter = 'all';

// Build filter buttons
const allBtn = makeFilterBtn('All', 'all', true);
filterControls.appendChild(allBtn);
sectionOrder.forEach(sec => filterControls.appendChild(makeFilterBtn(sec.title, sec.id, false)));

function makeFilterBtn(label, value, isActive) {
  const btn = document.createElement('button');
  btn.className = 'btn btn-sm btn-outline-secondary rounded-pill filter-btn' + (isActive ? ' active' : '');
  btn.textContent = label;
  btn.dataset.filter = value;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = value;
    render();
  });
  return btn;
}

function render() {
  const query = searchInput.value.toLowerCase().trim();
  commandList.innerHTML = '';
  let totalShown = 0;
  let renderedSectionCount = 0;

  sectionOrder.forEach((sec) => {
    // Commands must belong to THIS section AND match filter AND match search
    const cmds = commandData.filter(cmd => {
      const inThisSection = cmd.section === sec.id;
      const matchFilter   = activeFilter === 'all' || cmd.section === activeFilter;
      const matchSearch   = !query ||
        cmd.command.toLowerCase().includes(query) ||
        cmd.searchTerms.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query);
      return inThisSection && matchFilter && matchSearch;
    });

    if (cmds.length === 0) return;
    totalShown += cmds.length;
    renderedSectionCount++;

    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'mb-4';
    sectionDiv.innerHTML = `
      <h5 class="fw-semibold mb-3 d-flex align-items-center gap-2">
        <span class="section-badge">${renderedSectionCount}</span>
        ${sec.title}
      </h5>
    `;

    // Accordion per section
    const accordionId = `acc-${sec.id}`;
    const accordion = document.createElement('div');
    accordion.className = 'accordion shadow-sm';
    accordion.id = accordionId;

    cmds.forEach((cmd, i) => {
      const itemId   = `item-${cmd.id}`;
      const collapseId = `collapse-${cmd.id}`;

      const partsHtml = cmd.parts.map(p =>
        `<span class="command-part">${p.text}</span>`
      ).join(' ');

      const breakdownHtml = cmd.parts.map(p =>
        `<li><code>${p.text}</code> — ${p.explanation}</li>`
      ).join('');

      accordion.innerHTML += `
        <div class="accordion-item border" id="${itemId}">
          <h2 class="accordion-header">
            <button class="accordion-button collapsed" type="button"
              data-bs-toggle="collapse" data-bs-target="#${collapseId}"
              aria-expanded="false" aria-controls="${collapseId}">
              ${cmd.command}
            </button>
          </h2>
          <div id="${collapseId}" class="accordion-collapse collapse"
            data-bs-parent="">
            <div class="accordion-body pt-0">
              <hr class="mt-0" />

              <div class="mb-3">
                <div class="detail-label">What it does</div>
                <div>${cmd.description}</div>
              </div>

              <div class="mb-3">
                <div class="detail-label">Breaking it down</div>
                <div class="mb-2">${partsHtml}</div>
                <ul class="list-unstyled small text-secondary ps-1 mb-0">
                  ${breakdownHtml}
                </ul>
              </div>

              <div class="mb-3">
                <div class="detail-label">Example output</div>
                <div class="example-box">${cmd.example}</div>
              </div>

              <div class="why-box">
                💡 <strong>Why:</strong> ${cmd.why}
              </div>
            </div>
          </div>
        </div>
      `;
    });

    sectionDiv.appendChild(accordion);
    commandList.appendChild(sectionDiv);
  });

  noResults.style.display = totalShown === 0 ? 'block' : 'none';
}

searchInput.addEventListener('input', render);

// Initial render
render();