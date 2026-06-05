// modules/monitoring/nagios-config.js
// Monitoring: Nagios Configuration — Hosts, Services, Groups, Commands, Templates
// Extracted from DOB-M6 Practice (Practice-M6-Nagios.md, Part 2)
// Reframed: .NET / Node.js monitoring targets, PostgreSQL

window.commandData = [

  // ── Section 1: Extend to 2-node Vagrant environment ───────────────────────

  {
    id: 201, section: "environment", sectionTitle: "2-Node Environment",
    commandTitle: "Extend the Vagrantfile to 2 nodes (master + node1)",
    command: "cat Vagrantfile",
    searchTerms: "vagrant vagrantfile two nodes master node1 centos monitoring web server",
    description: "Exit the master SSH session and extend the Vagrantfile to add a <code>node1</code> VM. This node will run a web server (Apache for demo, or Kestrel/Express for real apps) — Nagios monitors it via HTTP. Port 8001 on the host forwards to port 80 on node1.",
    parts: [
      { text: "node1.vm.hostname = 'node1.sulab.local'", explanation: "the first monitored node — referenced in Nagios config by this hostname" },
      { text: "forwarded_port guest: 80, host: 8001", explanation: "access node1's web server at http://localhost:8001 from the host" },
    ],
    example: `# Master node (keep the existing definition above)
# ... master: 192.168.99.100 ...

  # ── Node 1 — web server, monitored via HTTP ────────────────────────────────
  config.vm.define "node1" do |node|
    node.vm.box      = "shekeriev/centos-7-64-minimal"
    node.vm.hostname = "node1.sulab.local"
    node.vm.network "private_network", ip: "192.168.99.101"
    node.vm.network "forwarded_port", guest: 80, host: 8001
    node.vm.provision "shell", path: "add_hosts.sh"
  end`,
    why: "Adding nodes incrementally mirrors real monitoring: you start with the monitoring server, then add hosts as your infrastructure grows."
  },
  {
    id: 202, section: "environment", sectionTitle: "2-Node Environment",
    commandTitle: "Bring up node1 and install a web server",
    command: "vagrant up && vagrant ssh node1 -c 'sudo yum install -y httpd && sudo systemctl enable httpd && sudo systemctl start httpd && sudo firewall-cmd --add-service={http,https} --permanent && sudo firewall-cmd --reload && echo \"<h1>Remote host: Demo site</h1>\" | sudo tee /var/www/html/index.html'",
    searchTerms: "vagrant up node1 install httpd apache web server firewall",
    description: "Bring up node1, install Apache, start it, open the firewall, and add a test page. Verify at <code>http://localhost:8001</code> — you should see 'Remote host: Demo site'. For a real .NET app, you'd install the .NET runtime and run Kestrel; for Node.js, install Node and run Express.",
    parts: [
      { text: "yum install -y httpd", explanation: "install Apache — in production, replace with dotnet-sdk or nodejs" },
      { text: "firewall-cmd --add-service={http,https}", explanation: "allow HTTP traffic to the web server" },
      { text: "echo '<h1>...</h1>' | sudo tee /var/www/html/index.html", explanation: "create a test page the Nagios HTTP check can verify" },
    ],
    example: "==> node1: Machine booted and ready!\n$ curl http://localhost:8001\n<h1>Remote host: Demo site</h1>",
    why: "The web server is the simplest service to monitor — HTTP. Once this works, you can replace Apache with your actual application and the Nagios check still works because it only cares about HTTP response codes and content."
  },

  // ── Section 2: Add a host to Nagios ───────────────────────────────────────

  {
    id: 210, section: "add-host", sectionTitle: "Adding a Monitored Host",
    commandTitle: "Create a custom config directory",
    command: "sudo mkdir -p /etc/nagios/objects/dob-files",
    searchTerms: "nagios custom config directory objects mkdir",
    description: "Create a dedicated directory for your custom Nagios object files. This keeps your configs separate from the default ones — easier to version-control and less likely to be overwritten by package updates.",
    parts: [
      { text: "/etc/nagios/objects/dob-files", explanation: "your custom config directory — referenced in nagios.cfg" },
    ],
    example: "(no output — verify with: ls /etc/nagios/objects/dob-files)",
    why: "Separation of concerns: default Nagios configs live in <code>/etc/nagios/objects/</code>; your custom host/service definitions live in <code>dob-files/</code>. This makes backups and Ansible automation cleaner."
  },
  {
    id: 211, section: "add-host", sectionTitle: "Adding a Monitored Host",
    commandTitle: "Define the node1 host object",
    command: "cat host-node1.cfg",
    searchTerms: "nagios define host object configuration node1 cfg",
    description: "Create a Nagios host object definition for node1. The <code>use linux-server</code> directive inherits from a template (check interval, notification period, icon). <code>address</code> is the IP or FQDN Nagios uses to reach the host.",
    parts: [
      { text: "define host { }", explanation: "Nagios object definition block — the fundamental config unit" },
      { text: "use linux-server", explanation: "inherit settings from the linux-server template (defined in templates.cfg)" },
      { text: "host_name node1.sulab.local", explanation: "unique identifier — referenced by services and host groups" },
      { text: "address 192.168.99.101", explanation: "IP address Nagios uses to ping/check this host" },
    ],
    example: `define host {
    use                     linux-server
    host_name               node1.sulab.local
    alias                   Monitored Node 1 — Web Server
    address                 192.168.99.101
    icon_image              linux40.png
    statusmap_image         linux40.png
}`,
    why: "The host object is the anchor — every service you monitor on this host references <code>host_name node1.sulab.local</code>. Without a host object, Nagios doesn't know the node exists."
  },
  {
    id: 212, section: "add-host", sectionTitle: "Adding a Monitored Host",
    commandTitle: "Define an HTTP service for node1",
    command: "cat service-http-node1.cfg",
    searchTerms: "nagios define service http node1 check_http monitoring",
    description: "Create a service object that monitors HTTP on node1. <code>check_command check_http!$HOSTADDRESS$</code> runs the check_http plugin against the host's address. <code>use remote-service</code> inherits from a custom template (defined below).",
    parts: [
      { text: "define service { }", explanation: "Nagios service object — monitors one aspect of a host" },
      { text: "host_name node1.sulab.local", explanation: "which host this service belongs to" },
      { text: "check_command check_http!$HOSTADDRESS$", explanation: "run check_http plugin; $HOSTADDRESS$ resolves to 192.168.99.101" },
      { text: "notifications_enabled 0", explanation: "disable notifications during testing — enable once confirmed working" },
    ],
    example: `define service {
    use                     remote-service
    host_name               node1.sulab.local
    service_description     HTTP
    check_command           check_http!$HOSTADDRESS$
    notifications_enabled   0
}`,
    why: "The <code>!</code> separates the command name from its arguments. <code>$HOSTADDRESS$</code> is a Nagios macro — it expands to the IP address of the host this service is attached to. This keeps service definitions portable."
  },
  {
    id: 213, section: "add-host", sectionTitle: "Adding a Monitored Host",
    commandTitle: "Create a remote service template",
    command: "cat remote-service-template.cfg",
    searchTerms: "nagios service template define register 0 max_check_attempts interval",
    description: "Create a reusable service template. <code>register 0</code> means 'this is a template, not an actual service' — other services inherit from it via <code>use remote-service</code>. Templates are the DRY principle applied to Nagios config.",
    parts: [
      { text: "name remote-service", explanation: "template name — referenced by 'use remote-service' in other service definitions" },
      { text: "register 0", explanation: "mark as template only — Nagios won't try to monitor this definition" },
      { text: "max_check_attempts 5", explanation: "retry up to 5 times before declaring a HARD state (and sending alerts)" },
      { text: "normal_check_interval 2", explanation: "check every 2 minutes (120 seconds)" },
      { text: "retry_check_interval 1", explanation: "during SOFT failures, retry every 1 minute" },
    ],
    example: `define service {
    name                            remote-service
    use                             generic-service
    max_check_attempts              5
    normal_check_interval           2
    retry_check_interval            1
    register                        0
}`,
    why: "Templates save repetition. If you monitor 50 hosts with HTTP, you define the check interval once in a template, and every service inherits it. Change the interval in one place — all 50 services update."
  },

  // ── Section 3: Enable the new config in Nagios ────────────────────────────

  {
    id: 220, section: "enable-config", sectionTitle: "Enabling the Configuration",
    commandTitle: "Register the custom config directory in nagios.cfg",
    command: "echo 'cfg_dir=/etc/nagios/objects/dob-files' | sudo tee -a /etc/nagios/nagios.cfg",
    searchTerms: "nagios cfg_dir nagios.cfg register custom config directory",
    description: "Tell Nagios to load config files from your custom directory. Without this line, Nagios ignores everything in <code>dob-files/</code>. After adding, verify the config: <code>sudo nagios -v /etc/nagios/nagios.cfg</code>.",
    parts: [
      { text: "cfg_dir=/etc/nagios/objects/dob-files", explanation: "Nagios will load every .cfg file in this directory" },
      { text: "nagios -v /etc/nagios/nagios.cfg", explanation: "validate the configuration — returns '0 errors, 0 warnings' on success" },
    ],
    example: "Running pre-flight check on configuration data...\nChecking objects...\n  Checked 15 services.\n  Checked 2 hosts.\n  Checked 2 host groups.\nTotal Warnings: 0\nTotal Errors:   0\n\nThings look okay — No problems detected during the pre-flight check!",
    why: "<code>nagios -v</code> is your safety net. Always run it before restarting Nagios — a syntax error in a config file will prevent Nagios from starting at all. The pre-flight check catches errors before they cause downtime."
  },
  {
    id: 221, section: "enable-config", sectionTitle: "Enabling the Configuration",
    commandTitle: "Restart Nagios to load the new configuration",
    command: "sudo systemctl restart nagios",
    searchTerms: "systemctl restart nagios reload configuration apply changes",
    description: "Restart Nagios to pick up the new host and service definitions. After restart, check the Nagios UI — you should see <code>node1.sulab.local</code> in the Hosts list and the HTTP service in the Services list.",
    parts: [
      { text: "systemctl restart nagios", explanation: "stop the Nagios scheduler and start it again with the new config" },
    ],
    example: "Nagios UI → Hosts → node1.sulab.local: UP\nNagios UI → Services → node1.sulab.local / HTTP: OK",
    why: "Nagios must be restarted (not reloaded) for new host/service objects to appear. <code>systemctl reload nagios</code> exists but only re-reads certain config sections — restart is safer for structural changes."
  },

  // ── Section 4: Host groups ────────────────────────────────────────────────

  {
    id: 230, section: "hostgroups", sectionTitle: "Host Groups",
    commandTitle: "Add node1 to the linux-servers host group",
    command: "cat group-linux-servers.cfg",
    searchTerms: "nagios host group linux-servers members localhost node1",
    description: "Host groups let you view and manage related hosts together. Edit the default <code>linux-servers</code> group to include node1 alongside localhost. In the Nagios UI, the 'Host Groups' overview shows aggregate status across the group.",
    parts: [
      { text: "define hostgroup { }", explanation: "group multiple hosts under one label" },
      { text: "members localhost,node1.sulab.local", explanation: "comma-separated list of host names in this group" },
    ],
    example: `define hostgroup {
    hostgroup_name  linux-servers
    alias           Linux Servers
    members         localhost, node1.sulab.local
}`,
    why: "Host groups are the Nagios equivalent of Ansible inventory groups. You can view 'all web servers' or 'all database servers' in one dashboard, and notifications can be routed differently per group."
  },
  {
    id: 231, section: "hostgroups", sectionTitle: "Host Groups",
    commandTitle: "Create a custom host group for DOB nodes",
    command: "cat group-dob-hosts.cfg",
    searchTerms: "nagios custom host group dob-hosts members node1",
    description: "Create a custom host group for your lab nodes. This is separate from the system groups — it lets you filter the Nagios dashboard to show only your practice hosts.",
    parts: [
      { text: "hostgroup_name dob-hosts", explanation: "a custom group name — use a naming convention that makes sense for your environment" },
    ],
    example: `define hostgroup {
    hostgroup_name  dob-hosts
    alias           DOB Demo Servers
    members         node1.sulab.local
}`,
    why: "Custom host groups map to your mental model of the infrastructure. 'dob-hosts' is your lab; in production you'd have 'web-tier', 'db-tier', 'cache-tier' — each with different monitoring policies."
  },

  // ── Section 5: Service groups ─────────────────────────────────────────────

  {
    id: 240, section: "servicegroups", sectionTitle: "Service Groups",
    commandTitle: "Create an HTTP services group",
    command: "cat sgroup-http-services.cfg",
    searchTerms: "nagios service group http members localhost node1",
    description: "Group all HTTP services across hosts into one view. <code>members</code> is a comma-separated list of <code>host_name, service_description</code> pairs. This lets you see the health of all HTTP endpoints in one dashboard panel.",
    parts: [
      { text: "define servicegroup { }", explanation: "group related services across different hosts" },
      { text: "members localhost, HTTP, node1.sulab.local, HTTP", explanation: "host,service pairs — the HTTP service on localhost AND the HTTP service on node1" },
    ],
    example: `define servicegroup {
    servicegroup_name               sgroup-http-services
    alias                           HTTP Services
    members                         localhost, HTTP, node1.sulab.local, HTTP
}`,
    why: "Service groups answer the question: 'are all my HTTP endpoints healthy?' — across all hosts. If you have 20 web servers, one service group shows the aggregate status instead of clicking through 20 individual hosts."
  },
  {
    id: 241, section: "servicegroups", sectionTitle: "Service Groups",
    commandTitle: "Create an infrastructure services group",
    command: "cat sgroup-infra-services.cfg",
    searchTerms: "nagios infrastructure service group cpu load current",
    description: "Group infrastructure-level services (CPU load, disk, swap) into one view. This is your 'is the underlying hardware healthy?' dashboard — separate from application-level HTTP checks.",
    parts: [
      { text: "sgroup-infra-services", explanation: "a group for hardware/infrastructure health checks" },
      { text: "members localhost, Current Load", explanation: "start with localhost CPU; add more hosts and services as you expand" },
    ],
    example: `define servicegroup {
    servicegroup_name               sgroup-infra-services
    alias                           Infrastructure Services
    members                         localhost, Current Load
}`,
    why: "Separating application checks (HTTP, DB) from infrastructure checks (CPU, disk) gives you faster root-cause analysis. If 'Infrastructure Services' is green but 'HTTP Services' is red, the problem is in the application, not the server."
  },

  // ── Section 6: Commands and macro-driven checks ───────────────────────────

  {
    id: 250, section: "commands", sectionTitle: "Commands & Macros",
    commandTitle: "Understanding Nagios command definitions",
    command: "cat /etc/nagios/objects/commands.cfg | head -30",
    searchTerms: "nagios command definition check_http check_ping command_line macro user1",
    description: "Commands are the bridge between Nagios objects and the actual plugins. <code>$USER1$</code> is a resource macro that expands to <code>/usr/lib64/nagios/plugins</code> (defined in <code>/etc/nagios/private/resource.cfg</code>). <code>$HOSTADDRESS$</code> and <code>$ARG1$</code> are runtime macros filled in when the check executes.",
    parts: [
      { text: "$USER1$", explanation: "resource macro — resolves to /usr/lib64/nagios/plugins/ (the plugin directory path)" },
      { text: "$HOSTADDRESS$", explanation: "standard macro — resolves to the IP address of the host being checked" },
      { text: "$ARG1$", explanation: "argument macro — the first value after the ! in a check_command reference" },
    ],
    example: `# 'check_http' command definition
define command {
    command_name    check_http
    command_line    $USER1$/check_http -H $HOSTADDRESS$ $ARG1$
}

# Usage in a service:
# check_command  check_http!-p 5000 -u /health
#                      ^^^^^^^^ $ARG1$ expands to '-p 5000 -u /health'`,
    why: "Commands are the most powerful Nagios concept — one command definition can serve hundreds of services with different arguments. The same <code>check_http</code> command monitors a .NET app on port 5000 and a Node.js app on port 3000, just with different $ARG1$ values."
  },

  // ── Section 7: PostgreSQL monitoring ──────────────────────────────────────

  {
    id: 260, section: "postgresql", sectionTitle: "PostgreSQL Monitoring",
    commandTitle: "Test PostgreSQL connectivity from the Nagios host",
    command: "/usr/lib64/nagios/plugins/check_pgsql -H 192.168.99.102 -d appdb -u app_user -p Password1",
    searchTerms: "check_pgsql nagios postgresql database monitoring connectivity",
    description: "The <code>check_pgsql</code> plugin tests whether PostgreSQL is accepting connections and the specified database exists. This is the Nagios equivalent of <code>pg_isready</code> — it verifies the DB is up and responsive.",
    parts: [
      { text: "check_pgsql -H 192.168.99.102", explanation: "connect to PostgreSQL on node2 (IP 192.168.99.102)" },
      { text: "-d appdb", explanation: "verify the 'appdb' database exists and is accessible" },
      { text: "-u app_user -p Password1", explanation: "authenticate as app_user — use a dedicated monitoring user in production" },
    ],
    example: "PGSQL OK - database appdb (0.003421 sec.)|time=0.003421s",
    why: "A PostgreSQL check is critical for any .NET or Node.js app that depends on a database. If the DB is down, your health endpoint returns 503 — but Nagios tells you <em>why</em> (DB unreachable) instead of just 'HTTP CRITICAL'."
  },
  {
    id: 261, section: "postgresql", sectionTitle: "PostgreSQL Monitoring",
    commandTitle: "Define PostgreSQL command and service objects",
    command: "cat service-pgsql-node2.cfg",
    searchTerms: "nagios define command service postgresql check_pgsql cmdlinecred",
    description: "Define PostgreSQL monitoring commands and a service object. Use <code>check_pgsql_cmdlinecred</code> for commands that pass credentials on the command line (acceptable in lab; use resource.cfg macros in production). The service checks PostgreSQL on node2 every 2 minutes.",
    parts: [
      { text: "command_line $USER1$/check_pgsql -H '$HOSTADDRESS$' -u '$ARG1$' -p '$ARG2$'", explanation: "parameterised command — credentials passed as arguments" },
      { text: "check_command check_pgsql_cmdlinecred!app_user!Password1", explanation: "service invokes the command with user=app_user, password=Password1" },
    ],
    example: `# Command definition
define command {
    command_name    check_pgsql_cmdlinecred
    command_line    $USER1$/check_pgsql -H '$HOSTADDRESS$' -u '$ARG1$' -p '$ARG2$'
}

# Service definition
define service {
    use                     remote-service
    host_name               node2.sulab.local
    service_description     PostgreSQL
    check_command           check_pgsql_cmdlinecred!app_user!Password1
    notification_interval   2
}`,
    why: "Database monitoring is table stakes for any application. A green PostgreSQL check means: the server process is running, the port is open, authentication works, and the database exists. Four failure modes caught by one check."
  },

];
