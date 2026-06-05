// modules/docker/homework-m3.js
// M3: Advanced Docker — Homework
// Original assignment: Vagrantfile for 3-node Swarm + docker-compose (web+db, replicate ×3)

window.commandData = [

  // ── Section 1: Assignment Overview ──────────────────────────────────────────

  {
    id: 450, section: "overview", sectionTitle: "Assignment",
    commandTitle: "Homework M3 — .NET Swarm Deployment",
    command: "cat README.md",
    searchTerms: "homework m3 assignment vagrantfile swarm docker-compose .net dotnet node.js deploy",
    description: "The assignment has three parts: (1) Create a Vagrantfile that provisions 3 VMs with Docker and joins them into a Swarm cluster. (2) Write a docker-compose.yml with a web service (.NET 8 or Node.js) and a database (PostgreSQL). (3) Deploy the stack on the Swarm and scale the web service to 3 replicas.",
    parts: [
      { text: "Part 1: Vagrantfile", explanation: "Provision 3 CentOS/Ubuntu VMs with Docker pre-installed, then automatically initialize a Swarm and join workers" },
      { text: "Part 2: docker-compose.yml", explanation: "Define a web service (.NET Minimal API or Node.js Express) connected to PostgreSQL" },
      { text: "Part 3: Deploy + Scale", explanation: "Deploy as a Swarm stack and scale the web service to 3 replicas" },
    ],
    example: "# Assignment structure:\n#\n# Part 1 — Vagrantfile\n#   - 3 VMs: manager (192.168.56.10), worker1 (192.168.56.11), worker2 (192.168.56.12)\n#   - Provision Docker on each\n#   - Manager runs: docker swarm init --advertise-addr 192.168.56.10\n#   - Workers run: docker swarm join --token <TOKEN> 192.168.56.10:2377\n#\n# Part 2 — docker-compose.yml\n#   - service db: postgres:16-alpine, named volume, overlay network\n#   - service api: .NET 8 Minimal API or Node.js Express, build from Dockerfile\n#\n# Part 3 — Deploy\n#   - docker stack deploy -c docker-compose.yml homework-stack\n#   - docker service scale homework-stack_api=3\n#   - curl http://192.168.56.10:8080/weather (or :3000 for Node.js)",
    why: "This assignment tests the three core skills from M3: infrastructure-as-code (Vagrantfile), multi-container orchestration (Compose), and cluster deployment (Swarm). Completing it proves you can go from zero to a running distributed application."
  },

  // ── Section 2: .NET Solution ────────────────────────────────────────────────

  {
    id: 451, section: "dotnet", sectionTitle: ".NET Solution",
    commandTitle: "Vagrantfile — 3-node Swarm with .NET",
    command: "cat Vagrantfile",
    searchTerms: "vagrantfile .net dotnet swarm docker provision shell 3 nodes centos ubuntu",
    description: "A Vagrantfile that provisions three CentOS 7 VMs, installs Docker CE on each, initializes a Swarm on the manager, and automatically joins the workers. The provisioning script is idempotent — run <code>vagrant up</code> from zero or after <code>vagrant destroy</code>.",
    parts: [
      { text: "config.vm.define \"manager\"", explanation: "defines the first VM — will become the Swarm manager and Leader" },
      { text: "config.vm.define \"worker1\" / \"worker2\"", explanation: "defines two worker VMs — will join the Swarm automatically" },
      { text: "config.vm.provision \"shell\"", explanation: "runs a Bash script on each VM after boot — installs Docker, then init/join Swarm" },
      { text: "docker swarm init --advertise-addr", explanation: "runs only on the manager — workers need the token generated here" },
      { text: "docker swarm join --token", explanation: "runs on workers after the manager generates the token — coordinated via shared /vagrant directory" },
    ],
    example: "# Vagrantfile — .NET Swarm Cluster\nVagrant.configure(\"2\") do |config|\n  config.vm.box = \"centos/7\"\n\n  # ── Manager ──\n  config.vm.define \"manager\" do |m|\n    m.vm.network \"private_network\", ip: \"192.168.56.10\"\n    m.vm.provider \"virtualbox\" do |vb|\n      vb.memory = \"1024\"\n      vb.cpus = 1\n    end\n    m.vm.provision \"shell\", path: \"provision.sh\", args: [\"manager\", \"192.168.56.10\"]\n  end\n\n  # ── Worker 1 ──\n  config.vm.define \"worker1\" do |w|\n    w.vm.network \"private_network\", ip: \"192.168.56.11\"\n    w.vm.provider \"virtualbox\" do |vb|\n      vb.memory = \"1024\"\n      vb.cpus = 1\n    end\n    w.vm.provision \"shell\", path: \"provision.sh\", args: [\"worker\", \"192.168.56.10\"]\n  end\n\n  # ── Worker 2 ──\n  config.vm.define \"worker2\" do |w|\n    w.vm.network \"private_network\", ip: \"192.168.56.12\"\n    w.vm.provider \"virtualbox\" do |vb|\n      vb.memory = \"1024\"\n      vb.cpus = 1\n    end\n    w.vm.provision \"shell\", path: \"provision.sh\", args: [\"worker\", \"192.168.56.10\"]\n  end\nend",
    why: "Vagrant replaces three manual docker-machine create commands with one declarative file. A new team member runs 'vagrant up' and gets the exact same 3-node cluster — this is infrastructure-as-code in action."
  },

  {
    id: 452, section: "dotnet", sectionTitle: ".NET Solution",
    commandTitle: "Provision script (install Docker, init/join Swarm)",
    command: "cat provision.sh",
    searchTerms: "provision shell script docker install centos swarm init join manager worker",
    description: "A single Bash script used by all three VMs. It installs Docker CE, then branches: the manager runs <code>docker swarm init</code> and saves the join token to a shared file; workers read the token and run <code>docker swarm join</code>.",
    parts: [
      { text: "yum install -y docker-ce", explanation: "installs Docker Community Edition on CentOS 7" },
      { text: "systemctl enable docker && systemctl start docker", explanation: "starts Docker and ensures it starts on boot" },
      { text: "if [ \"$1\" = \"manager\" ]; then docker swarm init ...", explanation: "manager branch — initializes the Swarm and saves the token" },
      { text: "docker swarm join-token -q worker > /vagrant/join-token", explanation: "saves the token to the Vagrant shared folder so workers can read it" },
      { text: "else ... docker swarm join --token $(cat /vagrant/join-token)", explanation: "worker branch — reads the token from the shared folder and joins" },
    ],
    example: "#!/bin/bash\n# provision.sh — install Docker and join Swarm\n# Args: $1 = role (manager|worker), $2 = manager IP\n\n# Install Docker\nyum install -y yum-utils\nyum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo\nyum install -y docker-ce\nsystemctl enable docker\nsystemctl start docker\n\nif [ \"$1\" = \"manager\" ]; then\n  docker swarm init --advertise-addr \"$2\"\n  docker swarm join-token -q worker > /vagrant/join-token\n  echo \"Swarm initialized. Token saved to /vagrant/join-token\"\nelse\n  # Wait for manager to create the token file\n  while [ ! -f /vagrant/join-token ]; do sleep 2; done\n  docker swarm join --token $(cat /vagrant/join-token) \"$2:2377\"\n  echo \"Joined Swarm as worker.\"\nfi",
    why: "The shared /vagrant directory is the coordination mechanism. The manager writes the token there; workers poll until it appears. This pattern works because Vagrant provisions VMs sequentially — the manager finishes before workers start."
  },

  {
    id: 453, section: "dotnet", sectionTitle: ".NET Solution",
    commandTitle: ".NET docker-compose.yml for Swarm stack",
    command: "cat docker-compose.yml",
    searchTerms: "docker-compose yml .net dotnet stack swarm postgres replicas deploy update_config overlay",
    description: "The Compose file for the homework stack. Defines a .NET 8 Web API service (built from local Dockerfile, tagged and pushed to a registry or pre-built on all nodes) and a PostgreSQL database. The <code>deploy:</code> keys define Swarm-specific replication and update strategy.",
    parts: [
      { text: "deploy: replicas: 3", explanation: "Swarm will maintain exactly 3 copies of the .NET API across the cluster" },
      { text: "deploy: update_config: parallelism: 1, delay: 10s", explanation: "rolling updates — one replica at a time, 10s between each" },
      { text: "deploy: placement: constraints:", explanation: "optional — pin the database to a specific node (e.g., 'node.hostname == worker1')" },
      { text: "driver: overlay", explanation: "required for Swarm stacks — enables multi-host networking" },
    ],
    example: "version: '3.8'\nservices:\n  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_PASSWORD: homework123\n      POSTGRES_DB: homework\n    volumes:\n      - pg-data:/var/lib/postgresql/data\n    networks:\n      - app-network\n    deploy:\n      placement:\n        constraints:\n          - node.role == worker\n  api:\n    image: homework-api:latest\n    ports:\n      - \"8080:8080\"\n    environment:\n      ConnectionStrings__Default: \"Host=db;Database=homework;Username=postgres;Password=homework123\"\n    networks:\n      - app-network\n    deploy:\n      replicas: 3\n      update_config:\n        parallelism: 1\n        delay: 10s\nnetworks:\n  app-network:\n    driver: overlay\nvolumes:\n  pg-data:",
    why: "The key homework requirements: (a) two services (api + db), (b) web service replicated ×3, (c) database content displayed via web endpoint. The placement constraint keeps the database on a known worker node — important because named volumes are node-local in Swarm."
  },

  {
    id: 454, section: "dotnet", sectionTitle: ".NET Solution",
    commandTitle: "Build, ship, deploy, and verify",
    command: "docker build -t homework-api . && docker stack deploy -c docker-compose.yml homework && docker stack ps homework && curl http://192.168.56.10:8080/weather",
    searchTerms: "build deploy stack homework verify curl weather scale replicas docker",
    description: "The full deployment sequence: build the .NET API image, deploy the stack, verify tasks are running, and test the endpoint. The curl command on the manager's IP proves the ingress mesh routes correctly.",
    parts: [
      { text: "docker build -t homework-api .", explanation: "builds the .NET image locally — in production, push to a registry first" },
      { text: "docker stack deploy -c docker-compose.yml homework", explanation: "deploys all services to the Swarm under the 'homework' stack" },
      { text: "docker stack ps homework", explanation: "verifies all tasks (1 db + 3 api) are running across nodes" },
      { text: "curl http://192.168.56.10:8080/weather", explanation: "end-to-end test — hits the ingress mesh, routes to a healthy .NET replica, queries Postgres, returns JSON" },
    ],
    example: "$ docker build -t homework-api .\nSuccessfully tagged homework-api:latest\n\n$ docker stack deploy -c docker-compose.yml homework\nCreating network homework_app-network\nCreating service homework_db\nCreating service homework_api\n\n$ docker stack ps homework\nID    NAME              NODE     DESIRED STATE\na1b…  homework_db.1      worker1  Running\nb2c…  homework_api.1     manager  Running\nc3d…  homework_api.2     worker1  Running\nd4e…  homework_api.3     worker2  Running\n\n$ curl http://192.168.56.10:8080/weather\n[{\"city\":\"London\",\"temperature\":12.5,\"description\":\"Cloudy\"}]",
    why: "This is the deliverable. If curl returns JSON, all three parts of the assignment work: Vagrant provisioned the cluster, Compose defined the stack, and Swarm deployed and routed traffic correctly."
  },

  // ── Section 3: Node.js Solution ─────────────────────────────────────────────

  {
    id: 455, section: "nodejs", sectionTitle: "Node.js Alternative",
    commandTitle: "Node.js docker-compose.yml (swap-in alternative)",
    command: "cat docker-compose.node.yml",
    searchTerms: "node.js nodejs express pg postgres docker-compose homework alternative",
    description: "The same homework stack with a Node.js Express API instead of .NET. The only differences: port 3000, DATABASE_URL env var, and the image. All Swarm mechanics (overlay network, replicas, update_config) are identical.",
    parts: [
      { text: "ports: '3000:3000'", explanation: "Node.js convention — .NET uses 8080" },
      { text: "DATABASE_URL: postgresql://postgres:homework123@db:5432/homework", explanation: "Node.js uses a single URI-format connection string" },
      { text: "image: homework-api-node:latest", explanation: "Node.js image (~180 MB) vs .NET image (~210 MB)" },
    ],
    example: "# Node.js docker-compose.yml — same structure, different app stack\nservices:\n  db:\n    image: postgres:16-alpine\n    # ... identical to .NET version\n  api:\n    image: homework-api-node:latest\n    ports:\n      - '3000:3000'\n    environment:\n      DATABASE_URL: \"postgresql://postgres:homework123@db:5432/homework\"\n    networks:\n      - app-network\n    deploy:\n      replicas: 3\n      update_config:\n        parallelism: 1\n        delay: 10s\n\n# server.js\nconst express = require('express');\nconst { Pool } = require('pg');\nconst app = express();\nconst pool = new Pool({ connectionString: process.env.DATABASE_URL });\napp.get('/weather', async (req, res) => {\n  const r = await pool.query('SELECT city, temperature, description FROM weather');\n  res.json(r.rows);\n});\napp.listen(3000, () => console.log('listening on 3000'));",
    why: "Both .NET and Node.js solutions satisfy the homework requirements equally. Choose the stack you want to practice. The infrastructure layer (Vagrantfile, Swarm, Compose) is identical — the application layer is where the languages differ."
  },

  // ── Section 4: Verification Checklist ───────────────────────────────────────

  {
    id: 456, section: "verify", sectionTitle: "Verification",
    commandTitle: "Complete homework checklist",
    command: "vagrant status && docker node ls && docker stack ps homework && curl http://192.168.56.10:8080/weather",
    searchTerms: "verify check homework complete done checklist status nodes stack curl",
    description: "A complete verification sequence. Run all four commands in order: (1) confirm all 3 VMs are running, (2) confirm all 3 Swarm nodes are Ready/Active, (3) confirm all 4 tasks (1 db + 3 api) are running, (4) confirm the API returns data.",
    parts: [
      { text: "vagrant status", explanation: "should show manager, worker1, worker2 all 'running (virtualbox)'" },
      { text: "docker node ls", explanation: "should show 3 nodes: 1 Leader (manager) + 2 workers — all Ready/Active" },
      { text: "docker stack ps homework", explanation: "should show 4 tasks: homework_db.1 + homework_api.1/.2/.3 — all Running" },
      { text: "curl http://192.168.56.10:8080/weather", explanation: "should return JSON array of weather rows — NOT an error" },
    ],
    example: "$ vagrant status\nCurrent machine states:\nmanager    running (virtualbox)\nworker1    running (virtualbox)\nworker2    running (virtualbox)\n\n$ docker node ls\nID                 HOSTNAME  STATUS  AVAILABILITY  MANAGER STATUS\na1b2c3d4e5f6 *    manager   Ready   Active        Leader\nb2c3d4e5f6a7      worker1   Ready   Active\nc3d4e5f6a7b8      worker2   Ready   Active\n\n$ docker stack ps homework\nID    NAME              NODE     DESIRED STATE  CURRENT STATE\na1b…  homework_db.1      worker1  Running        Running 5m\nb2c…  homework_api.1     manager  Running        Running 5m\nc3d…  homework_api.2     worker1  Running        Running 5m\nd4e…  homework_api.3     worker2  Running        Running 5m\n\n$ curl http://192.168.56.10:8080/weather\n[{\"city\":\"Sofia\",\"temperature\":22.0,\"description\":\"Sunny\"}]\n\n✅ All checks passed — homework complete.",
    why: "This checklist proves the complete chain: Vagrant → Docker → Swarm → Stack → Service → Container → .NET/Node.js → PostgreSQL → JSON response. If any link breaks, the checklist tells you exactly where."
  },

];
