# 🏗️ Homelab DevOps Platform — Career-Ready Project Guide

> **Hardware:** MacBook M1 32GB · Raspberry Pi 5 8GB + 500GB SSD · Asus X540S 4GB + 1TB HDD (worker node + MinIO storage + kiosk display)

---

## Why Such Project?

Most DevOps job listings require hands-on experience with Kubernetes, IaC, CI/CD pipelines, and observability. Cloud certifications help, but a **live, running homelab** that can be used in an interview is a genuine differentiator. It is not  just to pass a test — but to built something real.

---

## Hardware Roles

| Machine | Role | Rationale |
|---|---|---|
| **MacBook M1 32GB** | Dev workstation + control access | `kubectl`, Terraform, code, Docker builds |
| **Raspberry Pi 5 8GB + SSD** | Kubernetes master node + core services | Fast SSD + sufficient RAM makes it a solid k3s control plane; hosts CI/CD, ArgoCD, Prometheus/Grafana |
| **Asus X540S 4GB + HDD** | k3s worker node + MinIO storage + Grafana kiosk display | 1TB HDD ideal for bulk object storage; lightweight enough to run a kiosk browser alongside workloads |

### Asus X540S — Triple Role Explained

The Asus pulls triple duty without meaningful resource conflict:

- **k3s worker node** — runs your application pods (the actual workloads)
- **MinIO object storage** — runs as a standalone systemd service, not inside k3s; uses the 1TB HDD for bulk file/image storage
- **Grafana kiosk display** — a Chromium browser in full-screen kiosk mode pointed at Grafana, auto-launched on boot via a lightweight desktop environment (Ubuntu MATE or Lubuntu)

The browser consumes ~300–500MB RAM at most, MinIO is minimal when idle, and the k3s agent itself is lightweight. On 4GB RAM this is manageable as long as you don't schedule heavy workloads on this node — use Kubernetes node labels to direct memory-intensive pods to stay on the Pi.

---

## The Core Stack

### 1. Kubernetes (k3s)
**Why it matters:** Kubernetes is the de facto standard for container orchestration. Every major company — from startups to enterprises — runs some flavour of it. Knowing how to deploy, troubleshoot, and operate a cluster is a baseline expectation for DevOps engineers in 2025+.

**What you'll learn:** Pods, Deployments, Services, Ingress, ConfigMaps, Secrets, Namespaces, RBAC, Persistent Volumes, Helm charts.

**k3s specifically:** Lightweight Kubernetes, perfect for homelab. Functionally identical to full K8s for learning purposes — same API, same `kubectl`, same manifests. Runs comfortably on Raspberry Pi.

**Getting started:**
```bash
# On the Pi (master)
curl -sfL https://get.k3s.io | sh -

# On the Asus (worker) — use token from /var/lib/rancher/k3s/server/token on Pi
curl -sfL https://get.k3s.io | K3S_URL=https://<pi-ip>:6443 K3S_TOKEN=<token> sh -

# On your Mac — copy kubeconfig from Pi and set KUBECONFIG
kubectl get nodes
```

---

### 2. Infrastructure as Code — Terraform + Ansible
**Why it matters:** No serious DevOps role lets you click through a UI to provision infrastructure. IaC is non-negotiable. Hiring managers want to see that you treat infrastructure like code — versioned, reviewable, repeatable.

**Terraform:** Declarative provisioning. You describe *what* you want, Terraform figures out *how* to create it. You already know Azure — write Terraform for your Azure resources instead of using the portal. This maps perfectly to your existing cloud experience.

**Ansible:** Imperative configuration management. Use it to configure your Pi and Asus nodes — install packages, set up users, harden SSH, deploy k3s. Think of it as "scripting, but structured and idempotent."

**What to do:**
- Write Terraform to provision Azure resources (App Service, SQL, Storage) that your apps use — even if small, having `.tf` files in your GitHub shows IaC fluency
- Write Ansible playbooks to bootstrap your Pi and Asus from scratch (so rebuilding the cluster is a single command)

```hcl
# Example: Terraform Azure resource group
resource "azurerm_resource_group" "homelab" {
  name     = "homelab-rg"
  location = "West Europe"
}
```

---

### 3. CI/CD Pipeline — Gitea + Woodpecker CI (or Jenkins)
**Why it matters:** Continuous Integration and Delivery is the heartbeat of modern software delivery. You've used Azure DevOps pipelines — now run your own. Understanding how CI/CD systems work under the hood makes you a much better consumer of managed ones.

**Gitea:** Self-hosted GitHub alternative. Lightweight, runs on your cluster. You push code here and it triggers pipelines — same workflow as GitHub Actions or Azure DevOps.

