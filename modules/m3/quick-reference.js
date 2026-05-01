window.commandData = [

  // ── kubectl Quick Reference ────────────────────────────────
  {
    id: 700, section: "quickref", sectionTitle: "kubectl Quick Reference",
    commandTitle: "Pod Management Essentials",
    command: "kubectl get pods\nkubectl describe pod <name>\nkubectl logs <pod>\nkubectl exec -it <pod> -- /bin/sh\nkubectl delete pod <name>",
    searchTerms: "kubectl get pods describe logs exec delete sh shell management",
    description: "The five commands you'll use in 90% of debugging sessions: list, inspect, read logs, shell in, and delete (which forces a fresh pod from the Deployment).",
    parts: [
      { text: "kubectl get pods",              explanation: "lists pods in the current namespace with STATUS and RESTARTS count" },
      { text: "kubectl describe pod <name>",   explanation: "full detail: events, resource limits, volume mounts, liveness probe results" },
      { text: "kubectl logs <pod>",            explanation: "stdout/stderr from the container's process" },
      { text: "kubectl exec -it <pod> -- /bin/sh", explanation: "interactive shell inside the container — use /bin/sh not /bin/bash in Alpine images" },
      { text: "kubectl delete pod <name>",     explanation: "forces a pod restart; the Deployment controller creates a replacement immediately" }
    ],
    example: "# List only pods with issues:\nkubectl get pods -A | grep -v Running | grep -v Completed\n\n# Shell into postgres pod:\nkubectl exec -it $(kubectl get pod -l app=postgres -o jsonpath='{.items[0].metadata.name}') -- /bin/sh\n\n# Force restart a deployment (delete all its pods):\nkubectl rollout restart deployment/node-api",
    why: "kubectl delete pod is a safe way to force-restart a misbehaving pod — the Deployment immediately creates a replacement. It doesn't delete the Deployment or Service."
  },

  {
    id: 701, section: "quickref", sectionTitle: "kubectl Quick Reference",
    commandTitle: "Deployment Management",
    command: "kubectl get deployments\nkubectl scale deployment <name> --replicas=2\nkubectl set image deployment/<name> app=image:tag\nkubectl rollout status deployment/<name>\nkubectl rollout undo deployment/<name>",
    searchTerms: "kubectl deployment scale set image rollout status undo restart",
    description: "Core deployment lifecycle commands — list, scale, update image, watch rollout progress, and roll back if something goes wrong.",
    parts: [
      { text: "kubectl scale deployment <name> --replicas=2", explanation: "scales to 2 pods; set to 0 to pause an app without deleting it" },
      { text: "kubectl set image deployment/<name> app=image:tag", explanation: "triggers a rolling update to the new image; format is container-name=image:tag" },
      { text: "kubectl rollout status",                           explanation: "watches the rollout until all pods are on the new version" },
      { text: "kubectl rollout undo",                             explanation: "reverts to the previous Deployment revision — your escape hatch" }
    ],
    example: "# Scale down to free RAM during development:\nkubectl scale deployment nginx-welcome --replicas=0\n\n# Update Node.js app to new image:\nkubectl set image deployment/node-api node-api=myapp:v2.0\nkubectl rollout status deployment/node-api\n\n# Something broke — roll back:\nkubectl rollout undo deployment/node-api\nkubectl rollout status deployment/node-api",
    why: "rollout undo is critical on a Pi where you can't easily spin up a second environment to test. Always have an undo path before updating a production deployment."
  },

  {
    id: 702, section: "quickref", sectionTitle: "kubectl Quick Reference",
    commandTitle: "Service & Ingress Inspection",
    command: "kubectl get svc\nkubectl get ingress -A\nkubectl describe ingress <name>",
    searchTerms: "kubectl get svc service ingress describe list networking",
    description: "Inspect the networking layer — which services exist, what their cluster IPs are, and what Ingress rules Traefik is reading.",
    parts: [
      { text: "kubectl get svc",            explanation: "lists Services with their ClusterIP and port mappings" },
      { text: "kubectl get ingress -A",     explanation: "lists all Ingress rules across namespaces with hostnames and backend addresses" },
      { text: "kubectl describe ingress",   explanation: "shows the full Ingress spec and Events — Events show if Traefik found the backend Service" }
    ],
    example: "# Check if your node-api service has an endpoint:\nkubectl get endpoints node-api\n# NAME       ENDPOINTS\n# node-api   10.42.0.15:3000   ← healthy pod endpoint\n# node-api   <none>            ← no pod matched the selector\n\n# Quick network debug:\nkubectl get svc,ingress,endpoints -l app=node-api",
    why: "An empty ENDPOINTS column means the Service selector doesn't match any pod labels. This is a common cause of 503 errors — the Service exists but has no pods to route to."
  },

  {
    id: 703, section: "quickref", sectionTitle: "kubectl Quick Reference",
    commandTitle: "Resource Monitoring",
    command: "kubectl top nodes\nkubectl top pods -A",
    searchTerms: "kubectl top nodes pods cpu memory resource monitoring usage",
    description: "Real-time CPU and memory consumption for the Pi node and all pods. Essential for keeping the Pi 5 healthy under load.",
    parts: [
      { text: "kubectl top nodes",    explanation: "shows total CPU/memory consumed on the Pi node, and the % of allocatable capacity used" },
      { text: "kubectl top pods -A",  explanation: "per-pod breakdown — spot which pod is consuming disproportionate resources" }
    ],
    example: "kubectl top nodes\n# NAME   CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%\n# pi5    312m         7%     1842Mi          22%\n\nkubectl top pods -A\n# NAMESPACE   NAME            CPU     MEMORY\n# default     postgres-...    22m     134Mi\n# default     node-api-...    12m     85Mi\n\n# If metrics-server isn't installed:\nkubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml",
    why: "kubectl top requires the metrics-server to be running. K3s includes it by default, but if top returns 'Metrics API not available', deploy it from the URL in the example."
  },

  {
    id: 704, section: "quickref", sectionTitle: "kubectl Quick Reference",
    commandTitle: "Cluster Events & Node Debugging",
    command: "kubectl get events -A --sort-by='.lastTimestamp'\nkubectl describe node",
    searchTerms: "kubectl events debug node describe sort timestamp cluster problems",
    description: "Events show what's happened across the cluster sorted by time — OOMKills, pull failures, scheduling failures all appear here. Node describe shows hardware capacity and conditions.",
    parts: [
      { text: "kubectl get events -A",                explanation: "lists all cluster events across namespaces" },
      { text: "--sort-by='.lastTimestamp'",            explanation: "sorts newest events last so you can see the most recent issues at the bottom" },
      { text: "kubectl describe node",                 explanation: "shows Pi hardware info, allocatable resources, running pods, and node conditions" }
    ],
    example: "# Filter for only warnings:\nkubectl get events -A --sort-by='.lastTimestamp' --field-selector=type=Warning\n\n# See what's scheduled on the node:\nkubectl describe node | grep -A 20 'Non-terminated Pods'\n\n# Common warning events:\n# OOMKilling       → a pod exceeded its memory limit\n# FailedScheduling → not enough CPU/RAM to place a pod\n# BackOff          → container crash loop",
    why: "Events expire after ~1 hour by default. If a pod crashed and you missed it, check Events before the window closes — they often contain the root cause that logs don't show."
  },

  {
    id: 705, section: "quickref", sectionTitle: "kubectl Quick Reference",
    commandTitle: "Non-Root kubectl Access",
    command: "mkdir -p ~/.kube && sudo k3s kubectl config view --raw | sudo tee ~/.kube/config > /dev/null && sudo chown $(id -u):$(id -g) ~/.kube/config && sudo chmod 600 ~/.kube/config",
    searchTerms: "kubeconfig non-root sudo kubectl access config view raw kube",
    description: "One-time setup: copies the k3s admin kubeconfig to your user's ~/.kube/config so you can run all kubectl commands without sudo.",
    parts: [
      { text: "k3s kubectl config view --raw", explanation: "outputs the full kubeconfig including embedded TLS certificates (not paths to files)" },
      { text: "tee ~/.kube/config",            explanation: "writes it to the standard kubectl config path" },
      { text: "chmod 600",                     explanation: "kubectl refuses to load configs that are group- or world-readable — this is a required permission" }
    ],
    example: "# Verify it worked:\nkubectl get nodes\n# NAME   STATUS   ROLES                  AGE   VERSION\n# pi5    Ready    control-plane,master   5d    v1.29.x+k3s1\n\n# If you get 'permission denied' on the config file itself:\nls -la ~/.kube/config\n# Should show: -rw------- 1 pi pi",
    why: "Every kubectl command with sudo runs as root and writes root-owned files to your home directory. This one-time step prevents permission headaches across all future sessions."
  }
];