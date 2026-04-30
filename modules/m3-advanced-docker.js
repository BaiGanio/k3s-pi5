// modules/m3-advanced-docker.js
// Practice M3: Advanced Docker

window.commandData = [

  // ── Part 1: Setup — docker-machine ───────────────────────────────────────

  {
    id: 101,
    section: "setup",
    sectionTitle: "Part 1 – Setup",
    commandTitle: "Install docker-machine",
    command: "curl -L https://github.com/docker/machine/releases/download/v0.15.0/docker-machine-$(uname -s)-$(uname -m) > /tmp/docker-machine && chmod +x /tmp/docker-machine && sudo cp /tmp/docker-machine /usr/local/bin/docker-machine",
    searchTerms: "docker-machine install curl chmod copy bin linux",
    description: "Downloads the <code>docker-machine</code> v0.15.0 binary for the current OS and architecture, makes it executable, and places it in <code>/usr/local/bin</code> so it is available system-wide.",
    parts: [
      { text: "curl -L … > /tmp/docker-machine", explanation: "downloads the binary and saves it to /tmp — -L follows HTTP redirects" },
      { text: "chmod +x /tmp/docker-machine", explanation: "marks the binary as executable" },
      { text: "sudo cp … /usr/local/bin/docker-machine", explanation: "copies it to a directory on $PATH so you can call it from anywhere" },
    ],
    example: "% Total    % Received  Xferd  Average Speed  Time\n100 26.4M  100 26.4M    0     0  5231k      0  0:00:05",
    why: "docker-machine is the CLI tool that provisions and manages Docker hosts inside VirtualBox VMs. It is not bundled with Docker CE so it needs a separate install.",
  },

  {
    id: 102,
    section: "setup",
    sectionTitle: "Part 1 – Setup",
    commandTitle: "Create the default Docker host",
    command: "docker-machine create --driver virtualbox default",
    searchTerms: "docker-machine create virtualbox default driver",
    description: "Provisions a new VirtualBox VM named <code>default</code>, installs a minimal boot2docker Linux inside it, and starts a Docker daemon on TCP port 2376. This becomes your primary Docker host.",
    parts: [
      { text: "docker-machine create", explanation: "provisions a new VM and installs Docker inside it" },
      { text: "--driver virtualbox", explanation: "use VirtualBox as the hypervisor — also supports AWS, GCP, Azure, etc." },
      { text: "default", explanation: "the name for this Docker host — used in subsequent docker-machine commands" },
    ],
    example: "Creating machine...\n(default) Creating VirtualBox VM...\n(default) Starting VM...\nMachine 'default' is running.\nDocker is up and running!",
    why: "On a Linux host without native Docker installed, docker-machine gives you an isolated Docker environment inside a VM — useful for testing multi-host setups without touching the host OS.",
  },

  {
    id: 103,
    section: "setup",
    sectionTitle: "Part 1 – Setup",
    commandTitle: "List Docker machine instances",
    command: "docker-machine ls",
    searchTerms: "docker-machine ls list instances running state url",
    description: "Shows all docker-machine managed hosts with their name, active status, driver, state, URL, and Docker version. The URL column tells you the TCP address used to reach the Docker daemon.",
    parts: [
      { text: "docker-machine ls", explanation: "reads the local docker-machine state directory and prints a summary table" },
    ],
    example: "NAME     ACTIVE  DRIVER      STATE    URL                         DOCKER\ndefault  -       virtualbox  Running  tcp://192.168.99.100:2376   v18.06.1-ce",
    why: "A quick way to confirm your VMs are running and to grab the IP address you'll use to reach containers from the host browser.",
  },

  {
    id: 104,
    section: "setup",
    sectionTitle: "Part 1 – Setup",
    commandTitle: "Install standalone Docker client",
    command: "curl -L https://download.docker.com/linux/static/stable/x86_64/docker-18.06.1-ce.tgz > /tmp/docker-18.06.1-ce.tgz && tar xzvf /tmp/docker-18.06.1-ce.tgz && sudo mv docker/docker /usr/local/bin/docker && rm -rf docker/ && rm /tmp/docker-18.06.1-ce.tgz",
    searchTerms: "docker client install standalone static binary tgz tar curl",
    description: "Downloads the static Docker client binary (no daemon), extracts it, moves just the <code>docker</code> binary to <code>/usr/local/bin</code>, and cleans up the temp files. The client alone is enough to talk to a remote daemon.",
    parts: [
      { text: "curl -L … > /tmp/docker-18.06.1-ce.tgz", explanation: "downloads the tarball of the static Docker client build" },
      { text: "tar xzvf …", explanation: "extracts the tarball — produces a docker/ directory with the binary inside" },
      { text: "sudo mv docker/docker /usr/local/bin/docker", explanation: "installs only the client binary — the daemon files are left behind" },
      { text: "rm -rf docker/ && rm /tmp/…", explanation: "cleans up the extracted directory and the downloaded tarball" },
    ],
    example: "$ docker version\nClient:\n Version: 18.06.1-ce",
    why: "You only need the client binary on your workstation. The Docker daemon runs inside the VM managed by docker-machine — this separation keeps your host OS clean.",
  },

  {
    id: 105,
    section: "setup",
    sectionTitle: "Part 1 – Setup",
    commandTitle: "Point local client at a docker-machine host",
    command: "docker-machine env default && eval $(docker-machine env)",
    searchTerms: "docker-machine env eval context environment variables DOCKER_HOST",
    description: "The first command prints the shell environment variables that redirect Docker CLI calls to the <code>default</code> VM. The second command applies them in the current shell session — after this, all <code>docker</code> commands run against the remote VM, not your local daemon.",
    parts: [
      { text: "docker-machine env default", explanation: "prints DOCKER_HOST, DOCKER_TLS_VERIFY, DOCKER_CERT_PATH, and DOCKER_MACHINE_NAME for the named host" },
      { text: "eval $(docker-machine env)", explanation: "evaluates and exports those variables in the current shell — affects all subsequent docker commands" },
    ],
    example: "export DOCKER_TLS_VERIFY=\"1\"\nexport DOCKER_HOST=\"tcp://192.168.99.100:2376\"\nexport DOCKER_CERT_PATH=\"/home/user/.docker/machine/machines/default\"\nexport DOCKER_MACHINE_NAME=\"default\"",
    why: "Without setting the context, your docker CLI talks to the local daemon (or nothing). eval $(docker-machine env) is the standard way to switch which host you're targeting.",
  },

  {
    id: 106,
    section: "setup",
    sectionTitle: "Part 1 – Setup",
    commandTitle: "Clear the docker-machine context",
    command: "docker-machine env -u && eval $(docker-machine env -u) && env | grep DOCKER",
    searchTerms: "docker-machine env unset -u clear context reset DOCKER_HOST",
    description: "Unsets all the Docker environment variables set by the previous <code>eval</code>, returning the CLI to talking to the local daemon. The final <code>grep</code> confirms the variables are gone.",
    parts: [
      { text: "docker-machine env -u", explanation: "prints the unset commands for all DOCKER_* environment variables" },
      { text: "eval $(docker-machine env -u)", explanation: "actually unsets them in the current shell" },
      { text: "env | grep DOCKER", explanation: "verifies no DOCKER_* variables remain — should produce no output" },
    ],
    example: "unset DOCKER_TLS_VERIFY\nunset DOCKER_HOST\nunset DOCKER_CERT_PATH\nunset DOCKER_MACHINE_NAME\n# (grep returns nothing — context is clear)",
    why: "Leaving the context set causes every subsequent docker command to hit the VM even after you're done with it. Always clear the context when switching machines.",
  },

  {
    id: 107,
    section: "setup",
    sectionTitle: "Part 1 – Setup",
    commandTitle: "SSH into a docker-machine host",
    command: "docker-machine ssh default && docker image ls",
    searchTerms: "docker-machine ssh login shell terminal host",
    description: "Opens an interactive SSH session directly into the <code>default</code> VM. Once inside you can run Docker commands locally without needing the remote client context. This is the most reliable approach for the exercises in this module.",
    parts: [
      { text: "docker-machine ssh default", explanation: "SSHes into the named VM using the key pair docker-machine provisioned automatically" },
      { text: "docker image ls", explanation: "runs locally inside the VM — no DOCKER_HOST needed" },
    ],
    example: "[user@host ~]$ docker-machine ssh default\ndocker@default:~$ docker image ls\nREPOSITORY   TAG   IMAGE ID   CREATED   SIZE",
    why: "Working directly inside the VM avoids TLS certificate issues and environment variable confusion — what you see is exactly what is running on that host.",
  },

  // ── Part 2: Networks ──────────────────────────────────────────────────────

  {
    id: 201,
    section: "networks",
    sectionTitle: "Part 2 – Networks",
    commandTitle: "List default networks",
    command: "docker network ls",
    searchTerms: "docker network ls list bridge host none default",
    description: "Lists all networks currently defined on this Docker host. A fresh install always has three: <code>bridge</code> (the default for containers), <code>host</code> (shares the host network stack), and <code>none</code> (fully isolated).",
    parts: [
      { text: "docker network ls", explanation: "queries the Docker daemon for all defined networks and prints name, ID, driver, and scope" },
    ],
    example: "NETWORK ID     NAME      DRIVER    SCOPE\na1b2c3d4e5f6   bridge    bridge    local\nb2c3d4e5f6a7   host      host      local\nc3d4e5f6a7b8   none      null      local",
    why: "Always check the existing networks before creating a new one — naming conflicts cause errors, and understanding the defaults is essential before defining custom topologies.",
  },

  {
    id: 202,
    section: "networks",
    sectionTitle: "Part 2 – Networks",
    commandTitle: "Create a custom bridge network",
    command: "docker network create -d bridge --subnet 10.0.0.1/24 dob-bridge && docker network ls",
    searchTerms: "docker network create bridge subnet custom dob-bridge driver",
    description: "Creates a user-defined bridge network named <code>dob-bridge</code> with a specific subnet. Unlike the default bridge, user-defined bridges support automatic DNS resolution between containers by name.",
    parts: [
      { text: "docker network create", explanation: "defines a new network — Docker allocates it on the host but no containers are attached yet" },
      { text: "-d bridge", explanation: "use the bridge driver — creates a Linux bridge interface on the host" },
      { text: "--subnet 10.0.0.1/24", explanation: "pins the IP range; without this Docker picks one automatically" },
      { text: "dob-bridge", explanation: "the name of the network — used when starting containers" },
    ],
    example: "7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a\nNETWORK ID     NAME        DRIVER    SCOPE\n7f8a9b0c1d2e   dob-bridge  bridge    local",
    why: "The default bridge network does not support container name DNS — containers can only reach each other by IP. A user-defined bridge fixes this and is the recommended approach for any multi-container setup.",
  },

  {
    id: 203,
    section: "networks",
    sectionTitle: "Part 2 – Networks",
    commandTitle: "Inspect a network",
    command: "docker network inspect dob-bridge",
    searchTerms: "docker network inspect details subnet containers attached",
    description: "Prints the full JSON spec of <code>dob-bridge</code> — driver, subnet, gateway, and the list of containers currently attached to it with their assigned IPs.",
    parts: [
      { text: "docker network inspect", explanation: "fetches the network's metadata from the Docker daemon and prints it as JSON" },
      { text: "dob-bridge", explanation: "the network name to inspect — can also use the network ID" },
    ],
    example: "[{\n  \"Name\": \"dob-bridge\",\n  \"Driver\": \"bridge\",\n  \"IPAM\": { \"Config\": [{ \"Subnet\": \"10.0.0.1/24\" }] },\n  \"Containers\": {}\n}]",
    why: "inspect is the go-to command for debugging network issues — it shows exactly which containers are attached and what IPs they received, without having to exec into each one.",
  },

  {
    id: 204,
    section: "networks",
    sectionTitle: "Part 2 – Networks",
    commandTitle: "Run two containers on the same network",
    command: "docker container run -dt --name co1 --network dob-bridge node:18-alpine sleep 1d && docker container run -dt --name co2 --network dob-bridge node:18-alpine sleep 1d",
    searchTerms: "docker run network dob-bridge two containers name node alpine detach",
    description: "Starts two detached containers on <code>dob-bridge</code>. Both get IPs from the 10.0.0.0/24 range and can resolve each other by container name — no manual <code>/etc/hosts</code> editing needed.",
    parts: [
      { text: "-dt", explanation: "-d detaches the container, -t allocates a TTY — useful for containers you want to exec into later" },
      { text: "--name co1 / co2", explanation: "gives each container a stable name usable for DNS resolution on this network" },
      { text: "--network dob-bridge", explanation: "attaches the container to our custom bridge — both containers share this network segment" },
      { text: "sleep 1d", explanation: "keeps the container alive for 1 day — a placeholder process so the container does not exit immediately" },
    ],
    example: "a1b2c3d4e5f6  # co1 container ID\nb2c3d4e5f6a7  # co2 container ID",
    why: "Running both containers on the same user-defined bridge is the minimal setup to demonstrate container-to-container networking with DNS name resolution.",
  },

  {
    id: 205,
    section: "networks",
    sectionTitle: "Part 2 – Networks",
    commandTitle: "Test connectivity between containers",
    command: "docker container exec -it co1 sh -c 'ping -c 4 co2' && docker container exec -it co2 sh -c 'ping -c 4 co1'",
    searchTerms: "docker exec ping network connectivity container name resolution co1 co2",
    description: "Pings <code>co2</code> from <code>co1</code> by name, then pings <code>co1</code> from <code>co2</code>. Successful pings prove that the embedded Docker DNS resolver is working for this network.",
    parts: [
      { text: "docker container exec -it co1", explanation: "runs a command inside the already-running co1 container" },
      { text: "sh -c 'ping -c 4 co2'", explanation: "pings co2 by its container name — Docker's internal DNS resolves it to the right IP" },
    ],
    example: "PING co2 (10.0.0.3): 56 data bytes\n64 bytes from 10.0.0.3: seq=0 ttl=64 time=0.182 ms\n64 bytes from 10.0.0.3: seq=1 ttl=64 time=0.091 ms\n--- co2 ping statistics ---\n4 packets transmitted, 4 received, 0% packet loss",
    why: "Pinging by container name — not IP — is the test that matters. If DNS works, your application containers can use stable names in connection strings rather than hardcoded IPs that change on every restart.",
  },

  {
    id: 206,
    section: "networks",
    sectionTitle: "Part 2 – Networks",
    commandTitle: "Stop containers & remove the network",
    command: "docker container stop co1 co2 && docker network rm dob-bridge",
    searchTerms: "docker container stop network rm remove delete cleanup",
    description: "Stops both containers, then deletes the custom network. Docker refuses to delete a network that still has active containers attached — stopping first is mandatory.",
    parts: [
      { text: "docker container stop co1 co2", explanation: "stops both containers — accepts multiple names/IDs space-separated" },
      { text: "docker network rm dob-bridge", explanation: "deletes the network — fails if any containers are still using it" },
    ],
    example: "co1\nco2\ndob-bridge",
    why: "Leftover networks accumulate and make docker network ls noisy. Always clean up custom networks after exercises — or use docker network prune to remove all unused ones at once.",
  },

  // ── Part 3: Volumes ───────────────────────────────────────────────────────

  {
    id: 301,
    section: "volumes",
    sectionTitle: "Part 3 – Volumes",
    commandTitle: "Share a volume between containers with --volumes-from",
    command: "docker container run -it -v /shared-data --name c1 node:18-alpine sh && docker container run -it --volumes-from c1 --name c2 node:18-alpine sh",
    searchTerms: "docker volumes-from volume share containers c1 c2 inherit",
    description: "Creates <code>c1</code> with an anonymous volume mounted at <code>/shared-data</code>. Then creates <code>c2</code> using <code>--volumes-from c1</code>, which gives it access to the exact same volume at the same path — changes in one are immediately visible in the other.",
    parts: [
      { text: "-v /shared-data", explanation: "creates an anonymous Docker-managed volume and mounts it at /shared-data inside c1" },
      { text: "--volumes-from c1", explanation: "mounts all volumes from c1 into c2 at the same paths — both containers share the same underlying data" },
      { text: "--name c1 / c2", explanation: "stable names used to reference containers in subsequent commands" },
    ],
    example: "# Inside c1:\necho 'Hello from C1!' >> /shared-data/file.txt\n# Inside c2:\ncat /shared-data/file.txt\nHello from C1!",
    why: "--volumes-from is the classic pattern for sharing a writable data directory across multiple containers without needing to know the host path. A third container can inherit the volume from c1 even after c1 has stopped.",
  },

  {
    id: 302,
    section: "volumes",
    sectionTitle: "Part 3 – Volumes",
    commandTitle: "Write from multiple containers and read back",
    command: "docker container attach c1 && docker container attach c2 && docker container run -it --volumes-from c1 --name c3 node:18-alpine sh",
    searchTerms: "docker attach volume write read shared file containers c3 volumes-from",
    description: "Demonstrates the full shared-volume lifecycle: attach to <code>c1</code> and write a line, attach to <code>c2</code> and write another, then start a brand-new <code>c3</code> that inherits the volume from <code>c1</code> and reads the combined file.",
    parts: [
      { text: "docker container attach c1", explanation: "re-connects your terminal to c1's main process — use Ctrl+P Ctrl+Q to detach without stopping" },
      { text: "echo '…' >> /shared-data/file.txt", explanation: "appends a line — the >> operator never overwrites, only appends" },
      { text: "--volumes-from c1 --name c3", explanation: "c3 inherits the volume even though c1 may now be stopped — the volume outlives any individual container" },
    ],
    example: "# c1 writes:\necho 'Hi from C1!' >> /shared-data/file.txt\n# c2 writes:\necho 'C2 is here!' >> /shared-data/file.txt\n# c3 reads:\ncat /shared-data/file.txt\nHi from C1!\nC2 is here!",
    why: "Volumes outlive the containers that created them. This pattern is used for log aggregation, shared config files, and database seeding — any scenario where multiple containers need to read or write the same data.",
  },

  {
    id: 303,
    section: "volumes",
    sectionTitle: "Part 3 – Volumes",
    commandTitle: "Inspect a volume",
    command: "docker container inspect c1 | grep -i source && docker volume ls && docker volume inspect <volume-id>",
    searchTerms: "docker volume inspect ls source mountpoint data container",
    description: "Three ways to find where a volume lives on the host: grep for Source in the container's inspect output, list all volumes, then inspect a specific volume by ID to get its Mountpoint.",
    parts: [
      { text: "docker container inspect c1 | grep -i source", explanation: "filters the container's JSON config to find the host-side path of each mounted volume" },
      { text: "docker volume ls", explanation: "lists all volumes — both named and anonymous — with their driver" },
      { text: "docker volume inspect <volume-id>", explanation: "prints full metadata for one volume including its Mountpoint on the host filesystem" },
    ],
    example: "\"Source\": \"/var/lib/docker/volumes/f2d6e112f178/_data\"\n\n$ docker volume ls\nDRIVER   VOLUME NAME\nlocal    f2d6e112f178b918f4e204312\n\n$ docker volume inspect f2d6e112f178\n[{ \"Mountpoint\": \"/var/lib/docker/volumes/f2d6e112f178/_data\" }]",
    why: "Knowing the Mountpoint lets you inspect or back up volume data directly from the host without exec-ing into a container — useful when a container has crashed or hasn't started yet.",
  },

  {
    id: 304,
    section: "volumes",
    sectionTitle: "Part 3 – Volumes",
    commandTitle: "Bind-mount a host directory into a container",
    command: "mkdir -p /home/docker/app && echo '{\"status\":\"ok\"}' > /home/docker/app/health.json && docker container run -d -p 3000:3000 --name co-node -v /home/docker/app:/usr/src/app node:18-alpine node -e \"require('http').createServer((_,r)=>{require('fs').readFile('/usr/src/app/health.json',(_,d)=>r.end(d))}).listen(3000)\"",
    searchTerms: "docker volume bind mount host directory node app serve file -v",
    description: "Creates a directory on the Docker host, drops a JSON file into it, then runs a Node.js container that mounts that directory and serves the file over HTTP. Edits to the file on the host are instantly visible inside the container — no rebuild needed.",
    parts: [
      { text: "mkdir -p /home/docker/app", explanation: "creates the host-side directory that will be bind-mounted" },
      { text: "-v /home/docker/app:/usr/src/app", explanation: "bind-mount: left side is the host path, right side is the container path — both point to the same inode" },
      { text: "node -e \"…\"", explanation: "inline Node.js HTTP server that reads and serves health.json on every request" },
      { text: "-p 3000:3000", explanation: "maps host port 3000 to container port 3000 so you can curl from the host" },
    ],
    example: "$ curl http://192.168.99.100:3000\n{\"status\":\"ok\"}\n\n# Edit on host:\n$ echo '{\"status\":\"updated\"}' > /home/docker/app/health.json\n\n# Immediately:\n$ curl http://192.168.99.100:3000\n{\"status\":\"updated\"}",
    why: "Bind mounts are the standard pattern for local development — your editor saves to the host, the container serves it live. No image rebuilds, no docker cp, no cache invalidation.",
  },

  {
    id: 305,
    section: "volumes",
    sectionTitle: "Part 3 – Volumes",
    commandTitle: "Create a named volume with a label",
    command: "docker volume create lv-1 --label mode=prod && docker volume ls && docker volume inspect lv-1 && docker volume ls -f label=mode=prod && docker volume ls --format '{{.Name}}: {{.Driver}}: {{.Mountpoint}}'",
    searchTerms: "docker volume create named label filter format inspect lv-1",
    description: "Creates a named volume <code>lv-1</code> with a custom label, then demonstrates four ways to query volumes: plain list, inspect, filter by label, and a custom Go-template format string.",
    parts: [
      { text: "docker volume create lv-1 --label mode=prod", explanation: "creates a named volume — named volumes persist until explicitly removed, unlike anonymous ones" },
      { text: "docker volume inspect lv-1", explanation: "shows driver, labels, mountpoint, and creation time as JSON" },
      { text: "docker volume ls -f label=mode=prod", explanation: "filters the volume list to only those carrying this label — useful when managing many volumes" },
      { text: "--format '{{.Name}}: {{.Driver}}: {{.Mountpoint}}'", explanation: "Go template formatting — pick exactly the fields you want, one per line" },
    ],
    example: "DRIVER   VOLUME NAME\nlocal    lv-1\n\nlv-1: local: /var/lib/docker/volumes/lv-1/_data",
    why: "Named volumes survive container removal and are the right choice for persistent data like database files, uploaded files, and logs. Labels let you categorise and filter them at scale.",
  },

  {
    id: 306,
    section: "volumes",
    sectionTitle: "Part 3 – Volumes",
    commandTitle: "Use a named volume to persist Postgres data",
    command: "docker volume create pg-data && docker container run -d --name pg -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=appdb -v pg-data:/var/lib/postgresql/data postgres:16-alpine",
    searchTerms: "docker volume named postgres data persist pg-data postgresql alpine",
    description: "Creates a named volume <code>pg-data</code> and mounts it into a PostgreSQL container at the path where Postgres stores its data files. The database survives container removal — start a new container with the same volume and your data is intact.",
    parts: [
      { text: "docker volume create pg-data", explanation: "pre-creates the volume with a memorable name — could also be created implicitly with -v, but explicit creation is clearer" },
      { text: "-e POSTGRES_PASSWORD=secret", explanation: "sets the superuser password — required by the official postgres image" },
      { text: "-e POSTGRES_DB=appdb", explanation: "creates this database automatically on first start" },
      { text: "-v pg-data:/var/lib/postgresql/data", explanation: "mounts the named volume at the path Postgres uses for its data directory" },
    ],
    example: "$ docker container rm -f pg\n$ docker container run -d --name pg-new -e POSTGRES_PASSWORD=secret -v pg-data:/var/lib/postgresql/data postgres:16-alpine\n# Data from the previous container is still there",
    why: "Without a volume, all database rows are lost when the container is removed. Named volumes decouple data lifecycle from container lifecycle — the right pattern for any stateful service.",
  },

  {
    id: 307,
    section: "volumes",
    sectionTitle: "Part 3 – Volumes",
    commandTitle: "Create a data-only container (volume container)",
    command: "docker container create -v /con-data --name data-store node:18-alpine /bin/true && docker container inspect data-store | grep -i source",
    searchTerms: "docker volume container data-only store volumes-from con-data",
    description: "Creates a container whose sole purpose is to own a volume. The container itself never runs — <code>/bin/true</code> exits immediately — but the volume persists and can be shared into any other container via <code>--volumes-from data-store</code>.",
    parts: [
      { text: "docker container create", explanation: "creates but does not start the container — it exists only to anchor the volume" },
      { text: "-v /con-data", explanation: "creates an anonymous volume mounted at /con-data inside this container" },
      { text: "--name data-store", explanation: "gives it a stable name so other containers can reference it with --volumes-from" },
      { text: "/bin/true", explanation: "exits immediately with code 0 — this container is intentionally never running" },
    ],
    example: "$ docker container run -d --volumes-from data-store --name worker node:18-alpine node -e \"require('fs').writeFileSync('/con-data/out.txt','done')\"\n$ docker container exec worker cat /con-data/out.txt\ndone",
    why: "The data-only container pattern pre-dates named volumes. It is still occasionally useful when you want to ship a container whose image already contains the data you want to share — the image layers act as a read-only seed.",
  },

  // ── Part 4: Linking & Isolated Networks ───────────────────────────────────

  {
    id: 401,
    section: "linking",
    sectionTitle: "Part 4 – Linking & Isolated Networks",
    commandTitle: "Link a Node.js container to a Postgres container",
    command: "docker container run -d --name c-postgres -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=appdb postgres:16-alpine && docker container run -d --name c-node -p 3000:3000 --link c-postgres:db -e DB_HOST=db -e DB_PASS=secret node:18-alpine node -e \"const {Client}=require('pg');const c=new Client({host:process.env.DB_HOST,database:'appdb',password:process.env.DB_PASS});c.connect().then(()=>require('http').createServer(async(_,r)=>{const res=await c.query('SELECT NOW()');r.end(JSON.stringify(res.rows))}).listen(3000))\"",
    searchTerms: "docker link container postgres node pg client DB_HOST linked legacy",
    description: "Runs a Postgres container, then links a Node.js API container to it. The <code>--link</code> flag injects the Postgres container's IP and a hostname alias (<code>db</code>) into <code>/etc/hosts</code> of the Node.js container, so it can reach the database by name.",
    parts: [
      { text: "--name c-postgres", explanation: "gives the database container a predictable name to link from" },
      { text: "--link c-postgres:db", explanation: "injects c-postgres's IP into /etc/hosts of c-node as the alias 'db'" },
      { text: "-e DB_HOST=db", explanation: "the Node.js app reads DB_HOST from the environment — resolves to the linked container's IP" },
      { text: "require('pg')", explanation: "the pg npm package — the standard PostgreSQL client for Node.js" },
    ],
    example: "$ curl http://192.168.99.100:3000\n[{\"now\":\"2024-11-15T10:30:00.000Z\"}]",
    why: "--link is a legacy feature that Docker still supports but does not recommend for new projects. It only works between containers on the same host and does not support load balancing. Use user-defined networks instead for anything beyond a quick demo.",
  },

  {
    id: 402,
    section: "linking",
    sectionTitle: "Part 4 – Linking & Isolated Networks",
    commandTitle: "Inspect /etc/hosts inside a linked container",
    command: "docker container exec -it c-node cat /etc/hosts",
    searchTerms: "docker exec etc hosts link alias inspect ip mapping",
    description: "Shows the <code>/etc/hosts</code> file inside the Node.js container. You'll see entries injected by Docker for the linked container — both the alias (<code>db</code>) and the original container name (<code>c-postgres</code>) mapped to its IP.",
    parts: [
      { text: "docker container exec -it c-node", explanation: "executes a command inside the running c-node container" },
      { text: "cat /etc/hosts", explanation: "prints the hosts file — Docker's link mechanism writes entries here at container start" },
    ],
    example: "127.0.0.1       localhost\n172.17.0.2      db c-postgres\n172.17.0.3      c-node",
    why: "Understanding /etc/hosts injection explains both why linking works and why it is fragile — if the linked container restarts and gets a new IP, the stale hosts entry causes connection failures until c-node is also restarted.",
  },

  {
    id: 403,
    section: "linking",
    sectionTitle: "Part 4 – Linking & Isolated Networks",
    commandTitle: "Replace linking with an isolated user-defined network",
    command: "docker network create --driver bridge dob-network && docker container run -d --net dob-network --name dob-postgres -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=appdb postgres:16-alpine && docker container run -d --net dob-network --name dob-node -p 3000:3000 -e DB_HOST=dob-postgres -e DB_PASS=secret node:18-alpine node -e \"const {Client}=require('pg');const c=new Client({host:process.env.DB_HOST,database:'appdb',password:process.env.DB_PASS});c.connect().then(()=>require('http').createServer(async(_,r)=>{const res=await c.query('SELECT NOW()');r.end(JSON.stringify(res.rows))}).listen(3000))\"",
    searchTerms: "docker network bridge isolated user-defined dob-network postgres node DNS",
    description: "Achieves the same result as linking but using a user-defined bridge network instead. Both containers join <code>dob-network</code> and Docker's embedded DNS automatically resolves container names — no /etc/hosts injection, no fragility on restart.",
    parts: [
      { text: "docker network create --driver bridge dob-network", explanation: "creates the isolated network both containers will join" },
      { text: "--net dob-network", explanation: "attaches the container to dob-network — both containers must use the same network to reach each other" },
      { text: "-e DB_HOST=dob-postgres", explanation: "the container name is now a real DNS name on this network — no link needed" },
    ],
    example: "$ curl http://192.168.99.100:3000\n[{\"now\":\"2024-11-15T10:30:00.000Z\"}]\n# Same result as linking — but restarts don't break DNS",
    why: "User-defined networks are the modern replacement for --link. DNS-based discovery is dynamic and survives container restarts. This is also how Docker Compose wires services together by default.",
  },

  // ── Part 5: Docker Compose ────────────────────────────────────────────────

  {
    id: 501,
    section: "compose",
    sectionTitle: "Part 5 – Docker Compose",
    commandTitle: "Install Docker Compose",
    command: "curl -L https://github.com/docker/compose/releases/download/1.22.0/docker-compose-$(uname -s)-$(uname -m) > /tmp/docker-compose && chmod +x /tmp/docker-compose && sudo cp /tmp/docker-compose /usr/local/bin/docker-compose",
    searchTerms: "docker-compose install curl chmod bin linux single host",
    description: "Downloads the Docker Compose v1.22.0 binary, makes it executable, and installs it to <code>/usr/local/bin</code>. After this, <code>docker-compose</code> is available as a CLI tool.",
    parts: [
      { text: "curl -L … > /tmp/docker-compose", explanation: "downloads the platform-specific binary — $(uname -s)-$(uname -m) resolves to e.g. Linux-x86_64" },
      { text: "chmod +x", explanation: "makes the binary executable" },
      { text: "sudo cp … /usr/local/bin/docker-compose", explanation: "places it on $PATH so it is callable from any directory" },
    ],
    example: "$ docker-compose --version\ndocker-compose version 1.22.0, build f46880fe",
    why: "Docker Compose is not bundled with Docker CE on Linux. Modern Docker Desktop bundles Compose v2 as a plugin (docker compose), but on a bare Linux host you still need this manual install for the classic docker-compose CLI.",
  },

  {
    id: 502,
    section: "compose",
    sectionTitle: "Part 5 – Docker Compose",
    commandTitle: "Node.js + Postgres docker-compose.yml",
    command: "cat docker-compose.yml",
    searchTerms: "docker-compose yml node postgres compose file services volumes network",
    description: "A <code>docker-compose.yml</code> that defines two services: a Postgres database with a named volume, and a Node.js API that depends on it. Both share a private network so the app reaches the database by service name.",
    parts: [
      { text: "services:", explanation: "top-level key that lists all containers Compose will manage" },
      { text: "depends_on: db", explanation: "ensures the db container starts before the app container — does not wait for Postgres to be ready, only for the container to start" },
      { text: "environment:", explanation: "injects environment variables into the container — the app reads DB_HOST, DB_PASS, etc. from here" },
      { text: "volumes: pg-data:/var/lib/postgresql/data", explanation: "mounts the named volume into Postgres so data survives docker-compose down" },
    ],
    example: "version: '3.8'\nservices:\n  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_PASSWORD: secret\n      POSTGRES_DB: appdb\n    volumes:\n      - pg-data:/var/lib/postgresql/data\n  app:\n    build: .\n    ports:\n      - '3000:3000'\n    environment:\n      DB_HOST: db\n      DB_PASS: secret\n    depends_on:\n      - db\nvolumes:\n  pg-data:",
    why: "Compose replaces a wall of docker run commands with a single declarative file. The service name (db) becomes the DNS hostname — your app's connection string just says host: db and it works.",
  },

  {
    id: 503,
    section: "compose",
    sectionTitle: "Part 5 – Docker Compose",
    commandTitle: "Build, start, inspect and stop a Compose stack",
    command: "docker-compose build && docker-compose up -d && docker-compose ps && docker-compose logs && docker-compose down",
    searchTerms: "docker-compose build up down ps logs detach stack lifecycle",
    description: "The full Compose lifecycle: build images from Dockerfiles, start all services in detached mode, check their status, stream their logs, and finally stop and remove all containers and networks.",
    parts: [
      { text: "docker-compose build", explanation: "builds any service whose config has a 'build' key — skips services using pre-built images" },
      { text: "docker-compose up -d", explanation: "creates and starts all containers — -d detaches so the terminal is free" },
      { text: "docker-compose ps", explanation: "shows the state of each service defined in the compose file" },
      { text: "docker-compose logs", explanation: "streams combined stdout/stderr from all services — add --follow to tail continuously" },
      { text: "docker-compose down", explanation: "stops and removes containers and the default network — named volumes are kept unless you add -v" },
    ],
    example: "$ docker-compose ps\nName          Command        State    Ports\n-------------------------------------------\napp_app_1     node server   Up       0.0.0.0:3000->3000/tcp\napp_db_1      postgres      Up       5432/tcp\n\n$ docker-compose down\nStopping app_app_1 ... done\nStopping app_db_1  ... done\nRemoving network app_default",
    why: "docker-compose down is cleaner than docker container stop + rm — it also removes the auto-created network, leaving no orphaned resources. Add --volumes to also wipe named volumes when you want a truly clean slate.",
  },

  // ── Part 6: Swarm ─────────────────────────────────────────────────────────

  {
    id: 601,
    section: "swarm",
    sectionTitle: "Part 6 – Swarm",
    commandTitle: "Provision three Docker hosts for the cluster",
    command: "for i in 1 2 3; do docker-machine create -d virtualbox docker-$i; done && docker-machine ls",
    searchTerms: "docker-machine create virtualbox loop swarm nodes hosts cluster provision",
    description: "Provisions three VirtualBox VMs (docker-1, docker-2, docker-3) in a loop. Each gets its own Docker daemon and an IP in the 192.168.99.x range. These will become the Swarm manager and two workers.",
    parts: [
      { text: "for i in 1 2 3; do … done", explanation: "shell loop — runs the create command three times with different names" },
      { text: "docker-machine create -d virtualbox docker-$i", explanation: "creates one VM per iteration — each gets a unique name and IP" },
      { text: "docker-machine ls", explanation: "confirms all three hosts are running and shows their assigned IPs" },
    ],
    example: "NAME       ACTIVE  DRIVER      STATE    URL\ndocker-1   -       virtualbox  Running  tcp://192.168.99.101:2376\ndocker-2   -       virtualbox  Running  tcp://192.168.99.102:2376\ndocker-3   -       virtualbox  Running  tcp://192.168.99.103:2376",
    why: "A Swarm needs at least one manager and ideally multiple workers to demonstrate scheduling and failover. Provisioning three VMs with docker-machine is the fastest way to get a realistic multi-host cluster without cloud infrastructure.",
  },

  {
    id: 602,
    section: "swarm",
    sectionTitle: "Part 6 – Swarm",
    commandTitle: "Initialise the Swarm on docker-1 (manager)",
    command: "docker-machine ssh docker-1 && docker swarm init --advertise-addr 192.168.99.101 && docker swarm join-token -q worker",
    searchTerms: "docker swarm init advertise-addr manager token worker join",
    description: "SSHes into docker-1 and initialises the Swarm, making it the manager node. The join-token command prints the token workers need to join — copy it for the next step.",
    parts: [
      { text: "docker swarm init --advertise-addr 192.168.99.101", explanation: "initialises the Swarm and advertises the manager's API on this IP — other nodes use it to join" },
      { text: "docker swarm join-token -q worker", explanation: "-q (quiet) prints only the token string, stripping the surrounding command — easier to copy" },
    ],
    example: "Swarm initialized: current node is now a manager.\n\nSWMTKN-1-3cmw4zhu9fdep8wn162kwark8hoedtt8xw959pztgp125hlaqo-ay73hkczlbxlpmlqy3t2evdtv",
    why: "One node must be designated the manager before others can join. The advertise-addr must be an IP that all other nodes in the cluster can reach — in VirtualBox this is the host-only network address.",
  },

  {
    id: 603,
    section: "swarm",
    sectionTitle: "Part 6 – Swarm",
    commandTitle: "Join docker-2 and docker-3 as workers",
    command: "docker-machine ssh docker-2 && docker swarm join --token <TOKEN> --advertise-addr 192.168.99.102 192.168.99.101:2377 && exit && docker-machine ssh docker-3 && docker swarm join --token <TOKEN> --advertise-addr 192.168.99.103 192.168.99.101:2377 && exit",
    searchTerms: "docker swarm join worker token advertise-addr docker-2 docker-3",
    description: "Joins each of the two worker VMs to the Swarm using the token from the previous step. Replace <code>&lt;TOKEN&gt;</code> with the actual token string. After both joins, docker-1 manages a 3-node cluster.",
    parts: [
      { text: "docker swarm join --token <TOKEN>", explanation: "authenticates with the manager and registers this node as a worker" },
      { text: "--advertise-addr 192.168.99.10x", explanation: "the IP this worker advertises to the manager — must be reachable from docker-1" },
      { text: "192.168.99.101:2377", explanation: "the manager's address and Swarm management port — workers connect here to join" },
    ],
    example: "docker@docker-2:~$ docker swarm join --token SWMTKN-1-3cmw… 192.168.99.101:2377\nThis node joined a swarm as a worker.\n\ndocker@docker-3:~$ docker swarm join --token SWMTKN-1-3cmw… 192.168.99.101:2377\nThis node joined a swarm as a worker.",
    why: "Workers execute the actual container workloads. The manager schedules tasks onto workers but can also run containers itself. For production, managers are kept separate from workers to protect cluster state.",
  },

  {
    id: 604,
    section: "swarm",
    sectionTitle: "Part 6 – Swarm",
    commandTitle: "Inspect cluster node status",
    command: "docker-machine ssh docker-1 && docker node ls",
    searchTerms: "docker node ls swarm cluster status manager worker active",
    description: "Lists all nodes in the Swarm from the manager's perspective, showing their role (Manager/Worker), status (Ready), and availability (Active).",
    parts: [
      { text: "docker node ls", explanation: "only works on a manager node — shows the full cluster membership and each node's health" },
    ],
    example: "ID                          HOSTNAME   STATUS  AVAILABILITY  MANAGER STATUS\na1b2c3d4e5f6 *   docker-1   Ready   Active        Leader\nb2c3d4e5f6a7     docker-2   Ready   Active\nc3d4e5f6a7b8     docker-3   Ready   Active",
    why: "docker node ls is your primary health check for the cluster. The * next to the node ID marks the current node. A node showing Down or Drain means it is not accepting new tasks.",
  },

  {
    id: 605,
    section: "swarm",
    sectionTitle: "Part 6 – Swarm",
    commandTitle: "Create a service and scale it",
    command: "docker service create --replicas 1 --name node-ping node:18-alpine node -e \"setInterval(()=>console.log('ping',new Date().toISOString()),2000)\" && docker service ls && docker service inspect --pretty node-ping && docker service ps node-ping && docker service scale node-ping=5 && docker service ps node-ping",
    searchTerms: "docker service create scale replicas inspect ls ps node swarm",
    description: "Creates a Swarm service with one replica, inspects it, then scales it to five replicas. Swarm automatically distributes the five replicas across all available nodes.",
    parts: [
      { text: "docker service create --replicas 1 --name node-ping", explanation: "defines a service — Swarm ensures exactly 1 replica is running at all times" },
      { text: "docker service ls", explanation: "lists all services with their desired vs running replica count" },
      { text: "docker service inspect --pretty node-ping", explanation: "--pretty formats the JSON as human-readable text instead of raw JSON" },
      { text: "docker service ps node-ping", explanation: "shows each replica as a task — which node it is on, its state, and any errors" },
      { text: "docker service scale node-ping=5", explanation: "updates the desired replica count — Swarm schedules the additional 4 replicas immediately" },
    ],
    example: "$ docker service ps node-ping\nID      NAME           NODE      DESIRED STATE  CURRENT STATE\na1b…    node-ping.1    docker-1  Running        Running 2 minutes\nb2c…    node-ping.2    docker-2  Running        Running 10 seconds\nc3d…    node-ping.3    docker-3  Running        Running 10 seconds\nd4e…    node-ping.4    docker-1  Running        Running 10 seconds\ne5f…    node-ping.5    docker-2  Running        Running 10 seconds",
    why: "Swarm's scheduler spreads replicas across nodes automatically using a spread strategy. With 5 replicas on 3 nodes the load is not perfectly even — but if any node dies, Swarm reschedules its tasks onto the surviving nodes within seconds.",
  },

  {
    id: 606,
    section: "swarm",
    sectionTitle: "Part 6 – Swarm",
    commandTitle: "Drain and reactivate a node",
    command: "docker node update --availability drain docker-2 && docker node inspect --pretty docker-2 && docker service ps node-ping && docker node update --availability active docker-2 && docker node inspect --pretty docker-2",
    searchTerms: "docker node update drain active availability maintenance swarm reschedule",
    description: "Marks docker-2 as <code>drain</code>, which causes Swarm to migrate all its tasks to other nodes — useful for maintenance without service interruption. Then sets it back to <code>active</code> and observes that existing tasks do not automatically rebalance.",
    parts: [
      { text: "--availability drain", explanation: "tells Swarm to stop scheduling new tasks here and to migrate existing ones away" },
      { text: "docker node inspect --pretty docker-2", explanation: "confirms the availability change — look for Availability: drain" },
      { text: "--availability active", explanation: "marks the node as accepting tasks again — does not force existing tasks to move back" },
    ],
    example: "# After drain:\n$ docker service ps node-ping\n# docker-2 tasks show Shutdown — replaced on docker-1 and docker-3\n\n# After active:\n$ docker node inspect --pretty docker-2\nAvailability: Active\n# But tasks from docker-1/3 stay where they are",
    why: "Drain is the safe way to take a node offline for patching or replacement. The Swarm maintains the desired replica count throughout — from outside the cluster there is zero downtime.",
  },

  {
    id: 607,
    section: "swarm",
    sectionTitle: "Part 6 – Swarm",
    commandTitle: "Force rebalance across all nodes",
    command: "docker service update --force node-ping",
    searchTerms: "docker service update force rebalance redistribute replicas nodes",
    description: "Forces a rolling restart of all service replicas, causing Swarm to rebalance them across all active nodes including any that were recently re-activated. Tasks are replaced one at a time to minimise downtime.",
    parts: [
      { text: "docker service update --force", explanation: "triggers a rolling update with no actual config change — every replica is rescheduled, redistributing the load" },
      { text: "node-ping", explanation: "the service to rebalance" },
    ],
    example: "$ docker service update --force node-ping\nnode-ping\noverall progress: 5 out of 5 tasks\n1/5: running\n2/5: running\n...\nverify: Service converged",
    why: "Swarm does not automatically rebalance when a drained node comes back. --force is the explicit trigger that redistributes tasks — be aware it causes a rolling restart, which briefly reduces capacity for each replica being replaced.",
  },

  {
    id: 608,
    section: "swarm",
    sectionTitle: "Part 6 – Swarm",
    commandTitle: "Create a service with rolling update config",
    command: "docker service rm node-ping && docker service create --replicas 3 --name node-ping --update-delay 10s --update-parallelism 1 node:18-alpine node -e \"setInterval(()=>console.log('ping',new Date().toISOString()),2000)\"",
    searchTerms: "docker service create update-delay update-parallelism rolling update config",
    description: "Re-creates the service with explicit rolling update parameters: update one replica at a time (<code>--update-parallelism 1</code>) with a 10-second pause between each (<code>--update-delay 10s</code>). This makes future <code>service update</code> commands safe for production.",
    parts: [
      { text: "--update-delay 10s", explanation: "waits 10 seconds between replacing each replica — gives the new one time to pass health checks before the next is touched" },
      { text: "--update-parallelism 1", explanation: "replaces only one replica at a time — prevents a bad update from taking down all replicas simultaneously" },
    ],
    example: "$ docker service update --image node:20-alpine node-ping\nupdating service node-ping (1 task at a time, 10s between each)",
    why: "Without these flags, a service update replaces all replicas simultaneously — causing a brief total outage. update-delay + update-parallelism gives you a safe, observable rollout that can be paused or rolled back mid-flight.",
  },

  // ── Part 7: Stack ─────────────────────────────────────────────────────────

  {
    id: 701,
    section: "stack",
    sectionTitle: "Part 7 – Stack",
    commandTitle: "Deploy a stack from a Compose file",
    command: "docker stack deploy -c docker-compose.yml node-stack && docker stack ps node-stack",
    searchTerms: "docker stack deploy compose file swarm services node-stack",
    description: "Deploys all services defined in a <code>docker-compose.yml</code> as a Swarm stack named <code>node-stack</code>. The stack concept groups related services so they can be managed, scaled, and removed together.",
    parts: [
      { text: "docker stack deploy -c docker-compose.yml", explanation: "reads the Compose file and creates a service for each entry under 'services'" },
      { text: "node-stack", explanation: "the stack name — prefixed to every service and network name (e.g. node-stack_app, node-stack_db)" },
      { text: "docker stack ps node-stack", explanation: "shows each task in the stack — which node it runs on, its state, and the image used" },
    ],
    example: "Creating network node-stack_default\nCreating service node-stack_db\nCreating service node-stack_app\n\n$ docker stack ps node-stack\nID    NAME              IMAGE             NODE      DESIRED  CURRENT\na1b…  node-stack_app.1  myapp:latest      docker-1  Running  Running\nb2c…  node-stack_db.1   postgres:16-alpi  docker-2  Running  Running",
    why: "A stack is the Swarm-native equivalent of docker-compose up. It uses the same Compose file format but schedules services across the cluster, adds replica management, and integrates with Swarm's rolling update machinery.",
  },

  {
    id: 702,
    section: "stack",
    sectionTitle: "Part 7 – Stack",
    commandTitle: "Remove a stack",
    command: "docker stack rm node-stack",
    searchTerms: "docker stack rm remove delete services network cleanup",
    description: "Removes all services, networks, and configurations associated with the <code>node-stack</code> stack. Named volumes declared in the Compose file are preserved.",
    parts: [
      { text: "docker stack rm node-stack", explanation: "stops and removes every service in the stack and the overlay network it created — volumes survive" },
    ],
    example: "Removing service node-stack_app\nRemoving service node-stack_db\nRemoving network node-stack_default",
    why: "Stack rm is cleaner than individually stopping services. It removes the overlay network too — something you'd have to do manually if you managed each service separately.",
  },

  // ── Part 8: Sharing Files with docker-machine ─────────────────────────────

  {
    id: 801,
    section: "sharing",
    sectionTitle: "Part 8 – Sharing Files",
    commandTitle: "Mount a VM directory on the host",
    command: "docker-machine mount docker-1:/home/docker/app /home/user/app",
    searchTerms: "docker-machine mount sshfs vm directory host share files",
    description: "Mounts a directory from inside the <code>docker-1</code> VM at a path on your local machine using SSHFS. Changes on either side are immediately visible on the other — useful for editing files that the container serves.",
    parts: [
      { text: "docker-machine mount", explanation: "uses SSHFS to mount the VM path over SSH — requires FUSE on the host" },
      { text: "docker-1:/home/docker/app", explanation: "source: the path inside the named VM" },
      { text: "/home/user/app", explanation: "destination: where the VM directory appears on your local filesystem" },
    ],
    example: "# After mounting:\n$ ls /home/user/app\nserver.js  package.json  node_modules/\n# Edit locally, visible immediately inside the VM",
    why: "This approach only works for sharing between host and a single VM. For sharing the same directory across multiple VMs, use the shared folder approach in the next entry instead.",
  },

  {
    id: 802,
    section: "sharing",
    sectionTitle: "Part 8 – Sharing Files",
    commandTitle: "Share a host folder into multiple VMs via VirtualBox",
    command: "for i in 1 2 3; do docker-machine create -d virtualbox --virtualbox-share-folder /home/user/app:/home/docker/app docker-$i; done",
    searchTerms: "docker-machine virtualbox share folder multiple vms host shared directory",
    description: "Provisions all three VMs with a VirtualBox shared folder that maps <code>/home/user/app</code> on the host to <code>/home/docker/app</code> inside each VM. All three VMs and the host see the same files — ideal for distributing application code across a Swarm cluster.",
    parts: [
      { text: "--virtualbox-share-folder /home/user/app:/home/docker/app", explanation: "configures VirtualBox to expose the host directory inside the VM at creation time" },
      { text: "for i in 1 2 3; do … done", explanation: "applies the same shared folder config to all three VMs in one loop" },
    ],
    example: "# Edit on host:\n$ echo 'console.log(\"v2\")' > /home/user/app/server.js\n# Immediately visible on all three VMs:\n$ docker-machine ssh docker-1 cat /home/docker/app/server.js\nconsole.log(\"v2\")",
    why: "This is the correct approach for a Swarm stack where services run across multiple nodes — each node needs the same application files at the same path. VirtualBox shared folders provide this without SCP or rsync.",
  },

  // ── Part 9: Cleanup ───────────────────────────────────────────────────────

  {
    id: 901,
    section: "cleanup",
    sectionTitle: "Part 9 – Cleanup",
    commandTitle: "Stop the default docker-machine",
    command: "docker-machine stop default",
    searchTerms: "docker-machine stop default vm halt shutdown",
    description: "Gracefully shuts down the <code>default</code> VM to free CPU and RAM on the host. The VM and its data are preserved — <code>docker-machine start default</code> brings it back.",
    parts: [
      { text: "docker-machine stop default", explanation: "sends an ACPI shutdown signal to the VirtualBox VM — equivalent to graceful OS shutdown" },
    ],
    example: "Stopping \"default\"...\nMachine \"default\" was stopped.",
    why: "docker-machine VMs consume RAM even when idle. Stop them when not in use, especially before provisioning new VMs for the Swarm exercises.",
  },

  {
    id: 902,
    section: "cleanup",
    sectionTitle: "Part 9 – Cleanup",
    commandTitle: "Remove all docker-machine VMs",
    command: "docker-machine rm default docker-1 docker-2 docker-3",
    searchTerms: "docker-machine rm remove delete vms cleanup infrastructure",
    description: "Permanently deletes all four VMs — stops them if running, then removes the VirtualBox VM files, SSH keys, and docker-machine metadata. This cannot be undone.",
    parts: [
      { text: "docker-machine rm", explanation: "stops the VM if running, then deletes its disk images and all docker-machine state for it" },
      { text: "default docker-1 docker-2 docker-3", explanation: "accepts multiple names space-separated — removes all four in one command" },
    ],
    example: "About to remove default, docker-1, docker-2, docker-3\nAre you sure? (y/n): y\nSuccessfully removed default\nSuccessfully removed docker-1\nSuccessfully removed docker-2\nSuccessfully removed docker-3",
    why: "Each VM takes several GB of disk space. Once the module exercises are complete, rm all VMs to reclaim storage. Re-run the create commands fresh for the next session.",
  },

];