**Woodpecker CI:** Lightweight CI system that integrates natively with Gitea. Pipeline-as-code via YAML. If you prefer something more enterprise-feeling, Jenkins is a solid alternative with massive industry adoption.

**What to build:**
- Push .NET API code → Woodpecker builds Docker image → pushes to local container registry → deploys to k3s
- Push Angular app → build → Nginx container → deploy

```yaml
# .woodpecker.yml example
steps:
  - name: build
    image: mcr.microsoft.com/dotnet/sdk:8.0
    commands:
      - dotnet restore
      - dotnet build
      - dotnet publish -o out

  - name: docker
    image: plugins/docker
    settings:
      repo: registry.homelab.local/myapp
      tags: latest
```

---

### 4. GitOps — ArgoCD
**Why it matters:** GitOps is the modern approach to Kubernetes deployments. Instead of running `kubectl apply` manually or in a pipeline, a GitOps tool watches your Git repo and syncs the cluster state to match. It's increasingly the standard at cloud-native companies.

**ArgoCD:** The most widely adopted GitOps tool. Runs inside your cluster, watches a Git repo, and applies changes automatically when you merge. Every change is auditable via Git history — a huge win for compliance and debugging.

**What to build:**
- Store all your Kubernetes manifests in a Git repo
- ArgoCD watches the repo and syncs the cluster
- Merging a PR to `main` is your deployment mechanism

This is a discipline shift from "run a pipeline that deploys" to "the cluster reconciles itself toward the desired state in Git." Knowing this distinction impresses senior interviewers.

---

### 5. Observability — Prometheus + Grafana + Loki
**Why it matters:** You can't operate what you can't see. Observability (metrics, logs, traces) is a core DevOps responsibility. Companies expect engineers to own dashboards, set up alerting, and debug production issues using observability tools — not just write deployment YAML.

**Prometheus:** Time-series metrics database. Scrapes metrics from your cluster, nodes, and apps. Stores them and makes them queryable via PromQL.

**Grafana:** Visualisation layer. Connect it to Prometheus and Loki, build dashboards for cluster health, app latency, error rates. The standard industry dashboard tool.

**Loki:** Log aggregation, built by Grafana Labs. Think of it as lightweight Elasticsearch — aggregates logs from all your pods so you can query them from Grafana.

**What to build:**
- Deploy the `kube-prometheus-stack` Helm chart (Prometheus + Grafana bundled)
- Add Loki + Promtail for logs
- Build a Grafana dashboard showing: node CPU/RAM, pod health, HTTP request rate and error rate from your apps
- Set up an alert (email or Slack webhook) when a pod crashes

---

### 6. Container Registry — Harbor
**Why it matters:** You need somewhere to push your Docker images that isn't Docker Hub. Harbor is an enterprise-grade, self-hosted container registry with image scanning, access control, and replication. Running one shows you understand the full container supply chain.

Deploy Harbor on your cluster, push images from your CI pipeline to it, pull from it during deployments.

---

### 7. Secrets Management — Vault (HashiCorp)
**Why it matters:** Hard-coded secrets in environment variables or k8s Secrets (which are just base64-encoded) is a common security antipattern. Vault is the industry standard for secrets management. Knowing it is a genuine differentiator at the senior level.

**What to do:** Store your database passwords, API keys, and connection strings in Vault. Configure your .NET apps to fetch secrets at startup via the Vault API or sidecar injection.

---

### 8. Object Storage — MinIO
**Why it matters:** Every real application handles files — user avatars, document uploads, exported reports, backups. In production these go to S3 or Azure Blob Storage. MinIO is a self-hosted, fully S3-compatible object store. Running it means your apps can use the exact same SDK and patterns they'd use against AWS S3 or Azure Blob, just pointed at your local endpoint. It's also widely used in enterprise on-prem environments, so knowing it is a direct resume skill.

**Why the Asus HDD is perfect for this:** The Pi's SSD should stay fast for cluster operations. The Asus's 1TB HDD is ideal for bulk storage — large files, image libraries, backups. MinIO runs as a standalone `systemd` service on the Asus, completely outside of k3s, so it doesn't compete with pod scheduling.

**Setup:**
```bash
# On the Asus — install MinIO
wget https://dl.min.io/server/minio/release/linux-amd64/minio -O /usr/local/bin/minio
chmod +x /usr/local/bin/minio

# /etc/systemd/system/minio.service
[Unit]
Description=MinIO Object Storage
After=network.target

[Service]
Environment=MINIO_ROOT_USER=admin
Environment=MINIO_ROOT_PASSWORD=changeme
ExecStart=/usr/local/bin/minio server /mnt/storage --console-address ":9001"
Restart=always

[Install]
WantedBy=multi-user.target
```

