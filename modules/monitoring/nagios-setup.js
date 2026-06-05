// modules/monitoring/nagios-setup.js
// Monitoring: Nagios Setup — Installation, Vagrant Environment, Plugins, First Checks
// Extracted from DOB-M6 Practice (Practice-M6-Nagios.md, Part 1)
// Reframed: .NET / Node.js health endpoints, PostgreSQL

window.commandData = [

  // ── Section 1: Vagrant environment ────────────────────────────────────────

  {
    id: 101, section: "environment", sectionTitle: "Vagrant Environment",
    commandTitle: "Create the add_hosts.sh helper",
    command: "cat add_hosts.sh",
    searchTerms: "add hosts hosts file vagrant provision shell nagios cluster",
    description: "Create an <code>add_hosts.sh</code> script that populates <code>/etc/hosts</code> with monitoring cluster members. The Vagrantfile runs this as a shell provisioner so every VM can resolve the others by hostname.",
    parts: [
      { text: "192.168.99.100 master.sulab.local master", explanation: "the Nagios monitoring host" },
      { text: "192.168.99.101 node1.sulab.local node1", explanation: "first monitored node (web server, monitored via HTTP + SSH)" },
      { text: "192.168.99.102 node2.sulab.local node2", explanation: "second monitored node (PostgreSQL + Docker, monitored via NRPE)" },
    ],
    example: `#!/bin/bash
# add_hosts.sh — populate /etc/hosts for DOB Nagios monitoring cluster
set -e

echo "192.168.99.100 master.sulab.local master" >> /etc/hosts
echo "192.168.99.101 node1.sulab.local node1" >> /etc/hosts
echo "192.168.99.102 node2.sulab.local node2" >> /etc/hosts

echo "[add_hosts] /etc/hosts updated with cluster members."`,
    why: "Nagios configuration uses hostnames (node1.sulab.local), not raw IPs. The hosts file ensures every VM can resolve every other VM by name — essential for the Nagios config files that reference hosts by FQDN."
  },
  {
    id: 102, section: "environment", sectionTitle: "Vagrant Environment",
    commandTitle: "Create the Vagrantfile (single-node: Nagios master)",
    command: "cat Vagrantfile",
    searchTerms: "vagrant vagrantfile centos nagios master monitoring port forward",
    description: "Create a <code>Vagrantfile</code> defining a single CentOS 7 VM — the Nagios monitoring host. Port 80 is forwarded to host port 8000 so you can access the Nagios web UI at <code>http://localhost:8000/nagios</code>.",
    parts: [
      { text: "config.ssh.insert_key = false", explanation: "keep Vagrant's well-known insecure key — no manual SSH setup" },
      { text: "node.vm.box = 'shekeriev/centos-7-64-minimal'", explanation: "CentOS 7 minimal image — consistent with all DOB modules" },
      { text: "forwarded_port guest: 80, host: 8000", explanation: "Nagios web UI reachable at http://localhost:8000/nagios" },
      { text: "provision 'shell', path: 'add_hosts.sh'", explanation: "run the hosts file script on first boot" },
    ],
    example: `# -*- mode: ruby -*-
# vi: set ft=ruby :
#
# Vagrantfile — Nagios Monitoring Host (single node)
# DOB Module: Monitoring

Vagrant.configure("2") do |config|

  config.ssh.insert_key = false

  config.vm.define "master" do |node|
    node.vm.box      = "shekeriev/centos-7-64-minimal"
    node.vm.hostname = "master.sulab.local"
    node.vm.network "private_network", ip: "192.168.99.100"
    node.vm.network "forwarded_port", guest: 80, host: 8000
    node.vm.provision "shell", path: "add_hosts.sh"
  end

end`,
    why: "A single Vagrant VM is the fastest way to get a working Nagios instance. You'll add more nodes as the exercises progress — start small, scale up."
  },
  {
    id: 103, section: "environment", sectionTitle: "Vagrant Environment",
    commandTitle: "Bring up the VM",
    command: "vagrant up",
    searchTerms: "vagrant up boot provision vm start nagios master",
    description: "Boot the master VM. The first run downloads the box image and runs the <code>add_hosts.sh</code> provisioner — takes 2-5 minutes. Subsequent boots take seconds.",
    parts: [
      { text: "vagrant up", explanation: "creates and boots the VM defined in the Vagrantfile" },
    ],
    example: "Bringing machine 'master' up with 'virtualbox' provider...\n==> master: Importing base box 'shekeriev/centos-7-64-minimal'...\n==> master: Running provisioner: shell...\n==> master: Machine booted and ready!",
    why: "Vagrant gives you a disposable monitoring environment. If the config gets corrupted, <code>vagrant destroy -f && vagrant up</code> gives you a clean slate."
  },
  {
    id: 104, section: "environment", sectionTitle: "Vagrant Environment",
    commandTitle: "SSH into the master",
    command: "vagrant ssh master",
    searchTerms: "vagrant ssh master connect login nagios",
    description: "Open an SSH session to the Nagios master VM. All subsequent installation and configuration commands are run inside this session.",
    parts: [
      { text: "vagrant ssh master", explanation: "SSH into the master VM — passwordless, key-based" },
    ],
    example: "[vagrant@master ~]$",
    why: "Vagrant handles SSH key exchange automatically. You land as the <code>vagrant</code> user with passwordless sudo."
  },

  // ── Section 2: Nagios installation ───────────────────────────────────────

  {
    id: 110, section: "install", sectionTitle: "Nagios Installation",
    commandTitle: "Disable SELinux (required for Nagios on CentOS 7)",
    command: "sudo sed -i 's/SELINUX=enforcing/SELINUX=permissive/' /etc/sysconfig/selinux && sudo reboot",
    searchTerms: "selinux disable permissive nagios centos reboot",
    description: "Nagios on CentOS 7 requires SELinux to be in <strong>permissive</strong> or <strong>disabled</strong> mode — enforcing mode blocks the web UI and plugin execution. Set to permissive, then reboot. After reboot, verify: <code>getenforce</code> should show <code>Permissive</code>.",
    parts: [
      { text: "sed -i 's/SELINUX=enforcing/SELINUX=permissive/'", explanation: "replace enforcing with permissive in the SELinux config file" },
      { text: "reboot", explanation: "restart the VM to apply the SELinux change" },
    ],
    example: "$ getenforce\nPermissive",
    why: "Permissive mode logs SELinux violations but doesn't block them — Nagios runs, and you still get audit logs for security review."
  },
  {
    id: 111, section: "install", sectionTitle: "Nagios Installation",
    commandTitle: "Install Nagios Core and plugins",
    command: "sudo yum install -y nagios nagios-plugins-all",
    searchTerms: "yum install nagios core plugins centos epel",
    description: "Install Nagios Core and the full set of monitoring plugins from the EPEL repository. The <code>nagios-plugins-all</code> package includes check_http, check_ping, check_disk, check_load, check_ssh, check_mysql, and dozens more — everything you need to monitor a .NET/Node.js stack.",
    parts: [
      { text: "nagios", explanation: "Nagios Core — the monitoring engine, web UI, and scheduler" },
      { text: "nagios-plugins-all", explanation: "the complete plugin bundle (~50 plugins for standard services)" },
    ],
    example: "Installed:\n  nagios.x86_64 0:4.4.6-1.el7\n  nagios-plugins-all.x86_64 0:2.3.3-1.el7",
    why: "EPEL carries a well-maintained Nagios package. The 'all' plugin bundle saves you from installing plugins one by one — you get HTTP, ping, disk, load, SSH, and database checks in one command."
  },
  {
    id: 112, section: "install", sectionTitle: "Nagios Installation",
    commandTitle: "Start and enable Apache + Nagios",
    command: "sudo systemctl enable httpd && sudo systemctl start httpd && sudo systemctl enable nagios && sudo systemctl start nagios",
    searchTerms: "systemctl enable start httpd apache nagios service",
    description: "Nagios serves its web UI through Apache (httpd). Start and enable both services. Check their status: <code>systemctl status httpd nagios</code> — both should show <code>active (running)</code>.",
    parts: [
      { text: "systemctl enable httpd && systemctl start httpd", explanation: "Apache — serves the Nagios web UI on port 80" },
      { text: "systemctl enable nagios && systemctl start nagios", explanation: "Nagios Core — the monitoring scheduler and engine" },
    ],
    example: "● httpd.service - The Apache HTTP Server\n   Active: active (running)\n● nagios.service - Nagios Core\n   Active: active (running)",
    why: "<code>enable</code> ensures both services survive a reboot. Nagios must be running 24/7 — a monitoring system that crashes is worse than no monitoring at all."
  },

  // ── Section 3: Firewall ───────────────────────────────────────────────────

  {
    id: 120, section: "firewall", sectionTitle: "Firewall Configuration",
    commandTitle: "Open HTTP/HTTPS ports in the firewall",
    command: "sudo firewall-cmd --add-service={http,https} --permanent && sudo firewall-cmd --reload",
    searchTerms: "firewall firewalld open port http https nagios web ui",
    description: "Allow HTTP (port 80) and HTTPS (port 443) traffic through the firewall. The Nagios web UI runs on port 80; HTTPS is needed for secure access in production. Reload to apply immediately.",
    parts: [
      { text: "firewall-cmd --add-service={http,https} --permanent", explanation: "add HTTP and HTTPS service rules that persist across reboots" },
      { text: "firewall-cmd --reload", explanation: "activate the new rules without dropping connections" },
    ],
    example: "success\nsuccess",
    why: "Without these rules, the host browser can't reach the Nagios UI — the Vagrant port forward exists, but the VM firewall still blocks the traffic."
  },

  // ── Section 4: Web UI access ──────────────────────────────────────────────

  {
    id: 130, section: "web-ui", sectionTitle: "Web UI Setup",
    commandTitle: "Create the Nagios admin user (htpasswd)",
    command: "sudo htpasswd -b /etc/nagios/passwd nagiosadmin Password1",
    searchTerms: "nagios htpasswd admin user password web ui login",
    description: "Nagios uses Apache's <code>htpasswd</code> for authentication. Create the <code>nagiosadmin</code> user — this is the hardcoded admin username that Nagios recognises for full access. Other usernames have read-only access by default.",
    parts: [
      { text: "htpasswd -b", explanation: "create/update a user entry in batch mode (no interactive prompt)" },
      { text: "/etc/nagios/passwd", explanation: "the Nagios password file — checked by Apache on every request" },
      { text: "nagiosadmin", explanation: "the required admin username — Nagios grants full access to this user" },
    ],
    example: "Adding password for user nagiosadmin",
    why: "The username <code>nagiosadmin</code> is special — Nagios' CGI scripts check for this exact name. Any other username gets read-only dashboard access."
  },
  {
    id: 131, section: "web-ui", sectionTitle: "Web UI Setup",
    commandTitle: "Restart Apache and access the Nagios UI",
    command: "sudo systemctl restart httpd",
    searchTerms: "restart apache httpd nagios web ui localhost 8000",
    description: "Restart Apache to pick up the password file change. Then open <code>http://localhost:8000/nagios</code> in your host browser. Log in with <code>nagiosadmin</code> / <code>Password1</code>.",
    parts: [
      { text: "systemctl restart httpd", explanation: "Apache re-reads the password file on restart" },
    ],
    example: "Browser → http://localhost:8000/nagios\n→ Username: nagiosadmin, Password: Password1\n→ Nagios Core dashboard with Tactical Overview, Map, Hosts, Services",
    why: "The <code>/nagios</code> path is configured in <code>/etc/httpd/conf.d/nagios.conf</code>. Without it, you'd see the default Apache test page."
  },

  // ── Section 5: First plugin test ──────────────────────────────────────────

  {
    id: 140, section: "plugins", sectionTitle: "Plugin Exploration",
    commandTitle: "Explore the plugin directory",
    command: "ls /usr/lib64/nagios/plugins/",
    searchTerms: "nagios plugins directory check_ping check_http check_disk list",
    description: "List all installed Nagios plugins. Each is a standalone binary or script. You can run any plugin from the command line to test it before wiring it into Nagios configuration.",
    parts: [
      { text: "/usr/lib64/nagios/plugins/", explanation: "the standard plugin directory for RPM-installed Nagios" },
    ],
    example: "check_ping  check_http  check_disk  check_load  check_ssh\ncheck_mysql  check_pgsql  check_procs  check_users  check_swap\ncheck_nrpe  check_tcp  check_udp  check_smtp  check_dns\n...",
    why: "Each plugin is a self-contained program. You can test them independently — great for debugging. If <code>./check_http -H myapp.local</code> works from the CLI but Nagios shows CRITICAL, the problem is in your Nagios config, not the plugin."
  },
  {
    id: 141, section: "plugins", sectionTitle: "Plugin Exploration",
    commandTitle: "Test the ping plugin from the command line",
    command: "/usr/lib64/nagios/plugins/check_ping -H 8.8.8.8 -w 100,20% -c 500,50%",
    searchTerms: "check_ping nagios plugin test google dns warning critical thresholds",
    description: "Run the <code>check_ping</code> plugin manually. <code>-w 100,20%</code> means: WARNING if RTT > 100ms <em>or</em> packet loss > 20%. <code>-c 500,50%</code> means: CRITICAL if RTT > 500ms <em>or</em> packet loss > 50%. This is how every Nagios check works under the hood.",
    parts: [
      { text: "check_ping -H 8.8.8.8", explanation: "ping 8.8.8.8 (Google DNS) — any reachable IP works" },
      { text: "-w 100,20%", explanation: "WARNING threshold: RTT > 100ms or packet loss > 20%" },
      { text: "-c 500,50%", explanation: "CRITICAL threshold: RTT > 500ms or packet loss > 50%" },
    ],
    example: "PING OK - Packet loss = 0%, RTA = 14.32 ms|rta=14.32ms;100;500 pl=0%;20;50",
    why: "The threshold syntax is <code>RTT,packet_loss%</code>. Adjust these for your network — a local VM should have <code>-w 10,5% -c 50,10%</code>. Cloud targets get wider thresholds."
  },
  {
    id: 142, section: "plugins", sectionTitle: "Plugin Exploration",
    commandTitle: "Test HTTP monitoring against a .NET health endpoint",
    command: "/usr/lib64/nagios/plugins/check_http -H localhost -p 5000 -u /health -s '\"status\":\"Healthy\"'",
    searchTerms: "check_http nagios dotnet health endpoint kestrel status string match",
    description: "Monitor a .NET application's health check endpoint. <code>-H localhost -p 5000</code> targets a Kestrel server on port 5000. <code>-u /health</code> requests the health endpoint. <code>-s 'string'</code> verifies the response body contains the expected status — the check fails if the app returns an error or the string isn't found.",
    parts: [
      { text: "check_http -H localhost -p 5000", explanation: "connect to the .NET app on port 5000" },
      { text: "-u /health", explanation: "request the health check endpoint (ASP.NET Core health checks middleware)" },
      { text: "-s '\"status\":\"Healthy\"'", explanation: "verify the response contains this string — fails if the app is unhealthy" },
    ],
    example: "HTTP OK: HTTP/1.1 200 OK - 142 bytes in 0.003 second response time|time=0.003s;5;15",
    why: "The <code>-s</code> string match goes beyond 'is the port open?' — it verifies the application is actually serving valid responses. A 500 error from the app would fail this check even though the HTTP connection succeeded."
  },
  {
    id: 143, section: "plugins", sectionTitle: "Plugin Exploration",
    commandTitle: "Test HTTP monitoring against a Node.js health endpoint",
    command: "/usr/lib64/nagios/plugins/check_http -H localhost -p 3000 -u /health -s 'db.*connected' -r",
    searchTerms: "check_http nagios nodejs express health endpoint regex match",
    description: "Monitor a Node.js Express app. Same check_http plugin, different port. <code>-r</code> enables regex matching — <code>'db.*connected'</code> matches any response containing 'db...connected' (e.g. <code>{\"db\":\"connected\"}</code> or <code>Database is connected</code>).",
    parts: [
      { text: "check_http -H localhost -p 3000", explanation: "connect to the Node.js app on port 3000" },
      { text: "-s 'db.*connected' -r", explanation: "regex match — more flexible than exact string matching" },
    ],
    example: "HTTP OK: HTTP/1.1 200 OK - 96 bytes in 0.002 second response time|time=0.002s;5;15",
    why: "Regex matching lets you validate structured responses without hardcoding exact JSON. The app can change its response format and the check still passes as long as the DB status is present."
  },

  // ── Section 6: First Nagios configuration fix ─────────────────────────────

  {
    id: 150, section: "first-fix", sectionTitle: "First Configuration Fix",
    commandTitle: "Fix the missing localhost HTTP check",
    command: "echo '<h1>Nagios Monitoring Host</h1>' | sudo tee /var/www/html/index.html",
    searchTerms: "nagios http check fix localhost index.html apache document root",
    description: "By default, Nagios monitors an HTTP service on localhost that fails because there's no content in <code>/var/www/html</code>. Create a simple index page. Then re-schedule the check: in the Nagios UI, click the HTTP service → <strong>Re-schedule the next check of this service</strong> → Commit → Done. The check should turn green within seconds.",
    parts: [
      { text: "echo '<h1>...</h1>' | sudo tee /var/www/html/index.html", explanation: "create a minimal HTML page — enough to satisfy the HTTP check" },
      { text: "Re-schedule the next check", explanation: "force Nagios to re-run the check immediately instead of waiting for the next scheduled interval" },
    ],
    example: "Nagios UI → Services → localhost / HTTP → Status: OK (was CRITICAL)\nStatus Information: HTTP OK: HTTP/1.1 200 OK - 312 bytes in 0.001 seconds",
    why: "This teaches a critical Nagios workflow: a check can be CRITICAL because the monitored service is misconfigured, not because Nagios is broken. Always verify the service independently before debugging Nagios."
  },

];
