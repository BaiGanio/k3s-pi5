// modules/jenkins/jenkins-slaves.js
// M5: Jenkins Slave Nodes — Distributed Builds, SSH Credentials, Node Labels
// Extracted from DOB-M5 Practice (Practice-M5-Jenkins.md, Part 3)
// Framed for .NET / Node.js workloads on dedicated build agents

window.commandData = [

  // ── Section 1: Slave node concept ─────────────────────────────────────────

  {
    id: 701, section: "concept", sectionTitle: "Slave Nodes — Concept",
    commandTitle: "What is a slave (agent) node?",
    command: "# A Jenkins agent is a separate machine that executes build steps\n# The master dispatches jobs; agents do the work",
    searchTerms: "jenkins slave agent node distributed build offload",
    description: "A <strong>slave</strong> (now called <strong>agent</strong> in current terminology) is a separate machine — VM, container, or bare metal — that connects to the Jenkins master and executes build steps on its behalf. The master schedules jobs and stores results; agents provide execution capacity. One master can manage dozens of agents, each with different OS, toolchain, or hardware profiles.",
    parts: [
      { text: "Master (controller)", explanation: "serves the UI, schedules jobs, stores build history — does no heavy lifting" },
      { text: "Agent (slave/node)", explanation: "a worker machine that runs build steps — can have specific labels (dotnet, nodejs, docker)" },
      { text: "Communication", explanation: "SSH (recommended) or JNLP (Java Network Launch Protocol — the agent.jar method)" },
    ],
    example: "Master (192.168.99.100)\n  ├── Agent 'linux-dotnet'  (CentOS, .NET 8 SDK, 192.168.99.102)\n  └── Agent 'linux-nodejs' (CentOS, Node.js 20, 192.168.99.103)",
    why: "Offloading builds to agents keeps the master responsive (the UI never freezes during a build) and lets you target specific environments. A .NET build needs the .NET SDK; a Node.js build needs npm — agents carry those toolchains so the master doesn't have to."
  },

  // ── Section 2: 3-node Vagrant environment ─────────────────────────────────

  {
    id: 710, section: "environment", sectionTitle: "3-Node Environment",
    commandTitle: "Extend the Vagrantfile to 3 nodes (master + client + slave)",
    command: "cat Vagrantfile",
    searchTerms: "vagrant vagrantfile three nodes master client slave centos agent",
    description: "Extend the Vagrantfile to add a <code>slave</code> VM — the dedicated build agent. This node will run Docker, .NET SDK, or Node.js and execute Jenkins pipeline stages. Port 8088 on the host forwards to port 80 on the slave for accessing deployed apps.",
    parts: [
      { text: "config.vm.define \"slave\"", explanation: "add a third VM — the Jenkins build agent" },
      { text: "slave.vm.network \"private_network\", ip: \"192.168.99.102\"", explanation: "a distinct IP — Jenkins connects to this to launch the agent" },
      { text: "forwarded_port guest: 80, host: 8088", explanation: "deployed apps on the slave are reachable at http://localhost:8088" },
      { text: "vagrant up", explanation: "brings up the new slave; master and client are already running" },
    ],
    example: `# Master and client definitions (keep the existing blocks above)
# ... master: 192.168.99.100 ...
# ... client: 192.168.99.101 ...

  # ── Slave node (build agent — NEW: add this below the client block) ────────
  config.vm.define "slave" do |node|
    node.vm.box      = "shekeriev/centos-7-64-minimal"
    node.vm.hostname = "slave.sulab.local"
    node.vm.network "private_network", ip: "192.168.99.102"
    node.vm.network "forwarded_port", guest: 80, host: 8088
    node.vm.provision "shell", path: "add_hosts.sh"
  end`,
    why: "Three nodes, three roles: master orchestrates, client is an SSH target, slave is a dedicated build agent. Labels (dotnet, nodejs, docker) route jobs to the slave — the master stays responsive because it never runs builds."
  },
  {
    id: 711, section: "environment", sectionTitle: "3-Node Environment",
    commandTitle: "Bring up the slave VM",
    command: "vagrant up",
    searchTerms: "vagrant up slave third vm boot provision agent",
    description: "Bring up the new slave VM. Vagrant detects the master and client are already running and only provisions the slave.",
    parts: [
      { text: "vagrant up", explanation: "boots any VMs not yet running — master and client are skipped, slave is created" },
    ],
    example: "==> slave: Importing base box 'shekeriev/centos-7-64-minimal'...\n==> slave: Running provisioner: shell...\n==> slave: Machine booted and ready!",
    why: "Gradual environment growth mirrors real infrastructure: you start small, then add capacity as needs grow — without rebuilding from scratch."
  },
  {
    id: 712, section: "environment", sectionTitle: "3-Node Environment",
    commandTitle: "Prepare the slave VM (user, sudo, SSH access)",
    command: "vagrant ssh slave -c 'sudo useradd jenkins && echo \"jenkins:Password1\" | sudo chpasswd && echo \"jenkins ALL=(ALL) NOPASSWD: ALL\" | sudo tee /etc/sudoers.d/jenkins'",
    searchTerms: "jenkins user create slave agent node sudo ssh",
    description: "Create the <code>jenkins</code> user on the slave with passwordless sudo — same as we did for the client. Then from the master, copy the SSH key: <code>sudo su - jenkins -c 'ssh-copy-id jenkins@slave.sulab.local'</code>. Verify: <code>ssh jenkins@slave.sulab.local</code> should connect without a password prompt.",
    parts: [
      { text: "useradd jenkins", explanation: "create the jenkins system user on the slave" },
      { text: "chpasswd", explanation: "set the password non-interactively" },
      { text: "tee /etc/sudoers.d/jenkins", explanation: "grant passwordless sudo" },
      { text: "ssh-copy-id (from master)", explanation: "enable passwordless SSH from master → slave" },
    ],
    example: "Number of key(s) added: 1\n$ ssh jenkins@slave.sulab.local\nLast login: ...\n[jenkins@slave ~]$",
    why: "The slave must have the same jenkins user with the same SSH key as the master. Jenkins connects to agents as this user to launch the agent process and execute build steps."
  },

  // ── Section 3: Adding a slave node in Jenkins ─────────────────────────────

  {
    id: 720, section: "add-slave", sectionTitle: "Adding a Slave Node",
    commandTitle: "Add a new node in Jenkins (Web UI)",
    command: "# Manage Jenkins → Manage Nodes and Clouds → New Node\n# Node name: 'slave-node' → Permanent Agent → OK",
    searchTerms: "jenkins add slave node permanent agent new",
    description: "Navigate to <strong>Manage Nodes and Clouds</strong>, click <strong>New Node</strong>, enter a name (e.g. <code>slave-node</code>), and select <strong>Permanent Agent</strong>. This creates a static agent entry — Jenkins will try to connect to it via SSH.",
    parts: [
      { text: "Manage Nodes and Clouds", explanation: "the agent/node management page" },
      { text: "Permanent Agent", explanation: "a statically-defined, always-on agent (vs. cloud/dynamic agents that spin up on demand)" },
      { text: "Node name: slave-node", explanation: "a descriptive name — will be used in job 'Restrict where' labels" },
    ],
    example: "Node 'slave-node' created. Configure it with remote root directory, launch method, and labels.",
    why: "Permanent agents are the simplest model — one VM, one agent, always available. Cloud agents (Kubernetes pods, EC2 spot instances) scale dynamically but add complexity. Start with permanent agents for learning."
  },
  {
    id: 721, section: "add-slave", sectionTitle: "Adding a Slave Node",
    commandTitle: "Configure the slave node (SSH launch method)",
    command: "# Remote root directory: /home/jenkins\n# Launch method: Launch agents via SSH\n# Host: slave.sulab.local\n# Credentials: jenkins (SSH private key)\n# Labels: linux centos dotnet nodejs",
    searchTerms: "jenkins slave node configure ssh launch method labels",
    description: "Configure the agent: <strong>Remote root directory</strong> = <code>/home/jenkins</code> (the agent's workspace root). <strong>Launch method</strong> = <strong>Launch agents via SSH</strong> (Jenkins SSHes to the slave and starts the agent process). <strong>Labels</strong> = <code>linux centos dotnet nodejs</code> — space-separated tags that jobs use to target this node.",
    parts: [
      { text: "Remote root directory: /home/jenkins", explanation: "where Jenkins stores workspace, tools, and agent logs on the slave" },
      { text: "Launch method: SSH", explanation: "Jenkins SSHes in and runs agent.jar — no manual agent startup needed" },
      { text: "Labels: linux centos dotnet nodejs", explanation: "tags that jobs match against with 'Restrict where this project can run'" },
    ],
    example: "Agent successfully connected.\nAgent 'slave-node' is online.\nDisk: 40 GB free. RAM: 2 GB free.",
    why: "Labels are the scheduling mechanism. A .NET job sets 'Restrict where' → <code>dotnet</code> and only runs on nodes with that label. A Node.js job uses <code>nodejs</code>. Labels decouple job requirements from specific hostnames."
  },

  // ── Section 4: Build on the slave ─────────────────────────────────────────

  {
    id: 730, section: "build-on-slave", sectionTitle: "Building on the Slave",
    commandTitle: "Create a job restricted to the slave node",
    command: "# New Item → Freestyle → 'Slave-Info'\n# Restrict where this project can run → Label Expression: slave-node",
    searchTerms: "jenkins restrict where project run slave label expression",
    description: "Create a freestyle job that runs exclusively on the slave. Under <strong>Restrict where this project can run</strong>, enter the node name or a label expression. Add a shell build step: <code>hostname && uname -a && whoami</code> — this proves the job runs on the slave, not the master.",
    parts: [
      { text: "Restrict where this project can run", explanation: "only run on nodes matching this label expression" },
      { text: "hostname && uname -a && whoami", explanation: "confirm which machine and user are executing the build" },
    ],
    example: "Console Output:\nBuilding remotely on slave-node in workspace /home/jenkins/workspace/DOB-Demo/Slave-Info\n[Build] $ /bin/sh -xe /tmp/jenkins67890.sh\n+ hostname\nslave.sulab.local\n+ whoami\njenkins",
    why: "If the console output shows <code>slave.sulab.local</code> and not <code>master.sulab.local</code>, you've confirmed the slave is working. The build workspace is on the slave's disk, not the master's."
  },
  {
    id: 731, section: "build-on-slave", sectionTitle: "Building on the Slave",
    commandTitle: "Run a .NET build on the slave",
    command: "# In job config → Restrict where: dotnet\n# Execute shell:\ndotnet --version && dotnet restore && dotnet build -c Release",
    searchTerms: "dotnet build slave node jenkins sdk",
    description: "Create a job that builds a .NET project on the slave. The slave must have the .NET SDK installed. Use label <code>dotnet</code> to target nodes with the .NET toolchain. This is the pattern: master schedules, slave compiles.",
    parts: [
      { text: "dotnet --version", explanation: "verify the .NET SDK is available on the slave" },
      { text: "dotnet restore && dotnet build -c Release", explanation: "standard .NET CI steps — now running on dedicated build hardware" },
    ],
    example: "8.0.4\n  Restore completed in 2.3s\n  Build succeeded. 0 Warning(s), 0 Error(s)",
    why: "Offloading .NET builds to a dedicated agent prevents the master from slowing down during long compilations. You can also have agents with different .NET versions (6, 7, 8) and target them by label."
  },
  {
    id: 732, section: "build-on-slave", sectionTitle: "Building on the Slave",
    commandTitle: "Run a Node.js build on the slave",
    command: "# In job config → Restrict where: nodejs\n# Execute shell:\nnode --version && npm ci && npm run build && npm test",
    searchTerms: "nodejs npm build test slave jenkins agent",
    description: "Same pattern for Node.js: restrict to the <code>nodejs</code> label, run the standard CI steps. The slave should have Node.js and npm pre-installed.",
    parts: [
      { text: "node --version && npm --version", explanation: "verify the Node.js toolchain is available" },
      { text: "npm ci && npm run build && npm test", explanation: "clean install, compile TypeScript/bundle, run Jest/Vitest" },
    ],
    example: "v20.12.2\n10.5.2\n> my-app@1.0.0 build\n> tsc && vite build\n✓ built in 3.8s\nTests: 47 passed, 47 total",
    why: "Node.js builds can be CPU and memory intensive (TypeScript compilation, webpack bundling, test suites). An agent with more RAM and CPU cores finishes faster — and the master stays responsive."
  },

  // ── Section 5: Remote execution from a slave ──────────────────────────────

  {
    id: 740, section: "slave-remote", sectionTitle: "Slave → Remote Execution",
    commandTitle: "Configure SSH site for remote host (from slave)",
    command: "# Manage Jenkins → Configure System → SSH remote hosts → Add:\n# Hostname: master.sulab.local, Port: 22, Credentials: jenkins key\n# → Check connection → Save",
    searchTerms: "jenkins ssh remote host slave execute build step",
    description: "Configure an SSH site for the master (or any remote host) so that jobs running on the slave can execute commands elsewhere. This is a chained pattern: master dispatches to slave → slave SSHs to a third machine and runs commands there.",
    parts: [
      { text: "SSH remote hosts → Add", explanation: "register a remote host for SSH-based build steps" },
      { text: "Hostname: master.sulab.local", explanation: "the target remote machine" },
    ],
    example: "Check connection → Successful connection to master.sulab.local:22",
    why: "The slave might not have all tools installed. It can SSH to another machine that does — a Windows VM for .NET Framework builds, a macOS VM for iOS builds, or a database server for integration tests."
  },

  // ── Section 6: Multiple slaves with different toolchains ──────────────────

  {
    id: 750, section: "multi-slave", sectionTitle: "Multi-Slave Topology",
    commandTitle: "Label strategy for heterogeneous agents",
    command: "# Agent 1 labels: 'linux dotnet docker'\n# Agent 2 labels: 'linux nodejs docker'\n# Agent 3 labels: 'linux postgresql db'",
    searchTerms: "jenkins multi slave label strategy heterogeneous agents dotnet nodejs postgresql",
    description: "In a real setup, you'd have multiple agents with different toolchains. Labels route jobs to the right agent. A <strong>label expression</strong> like <code>linux && dotnet</code> targets only agents that have both tags. <code>dotnet || nodejs</code> targets any agent with either.",
    parts: [
      { text: "Agent 1: dotnet label", explanation: ".NET SDK installed — targets .NET build/deploy jobs" },
      { text: "Agent 2: nodejs label", explanation: "Node.js + npm installed — targets JavaScript/TypeScript jobs" },
      { text: "Agent 3: postgresql label", explanation: "PostgreSQL client tools installed — targets DB migration/integration test jobs" },
    ],
    example: "Job 'Full-Stack-Integration-Test'\n  Restrict where: dotnet && postgresql\n  → Runs only on agents with BOTH .NET SDK and PostgreSQL client",
    why: "Label expressions are a declarative scheduling language. You say what the job needs (<code>dotnet && postgresql</code>), not which specific machine to use. Jenkins finds a matching agent — if none exists, the job queues until one becomes available."
  },

];