**Accessing from .NET — uses the standard AWSSDK.S3, same code works against real AWS S3:**
```csharp
var config = new AmazonS3Config
{
    ServiceURL = "http://<asus-ip>:9000",
    ForcePathStyle = true
};
var client = new AmazonS3Client("accessKey", "secretKey", config);

await client.PutObjectAsync(new PutObjectRequest
{
    BucketName = "app-uploads",
    Key = "images/profile-123.jpg",
    FilePath = localFilePath
});
```

**Nginx image CDN layer:** Add Nginx in front of MinIO on the Asus as a caching reverse proxy. Image requests hit Nginx first (served from cache), only reaching MinIO on a cache miss. This mirrors a real CDN-backed storage architecture and is worth including in your architecture diagram.

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=minio_cache:10m max_size=5g;

server {
    listen 80;
    server_name storage.homelab.local;

    location / {
        proxy_cache minio_cache;
        proxy_cache_valid 200 7d;
        proxy_pass http://localhost:9000;
    }
}
```

**MinIO Console** (port 9001) gives you a web UI to browse buckets, manage access keys, and monitor storage — handy for demos.

---

### 9. Real-Time Dashboard Kiosk — Asus as a Live Ops Screen
**Why it matters:** A live ops screen is genuinely impressive in an interview — especially a video call where a monitor in the background shows real metrics from your running cluster. It also reflects how real NOC (Network Operations Centre) and platform teams operate: always-on visibility boards showing the health of the systems they own.

**How it works:** Install a minimal desktop environment on the Asus, configure it to auto-login, and launch Chromium in full-screen kiosk mode on boot, pointed at your Grafana instance running on the Pi.

**Setup:**
```bash
# Install lightweight desktop + Chromium on the Asus
sudo apt install --no-install-recommends lubuntu-desktop chromium-browser

# /etc/xdg/autostart/kiosk.desktop
[Desktop Entry]
Type=Application
Name=Grafana Kiosk
Exec=chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  http://<pi-ip>:3000/d/<dashboard-uid>?kiosk=tv
```

**Grafana playlist feature:** Rather than showing a single dashboard, create a Grafana Playlist — a rotating sequence of dashboards on a configurable timer (e.g. every 30 seconds). All built into Grafana, no extra tooling.

**Useful dashboards to rotate through:**
- Kubernetes cluster overview (node CPU, RAM, pod count)
- Application HTTP metrics (request rate, error rate, latency P95)
- MinIO storage usage and request throughput
- CI/CD pipeline activity (Woodpecker job status)
- Loki log stream for errors across all pods

**Resource management — keep the Asus healthy:** Chromium in kiosk mode uses ~300–500MB RAM. Combined with the k3s agent and MinIO at idle, the Asus stays comfortably under 4GB. Use Kubernetes node labels to steer heavy workloads away from this node:

```bash
# Label nodes to control scheduling
kubectl label node asus-node  role=storage-display
kubectl label node pi-node    role=compute

# In heavy pod specs, target the Pi
nodeSelector:
  role: compute
