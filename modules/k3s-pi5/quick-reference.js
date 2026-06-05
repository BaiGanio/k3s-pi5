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
    commandTitle: "Service & Endpoint Inspection",
    command: "kubectl get svc,endpoints -A",
    searchTerms: "kubectl get svc endpoints service list all namespaces clusterip",
    description: "Lists every Service and its resolved Endpoints across all namespaces. An Endpoint with no addresses means the label selector isn't matching any running pods.",
    parts: [
      { text: "kubectl get svc,endpoints", explanation: "comma-separated resource types — queries both at once" },
      { text: "-A",                         explanation: "across all namespaces" }
    ],
    example: "NAMESPACE   NAME          TYPE        CLUSTER-IP     PORT(S)\ndefault     node-api      ClusterIP   10.43.200.10   80/TCP\ndefault     postgres      ClusterIP   10.43.100.5    5432/TCP\n\nNAMESPACE   NAME          ENDPOINTS\ndefault     node-api      10.42.0.15:3000\ndefault     postgres      10.42.0.10:5432",
    why: "If ENDPOINTS is empty for a service, the Service's label selector doesn't match any running pod. Check pod labels with 'kubectl get pods --show-labels'."
  },

  {
    id: 703, section: "quickref", sectionTitle: "kubectl Quick Reference",
    commandTitle: "ConfigMap & Secret Management",
    command: "kubectl get configmap,secret\nkubectl create configmap <name> --from-literal=key=value\nkubectl create secret generic <name> --from-literal=key=value",
    searchTerms: "configmap secret kubectl create from-literal env vars",
    description: "Lists and creates ConfigMaps and Secrets. These inject environment variables into pods — use ConfigMaps for non-sensitive data, Secrets for passwords.",
    parts: [
      { text: "kubectl get configmap,secret", explanation: "lists both resource types in the current namespace" },
      { text: "--from-literal=key=value",      explanation: "creates a single key-value pair directly from the command line" }
    ],
    example: "# View ConfigMap data (decoded):\nkubectl get configmap postgres-config -o yaml\n\n# View Secret data (base64 decoded):\nkubectl get secret postgres-secret -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d",
    why: "Secrets are base64-encoded at rest, not encrypted. Never commit Secret YAML to git — use 'kubectl create secret' from the command line instead."
  },

  {
    id: 704, section: "quickref", sectionTitle: "kubectl Quick Reference",
    commandTitle: "Namespace Operations",
    command: "kubectl get ns\nkubectl create ns <name>\nkubectl config set-context --current --namespace=<name>",
    searchTerms: "kubectl namespace get create set-context default",
    description: "Namespace basics — list, create, and switch your default namespace. Switching saves you from adding -n to every command.",
    parts: [
      { text: "kubectl get ns",        explanation: "lists all namespaces with their status and age" },
      { text: "kubectl create ns",     explanation: "creates a new namespace for isolating workloads" },
      { text: "kubectl config set-context", explanation: "switches your default namespace for all subsequent commands" }
    ],
    example: "# Switch to a namespace:\nkubectl config set-context --current --namespace=staging\n\n# Switch back to default:\nkubectl config set-context --current --namespace=default\n\n# View all namespaces:\nkubectl get ns",
    why: "Use namespaces to separate staging from production on a single Pi. It's the cheapest form of environment isolation without spinning up a second cluster."
  },

  {
    id: 800, section: "quickref", sectionTitle: "kubectl Quick Reference",
    commandTitle: "Fix kubectl Permission Issues",
    command: "sudo chown -R $USER:$USER ~/.kube",
    searchTerms: "kubectl permission denied sudo chown fix",
    description: "Fixes 'Permission denied' errors when kubectl was run with sudo. K3s's kubeconfig is root-owned by default; this gives your user ownership of your local kubeconfig.",
    parts: [
      { text: "sudo chown -R $USER:$USER", explanation: "recursively changes file ownership to the current user" },
      { text: "~/.kube",                    explanation: "the directory where kubeconfig files live" }
    ],
    example: "# Before fix:\n$ kubectl get nodes\nError: loading config file ~/.kube/config: permission denied\n\n# After fix:\n$ kubectl get nodes\nNAME       STATUS   ROLES    AGE\npi5-k3s    Ready    master   24h",
    why: "Every kubectl command with sudo runs as root and writes root-owned files to your home directory. This one-time step prevents permission headaches across all future sessions."
  },

  {
    id: 801, section: "quickref", sectionTitle: "kubectl Quick Reference",
    commandTitle: "Scale a Deployment",
    command: "kubectl scale deployment node-api --replicas=2",
    searchTerms: "scale deployment replicas up down kubectl",
    description: "Instantly scales a Deployment to the specified number of pod replicas. Set to 0 to pause an app without deleting it.",
    parts: [
      { text: "kubectl scale deployment", explanation: "changes the desired replica count for a Deployment" },
      { text: "node-api",                 explanation: "the name of the Deployment to scale" },
      { text: "--replicas=2",             explanation: "the new desired number of running pods" }
    ],
    example: "deployment.apps/node-api scaled\n\n# Verify:\nkubectl get pods -l app=node-api\n# NAME             READY   STATUS\n# node-api-abc12   1/1     Running\n# node-api-def34   1/1     Running",
    why: "On the Pi 5, more than 2 replicas of a Node.js app will start competing for RAM. Scale up for load testing, scale to 0 to free resources."
  },
  {
    id: 802, section: "quickref", sectionTitle: "kubectl Quick Reference",
    commandTitle: "Shell Into a Running Pod",
    command: "kubectl exec -it <pod-name> -- /bin/sh",
    searchTerms: "exec shell sh bash interactive pod debug kubectl",
    description: "Opens an interactive shell inside a running container. Essential for debugging — check environment variables, test DB connectivity, inspect the filesystem.",
    parts: [
      { text: "kubectl exec -it", explanation: "executes a command interactively (-i) with a TTY (-t)" },
      { text: "<pod-name>",       explanation: "get the name from 'kubectl get pods'" },
      { text: "-- /bin/sh",       explanation: "the command to run — /bin/sh works in Alpine images (/bin/bash won't)" }
    ],
    example: "# Inside the node-api pod:\nenv | grep DB           # check DB env vars are injected\nwget -qO- http://postgres:5432  # test postgres service DNS\nnode -e \"console.log(process.env.DATABASE_URL)\"",
    why: "Environment variables visible inside the pod may differ from what you expect — this is the definitive way to confirm your ConfigMap and Secret are mounted correctly."
  },
  {
    id: 803, section: "quickref", sectionTitle: "kubectl Quick Reference",
    commandTitle: "Rolling Update — Change Image",
    command: "kubectl set image deployment/node-api node-api=node:20-alpine",
    searchTerms: "set image deployment rolling update rollout kubectl",
    description: "Updates the container image for a Deployment. K3s performs a rolling update — starts new pods before terminating old ones, so there's no downtime.",
    parts: [
      { text: "kubectl set image",        explanation: "updates the image field in the Deployment spec" },
      { text: "deployment/node-api",      explanation: "the Deployment to update" },
      { text: "node-api=node:20-alpine",  explanation: "container-name=new-image-tag format" }
    ],
    example: "deployment.apps/node-api image updated\n\n# Watch the rollout:\nkubectl rollout status deployment/node-api\n# Waiting for rollout to finish: 1 old replicas are pending termination\n# deployment \"node-api\" successfully rolled out\n\n# Roll back if something went wrong:\nkubectl rollout undo deployment/node-api",
    why: "rollout undo is your escape hatch. Always verify the new image works in a test namespace before updating production."
  }
];
