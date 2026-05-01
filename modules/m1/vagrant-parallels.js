// modules/m1/vagrant-parallels.js
// Vagrant + Parallels on Apple Silicon — two-VM dev environment
// Uses the pageBlocks format: prose, note, and commands blocks can be mixed freely.

window.pageBlocks = [

  // ── Introduction ──────────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'What you will build',
    content: `
      <p>
        This module walks through setting up a fully reproducible, two-VM development environment
        on an Apple Silicon Mac using <strong>Vagrant</strong> and <strong>Parallels Desktop</strong>.
        By the end you will have two named VMs — <code>app-web</code> (Node.js) and
        <code>app-db</code> (PostgreSQL) — both defined in a single <code>Vagrantfile</code>
        and brought up with one command.
      </p>
      <p><strong>Prerequisites</strong></p>
      <ul>
        <li>Homebrew installed on your Mac</li>
        <li>Parallels Desktop <strong>Pro or Business</strong> edition
            (Standard does not expose the automation API Vagrant needs)</li>
        <li>~10 GB free disk space for the ARM64 box image and VM disks</li>
      </ul>
      <p>
        The Mac host stays completely clean — no Node.js, no Postgres, no global npm packages.
        Every runtime lives inside disposable VMs that can be destroyed and rebuilt in minutes.
      </p>
    `,
  },

  // ── Step 1: Install Vagrant ───────────────────────────────────────────────

  {
    type: 'commands',
    section: 'vagrant',
    sectionTitle: 'Install Vagrant',
    items: [
      {
        id: 1,
        commandTitle: 'Install Vagrant via Homebrew (HashiCorp tap)',
        command: 'brew tap hashicorp/tap && brew install hashicorp/tap/hashicorp-vagrant',
        searchTerms: 'brew tap hashicorp vagrant install macos homebrew arm64 m1 apple silicon',
        description: 'Adds the official HashiCorp Homebrew tap, then installs Vagrant directly from it. The tap ensures you get the canonical HashiCorp-maintained formula rather than the community-maintained cask — important for getting the latest release with full Apple Silicon support.',
        parts: [
          { text: 'brew tap hashicorp/tap', explanation: "registers HashiCorp's official Homebrew tap — a third-party formula repository hosted at github.com/hashicorp/homebrew-tap — so Homebrew knows where to find HashiCorp's own packages" },
          { text: 'brew install hashicorp/tap/hashicorp-vagrant', explanation: "installs Vagrant from the HashiCorp tap specifically, not from Homebrew's default formula index — the fully qualified path avoids any name collision with the older community cask" },
        ],
        example: "==> Tapping hashicorp/tap\nCloning into '/opt/homebrew/Library/Taps/hashicorp/homebrew-tap'...\n==> Fetching hashicorp/tap/hashicorp-vagrant\n==> Installing hashicorp/tap/hashicorp-vagrant\n🍺  /opt/homebrew/Caskroom/hashicorp-vagrant/2.4.3: 3 files, 154MB",
        why: "HashiCorp moved their official Homebrew distribution to their own tap. Using the tap formula guarantees you track HashiCorp's release cadence directly — same binary as the official .dmg installer, with Homebrew handling PATH registration and future upgrades via 'brew upgrade'.",
      },
    ],
  },

  // ── Step 2: Parallels Plugin ──────────────────────────────────────────────

  {
    type: 'note',
    variant: 'warning',
    content: '<strong>Parallels Pro or Business required.</strong> The <code>vagrant-parallels</code> plugin communicates with Parallels through its automation API, which is only available in Pro and Business editions. The Standard edition will install the plugin but fail silently when you run <code>vagrant up</code>.',
  },

  {
    type: 'commands',
    section: 'plugin',
    sectionTitle: 'Install the Parallels Plugin',
    items: [
      {
        id: 101,
        commandTitle: 'Install vagrant-parallels plugin',
        command: 'vagrant plugin install vagrant-parallels',
        searchTerms: 'vagrant plugin install parallels provider arm64 m1 apple silicon',
        description: 'Installs the <code>vagrant-parallels</code> plugin, which acts as the bridge between Vagrant and Parallels Desktop. Without it, Vagrant has no idea Parallels exists.',
        parts: [
          { text: 'vagrant plugin install', explanation: "downloads and installs a Vagrant plugin from RubyGems into Vagrant's internal plugin directory" },
          { text: 'vagrant-parallels', explanation: "the community-maintained provider plugin — registers 'parallels' as a valid --provider value" },
        ],
        example: "Installing the 'vagrant-parallels' plugin. This can take a few minutes...\nInstalled the plugin 'vagrant-parallels (2.4.0)'!",
        why: "Vagrant's default providers are VirtualBox and VMware. On Apple Silicon, VirtualBox does not run at all — Parallels is the native hypervisor. The plugin is the only thing that makes vagrant up --provider parallels work.",
      },
    ],
  },

  // ── Step 3: Initialise a Project ─────────────────────────────────────────

  {
    type: 'note',
    variant: 'tip',
    content: 'Always use an <strong>ARM64 box</strong> on Apple Silicon. An x86_64 box either refuses to run or crawls through emulation. The <code>bento/ubuntu-22.04-arm64</code> box by Chef is regularly maintained and well-tested on Parallels — it is the safe default choice.',
  },

  {
    type: 'commands',
    section: 'init',
    sectionTitle: 'Initialize a Project',
    items: [
      {
        id: 201,
        commandTitle: 'Create a project folder and initialize a box',
        command: 'mkdir dev-env && cd dev-env && vagrant init bento/ubuntu-22.04-arm64',
        searchTerms: 'vagrant init bento ubuntu arm64 vagrantfile mkdir project folder',
        description: 'Creates a new project directory, enters it, and generates a <code>Vagrantfile</code> pre-configured to use the <code>bento/ubuntu-22.04-arm64</code> box — a clean, minimal Ubuntu 22.04 image compiled for ARM64.',
        parts: [
          { text: 'mkdir dev-env && cd dev-env', explanation: 'each Vagrant project lives in its own folder — the Vagrantfile and .vagrant/ state directory both go here' },
          { text: 'vagrant init', explanation: 'generates a Vagrantfile in the current directory with the named box as the base image' },
          { text: 'bento/ubuntu-22.04-arm64', explanation: 'the Bento project by Chef — maintained ARM64 images that are regularly updated and well-tested on Parallels' },
        ],
        example: "A `Vagrantfile` has been placed in this directory.\nYou are now ready to `vagrant up --provider parallels`!",
        why: "An x86_64 box on an M1 either refuses to run or runs through an emulation layer at a fraction of native speed. The ARM64 Bento boxes run natively on the Apple Silicon hypervisor — full CPU speed, no translation overhead.",
      },
    ],
  },

  // ── Step 4: Start the VM ─────────────────────────────────────────────────

  {
    type: 'commands',
    section: 'startup',
    sectionTitle: 'Start the VM',
    items: [
      {
        id: 301,
        commandTitle: 'Boot the VM with the Parallels provider',
        command: 'vagrant up --provider parallels',
        searchTerms: 'vagrant up parallels provider start boot download box arm64',
        description: 'Downloads the ARM64 box image if not already cached, creates the Parallels VM, and boots it. On first run this can take a few minutes while the box downloads. Subsequent starts are fast since the box is cached in <code>~/.vagrant.d/boxes/</code>.',
        parts: [
          { text: 'vagrant up', explanation: 'reads the Vagrantfile, creates the VM if it does not exist, and starts it — runs provisioners on first boot' },
          { text: '--provider parallels', explanation: "explicitly selects Parallels as the hypervisor — you can also set VAGRANT_DEFAULT_PROVIDER=parallels in your shell to avoid typing it every time" },
        ],
        example: "Bringing machine 'default' up with 'parallels' provider...\n==> default: Box 'bento/ubuntu-22.04-arm64' not found. Installing now...\n==> default: Booting VM...\n==> default: Machine booted and ready!",
        why: "Without --provider parallels, Vagrant defaults to VirtualBox and immediately errors on Apple Silicon. Setting the provider explicitly (or via the environment variable) eliminates this footgun.",
      },
      {
        id: 302,
        commandTitle: 'SSH into the running VM',
        command: 'vagrant ssh',
        searchTerms: 'vagrant ssh shell login terminal vm connect',
        description: 'Opens an interactive SSH session into the running VM. Vagrant manages the key pair automatically — no passwords, no manual key setup. You land as the <code>vagrant</code> user with passwordless <code>sudo</code>.',
        parts: [
          { text: 'vagrant ssh', explanation: "reads the VM's SSH config from .vagrant/machines/default/ and opens a session — works from any subdirectory of the project folder" },
        ],
        example: "Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-91-generic aarch64)\nvagrant@ubuntu-22-04-arm64:~$",
        why: "Notice 'aarch64' in the kernel banner — that confirms you are running a real ARM64 kernel, not emulation. This matters for Node.js native add-ons and any compiled dependency.",
      },
    ],
  },

  // ── Step 5: Configure the Vagrantfile ────────────────────────────────────

  {
    type: 'note',
    variant: 'info',
    content: 'The three settings below — synced folders, port forwarding, and resource allocation — are the core of the "clean Mac host" philosophy. Your source code stays on the Mac (version-controlled, editable in any IDE); all runtimes and services live inside the VM.',
  },

  {
    type: 'commands',
    section: 'config',
    sectionTitle: 'Configure the Vagrantfile',
    items: [
      {
        id: 401,
        commandTitle: 'Sync your project folder into the VM',
        command: 'config.vm.synced_folder ".", "/var/www/project"',
        searchTerms: 'vagrant synced_folder shared folder code mac linux vm sync edit',
        description: 'Adds a synced folder declaration to the Vagrantfile. The <code>.</code> refers to the folder where the Vagrantfile lives (your Mac project root). <code>/var/www/project</code> is where it appears inside the VM. Edit files in VS Code on your Mac — they are instantly available inside the Linux VM without any copying.',
        parts: [
          { text: '"."', explanation: "the host path — relative to the Vagrantfile, so '.' means the project root on your Mac" },
          { text: '"/var/www/project"', explanation: 'the guest path — where the folder is mounted inside the Ubuntu VM' },
          { text: 'config.vm.synced_folder', explanation: "Vagrant's built-in sync mechanism — uses NFS, SMB, or rsync depending on the provider; Parallels uses Parallels Tools (HGFS)" },
        ],
        example: "# In your Vagrantfile:\nVagrant.configure('2') do |config|\n  config.vm.box = 'bento/ubuntu-22.04-arm64'\n  config.vm.synced_folder '.', '/var/www/project'\nend\n\n# Inside the VM after vagrant reload:\n$ ls /var/www/project\npackage.json  src/  node_modules/",
        why: "This is the core of the 'clean Mac host' philosophy — your source code lives on the Mac (backed up by Time Machine, editable in any IDE), but Node.js, npm, and all runtimes are installed only inside the throwaway VM.",
      },
      {
        id: 402,
        commandTitle: 'Forward guest ports to the Mac',
        command: 'config.vm.network "forwarded_port", guest: 3000, host: 3000\nconfig.vm.network "forwarded_port", guest: 5432, host: 5432',
        searchTerms: 'vagrant forwarded_port port forward network guest host 3000 5432 node postgres',
        description: 'Maps ports from inside the VM to your Mac\'s localhost. Your Express app listening on port 3000 inside the VM becomes reachable at <code>http://localhost:3000</code> on your Mac. Same for PostgreSQL on 5432 — connect with any GUI like TablePlus without changing the host.',
        parts: [
          { text: 'guest: 3000, host: 3000', explanation: "traffic arriving at localhost:3000 on your Mac is tunnelled to port 3000 inside the VM — where your Node.js/Express app listens" },
          { text: 'guest: 5432, host: 5432', explanation: "maps the PostgreSQL default port — lets you connect from Mac-side tools like psql, TablePlus, or DataGrip directly to the VM's Postgres" },
        ],
        example: "# After vagrant reload:\n# On your Mac:\n$ curl http://localhost:3000/api/health\n{\"status\":\"ok\"}\n\n$ psql -h localhost -U appuser -d appdb\npsql (16.3)\nType 'help' for help.\nappdb=#",
        why: "Port forwarding means your Mac browser and database tools work against the VM exactly as they would against a remote server — no special network config, no VPN, no IP address to remember.",
      },
      {
        id: 403,
        commandTitle: 'Allocate RAM and CPU cores to the VM',
        command: 'config.vm.provider "parallels" do |prl|\n  prl.memory = 8192\n  prl.cpus = 4\nend',
        searchTerms: 'vagrant parallels provider memory ram cpu cores performance config',
        description: 'Tells the Parallels provider how many resources to give the VM. With 32 GB of unified memory on an M1, allocating 8 GB to the VM leaves the Mac comfortable while giving the VM enough headroom to run Node.js, PostgreSQL, and any build tooling concurrently.',
        parts: [
          { text: 'config.vm.provider "parallels" do |prl|', explanation: 'opens a provider-specific config block — settings here only apply when using the Parallels provider' },
          { text: 'prl.memory = 8192', explanation: "sets the VM's RAM to 8 GB (in MB) — increase to 16384 for heavier workloads like running tests in parallel" },
          { text: 'prl.cpus = 4', explanation: "gives the VM 4 CPU cores — the M1's performance cores are fast enough that 4 vCPUs handle most dev workloads well" },
        ],
        example: "# Full provider block in context:\nconfig.vm.provider 'parallels' do |prl|\n  prl.memory = 8192\n  prl.cpus   = 4\n  prl.name   = 'dev-env'  # shown in Parallels Desktop UI\nend",
        why: "Vagrant defaults are conservative (1 GB RAM, 1 CPU). For running a Node.js app, PostgreSQL, and npm install simultaneously you need real resources. Apple Silicon's memory architecture means sharing 8 GB with the VM has almost no impact on Mac-side responsiveness.",
      },
      {
        id: 404,
        commandTitle: 'Provision Node.js and PostgreSQL automatically',
        command: 'config.vm.provision "shell", inline: <<-SHELL\n  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -\n  apt-get install -y nodejs postgresql postgresql-contrib\n  sudo -u postgres psql -c "CREATE USER appuser WITH PASSWORD \'secret\';"\n  sudo -u postgres psql -c "CREATE DATABASE appdb OWNER appuser;"\nSHELL',
        searchTerms: 'vagrant provision shell nodejs postgresql apt-get inline script setup',
        description: 'Adds an inline shell provisioner that runs once on first <code>vagrant up</code>. It installs Node.js 18 LTS via the NodeSource repo and PostgreSQL, then creates the application database user and database — so the VM is fully ready with no manual steps.',
        parts: [
          { text: 'config.vm.provision "shell"', explanation: "runs the given shell script as root inside the VM — only executes on the first 'vagrant up', or when you run 'vagrant provision' explicitly" },
          { text: 'curl … | bash -', explanation: 'adds the NodeSource APT repository for Node.js 18 LTS — same pattern as on a real Ubuntu server' },
          { text: 'apt-get install -y nodejs postgresql', explanation: 'installs both runtimes in one pass — no interactive prompts (-y confirms everything)' },
          { text: 'sudo -u postgres psql -c', explanation: "runs SQL as the postgres superuser to create the app's database role and database" },
        ],
        example: "==> default: Running provisioner: shell...\n==> default: Installing Node.js 18...\n==> default: Setting up postgresql...\n==> default: CREATE ROLE\n==> default: CREATE DATABASE\n\n# Inside the VM after provisioning:\n$ node --version\nv18.20.4\n$ psql -U appuser -d appdb -c 'SELECT NOW();'\n           now\n------------------------\n 2024-11-15 10:30:00+00",
        why: "Provisioning makes the VM self-documenting and reproducible. A new team member runs 'vagrant up' and gets an identical environment in minutes — no README steps, no 'works on my machine' problems, no leftover global packages on the host.",
      },
    ],
  },

  // ── Step 6 & 7: Two-VM Architecture ──────────────────────────────────────

  {
    type: 'prose',
    title: 'Two-VM architecture: app-web + app-db',
    content: `
      <p>
        The next two sections configure two separate VMs instead of one. This mirrors a realistic
        staging or production topology and gives you practical benefits during development:
      </p>
      <ul>
        <li><strong>Independent lifecycle</strong> — suspend or destroy the database VM without
            touching the web VM and vice versa.</li>
        <li><strong>Real network separation</strong> — the VMs communicate over a Vagrant private
            network (<code>192.168.56.x</code>), so you test the actual connection string your
            app will use in production.</li>
        <li><strong>Honest resource profiling</strong> — you see the true memory footprint of each
            tier, not a blended number from one overloaded VM.</li>
      </ul>
      <p>
        Both VMs are defined in the same <code>Vagrantfile</code> using
        <code>config.vm.define</code> blocks. <code>vagrant up --provider parallels</code>
        starts both; <code>vagrant ssh app-web</code> or <code>vagrant ssh app-db</code>
        targets each individually.
      </p>
    `,
  },

  // ── Step 6: Web Server Setup ──────────────────────────────────────────────

  {
    type: 'commands',
    section: 'app-web',
    sectionTitle: 'Web Server Setup (app-web)',
    items: [
      {
        id: 501,
        commandTitle: 'Set hostname to app-web',
        command: 'sudo hostnamectl set-hostname app-web',
        searchTerms: 'hostname hostnamectl set rename machine app-web web server',
        description: 'Permanently changes the VM\'s hostname to <code>app-web</code>, identifying it as the web/application server. The change takes effect on next login.',
        parts: [
          { text: 'sudo', explanation: 'run as superuser — hostname changes require root' },
          { text: 'hostnamectl', explanation: 'systemd tool to query and change the system hostname' },
          { text: 'set-hostname', explanation: 'sub-command that writes the new name to /etc/hostname and updates the running system' },
          { text: 'app-web', explanation: 'the new hostname — makes it immediately clear which VM you\'re on when you have multiple terminals open' },
        ],
        example: "# No output on success — re-login to see the updated prompt:\nvagrant@app-web:~$",
        why: "When SSHing into multiple VMs simultaneously, a meaningful hostname in the shell prompt prevents you from running commands on the wrong machine.",
      },
      {
        id: 502,
        commandTitle: 'Install Node.js and Git',
        command: 'curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash - && sudo apt-get install -y nodejs git',
        searchTerms: 'nodejs node npm git install apt nodesource web server ubuntu',
        description: 'Adds the NodeSource repository for Node.js 18 LTS, then installs the <code>nodejs</code> package (which includes <code>npm</code>) and <code>git</code> for cloning the project repository.',
        parts: [
          { text: 'curl -fsSL … | sudo bash -', explanation: 'downloads and executes the NodeSource setup script, which registers the Node.js 18 apt repo — the version in Ubuntu\'s default repos is too old' },
          { text: 'sudo apt-get install -y nodejs', explanation: 'installs Node.js and npm from the newly added NodeSource repo' },
          { text: 'git', explanation: 'version control tool — used to clone the project repository into the VM' },
        ],
        example: "Fetching Node.js 18 LTS...\nSetting up nodejs (18.20.4-1nodesource1) ...\n$ node --version\nv18.20.4\n$ npm --version\n10.7.0",
        why: "Node.js 18 LTS is the current long-term support release. Installing via NodeSource guarantees you get the upstream version with full ARM64 support, not the outdated package in Ubuntu's default repos.",
      },
      {
        id: 503,
        commandTitle: 'Clone the project repository',
        command: 'git clone https://github.com/your-org/dev-env /var/www/project',
        searchTerms: 'git clone github project repo clone var www',
        description: 'Clones the application repository from GitHub directly into <code>/var/www/project</code> — the same path the Vagrantfile\'s synced folder maps to. If you\'re using the synced folder approach, this step is skipped; cloning is the alternative for CI or environments without a host mount.',
        parts: [
          { text: 'git clone', explanation: 'creates a full local copy of the remote repository including its full history' },
          { text: 'https://github.com/your-org/dev-env', explanation: 'the remote repository URL — replace with your actual project repo' },
          { text: '/var/www/project', explanation: 'destination path inside the VM — matches the synced_folder guest path so tools find files in the same location either way' },
        ],
        example: "Cloning into '/var/www/project'...\nremote: Counting objects: 142, done.\nReceiving objects: 100% (142/142), done.\n$ ls /var/www/project\npackage.json  src/  README.md",
        why: "Keeping the clone target consistent with the synced folder path means the app config, scripts, and systemd service file all reference the same location regardless of how the code got there.",
      },
      {
        id: 504,
        commandTitle: 'Install app dependencies and create systemd service',
        command: 'cd /var/www/project && npm install && sudo cp app-web.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable app-web && sudo systemctl start app-web',
        searchTerms: 'npm install systemctl enable start node service systemd daemon app-web',
        description: 'Installs the project\'s npm dependencies, registers the Node.js app as a systemd service so it starts on boot, reloads the daemon to pick up the new unit file, then enables and starts the service immediately.',
        parts: [
          { text: 'npm install', explanation: 'reads package.json and downloads all declared dependencies into node_modules/' },
          { text: 'sudo cp app-web.service /etc/systemd/system/', explanation: 'places the systemd unit file where systemd can find it — the file lives in the repo so it\'s version-controlled' },
          { text: 'sudo systemctl daemon-reload', explanation: 'tells systemd to re-scan unit files after adding or modifying one — required before enable/start will recognise the new service' },
          { text: 'sudo systemctl enable app-web', explanation: 'creates a symlink so systemd starts the Node.js app automatically on every boot' },
          { text: 'sudo systemctl start app-web', explanation: 'starts the service immediately without requiring a reboot' },
        ],
        example: "added 97 packages in 4.2s\nCreated symlink /etc/systemd/system/multi-user.target.wants/app-web.service\n\n$ sudo systemctl status app-web\n● app-web.service - Node.js Web Application\n   Active: active (running) since ...",
        why: "Running the app as a systemd service gives you automatic restarts on crash, boot-time startup, and standard log integration via journald — without a third-party process manager like pm2.",
      },
      {
        id: 505,
        commandTitle: 'Verify the app is reachable from your Mac',
        command: 'curl http://localhost:3000/api/health',
        searchTerms: 'curl localhost 3000 test verify node express api health check port forward',
        description: 'Runs this command <strong>on your Mac</strong> (not inside the VM). Thanks to port forwarding in the Vagrantfile, traffic to <code>localhost:3000</code> on your Mac is transparently tunnelled to port 3000 inside <code>app-web</code>.',
        parts: [
          { text: 'curl', explanation: 'command-line HTTP client — available by default on macOS' },
          { text: 'http://localhost:3000/api/health', explanation: "hits the health-check endpoint on your Mac's loopback interface — Vagrant's port forward delivers it to the VM's Express server" },
        ],
        example: "# Run on your Mac:\n$ curl http://localhost:3000/api/health\n{\"status\":\"ok\",\"db\":\"connected\"}\n\n# Or open in your Mac browser:\n# http://localhost:3000",
        why: "This is the payoff of port forwarding — your Mac browser and API clients talk to the Linux VM as if it were running locally. No IP address, no VPN, no network config to remember.",
      },
    ],
  },

  // ── Step 7: Database Server Setup ────────────────────────────────────────

  {
    type: 'commands',
    section: 'app-db',
    sectionTitle: 'Database Server Setup (app-db)',
    items: [
      {
        id: 601,
        commandTitle: 'Set hostname to app-db',
        command: 'sudo hostnamectl set-hostname app-db',
        searchTerms: 'hostname hostnamectl set rename machine app-db database server',
        description: 'Permanently renames this VM to <code>app-db</code>, identifying it as the dedicated database server.',
        parts: [
          { text: 'sudo hostnamectl set-hostname', explanation: 'systemd command to change the system hostname persistently — writes to /etc/hostname' },
          { text: 'app-db', explanation: 'the new hostname — pairs with app-web to make the two-VM architecture immediately obvious from the shell prompt' },
        ],
        example: "# Re-login to see the updated prompt:\nvagrant@app-db:~$",
        why: "With two VMs running in parallel, a clear hostname in the prompt is the first line of defence against running a destructive command on the wrong machine.",
      },
      {
        id: 602,
        commandTitle: 'Install PostgreSQL server and client',
        command: 'sudo apt-get install -y postgresql postgresql-contrib',
        searchTerms: 'postgresql postgres install apt-get database server client ubuntu',
        description: 'Installs the PostgreSQL server daemon and its companion <code>postgresql-contrib</code> package, which adds commonly used extensions like <code>uuid-ossp</code>, <code>pg_stat_statements</code>, and <code>hstore</code>.',
        parts: [
          { text: 'sudo apt-get install -y', explanation: 'installs packages non-interactively — -y confirms all prompts automatically' },
          { text: 'postgresql', explanation: "the PostgreSQL server daemon — Ubuntu's apt repo ships the current stable release" },
          { text: 'postgresql-contrib', explanation: 'additional extensions and utilities that ship separately from the core — required for uuid-ossp and other commonly used modules' },
        ],
        example: "Setting up postgresql (16+246) ...\nCreating new PostgreSQL cluster 16/main ...\n\n$ psql --version\npsql (PostgreSQL) 16.3",
        why: "Unlike CentOS/RHEL, Ubuntu's apt repos ship a reasonably current PostgreSQL version with ARM64 support out of the box — no third-party repo needed.",
      },
      {
        id: 603,
        commandTitle: 'Create database user and database',
        command: "sudo -u postgres psql -c \"CREATE USER appuser WITH PASSWORD 'secret';\" && sudo -u postgres psql -c \"CREATE DATABASE appdb OWNER appuser;\"",
        searchTerms: 'postgres psql create user database role password owner appuser appdb',
        description: 'Connects to PostgreSQL as the <code>postgres</code> superuser and runs two SQL statements: one to create a dedicated application role with a password, and one to create the application database owned by that role.',
        parts: [
          { text: 'sudo -u postgres', explanation: 'runs the following command as the postgres OS user — the default superuser account created during installation' },
          { text: 'psql -c "…"', explanation: 'executes a single SQL statement and exits — no interactive shell needed' },
          { text: "CREATE USER appuser WITH PASSWORD 'secret'", explanation: "creates the PostgreSQL role the Node.js app will use to authenticate — never use the postgres superuser from application code" },
          { text: 'CREATE DATABASE appdb OWNER appuser', explanation: 'creates the application database and gives full ownership to appuser — scopes all permissions to this database only' },
        ],
        example: "CREATE ROLE\nCREATE DATABASE\n\n# Verify:\n$ sudo -u postgres psql -c '\\l'\n   Name    |  Owner\n-----------+----------\n appdb     | appuser",
        why: "Applications should never connect as the postgres superuser. A dedicated role with only the permissions it needs limits the blast radius of a compromised connection string — standard security practice.",
      },
      {
        id: 604,
        commandTitle: 'Allow remote connections in pg_hba.conf',
        command: "sudo bash -c \"echo 'host  appdb  appuser  0.0.0.0/0  md5' >> /etc/postgresql/16/main/pg_hba.conf\" && sudo systemctl reload postgresql",
        searchTerms: 'pg_hba.conf postgres remote connection md5 host authentication allow',
        description: 'Appends a host-based authentication rule to <code>pg_hba.conf</code> that allows <code>appuser</code> to connect to <code>appdb</code> from any IP using a password, then reloads PostgreSQL to apply the change without a full restart.',
        parts: [
          { text: "echo 'host  appdb  appuser  0.0.0.0/0  md5'", explanation: 'the HBA rule: type (host=TCP), database, user, CIDR range (any IP), auth method (md5 password)' },
          { text: '>> /etc/postgresql/16/main/pg_hba.conf', explanation: "appends the rule — Ubuntu keeps pg_hba.conf here, unlike RHEL's /var/lib/pgsql path" },
          { text: 'sudo systemctl reload postgresql', explanation: 'sends SIGHUP to the postgres process, causing it to re-read pg_hba.conf without dropping active connections' },
        ],
        example: "# Verify the rule was added:\n$ sudo tail -3 /etc/postgresql/16/main/pg_hba.conf\nhost  appdb  appuser  0.0.0.0/0  md5\n\n# Test from app-web VM:\n$ psql -h <app-db-ip> -U appuser -d appdb\nappdb=>",
        why: "PostgreSQL rejects all remote connections by default. pg_hba.conf is the access control list that decides who can connect, from where, and how they must authenticate — the firewall of the database layer.",
      },
      {
        id: 605,
        commandTitle: 'Run the database setup script',
        command: 'psql -U appuser -d appdb -f db_setup.sql',
        searchTerms: 'psql run script sql file database setup schema seed postgres',
        description: 'Connects to <code>appdb</code> as <code>appuser</code> and executes the SQL setup script, creating the schema, tables, indexes, and any seed data the application needs to start.',
        parts: [
          { text: 'psql', explanation: 'PostgreSQL interactive terminal — used here in batch mode' },
          { text: '-U appuser', explanation: 'connect as the application role — tests the same credentials the Node.js app will use' },
          { text: '-d appdb', explanation: 'the target database to connect to' },
          { text: '-f db_setup.sql', explanation: 'reads and executes SQL from this file in one pass — the standard way to run repeatable schema migrations' },
        ],
        example: "CREATE TABLE\nCREATE INDEX\nINSERT 0 5\n\n# Verify:\n$ psql -U appuser -d appdb -c '\\dt'\n        List of relations\n Schema |   Name   | Type\n--------+----------+-------\n public | users    | table\n public | sessions | table",
        why: "Using -f to feed a file is the standard way to execute a batch of SQL statements repeatably — the same script can be re-run in CI or against a fresh database with identical results.",
      },
    ],
  },

  // ── Step 8: Day-to-Day Commands ───────────────────────────────────────────

  {
    type: 'commands',
    section: 'daily',
    sectionTitle: 'Day-to-Day Commands',
    items: [
      {
        id: 701,
        commandTitle: 'Reload the VM after Vagrantfile changes',
        command: 'vagrant reload',
        searchTerms: 'vagrant reload restart apply vagrantfile changes config port sync',
        description: 'Gracefully restarts the VM and re-applies the Vagrantfile — picks up new port forwards, synced folder changes, and resource config without destroying the VM or its installed packages.',
        parts: [
          { text: 'vagrant reload', explanation: "equivalent to vagrant halt followed by vagrant up — preserves the VM's disk state and everything installed inside it" },
        ],
        example: "==> default: Attempting graceful shutdown of VM...\n==> default: Booting VM...\n==> default: Forwarding ports...\n    default: 3000 (guest) => 3000 (host)\n    default: 5432 (guest) => 5432 (host)\n==> default: Machine booted and ready!",
        why: "Use reload any time you change port forwarding, memory allocation, or synced folder config. It is faster than destroy + up and keeps everything you installed inside the VM intact.",
      },
      {
        id: 702,
        commandTitle: 'Suspend and resume the VM',
        command: 'vagrant suspend && vagrant resume',
        searchTerms: 'vagrant suspend resume sleep save state fast pause',
        description: "Suspending saves the VM's entire RAM state to disk — like closing a laptop lid. Resuming restores it in seconds, with every process still running exactly where it left off. Much faster than a full halt + up cycle.",
        parts: [
          { text: 'vagrant suspend', explanation: "saves the VM state to disk and pauses it — Parallels Desktop calls this 'save state'" },
          { text: 'vagrant resume', explanation: 'restores the VM from the saved state — processes, open files, and network connections pick up where they left off' },
        ],
        example: "$ vagrant suspend\n==> default: Saving VM state and suspending execution...\n\n# ... do other things, even reboot your Mac ...\n\n$ vagrant resume\n==> default: Resuming suspended VM...\n==> default: Machine booted and ready!",
        why: "Suspend is the daily workflow command. Start your dev session with 'vagrant resume', end it with 'vagrant suspend'. The VM stays warm between sessions without consuming CPU or significant battery when idle.",
      },
      {
        id: 703,
        commandTitle: 'Check VM status',
        command: 'vagrant status && vagrant global-status',
        searchTerms: 'vagrant status global running stopped saved machines list all',
        description: '<code>vagrant status</code> shows the state of the VM in the current project folder. <code>vagrant global-status</code> lists every Vagrant-managed VM on your machine across all project directories.',
        parts: [
          { text: 'vagrant status', explanation: "reads the .vagrant/ directory in the current folder and reports that VM's state" },
          { text: 'vagrant global-status', explanation: "queries Vagrant's global index (~/.vagrant.d/data/machine-index/) — shows all VMs regardless of current directory" },
        ],
        example: "$ vagrant status\nCurrent machine states:\napp-web                   running (parallels)\napp-db                    saved (parallels)\n\n$ vagrant global-status\nid       name     provider    state    directory\n-----------------------------------------------------------\na1b2c3d  app-web  parallels   running  /Users/you/dev-env\ne4f5a6b  app-db   parallels   saved    /Users/you/dev-env",
        why: "global-status is the answer to 'which VMs are eating my RAM right now?' — especially useful when you have a suspended VM from last week and wonder why your Mac is sluggish.",
      },
      {
        id: 704,
        commandTitle: 'Destroy the VM completely',
        command: 'vagrant destroy --force',
        searchTerms: 'vagrant destroy force delete remove vm disk clean reset',
        description: 'Stops and permanently deletes the VM and its virtual disk. The Vagrantfile is untouched — run <code>vagrant up --provider parallels</code> again to get a brand-new identical VM. The box image stays cached so the next boot is fast.',
        parts: [
          { text: 'vagrant destroy', explanation: "deletes the VM's virtual disk and removes it from Parallels — reclaims disk space immediately" },
          { text: '--force', explanation: "skips the 'Are you sure?' confirmation prompt — useful in scripts" },
        ],
        example: "==> app-web: Stopping the machine...\n==> app-web: Deleting the machine...\n==> app-db: Stopping the machine...\n==> app-db: Deleting the machine...\n\n# Start fresh:\n$ vagrant up --provider parallels\n==> app-web: Machine booted and ready!\n==> app-db: Machine booted and ready!",
        why: "Destroy is the nuclear reset button. If a VM gets into a bad state, destroy + up gives you a provably clean environment in minutes. This is the power of treating infrastructure as disposable code rather than a precious snowflake.",
      },
    ],
  },

  // ── Step 9: Complete Vagrantfile ─────────────────────────────────────────

  {
    type: 'note',
    variant: 'tip',
    content: 'The command below shows the complete <code>Vagrantfile</code> that encodes everything from this module. Commit it to your repo — it is the single source of truth for the entire dev environment.',
  },

  {
    type: 'commands',
    section: 'vagrantfile',
    sectionTitle: 'Complete Vagrantfile',
    items: [
      {
        id: 801,
        commandTitle: 'Full two-VM Vagrantfile: app-web + app-db on M1',
        command: 'cat Vagrantfile',
        searchTerms: 'vagrantfile complete full example node postgres m1 arm64 parallels synced port provision two vm multi machine app-web app-db',
        description: 'The complete Vagrantfile that ties together everything from this module. It defines <strong>two named machines</strong> — <code>app-web</code> (Node.js) and <code>app-db</code> (PostgreSQL) — each with their own hostname, resources, port forwarding, and inline provisioner. One <code>vagrant up --provider parallels</code> builds the entire stack from scratch.',
        parts: [
          { text: 'config.vm.define "app-web"', explanation: "declares a named machine — you can target it individually with 'vagrant ssh app-web' or 'vagrant reload app-web'" },
          { text: 'config.vm.define "app-db"', explanation: "declares the second named machine — both spin up together on 'vagrant up' unless you specify a name" },
          { text: 'config.vm.box = "bento/ubuntu-22.04-arm64"', explanation: 'the ARM64 base image — mandatory for native performance on M1/M2, shared by both VMs' },
          { text: 'web.vm.network "private_network"', explanation: 'assigns a static private IP to each VM so they can talk to each other — app-web connects to app-db on this address' },
          { text: 'prl.memory / prl.cpus', explanation: 'resource allocation per VM — web gets more CPU for Node.js, db gets more RAM for Postgres shared_buffers' },
          { text: 'config.vm.provision "shell"', explanation: 'each VM gets its own provisioner block — app-web installs Node.js, app-db installs PostgreSQL and creates the database' },
        ],
        example: "Vagrant.configure('2') do |config|\n\n  config.vm.box = 'bento/ubuntu-22.04-arm64'\n\n  # ── app-web: Node.js application server ──\n  config.vm.define 'app-web' do |web|\n    web.vm.hostname = 'app-web'\n\n    web.vm.provider 'parallels' do |prl|\n      prl.name   = 'app-web'\n      prl.memory = 4096\n      prl.cpus   = 2\n    end\n\n    web.vm.network 'private_network', ip: '192.168.56.10'\n    web.vm.network 'forwarded_port',  guest: 3000, host: 3000\n    web.vm.synced_folder '.', '/var/www/project'\n\n    web.vm.provision 'shell', inline: <<-SHELL\n      hostnamectl set-hostname app-web\n      curl -fsSL https://deb.nodesource.com/setup_18.x | bash -\n      apt-get install -y nodejs git\n      cd /var/www/project && npm install\n      cp app-web.service /etc/systemd/system/\n      systemctl daemon-reload\n      systemctl enable app-web\n      systemctl start app-web\n    SHELL\n  end\n\n  # ── app-db: PostgreSQL database server ──\n  config.vm.define 'app-db' do |db|\n    db.vm.hostname = 'app-db'\n\n    db.vm.provider 'parallels' do |prl|\n      prl.name   = 'app-db'\n      prl.memory = 4096\n      prl.cpus   = 2\n    end\n\n    db.vm.network 'private_network', ip: '192.168.56.20'\n    db.vm.network 'forwarded_port',  guest: 5432, host: 5432\n\n    db.vm.provision 'shell', inline: <<-SHELL\n      hostnamectl set-hostname app-db\n      apt-get update\n      apt-get install -y postgresql postgresql-contrib\n      sudo -u postgres psql -c \"CREATE USER appuser WITH PASSWORD 'secret';\"\n      sudo -u postgres psql -c \"CREATE DATABASE appdb OWNER appuser;\"\n      echo 'host  appdb  appuser  0.0.0.0/0  md5' >> /etc/postgresql/16/main/pg_hba.conf\n      systemctl reload postgresql\n    SHELL\n  end\n\nend",
        why: "This Vagrantfile is the single source of truth for the entire development environment. Commit it to your repo and any developer — on any Mac with Vagrant + Parallels — gets an identical two-VM stack with one command. The Mac host stays completely clean: no Node versions, no global npm packages, no Postgres installation, no port conflicts with other projects.",
      },
    ],
  },

];
