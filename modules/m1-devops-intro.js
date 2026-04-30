// modules/m1-devops-intro.js
// Practice M1: Introduction to DevOps

const commandData = [

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
    commandTitle: "Install Apache, PHP, and Git",
    command: "sudo yum install -y httpd php php-mysql git",
    searchTerms: "apache httpd php mysql git install yum web server",
    description: "Installs the Apache web server (<code>httpd</code>), PHP runtime, the PHP MySQL extension so PHP can talk to MariaDB, and Git for cloning the project repository.",
    parts: [
      { text: "sudo yum install -y", explanation: "install packages non-interactively with yum" },
      { text: "httpd", explanation: "Apache HTTP Server — serves web pages" },
      { text: "php", explanation: "PHP language runtime" },
      { text: "php-mysql", explanation: "PHP extension that provides MySQL/MariaDB connectivity" },
      { text: "git", explanation: "version control tool — used to clone the project" },
    ],
    example: "Installed:\n  httpd.x86_64   php.x86_64   php-mysql.x86_64   git.x86_64\nComplete!",
    why: "The web application is a PHP app that reads data from MariaDB — all three components (Apache + PHP + php-mysql) must be present for it to function.",
  },

  {
    id: 203,
    section: "dob-web",
    sectionTitle: "Part 2 – DOB-WEB Setup",
    commandTitle: "Enable & start Apache",
    command: "sudo systemctl enable httpd && sudo systemctl start httpd",
    searchTerms: "systemctl enable start httpd apache autostart service",
    description: "Configures Apache to start automatically at every boot (<code>enable</code>), then starts it immediately without requiring a reboot (<code>start</code>).",
    parts: [
      { text: "sudo systemctl enable httpd", explanation: "creates a symlink so systemd starts Apache on boot" },
      { text: "&&", explanation: "run the next command only if the previous one succeeded" },
      { text: "sudo systemctl start httpd", explanation: "starts the Apache service right now" },
    ],
    example: "Created symlink /etc/systemd/system/multi-user.target.wants/httpd.service",
    why: "enable ensures the service survives reboots; start makes it available immediately without waiting for a restart.",
  },

  {
    id: 204,
    section: "dob-web",
    sectionTitle: "Part 2 – DOB-WEB Setup",
    commandTitle: "Open HTTP port in firewall",
    command: "sudo firewall-cmd --add-service=http --permanent && sudo firewall-cmd --reload",
    searchTerms: "firewall-cmd http port 80 open permanent reload firewalld",
    description: "Opens port 80 (HTTP) in firewalld using the named service shorthand, makes the rule permanent so it survives reboots, then reloads the active ruleset to apply it immediately.",
    parts: [
      { text: "sudo firewall-cmd", explanation: "command-line interface to firewalld" },
      { text: "--add-service=http", explanation: "opens the standard ports associated with the 'http' service (TCP 80)" },
      { text: "--permanent", explanation: "writes the rule to disk so it persists after reboot" },
      { text: "--reload", explanation: "applies the saved rules to the running firewall without dropping existing connections" },
    ],
    example: "success\nsuccess",
    why: "By default firewalld blocks inbound traffic. Without this rule, browsers on the host network cannot reach the web server.",
  },

  {
    id: 205,
    section: "dob-web",
    sectionTitle: "Part 2 – DOB-WEB Setup",
    commandTitle: "Clone the project repository",
    command: "git clone https://github.com/shekeriev/dob-module-1",
    searchTerms: "git clone github project repo clone",
    description: "Clones the lab project from GitHub into a local directory called <code>dob-module-1</code>. This pulls down both the web application files and the database setup SQL script.",
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
    commandTitle: "Fix SELinux so Apache can reach the network",
    command: "sudo setsebool -P httpd_can_network_connect=1",
    searchTerms: "selinux setsebool httpd network connect boolean apache",
    description: "Sets the SELinux boolean <code>httpd_can_network_connect</code> to true, permanently (<code>-P</code>). Without this, SELinux blocks Apache from making outbound connections — including to the MariaDB server.",
    parts: [
      { text: "sudo setsebool", explanation: "sets an SELinux boolean policy value" },
      { text: "-P", explanation: "make the change persistent across reboots" },
      { text: "httpd_can_network_connect=1", explanation: "allows the Apache process to initiate network connections" },
    ],
    example: "# (no output — takes a few seconds to apply policy)",
    why: "SELinux enforces mandatory access control on top of standard Unix permissions. Even if firewall and file permissions are correct, SELinux can still block Apache → DB communication.",
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
    commandTitle: "Install MariaDB client & server",
    command: "sudo yum install -y mariadb mariadb-server",
    searchTerms: "mariadb mysql install yum database server client",
    description: "Installs both the MariaDB server daemon and its command-line client. The server stores and serves the data; the client lets you run SQL queries interactively.",
    parts: [
      { text: "mariadb", explanation: "the command-line client (mysql-compatible CLI)" },
      { text: "mariadb-server", explanation: "the database server daemon (mysqld)" },
    ],
    example: "Installed:\n  mariadb.x86_64  mariadb-server.x86_64\nComplete!",
    why: "MariaDB is a drop-in open-source replacement for MySQL — widely used on CentOS/RHEL systems.",
  },

  {
    id: 303,
    section: "dob-db",
    sectionTitle: "Part 2 – DOB-DB Setup",
    commandTitle: "Enable & start MariaDB",
    command: "sudo systemctl enable mariadb && sudo systemctl start mariadb",
    searchTerms: "systemctl enable start mariadb mysql service autostart",
    description: "Enables MariaDB to start at boot and immediately starts the service.",
    parts: [
      { text: "sudo systemctl enable mariadb", explanation: "configures MariaDB to start automatically on boot" },
      { text: "&&", explanation: "chain: run next only if previous succeeded" },
      { text: "sudo systemctl start mariadb", explanation: "starts the MariaDB service right now" },
    ],
    example: "Created symlink … mariadb.service → …",
    why: "Without enable the database would not come back up after a VM reboot, breaking the web application.",
  },

  {
    id: 304,
    section: "dob-db",
    sectionTitle: "Part 2 – DOB-DB Setup",
    commandTitle: "Secure the MariaDB installation",
    command: "sudo mysql_secure_installation",
    searchTerms: "mysql_secure_installation mariadb security root password remove anonymous",
    description: "Runs the interactive hardening wizard for MariaDB. Sets a root password, removes anonymous accounts, disallows remote root login, and drops the test database.",
    parts: [
      { text: "sudo", explanation: "run as root — needed to modify the database system tables" },
      { text: "mysql_secure_installation", explanation: "interactive script that applies recommended MariaDB security settings" },
    ],
    example: "Enter current password for root (enter for none):\nSet root password? [Y/n] Y\nRemove anonymous users? [Y/n] Y\nAll done!",
    why: "A fresh MariaDB install has no root password and includes test accounts — this script locks it all down.",
  },

  {
    id: 305,
    section: "dob-db",
    sectionTitle: "Part 2 – DOB-DB Setup",
    commandTitle: "Copy DB script from web VM via SCP",
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
    command: "mysql -u root -p < db_setup.sql",
    searchTerms: "mysql run script sql import database setup pipe redirect",
    description: "Feeds the SQL setup script into the MariaDB client as root, creating the schema, tables, and seed data.",
    parts: [
      { text: "mysql", explanation: "MariaDB/MySQL command-line client" },
      { text: "-u root", explanation: "connect as the root database user" },
      { text: "-p", explanation: "prompt for the root password interactively" },
      { text: "< db_setup.sql", explanation: "redirect: read SQL commands from the file" },
    ],
    example: "Enter password:\n# (no output on success)",
    why: "Redirecting a file into mysql is the standard way to execute a batch of SQL statements.",
  },

  {
    id: 307,
    section: "dob-db",
    sectionTitle: "Part 2 – DOB-DB Setup",
    commandTitle: "Open MySQL port in firewall",
    command: "sudo firewall-cmd --add-port=3306/tcp --permanent && sudo firewall-cmd --reload",
    searchTerms: "firewall-cmd 3306 mysql mariadb port open tcp permanent",
    description: "Opens TCP port 3306 (the default MariaDB port) permanently and reloads the firewall.",
    parts: [
      { text: "--add-port=3306/tcp", explanation: "opens TCP port 3306 — the standard MySQL/MariaDB port" },
      { text: "--permanent", explanation: "persists the rule across reboots" },
      { text: "--reload", explanation: "activates the new rules immediately" },
    ],
    example: "success\nsuccess",
    why: "The PHP app on dob-web connects to dob-db on port 3306 — firewall must allow it.",
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