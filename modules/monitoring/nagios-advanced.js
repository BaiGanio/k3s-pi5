// modules/monitoring/nagios-advanced.js
// Monitoring: Advanced Nagios — PostgreSQL, Docker Containers, Event Handlers
// Extracted from DOB-M6 Practice (Practice-M6-Nagios.md, Part 3 — MariaDB/Docker sections)
// Reframed: PostgreSQL monitoring, .NET / Node.js Docker container checks

window.commandData = [

  // ── Section 1: PostgreSQL monitoring via NRPE ─────────────────────────────

  {
    id: 401, section: "postgresql", sectionTitle: "PostgreSQL Monitoring (NRPE)",
    commandTitle: "Install PostgreSQL on node2",
    command: "sudo yum install -y postgresql-server postgresql && sudo postgresql-setup initdb && sudo systemctl start postgresql && sudo systemctl enable postgresql",
    searchTerms: "postgresql install centos yum initdb systemctl start node2",
    description: "Install and initialise PostgreSQL on node2. <code>postgresql-setup initdb</code> creates the initial database cluster. Then start and enable the service.",
    parts: [
      { text: "postgresql-server", explanation: "the PostgreSQL server package" },
      { text: "postgresql-setup initdb", explanation: "initialise the database cluster (creates /var/lib/pgsql/data)" },
    ],
    example: "Initializing database ... OK\n● postgresql.service - PostgreSQL database server\n   Active: active (running)",
    why: "PostgreSQL on node2 is the target for Nagios database monitoring — the check_pgsql plugin connects from the master (or via NRPE) to verify the DB is accepting connections."
  },
  {
    id: 402, section: "postgresql", sectionTitle: "PostgreSQL Monitoring (NRPE)",
    commandTitle: "Create a monitoring user in PostgreSQL",
    command: "sudo -u postgres psql -c \"CREATE USER nagios WITH PASSWORD 'Password1';\" && sudo -u postgres psql -c \"CREATE DATABASE appdb OWNER nagios;\"",
    searchTerms: "postgresql create user nagios monitoring database psql",
    description: "Create a dedicated <code>nagios</code> user for monitoring. This user needs only CONNECT privilege — no data access required. The separate user follows the principle of least privilege: the Nagios check can't modify or read application data.",
    parts: [
      { text: "CREATE USER nagios WITH PASSWORD 'Password1'", explanation: "a dedicated monitoring account — separate from the application user" },
      { text: "CREATE DATABASE appdb", explanation: "a test database the Nagios check can verify exists" },
    ],
    example: "CREATE ROLE\nCREATE DATABASE",
    why: "Never use the application database user for monitoring. If the Nagios config leaks (it's often world-readable), the monitoring password is exposed — but the attacker only gets CONNECT, not SELECT/INSERT/DELETE on your app data."
  },
  {
    id: 403, section: "postgresql", sectionTitle: "PostgreSQL Monitoring (NRPE)",
    commandTitle: "Open PostgreSQL port and configure remote access",
    command: "sudo firewall-cmd --add-port=5432/tcp --permanent && sudo firewall-cmd --reload",
    searchTerms: "postgresql port 5432 firewall open remote access monitoring",
    description: "Open port 5432 (PostgreSQL default) so the Nagios master can connect directly (agentless check). For NRPE-based checks, the port stays local and only NRPE needs network access. Both approaches work; agentless is simpler for DB checks.",
    parts: [
      { text: "firewall-cmd --add-port=5432/tcp", explanation: "allow PostgreSQL connections from the network" },
    ],
    example: "success\nsuccess",
    why: "PostgreSQL checks can be agentless (Nagios connects to port 5432 directly) or NRPE-based (Nagios asks NRPE to check locally). Agentless is simpler for databases — the check_pgsql plugin already knows how to authenticate over the network."
  },
  {
    id: 404, section: "postgresql", sectionTitle: "PostgreSQL Monitoring (NRPE)",
    commandTitle: "Define PostgreSQL monitoring commands and service",
    command: "cat /etc/nagios/objects/dob-files/pgsql-commands.cfg",
    searchTerms: "nagios define command check_pgsql postgresql service database",
    description: "Define PostgreSQL commands with credential passing (<code>$ARG1$</code> for user, <code>$ARG2$</code> for password) and a service that checks PostgreSQL on node2. The check runs every 2 minutes and alerts on connection failure.",
    parts: [
      { text: "check_pgsql_cmdlinecred", explanation: "a parameterised command — credentials are passed as arguments" },
      { text: "check_command check_pgsql_cmdlinecred!nagios!Password1", explanation: "service invokes check_pgsql with user=nagios, password=Password1" },
    ],
    example: `define command {
    command_name    check_pgsql_cmdlinecred
    command_line    $USER1$/check_pgsql -H '$HOSTADDRESS$' -u '$ARG1$' -p '$ARG2$'
}

define service {
    use                     remote-service
    host_name               node2.sulab.local
    service_description     PostgreSQL
    check_command           check_pgsql_cmdlinecred!nagios!Password1
    notification_interval   2
}`,
    why: "Database monitoring catches failures before the application does. A PostgreSQL CRITICAL alert means: fix the database <em>before</em> users see 500 errors from the API."
  },

  // ── Section 2: Docker container monitoring ────────────────────────────────

  {
    id: 410, section: "docker", sectionTitle: "Docker Container Monitoring",
    commandTitle: "Install Docker on node2",
    command: "cat docker_setup.sh",
    searchTerms: "docker install centos yum docker-ce node2 setup script",
    description: "Install Docker CE on node2. The script adds the Docker repository, installs docker-ce, configures the storage driver, and adds the <code>nrpe</code> user to the <code>docker</code> group (so NRPE can inspect containers).",
    parts: [
      { text: "yum-config-manager --add-repo docker-ce.repo", explanation: "add the official Docker CE repository" },
      { text: "yum install -y docker-ce", explanation: "install Docker Community Edition" },
      { text: "usermod -aG docker nrpe", explanation: "add the NRPE user to the docker group — needed for docker inspect" },
    ],
    example: `#!/bin/bash
# Docker CE installation for CentOS 7
sudo yum install -y yum-utils device-mapper-persistent-data lvm2
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum makecache fast
sudo yum install -y docker-ce
sudo mkdir -p /etc/docker
echo '{"storage-driver": "overlay2"}' | sudo tee /etc/docker/daemon.json
sudo systemctl start docker && sudo systemctl enable docker
sudo usermod -aG docker nrpe`,
    why: "Docker on node2 lets you monitor containerised .NET and Node.js applications. The NRPE user needs docker group access so the check_docker_container script can run <code>docker inspect</code>."
  },
  {
    id: 411, section: "docker", sectionTitle: "Docker Container Monitoring",
    commandTitle: "Start a test container and add the Docker check script",
    command: "docker container run -d --name app-container alpine sleep 1d",
    searchTerms: "docker run container test alpine sleep nagios monitoring",
    description: "Start a long-running test container. In production, this would be a real .NET or Node.js app container. The Nagios check monitors whether the container is running, restarting, or stopped.",
    parts: [
      { text: "docker run -d --name app-container alpine sleep 1d", explanation: "a test container that runs for 24 hours — replace with your real app container" },
    ],
    example: "Unable to find image 'alpine:latest' locally\nlatest: Pulling from library/alpine\nd4fc045...: Pull complete\nabc123def456... → Container started",
    why: "Container monitoring is critical in Docker-based deployments. A stopped container means a stopped application — Nagios detects this within seconds (the normal_check_interval) and alerts."
  },
  {
    id: 412, section: "docker", sectionTitle: "Docker Container Monitoring",
    commandTitle: "Create the Docker container check script",
    command: "cat check_docker_container.sh",
    searchTerms: "nagios docker container check script nrpe running stopped restarting",
    description: "Create a custom Nagios plugin that checks Docker container state. The script uses <code>docker inspect</code> to determine if a container is running (OK), restarting (WARNING), stopped (CRITICAL), or non-existent (UNKNOWN). Place it in <code>/usr/lib64/nagios/plugins/</code> and make it executable.",
    parts: [
      { text: "docker inspect --format='{{.State.Running}}' $CONTAINER", explanation: "query the container's running state — false = stopped" },
      { text: "docker inspect --format='{{.State.Restarting}}' $CONTAINER", explanation: "check restart loop — true = WARNING (container is crash-looping)" },
      { text: "exit 0 (OK), exit 1 (WARNING), exit 2 (CRITICAL), exit 3 (UNKNOWN)", explanation: "Nagios exit codes — the plugin communicates state through its exit status" },
    ],
    example: `#!/bin/bash
CONTAINER=$1
if [ "x${CONTAINER}" == "x" ]; then
  echo "UNKNOWN - Container ID or Name Required"
  exit 3
fi
RUNNING=$(docker inspect --format="{{.State.Running}}" $CONTAINER 2>/dev/null)
if [ $? -eq 1 ]; then
  echo "UNKNOWN - $CONTAINER does not exist."
  exit 3
fi
if [ "$RUNNING" == "false" ]; then
  echo "CRITICAL - $CONTAINER is not running."
  exit 2
fi
RESTARTING=$(docker inspect --format="{{.State.Restarting}}" $CONTAINER)
if [ "$RESTARTING" == "true" ]; then
  echo "WARNING - $CONTAINER state is restarting."
  exit 1
fi
echo "OK - $CONTAINER is running."
exit 0`,
    why: "Custom plugins are Nagios' superpower. This 20-line script monitors something no built-in plugin covers — Docker container health. You can extend this pattern to monitor anything: application metrics, queue depths, SSL certificate expiry, custom API endpoints."
  },
  {
    id: 413, section: "docker", sectionTitle: "Docker Container Monitoring",
    commandTitle: "Register the Docker check in NRPE and define a Nagios service",
    command: "sudo sed -i '/^#/!s/$/\\ncommand[check-docker-container]=\\/usr\\/lib64\\/nagios\\/plugins\\/check_docker_container.sh $ARG1$/' /etc/nagios/nrpe.cfg",
    searchTerms: "nrpe command check docker container register cfg",
    description: "Add a command definition to <code>/etc/nagios/nrpe.cfg</code> on node2: <code>command[check-docker-container]=/usr/lib64/nagios/plugins/check_docker_container.sh $ARG1$</code>. Restart NRPE. Then on the Nagios master, define a service that uses <code>check_nrpe_arg!check-docker-container!app-container</code>.",
    parts: [
      { text: "command[check-docker-container]=...$ARG1$", explanation: "NRPE command — accepts a container name as argument" },
      { text: "check_command check_nrpe_arg!check-docker-container!app-container", explanation: "service invokes NRPE → runs the docker check script with 'app-container' as the target" },
    ],
    example: `# In /etc/nagios/nrpe.cfg (on node2):
command[check-docker-container]=/usr/lib64/nagios/plugins/check_docker_container.sh $ARG1$

# Nagios command definition (on master):
define command {
    command_name    check_nrpe_arg
    command_line    $USER1$/check_nrpe -H $HOSTADDRESS$ -c $ARG1$ -a $ARG2$
}

# Nagios service definition (on master):
define service {
    use                     remote-service
    host_name               node2.sulab.local
    service_description     Container — app-container
    check_command           check_nrpe_arg!check-docker-container!app-container
}`,
    why: "This is the full chain: Nagios → check_nrpe → NRPE daemon → custom script → docker inspect. Four hops, sub-second response. Each layer adds flexibility — the script can monitor any container, and NRPE proxies the check securely."
  },

  // ── Section 3: Grant NRPE sudo for docker ─────────────────────────────────

  {
    id: 420, section: "nrpe-sudo", sectionTitle: "NRPE Sudo Configuration",
    commandTitle: "Grant NRPE passwordless sudo and docker group access",
    command: "echo 'nrpe ALL=(ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/nrpe && sudo usermod -aG docker nrpe && sudo systemctl restart nrpe",
    searchTerms: "nrpe sudo nopasswd docker group usermod restart",
    description: "The NRPE daemon runs as the <code>nrpe</code> user. To run <code>docker inspect</code>, it needs: (1) membership in the docker group, and (2) passwordless sudo (for certain plugins that require root). Restart NRPE to apply group changes.",
    parts: [
      { text: "nrpe ALL=(ALL) NOPASSWD: ALL", explanation: "let the nrpe user run any command as root without a password" },
      { text: "usermod -aG docker nrpe", explanation: "add nrpe to the docker group — needed for docker inspect" },
    ],
    example: "nrpe ALL=(ALL) NOPASSWD: ALL\n$ groups nrpe\nnrpe : nrpe docker",
    why: "This is lab-only. In production, you'd write specific sudo rules for each plugin that needs root, not blanket NOPASSWD. But for learning, blanket access lets you experiment without permission errors blocking every new plugin."
  },

];
