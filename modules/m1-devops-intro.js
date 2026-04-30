// modules/m1-devops-intro.js
// Practice M1: Introduction to DevOps

window.commandData = [

  // ── Part 1: VirtualBox ────────────────────────────────────────────────────

  {
    id: 101,
    section: "virtualbox",
    sectionTitle: "Part 1 – Install VirtualBox",
    commandTitle: "Add VirtualBox repo & install",
    command: "wget http://download.virtualbox.org/virtualbox/rpm/rhel/virtualbox.repo && sudo mv virtualbox.repo /etc/yum.repos.d/ && sudo yum update -y && sudo yum install -y gcc make kernel-headers kernel-devel && sudo yum install -y VirtualBox-5.2 && sudo usermod -a -G vboxusers devops",
    searchTerms: "virtualbox install yum wget repo rhel centos",
    description: "Downloads the official VirtualBox RPM repository file, moves it into the yum repo directory, updates the system, installs the kernel build tools VirtualBox needs, then installs VirtualBox 5.2 itself. Finally adds the <code>devops</code> user to the <code>vboxusers</code> group so it can run VMs without root.",
    parts: [
      { text: "wget …/virtualbox.repo", explanation: "downloads the repo definition file from VirtualBox's CDN" },
      { text: "sudo mv … /etc/yum.repos.d/", explanation: "places the repo file where yum can discover it" },
      { text: "sudo yum update -y", explanation: "refreshes package lists and upgrades existing packages" },
      { text: "sudo yum install -y gcc make kernel-headers kernel-devel", explanation: "installs C compiler and kernel source files — required to compile VirtualBox kernel modules" },
      { text: "sudo yum install -y VirtualBox-5.2", explanation: "installs VirtualBox 5.2 from the newly added repo" },
      { text: "sudo usermod -a -G vboxusers devops", explanation: "adds the devops user to the vboxusers group — required for USB and full VM access" },
    ],
    example: "Loaded plugins: fastestmirror\n...\nInstalled: VirtualBox-5.2.x86_64\nComplete!",
    why: "VirtualBox must be installed with its kernel modules compiled against the running kernel. The kernel-headers/devel packages supply the headers needed for that compilation.",
  },

  // ── Part 2: Manual Approach — DOB-WEB ────────────────────────────────────

  {
    id: 201,
    section: "dob-web",
    sectionTitle: "Part 2 – DOB-WEB Setup",
    commandTitle: "Set hostname to dob-web",
    command: "sudo hostnamectl set-hostname dob-web",
    searchTerms: "hostname hostnamectl set rename machine",
    description: "Permanently changes the machine's hostname to <code>dob-web</code>. The change takes effect on next login.",
    parts: [
      { text: "sudo", explanation: "run as superuser" },
      { text: "hostnamectl", explanation: "systemd tool to query and change the system hostname" },
      { text: "set-hostname", explanation: "sub-command that writes the new name" },
      { text: "dob-web", explanation: "the desired hostname — identifies this VM as the web server" },
    ],
    example: "# (no output on success — re-login to see the new prompt)",
    why: "A meaningful hostname makes it easy to identify which machine you're on and is used by services for self-identification.",
  },

  {
    id: 202,
    section: "dob-web",
    sectionTitle: "Part 2 – DOB-WEB Setup",
    commandTitle: "Install Node.js and Git",
    command: "curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash - && sudo yum install -y nodejs git",
    searchTerms: "nodejs node npm git install yum nodesource web server",
    description: "Adds the NodeSource repository for Node.js 18 LTS, then installs the <code>nodejs</code> package (which includes <code>npm</code>) and <code>git</code> for cloning the project repository.",
    parts: [
      { text: "curl -fsSL … | sudo bash -", explanation: "downloads and executes the NodeSource setup script, which registers the Node.js 18 yum repo" },
      { text: "sudo yum install -y nodejs", explanation: "installs Node.js and npm from the newly added NodeSource repo" },
      { text: "git", explanation: "version control tool — used to clone the project" },
    ],
    example: "Installed:\n  nodejs.x86_64  git.x86_64\nComplete!\n$ node --version\nv18.20.4\n$ npm --version\n10.7.0",
    why: "Node.js is not in the default CentOS repos at a modern version. The NodeSource script registers an upstream repo so yum can install and update it like any other package.",
  },

  {
    id: 203,
    section: "dob-web",
    sectionTitle: "Part 2 – DOB-WEB Setup",
    commandTitle: "Install app dependencies & create systemd service",
    command: "cd /home/devops/dob-module-1 && npm install && sudo cp dob-web.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable dob-web && sudo systemctl start dob-web",
    searchTerms: "npm install systemctl enable start node service systemd daemon",
    description: "Installs the project's npm dependencies, registers the Node.js app as a systemd service, reloads the daemon so systemd picks up the new unit file, then enables and starts the service.",
    parts: [
      { text: "npm install", explanation: "reads package.json and downloads all declared dependencies into node_modules/" },
      { text: "sudo cp dob-web.service /etc/systemd/system/", explanation: "places the systemd unit file where systemd can find it" },
      { text: "sudo systemctl daemon-reload", explanation: "tells systemd to re-scan unit files after adding or changing one" },
      { text: "sudo systemctl enable dob-web", explanation: "creates a symlink so systemd starts the app on every boot" },
      { text: "sudo systemctl start dob-web", explanation: "starts the Node.js app right now without requiring a reboot" },
    ],
    example: "added 97 packages in 4.2s\nCreated symlink /etc/systemd/system/multi-user.target.wants/dob-web.service",
    why: "Running a Node.js app as a systemd service gives you automatic restarts on crash, boot-time startup, and standard log integration via journald — without a process manager like pm2.",
  },

  {
    id: 204,
    section: "dob-web",
    sectionTitle: "Part 2 – DOB-WEB Setup",
    commandTitle: "Open app port in firewall",
    command: "sudo firewall-cmd --add-port=3000/tcp --permanent && sudo firewall-cmd --reload",
    searchTerms: "firewall-cmd port 3000 open permanent reload firewalld node",
    description: "Opens TCP port 3000 (the port the Node.js/Express app listens on) permanently in firewalld and reloads the active ruleset to apply it immediately.",
    parts: [
      { text: "sudo firewall-cmd", explanation: "command-line interface to firewalld" },
      { text: "--add-port=3000/tcp", explanation: "opens TCP port 3000 — the default Express development port" },
      { text: "--permanent", explanation: "writes the rule to disk so it persists after reboot" },
      { text: "--reload", explanation: "applies the saved rules to the running firewall without dropping existing connections" },
    ],
    example: "success\nsuccess",
    why: "By default firewalld blocks all inbound traffic. Without this rule, browsers and API clients on the host network cannot reach the Express server.",
  },

  {
    id: 205,
    section: "dob-web",
    sectionTitle: "Part 2 – DOB-WEB Setup",
    commandTitle: "Clone the project repository",
    command: "git clone https://github.com/shekeriev/dob-module-1",
    searchTerms: "git clone github project repo clone",
    description: "Clones the lab project from GitHub into a local directory called <code>dob-module-1</code>. This pulls down the Node.js application files, <code>package.json</code>, and the database setup SQL script.",
    parts: [
      { text: "git", explanation: "version control system" },
      { text: "clone", explanation: "creates a local copy of a remote repository" },
      { text: "https://github.com/shekeriev/dob-module-1", explanation: "the remote repository URL" },
    ],
    example: "Cloning into 'dob-module-1'...\nremote: Counting objects: 42, done.\nReceiving objects: 100% (42/42), done.",
    why: "Cloning from a central repository is the standard way to distribute application code — it also gives you the full Git history.",
  },

  {
    id: 206,
    section: "dob-web",
    sectionTitle: "Part 2 – DOB-WEB Setup",
    commandTitle: "Fix SELinux so Node.js can reach the network",
    command: "sudo setsebool -P httpd_can_network_connect=1",
    searchTerms: "selinux setsebool network connect boolean node nodejs",
    description: "Sets the SELinux boolean <code>httpd_can_network_connect</code> to true permanently. Despite the name this boolean controls outbound network connections for any process in the <code>httpd_t</code> domain — which includes Node.js apps managed by systemd on CentOS 7.",
    parts: [
      { text: "sudo setsebool", explanation: "sets an SELinux boolean policy value" },
      { text: "-P", explanation: "make the change persistent across reboots" },
      { text: "httpd_can_network_connect=1", explanation: "allows the process to initiate outbound network connections — needed for the app to reach the PostgreSQL server" },
    ],
    example: "# (no output — takes a few seconds to apply policy)",
    why: "SELinux enforces mandatory access control on top of standard Unix permissions. Even if firewall and file permissions are correct, SELinux can still silently block the Node.js app from connecting to the database server.",
  },

  // ── Part 2: Manual Approach — DOB-DB ─────────────────────────────────────

  {
    id: 301,
    section: "dob-db",
    sectionTitle: "Part 2 – DOB-DB Setup",
    commandTitle: "Set hostname to dob-db",
    command: "sudo hostnamectl set-hostname dob-db",
    searchTerms: "hostname hostnamectl dob-db rename",
    description: "Permanently renames this VM to <code>dob-db</code> to identify it as the database server.",
    parts: [
      { text: "sudo hostnamectl set-hostname", explanation: "systemd command to change the system hostname" },
      { text: "dob-db", explanation: "the new hostname — identifies this machine as the database server" },
    ],
    example: "# Re-login to see the updated shell prompt: [devops@dob-db ~]$",
    why: "Clear hostnames prevent confusion when you have multiple terminals open to different VMs.",
  },

  {
    id: 302,
    section: "dob-db",
    sectionTitle: "Part 2 – DOB-DB Setup",
    commandTitle: "Install PostgreSQL server & client",
    command: "sudo yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm && sudo yum install -y postgresql16-server postgresql16",
    searchTerms: "postgresql postgres install yum database server client pgdg",
    description: "Adds the official PostgreSQL Global Development Group (PGDG) repository, then installs the PostgreSQL 16 server daemon and its command-line client <code>psql</code>.",
    parts: [
      { text: "sudo yum install -y …pgdg-redhat-repo-latest…", explanation: "registers the official PGDG yum repo — required because CentOS 7 only ships an older PostgreSQL version" },
      { text: "postgresql16-server", explanation: "the PostgreSQL 16 server daemon (postgres)" },
      { text: "postgresql16", explanation: "the psql command-line client and shared libraries" },
    ],
    example: "Installed:\n  postgresql16.x86_64  postgresql16-server.x86_64\nComplete!\n$ psql --version\npsql (PostgreSQL) 16.3",
    why: "The PostgreSQL version in the default CentOS repos is outdated. The PGDG repo provides current releases with full feature support and security updates.",
  },

  {
    id: 303,
    section: "dob-db",
    sectionTitle: "Part 2 – DOB-DB Setup",
    commandTitle: "Initialise, enable & start PostgreSQL",
    command: "sudo /usr/pgsql-16/bin/postgresql-16-setup initdb && sudo systemctl enable postgresql-16 && sudo systemctl start postgresql-16",
    searchTerms: "postgresql initdb enable start systemctl postgres service autostart",
    description: "Initialises the PostgreSQL data directory (required once before first start), configures the service to start at boot, then starts it immediately.",
    parts: [
      { text: "postgresql-16-setup initdb", explanation: "creates the initial database cluster in /var/lib/pgsql/16/data/ — must be run before the first start" },
      { text: "sudo systemctl enable postgresql-16", explanation: "configures PostgreSQL to start automatically on boot" },
      { text: "&&", explanation: "chain: run next only if previous succeeded" },
      { text: "sudo systemctl start postgresql-16", explanation: "starts the PostgreSQL daemon right now" },
    ],
    example: "Initializing database ... OK\nCreated symlink … postgresql-16.service → …",
    why: "PostgreSQL requires an explicit initdb step to lay down the data directory and system catalogs before the server can start — unlike MariaDB which auto-initialises on first boot.",
  },

  {
    id: 304,
    section: "dob-db",
    sectionTitle: "Part 2 – DOB-DB Setup",
    commandTitle: "Create database user and database",
    command: "sudo -u postgres psql -c \"CREATE USER devops WITH PASSWORD 'secret';\" && sudo -u postgres psql -c \"CREATE DATABASE dobapp OWNER devops;\"",
    searchTerms: "postgres psql create user database role password owner",
    description: "Connects to PostgreSQL as the <code>postgres</code> superuser and runs two SQL statements: one to create an application user with a password, and one to create the application database owned by that user.",
    parts: [
      { text: "sudo -u postgres", explanation: "runs the following command as the postgres OS user — the default superuser account created by the installer" },
      { text: "psql -c \"…\"", explanation: "executes a single SQL statement and exits — no interactive shell needed" },
      { text: "CREATE USER devops WITH PASSWORD 'secret'", explanation: "creates a PostgreSQL role that the Node.js app will use to authenticate" },
      { text: "CREATE DATABASE dobapp OWNER devops", explanation: "creates the application database and gives full ownership to the devops role" },
    ],
    example: "CREATE ROLE\nCREATE DATABASE",
    why: "Applications should never connect as the postgres superuser. A dedicated role with only the permissions it needs limits the blast radius of a compromised connection string.",
  },

  {
    id: 305,
    section: "dob-db",
    sectionTitle: "Part 2 – DOB-DB Setup",
    commandTitle: "Copy DB setup script from web VM via SCP",
    command: "scp devops@IP:/home/devops/dob-module-1/db*.sql .",
    searchTerms: "scp copy ssh file transfer db sql script remote",
    description: "Securely copies all SQL files matching <code>db*.sql</code> from the dob-web machine into the current directory on dob-db.",
    parts: [
      { text: "scp", explanation: "Secure Copy — transfers files over SSH" },
      { text: "devops@IP:", explanation: "user and IP address of the source machine (dob-web)" },
      { text: "/home/devops/dob-module-1/db*.sql", explanation: "glob pattern matching all SQL files in the cloned repo" },
      { text: ".", explanation: "destination: current directory on dob-db" },
    ],
    example: "db_setup.sql                  100% 1234     1.2MB/s   00:00",
    why: "The SQL setup script lives on dob-web where the repo was cloned. SCP moves it over SSH without extra tools.",
  },

  {
    id: 306,
    section: "dob-db",
    sectionTitle: "Part 2 – DOB-DB Setup",
    commandTitle: "Run the DB setup script",
    command: "psql -U devops -d dobapp -f db_setup.sql",
    searchTerms: "psql run script sql file database setup postgres",
    description: "Connects to the <code>dobapp</code> database as the <code>devops</code> user and executes the SQL setup script, creating the schema, tables, and seed data.",
    parts: [
      { text: "psql", explanation: "PostgreSQL interactive terminal / batch SQL runner" },
      { text: "-U devops", explanation: "connect as the devops database role" },
      { text: "-d dobapp", explanation: "the target database to connect to" },
      { text: "-f db_setup.sql", explanation: "read and execute SQL from this file instead of an interactive prompt" },
    ],
    example: "CREATE TABLE\nINSERT 0 5\nCREATE INDEX",
    why: "Using <code>-f</code> to feed a file is the standard way to execute a batch of SQL statements repeatably — the same file can be re-run in CI or against a fresh DB.",
  },

  {
    id: 307,
    section: "dob-db",
    sectionTitle: "Part 2 – DOB-DB Setup",
    commandTitle: "Open PostgreSQL port in firewall",
    command: "sudo firewall-cmd --add-port=5432/tcp --permanent && sudo firewall-cmd --reload",
    searchTerms: "firewall-cmd 5432 postgresql postgres port open tcp permanent",
    description: "Opens TCP port 5432 (the default PostgreSQL port) permanently in firewalld and reloads the active ruleset.",
    parts: [
      { text: "--add-port=5432/tcp", explanation: "opens TCP port 5432 — the standard PostgreSQL listen port" },
      { text: "--permanent", explanation: "persists the rule across reboots" },
      { text: "--reload", explanation: "activates the new rules immediately without dropping existing connections" },
    ],
    example: "success\nsuccess",
    why: "The Node.js app on dob-web connects to dob-db on port 5432 — firewalld must allow it or every database query will time out.",
  },

  {
    id: 308,
    section: "dob-db",
    sectionTitle: "Part 2 – DOB-DB Setup",
    commandTitle: "Allow remote connections in pg_hba.conf",
    command: "sudo bash -c \"echo 'host  dobapp  devops  0.0.0.0/0  md5' >> /var/lib/pgsql/16/data/pg_hba.conf\" && sudo systemctl reload postgresql-16",
    searchTerms: "pg_hba.conf postgres remote connection md5 host authentication",
    description: "Appends a host-based authentication rule to <code>pg_hba.conf</code> that allows the <code>devops</code> user to connect to <code>dobapp</code> from any IP using a password (md5), then reloads PostgreSQL to apply the change.",
    parts: [
      { text: "echo 'host  dobapp  devops  0.0.0.0/0  md5'", explanation: "the HBA rule: connection type (host), database, user, CIDR range, auth method" },
      { text: ">> /var/lib/pgsql/16/data/pg_hba.conf", explanation: "appends the rule to PostgreSQL's host-based authentication config file" },
      { text: "sudo systemctl reload postgresql-16", explanation: "sends SIGHUP to postgres, causing it to re-read pg_hba.conf without restarting" },
    ],
    example: "# (no output — verify with: sudo systemctl status postgresql-16)",
    why: "PostgreSQL rejects all remote connections by default. pg_hba.conf is the access control list that determines who can connect, from where, and how they must authenticate.",
  },

  // ── Part 3: Vagrant ───────────────────────────────────────────────────────

  {
    id: 401,
    section: "vagrant",
    sectionTitle: "Part 3 – Vagrant",
    commandTitle: "Download & install Vagrant RPM",
    command: "wget https://releases.hashicorp.com/vagrant/2.1.5/vagrant_2.1.5_x86_64.rpm && sudo rpm -ivh vagrant_2.1.5_x86_64.rpm",
    searchTerms: "vagrant install rpm hashicorp download wget",
    description: "Downloads the Vagrant 2.1.5 RPM package from HashiCorp and installs it.",
    parts: [
      { text: "wget …vagrant_2.1.5_x86_64.rpm", explanation: "downloads the RPM from HashiCorp's release server" },
      { text: "sudo rpm -ivh", explanation: "installs (-i) the RPM with verbose output (-v) and a progress bar (-h)" },
    ],
    example: "Preparing...  ################################# [100%]\nInstalling vagrant-2.1.5-1.x86_64",
    why: "Vagrant is not in standard RHEL/CentOS repos so it must be fetched directly from HashiCorp.",
  },

  {
    id: 402,
    section: "vagrant",
    sectionTitle: "Part 3 – Vagrant",
    commandTitle: "Initialize a Vagrant box",
    command: "vagrant init shekeriev/centos-7-64-minimal",
    searchTerms: "vagrant init vagrantfile box initialize centos",
    description: "Creates a <code>Vagrantfile</code> in the current directory pre-configured to use the specified box from Vagrant Cloud.",
    parts: [
      { text: "vagrant init", explanation: "generates a Vagrantfile in the current directory" },
      { text: "shekeriev/centos-7-64-minimal", explanation: "the base box — fetched from Vagrant Cloud" },
    ],
    example: "A `Vagrantfile` has been placed in this directory. You are now ready to `vagrant up`!",
    why: "The Vagrantfile is the declarative definition of your VM — box, memory, networking, provisioning.",
  },

  {
    id: 403,
    section: "vagrant",
    sectionTitle: "Part 3 – Vagrant",
    commandTitle: "Start the Vagrant VM",
    command: "vagrant up",
    searchTerms: "vagrant up start boot provision vm",
    description: "Reads the Vagrantfile, downloads the base box if not cached, creates the VirtualBox VM, and provisions it.",
    parts: [
      { text: "vagrant up", explanation: "creates and starts the VM, running all provisioners defined in the Vagrantfile" },
    ],
    example: "Bringing machine 'default' up with 'virtualbox' provider...\n==> default: Machine booted and ready!",
    why: "vagrant up replaces the entire manual VM import + configure + start workflow.",
  },

  {
    id: 404,
    section: "vagrant",
    sectionTitle: "Part 3 – Vagrant",
    commandTitle: "SSH into the Vagrant VM",
    command: "vagrant ssh",
    searchTerms: "vagrant ssh shell connect login terminal",
    description: "Opens an SSH session to the running VM without needing to know the IP, port, or key path.",
    parts: [
      { text: "vagrant ssh", explanation: "opens an interactive SSH session using Vagrant's auto-managed key pair" },
    ],
    example: "Welcome to CentOS Linux 7 (Core)\n[vagrant@localhost ~]$",
    why: "Vagrant auto-configures SSH key-based auth — no manual key management needed.",
  },

  {
    id: 405,
    section: "vagrant",
    sectionTitle: "Part 3 – Vagrant",
    commandTitle: "List all Vagrant machines",
    command: "vagrant global-status",
    searchTerms: "vagrant global-status list all vms running status",
    description: "Shows all Vagrant-managed VMs on the host across all project directories, with their state and Vagrantfile path.",
    parts: [
      { text: "vagrant global-status", explanation: "queries Vagrant's global index of all known machines on this host" },
    ],
    example: "id       name    provider   state   directory\n-------------------------------------------------------\n1a2b3c4  default virtualbox running  /home/user/Vagrant/dob-m1-1",
    why: "Gives a bird's-eye view of everything running when working with multiple Vagrantfiles.",
  },

  {
    id: 406,
    section: "vagrant",
    sectionTitle: "Part 3 – Vagrant",
    commandTitle: "List cached Vagrant boxes",
    command: "vagrant box list",
    searchTerms: "vagrant box list cached downloaded images",
    description: "Lists all box images downloaded and cached locally. Boxes are reused across VMs to avoid re-downloading.",
    parts: [
      { text: "vagrant box list", explanation: "shows all locally cached boxes with name, provider, and version" },
    ],
    example: "shekeriev/centos-7-64-minimal  (virtualbox, 7.0.0)",
    why: "Box images can be several hundred MB. Knowing what's cached helps avoid redundant downloads.",
  },

  {
    id: 407,
    section: "vagrant",
    sectionTitle: "Part 3 – Vagrant",
    commandTitle: "Destroy the Vagrant VM",
    command: "vagrant destroy --force",
    searchTerms: "vagrant destroy delete remove vm cleanup force",
    description: "Stops and completely deletes the VM and all its virtual disks. <code>--force</code> skips the confirmation prompt.",
    parts: [
      { text: "vagrant destroy", explanation: "stops the VM and removes all disk images and VirtualBox config" },
      { text: "--force", explanation: "skips the 'Are you sure?' confirmation" },
    ],
    example: "==> default: Forcing shutdown of VM...\n==> default: Destroying VM and associated drives...",
    why: "Vagrant VMs are ephemeral — destroy freely to reclaim disk space and ensure a clean slate.",
  },
];