// modules/monitoring/nagios-remote.js
// Monitoring: Nagios Remote Monitoring — NRPE Agent & Agentless Checks
// Extracted from DOB-M6 Practice (Practice-M6-Nagios.md, Part 3)
// Reframed: PostgreSQL, .NET / Node.js Docker containers

window.commandData = [

  // ── Section 1: Extend to 3-node Vagrant environment ───────────────────────

  {
    id: 301, section: "environment", sectionTitle: "3-Node Environment",
    commandTitle: "Extend the Vagrantfile to 3 nodes (master + node1 + node2)",
    command: "cat Vagrantfile",
    searchTerms: "vagrant vagrantfile three nodes master node1 node2 nagios nrpe",
    description: "Extend the Vagrantfile to add <code>node2</code> — this node will run PostgreSQL, Docker, and the NRPE agent for remote monitoring. Exit the master SSH session first.",
    parts: [
      { text: "node2.vm.hostname = 'node2.sulab.local'", explanation: "the second monitored node — runs NRPE for local checks (CPU, disk, Docker)" },
      { text: "node2.vm.network 'private_network', ip: '192.168.99.102'", explanation: "a distinct IP — Nagios connects here for NRPE checks" },
    ],
    example: `# Master and node1 definitions (keep existing blocks above)
# ... master: 192.168.99.100 ...
# ... node1:  192.168.99.101 ...

  # ── Node 2 — PostgreSQL + Docker, monitored via NRPE ───────────────────────
  config.vm.define "node2" do |node|
    node.vm.box      = "shekeriev/centos-7-64-minimal"
    node.vm.hostname = "node2.sulab.local"
    node.vm.network "private_network", ip: "192.168.99.102"
    node.vm.provision "shell", path: "add_hosts.sh"
  end`,
    why: "Three nodes form a realistic monitoring topology: master watches everything, node1 serves HTTP, node2 runs databases and containers. NRPE on node2 lets Nagios peek inside the OS."
  },
  {
    id: 302, section: "environment", sectionTitle: "3-Node Environment",
    commandTitle: "Bring up node2",
    command: "vagrant up",
    searchTerms: "vagrant up node2 third vm boot provision nrpe",
    description: "Bring up the new node2 VM. Vagrant detects master and node1 are already running and only provisions node2.",
    parts: [
      { text: "vagrant up", explanation: "boots any VMs not yet running — master and node1 are skipped, node2 is created" },
    ],
    example: "==> node2: Importing base box 'shekeriev/centos-7-64-minimal'...\n==> node2: Running provisioner: shell...\n==> node2: Machine booted and ready!",
    why: "Gradual infrastructure growth: you add monitoring targets one at a time, configuring Nagios as you go."
  },

  // ── Section 2: NRPE installation ──────────────────────────────────────────

  {
    id: 310, section: "nrpe-install", sectionTitle: "NRPE Agent Installation",
    commandTitle: "Install NRPE and plugins on node2",
    command: "sudo yum install -y nrpe nrpe-selinux nagios-plugins-nrpe nagios-plugins-all",
    searchTerms: "nrpe install yum nagios remote plugin executor agent node2",
    description: "Install the NRPE (Nagios Remote Plugin Executor) agent on node2. <code>nrpe</code> is the daemon; <code>nagios-plugins-nrpe</code> adds the <code>check_nrpe</code> plugin (needed on the Nagios host too); <code>nagios-plugins-all</code> gives NRPE the same plugins the master has (disk, CPU, load, etc.).",
    parts: [
      { text: "nrpe", explanation: "the NRPE daemon — listens on port 5666 for check requests from Nagios" },
      { text: "nagios-plugins-nrpe", explanation: "the check_nrpe plugin — the client-side tool Nagios uses to talk to NRPE" },
      { text: "nagios-plugins-all", explanation: "local plugins NRPE executes — check_disk, check_load, check_procs, etc." },
    ],
    example: "Installed:\n  nrpe.x86_64 0:3.2.1-8.el7\n  nagios-plugins-nrpe.x86_64 0:3.2.1-8.el7\n  nagios-plugins-all.x86_64 0:2.3.3-1.el7",
    why: "NRPE is the bridge between Nagios and local node metrics. Without it, Nagios can only check what's reachable over the network (HTTP, ping, TCP ports). With NRPE, Nagios can check disk space, CPU load, process counts, and Docker container state — things only visible locally."
  },
  {
    id: 311, section: "nrpe-install", sectionTitle: "NRPE Agent Installation",
    commandTitle: "Disable SELinux on node2 (required for NRPE)",
    command: "sudo sed -i 's/SELINUX=enforcing/SELINUX=permissive/' /etc/sysconfig/selinux && sudo reboot",
    searchTerms: "selinux disable permissive nrpe node2 reboot",
    description: "NRPE on CentOS 7 requires SELinux in permissive mode — enforcing mode blocks the NRPE daemon from executing plugins. Set to permissive and reboot. After reboot, SSH back in and verify: <code>getenforce → Permissive</code>.",
    parts: [
      { text: "sed -i ... SELINUX=permissive", explanation: "switch SELinux to permissive mode (logs but doesn't block)" },
      { text: "reboot", explanation: "required — kernel-level SELinux changes need a restart" },
    ],
    example: "$ getenforce\nPermissive",
    why: "This is a lab convenience. In production, you'd create SELinux policies for NRPE instead of disabling it — but that's an advanced topic. Permissive mode is safe for learning."
  },

  // ── Section 3: NRPE configuration ─────────────────────────────────────────

  {
    id: 320, section: "nrpe-config", sectionTitle: "NRPE Configuration",
    commandTitle: "Configure NRPE to accept connections from the Nagios host",
    command: "sudo sed -i 's/allowed_hosts=127.0.0.1,::1/allowed_hosts=127.0.0.1,::1,192.168.99.0\\/24/' /etc/nagios/nrpe.cfg",
    searchTerms: "nrpe allowed_hosts configure subnet nagios master ip 192.168.99",
    description: "By default, NRPE only accepts connections from localhost. Add the <code>192.168.99.0/24</code> subnet (the Vagrant private network) so the Nagios master (192.168.99.100) can connect. Also set <code>dont_blame_nrpe=1</code> to allow argument passing and <code>allow_bash_command_substitution=1</code> for shell commands in NRPE checks.",
    parts: [
      { text: "allowed_hosts=...,192.168.99.0/24", explanation: "allow connections from any host on the 192.168.99.0/24 subnet" },
      { text: "dont_blame_nrpe=1", explanation: "allow NRPE to accept plugin arguments from the Nagios host — needed for parameterised checks" },
      { text: "allow_bash_command_substitution=1", explanation: "allow $(...) and backtick substitution in NRPE command definitions" },
    ],
    example: "allowed_hosts=127.0.0.1,::1,192.168.99.0/24\ndont_blame_nrpe=1\nallow_bash_command_substitution=1",
    why: "<code>dont_blame_nrpe=1</code> is controversial — it lets the Nagios host pass arbitrary arguments to plugins on the monitored node. In production, use fixed commands without arguments. But for learning, argument passing makes configuration much simpler."
  },
  {
    id: 321, section: "nrpe-config", sectionTitle: "NRPE Configuration",
    commandTitle: "Open NRPE port (5666) and start the service",
    command: "sudo firewall-cmd --add-port=5666/tcp --permanent && sudo firewall-cmd --reload && sudo systemctl enable nrpe && sudo systemctl start nrpe",
    searchTerms: "nrpe port 5666 firewall systemctl start enable",
    description: "Open TCP port 5666 (the NRPE default) in the firewall, then enable and start the NRPE service. Verify: <code>sudo systemctl status nrpe</code> should show <code>active (running)</code>.",
    parts: [
      { text: "firewall-cmd --add-port=5666/tcp", explanation: "allow NRPE traffic through the firewall" },
      { text: "systemctl enable nrpe && systemctl start nrpe", explanation: "start the NRPE daemon now and auto-start on boot" },
    ],
    example: "● nrpe.service - Nagios Remote Plugin Executor\n   Active: active (running)",
    why: "NRPE listens on port 5666. The firewall rule must be on the <em>monitored node</em>, not the Nagios host — it's the node that accepts incoming NRPE connections."
  },
  {
    id: 322, section: "nrpe-config", sectionTitle: "NRPE Configuration",
    commandTitle: "Test NRPE from the monitored node (localhost)",
    command: "sudo /usr/lib64/nagios/plugins/check_nrpe -H localhost",
    searchTerms: "check_nrpe localhost test nrpe version working",
    description: "Verify NRPE is running by connecting locally. The response should show the NRPE version number. Then test from the Nagios host after installing the NRPE plugin there.",
    parts: [
      { text: "check_nrpe -H localhost", explanation: "connect to NRPE on localhost — the daemon responds with its version" },
    ],
    example: "NRPE v3.2.1",
    why: "If this returns the version, NRPE is running and accepting connections. If it fails, check: service status, port binding (netstat -tlnp | grep 5666), firewall, and allowed_hosts."
  },

  // ── Section 4: Connect from Nagios host ───────────────────────────────────

  {
    id: 330, section: "nagios-connect", sectionTitle: "Nagios → NRPE Connection",
    commandTitle: "Install the NRPE plugin on the Nagios master",
    command: "sudo yum install -y nagios-plugins-nrpe",
    searchTerms: "nagios check_nrpe plugin install yum master",
    description: "The Nagios master needs the <code>check_nrpe</code> plugin to communicate with NRPE agents. This is separate from the NRPE daemon — the master only needs the <em>client</em> side (the plugin), not the server daemon.",
    parts: [
      { text: "nagios-plugins-nrpe", explanation: "installs check_nrpe on the master — the client-side plugin Nagios uses" },
    ],
    example: "Installed:\n  nagios-plugins-nrpe.x86_64 0:3.2.1-8.el7",
    why: "The Nagios master never runs an NRPE daemon — it only runs the client plugin. Each monitored node runs the daemon. This is a classic agent-based architecture: one controller, many agents."
  },
  {
    id: 331, section: "nagios-connect", sectionTitle: "Nagios → NRPE Connection",
    commandTitle: "Test NRPE from the Nagios master to node2",
    command: "sudo /usr/lib64/nagios/plugins/check_nrpe -H 192.168.99.102",
    searchTerms: "check_nrpe remote test node2 nagios master connection",
    description: "From the master, test the NRPE connection to node2. You should see the NRPE version string. If this works, Nagios can execute remote checks on node2. If it fails, check: is NRPE running on node2? Is port 5666 open? Is 192.168.99.100 in allowed_hosts?",
    parts: [
      { text: "check_nrpe -H 192.168.99.102", explanation: "connect to NRPE on node2 from the Nagios master" },
    ],
    example: "NRPE v3.2.1",
    why: "This is the critical handshake. If it fails, every NRPE-based service check on node2 will show UNKNOWN. Debug this connection before defining any services."
  },

  // ── Section 5: NRPE command and service definitions ───────────────────────

  {
    id: 340, section: "nrpe-commands", sectionTitle: "NRPE Commands & Services",
    commandTitle: "Define the check_nrpe command on the Nagios master",
    command: "cat /etc/nagios/objects/commands.cfg",
    searchTerms: "nagios define command check_nrpe command_line user1 hostaddress arg1",
    description: "Add a <code>check_nrpe</code> command definition to the master's commands.cfg. This tells Nagios how to invoke the check_nrpe plugin: <code>$USER1$/check_nrpe -H $HOSTADDRESS$ -c $ARG1$</code>. <code>-c</code> specifies which NRPE command to run on the remote node.",
    parts: [
      { text: "command_name check_nrpe", explanation: "the name services reference in their check_command directive" },
      { text: "-H $HOSTADDRESS$ -c $ARG1$", explanation: "connect to the host and execute the named NRPE command" },
    ],
    example: `define command {
    command_name    check_nrpe
    command_line    $USER1$/check_nrpe -H $HOSTADDRESS$ -c $ARG1$
}

# Usage in a service:
# check_command  check_nrpe!check_load
# Runs 'check_load' via NRPE on the target host`,
    why: "The <code>check_nrpe</code> command is the universal bridge — one command definition lets you run any NRPE command on any host. Just change the service's <code>check_command</code> argument."
  },
  {
    id: 341, section: "nrpe-commands", sectionTitle: "NRPE Commands & Services",
    commandTitle: "Add node2 as a host and define a CPU load service via NRPE",
    command: "cat host-node2.cfg",
    searchTerms: "nagios define host node2 nrpe cpu load service check_nrpe",
    description: "Create a host object for node2 and a service that monitors CPU load via NRPE. The service uses <code>check_command check_nrpe!check_load</code> — Nagios connects to node2, asks NRPE to run the built-in <code>check_load</code> command, and reports the result.",
    parts: [
      { text: "host_name node2.sulab.local, address 192.168.99.102", explanation: "the new monitored host — NRPE-enabled" },
      { text: "check_command check_nrpe!check_load", explanation: "run the check_load plugin via NRPE (checks 1/5/15-minute load averages)" },
    ],
    example: `define host {
    use                     linux-server
    host_name               node2.sulab.local
    alias                   NRPE-Monitored Node 2 — DB + Docker
    address                 192.168.99.102
}

define service {
    use                     remote-service
    host_name               node2.sulab.local
    service_description     CPU Load
    check_command           check_nrpe!check_load
}`,
    why: "CPU load monitoring is only possible via NRPE — there's no network-portable way to check a remote server's CPU. NRPE runs <code>check_load</code> locally on node2 and returns the result to Nagios."
  },

  // ── Section 6: Update host and service groups ─────────────────────────────

  {
    id: 350, section: "groups", sectionTitle: "Group Updates",
    commandTitle: "Add node2 to host groups and service groups",
    command: "# Edit /etc/nagios/objects/dob-files/group-dob-hosts.cfg\n# members → node1.sulab.local, node2.sulab.local\n# Then validate and restart Nagios",
    searchTerms: "nagios host group service group node2 members update",
    description: "Update your custom host group and service groups to include node2. Add node2's CPU Load service to the infrastructure services group. This keeps the dashboard organised as you add nodes.",
    parts: [
      { text: "group-dob-hosts: members node1.sulab.local, node2.sulab.local", explanation: "include node2 in the DOB practice group" },
      { text: "sgroup-infra-services: members ..., node2.sulab.local, CPU Load", explanation: "add node2's CPU check to the infrastructure services dashboard" },
    ],
    example: `define hostgroup {
    hostgroup_name  dob-hosts
    alias           DOB Demo Servers
    members         node1.sulab.local, node2.sulab.local
}

define servicegroup {
    servicegroup_name     sgroup-infra-services
    alias                 Infrastructure Services
    members               localhost, Current Load, node2.sulab.local, CPU Load
}`,
    why: "Groups are only useful if they're comprehensive. Every new host and service should be added to the appropriate groups — otherwise the 'Host Groups' and 'Service Groups' dashboards show incomplete data."
  },

];
