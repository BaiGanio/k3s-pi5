// modules/jenkins/jenkins-docker.js
// M5: Jenkins + Docker — Container Builds on Agent Nodes
// Extracted from DOB-M5 Practice (Practice-M5-Jenkins.md, Part 3 — Docker section)
// Reframed for .NET / Node.js container images

window.commandData = [

  // ── Section 1: Docker installation on the slave ───────────────────────────

  {
    id: 801, section: "docker-install", sectionTitle: "Docker on the Slave",
    commandTitle: "Install Docker on the slave (CentOS 7)",
    command: "sudo yum install -y yum-utils device-mapper-persistent-data lvm2 && sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo && sudo yum makecache fast && sudo yum install -y docker-ce",
    searchTerms: "docker install centos yum docker-ce repository slave",
    description: "Install Docker CE on the slave VM. This is the standard CentOS 7 Docker installation: install prerequisites, add the Docker CE repository, and install the <code>docker-ce</code> package. For CentOS 8+/Rocky/Alma, the process is similar but uses <code>dnf</code> instead of <code>yum</code>.",
    parts: [
      { text: "yum-utils device-mapper-persistent-data lvm2", explanation: "prerequisites for the Docker storage driver" },
      { text: "yum-config-manager --add-repo", explanation: "add the official Docker CE repository" },
      { text: "yum makecache fast && yum install docker-ce", explanation: "refresh metadata and install Docker" },
    ],
    example: "Installed:\n  docker-ce.x86_64 0:24.0.7-1.el7\nDependency Installed:\n  containerd.io.x86_64 0:1.6.27-3.1.el7",
    why: "Docker on the agent lets Jenkins build container images and run containers as build steps. This is the bridge between CI (compile code) and CD (ship a container). The agent needs Docker; the master doesn't."
  },
  {
    id: 802, section: "docker-install", sectionTitle: "Docker on the Slave",
    commandTitle: "Configure Docker storage driver and start the service",
    command: "sudo mkdir -p /etc/docker && echo '{\"storage-driver\": \"overlay2\"}' | sudo tee /etc/docker/daemon.json && sudo systemctl start docker && sudo systemctl enable docker",
    searchTerms: "docker daemon.json storage driver overlay2 systemctl start enable",
    description: "Configure Docker to use the <code>overlay2</code> storage driver (recommended for modern kernels) and start the service. <code>overlay2</code> is the default on CentOS 7.4+ with kernel 3.10.0-693+ — it's faster and more space-efficient than the older <code>devicemapper</code>.",
    parts: [
      { text: "storage-driver: overlay2", explanation: "the recommended storage driver — better performance than devicemapper" },
      { text: "systemctl start docker && systemctl enable docker", explanation: "start now and auto-start on boot" },
    ],
    example: "Created symlink /etc/systemd/system/multi-user.target.wants/docker.service → /usr/lib/systemd/system/docker.service.\n● docker.service - Docker Application Container Engine\n   Active: active (running)",
    why: "The storage driver affects I/O performance and disk usage. <code>overlay2</code> uses copy-on-write at the file level — building container images is faster, and disk usage is lower than with <code>devicemapper</code>."
  },
  {
    id: 803, section: "docker-install", sectionTitle: "Docker on the Slave",
    commandTitle: "Add jenkins user to the docker group",
    command: "sudo usermod -aG docker jenkins",
    searchTerms: "docker group jenkins user permissions usermod add",
    description: "Add the <code>jenkins</code> user to the <code>docker</code> group. This lets Jenkins build steps run <code>docker</code> commands without <code>sudo</code>. The change takes effect on next login — restart Jenkins or the agent process to pick it up.",
    parts: [
      { text: "usermod -aG docker jenkins", explanation: "append the docker group to the jenkins user's supplementary groups" },
    ],
    example: "(no output — verify with: groups jenkins → 'jenkins : jenkins docker')",
    why: "Without docker group membership, every <code>docker build</code> or <code>docker run</code> command needs <code>sudo</code>. That requires the jenkins user to have NOPASSWD sudo (which it does), but group membership is cleaner and follows the principle of least privilege."
  },

  // ── Section 2: Verify Docker on the slave ─────────────────────────────────

  {
    id: 810, section: "docker-verify", sectionTitle: "Docker Verification",
    commandTitle: "Verify Docker is working on the slave",
    command: "sudo su - jenkins -c 'docker version && docker system info'",
    searchTerms: "docker version system info verify check running",
    description: "Run <code>docker version</code> (client and server versions) and <code>docker system info</code> (storage driver, kernel, CPU, memory) as the jenkins user. Both should succeed without errors — this confirms Docker is installed, running, and accessible to the jenkins user.",
    parts: [
      { text: "docker version", explanation: "shows client and daemon (server) versions — both must be present" },
      { text: "docker system info", explanation: "shows detailed daemon info: storage driver, CPUs, memory, registry mirrors" },
    ],
    example: "Client: Docker Engine - Community\n Version: 24.0.7\nServer: Docker Engine - Community\n  Storage Driver: overlay2\n  Cgroup Version: 2",
    why: "If <code>docker version</code> shows a server error ('Cannot connect to the Docker daemon'), the service isn't running. If it shows a permission error, the jenkins user isn't in the docker group. Fix these before creating Jenkins jobs."
  },

  // ── Section 3: Docker build jobs ──────────────────────────────────────────

  {
    id: 820, section: "docker-jobs", sectionTitle: "Docker Build Jobs",
    commandTitle: "Create a Docker Hello World job on the slave",
    command: "# New Item → Freestyle → 'Docker-Hello-World'\n# Restrict where: slave-node\n# Execute shell: docker container run --rm hello-world",
    searchTerms: "jenkins docker hello world container run slave build",
    description: "Create a freestyle job that runs a Docker container on the slave. The <code>hello-world</code> image is Docker's smallest test image — it prints a message and exits. This proves Jenkins can invoke Docker on the agent.",
    parts: [
      { text: "Restrict where: slave-node", explanation: "only run on the agent with Docker installed" },
      { text: "docker container run --rm hello-world", explanation: "pull the hello-world image, run it, print output, auto-remove the container" },
    ],
    example: "Unable to find image 'hello-world:latest' locally\nlatest: Pulling from library/hello-world\n...\nHello from Docker!\nThis message shows that your installation appears to be working correctly.",
    why: "This is the Docker equivalent of Jenkins' first 'ps ax' job — a smoke test that proves the Docker daemon is reachable and the jenkins user can pull and run images."
  },
  {
    id: 821, section: "docker-jobs", sectionTitle: "Docker Build Jobs",
    commandTitle: "Build a .NET Docker image on the slave",
    command: "# Execute shell:\ncd $WORKSPACE\ndocker image build -t my-dotnet-app:$BUILD_NUMBER -f Dockerfile .\ndocker image ls my-dotnet-app",
    searchTerms: "docker build dotnet image jenkins slave Dockerfile",
    description: "Build a Docker image for a .NET application. This assumes the workspace contains a <code>Dockerfile</code> (checked out from Git in a previous step). Tag the image with <code>$BUILD_NUMBER</code> (a Jenkins environment variable) so every build produces a uniquely-tagged image.",
    parts: [
      { text: "docker image build -t my-dotnet-app:$BUILD_NUMBER", explanation: "build the image, tag with the Jenkins build number" },
      { text: "$BUILD_NUMBER", explanation: "Jenkins built-in variable — increments with each build (1, 2, 3...)" },
    ],
    example: "Step 1/6 : FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build\nStep 2/6 : WORKDIR /src\n...\nSuccessfully built abc123def456\nSuccessfully tagged my-dotnet-app:42",
    why: "Tagging with <code>$BUILD_NUMBER</code> creates an audit trail: build #42 → image <code>my-dotnet-app:42</code>. You can deploy a specific build, roll back to a known-good image, and trace a production issue back to the exact Jenkins build that produced it."
  },
  {
    id: 822, section: "docker-jobs", sectionTitle: "Docker Build Jobs",
    commandTitle: "Build a Node.js Docker image on the slave",
    command: "# Execute shell:\ncd $WORKSPACE\ndocker image build -t my-node-app:$BUILD_NUMBER -f Dockerfile .\n# Run a quick smoke test:\ndocker container run --rm my-node-app:$BUILD_NUMBER node -e \"console.log('OK')\"",
    searchTerms: "docker build nodejs node image jenkins slave npm",
    description: "Same pattern for Node.js: build the image, then run a smoke test — execute a one-liner inside the container to verify the Node.js runtime and the application entry point are functional before pushing to a registry.",
    parts: [
      { text: "docker image build -t my-node-app:$BUILD_NUMBER", explanation: "build the Node.js container image" },
      { text: "docker container run --rm ... node -e \"console.log('OK')\"", explanation: "smoke test — runs Node.js inline script inside the container" },
    ],
    example: "Successfully built def456abc789\nSuccessfully tagged my-node-app:42\nOK",
    why: "A smoke test catches broken images early. If <code>node -e</code> fails, the image is bad — don't push it to a registry. The <code>--rm</code> flag ensures the test container is cleaned up automatically."
  },

  // ── Section 4: GitHub → Docker pipeline ───────────────────────────────────

  {
    id: 830, section: "github-docker", sectionTitle: "GitHub → Docker Pipeline",
    commandTitle: "Clone a .NET repo, build the image, run the container",
    command: "# Source Code Management → Git → https://github.com/your-org/dotnet-app.git\n# Execute shell:\ndocker image build -t dotnet-app:$BUILD_NUMBER .\ndocker container rm -f dotnet-app || true\ndocker container run -d -p 8080:80 --name dotnet-app dotnet-app:$BUILD_NUMBER",
    searchTerms: "jenkins git clone docker build run container pipeline dotnet",
    description: "A complete CI pipeline in one job: Jenkins clones the repo, builds the Docker image, stops any previous container, and runs the new one. The <code>|| true</code> after <code>docker container rm</code> prevents the build from failing if the container doesn't exist yet (first run).",
    parts: [
      { text: "docker container rm -f dotnet-app || true", explanation: "force-remove the old container; don't fail if it doesn't exist" },
      { text: "docker container run -d -p 8080:80 --name dotnet-app", explanation: "run the new container in detached mode, map port 80" },
    ],
    example: "Cloning repository...\nSuccessfully built ghi789jkl012\nSuccessfully tagged dotnet-app:43\ndotnet-app\nd60f3a8b9c7e... → Container started, accessible at http://localhost:8080",
    why: "This is the 'deploy' step of CI/CD: compile → containerise → run. In production you'd push to a registry and deploy to Kubernetes, but the principle is identical — Jenkins produces a tested, tagged image and puts it where it needs to go."
  },
  {
    id: 831, section: "github-docker", sectionTitle: "GitHub → Docker Pipeline",
    commandTitle: "Clone a Node.js repo, build image, run with PostgreSQL",
    command: "# Execute shell (two steps):\n# Step 1: docker image build -t node-app:$BUILD_NUMBER .\n# Step 2:\ndocker network create app-net || true\ndocker container rm -f node-app || true\ndocker container run -d --name node-app --network app-net -p 3000:3000 \\\n  -e DB_HOST=postgres -e DB_USER=app_user -e DB_PASS=$DB_PASS node-app:$BUILD_NUMBER",
    searchTerms: "nodejs docker postgresql network environment variables jenkins",
    description: "A more realistic Node.js pipeline: build the image, create a Docker network, run the app container with PostgreSQL connection parameters via environment variables. <code>$DB_PASS</code> comes from a Jenkins credential (injected as an env var, never hardcoded).",
    parts: [
      { text: "docker network create app-net || true", explanation: "create a Docker bridge network so the app can reach the DB by container name" },
      { text: "-e DB_HOST=postgres -e DB_USER=app_user", explanation: "pass database connection parameters as environment variables" },
      { text: "$DB_PASS", explanation: "a Jenkins secret — configured in Manage Credentials, injected as an env var at build time" },
    ],
    example: "node-app running on port 3000\n$ curl http://localhost:3000/health\n{\"status\":\"ok\",\"db\":\"connected\"}",
    why: "Secrets management is critical in CI/CD. Never put passwords in a Jenkinsfile or job config — store them as Jenkins credentials and inject them as environment variables. The console output masks credential values automatically."
  },

  // ── Section 5: Container cleanup ──────────────────────────────────────────

  {
    id: 840, section: "cleanup", sectionTitle: "Container Cleanup",
    commandTitle: "Clean up old images and stopped containers",
    command: "docker container prune -f && docker image prune -a -f --filter \"until=24h\"",
    searchTerms: "docker prune cleanup old images containers disk space jenkins",
    description: "Build agents accumulate Docker images and stopped containers over time, consuming disk space. <code>docker container prune -f</code> removes all stopped containers. <code>docker image prune -a -f --filter \"until=24h\"</code> removes unused images older than 24 hours. Run this as a scheduled nightly job.",
    parts: [
      { text: "docker container prune -f", explanation: "remove all stopped containers without confirmation prompt" },
      { text: "docker image prune -a -f --filter \"until=24h\"", explanation: "remove all unused images older than 24 hours" },
    ],
    example: "Deleted Containers: 12\nTotal reclaimed space: 2.8GB\nDeleted Images: 34\nTotal reclaimed space: 8.2GB",
    why: "Without cleanup, a build agent's disk fills up with old images and stopped containers within days. A scheduled cleanup job prevents 'no space left on device' errors that halt all builds."
  },

];