```

---

## Example Applications to Build

These leverage your existing .NET / Angular / SQL / NoSQL expertise and give you deployable projects that demonstrate the full pipeline:

---

### App 1: Personal Finance Tracker
**Stack:** .NET 8 Web API · Angular 17 · PostgreSQL · Redis (caching) · MinIO (receipt image uploads) · deployed on k3s

**Why build it:** Simple CRUD app, but with a real architecture. Demonstrates you can containerize a multi-tier .NET application, manage a database in Kubernetes with persistent storage, cache with Redis, and handle file uploads to your self-hosted object store.

**DevOps angle:**
- Full CI/CD: code push → build → test → push image → ArgoCD syncs → live
- Receipt/document images stored in MinIO, served via Nginx CDN cache layer
- Terraform provisions an Azure SQL instance as an alternative backend
- Grafana dashboard shows API request rates, DB query times, MinIO storage growth

---

### App 2: Distributed Task Queue System
**Stack:** .NET 8 Worker Services · RabbitMQ or Azure Service Bus · MongoDB · Angular dashboard

**Why build it:** Worker services and message queues are everywhere in enterprise .NET. This shows you understand async processing, horizontal scaling, and distributed systems — all very relevant to DevOps/SRE roles.

**DevOps angle:**
- Scale worker pods based on queue depth (KEDA — Kubernetes Event-Driven Autoscaling)
- Dead-letter queue monitoring in Grafana
- Chaos engineering: kill a worker pod and watch the system recover

---

### App 3: Multi-Environment Deployment Platform (the "meta" project)
**Stack:** ArgoCD · Helm · Terraform · your own apps

**Why build it:** This is the DevOps project itself — a system that deploys other systems. Manage `dev`, `staging`, and `prod` namespaces on your cluster with environment-specific configs via Helm values files.

**DevOps angle:**
- Promote a release from dev → staging → prod via a Git PR merge
- Use Terraform workspaces for environment separation
- Document the whole thing with Architecture Decision Records (ADRs) in the repo

---

### App 4: .NET Microservices with Service Mesh
**Stack:** 2–3 .NET 8 microservices · Linkerd (service mesh) · gRPC · Angular BFF

**Why build it:** Microservices and service meshes (Istio/Linkerd) are common at scale. With your experience you can build meaningful services (not just "hello world") and focus the learning on the operational side — traffic management, mTLS, observability between services.

**DevOps angle:**
- Linkerd provides automatic mTLS between services
- Traffic splitting: route 10% of requests to a new version (canary deployment)
- Per-route latency and success rate in Grafana

---

## Leveraging Your Existing Skills

| Your Skill | How It Maps to DevOps |
|---|---|
| **Azure DevOps** | Compare pipelines to your self-hosted Woodpecker CI — articulate tradeoffs in interviews |
| **Azure Cloud** | Write Terraform for Azure resources; deploy apps that span homelab + Azure (hybrid) |
| **Google Cloud Platform** | Add GCP as a second Terraform provider; show multi-cloud IaC |
| **GitHub** | Use GitHub Actions as your CI for open-source projects; homelab Gitea for private |
| **.NET** | Write production-quality apps — your code quality will be far above typical DevOps demo apps |
| **Angular** | Full-stack demos with real frontends look much more impressive than backend-only |
| **SQL + NoSQL** | Deploy PostgreSQL and MongoDB on k3s with proper persistent volumes and backup jobs |

---

## Recommended Build Order

```
Week 1–2:   k3s cluster (Pi master + Asus worker) — verify with kubectl get nodes
Week 3:     MinIO on Asus + Nginx CDN cache — upload a test file from .NET
Week 4:     Grafana kiosk display on Asus — Chromium auto-launches on boot
Week 5:     Gitea + container registry (Harbor) — push your first image
Week 6:     CI pipeline (Woodpecker) — automated build on every commit
Week 7–8:   Observability (Prometheus + Grafana + Loki) — dashboards on the kiosk
Week 9:     ArgoCD — GitOps deployments working
Week 10:    Deploy App 1 end-to-end through the full pipeline, images in MinIO
Week 11+:   Terraform IaC, Vault, App 2 or 3, refine and document
```

---

## What to Put on Your Resume / GitHub

- **GitHub repo** with a well-written README, architecture diagram, and setup docs
- **Grafana screenshots** in the README showing real dashboards
- **Terraform code** — even small, it signals IaC fluency
- **ArgoCD app manifests** — shows GitOps understanding
- **A brief writeup** (even a README section) of decisions made and tradeoffs — this is what senior interviewers ask about

---

## Tools Reference Summary

| Tool | Category | Why It's Relevant |
|---|---|---|
| k3s | Orchestration | Industry-standard Kubernetes, lightweight for homelab |
| Helm | Package Manager | Kubernetes app packaging standard |
| ArgoCD | GitOps | CD standard at cloud-native companies |
| Terraform | IaC | Universal provisioning tool, every cloud supports it |
| Ansible | Config Mgmt | Node configuration, widely used alongside Terraform |
| Gitea | Source Control | Self-hosted Git, understand SCM internals |
| Woodpecker CI | CI/CD | Lightweight, pipeline-as-code |
| Harbor | Registry | Enterprise container registry |
| Prometheus | Metrics | Time-series DB, k8s monitoring standard |
| Grafana | Dashboards | Visualisation standard across the industry |
| Loki | Logging | Lightweight log aggregation |
| Vault | Secrets | Enterprise secrets management |
| MinIO | Object Storage | S3-compatible self-hosted blob storage; same SDK as AWS S3 |
| Nginx | Reverse Proxy / CDN | Caching layer in front of MinIO; mirrors CDN-backed storage patterns |
| KEDA | Autoscaling | Event-driven pod scaling |
| Linkerd | Service Mesh | mTLS, traffic management, observability |

---

*Built on your own hardware. Owned end-to-end. That's the point.*