// modules/monitoring/homework.js
// Monitoring: Nagios — Capstone Homework
// Recast of Homework-M6-Nagios.md (automated Nagios + Icinga experiment)
// Modernised: .NET / Node.js + PostgreSQL + Docker monitoring, automated provisioning

window.commandData = [

  // ── Section 1: The assignment ─────────────────────────────────────────────

  {
    id: 500, section: "brief", sectionTitle: "The Assignment",
    commandTitle: "Goal — a fully automated Nagios monitoring environment",
    command: "cat README.md",
    searchTerms: "homework assignment nagios monitoring automated vagrant provisioning postgresql docker",
    description: "Build a complete Nagios monitoring environment with one master and two monitored nodes. Every step must be automated — zero manual intervention after <code>vagrant up</code>. The environment must monitor: HTTP (a .NET or Node.js health endpoint on node1), PostgreSQL (on node2), and a Docker container (on node2). Bonus: install and configure Icinga as a drop-in Nagios replacement and compare the two.",
    parts: [
      { text: "Nagios master", explanation: "monitoring server — runs Nagios Core, serves the web UI on port 80" },
      { text: "node1 (web)", explanation: "runs a .NET Kestrel or Node.js Express app with a /health endpoint — monitored via HTTP" },
      { text: "node2 (db + Docker)", explanation: "runs PostgreSQL and a Docker container — monitored via NRPE and agentless checks" },
      { text: "Icinga (bonus)", explanation: "Nagios-compatible fork with a modern UI — install alongside or instead of Nagios" },
    ],
    example: "Acceptance criteria:\n  ✓ vagrant up brings up all 3 VMs with zero errors\n  ✓ Shell provisioners install and configure Nagios on master, web server on node1, PostgreSQL + Docker on node2\n  ✓ Nagios UI reachable at http://localhost:8000/nagios\n  ✓ All hosts visible in the Nagios dashboard: master (localhost), node1, node2\n  ✓ HTTP check on node1 is GREEN (health endpoint returns 200 OK)\n  ✓ PostgreSQL check on node2 is GREEN (connection accepted, database exists)\n  ✓ Docker container check on node2 is GREEN (container running)\n  ✓ Host groups and service groups are configured and visible in the UI\n  ✓ NRPE checks working — CPU load reported from node2\n  ✓ (Bonus) Icinga installed and monitoring the same hosts — comparison notes submitted",
    why: "This pulls together everything from the Monitoring module: Nagios installation, host/service definitions, host groups, service groups, NRPE, PostgreSQL monitoring, Docker monitoring, and automated provisioning. It's the monitoring equivalent of the Ansible and Jenkins capstones."
  },

  // ── Section 2: Vagrant environment ────────────────────────────────────────

  {
    id: 501, section: "brief", sectionTitle: "The Assignment",
    commandTitle: "Vagrantfile — provision all 3 VMs",
    command: "vagrant up",
    searchTerms: "vagrant vagrantfile three vms master node1 node2 nagios provision",
    description: "Create a Vagrantfile defining three CentOS 7 VMs on a private network. Each VM has a shell provisioner that installs and configures its software. Master: Nagios Core + plugins. Node1: Apache (or Kestrel/Express) + health endpoint. Node2: PostgreSQL + Docker + NRPE agent.",
    parts: [
      { text: "master → 192.168.99.100, forwarded 80→8000", explanation: "Nagios monitoring host" },
      { text: "node1 → 192.168.99.101, forwarded 80→8001", explanation: "web server — monitored via HTTP" },
      { text: "node2 → 192.168.99.102", explanation: "PostgreSQL + Docker + NRPE — monitored via agent and agentless" },
      { text: "provision scripts", explanation: "shell provisioners that install Nagios, web server, PostgreSQL, Docker, and NRPE" },
    ],
    example: `Vagrant.configure("2") do |config|
  config.ssh.insert_key = false

  config.vm.define "master" do |m|
    m.vm.box = "shekeriev/centos-7-64-minimal"
    m.vm.network "private_network", ip: "192.168.99.100"
    m.vm.network "forwarded_port", guest: 80, host: 8000
    m.vm.provision "shell", path: "provision-master.sh"
  end
  config.vm.define "node1" do |n|
    n.vm.box = "shekeriev/centos-7-64-minimal"
    n.vm.network "private_network", ip: "192.168.99.101"
    n.vm.network "forwarded_port", guest: 80, host: 8001
    n.vm.provision "shell", path: "provision-node1.sh"
  end
  config.vm.define "node2" do |n|
    n.vm.box = "shekeriev/centos-7-64-minimal"
    n.vm.network "private_network", ip: "192.168.99.102"
    n.vm.provision "shell", path: "provision-node2.sh"
  end
end`,
    why: "Vagrant + shell provisioners = infrastructure as code. A teammate clones your repo, runs <code>vagrant up</code>, and has an identical monitoring environment — Nagios configured, hosts defined, checks running."
  },

  // ── Section 3: Provisioning scripts ───────────────────────────────────────

  {
    id: 510, section: "provision", sectionTitle: "Provisioning Scripts",
    commandTitle: "provision-master.sh — install and configure Nagios",
    command: "cat provision-master.sh",
    searchTerms: "provision master nagios install configure shell script automated",
    description: "Write a shell provisioner for the master VM that: (1) disables SELinux, (2) installs Nagios Core + all plugins + NRPE plugin, (3) starts Apache and Nagios, (4) opens firewall ports, (5) creates the nagiosadmin user, (6) creates host definitions for node1 and node2, (7) creates service definitions for HTTP, PostgreSQL, CPU load, and Docker container, (8) creates host groups and service groups, (9) registers the custom config directory, (10) validates and restarts Nagios.",
    parts: [
      { text: "Nagios + plugins", explanation: "yum install nagios nagios-plugins-all nagios-plugins-nrpe" },
      { text: "Host/service configs", explanation: "create .cfg files in /etc/nagios/objects/dob-files/" },
      { text: "Validation", explanation: "nagios -v /etc/nagios/nagios.cfg — must return 0 errors before restarting" },
    ],
    example: "==> master: Running provisioner: shell...\n  SELinux: Permissive\n  Nagios installed: 4.4.6\n  nagiosadmin user created\n  Hosts defined: localhost, node1.sulab.local, node2.sulab.local\n  Services defined: HTTP (node1), PostgreSQL (node2), CPU Load (node2), Docker Container (node2)\n  Config validation: 0 errors, 0 warnings\n  Nagios restarted: OK\n  → Nagios UI ready at http://localhost:8000/nagios",
    why: "The provisioner must be idempotent — run it multiple times and get the same result. Use <code>set -e</code> and check for existing files before overwriting."
  },
  {
    id: 511, section: "provision", sectionTitle: "Provisioning Scripts",
    commandTitle: "provision-node1.sh — install web server and health endpoint",
    command: "cat provision-node1.sh",
    searchTerms: "provision node1 web server httpd apache health endpoint",
    description: "Write a shell provisioner for node1 that installs and starts Apache web server with a health check page. For extra credit, install .NET 8 runtime or Node.js 20 and deploy a real health endpoint instead of a static page.",
    parts: [
      { text: "Apache + firewall", explanation: "yum install httpd, open ports 80/443, start httpd" },
      { text: "Health endpoint (bonus)", explanation: "deploy a .NET Minimal API or Express app with /health → {'status':'ok'}" },
    ],
    example: "==> node1: Running provisioner: shell...\n  Apache installed and running\n  HTTP accessible at http://localhost:8001\n  Health check: curl http://localhost:8001 → 200 OK",
    why: "The health endpoint is what Nagios monitors. A static page works, but a real health check that verifies database connectivity is far more valuable — it tells Nagios not just 'the web server is up' but 'the application is fully functional'."
  },
  {
    id: 512, section: "provision", sectionTitle: "Provisioning Scripts",
    commandTitle: "provision-node2.sh — install PostgreSQL, Docker, NRPE",
    command: "cat provision-node2.sh",
    searchTerms: "provision node2 postgresql docker nrpe install configure",
    description: "Write a shell provisioner for node2 that: (1) installs PostgreSQL, creates the nagios monitoring user, and the appdb database, (2) installs Docker CE, configures overlay2 driver, starts the daemon, (3) installs NRPE agent, configures allowed_hosts, opens port 5666, adds custom check commands (check-docker-container), (4) starts a test Docker container, (5) adds the nrpe user to the docker group.",
    parts: [
      { text: "PostgreSQL", explanation: "yum install postgresql-server, initdb, create user/db, open port 5432" },
      { text: "Docker CE", explanation: "yum install docker-ce, overlay2 driver, docker group for nrpe user" },
      { text: "NRPE", explanation: "yum install nrpe nagios-plugins-all, allowed_hosts=192.168.99.0/24, port 5666" },
      { text: "Custom check script", explanation: "install check_docker_container.sh in /usr/lib64/nagios/plugins/" },
    ],
    example: "==> node2: Running provisioner: shell...\n  PostgreSQL 9.2 running, nagios user created, appdb created\n  Docker CE 24.0 running, nrpe user in docker group\n  NRPE v3.2.1 running, allowed_hosts: 192.168.99.0/24\n  Test container 'app-container' running\n  check_docker_container.sh installed\n  → Ready for Nagios monitoring",
    why: "Node2 is the most complex provisioner — three services, custom scripts, group memberships. This is where infrastructure as code really shines: one script, one command, identical node every time."
  },

  // ── Section 4: Icinga exploration (bonus) ─────────────────────────────────

  {
    id: 520, section: "icinga", sectionTitle: "Icinga Exploration (Bonus)",
    commandTitle: "Install Icinga alongside or instead of Nagios",
    command: "sudo yum install -y icinga2 icinga2-selinux nagios-plugins-all icingaweb2",
    searchTerms: "icinga install nagios fork modern ui web interface comparison",
    description: "Icinga is a Nagios fork with a modern web interface, REST API, and built-in graphing. It's <strong>fully compatible</strong> with Nagios plugins and configuration — your existing check scripts and NRPE setup work unchanged. Install Icinga2 and Icinga Web 2, then compare: UI responsiveness, config validation messages, dashboard customisation.",
    parts: [
      { text: "icinga2", explanation: "the monitoring engine — drop-in Nagios Core replacement" },
      { text: "icingaweb2", explanation: "the modern web UI — PHP-based, responsive, customisable dashboards" },
      { text: "Nagios plugin compatibility", explanation: "check_pgsql, check_http, check_nrpe — all work unchanged with Icinga2" },
    ],
    example: "Icinga2 running on port 5665 (API)\nIcinga Web 2 at http://localhost:8000/icingaweb2\nSame hosts visible: localhost, node1.sulab.local, node2.sulab.local\nSame services: HTTP, PostgreSQL, CPU Load, Docker Container",
    why: "Icinga demonstrates that Nagios concepts are portable. The monitoring mental model (hosts, services, commands, templates, state) is what matters — the tool is secondary. Understanding Nagios means you understand Icinga, and you're 80% of the way to understanding Sensu and Prometheus."
  },

  // ── Section 5: Verification checklist ─────────────────────────────────────

  {
    id: 590, section: "verify", sectionTitle: "Verification Checklist",
    commandTitle: "Verify the complete monitoring environment end-to-end",
    command: "# 1. vagrant up — all 3 VMs come up cleanly\n# 2. Nagios UI at http://localhost:8000/nagios — log in as nagiosadmin\n# 3. All hosts visible: master (localhost), node1, node2\n# 4. HTTP check on node1 — GREEN (200 OK)\n# 5. PostgreSQL check on node2 — GREEN (connection accepted)\n# 6. Docker container check on node2 — GREEN (container running)\n# 7. CPU Load check on node2 via NRPE — GREEN\n# 8. Host groups configured: linux-servers, dob-hosts\n# 9. Service groups: HTTP Services, Infrastructure Services\n# 10. (Bonus) Icinga installed and monitoring same hosts",
    searchTerms: "verify nagios monitoring check end-to-end acceptance criteria",
    description: "Run through the full acceptance checklist. Each item must pass. Take screenshots of the Nagios dashboard showing all hosts and services in GREEN state. Submit the Vagrantfile, provisioner scripts, Nagios configs, and screenshots.",
    parts: [
      { text: "vagrant up", explanation: "infrastructure comes up with no errors — all provisioners complete" },
      { text: "Nagios dashboard", explanation: "all hosts and services GREEN — no UNKNOWN, no CRITICAL, no WARNING" },
      { text: "Icinga (bonus)", explanation: "same hosts monitored in Icinga — comparison notes submitted" },
    ],
    example: "✓ 1. vagrant up — 3 VMs provisioned, 0 errors\n✓ 2. Nagios UI — http://localhost:8000/nagios, logged in as nagiosadmin\n✓ 3. Hosts: localhost ✓ node1.sulab.local ✓ node2.sulab.local ✓\n✓ 4. HTTP (node1) — GREEN, 200 OK, 0.003s response\n✓ 5. PostgreSQL (node2) — GREEN, connection accepted, appdb exists\n✓ 6. Docker Container (node2) — GREEN, app-container running\n✓ 7. CPU Load (node2, NRPE) — GREEN, load averages within threshold\n✓ 8. Host groups: linux-servers (3 members), dob-hosts (2 members)\n✓ 9. Service groups: HTTP Services (2 members), Infrastructure Services (2 members)\n✓ 10. Icinga — installed, dashboard shows same 3 hosts, 5 services, all GREEN",
    why: "The verification checklist is your proof that the monitoring environment works end-to-end. Each item is observable and reproducible — a colleague can run the same checklist and get the same results."
  },

];
