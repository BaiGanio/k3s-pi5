// modules/m1-devops-intro.js
// M2: Containers

window.commandData = [
    // ── Standalone Containers (nerdctl) ─────────────────────────────────────
    {
        id: 500, section: "nerdctl", sectionTitle: "nerdctl (Standalone Containers)",
        commandTitle: "Install nerdctl",
        command: "curl -sfL https://github.com/containerd/nerdctl/releases/download/v2.0.2/nerdctl-full-2.0.2-linux-arm64.tar.gz | sudo tar -C /usr/local -xz",
        searchTerms: "nerdctl install containerd arm64 pi",
        description: "Downloads and installs the full nerdctl bundle (includes BuildKit, CNI plugins) for ARM64. The 'full' bundle means no extra steps — everything needed to build and run containers is included.",
        parts: [
            { text: "curl -sfL", explanation: "download silently, fail on error, follow redirects" },
            { text: "nerdctl-full-...-linux-arm64.tar.gz", explanation: "the 'full' ARM64 build — includes nerdctl, BuildKit, and CNI plugins" },
            { text: "sudo tar -C /usr/local -xz", explanation: "extract the archive directly into /usr/local, putting binaries in /usr/local/bin" }
        ],
        example: "$ nerdctl version\nClient:\n  Version: v2.0.2\nServer (containerd):\n  Version: 2.0.x",
        why: "nerdctl uses the containerd already running inside k3s — no second daemon, no Docker install, no conflicts. You get Docker-compatible commands for free."
    },
    {
        id: 501, section: "nerdctl", sectionTitle: "nerdctl (Standalone Containers)",
        commandTitle: "Run a container",
        command: "sudo nerdctl run -d --name my-nginx -p 8080:80 nginx:alpine",
        searchTerms: "nerdctl run container start detached port",
        description: "Pulls (if needed) and starts a container in the background. Maps port 8080 on your Pi to port 80 inside the container.",
        parts: [
            { text: "nerdctl run", explanation: "create and start a new container" },
            { text: "-d", explanation: "detached mode — runs in background, returns container ID" },
            { text: "--name my-nginx", explanation: "gives the container a human-readable name to reference later" },
            { text: "-p 8080:80", explanation: "maps Pi port 8080 → container port 80 (host:container)" },
            { text: "nginx:alpine", explanation: "image to use — Alpine-based nginx, small and fast" }
        ],
        example: "Unable to find image 'nginx:alpine' locally\nPulling from docker.io/library/nginx:alpine\n...\nd3f5b5a12345abc...",
        why: "Same command you'd type with Docker. If you know 'docker run', you already know this — just swap the prefix."
    },
    {
        id: 502, section: "nerdctl", sectionTitle: "nerdctl (Standalone Containers)",
        commandTitle: "Stop & Remove a container",
        command: "sudo nerdctl stop my-nginx && sudo nerdctl rm my-nginx",
        searchTerms: "nerdctl stop remove container",
        description: "Stops a running container gracefully, then removes it. Stop sends SIGTERM and waits; rm cleans up the container record.",
        parts: [
            { text: "nerdctl stop my-nginx", explanation: "sends SIGTERM to the container, waits up to 10s for clean shutdown" },
            { text: "&&", explanation: "only remove if stop succeeded — prevents removing a stuck container" },
            { text: "nerdctl rm my-nginx", explanation: "deletes the stopped container (image stays cached locally)" }
        ],
        example: "my-nginx\nmy-nginx",
        why: "Always stop before remove — skipping stop and going straight to 'rm -f' is the container equivalent of pulling the power cord."
    },
    {
        id: 503, section: "nerdctl", sectionTitle: "nerdctl (Standalone Containers)",
        commandTitle: "List all containers",
        command: "sudo nerdctl ps -a",
        searchTerms: "nerdctl ps list containers running stopped",
        description: "Lists all containers — running and stopped. Without -a you only see running ones.",
        parts: [
            { text: "nerdctl ps", explanation: "list containers (process status)" },
            { text: "-a", explanation: "'all' — includes stopped/exited containers, not just running" }
        ],
        example: "CONTAINER ID  IMAGE         COMMAND   STATUS     NAMES\nd3f5b5a12345  nginx:alpine  nginx -g  Up 2 min   my-nginx",
        why: "First command to run when something isn't responding — is the container actually up, or did it exit quietly?"
    },
    {
        id: 504, section: "nerdctl", sectionTitle: "nerdctl (Standalone Containers)",
        commandTitle: "Run Compose Services",
        command: "sudo nerdctl compose up -d",
        searchTerms: "nerdctl compose docker-compose up detached",
        description: "Reads a docker-compose.yml in the current directory and starts all defined services in the background. nerdctl ships with Compose built in — no separate install needed.",
        parts: [
            { text: "nerdctl compose", explanation: "built-in Compose subcommand — reads docker-compose.yml" },
            { text: "up", explanation: "create and start all services defined in the file" },
            { text: "-d", explanation: "detached — runs everything in background" }
        ],
        example: "WARN[0000] Found orphan containers ([old-service]) ...\nContainer my-app  Started\nContainer my-db   Started",
        why: "Your existing docker-compose.yml files work here without modification. Great for multi-container setups (app + database + cache) without needing k3s for something that simple."
    },
    {
        id: 505, section: "nerdctl", sectionTitle: "nerdctl (Standalone Containers)",
        commandTitle: "Stop & Remove Compose Services",
        command: "sudo nerdctl compose down",
        searchTerms: "nerdctl compose down stop remove services",
        description: "Stops and removes all containers, networks, and anonymous volumes created by 'compose up'. Named volumes are kept by default.",
        parts: [
            { text: "nerdctl compose", explanation: "built-in Compose subcommand" },
            { text: "down", explanation: "stop containers and remove them along with their networks" }
        ],
        example: "Container my-app  Stopped\nContainer my-db   Stopped\nNetwork my-project_default  Removed",
        why: "The clean counterpart to 'compose up'. Use 'down -v' if you also want to wipe named volumes (careful — that deletes database data too)."
    }
];