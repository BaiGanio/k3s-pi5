// modules/m2-docker-intro.js
// Practice M2: Introduction to Docker

window.commandData = [

  // ── Part 1: Install Docker ────────────────────────────────────────────────

  {
    id: 101,
    section: "install",
    sectionTitle: "Part 1 – Install Docker",
    commandTitle: "Remove old Docker versions",
    command: "sudo yum remove docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-selinux docker-engine-selinux docker-engine",
    searchTerms: "docker remove old version yum cleanup legacy uninstall",
    description: "Wipes any previous Docker installations before starting fresh. Removes all known legacy package names so there are no conflicts when installing Docker CE.",
    parts: [
      { text: "sudo yum remove", explanation: "removes listed packages via yum — silently skips any that are not installed" },
      { text: "docker docker-client docker-client-latest …", explanation: "all legacy Docker package names that have existed across releases" },
    ],
    example: "No packages marked for removal.",
    why: "Docker has been released under several package names over the years. Removing all variants guarantees a clean slate before the official CE install.",
  },

  {
    id: 102,
    section: "install",
    sectionTitle: "Part 1 – Install Docker",
    commandTitle: "Install prerequisites & add Docker CE repo",
    command: "sudo yum install -y yum-utils device-mapper-persistent-data lvm2 && sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo",
    searchTerms: "docker repo yum-utils device-mapper lvm2 yum-config-manager add-repo centos",
    description: "Installs the tools Docker needs as prerequisites — <code>yum-utils</code> for repo management, <code>device-mapper-persistent-data</code> and <code>lvm2</code> for the default storage driver — then registers the official Docker CE repository.",
    parts: [
      { text: "sudo yum install -y yum-utils", explanation: "provides yum-config-manager used in the next step" },
      { text: "device-mapper-persistent-data lvm2", explanation: "low-level storage libraries required by Docker's devicemapper storage backend" },
      { text: "sudo yum-config-manager --add-repo …", explanation: "downloads and registers the official Docker CE repo definition in /etc/yum.repos.d/" },
    ],
    example: "Loaded plugins: fastestmirror\nrepo saved to /etc/yum.repos.d/docker-ce.repo",
    why: "Docker CE is not in the default CentOS repos. Adding the upstream repo ensures you get the latest stable release and future updates via yum.",
  },

  {
    id: 103,
    section: "install",
    sectionTitle: "Part 1 – Install Docker",
    commandTitle: "Refresh cache & install Docker CE",
    command: "sudo yum makecache fast && sudo yum install docker-ce",
    searchTerms: "docker install docker-ce yum makecache centos",
    description: "Pre-builds the local yum package cache for speed, then installs Docker Community Edition from the newly added repository.",
    parts: [
      { text: "sudo yum makecache fast", explanation: "pre-downloads repo metadata so installs resolve faster" },
      { text: "sudo yum install docker-ce", explanation: "installs the Docker CE engine package from the official Docker repo" },
    ],
    example: "Installed:\n  docker-ce.x86_64  3:20.10.9-3.el7\nComplete!",
    why: "Running makecache first avoids stale metadata errors and makes the install step noticeably quicker on slower connections.",
  },

  {
    id: 104,
    section: "install",
    sectionTitle: "Part 1 – Install Docker",
    commandTitle: "Start Docker & verify installation",
    command: "sudo systemctl start docker && sudo systemctl status docker && sudo docker version && sudo docker system info",
    searchTerms: "docker start systemctl status version system info verify check",
    description: "Starts the Docker daemon via systemd, confirms it is running, then prints version details for both the client and server, plus the full system configuration including storage driver and cgroup setup.",
    parts: [
      { text: "sudo systemctl start docker", explanation: "tells systemd to start the Docker daemon (dockerd)" },
      { text: "sudo systemctl status docker", explanation: "shows whether the service is active, including recent log lines — first place to look if something is wrong" },
      { text: "sudo docker version", explanation: "prints client and server version numbers — confirms the CLI can reach the daemon" },
      { text: "sudo docker system info", explanation: "shows OS, kernel, storage driver, cgroup driver, running containers count, and more" },
    ],
    example: "● docker.service - Docker Application Container Engine\n   Active: active (running) since …\nServer Version: 20.10.9",
    why: "Always verify after install. If dockerd fails to start, <code>systemctl status</code> surfaces the error without needing to dig into logs manually.",
  },

  {
    id: 105,
    section: "install",
    sectionTitle: "Part 1 – Install Docker",
    commandTitle: "Run first container — hello-world",
    command: "sudo docker container run hello-world",
    searchTerms: "docker run hello-world first container test smoke",
    description: "Pulls the tiny <code>hello-world</code> image from Docker Hub and runs it. The container prints a confirmation message and exits — the simplest possible end-to-end test.",
    parts: [
      { text: "sudo docker container run", explanation: "creates and starts a new container from an image, pulling it from Docker Hub if not cached" },
      { text: "hello-world", explanation: "a minimal official image whose only job is to print a success message and exit" },
    ],
    example: "Unable to find image 'hello-world:latest' locally\nlatest: Pulling from library/hello-world\n\nHello from Docker!\nThis message shows that your installation appears to be working correctly.",
    why: "Proves that Docker can pull images, create a container, run a process, and stream its output back — the whole pipeline in one command.",
  },

  {
    id: 106,
    section: "install",
    sectionTitle: "Part 1 – Install Docker",
    commandTitle: "Run custom welcome container",
    command: "sudo docker container run shekeriev/welcome-dob:2018",
    searchTerms: "docker run shekeriev welcome-dob custom image container",
    description: "Runs the course-specific welcome image, which displays a DOB welcome message. Demonstrates pulling a non-official image from a personal Docker Hub account.",
    parts: [
      { text: "shekeriev/welcome-dob", explanation: "image in the format username/repository — from the shekeriev Docker Hub account" },
      { text: ":2018", explanation: "the image tag — selects a specific version rather than defaulting to latest" },
    ],
    example: "Welcome to DevOps Basics!\nModule 2 — Introduction to Docker",
    why: "Shows that any public image on Docker Hub can be pulled and run with the same command — not just official images.",
  },

  // ── Part 2: Post-install Settings ────────────────────────────────────────

  {
    id: 201,
    section: "postinstall",
    sectionTitle: "Part 2 – Post-install Settings",
    commandTitle: "Run Docker without sudo",
    command: "sudo usermod -aG docker $USER",
    searchTerms: "docker sudo usermod group docker permission non-root",
    description: "Adds the current user to the <code>docker</code> group so Docker commands can be run without <code>sudo</code>. A log-off / log-on is required for the group change to take effect.",
    parts: [
      { text: "sudo usermod", explanation: "modifies a user account" },
      { text: "-aG docker", explanation: "appends (-a) the user to the docker group (-G) without removing them from other groups" },
      { text: "$USER", explanation: "shell variable that expands to the currently logged-in username" },
    ],
    example: "# Log out and back in, then:\n$ docker container run hello-world\nHello from Docker!",
    why: "The Docker socket (<code>/var/run/docker.sock</code>) is only accessible by root and the docker group by default. Group membership is the least-privilege solution.",
  },

  {
    id: 202,
    section: "postinstall",
    sectionTitle: "Part 2 – Post-install Settings",
    commandTitle: "Enable Docker on boot",
    command: "sudo systemctl enable docker",
    searchTerms: "docker enable systemctl boot autostart startup service",
    description: "Configures systemd to start the Docker daemon automatically every time the machine boots.",
    parts: [
      { text: "sudo systemctl enable", explanation: "creates a symlink in the systemd wants directory so the unit starts at every boot" },
      { text: "docker", explanation: "the systemd service unit name for the Docker daemon" },
    ],
    example: "Created symlink /etc/systemd/system/multi-user.target.wants/docker.service → /usr/lib/systemd/system/docker.service",
    why: "Without <code>enable</code>, dockerd only lives for the current session. In any environment that reboots you almost always want the daemon to come back up automatically.",
  },

  {
    id: 203,
    section: "postinstall",
    sectionTitle: "Part 2 – Post-install Settings",
    commandTitle: "Switch storage driver to devicemapper",
    command: "sudo mkdir -p /etc/docker && sudo touch /etc/docker/daemon.json",
    searchTerms: "docker storage driver devicemapper daemon.json config mkdir touch",
    description: "Creates the Docker daemon configuration directory and its <code>daemon.json</code> file if either is missing. After creation, open <code>daemon.json</code> and add <code>{\"storage-driver\": \"devicemapper\"}</code>, then restart Docker.",
    parts: [
      { text: "sudo mkdir -p /etc/docker", explanation: "creates the config directory; -p suppresses the error if it already exists" },
      { text: "sudo touch /etc/docker/daemon.json", explanation: "creates an empty daemon.json file — Docker reads this on every start" },
      { text: "{\"storage-driver\": \"devicemapper\"}", explanation: "the JSON content to add: tells dockerd to use the Device Mapper thin-provisioning backend" },
    ],
    example: "# After editing daemon.json and restarting:\n$ sudo docker system info | grep 'Storage Driver'\nStorage Driver: devicemapper",
    why: "The default overlay2 driver may not be supported on older kernels. Devicemapper is a mature alternative and supports direct-lvm mode for production-grade storage.",
  },

  // ── Part 3: Images & Containers ──────────────────────────────────────────

  {
    id: 301,
    section: "images",
    sectionTitle: "Part 3 – Images & Containers",
    commandTitle: "Search Docker Hub for an image",
    command: "docker search ubuntu",
    searchTerms: "docker search hub ubuntu find image browse",
    description: "Queries Docker Hub for all public images whose name or description contains <code>ubuntu</code>. The results show the image name, description, star count, whether it is official, and whether it is automated.",
    parts: [
      { text: "docker search", explanation: "queries the Docker Hub search API and returns matching image records" },
      { text: "ubuntu", explanation: "the search term — matches image names and descriptions" },
    ],
    example: "NAME       DESCRIPTION                    STARS   OFFICIAL   AUTOMATED\nubuntu     Ubuntu is a Debian-based …     15000   [OK]",
    why: "The first result with the highest star count and [OK] in the OFFICIAL column is the image maintained by the vendor or Docker — prefer these for base images.",
  },

  {
    id: 302,
    section: "images",
    sectionTitle: "Part 3 – Images & Containers",
    commandTitle: "Pull a specific image tag",
    command: "docker image pull ubuntu && docker image pull ubuntu:latest && docker image pull ubuntu:14.10",
    searchTerms: "docker pull image tag latest version ubuntu",
    description: "Pulls the ubuntu image with three equivalent or specific tags. The first two are identical — omitting a tag defaults to <code>:latest</code>. The third pulls a specific older version.",
    parts: [
      { text: "docker image pull ubuntu", explanation: "pulls ubuntu:latest — the tag is inferred when omitted" },
      { text: "docker image pull ubuntu:latest", explanation: "identical to the above — explicit form" },
      { text: "docker image pull ubuntu:14.10", explanation: "pulls a specific version tag — different image layers from latest" },
    ],
    example: "14.10: Pulling from library/ubuntu\nStatus: Downloaded newer image for ubuntu:14.10",
    why: "Always pin image tags in production. Using <code>:latest</code> means the image can change silently between pulls and break reproducible builds.",
  },

  {
    id: 303,
    section: "images",
    sectionTitle: "Part 3 – Images & Containers",
    commandTitle: "List local images",
    command: "docker image ls",
    searchTerms: "docker image ls list show local images",
    description: "Lists every image stored in the local Docker image cache, showing repository name, tag, image ID, creation date, and size.",
    parts: [
      { text: "docker image ls", explanation: "reads the local image store and prints a formatted table — does not contact Docker Hub" },
    ],
    example: "REPOSITORY   TAG       IMAGE ID       CREATED        SIZE\nubuntu       latest    bf3dc08bfed0   2 weeks ago    77.8MB\nubuntu       14.10     a185fdae6c4a   5 years ago    229MB",
    why: "Use this to confirm a pull succeeded, check image sizes before deploying, or find the ID needed for other commands.",
  },

  {
    id: 304,
    section: "images",
    sectionTitle: "Part 3 – Images & Containers",
    commandTitle: "Run an interactive container",
    command: "docker container run -it ubuntu:14.10",
    searchTerms: "docker run interactive terminal tty it ubuntu container shell",
    description: "Creates and starts a container from the <code>ubuntu:14.10</code> image with an interactive terminal attached. You land directly in a bash shell inside the container.",
    parts: [
      { text: "docker container run", explanation: "creates and starts a new container" },
      { text: "-i", explanation: "keeps STDIN open — required for interactive input" },
      { text: "-t", explanation: "allocates a pseudo-TTY — gives you a proper terminal prompt" },
      { text: "ubuntu:14.10", explanation: "the image to base the container on" },
    ],
    example: "root@35ac9218a880:/# ls\nbin  boot  dev  etc  home …\nroot@35ac9218a880:/# ps ax\n  PID TTY  STAT  TIME COMMAND\n    1 ?    Ss    0:00 /bin/bash",
    why: "The <code>-it</code> combination is the standard way to get a shell inside a container for exploration or debugging.",
  },

  {
    id: 305,
    section: "images",
    sectionTitle: "Part 3 – Images & Containers",
    commandTitle: "Detach from container without stopping it",
    command: "# Press Ctrl+P then Ctrl+Q",
    searchTerms: "docker detach container ctrl p q background running",
    description: "Pressing <kbd>Ctrl+P</kbd> followed by <kbd>Ctrl+Q</kbd> inside an interactive container detaches your terminal from the container while leaving it running in the background.",
    parts: [
      { text: "Ctrl+P", explanation: "first key in the detach sequence — puts the terminal in 'escape' mode" },
      { text: "Ctrl+Q", explanation: "second key — completes the detach and returns you to the host shell" },
    ],
    example: "root@35ac9218a880:/# \nread escape sequence\n[devops@docker ~]$",
    why: "Unlike <code>exit</code>, this detach sequence keeps the container's main process alive — essential when you want to re-attach later.",
  },

  {
    id: 306,
    section: "images",
    sectionTitle: "Part 3 – Images & Containers",
    commandTitle: "List running containers",
    command: "docker container ls",
    searchTerms: "docker container ls list running ps show",
    description: "Displays all currently running containers with their ID, base image, command, creation time, status, exposed ports, and name.",
    parts: [
      { text: "docker container ls", explanation: "queries the Docker daemon for all containers in the 'running' state" },
    ],
    example: "CONTAINER ID  IMAGE         COMMAND      CREATED        STATUS        PORTS   NAMES\n35ac9218a880  ubuntu:14.10  \"/bin/bash\"  8 minutes ago  Up 8 minutes          cocky_fermat",
    why: "The container ID and auto-generated name shown here are used in subsequent <code>attach</code>, <code>stop</code>, and <code>rm</code> commands.",
  },

  {
    id: 307,
    section: "images",
    sectionTitle: "Part 3 – Images & Containers",
    commandTitle: "Re-attach to a running container",
    command: "docker container attach 35ac9218a880",
    searchTerms: "docker attach container id name reconnect terminal",
    description: "Re-connects your terminal's stdin/stdout to the main process of a running container. Use either the container ID or its auto-generated name.",
    parts: [
      { text: "docker container attach", explanation: "connects the current terminal to the container's main process streams" },
      { text: "35ac9218a880", explanation: "the container ID from docker container ls — can be shortened to the first few unique characters, or replaced with the container name" },
    ],
    example: "root@35ac9218a880:/#",
    why: "After detaching with Ctrl+P Ctrl+Q you must use <code>attach</code> (not <code>run</code>) to get back in — <code>run</code> would create a brand-new container.",
  },

  {
    id: 308,
    section: "images",
    sectionTitle: "Part 3 – Images & Containers",
    commandTitle: "List all containers including stopped",
    command: "docker container ls -a",
    searchTerms: "docker container ls -a all stopped exited list",
    description: "Lists every container regardless of state — running, stopped, or created-but-never-started. Stopped containers still occupy disk space until removed.",
    parts: [
      { text: "docker container ls", explanation: "queries the Docker daemon for containers" },
      { text: "-a", explanation: "include all states, not just 'running'" },
    ],
    example: "CONTAINER ID  IMAGE         STATUS                    NAMES\n35ac9218a880  ubuntu:14.10  Exited (0) 2 minutes ago  cocky_fermat",
    why: "Containers don't disappear when they exit — <code>ls -a</code> is the only way to see them and is the first step before pruning or restarting.",
  },

  {
    id: 309,
    section: "images",
    sectionTitle: "Part 3 – Images & Containers",
    commandTitle: "Create a container without starting it",
    command: "docker container create -it --name ubuntu-14 ubuntu /bin/bash",
    searchTerms: "docker container create name interactive without start",
    description: "Allocates a new container with all its configuration — filesystem layer, networking, name — but does not start the process. The container sits in 'created' state until explicitly started.",
    parts: [
      { text: "docker container create", explanation: "sets up the container spec and writable layer without running anything" },
      { text: "-it", explanation: "reserve a TTY so the container is interactive when started later" },
      { text: "--name ubuntu-14", explanation: "assigns a human-readable name to use instead of the container ID" },
      { text: "ubuntu /bin/bash", explanation: "the image and the command that will run when the container is started" },
    ],
    example: "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
    why: "The create + start split mirrors how orchestrators work: they create container specs first, then schedule and start them separately.",
  },

  {
    id: 310,
    section: "images",
    sectionTitle: "Part 3 – Images & Containers",
    commandTitle: "Start a created container & attach",
    command: "docker container start -ai ubuntu-14",
    searchTerms: "docker container start attach interactive ai name",
    description: "Starts a previously created (but not running) container and immediately attaches your terminal to it interactively.",
    parts: [
      { text: "docker container start", explanation: "starts the container's main process" },
      { text: "-a", explanation: "attach stdout and stderr to your terminal" },
      { text: "-i", explanation: "connect stdin — required for an interactive shell" },
      { text: "ubuntu-14", explanation: "the container name assigned at create time" },
    ],
    example: "root@b2c3d4e5f6a7:/#",
    why: "<code>start -ai</code> is the post-create equivalent of <code>run -it</code> — it starts the container and drops you straight into its shell.",
  },

  {
    id: 311,
    section: "images",
    sectionTitle: "Part 3 – Images & Containers",
    commandTitle: "Stop a container",
    command: "docker container stop ubuntu-14",
    searchTerms: "docker container stop name graceful sigterm",
    description: "Sends SIGTERM to the container's main process, waits up to 10 seconds for it to exit gracefully, then sends SIGKILL if it has not stopped.",
    parts: [
      { text: "docker container stop", explanation: "graceful shutdown — SIGTERM first, then SIGKILL after timeout" },
      { text: "ubuntu-14", explanation: "the container name or ID to stop" },
    ],
    example: "ubuntu-14",
    why: "Prefer <code>stop</code> over <code>kill</code>: the SIGTERM grace period lets the process flush buffers, close DB connections, and finish in-flight requests.",
  },

  {
    id: 312,
    section: "images",
    sectionTitle: "Part 3 – Images & Containers",
    commandTitle: "Remove a container & prune all stopped",
    command: "docker container rm ubuntu-14 && docker container prune",
    searchTerms: "docker container rm remove prune delete stopped cleanup",
    description: "Removes a specific stopped container by name, then prunes every other stopped container in one sweep to reclaim disk space.",
    parts: [
      { text: "docker container rm ubuntu-14", explanation: "deletes the named container's writable layer and metadata — must be stopped first" },
      { text: "docker container prune", explanation: "removes all containers in exited or created state in one operation" },
    ],
    example: "ubuntu-14\nDeleted Containers:\nb2c3d4e5f6a7\nTotal reclaimed space: 12.3MB",
    why: "Every stopped container holds a writable filesystem layer on disk. Regular pruning keeps storage tidy — especially on long-running dev machines.",
  },

  // ── Part 4: Export, Import & Save ────────────────────────────────────────

  {
    id: 401,
    section: "export",
    sectionTitle: "Part 4 – Export, Import & Save",
    commandTitle: "Export a container to a tar archive",
    command: "docker container run --name my-alpine -it alpine && docker container export -o my-alpine.tar my-alpine",
    searchTerms: "docker export container tar archive alpine snapshot",
    description: "Runs an Alpine container, then exports its entire merged filesystem as a <code>.tar</code> archive. All image layers are flattened into a single flat archive — metadata like CMD and ENV is stripped.",
    parts: [
      { text: "docker container run --name my-alpine -it alpine", explanation: "starts an interactive Alpine container — you can make changes inside before exporting" },
      { text: "docker container export", explanation: "dumps the container filesystem (all layers merged) into a tar archive" },
      { text: "-o my-alpine.tar", explanation: "writes the archive to this file on the host" },
      { text: "my-alpine", explanation: "the source container name" },
    ],
    example: "$ ls -lh my-alpine.tar\n-rw-r--r-- 1 devops devops 7.5M my-alpine.tar",
    why: "Export produces a portable filesystem snapshot. Unlike <code>image save</code>, it strips layer history and metadata — useful for migrating container state but not for reproducible builds.",
  },

  {
    id: 402,
    section: "export",
    sectionTitle: "Part 4 – Export, Import & Save",
    commandTitle: "Import a tar archive as a new image",
    command: "docker image import my-alpine.tar --change \"CMD /bin/sh\" my-new-alpine",
    searchTerms: "docker image import tar archive change cmd create new image",
    description: "Creates a new single-layer image from an exported container archive. The <code>--change</code> flag re-injects Dockerfile instructions (such as CMD) that were stripped during export.",
    parts: [
      { text: "docker image import my-alpine.tar", explanation: "reads the tar archive and creates a new image with a single layer" },
      { text: "--change \"CMD /bin/sh\"", explanation: "injects a Dockerfile instruction into the imported image metadata — needed because export strips CMD and ENV" },
      { text: "my-new-alpine", explanation: "the name to give the new image" },
    ],
    example: "sha256:a1b2c3d4e5f6…\n$ docker container run -it my-new-alpine\n/ # ls\nbin  dev  etc  home  lib  media  mnt  readme.txt …",
    why: "Without <code>--change \"CMD …\"</code> the imported image has no default command and containers started from it will immediately exit.",
  },

  {
    id: 403,
    section: "export",
    sectionTitle: "Part 4 – Export, Import & Save",
    commandTitle: "Save an image to tar & load it back",
    command: "docker image pull busybox && docker image save -o busybox.tar busybox && docker image rm busybox && docker image load -i busybox.tar",
    searchTerms: "docker image save load tar transfer airgap busybox",
    description: "Saves a full image — all layers and metadata intact — to a tar file. After removing the local image to simulate a fresh host, loads it back from the tar. Unlike export/import, save/load preserves all layer hashes and tags.",
    parts: [
      { text: "docker image save -o busybox.tar busybox", explanation: "archives the complete image including all layers and the tag manifest" },
      { text: "docker image rm busybox", explanation: "deletes the local image to simulate moving to a different host" },
      { text: "docker image load -i busybox.tar", explanation: "restores the image exactly as it was — all layers, IDs, and tags preserved" },
    ],
    example: "$ docker image load -i busybox.tar\nLoaded image: busybox:latest",
    why: "<code>save</code>/<code>load</code> is the right tool for air-gapped environments where Docker Hub is unreachable — the full image arrives on the target host without any registry.",
  },

  // ── Part 5: Create Image from Container ──────────────────────────────────

  {
    id: 501,
    section: "commit",
    sectionTitle: "Part 5 – Create Image from Container",
    commandTitle: "Commit a running container as a new image",
    command: "docker container run --name=my-ubuntu -it ubuntu && docker container commit --author \"SoftUni Student\" my-ubuntu new-ubuntu",
    searchTerms: "docker commit container image snapshot author save state",
    description: "Snapshots the current filesystem state of a container — including any changes made during its lifetime — and saves it as a new reusable image.",
    parts: [
      { text: "docker container run --name=my-ubuntu -it ubuntu", explanation: "starts an interactive Ubuntu container — make any changes you want before committing" },
      { text: "docker container commit", explanation: "creates a new image layer capturing all filesystem changes relative to the base image" },
      { text: "--author \"SoftUni Student\"", explanation: "records metadata in the image manifest — visible in docker image inspect" },
      { text: "my-ubuntu", explanation: "the source container (can be running or stopped)" },
      { text: "new-ubuntu", explanation: "the name for the new image" },
    ],
    example: "$ docker image ls new-ubuntu\nREPOSITORY   TAG     IMAGE ID       SIZE\nnew-ubuntu   latest  c3b2a1f6e5d4   77.8MB",
    why: "Commit is fast for capturing ad-hoc experiments, but is not reproducible. Prefer Dockerfiles when you need a build that can be re-run consistently.",
  },

  {
    id: 502,
    section: "commit",
    sectionTitle: "Part 5 – Create Image from Container",
    commandTitle: "Run a container from the committed image",
    command: "docker container run -it new-ubuntu && docker container ls -f name=my-ubuntu",
    searchTerms: "docker run committed image new-ubuntu verify test",
    description: "Starts a container from the newly committed image to verify it works, and uses a filter to check the status of the original source container.",
    parts: [
      { text: "docker container run -it new-ubuntu", explanation: "starts an interactive container from the image created by commit" },
      { text: "docker container ls -f name=my-ubuntu", explanation: "-f filters the listing by container name — confirms whether my-ubuntu is still running" },
    ],
    example: "root@fc0bc2b9b8ab:/# exit\n\nCONTAINER ID  IMAGE      STATUS   NAMES\na1b2c3d4e5f6  ubuntu     Up       my-ubuntu",
    why: "Always test a committed image before relying on it. The <code>-f</code> filter is more precise than grepping the full listing.",
  },

  // ── Part 6: Build Images from Dockerfiles ────────────────────────────────

  {
    id: 601,
    section: "build",
    sectionTitle: "Part 6 – Build Images from Dockerfiles",
    commandTitle: "Build image from a heredoc (inline Dockerfile)",
    command: "docker image build -t alp-htop - << EOF\nFROM alpine\nRUN apk --no-cache add htop\nEOF",
    searchTerms: "docker build heredoc inline dockerfile stdin eof tag alpine htop",
    description: "Uses a bash heredoc to pass an inline Dockerfile to <code>docker image build</code> via stdin — no file on disk required. Builds an Alpine image with htop installed.",
    parts: [
      { text: "docker image build -t alp-htop -", explanation: "builds and tags the image; the trailing dash tells Docker to read the Dockerfile from stdin" },
      { text: "<< EOF … EOF", explanation: "bash heredoc: feeds everything between the EOF markers into stdin" },
      { text: "FROM alpine", explanation: "base image — Alpine is chosen for its tiny footprint (~5 MB)" },
      { text: "RUN apk --no-cache add htop", explanation: "installs htop without caching the package index, keeping the layer small" },
    ],
    example: "$ docker container run -it alp-htop\n/ # htop\n# (htop TUI appears)\n/ # exit",
    why: "Heredoc builds are great for rapid prototyping and CI one-liners where you do not want to manage a separate Dockerfile on disk.",
  },

  {
    id: 602,
    section: "build",
    sectionTitle: "Part 6 – Build Images from Dockerfiles",
    commandTitle: "Build nginx image — Dockerfile v1 (two RUN layers)",
    command: "mkdir nginx-1 && cd nginx-1 && touch Dockerfile && docker image build -t nginx-1 . && docker container run -d -p 8080:80 --name web-1 nginx-1",
    searchTerms: "docker build dockerfile nginx two run layers ubuntu apt-get",
    description: "Creates a directory, writes a Dockerfile with two separate <code>RUN</code> instructions (update and install as distinct layers), builds the image, and starts a detached nginx container on port 8080.",
    parts: [
      { text: "mkdir nginx-1 && cd nginx-1", explanation: "creates an isolated build context directory and enters it" },
      { text: "touch Dockerfile", explanation: "creates the Dockerfile — edit it to contain the FROM/LABEL/RUN/ENTRYPOINT/EXPOSE instructions" },
      { text: "docker image build -t nginx-1 .", explanation: "builds the image from the Dockerfile in the current directory (.), tags it nginx-1" },
      { text: "docker container run -d -p 8080:80 --name web-1 nginx-1", explanation: "-d runs detached; -p maps host 8080 → container 80; --name gives it a stable name" },
    ],
    example: "FROM ubuntu\nLABEL maintainer=\"SoftUni Student\"\nRUN apt-get update\nRUN apt-get install -y nginx\nENTRYPOINT [\"/usr/sbin/nginx\",\"-g\",\"daemon off;\"]\nEXPOSE 80\n\n# Visit http://localhost:8080 → nginx default page",
    why: "Each <code>RUN</code> instruction creates a separate image layer. Two RUN lines means two layers and two cache entries — important for understanding layer efficiency.",
  },

  {
    id: 603,
    section: "build",
    sectionTitle: "Part 6 – Build Images from Dockerfiles",
    commandTitle: "Build nginx image — Dockerfile v2 (chained RUN)",
    command: "mkdir nginx-2 && cd nginx-2 && touch Dockerfile && docker image build -t nginx-2 . && docker container run -d -p 8080:80 --name web-2 nginx-2",
    searchTerms: "docker build dockerfile nginx chained run single layer best practice",
    description: "Identical end result to nginx-1 but uses a single chained <code>RUN</code> instruction (update && install) — producing fewer layers and a smaller image.",
    parts: [
      { text: "RUN apt-get update && apt-get install -y nginx", explanation: "chains both commands in one RUN — creates a single layer instead of two" },
      { text: "docker image build -t nginx-2 .", explanation: "builds from the Dockerfile in the current directory, tags it nginx-2" },
    ],
    example: "FROM ubuntu\nLABEL maintainer=\"SoftUni Student\"\nRUN apt-get update && apt-get install -y nginx\nENTRYPOINT [\"/usr/sbin/nginx\",\"-g\",\"daemon off;\"]\nEXPOSE 80",
    why: "Chaining commands with <code>&&</code> in a single RUN is a Dockerfile best practice — fewer layers means a smaller image and faster pulls.",
  },

  {
    id: 604,
    section: "build",
    sectionTitle: "Part 6 – Build Images from Dockerfiles",
    commandTitle: "Compare image layer history",
    command: "docker image history nginx-1 && docker image history nginx-2",
    searchTerms: "docker image history layers compare size nginx-1 nginx-2",
    description: "Prints the complete layer history for both nginx images side by side. Reveals that nginx-1 has more layers than nginx-2 because of the split <code>RUN</code> instructions.",
    parts: [
      { text: "docker image history nginx-1", explanation: "lists each layer of nginx-1 with the command that created it and its size" },
      { text: "docker image history nginx-2", explanation: "same for nginx-2 — compare the number of layers and total size" },
    ],
    example: "nginx-1: 11 layers — apt-get update (38.5 MB) + apt-get install (56.5 MB) as separate rows\nnginx-2:  9 layers — combined update+install (95 MB) in one row",
    why: "This comparison makes the layer cost of each <code>RUN</code> concrete. Merging commands is the single most impactful Dockerfile optimisation for image size.",
  },

  {
    id: 605,
    section: "build",
    sectionTitle: "Part 6 – Build Images from Dockerfiles",
    commandTitle: "ENTRYPOINT + CMD — overridable default argument",
    command: "mkdir entry-cmd && cd entry-cmd && docker image build -t pinger . && docker container run --name=p1 pinger && docker container run --name=p2 pinger www.softuni.bg",
    searchTerms: "docker entrypoint cmd exec form override argument ping pinger",
    description: "Builds an image where ENTRYPOINT fixes the executable (<code>ping -c 4</code>) and CMD supplies an overridable default argument. Demonstrates that callers can change the target host without touching the entrypoint.",
    parts: [
      { text: "ENTRYPOINT [\"ping\", \"-c\", \"4\"]", explanation: "exec-form entrypoint — fixed executable, cannot be overridden at run time without --entrypoint" },
      { text: "CMD [\"www.softuni.bg\"]", explanation: "exec-form default argument — replaced by anything passed after the image name in docker run" },
      { text: "docker container run --name=p1 pinger", explanation: "runs with the default CMD: pings www.softuni.bg 4 times" },
      { text: "docker container run --name=p2 pinger www.softuni.bg", explanation: "overrides CMD with a different host — ENTRYPOINT stays as ping -c 4" },
    ],
    example: "FROM busybox\nLABEL description=\"ENTRYPOINT vs CMD demo\" maintainer=\"SoftUni Student\"\nENTRYPOINT [\"ping\", \"-c\", \"4\"]\nCMD [\"www.softuni.bg\"]",
    why: "Using exec-form ENTRYPOINT + CMD makes the image behave like a CLI tool — the image IS the command, and arguments are just parameters the caller can swap.",
  },

  // ── Part 7: Cleanup ───────────────────────────────────────────────────────

  {
    id: 701,
    section: "cleanup",
    sectionTitle: "Part 7 – Cleanup",
    commandTitle: "Stop all running containers",
    command: "docker container stop $(docker container ls -q)",
    searchTerms: "docker stop all containers running bulk command substitution",
    description: "Stops every running container in one command using shell command substitution to feed all running container IDs into <code>docker container stop</code>.",
    parts: [
      { text: "docker container ls -q", explanation: "-q (quiet) prints only container IDs — perfect for piping into another command" },
      { text: "$(…)", explanation: "command substitution — the shell runs the inner command and inserts its output as arguments to stop" },
      { text: "docker container stop", explanation: "sends SIGTERM to each container, waits, then SIGKILL if needed" },
    ],
    example: "a7f3d91bc2e4\nb2c3d4e5f6a7\nc3d4e5f6a7b8",
    why: "A quick way to halt everything before cleanup. Without stopping them first, <code>rm</code> would fail on running containers.",
  },

  {
    id: 702,
    section: "cleanup",
    sectionTitle: "Part 7 – Cleanup",
    commandTitle: "Prune all stopped containers & remove all images",
    command: "docker container prune && docker image rm $(docker image ls -q)",
    searchTerms: "docker prune container image rm remove all cleanup reset",
    description: "Removes every stopped container in one step, then deletes all locally cached images. Returns Docker to a near-fresh state.",
    parts: [
      { text: "docker container prune", explanation: "removes all containers in exited or created state, reclaiming their writable layers" },
      { text: "docker image ls -q", explanation: "lists all image IDs including intermediate layers" },
      { text: "docker image rm $(…)", explanation: "deletes every image; images in use by running containers are protected by Docker" },
    ],
    example: "Deleted Containers:\na7f3d91bc2e4  b2c3d4e5f6a7\nTotal reclaimed space: 18.4MB\n\nUntagged: ubuntu:latest\nDeleted: sha256:bf3dc08bfed0…",
    why: "Docker accumulates image layers, container filesystems, and build cache quickly. Running this periodically prevents storage exhaustion on dev machines.",
  },

];