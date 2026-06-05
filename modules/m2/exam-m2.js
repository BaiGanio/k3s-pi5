// modules/m2/exam-m2.js
// M2 Exam — Introduction to Docker (consolidated homework + practice).
// Source: exam.md (Homework-M2 + Practice-M2). The original exam targets CentOS 7
// (yum, devicemapper); this version is adapted to the project's platform —
// Raspberry Pi OS / Apple Silicon (Debian-based, apt, overlay2, multi-arch ARM64
// images) — so every command runs natively on the Pi 5 and the M1 Pro.
// pageBlocks format.

window.pageBlocks = [

  // ── Intro ──────────────────────────────────────────────────────────────────
  {
    type: 'prose',
    title: 'About this exam',
    content: `
      <p>
        This exam consolidates everything from <strong>Module 2 — Introduction to Docker</strong>
        into one end-to-end walkthrough. Work through the parts in order: each builds on the last,
        and together they take you from a clean machine with no Docker, all the way to building and
        running your own image from a <code>Dockerfile</code>.
      </p>
      <p>The eight parts mirror the exam paper:</p>
      <ul>
        <li><strong>A — Install &amp; configure</strong> Docker Engine and run your first containers.</li>
        <li><strong>B — Images &amp; containers</strong> — search, pull, run, attach, and the full container lifecycle.</li>
        <li><strong>C — Transfer</strong> — <code>export</code>/<code>import</code> a container and <code>save</code>/<code>load</code> an image.</li>
        <li><strong>D — Commit</strong> a running container into a reusable image.</li>
        <li><strong>E — Dockerfiles</strong> — build nginx two ways and compare image layers.</li>
        <li><strong>F — ENTRYPOINT vs CMD</strong> — the fixed command vs its overridable arguments.</li>
        <li><strong>G — Cleanup</strong> — return the machine to a clean state.</li>
        <li><strong>H — Homework</strong> — build an Apache image that serves your own page.</li>
      </ul>
    `,
  },
  {
    type: 'note',
    variant: 'info',
    content: 'The original exam (<code>Homework-M2</code> / <code>Practice-M2</code>) targets <strong>CentOS 7</strong> with <code>yum</code> and the <code>devicemapper</code> storage driver. This module is adapted to the project\'s platform — <strong>Raspberry Pi OS / Apple Silicon</strong> (Debian-based, <code>apt</code>, the modern <code>overlay2</code> driver, and multi-arch <code>arm64</code> images). The Docker concepts and subcommands are identical; only the host package manager and a few defaults differ. Where the CentOS original diverges, a 💡 note calls it out.',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PART A — INSTALL & CONFIGURE
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Part A — Install & configure Docker Engine',
    content: `
      <p>
        Docker CE is not in the default Raspberry Pi OS / Debian repositories, so you add Docker's
        official APT repository, install the engine, start it under <code>systemd</code>, and run a
        smoke-test container. You finish by wiring up rootless usage and confirming the storage
        driver — the same post-install hygiene the exam asks for on CentOS.
      </p>
    `,
  },
  {
    type: 'commands',
    section: 'install',
    sectionTitle: 'Part A — Install & configure',
    items: [
      {
        id: 1,
        commandTitle: 'Remove any old Docker packages',
        command: 'sudo apt-get remove -y docker docker-engine docker.io containerd runc',
        searchTerms: 'remove old docker apt purge legacy uninstall containerd runc clean slate',
        description: 'Wipes any distro-packaged Docker before installing Docker CE, so old package names cannot conflict. Silently skips anything not installed.',
        parts: [
          { text: 'sudo apt-get remove -y', explanation: 'removes the listed packages without prompting; missing ones are ignored' },
          { text: 'docker docker-engine docker.io containerd runc', explanation: "the legacy Debian/Ubuntu Docker package names plus the old runtimes" },
        ],
        example: 'Package \'docker-engine\' is not installed, so not removed\nPackage \'docker.io\' is not installed, so not removed',
        why: '💡 On CentOS this is the long <code>yum remove docker docker-client …</code> line from the exam. Same intent — guarantee a clean slate before the official CE install.',
      },
      {
        id: 2,
        commandTitle: 'Add Docker\'s official APT repository',
        command: 'sudo install -m 0755 -d /etc/apt/keyrings && curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg && echo "deb [arch=arm64 signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list',
        searchTerms: 'docker apt repository gpg key keyrings debian arm64 sources.list add repo',
        description: 'Fetches and stores Docker\'s package-signing key, then registers the official <code>arm64</code> Docker CE repo for your Pi OS / Debian release codename.',
        parts: [
          { text: 'install -m 0755 -d /etc/apt/keyrings', explanation: 'creates the directory APT uses for repository signing keys' },
          { text: 'curl … gpg | gpg --dearmor', explanation: "downloads Docker's signing key and stores it so apt can verify the packages are authentic" },
          { text: 'deb [arch=arm64 …]', explanation: 'pins the repo to the ARM64 packages — matching the native architecture of the Pi 5 / Apple Silicon' },
          { text: '$(. /etc/os-release && echo $VERSION_CODENAME)', explanation: 'expands to your release codename (e.g. bookworm) so the right repo is selected' },
        ],
        example: 'deb [arch=arm64 signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable',
        why: '💡 The CentOS exam does this with <code>yum-config-manager --add-repo …/centos/docker-ce.repo</code>. The Debian equivalent is a signed-key + <code>sources.list.d</code> entry, which is the modern, secure way to add a third-party repo.',
      },
      {
        id: 3,
        commandTitle: 'Install Docker CE',
        command: 'sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin',
        searchTerms: 'install docker-ce apt update engine cli containerd buildx compose plugin',
        description: 'Refreshes the package index (now including Docker\'s repo) and installs the engine, CLI, container runtime, and the buildx/compose plugins.',
        parts: [
          { text: 'sudo apt-get update', explanation: 'rebuilds the package index so the newly added Docker repo is visible' },
          { text: 'docker-ce docker-ce-cli', explanation: 'the Docker daemon (dockerd) and the docker command-line client' },
          { text: 'containerd.io', explanation: 'the low-level container runtime the daemon drives' },
          { text: 'docker-buildx-plugin docker-compose-plugin', explanation: 'modern build backend and the `docker compose` subcommand' },
        ],
        example: 'Setting up docker-ce (5:27.x.x) ...\nCreated symlink /etc/systemd/system/multi-user.target.wants/docker.service → /lib/systemd/system/docker.service.',
        why: '💡 Replaces the exam\'s <code>yum makecache fast && yum install docker-ce</code>. On Debian, <code>apt-get update</code> plays the role of <code>makecache</code>.',
      },
      {
        id: 4,
        commandTitle: 'Start Docker and verify',
        command: 'sudo systemctl enable --now docker && sudo systemctl status docker && sudo docker version && sudo docker system info',
        searchTerms: 'systemctl enable now start docker status version system info verify boot',
        description: 'Enables Docker on boot and starts it immediately, confirms the service is active, then prints client/server versions and the full system configuration (storage driver, cgroups, container counts).',
        parts: [
          { text: 'systemctl enable --now docker', explanation: 'enables the service at boot AND starts it right now in one command' },
          { text: 'systemctl status docker', explanation: 'shows whether the daemon is active, with recent log lines — first place to look if anything is wrong' },
          { text: 'docker version', explanation: 'prints client and server versions — confirms the CLI can reach the daemon' },
          { text: 'docker system info', explanation: 'shows OS, kernel, storage driver, cgroup driver, and running-container counts' },
        ],
        example: '● docker.service - Docker Application Container Engine\n   Active: active (running)\n Server Version: 27.x.x\n Storage Driver: overlay2\n OSType: linux\n Architecture: aarch64',
        why: 'Always verify after install. <code>aarch64</code> / <code>arm64</code> in the output is the proof Docker is running natively — no x86 emulation anywhere in the stack.',
      },
      {
        id: 5,
        commandTitle: 'Run your first containers',
        command: 'sudo docker container run hello-world && sudo docker container run shekeriev/welcome-dob:2018',
        searchTerms: 'docker run hello-world first container smoke test welcome-dob shekeriev course image',
        description: 'Pulls and runs the tiny <code>hello-world</code> image (the simplest end-to-end test), then the course welcome image — proving any public Docker Hub image can be pulled and run the same way.',
        parts: [
          { text: 'docker container run hello-world', explanation: 'pulls a minimal official image and runs it; it prints a success banner and exits' },
          { text: 'shekeriev/welcome-dob:2018', explanation: 'a non-official image in username/repository:tag form, from a personal Docker Hub account' },
        ],
        example: 'Hello from Docker!\nThis message shows that your installation appears to be working correctly.',
        why: 'A green <code>hello-world</code> proves the whole pipeline: Docker reaches the registry, pulls the right (arm64) image, creates a container, runs it, and streams output back.',
      },
      {
        id: 6,
        commandTitle: 'Run Docker without sudo & enable on boot',
        command: 'sudo usermod -aG docker $USER && sudo systemctl enable docker',
        searchTerms: 'usermod docker group sudo non-root permission enable boot systemctl post-install',
        description: 'Adds your user to the <code>docker</code> group so you no longer need <code>sudo</code> for every command (log out and back in for it to take effect), and confirms the daemon starts on boot.',
        parts: [
          { text: 'usermod -aG docker $USER', explanation: 'appends (-a) the current user to the docker group (-G) without removing other groups' },
          { text: '$USER', explanation: 'expands to the currently logged-in username' },
          { text: 'systemctl enable docker', explanation: 'symlinks the unit so dockerd starts automatically at every boot' },
        ],
        example: '# Log out and back in, then:\n$ docker run hello-world\nHello from Docker!',
        why: 'The Docker socket is owned by root and the <code>docker</code> group. Group membership is the least-privilege way to drop the <code>sudo</code> prefix.',
      },
      {
        id: 7,
        commandTitle: 'Confirm the storage driver',
        command: 'docker system info --format \'{{.Driver}}\'',
        searchTerms: 'storage driver overlay2 devicemapper daemon.json system info format inspect',
        description: 'Prints just the active storage driver. On Pi OS / modern Docker this is <code>overlay2</code> — the recommended default, configured (if ever needed) in <code>/etc/docker/daemon.json</code>.',
        parts: [
          { text: 'docker system info', explanation: 'dumps the full daemon configuration' },
          { text: "--format '{{.Driver}}'", explanation: 'a Go template that extracts only the storage-driver field' },
        ],
        example: 'overlay2',
        why: '💡 The exam (Part A.5/A.6) switches CentOS to <code>devicemapper</code> / direct-LVM via <code>/etc/docker/daemon.json</code>. That driver is now <strong>deprecated and removed</strong> from modern Docker — <code>overlay2</code> superseded it. The exam skill is the same (configure the daemon via <code>daemon.json</code>); only the chosen driver changed.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PART B — IMAGES & CONTAINERS
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Part B — Working with images & containers',
    content: `
      <p>
        This is the core container lifecycle: find an image, pull it, run it interactively,
        detach without killing it, re-attach, then create / start / stop / remove containers.
        These verbs (<code>run</code>, <code>attach</code>, <code>create</code>, <code>start</code>,
        <code>stop</code>, <code>rm</code>, <code>prune</code>) are the ones you will reach for every day.
      </p>
    `,
  },
  {
    type: 'note',
    variant: 'tip',
    content: 'The exam uses <code>ubuntu:14.10</code>, which has no <code>arm64</code> build. On the Pi 5 / Apple Silicon, use a multi-arch tag such as <code>ubuntu</code> (latest) or <code>ubuntu:22.04</code> — Docker pulls the <code>arm64</code> variant automatically.',
  },
  {
    type: 'commands',
    section: 'images',
    sectionTitle: 'Part B — Images & containers',
    items: [
      {
        id: 101,
        commandTitle: 'Search, pull & list images',
        command: 'docker search ubuntu && docker image pull ubuntu && docker image pull ubuntu:22.04 && docker image ls',
        searchTerms: 'docker search hub pull image tag latest list ls ubuntu',
        description: 'Searches Docker Hub for <code>ubuntu</code>, pulls the default (<code>:latest</code>) and a pinned version (<code>:22.04</code>), then lists what is now in the local image cache.',
        parts: [
          { text: 'docker search ubuntu', explanation: 'queries Docker Hub; the [OK] in the OFFICIAL column marks vendor-maintained images' },
          { text: 'docker image pull ubuntu', explanation: 'pulls ubuntu:latest — the tag is inferred when omitted' },
          { text: 'docker image pull ubuntu:22.04', explanation: 'pulls a specific, reproducible version — different layers from latest' },
          { text: 'docker image ls', explanation: 'lists local images with repository, tag, ID, age, and size — no network call' },
        ],
        example: 'NAME      DESCRIPTION                 STARS   OFFICIAL\nubuntu    Ubuntu is a Debian-based…   16000   [OK]\n\nREPOSITORY   TAG      IMAGE ID       SIZE\nubuntu       latest   bf3dc08bfed0   69.2MB\nubuntu       22.04    a8780b506fa4   69.4MB',
        why: 'Always prefer official images for bases, and pin a tag in anything reproducible — <code>:latest</code> can change silently between pulls and break builds.',
      },
      {
        id: 102,
        commandTitle: 'Run an interactive container & inspect it',
        command: 'docker container run -it ubuntu:22.04',
        searchTerms: 'docker run interactive terminal it tty ubuntu shell ls ps ax',
        description: 'Creates and starts a container from <code>ubuntu:22.04</code> with a terminal attached — you land in a shell inside it. Inside, try <code>ls</code> and <code>ps ax</code> to see the container\'s filesystem and processes.',
        parts: [
          { text: '-i', explanation: 'keeps STDIN open — required for interactive input' },
          { text: '-t', explanation: 'allocates a pseudo-TTY — gives you a real terminal prompt' },
          { text: 'ubuntu:22.04', explanation: 'the image the container is based on' },
        ],
        example: 'root@35ac9218a880:/# ps ax\n  PID TTY  STAT  TIME COMMAND\n    1 ?    Ss    0:00 /bin/bash\n    9 ?    R+    0:00 ps ax',
        why: 'Notice PID 1 is your shell — a container is just one foreground process in its own namespaces, not a full OS. That mental model explains why containers exit when their main process does.',
      },
      {
        id: 103,
        commandTitle: 'Detach without stopping, then re-attach',
        command: 'docker container ls && docker container attach <container-id>',
        searchTerms: 'docker detach ctrl p q attach reattach running background container ls',
        description: 'Press <kbd>Ctrl+P</kbd> then <kbd>Ctrl+Q</kbd> inside the container to detach while leaving it running. List running containers, then re-attach by ID or auto-generated name.',
        parts: [
          { text: 'Ctrl+P, Ctrl+Q', explanation: 'the detach sequence — returns you to the host shell but keeps the container alive' },
          { text: 'docker container ls', explanation: 'shows still-running containers, with the ID/name you need to re-attach' },
          { text: 'docker container attach <container-id>', explanation: 'reconnects your terminal to the running container\'s main process' },
        ],
        example: 'read escape sequence\n$ docker container ls\nCONTAINER ID  IMAGE         STATUS        NAMES\n35ac9218a880  ubuntu:22.04  Up 2 minutes  cocky_fermat\n$ docker container attach 35ac9218a880\nroot@35ac9218a880:/#',
        why: 'Unlike <code>exit</code> (which stops the container), the Ctrl+P Ctrl+Q detach keeps the process alive — and you must use <code>attach</code>, not <code>run</code>, to get back in (<code>run</code> would make a brand-new container).',
      },
      {
        id: 104,
        commandTitle: 'Create, start & stop a named container',
        command: 'docker container create -it --name ubuntu-22 ubuntu /bin/bash && docker container start -ai ubuntu-22',
        searchTerms: 'docker container create name start attach interactive stop lifecycle created state',
        description: 'Allocates a container in the <em>created</em> state without running it, then starts and attaches to it. Exit it, or run <code>docker container stop ubuntu-22</code> to halt it gracefully.',
        parts: [
          { text: 'docker container create -it --name ubuntu-22 …', explanation: 'builds the container spec and writable layer but does not start the process' },
          { text: 'docker container start -ai ubuntu-22', explanation: 'starts the created container and attaches stdin/stdout — the post-create equivalent of run -it' },
          { text: 'docker container stop ubuntu-22', explanation: 'sends SIGTERM, waits ~10s, then SIGKILL — a graceful shutdown' },
        ],
        example: 'b2c3d4e5f6a7…           # create prints the new ID\nroot@b2c3d4e5f6a7:/#    # start -ai drops you into the shell',
        why: 'The create-then-start split mirrors how orchestrators work: they create container specs first, then schedule and start them separately.',
      },
      {
        id: 105,
        commandTitle: 'Remove containers and an image',
        command: 'docker container stop $(docker container ls -q) && docker container rm ubuntu-22 && docker container prune && docker image rm ubuntu',
        searchTerms: 'docker stop all rm remove prune container image cleanup stopped bulk',
        description: 'Stops every running container, removes a specific one by name, prunes all remaining stopped containers, then deletes an image.',
        parts: [
          { text: 'docker container stop $(docker container ls -q)', explanation: '-q prints only IDs; command substitution feeds them all to stop' },
          { text: 'docker container rm ubuntu-22', explanation: 'deletes one stopped container\'s writable layer and metadata' },
          { text: 'docker container prune', explanation: 'removes every container in the exited/created state in one sweep' },
          { text: 'docker image rm ubuntu', explanation: 'deletes the image (fails if a container still references it)' },
        ],
        example: '35ac9218a880\nubuntu-22\nDeleted Containers:\nb2c3d4e5f6a7\nTotal reclaimed space: 12.3MB\nUntagged: ubuntu:latest',
        why: 'Stopped containers and unused images keep occupying disk. Knowing the difference between <code>rm</code> (one container), <code>prune</code> (all stopped), and <code>image rm</code> (images) is basic storage hygiene.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PART C — TRANSFER (EXPORT/IMPORT & SAVE/LOAD)
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Part C — Export / import & save / load',
    content: `
      <p>
        Two ways to move containers and images between hosts without a registry — and they are
        <em>not</em> the same:
      </p>
      <ul>
        <li><strong><code>export</code> / <code>import</code></strong> works on a <em>container</em>: it flattens the filesystem into one layer and <strong>drops metadata</strong> (CMD, ENV, history).</li>
        <li><strong><code>save</code> / <code>load</code></strong> works on an <em>image</em>: it preserves <strong>all layers, tags, and metadata</strong> exactly.</li>
      </ul>
    `,
  },
  {
    type: 'commands',
    section: 'transfer',
    sectionTitle: 'Part C — Transfer images & containers',
    items: [
      {
        id: 201,
        commandTitle: 'Export a container to a tar archive',
        command: 'docker container run -it --name my-alpine alpine sh -c "echo \'Hello from Alpine!\' > readme.txt; exit" && docker container export -o my-alpine.tar my-alpine',
        searchTerms: 'docker export container tar archive alpine readme filesystem snapshot flatten',
        description: 'Creates an Alpine container with a custom file inside, then exports its entire merged filesystem to a <code>.tar</code> archive. Layer history and metadata are stripped in the process.',
        parts: [
          { text: 'alpine sh -c "echo … > readme.txt; exit"', explanation: 'writes a custom file inside the container, then exits so the change is on disk' },
          { text: 'docker container export', explanation: 'dumps the container filesystem (all layers merged) into a tar archive' },
          { text: '-o my-alpine.tar', explanation: 'writes the archive to this file on the host' },
        ],
        example: '$ ls -lh my-alpine.tar\n-rw-r--r-- 1 pi pi 7.8M my-alpine.tar',
        why: 'Export produces a portable filesystem snapshot. It is great for migrating container <em>state</em>, but because it discards CMD/ENV and history it is not suited to reproducible builds.',
      },
      {
        id: 202,
        commandTitle: 'Import the archive as a new image',
        command: 'docker image import my-alpine.tar --change "CMD /bin/sh" my-new-alpine && docker container run -it my-new-alpine ls',
        searchTerms: 'docker image import tar change cmd new image readme verify custom file',
        description: 'Creates a single-layer image from the exported archive. Because export stripped the CMD, you re-inject one with <code>--change</code>. Running it shows your custom <code>readme.txt</code> survived the round trip.',
        parts: [
          { text: 'docker image import my-alpine.tar', explanation: 'reads the tar and creates a new image with a single flattened layer' },
          { text: '--change "CMD /bin/sh"', explanation: 'injects a Dockerfile instruction — needed because export dropped the original CMD' },
          { text: 'my-new-alpine', explanation: 'the name for the new image' },
        ],
        example: 'sha256:a1b2c3d4e5f6…\nbin   etc   readme.txt   usr\ndev   home  root         var',
        why: 'Without <code>--change "CMD …"</code> the imported image has no default command, so containers from it exit immediately. The visible <code>readme.txt</code> confirms the filesystem transferred intact.',
      },
      {
        id: 203,
        commandTitle: 'Save an image and load it back',
        command: 'docker image pull busybox && docker image save -o busybox.tar busybox && docker image rm busybox && docker image load -i busybox.tar',
        searchTerms: 'docker image save load tar busybox airgap offline transfer preserve layers tags',
        description: 'Saves the full <code>busybox</code> image — every layer and tag — to a tar, removes the local copy to simulate a fresh host, then loads it back exactly as it was.',
        parts: [
          { text: 'docker image save -o busybox.tar busybox', explanation: 'archives the complete image, including all layers and the tag manifest' },
          { text: 'docker image rm busybox', explanation: 'deletes the local image to mimic moving to a different machine' },
          { text: 'docker image load -i busybox.tar', explanation: 'restores the image exactly — all layers, IDs, and tags preserved' },
        ],
        example: 'Loaded image: busybox:latest',
        why: '<code>save</code>/<code>load</code> is the right tool for air-gapped or offline hosts (like a Pi with no registry access) — the full, reproducible image arrives without any registry in between.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PART D — COMMIT
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Part D — Create an image from a container (commit)',
    content: `
      <p>
        <code>docker commit</code> snapshots a container's current filesystem — including changes you
        made interactively — into a new, reusable image. It is fast for capturing an experiment, but
        it is <strong>not reproducible</strong>: nobody can see <em>how</em> the image was built. Prefer
        a <code>Dockerfile</code> (Part E) whenever the build needs to be repeatable.
      </p>
    `,
  },
  {
    type: 'commands',
    section: 'commit',
    sectionTitle: 'Part D — Commit a container',
    items: [
      {
        id: 301,
        commandTitle: 'Run a container and detach it',
        command: 'docker container run --name=my-ubuntu -it ubuntu',
        searchTerms: 'docker run name interactive ubuntu detach ctrl p q running commit prepare',
        description: 'Starts an interactive Ubuntu container named <code>my-ubuntu</code>. Make any changes you want inside, then detach with <kbd>Ctrl+P</kbd> <kbd>Ctrl+Q</kbd> so it keeps running.',
        parts: [
          { text: '--name=my-ubuntu', explanation: 'a stable name to reference in the commit step' },
          { text: '-it', explanation: 'interactive terminal so you can modify the container before snapshotting' },
        ],
        example: 'root@fc0bc2b9b8ab:/# apt-get install -y cowsay   # example change\nroot@fc0bc2b9b8ab:/#   (Ctrl+P, Ctrl+Q to detach)',
        why: 'Whatever you change in the running container becomes part of the image when you commit it next — that is the whole point of this part.',
      },
      {
        id: 302,
        commandTitle: 'Commit the container into a new image',
        command: 'docker container ls -f name=my-ubuntu && docker container commit --author "Exam Student" my-ubuntu new-ubuntu && docker image ls new-ubuntu',
        searchTerms: 'docker commit container image author snapshot new-ubuntu verify filter name',
        description: 'Confirms <code>my-ubuntu</code> is still running, commits its filesystem state into a new image called <code>new-ubuntu</code>, then verifies the image now exists.',
        parts: [
          { text: 'docker container ls -f name=my-ubuntu', explanation: '-f filters the listing by name to confirm the source container is up' },
          { text: 'docker container commit', explanation: 'creates a new image layer capturing all filesystem changes vs the base image' },
          { text: '--author "Exam Student"', explanation: 'records author metadata in the image manifest (visible via docker image inspect)' },
          { text: 'new-ubuntu', explanation: 'the name of the resulting image' },
        ],
        example: 'CONTAINER ID  IMAGE   STATUS   NAMES\na1b2c3d4e5f6  ubuntu  Up       my-ubuntu\nsha256:c3b2a1f6e5d4…\nREPOSITORY   TAG     IMAGE ID       SIZE\nnew-ubuntu   latest  c3b2a1f6e5d4   77.9MB',
        why: 'Commit captures ad-hoc state quickly, but the resulting image has no build recipe — which is exactly why the next part moves to Dockerfiles.',
      },
      {
        id: 303,
        commandTitle: 'Run a container from the committed image',
        command: 'docker container run -it new-ubuntu',
        searchTerms: 'docker run committed image new-ubuntu verify test',
        description: 'Starts a container from the image you just committed to confirm it works and carries the changes you made.',
        parts: [
          { text: 'docker container run -it new-ubuntu', explanation: 'runs an interactive container from the commit-created image' },
        ],
        example: 'root@7a8b9c0d1e2f:/#   # your earlier changes are present here',
        why: 'Always test a committed image before relying on it — a commit can silently capture a half-finished state.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PART E — DOCKERFILES & LAYERS
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Part E — Build images from Dockerfiles',
    content: `
      <p>
        A <code>Dockerfile</code> is the reproducible alternative to <code>commit</code>: a recipe that
        anyone can re-run to get the same image. Here you build nginx two ways that are identical
        except for how the install is split across <code>RUN</code> instructions, then compare the
        resulting layers with <code>docker image history</code>.
      </p>
      <ul>
        <li><strong>nginx-1</strong> — <code>apt-get update</code> and <code>apt-get install</code> as <em>two separate</em> <code>RUN</code> lines (more layers).</li>
        <li><strong>nginx-2</strong> — both chained in <em>one</em> <code>RUN</code> with <code>&amp;&amp;</code> (fewer layers, always-fresh index).</li>
      </ul>
    `,
  },
  {
    type: 'note',
    variant: 'warning',
    content: 'The <strong>two-RUN</strong> version (nginx-1) is the classic Docker anti-pattern. Because <code>apt-get update</code> sits in its own cached layer, a later rebuild can reuse a <em>stale</em> package index while <code>apt-get install</code> runs against it. Always chain <code>update &amp;&amp; install</code> in a single <code>RUN</code> (the nginx-2 way).',
  },
  {
    type: 'commands',
    section: 'dockerfile',
    sectionTitle: 'Part E — Dockerfiles & layers',
    items: [
      {
        id: 401,
        commandTitle: 'Write the nginx-1 Dockerfile (two RUN layers)',
        command: 'mkdir nginx-1 && cd nginx-1 && cat Dockerfile',
        searchTerms: 'dockerfile nginx ubuntu separate run apt-get update install entrypoint expose two layers',
        description: 'In a folder <code>nginx-1</code>, create this <code>Dockerfile</code>. It installs nginx using two separate <code>RUN</code> instructions — one extra layer each.',
        parts: [
          { text: 'FROM ubuntu', explanation: 'base image — Docker pulls the arm64 variant on Pi 5 / Apple Silicon' },
          { text: 'RUN apt-get update', explanation: 'refreshes the package index in its own cached layer (the stale-cache risk)' },
          { text: 'RUN apt-get install -y nginx', explanation: 'installs nginx in a second layer, against whatever index the previous layer cached' },
          { text: 'ENTRYPOINT ["/usr/sbin/nginx","-g","daemon off;"]', explanation: 'runs nginx in the foreground so the container stays alive (PID 1 must not exit)' },
          { text: 'EXPOSE 80', explanation: 'documents that the container listens on port 80 — informational only; it does not publish the port' },
        ],
        example: `FROM ubuntu
LABEL maintainer="Exam Student"
RUN apt-get update
RUN apt-get install -y nginx
ENTRYPOINT ["/usr/sbin/nginx","-g","daemon off;"]
EXPOSE 80`,
        why: 'Reading the Dockerfile top to bottom tells the whole story of the image. Each instruction is a build step — and here each RUN becomes its own layer.',
      },
      {
        id: 402,
        commandTitle: 'Write the nginx-2 Dockerfile (chained RUN)',
        command: 'cd .. && mkdir nginx-2 && cd nginx-2 && cat Dockerfile',
        searchTerms: 'dockerfile nginx chained run single layer best practice update install ampersand',
        description: 'In a sibling folder <code>nginx-2</code>, create the same image but chain update and install into a single <code>RUN</code> — one layer, and a guaranteed-fresh index.',
        parts: [
          { text: 'RUN apt-get update && apt-get install -y nginx', explanation: 'chains both commands in one RUN → a single layer; update and install always run together' },
        ],
        example: `FROM ubuntu
LABEL maintainer="Exam Student"
RUN apt-get update && apt-get install -y nginx
ENTRYPOINT ["/usr/sbin/nginx","-g","daemon off;"]
EXPOSE 80`,
        why: 'Chaining with <code>&amp;&amp;</code> is the standard Dockerfile optimisation — fewer layers, a smaller image, and no stale-index trap.',
      },
      {
        id: 403,
        commandTitle: 'Build both images',
        command: 'docker image build -t nginx-1 ./nginx-1 && docker image build -t nginx-2 ./nginx-2',
        searchTerms: 'docker build tag nginx-1 nginx-2 context directory two images',
        description: 'Builds each Dockerfile from its own folder, tagging the results <code>nginx-1</code> and <code>nginx-2</code>. The path argument is the build context.',
        parts: [
          { text: 'docker image build -t nginx-1 ./nginx-1', explanation: 'builds nginx-1/Dockerfile and tags it nginx-1' },
          { text: 'docker image build -t nginx-2 ./nginx-2', explanation: 'builds nginx-2/Dockerfile and tags it nginx-2' },
        ],
        example: '[+] Building 18.2s (8/8) FINISHED   => naming to docker.io/library/nginx-1:latest\n[+] Building 16.9s (7/7) FINISHED   => naming to docker.io/library/nginx-2:latest',
        why: 'Both produce a working nginx image — isolating the only real difference (layer count) to the build step.',
      },
      {
        id: 404,
        commandTitle: 'Run nginx and verify it serves',
        command: 'docker container run -d -p 8080:80 --name web-2 nginx-2 && curl -s localhost:8080 | head -n 5',
        searchTerms: 'docker run detached publish port nginx curl localhost 8080 verify serve expose',
        description: 'Runs nginx-2 in the background, publishing container port 80 to <code>localhost:8080</code>, then fetches the default page to confirm it serves. Open <code>http://localhost:8080</code> in a browser for the same result.',
        parts: [
          { text: '-d', explanation: 'detached — runs in the background and returns your prompt' },
          { text: '-p 8080:80', explanation: 'publishes container port 80 to host 8080 — this is what actually exposes the service (EXPOSE alone does not)' },
          { text: '--name web-2', explanation: 'a friendly name so you can stop/remove it later' },
          { text: 'curl -s localhost:8080 | head -n 5', explanation: 'quietly requests the page and prints the first 5 lines of HTML' },
        ],
        example: '<!DOCTYPE html>\n<html>\n<head>\n<title>Welcome to nginx!</title>\n<style>',
        why: '<code>EXPOSE 80</code> is only documentation — the <code>-p</code> flag is what maps the port so your Mac/Pi can reach the container.',
      },
      {
        id: 405,
        commandTitle: 'Compare the layer history',
        command: 'docker image history nginx-1 && docker image history nginx-2',
        searchTerms: 'docker image history layers compare count run apt size optimization',
        description: 'Shows each image layer-by-layer. <code>nginx-1</code> has a separate layer for <code>apt-get update</code> and another for <code>apt-get install</code>; <code>nginx-2</code> collapses both into one.',
        parts: [
          { text: 'docker image history', explanation: 'lists every layer, newest first, with the instruction that created it and its size' },
        ],
        example: '# nginx-1 — two RUN layers\n...  RUN /bin/sh -c apt-get install -y nginx   61MB\n...  RUN /bin/sh -c apt-get update             42MB\n...  /bin/sh -c #(nop) FROM ubuntu             69MB\n\n# nginx-2 — one combined layer\n...  RUN /bin/sh -c apt-get update && apt-g…  101MB\n...  /bin/sh -c #(nop) FROM ubuntu             69MB',
        why: 'This makes the cost of each <code>RUN</code> concrete: fewer layers means less metadata overhead, and update+install in one layer guarantees a fresh index every build.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PART F — ENTRYPOINT vs CMD
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Part F — ENTRYPOINT vs CMD',
    content: `
      <p>
        These two instructions confuse almost everyone — and getting them wrong is why a container
        sometimes ignores the argument you passed. The rule:
      </p>
      <ul>
        <li><strong><code>ENTRYPOINT</code></strong> is the executable — the fixed part that always runs.</li>
        <li><strong><code>CMD</code></strong> is the default <em>arguments</em> to it — the part you can override.</li>
      </ul>
      <p>
        Arguments after <code>docker run &lt;image&gt;</code> <strong>replace CMD</strong> but leave
        ENTRYPOINT in place. You will prove this with a container that wraps <code>ping</code>.
      </p>
    `,
  },
  {
    type: 'commands',
    section: 'entrypoint',
    sectionTitle: 'Part F — ENTRYPOINT vs CMD',
    items: [
      {
        id: 501,
        commandTitle: 'Write the pinger Dockerfile',
        command: 'mkdir entry-cmd && cd entry-cmd && cat Dockerfile',
        searchTerms: 'dockerfile entrypoint cmd ping busybox exec form arguments override pinger',
        description: 'In a folder <code>entry-cmd</code>, create this <code>Dockerfile</code>. <code>ENTRYPOINT</code> fixes <code>ping -c 4</code>; <code>CMD</code> supplies a default host that you can override at run time.',
        parts: [
          { text: 'FROM busybox', explanation: 'busybox includes a ping applet — no install needed, and it is tiny (~4 MB)' },
          { text: 'ENTRYPOINT ["ping", "-c", "4"]', explanation: 'the fixed command — always pings with a count of 4; run arguments cannot change it' },
          { text: 'CMD ["baiganio.github.io"]', explanation: 'the default argument appended to ENTRYPOINT — replaced when you pass your own host' },
        ],
        example: `FROM busybox
LABEL description="ENTRYPOINT vs CMD demo" maintainer="Exam Student"
ENTRYPOINT ["ping", "-c", "4"]
CMD ["baiganio.github.io"]`,
        why: 'ENTRYPOINT + CMD together is the idiomatic pattern for a container that is "one tool with a default argument" — like a CLI you can call with or without overriding the target.',
      },
      {
        id: 502,
        commandTitle: 'Build the image',
        command: 'docker image build -t pinger .',
        searchTerms: 'docker build pinger entrypoint cmd image tag latest',
        description: 'Builds the image and tags it <code>pinger</code> (defaults to <code>:latest</code>). The interesting behaviour is at run time, not build time.',
        parts: [
          { text: 'docker image build -t pinger .', explanation: 'builds from the Dockerfile in the current directory and names the image pinger:latest' },
        ],
        example: '[+] Building 1.4s (6/6) FINISHED\n => => naming to docker.io/library/pinger:latest',
        why: 'A tiny image to experiment with — what matters is how ENTRYPOINT and CMD combine when you run it.',
      },
      {
        id: 503,
        commandTitle: 'Run with the default CMD',
        command: 'docker container run --name=p1 pinger',
        searchTerms: 'docker run default cmd entrypoint ping no arguments combine p1',
        description: 'With no run arguments, Docker combines the two: <code>ENTRYPOINT</code> + <code>CMD</code> = <code>ping -c 4 baiganio.github.io</code>. The container pings four times and exits.',
        parts: [
          { text: 'docker container run --name=p1 pinger', explanation: "no trailing arguments, so the image's CMD (baiganio.github.io) is the target" },
        ],
        example: 'PING baiganio.github.io (185.199.108.153): 56 data bytes\n64 bytes from 185.199.108.153: seq=0 ttl=57 time=9.8 ms\n...\n4 packets transmitted, 4 packets received, 0% packet loss',
        why: 'This shows the two instructions working together: ENTRYPOINT decides what runs, CMD supplies the default thing it acts on.',
      },
      {
        id: 504,
        commandTitle: 'Override CMD with your own argument',
        command: 'docker container run --name=p2 pinger 1.1.1.1',
        searchTerms: 'docker run override cmd argument entrypoint ping ip replace p2',
        description: 'Anything after the image name <strong>replaces CMD</strong> but keeps ENTRYPOINT, so the command becomes <code>ping -c 4 1.1.1.1</code> — your argument took the place of the default target.',
        parts: [
          { text: 'pinger', explanation: 'the image — its ENTRYPOINT (ping -c 4) stays fixed' },
          { text: '1.1.1.1', explanation: 'your argument — replaces the default CMD, becoming the ping target' },
        ],
        example: 'PING 1.1.1.1 (1.1.1.1): 56 data bytes\n64 bytes from 1.1.1.1: seq=0 ttl=56 time=11.6 ms\n...\n4 packets transmitted, 4 packets received, 0% packet loss',
        why: 'This is the whole point: the container is locked to one tool (ping -c 4) but its target is configurable at run time. ENTRYPOINT = what it is; CMD = the default of what it acts on.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PART G — CLEANUP
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'commands',
    section: 'cleanup',
    sectionTitle: 'Part G — Cleanup',
    items: [
      {
        id: 601,
        commandTitle: 'Stop all running containers',
        command: 'docker container stop $(docker container ls -q)',
        searchTerms: 'docker stop all running containers bulk command substitution quiet',
        description: 'Stops every running container at once using command substitution to feed all running IDs into <code>stop</code>.',
        parts: [
          { text: 'docker container ls -q', explanation: '-q prints only container IDs — perfect for piping into another command' },
          { text: '$(…)', explanation: 'command substitution — the shell inserts the inner output as arguments' },
          { text: 'docker container stop', explanation: 'sends SIGTERM to each, waits, then SIGKILL if needed' },
        ],
        example: 'a7f3d91bc2e4\nb2c3d4e5f6a7\nc3d4e5f6a7b8',
        why: 'You must stop containers before removing them — <code>rm</code> refuses to delete a running container.',
      },
      {
        id: 602,
        commandTitle: 'Prune containers and remove all images',
        command: 'docker container prune -f && docker image rm $(docker image ls -q)',
        searchTerms: 'docker prune container image rm remove all cleanup reset reclaim space',
        description: 'Removes every stopped container, then deletes all locally cached images — returning the machine to a near-fresh state.',
        parts: [
          { text: 'docker container prune -f', explanation: 'removes all exited/created containers; -f skips the confirmation prompt' },
          { text: 'docker image ls -q', explanation: 'lists every image ID' },
          { text: 'docker image rm $(…)', explanation: 'deletes them all; images still in use by a container are protected' },
        ],
        example: 'Total reclaimed space: 18.4MB\nUntagged: ubuntu:latest\nUntagged: nginx-1:latest\nUntagged: nginx-2:latest',
        why: 'Docker accumulates layers, container filesystems, and build cache fast. Running this periodically prevents storage exhaustion — important on a Pi\'s SD card or modest SSD.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PART H — HOMEWORK: APACHE CONTAINER
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Part H — Homework: build an Apache container',
    content: `
      <p>
        The graded homework: write a <code>Dockerfile</code> based on <code>ubuntu</code> that updates
        packages, installs the <strong>Apache</strong> web server (<code>apache2</code>), exposes port
        80, and copies your own <code>index.html</code> into Apache's web root. Then build it, run it,
        and confirm Apache serves your page. This pulls together everything from Parts A–G.
      </p>
    `,
  },
  {
    type: 'commands',
    section: 'homework',
    sectionTitle: 'Part H — Homework: Apache image',
    items: [
      {
        id: 701,
        commandTitle: 'Create the custom index.html',
        command: 'mkdir apache-hw && cd apache-hw && cat index.html',
        searchTerms: 'homework index.html custom page apache web root hello first container',
        description: 'In a folder <code>apache-hw</code>, create the <code>index.html</code> that Apache will serve. It is the page the homework requires.',
        parts: [
          { text: 'mkdir apache-hw && cd apache-hw', explanation: 'an isolated build context to hold the Dockerfile and index.html' },
          { text: 'index.html', explanation: 'the page that gets copied into Apache\'s document root in the image' },
        ],
        example: '<h1>Hello from my first container!</h1>',
        why: 'Keeping the page in the build context means <code>COPY</code> can bake it into the image — the file becomes part of the image, not something mounted at run time.',
      },
      {
        id: 702,
        commandTitle: 'Write the Apache Dockerfile',
        command: 'cat Dockerfile',
        searchTerms: 'dockerfile ubuntu apache2 apt-get update install copy index.html expose 80 entrypoint foreground',
        description: 'Create this <code>Dockerfile</code> next to <code>index.html</code>. It starts from <code>ubuntu</code>, installs Apache in one chained <code>RUN</code> (the Part E lesson applied), copies your page into the web root, exposes port 80, and runs Apache in the foreground.',
        parts: [
          { text: 'FROM ubuntu', explanation: 'base image — arm64 variant on Pi 5 / Apple Silicon' },
          { text: 'RUN apt-get update && apt-get install -y apache2', explanation: 'updates and installs Apache in a single layer — no stale-index trap' },
          { text: 'COPY index.html /var/www/html/index.html', explanation: "copies your page into Apache's default document root, replacing the stock page" },
          { text: 'EXPOSE 80', explanation: 'documents the listening port (informational)' },
          { text: 'ENTRYPOINT ["apachectl","-D","FOREGROUND"]', explanation: 'runs Apache in the foreground so the container stays alive (PID 1 must not exit)' },
        ],
        example: `FROM ubuntu
LABEL maintainer="Exam Student" description="M2 homework — Apache on Ubuntu"
RUN apt-get update && apt-get install -y apache2
COPY index.html /var/www/html/index.html
EXPOSE 80
ENTRYPOINT ["apachectl","-D","FOREGROUND"]`,
        why: '💡 The exam allows Ubuntu or CentOS. On Ubuntu the package is <code>apache2</code> and the foreground command is <code>apachectl -D FOREGROUND</code>; on CentOS it would be <code>httpd</code>. Running in the foreground is what keeps the container running.',
      },
      {
        id: 703,
        commandTitle: 'Build the homework image',
        command: 'docker image build -t apache-hw .',
        searchTerms: 'docker build apache-hw image tag context homework',
        description: 'Builds the image from the Dockerfile and tags it <code>apache-hw</code>. The trailing <code>.</code> is the build context — where <code>index.html</code> is found.',
        parts: [
          { text: 'docker image build -t apache-hw .', explanation: 'builds from the Dockerfile in the current directory and tags the result apache-hw' },
        ],
        example: '[+] Building 24.6s (9/9) FINISHED\n => [3/3] COPY index.html /var/www/html/index.html\n => => naming to docker.io/library/apache-hw:latest',
        why: 'The COPY step in the build output confirms your page made it into the image — if the file were missing, the build would fail here.',
      },
      {
        id: 704,
        commandTitle: 'Run the container and verify',
        command: 'docker container run -d -p 8080:80 --name web-hw apache-hw && curl -s localhost:8080',
        searchTerms: 'docker run detached publish port apache curl verify homework hello first container',
        description: 'Runs the image in the background, publishing port 80 to <code>localhost:8080</code>, then fetches the page to confirm Apache serves your custom <code>index.html</code>. Open <code>http://localhost:8080</code> in a browser for the same result.',
        parts: [
          { text: '-d -p 8080:80', explanation: 'detached, publishing container port 80 to host 8080' },
          { text: '--name web-hw', explanation: 'a friendly name to stop/remove it later' },
          { text: 'curl -s localhost:8080', explanation: 'fetches the served page — should be your homework HTML' },
        ],
        example: '<h1>Hello from my first container!</h1>',
        why: 'Seeing your own heading returned by Apache is the homework\'s success criterion: a custom image you built serves a page you wrote.',
      },
      {
        id: 705,
        commandTitle: 'Clean up the homework container',
        command: 'docker rm -f web-hw',
        searchTerms: 'docker rm force remove apache homework cleanup web-hw container',
        description: 'Stops and removes the detached Apache container, freeing port 8080 and the name for next time.',
        parts: [
          { text: 'docker rm -f web-hw', explanation: 'force-removes the named container, stopping it first if still running' },
        ],
        example: 'web-hw',
        why: 'Detached containers keep running and holding the port until removed. Cleaning up avoids port conflicts and name clashes on the next run.',
      },
    ],
  },

];
