# 👉 [https://baiganio.github.io/k3s-pi5](https://baiganio.github.io/k3s-pi5/)

---

# K3s on Raspberry Pi 5: Complete Setup Guide

**Target Setup:** Raspberry Pi 5 (8GB) running Raspberry Pi OS with k3s, Cloudflare Tunnel, and containerized applications.

---

## Table of Contents

1. [Pre-Flight Checks](#pre-flight-checks)
2. [System Preparation](#system-preparation)
3. [K3s Installation](#k3s-installation)
4. [Cloudflare Tunnel Configuration](#cloudflare-tunnel-configuration)
5. [Persistent Storage Setup](#persistent-storage-setup)
6. [Nginx Ingress Controller](#nginx-ingress-controller)
7. [K3s Dashboard](#k3s-dashboard)
8. [Sample Applications](#sample-applications)
9. [Verification & Testing](#verification--testing)
10. [Troubleshooting](#troubleshooting)

---

## Pre-Flight Checks

### Why This Matters
Before installing k3s, we need to ensure your Raspberry Pi 5 is properly configured and has no system-level issues that might prevent Kubernetes from running correctly.

### Step 1: Verify OS and Hardware

```bash
# Check your OS and kernel version
cat /etc/os-release
uname -a

# Expected output:
# - OS: Raspberry Pi OS (Debian-based)
# - Kernel: Linux ... aarch64 (ARM 64-bit)
# - RAM: Should show ~7.5GB available
free -h

# Check CPU
cat /proc/cpuinfo | grep "model name"
# Should show: Cortex-A76 (4 cores)
```

**What it means:** Raspberry Pi 5 uses ARM64 architecture, so all container images must be ARM64-compatible. This is important when choosing Docker images later.

### Step 2: Update System Packages

```bash
# Update package lists and upgrade existing packages
sudo apt update
sudo apt upgrade -y

# This ensures you have the latest security patches and kernel updates
```

**Why:** Ensures all dependencies are current and any security vulnerabilities are patched.

### Step 3: Check Disk Space

```bash
# Check available disk space
df -h

# You need at least 10GB free for k3s + containers
```

**Why:** K3s and container images take up disk space. With 8GB RAM and databases, you'll want adequate storage.

### Step 4: Enable cgroups v2 (Important for K3s)

K3s requires cgroups v2 for proper resource management. Raspberry Pi OS may need this enabled:

```bash
# Check current cgroups version
stat -fc %T /sys/fs/cgroup/

# If output is: cgroup2fs, you're good!
# If not, edit boot parameters:
sudo nano /boot/firmware/cmdline.txt
```

Add `cgroup_memory=1 cgroup_enable=memory` to the single line in cmdline.txt (all on one line, space-separated).

Example:
```
console=serial0,115200 console=tty1 root=PARTUUID=12345678-02 rootfstype=ext4 elevator=deadline fsck.repair=skip rootwait cgroup_memory=1 cgroup_enable=memory
```

**Then reboot:**
```bash
sudo reboot
```

**Why:** cgroups v2 allows Kubernetes to manage memory and CPU resources properly. Without this, pods may not have resource limits enforced.

---

## System Preparation

### Step 1: Install Required System Packages

```bash
# Install essential tools needed for k3s and container management
sudo apt install -y \
  curl \
  wget \
  git \
  jq \
  htop \
  net-tools \
  openssh-server

# These tools do:
# - curl/wget: Download files from the internet
# - git: Version control (useful for app configs)
# - jq: JSON parsing (useful for script debugging)
# - htop: Monitor system resources
# - net-tools: Network troubleshooting (netstat, ifconfig)
```

### Step 2: Disable Swap (K3s Requirement)

Kubernetes prefers no swap memory because it can cause unpredictable performance.

```bash
# Check if swap is enabled
free -h
# If "Swap:" shows > 0, you have swap enabled

# Disable swap
sudo dphys-swapfile swapoff
sudo dphys-swapfile uninstall
sudo update-rc.d dphys-swapfile remove

# Verify swap is disabled
free -h
# Swap should now be 0
```

**Why:** Swap causes unpredictable I/O and memory delays that break Kubernetes scheduling guarantees.

### Step 3: Configure Firewall (UFW)

If UFW is enabled, allow necessary ports:

```bash
# Check UFW status
sudo ufw status

# If active, allow these ports:
sudo ufw allow 6443/tcp    # K3s API server
sudo ufw allow 10250/tcp   # Kubelet
sudo ufw allow 8080/tcp    # HTTP (Nginx Ingress)
sudo ufw allow 443/tcp     # HTTPS (Nginx Ingress)
sudo ufw allow 10251/tcp   # Scheduler
sudo ufw allow 10252/tcp   # Controller Manager
```

### Step 4: Set Hostname (Optional but Recommended)

```bash
# Set a meaningful hostname
sudo hostnamectl set-hostname pi5-k3s-master

# Verify
hostname
```

---

## K3s Installation

### What is K3s?

K3s is a lightweight Kubernetes distribution optimized for edge devices like the Raspberry Pi. It:
- Removes unnecessary components that consume memory
- Bundles container runtime (containerd) built-in
- Is 40-60% lighter than full Kubernetes
- Perfect for IoT, edge computing, and home labs

### Step 1: Install K3s

```bash
# Download and run the k3s installer
curl -sfL https://get.k3s.io | sh -

# This does:
# 1. Downloads k3s binary
# 2. Installs it as systemd service
# 3. Starts k3s automatically
# 4. Creates kubeconfig at ~/.kube/config

# The installation takes 2-5 minutes
# You'll see: "... service started successfully" when done
```

### Step 2: Verify K3s is Running

```bash
# Check if k3s systemd service is active
sudo systemctl status k3s

# Expected output:
# Active: active (running) since ...

# Check node status
sudo k3s kubectl get nodes

# Expected output:
# NAME              STATUS   ROLES                  AGE
# pi5-k3s-master    Ready    control-plane,master   1m
```

**What this means:** Your Kubernetes cluster is running and the node (your Pi) is "Ready" to run workloads.

### Step 3: Grant Non-Root Access to kubectl (Optional)

To avoid typing `sudo` every time:

```bash
# Create kubeconfig at user level
mkdir -p ~/.kube
sudo k3s kubectl config view --raw | sudo tee ~/.kube/config > /dev/null
sudo chown $(id -u):$(id -g) ~/.kube/config
sudo chmod 600 ~/.kube/config

# Now you can use kubectl without sudo
kubectl get nodes
```

### Step 4: Verify Docker/containerd

K3s uses containerd (not Docker) by default. Check it's working:

```bash
# List running containers
sudo crictl ps

# This shows all containers managed by k3s itself
# (e.g., coredns, metrics-server, local-path-provisioner)
```

**Why containerd instead of Docker:** Containerd is lighter and more suitable for resource-constrained environments.

---

## Cloudflare Tunnel Configuration

### What's Happening Here

You'll configure Cloudflare Tunnel (formerly Argo Tunnel) to:
1. Route external traffic from your Cloudflare domain → your Pi's k3s Nginx Ingress
2. Create a secure tunnel without exposing your home IP
3. Let you access apps like `app.yourdomain.com`

### Step 1: Install Cloudflare Tunnel Agent

```bash
# Download the latest cloudflared binary for ARM64
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64

# Make it executable
chmod +x cloudflared-linux-arm64

# Move to system path
sudo mv cloudflared-linux-arm64 /usr/local/bin/cloudflared

# Verify installation
cloudflared --version
```

### Step 2: Authenticate with Cloudflare

```bash
# This opens your browser to Cloudflare login
cloudflared tunnel login

# You'll:
# 1. Log in to your Cloudflare account
# 2. Select your domain
# 3. A cert file is saved locally

# Check it was saved
cat ~/.cloudflared/cert.pem
# Should show: -----BEGIN CERTIFICATE-----
```

### Step 3: Create a Tunnel

```bash
# Create a new tunnel (replace "my-pi" with a meaningful name)
cloudflared tunnel create my-pi

# Output:
# Tunnel credentials written to ~/.cloudflared/[tunnel-id].json
# Tunnel my-pi created with ID [tunnel-id]

# Save the tunnel ID for next steps
TUNNEL_ID=$(cloudflared tunnel list | grep my-pi | awk '{print $1}')
echo $TUNNEL_ID
```

### Step 4: Configure Tunnel Routing

Create a config file at `~/.cloudflared/config.yml`:

```bash
nano ~/.cloudflared/config.yml
```

Add this content (adjust domains as needed):

```yaml
tunnel: my-pi  # Match the tunnel name from Step 3
credentials-file: /home/pi/.cloudflared/[TUNNEL_ID].json
# Replace [TUNNEL_ID] with actual tunnel ID from previous step

ingress:
  # Route your domain to k3s Nginx Ingress (running on port 80)
  - hostname: yourdomain.com
    service: http://localhost/
  
  - hostname: "*.yourdomain.com"
    service: http://localhost/
  
  # Catch-all for any other traffic
  - service: http_status:404
```

**What this does:**
- `hostname: yourdomain.com` → Routes root domain to your k3s Ingress
- `"*.yourdomain.com"` → Routes all subdomains (app.yourdomain.com, api.yourdomain.com, etc.)
- `service: http_status:404` → Returns 404 for unmapped hostnames

### Step 5: Test Tunnel Connection

```bash
# Start tunnel manually to test
cloudflared tunnel run my-pi

# You should see:
# ... tunnel registered with Cloudflare
# ... routing rules active
# ... connected to edge

# Press Ctrl+C to stop (you'll create a systemd service next)
```

### Step 6: Create Systemd Service for Tunnel

```bash
# Create systemd unit file
sudo nano /etc/systemd/system/cloudflared.service
```

Add:

```ini
[Unit]
Description=Cloudflare Tunnel
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/.cloudflared
ExecStart=/usr/local/bin/cloudflared tunnel run my-pi
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# Check status
sudo systemctl status cloudflared

# View logs
sudo systemctl journalctl -u cloudflared -f
```

---

## Persistent Storage Setup

### What's Happening

For databases (PostgreSQL, MySQL) to survive pod restarts, we need persistent storage. K3s provides a built-in storage provisioner, but we'll also set up proper volumes.

### Step 1: Check Default Storage Class

K3s ships with a "local-path-provisioner" storage class:

```bash
# List storage classes
kubectl get storageclass

# Expected output:
# NAME                   PROVISIONER             RECLAIM POLICY
# local-path (default)   rancher.io/local-path   Delete
```

This stores data at `/var/lib/rancher/k3s/storage/` on the Pi.

### Step 2: Create a Data Directory for Databases

For better organization, create a dedicated directory:

```bash
# Create directory for persistent data
sudo mkdir -p /mnt/k3s-data
sudo mkdir -p /mnt/k3s-data/databases
sudo mkdir -p /mnt/k3s-data/applications

# Set permissions (allow k3s user to access)
sudo chown -R 1000:1000 /mnt/k3s-data
sudo chmod -R 755 /mnt/k3s-data
```

**Why:**
- Separates Kubernetes data from OS system files
- Easier to back up or expand storage later
- If needed, you can mount an external USB drive here

### Step 3: Create Persistent Volume (Manual Example)

For testing, we'll create a PersistentVolume manually:

```bash
# Create a manifest for persistent storage
nano pv-example.yaml
```

Add:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: database-pv
spec:
  capacity:
    storage: 5Gi
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  hostPath:
    path: "/mnt/k3s-data/databases"
    type: Directory
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 5Gi
```

Apply it:

```bash
kubectl apply -f pv-example.yaml

# Verify
kubectl get pv
kubectl get pvc
```

**What this does:**
- **PersistentVolume (PV):** Allocates 5GB from `/mnt/k3s-data/databases`
- **PersistentVolumeClaim (PVC):** Applications claim storage through this

---

## Nginx Ingress Controller

### What's an Ingress?

An Ingress is a Kubernetes resource that:
- Routes external traffic to internal services
- Handles hostname-based routing (example.com → Service A, api.example.com → Service B)
- Provides load balancing and SSL termination

### Step 1: Check If Traefik is Already Installed

K3s comes with Traefik (an ingress controller) by default:

```bash
# Check Traefik pods
kubectl get pods -n kube-system | grep traefik

# Expected: traefik pod should be running
```

Traefik is simpler than Nginx for k3s. We'll use it, but if you prefer Nginx, see the Alternative section below.

### Step 2: Verify Traefik Service

```bash
# Check Traefik service
kubectl get svc -n kube-system traefik

# Expected output shows:
# TYPE: LoadBalancer
# EXTERNAL-IP: 192.168.x.x (your Pi's IP)
# PORT(S): 80:xxxxx/TCP, 443:xxxxx/TCP
```

This means Traefik is already listening on ports 80 and 443.

### Step 3: Test with a Simple Ingress

Create a test ingress:

```bash
nano test-ingress.yaml
```

Add:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: test-ingress
  annotations:
    # Traefik annotation (different from standard Nginx)
    traefik.ingress.kubernetes.io/router.entrypoints: web
spec:
  rules:
    - host: test.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: nginx-test
                port:
                  number: 80
```

```bash
kubectl apply -f test-ingress.yaml
```

---

## K3s Dashboard

### What's the Dashboard?

A web UI to visualize:
- Pods, Services, Deployments
- Resource usage (CPU, memory)
- Logs from containers
- Deploy new applications

### Step 1: Install K3s Dashboard

```bash
# K3s doesn't include dashboard by default, install it:
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Wait for dashboard pod to start (takes ~30 seconds)
kubectl wait --for=condition=ready pod \
  -l k8s-app=kubernetes-dashboard \
  -n kubernetes-dashboard \
  --timeout=300s
```

### Step 2: Create Admin User and Get Access Token

```bash
# Create admin user
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kubernetes-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: admin-user
  namespace: kubernetes-dashboard
EOF

# Get access token
kubectl -n kubernetes-dashboard create token admin-user
# Copy this token - you'll need it to log in
```

### Step 3: Create Ingress for Dashboard

```bash
nano dashboard-ingress.yaml
```

Add:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kubernetes-dashboard
  namespace: kubernetes-dashboard
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web
spec:
  rules:
    - host: dashboard.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: kubernetes-dashboard
                port:
                  number: 443
```

```bash
kubectl apply -f dashboard-ingress.yaml
```

### Step 4: Access Dashboard

1. Update your Cloudflare tunnel config to include:
```yaml
  - hostname: dashboard.yourdomain.com
    service: http://localhost:80
```

2. Restart Cloudflare tunnel:
```bash
sudo systemctl restart cloudflared
```

3. Open: `https://dashboard.yourdomain.com` in browser
4. Paste the token from Step 2

---

## Sample Applications

### Application 1: Nginx Welcome Page

#### What It Does
A simple Nginx container serving the default welcome page. Great for testing that basic pod deployment works.

#### Deployment

```bash
nano nginx-deployment.yaml
```

Add:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-welcome
  labels:
    app: nginx
spec:
  replicas: 1  # 1 pod instance
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest  # ARM64 compatible
        ports:
        - containerPort: 80
        # Optional: Add resource limits (important on Pi!)
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "250m"
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-welcome
spec:
  selector:
    app: nginx
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-welcome
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web
spec:
  rules:
  - host: nginx.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nginx-welcome
            port:
              number: 80
```

Deploy it:

```bash
kubectl apply -f nginx-deployment.yaml

# Check deployment status
kubectl get deployment nginx-welcome
kubectl get pods -l app=nginx

# View logs
kubectl logs -l app=nginx
```

Visit: `https://nginx.yourdomain.com` (through your Cloudflare tunnel)

---

### Application 2: .NET Hello World

#### Build .NET Image

First, create a simple .NET application and Dockerfile:

```bash
# Create project directory
mkdir -p ~/dotnet-hello-world
cd ~/dotnet-hello-world

# Create a simple Dockerfile for ARM64
nano Dockerfile
```

Add:

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS builder
WORKDIR /app

# Create minimal hello world app
RUN dotnet new web -n HelloWorld --force

WORKDIR /app/HelloWorld
RUN dotnet publish -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine
WORKDIR /app

COPY --from=builder /app/publish .

EXPOSE 80
ENTRYPOINT ["dotnet", "HelloWorld.dll"]
```

```bash
# Build for ARM64 (this may take 5-10 minutes)
docker build -t hello-world-dotnet:latest .

# Note: `docker` here refers to `crictl` in k3s
# To use with k3s, you need to import to k3s:
sudo k3s ctr images import <(docker save hello-world-dotnet:latest)
```

#### Alternative: Use Pre-built Image

If building takes too long, use a minimal pre-built image:

```bash
# Create simpler Kubernetes manifest using a pre-built image
nano dotnet-deployment.yaml
```

Add:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dotnet-hello
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dotnet-hello
  template:
    metadata:
      labels:
        app: dotnet-hello
    spec:
      containers:
      - name: dotnet-app
        image: mcr.microsoft.com/dotnet/samples:aspnetapp-nanoserver-ltsc2022
        # Note: For Raspberry Pi, use Alpine images (lighter than nanoserver)
        # image: mcr.microsoft.com/dotnet/samples:aspnetapp-alpine
        ports:
        - containerPort: 80
        env:
        - name: ASPNETCORE_URLS
          value: "http://+:80"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: dotnet-hello
spec:
  selector:
    app: dotnet-hello
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dotnet-hello
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web
spec:
  rules:
  - host: dotnet.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dotnet-hello
            port:
              number: 80
```

Deploy:

```bash
kubectl apply -f dotnet-deployment.yaml

kubectl get deployment dotnet-hello
kubectl get pods -l app=dotnet-hello
```

Visit: `https://dotnet.yourdomain.com`

---

### Application 3: PostgreSQL Database (Optional)

For testing persistent storage with a real database:

```bash
nano postgres-deployment.yaml
```

Add:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
data:
  POSTGRES_DB: testdb
  POSTGRES_USER: postgres
---
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
type: Opaque
stringData:
  POSTGRES_PASSWORD: "supersecure123"  # Change this!
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine  # Lightweight Alpine version
        ports:
        - containerPort: 5432
        envFrom:
        - configMapRef:
            name: postgres-config
        - secretRef:
            name: postgres-secret
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
          subPath: postgres
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: database-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
  - protocol: TCP
    port: 5432
    targetPort: 5432
  type: ClusterIP
```

Deploy:

```bash
kubectl apply -f postgres-deployment.yaml

# Wait for postgres pod
kubectl wait --for=condition=ready pod -l app=postgres --timeout=300s

# Access postgres from inside the cluster:
kubectl run -it --rm postgres-client --image=postgres:15-alpine \
  --restart=Never -- psql -h postgres -U postgres -d testdb
```

---

## Verification & Testing

### Step 1: Verify All Pods Are Running

```bash
# List all pods
kubectl get pods -A

# Expected output shows all pods in Running state:
# NAMESPACE              NAME                                    READY   STATUS
# kube-system            coredns-57...                           1/1     Running
# kube-system            local-path-provisioner-...               1/1     Running
# kube-system            traefik-...                              1/1     Running
# default                nginx-welcome-...                        1/1     Running
# default                dotnet-hello-...                         1/1     Running
# kubernetes-dashboard   kubernetes-dashboard-...                 1/1     Running
```

### Step 2: Check Ingress Routes

```bash
# List all ingress rules
kubectl get ingress -A

# Should show:
# NAMESPACE   NAME                   CLASS    HOSTS                    ADDRESS
# default     nginx-welcome          <none>   nginx.yourdomain.com     192.168.x.x
# default     dotnet-hello           <none>   dotnet.yourdomain.com    192.168.x.x
```

### Step 3: Test DNS Resolution

```bash
# From your Pi, test if Cloudflare tunnel is routing correctly
curl -H "Host: nginx.yourdomain.com" http://localhost/

# Expected: HTML content from Nginx welcome page (or your dashboard)
```

### Step 4: Monitor Cloudflare Tunnel

```bash
# Check tunnel status
cloudflared tunnel list

# View recent connections
cloudflared tunnel info my-pi
```

### Step 5: Monitor Resource Usage

```bash
# Check node resource usage
kubectl top nodes

# Check pod resource usage
kubectl top pods -A

# Example output:
# NAME                    CPU(cores)   MEMORY(Mi)
# nginx-welcome-...       5m           32Mi
# dotnet-hello-...        10m          64Mi
# postgres-...            20m          128Mi
```

This shows how much CPU and memory each pod is using.

### Step 6: View Pod Logs

```bash
# View logs from specific pod
kubectl logs -l app=nginx

# Follow logs in real-time
kubectl logs -l app=nginx -f

# View logs from .NET app
kubectl logs -l app=dotnet-hello
```

---

## Troubleshooting

### Issue 1: K3s Pod Won't Start ("ImagePullBackOff")

**Symptom:** `kubectl get pods` shows pod stuck in "ImagePullBackOff"

**Cause:** Image doesn't exist for ARM64 architecture

**Solution:**
```bash
# Check what architecture the image supports
docker inspect image-name | grep -i "Architecture"

# Use only ARM64 compatible images. Safe choices:
# - alpine (all versions)
# - debian (all versions)
# - ubuntu:22.04
# - nginx:latest
# - postgres:15-alpine

# Do NOT use:
# - Images tagged "amd64" (Intel only)
# - Images tagged "windows" or "nanoserver"
```

### Issue 2: Pod Running But App Not Responding

**Symptom:** Pod is "Running" but website shows 503 or timeout

**Cause:** Service networking issue or app crashed inside container

**Solution:**
```bash
# 1. Check if pod is actually running or crashed
kubectl describe pod <pod-name>

# 2. Check logs for errors
kubectl logs <pod-name>

# 3. Test connectivity inside cluster
kubectl exec -it <pod-name> -- /bin/sh
# Then inside container: curl localhost:80

# 4. Check service
kubectl get svc <service-name>
# Verify CLUSTER-IP is assigned and not <pending>
```

### Issue 3: Persistent Storage Not Working

**Symptom:** Database loses data after pod restart

**Cause:** PVC not bound or wrong path

**Solution:**
```bash
# Check PVC status
kubectl get pvc

# Should show:
# NAME           STATUS   VOLUME   ...
# database-pvc   Bound    pv-1     ...

# If status is "Pending":
kubectl describe pvc database-pvc

# Check PV exists
kubectl get pv
```

### Issue 4: Cloudflare Tunnel Not Routing Traffic

**Symptom:** Website shows "Error 522" or "Origin unreachable"

**Cause:** Tunnel not connected or config incorrect

**Solution:**
```bash
# Check tunnel is connected
sudo systemctl status cloudflared

# Check tunnel logs
sudo journalctl -u cloudflared -f

# Verify config has correct hostnames and ports
cat ~/.cloudflared/config.yml

# Test locally without tunnel:
curl -H "Host: nginx.yourdomain.com" http://localhost/
```

### Issue 5: High Memory Usage / Pod Eviction

**Symptom:** Pods getting killed or "MemoryLimitExceeded"

**Cause:** Pods using more memory than limit

**Solution:**
```bash
# Check current resource usage
kubectl top pods -A

# Increase limits in YAML:
# resources:
#   limits:
#     memory: "256Mi"   # Increase from original

# Or reduce replicas:
kubectl scale deployment nginx-welcome --replicas=1
```

---

## Next Steps After Testing

1. **Add More Apps:** Create Deployments for your Node.js apps using similar patterns
2. **Enable HTTPS:** Add SSL certificate with cert-manager
3. **Backups:** Set up backup strategy for persistent storage
4. **Monitoring:** Install Prometheus and Grafana for metrics
5. **CI/CD:** Set up automated deployments with GitHub Actions

---

## Quick Reference Commands

```bash
# Pod management
kubectl get pods                           # List pods
kubectl describe pod <name>                # Detailed info
kubectl logs <pod>                         # View logs
kubectl exec -it <pod> -- /bin/sh          # Shell access
kubectl delete pod <name>                  # Remove pod

# Deployment management
kubectl get deployments                    # List deployments
kubectl scale deployment <name> --replicas=3  # Scale up/down
kubectl set image deployment/<name> app=image:tag  # Update image

# Service and Ingress
kubectl get svc                            # List services
kubectl get ingress                        # List ingress rules

# Resource monitoring
kubectl top nodes                          # Node CPU/memory
kubectl top pods                           # Pod CPU/memory

# Debugging
kubectl get events                         # Recent cluster events
kubectl describe node                      # Node details
```

---

## Important Security Notes

⚠️ **For Production:**
- Change all default passwords (postgres, dashboard token)
- Enable RBAC properly (current setup is admin-only)
- Use sealed secrets for credentials (not plain ConfigMap)
- Enable network policies to restrict traffic between pods
- Regularly update k3s: `sudo systemctl stop k3s && sudo systemctl start k3s`
- Back up your persistent data regularly

---

**Setup Complete!** Your k3s cluster on Raspberry Pi 5 is now ready for testing. Start with the Nginx deployment, verify it works through Cloudflare, then proceed to .NET and database applications.