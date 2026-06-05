// modules/m2/docker-swarm-dotnet.js
// M3: Advanced Docker — .NET Swarm
// Extracted from DOB-M3-Practice-Files M3-3 (PHP Swarm stack → .NET 8 + PostgreSQL)

window.commandData = [

  // ── Section 1: Multi-Node Infrastructure ────────────────────────────────────

  {
    id: 400, section: "infra", sectionTitle: "Multi-Node Infrastructure",
    commandTitle: "Create 3 docker-machine nodes",
    command: "for i in 1 2 3; do docker-machine create -d virtualbox docker-$i; done",
    searchTerms: "docker-machine create virtualbox cluster nodes three for loop provision",
    description: "Provisions three VirtualBox VMs named <code>docker-1</code>, <code>docker-2</code>, and <code>docker-3</code>. Each VM runs a Docker daemon on TCP port 2376. Together they form the hardware layer for a Swarm cluster.",
    parts: [
      { text: "for i in 1 2 3; do ... done", explanation: "Bash loop — runs docker-machine create three times with different names" },
      { text: "docker-machine create -d virtualbox", explanation: "provisions a VM using the VirtualBox driver — also supports VMware, Hyper-V, AWS, Azure" },
      { text: "docker-$i", explanation: "generates names docker-1, docker-2, docker-3 — used to reference each VM later" },
    ],
    example: "Creating machine...\n(docker-1) Creating VirtualBox VM...\n(docker-1) Starting VM...\nDocker is up and running!\n\n(docker-2) ...\n(docker-3) ...\n\n$ docker-machine ls\nNAME      ACTIVE  DRIVER      STATE    URL\ndocker-1  -       virtualbox  Running  tcp://192.168.99.101:2376\ndocker-2  -       virtualbox  Running  tcp://192.168.99.102:2376\ndocker-3  -       virtualbox  Running  tcp://192.168.99.103:2376",
    why: "Each VM needs at least 1 GB RAM and 1 CPU. Three VMs = 3 GB RAM minimum on your host. Close other applications before running this — VirtualBox VMs consume real physical memory."
  },

  {
    id: 401, section: "infra", sectionTitle: "Multi-Node Infrastructure",
    commandTitle: "Initialize Swarm on docker-1 (manager)",
    command: "docker-machine ssh docker-1\ndocker swarm init --advertise-addr 192.168.99.101",
    searchTerms: "docker swarm init manager leader advertise-addr cluster create",
    description: "SSHes into docker-1 and initializes a Docker Swarm, making this VM the <strong>manager</strong>. The <code>--advertise-addr</code> flag tells other nodes which IP to connect to when joining. Only one node can be the initializer.",
    parts: [
      { text: "docker-machine ssh docker-1", explanation: "opens an interactive SSH session on the docker-1 VM" },
      { text: "docker swarm init", explanation: "creates a new Swarm — this node becomes the first manager and acting Leader" },
      { text: "--advertise-addr 192.168.99.101", explanation: "the IP this manager advertises to workers — must be reachable from docker-2 and docker-3" },
    ],
    example: "docker@docker-1:~$ docker swarm init --advertise-addr 192.168.99.101\nSwarm initialized: current node (a1b2c3d4e5f6) is now a manager.\n\nTo add a worker to this swarm, run the following command:\n\n    docker swarm join --token SWMTKN-1-3cmw... 192.168.99.101:2377\n\nTo add a manager to this swarm, run 'docker swarm join-token manager'.",
    why: "The output contains the join command with the token — save this. Every worker that joins will need the exact token and manager IP. The token is a cryptographic secret that proves the joining node is authorized."
  },

  {
    id: 402, section: "infra", sectionTitle: "Multi-Node Infrastructure",
    commandTitle: "Get the worker join token",
    command: "docker swarm join-token -q worker",
    searchTerms: "docker swarm join-token worker token quiet -q join cluster",
    description: "Prints only the join token (no instructions). Use this to script worker joins. The token is a long alphanumeric string that proves to the manager that a new node is allowed to join.",
    parts: [
      { text: "docker swarm join-token worker", explanation: "prints the full join command with token — useful for copy-pasting manually" },
      { text: "-q", explanation: "prints only the token string itself — useful for scripting in bash variables" },
    ],
    example: "$ docker swarm join-token -q worker\nSWMTKN-1-3cmw4zhu9fdep8wn162kwark8hoedtt8xw959pztgp125hlaqo-ay73hkczlbxlpmlqy3t2evdtv",
    why: "The -q flag is used in scripts to capture the token automatically: TOKEN=$(docker swarm join-token -q worker). Without -q, you'd need to awk the output — error-prone."
  },

  {
    id: 403, section: "infra", sectionTitle: "Multi-Node Infrastructure",
    commandTitle: "Join docker-2 and docker-3 as workers",
    command: "docker-machine ssh docker-2\ndocker swarm join --token <TOKEN> --advertise-addr 192.168.99.102 192.168.99.101:2377\nexit\n\ndocker-machine ssh docker-3\ndocker swarm join --token <TOKEN> --advertise-addr 192.168.99.103 192.168.99.101:2377\nexit",
    searchTerms: "docker swarm join worker token advertise-addr cluster member add node",
    description: "Joins each worker VM to the Swarm. Replace <code>&lt;TOKEN&gt;</code> with the token from the previous step. After both joins, you have a 3-node cluster: one manager (docker-1) and two workers (docker-2, docker-3).",
    parts: [
      { text: "--token SWMTKN-1-...", explanation: "the cryptographic token from docker swarm join-token — authenticates the joining node" },
      { text: "--advertise-addr 192.168.99.10x", explanation: "the IP this worker advertises back to the manager — each worker has a unique IP" },
      { text: "192.168.99.101:2377", explanation: "the manager's IP and Swarm management port (2377) — workers connect here to join" },
    ],
    example: "docker@docker-2:~$ docker swarm join --token SWMTKN-1-3cmw... --advertise-addr 192.168.99.102 192.168.99.101:2377\nThis node joined a swarm as a worker.\n\ndocker@docker-3:~$ docker swarm join --token SWMTKN-1-3cmw... --advertise-addr 192.168.99.103 192.168.99.101:2377\nThis node joined a swarm as a worker.",
    why: "Workers execute the actual container workloads. Managers schedule tasks onto workers. For production, keep managers separate from workers — here we use docker-1 as both for simplicity (a single-node lab pattern)."
  },

  {
    id: 404, section: "infra", sectionTitle: "Multi-Node Infrastructure",
    commandTitle: "Inspect cluster node status",
    command: "docker-machine ssh docker-1\ndocker node ls",
    searchTerms: "docker node ls cluster status manager worker leader ready active",
    description: "Lists all nodes in the Swarm from the manager's perspective, showing their hostname, role (Manager/Worker), status (Ready/Down), and availability (Active/Drain). The <code>*</code> marks the current node (docker-1, the Leader).",
    parts: [
      { text: "docker node ls", explanation: "only works on a manager node — queries the Swarm's internal Raft store for cluster membership" },
      { text: "MANAGER STATUS column", explanation: "shows 'Leader' for the acting leader, 'Reachable' for standby managers — empty for workers" },
    ],
    example: "ID                          HOSTNAME   STATUS  AVAILABILITY  MANAGER STATUS\na1b2c3d4e5f6 *   docker-1   Ready   Active        Leader\nb2c3d4e5f6a7     docker-2   Ready   Active\nc3d4e5f6a7b8     docker-3   Ready   Active",
    why: "docker node ls is your primary cluster health check. All nodes should show Ready and Active. A node showing Down means it's disconnected — check the VM with docker-machine status. A node showing Drain means it's in maintenance mode."
  },

  // ── Section 2: .NET Service Deployment ─────────────────────────────────────

  {
    id: 405, section: "services", sectionTitle: ".NET Services on Swarm",
    commandTitle: "Create a .NET API service with 3 replicas",
    command: "docker service create --replicas 3 --name dotnet-api --publish 8080:8080 --update-delay 10s --update-parallelism 1 dotnet-api:latest",
    searchTerms: "docker service create .net dotnet replicas publish update-delay update-parallelism rolling",
    description: "Creates a Swarm service running the .NET 8 API image with 3 replicas distributed across the cluster. The <code>--publish</code> flag exposes port 8080 on every node via the Swarm ingress mesh — you can hit any node's IP and reach a healthy replica.",
    parts: [
      { text: "--replicas 3", explanation: "Swarm ensures exactly 3 instances are running at all times — replaces any that crash" },
      { text: "--name dotnet-api", explanation: "the service name — used in docker service ls, ps, inspect, scale, rm" },
      { text: "--publish 8080:8080", explanation: "Swarm's ingress mesh — port 8080 on EVERY node routes to a healthy task regardless of which node the task runs on" },
      { text: "--update-delay 10s", explanation: "waits 10 seconds between replacing each replica during updates — gives the new one time to start" },
      { text: "--update-parallelism 1", explanation: "replaces only one replica at a time — prevents a bad update from taking all replicas down" },
    ],
    example: "$ docker service create --replicas 3 --name dotnet-api --publish 8080:8080 dotnet-api:latest\ns6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2a3b4c5d6e7\noverall progress: 3 out of 3 tasks\n1/3: running   [==================================================>]\n2/3: running   [==================================================>]\n3/3: running   [==================================================>]\nverify: Service converged",
    why: "The ingress mesh is the killer feature: you don't need a load balancer. curl any node's IP on port 8080 and Swarm routes to a healthy replica. If that replica dies, Swarm restarts it and routes to another — the client sees no interruption."
  },

  {
    id: 406, section: "services", sectionTitle: ".NET Services on Swarm",
    commandTitle: "List all Swarm services",
    command: "docker service ls",
    searchTerms: "docker service ls list swarm services replicas ports image",
    description: "Lists all services running in the Swarm with their name, mode (replicated/global), replica count, image, and published ports. Only works on a manager node.",
    parts: [
      { text: "docker service ls", explanation: "queries the Swarm manager for all defined services and their current state" },
      { text: "MODE column", explanation: "replicated = fixed number of tasks; global = exactly one task per node" },
    ],
    example: "ID            NAME        MODE        REPLICAS  IMAGE               PORTS\ns6a7b8c9d0e1  dotnet-api  replicated  3/3       dotnet-api:latest   *:8080->8080/tcp",
    why: "3/3 in REPLICAS means all three replicas are running. If it showed 2/3, one is still starting or has crashed — check docker service ps dotnet-api for details."
  },

  {
    id: 407, section: "services", sectionTitle: ".NET Services on Swarm",
    commandTitle: "Inspect service configuration",
    command: "docker service inspect --pretty dotnet-api",
    searchTerms: "docker service inspect pretty detnet-api config details replicas update ports",
    description: "Shows the complete configuration of the service in a human-readable format: container spec, resources, update config, rollback config, and endpoint spec. Use without <code>--pretty</code> for machine-readable JSON.",
    parts: [
      { text: "docker service inspect dotnet-api", explanation: "returns full JSON — useful for scripts and CI pipelines" },
      { text: "--pretty", explanation: "formats the output in an indented key: value style — easier to read for humans" },
    ],
    example: "ID:             s6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2a3b4c5d6e7\nName:           dotnet-api\nService Mode:   Replicated\n Replicas:      3\nUpdateStatus:\n State:         completed\n Started:       2 minutes ago\n Completed:     1 minute ago\n Message:       update completed",
    why: "The UpdateStatus section shows the last update's progress. If an update is in flight, it shows 'updating' with a progress bar. If it failed, it shows 'paused' — you can continue or roll back with docker service update --rollback."
  },

  {
    id: 408, section: "services", sectionTitle: ".NET Services on Swarm",
    commandTitle: "Check task distribution across nodes",
    command: "docker service ps dotnet-api",
    searchTerms: "docker service ps tasks replicas nodes distribution which where running",
    description: "Shows every task (replica) of the service — which node it runs on, its current state (Running, Starting, Shutdown), and any errors. This is how you verify tasks are distributed across all nodes.",
    parts: [
      { text: "docker service ps dotnet-api", explanation: "lists every task in the service — past and present — with node placement and status" },
      { text: "NODE column", explanation: "which node the task is assigned to — should show docker-1, docker-2, docker-3 spread across tasks" },
      { text: "DESIRED STATE / CURRENT STATE", explanation: "Desired is what Swarm wants (Running, Shutdown); Current is what actually happened" },
    ],
    example: "ID        NAME              IMAGE               NODE      DESIRED STATE  CURRENT STATE\na1b2c3d4  dotnet-api.1      dotnet-api:latest    docker-1  Running        Running 2 minutes\nb2c3d4e5  dotnet-api.2      dotnet-api:latest    docker-2  Running        Running 2 minutes\nc3d4e5f6  dotnet-api.3      dotnet-api:latest    docker-3  Running        Running 2 minutes",
    why: "All three nodes should have one task each. If docker-2 shows no tasks, the node might be drained or the scheduler hasn't placed tasks there yet. Swarm spreads tasks across nodes by default using a bin-packing strategy."
  },

  {
    id: 409, section: "services", sectionTitle: ".NET Services on Swarm",
    commandTitle: "Scale the .NET service to 5 replicas",
    command: "docker service scale dotnet-api=5 && docker service ps dotnet-api",
    searchTerms: "docker service scale replicas increase horizontal scaling dotnet-api 5",
    description: "Increases the replica count from 3 to 5. Swarm automatically schedules the two new replicas across available nodes, rebalancing the load. The ingress mesh routing updates immediately — no config change needed.",
    parts: [
      { text: "docker service scale dotnet-api=5", explanation: "sets the desired replica count to 5 — Swarm creates 2 new tasks immediately" },
      { text: "docker service ps dotnet-api", explanation: "verify — 5 tasks now, spread across 3 nodes (some nodes will have 2 tasks)" },
    ],
    example: "$ docker service scale dotnet-api=5\ndotnet-api scaled to 5\noverall progress: 5 out of 5 tasks\nverify: Service converged\n\n$ docker service ps dotnet-api\n# 5 tasks across docker-1 (2), docker-2 (2), docker-3 (1)",
    why: "Swarm does NOT rebalance existing tasks when you scale up — only new tasks are scheduled. This means the original 3 tasks stay where they are, and the 2 new ones are placed on underutilized nodes. Use --force to fully redistribute."
  },

  {
    id: 410, section: "services", sectionTitle: ".NET Services on Swarm",
    commandTitle: "Test the .NET API through the ingress mesh",
    command: "curl http://192.168.99.101:8080/weather && curl http://192.168.99.102:8080/weather && curl http://192.168.99.103:8080/weather",
    searchTerms: "curl test ingress mesh swarm any node routing dotnet api weather",
    description: "Hits the .NET API on all three nodes. Because of the Swarm ingress mesh, every request succeeds — even if the node you hit doesn't have a running replica. Swarm transparently routes to a healthy task on another node.",
    parts: [
      { text: "curl http://192.168.99.101:8080/weather", explanation: "docker-1 has at least one replica — direct local routing" },
      { text: "curl http://192.168.99.102:8080/weather", explanation: "docker-2 may or may not have a replica — Swarm routes to docker-1 or docker-3 if needed" },
      { text: "curl http://192.168.99.103:8080/weather", explanation: "same — ingress mesh guarantees the request reaches a healthy replica regardless of node" },
    ],
    example: "$ curl http://192.168.99.101:8080/weather\n[{\"city\":\"Sofia\",\"temperature\":22.0,\"description\":\"Sunny\"}]\n\n$ curl http://192.168.99.102:8080/weather\n# Same response — even if no .NET replica runs on docker-2",
    why: "The ingress mesh is Swarm's built-in load balancer. It uses IPVS (IP Virtual Server) in the Linux kernel — layer 4 routing with near-zero overhead. No need for Nginx or HAProxy in front of your Swarm services."
  },

  // ── Section 3: Node Maintenance ─────────────────────────────────────────────

  {
    id: 411, section: "maintenance", sectionTitle: "Node Maintenance",
    commandTitle: "Drain a node for maintenance",
    command: "docker node update --availability drain docker-2 && docker node inspect --pretty docker-2 && docker service ps dotnet-api",
    searchTerms: "docker node update drain maintenance availability reschedule tasks migrate",
    description: "Marks docker-2 as <code>drain</code>. Swarm immediately stops all tasks on docker-2 and reschedules them on the remaining active nodes (docker-1, docker-3). The service replica count stays at 5 — zero downtime from outside the cluster.",
    parts: [
      { text: "--availability drain", explanation: "tells Swarm: stop all tasks on this node and don't schedule new ones here" },
      { text: "docker node inspect --pretty docker-2", explanation: "confirms — Availability should now show 'drain'" },
      { text: "docker service ps dotnet-api", explanation: "tasks that were on docker-2 now show 'Shutdown' — replaced on docker-1/3" },
    ],
    example: "$ docker node update --availability drain docker-2\ndocker-2\n\n$ docker node inspect --pretty docker-2\nAvailability: Drain\nState:       Ready\n\n$ docker service ps dotnet-api\n# docker-2 tasks: Desired State = Shutdown (replaced on docker-1 and docker-3)\n# Total: still 5 running tasks — zero capacity loss",
    why: "Drain is the safe way to take a node offline for OS updates, hardware replacement, or debugging. The Swarm maintains the desired replica count throughout the operation — no requests are dropped."
  },

  {
    id: 412, section: "maintenance", sectionTitle: "Node Maintenance",
    commandTitle: "Reactivate a drained node",
    command: "docker node update --availability active docker-2 && docker node inspect --pretty docker-2",
    searchTerms: "docker node update active reactivate bring back online availability",
    description: "Sets docker-2 back to <code>active</code>. The node is now available for new task scheduling, but existing tasks on docker-1 and docker-3 do NOT automatically migrate back. You need <code>--force</code> to rebalance.",
    parts: [
      { text: "--availability active", explanation: "marks the node as accepting tasks again — but existing tasks stay where they are" },
      { text: "docker node inspect --pretty", explanation: "verify Availability now shows 'active'" },
    ],
    example: "$ docker node update --availability active docker-2\ndocker-2\n\n$ docker node inspect --pretty docker-2\nAvailability: Active\nState:       Ready\n\n$ docker service ps dotnet-api\n# Still no tasks on docker-2 — existing tasks weren't moved back",
    why: "Swarm does NOT automatically rebalance when a node comes back active. This is intentional — moving running tasks causes brief downtime. If you want to redistribute, use --force explicitly (next command)."
  },

  {
    id: 413, section: "maintenance", sectionTitle: "Node Maintenance",
    commandTitle: "Force rebalance across all nodes",
    command: "docker service update --force dotnet-api && docker service ps dotnet-api",
    searchTerms: "docker service update force rebalance redistribute tasks nodes active",
    description: "Forces a rolling restart of all replicas, causing Swarm to rebalance them across all active nodes — including docker-2 which was recently reactivated. Each replica is replaced one at a time (because update-parallelism=1).",
    parts: [
      { text: "docker service update --force", explanation: "triggers a rolling update with no config change — every replica is rescheduled" },
      { text: "dotnet-api", explanation: "the service to rebalance" },
    ],
    example: "$ docker service update --force dotnet-api\ndotnet-api\noverall progress: 5 out of 5 tasks\n1/5: running\n2/5: running\n3/5: running\n4/5: running\n5/5: running\nverify: Service converged\n\n$ docker service ps dotnet-api\n# Tasks now spread across all 3 nodes: docker-1, docker-2, docker-3",
    why: "Be aware: --force causes a rolling restart of every replica. While one replica is being replaced, capacity is briefly at N-1. With update-parallelism=1 and update-delay=10s, a 5-replica service takes ~50 seconds to fully rebalance."
  },

  // ── Section 4: .NET Stack Deploy ────────────────────────────────────────────

  {
    id: 414, section: "stack", sectionTitle: ".NET Stack Deploy",
    commandTitle: "Deploy a .NET stack from Compose file",
    command: "docker stack deploy -c docker-compose.yml dotnet-stack && docker stack ps dotnet-stack",
    searchTerms: "docker stack deploy compose swarm services .net dotnet postgres stack ps",
    description: "Reads a docker-compose.yml and deploys all services as a Swarm stack named <code>dotnet-stack</code>. The stack groups related services (api, db) so they can be managed together — scale, update, remove as one unit.",
    parts: [
      { text: "docker stack deploy -c docker-compose.yml", explanation: "reads the Compose file — creates a service for each entry under 'services'" },
      { text: "dotnet-stack", explanation: "the stack name — prefixed to every service and network (e.g., dotnet-stack_api, dotnet-stack_db)" },
      { text: "docker stack ps dotnet-stack", explanation: "shows each task in the stack — node placement, state, and image" },
    ],
    example: "$ docker stack deploy -c docker-compose.yml dotnet-stack\nCreating network dotnet-stack_app-network\nCreating service dotnet-stack_db\nCreating service dotnet-stack_api\n\n$ docker stack ps dotnet-stack\nID    NAME                     IMAGE               NODE      DESIRED STATE\na1b…  dotnet-stack_db.1        postgres:16-alpine  docker-3  Running\nb2c…  dotnet-stack_api.1       dotnet-api:latest   docker-1  Running\nc3d…  dotnet-stack_api.2       dotnet-api:latest   docker-2  Running\nd4e…  dotnet-stack_api.3       dotnet-api:latest   docker-3  Running",
    why: "A stack is the Swarm-native equivalent of docker-compose up — but for clusters. It uses the same Compose file format (with deploy: keys for Swarm-specific settings) but schedules services across nodes and integrates with Swarm's rolling update and rollback machinery."
  },

  {
    id: 415, section: "stack", sectionTitle: ".NET Stack Deploy",
    commandTitle: "Examine the stack's Compose file (overlay network)",
    command: "cat docker-compose.yml",
    searchTerms: "compose yml stack swarm overlay network deploy replicas update_config constraints",
    description: "The Compose file for Swarm stacks. Key differences from single-host Compose: <code>driver: overlay</code> (multi-host networking), <code>deploy:</code> keys (replicas, update_config, placement), and no <code>build:</code> (images must be pre-built and available in a registry or on all nodes).",
    parts: [
      { text: "driver: overlay", explanation: "overlay network spans all Swarm nodes — containers on different hosts communicate transparently. bridge only works on a single host." },
      { text: "deploy: replicas: 3", explanation: "Swarm-specific: the number of task replicas for this service" },
      { text: "deploy: update_config:", explanation: "rolling update parameters — parallelism, delay, failure_action" },
      { text: "deploy: placement: constraints:", explanation: "node selection rules — e.g., 'node.role == worker' pins the DB to workers only" },
    ],
    example: "version: '3.8'\nservices:\n  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_PASSWORD: secret\n      POSTGRES_DB: weatherapp\n    volumes:\n      - pg-data:/var/lib/postgresql/data\n    networks:\n      - app-network\n    deploy:\n      placement:\n        constraints:\n          - node.role == worker\n  api:\n    image: dotnet-api:latest\n    ports:\n      - \"8080:8080\"\n    environment:\n      ConnectionStrings__Default: \"Host=db;Database=weatherapp;Username=postgres;Password=secret\"\n    networks:\n      - app-network\n    deploy:\n      replicas: 3\n      update_config:\n        parallelism: 1\n        delay: 10s\n      restart_policy:\n        condition: on-failure\nnetworks:\n  app-network:\n    driver: overlay\nvolumes:\n  pg-data:",
    why: "The overlay driver is the critical difference. Without it, containers on docker-1 can't reach containers on docker-2 by service name. Overlay creates a virtual network that spans all Swarm nodes — service discovery works cluster-wide."
  },

  {
    id: 416, section: "stack", sectionTitle: ".NET Stack Deploy",
    commandTitle: "Check stack service logs",
    command: "docker service logs dotnet-stack_api",
    searchTerms: "docker service logs stack api dotnet kestrel listening stdout",
    description: "Streams stdout/stderr from all replicas of the api service in the stack. The output is tagged with the task ID so you can tell which replica produced each log line. Useful for debugging startup issues across nodes.",
    parts: [
      { text: "docker service logs dotnet-stack_api", explanation: "aggregates logs from all tasks of the named service" },
      { text: "docker service logs -f dotnet-stack_api", explanation: "follows log output continuously — Ctrl+C to exit" },
      { text: "docker service logs --tail 20 dotnet-stack_db", explanation: "shows only the last 20 lines from the database service" },
    ],
    example: "$ docker service logs dotnet-stack_api\ndotnet-stack_api.1.b2c3d4e5@docker-1 | info: Microsoft.Hosting.Lifetime[14]\ndotnet-stack_api.1.b2c3d4e5@docker-1 |       Now listening on: http://[::]:8080\ndotnet-stack_api.2.c3d4e5f6@docker-2 | info: Microsoft.Hosting.Lifetime[0]\ndotnet-stack_api.2.c3d4e5f6@docker-2 |       Application started.",
    why: "In a multi-node Swarm, you can't docker logs a container that's on another node. docker service logs aggregates logs from all nodes — it's the cluster-wide equivalent."
  },

  {
    id: 417, section: "stack", sectionTitle: ".NET Stack Deploy",
    commandTitle: "Remove the stack",
    command: "docker stack rm dotnet-stack",
    searchTerms: "docker stack rm remove delete cleanup services network stack",
    description: "Stops and removes all services and the overlay network in the <code>dotnet-stack</code> stack. Named volumes (<code>pg-data</code>) are preserved. The stack name is removed from Swarm's internal state.",
    parts: [
      { text: "docker stack rm dotnet-stack", explanation: "removes every service in the stack and the overlay network — volumes survive" },
    ],
    example: "Removing service dotnet-stack_api\nRemoving service dotnet-stack_db\nRemoving network dotnet-stack_app-network",
    why: "Stack rm is the cluster-wide docker-compose down. It removes the overlay network too — something you'd have to do manually with docker network rm if you managed each service individually."
  },

  // ── Section 5: Cluster Teardown ─────────────────────────────────────────────

  {
    id: 418, section: "teardown", sectionTitle: "Cluster Teardown",
    commandTitle: "Remove the .NET service (standalone)",
    command: "docker service rm dotnet-api && docker service ls",
    searchTerms: "docker service rm remove delete service cleanup swarm",
    description: "Removes a standalone service (one not managed by a stack). All replicas are stopped and removed across all nodes. If this is the last service, the ingress mesh port mappings are also cleaned up.",
    parts: [
      { text: "docker service rm dotnet-api", explanation: "stops and removes all tasks of this service on all nodes — immediate" },
    ],
    example: "$ docker service rm dotnet-api\ndotnet-api\n\n$ docker service ls\nID   NAME   MODE   REPLICAS   IMAGE   PORTS\n# (empty)",
    why: "Always remove services when you're done with them. Idle services still consume CPU for health checks and memory for the task metadata — on resource-constrained VMs, this matters."
  },

  {
    id: 419, section: "teardown", sectionTitle: "Cluster Teardown",
    commandTitle: "Leave the Swarm (worker)",
    command: "docker-machine ssh docker-2\ndocker swarm leave\nexit\ndocker-machine ssh docker-3\ndocker swarm leave\nexit",
    searchTerms: "docker swarm leave worker exit decommission remove from cluster",
    description: "Removes docker-2 and docker-3 from the Swarm. Workers can leave at any time — their running tasks are stopped. After leaving, a node reverts to standalone Docker mode.",
    parts: [
      { text: "docker swarm leave", explanation: "removes this node from the Swarm — works on workers and non-Leader managers" },
      { text: "docker swarm leave --force", explanation: "required on the Leader manager — bypasses the safety check that prevents the last manager from leaving" },
    ],
    example: "docker@docker-2:~$ docker swarm leave\nNode left the swarm.\n\ndocker@docker-3:~$ docker swarm leave\nNode left the swarm.",
    why: "Workers should leave before the manager. If the manager leaves first, workers become orphaned and must be force-left with docker swarm leave --force. Order matters."
  },

  {
    id: 420, section: "teardown", sectionTitle: "Cluster Teardown",
    commandTitle: "Leave the Swarm (manager, force)",
    command: "docker-machine ssh docker-1\ndocker swarm leave --force\nexit",
    searchTerms: "docker swarm leave force manager leader decommission destroy cluster",
    description: "Forces docker-1 (the Leader) to leave the Swarm. The <code>--force</code> flag is required because the manager holds the cluster's Raft consensus state — Docker wants you to confirm you're intentionally destroying the cluster.",
    parts: [
      { text: "docker swarm leave --force", explanation: "bypasses the 'this is the last manager' safety check — destroys the Swarm" },
    ],
    example: "docker@docker-1:~$ docker swarm leave --force\nNode left the swarm.",
    why: "Without --force, Docker refuses to let the last manager leave (it would orphan the cluster state). Since you're intentionally decommissioning the entire Swarm, --force is the correct choice."
  },

  {
    id: 421, section: "teardown", sectionTitle: "Cluster Teardown",
    commandTitle: "Remove all docker-machine VMs",
    command: "docker-machine rm docker-1 docker-2 docker-3",
    searchTerms: "docker-machine rm remove delete vms cleanup infrastructure teardown",
    description: "Permanently deletes all three VMs — stops them if running, removes VirtualBox VM files, SSH keys, and docker-machine metadata. Frees several GB of disk space.",
    parts: [
      { text: "docker-machine rm docker-1 docker-2 docker-3", explanation: "accepts multiple names space-separated — removes all three in one command" },
    ],
    example: "About to remove docker-1, docker-2, docker-3\nAre you sure? (y/n): y\nSuccessfully removed docker-1\nSuccessfully removed docker-2\nSuccessfully removed docker-3",
    why: "Each VM takes ~2-3 GB of disk space. Three VMs = ~6-9 GB. Once the Swarm exercises are complete, rm all VMs to reclaim storage. Re-run the create commands fresh for the next session."
  },

  // ── Section 6: Node.js Comparison ───────────────────────────────────────────

  {
    id: 422, section: "compare", sectionTitle: ".NET vs Node.js on Swarm",
    commandTitle: "Node.js equivalent — service creation and stack",
    command: "docker service create --replicas 3 --name node-api --publish 3000:3000 --update-delay 10s --update-parallelism 1 node-api:latest",
    searchTerms: "node.js nodejs swarm service stack comparison dotnet .net ports env vars",
    description: "The same Swarm mechanics with a Node.js image. Compare: port 3000 vs 8080, env var format, image size. The Swarm layer (service create, scale, drain, stack deploy) is identical — only the application stack changes.",
    parts: [
      { text: "publish 3000:3000", explanation: "Node.js apps conventionally listen on 3000 — .NET uses 8080" },
      { text: "node-api:latest (~180 MB)", explanation: "Node.js alpine image is ~30 MB smaller than .NET's aspnet:8.0 (~210 MB)" },
      { text: "Cold start time", explanation: "Node.js starts in ~200ms; .NET 8 with ReadyToRun in ~800ms — small difference, irrelevant for Swarm's second-scale scheduling" },
    ],
    example: "# Node.js service — identical Swarm mechanics, different application stack\ndocker service create \\\n  --replicas 3 \\\n  --name node-api \\\n  --publish 3000:3000 \\\n  --update-delay 10s \\\n  --update-parallelism 1 \\\n  --env DATABASE_URL=\"postgresql://postgres:secret@db:5432/weatherapp\" \\\n  node-api:latest\n\n# Same curl test — different port\ncurl http://192.168.99.101:3000/weather\n# All Swarm features (ingress mesh, drain, scale, update) work identically",
    why: "The Swarm layer is language-agnostic. Whether you run .NET, Node.js, Go, Python, or PHP — docker service create, docker stack deploy, and docker node update work exactly the same. The only differences are port conventions and env var naming."
  },

];
