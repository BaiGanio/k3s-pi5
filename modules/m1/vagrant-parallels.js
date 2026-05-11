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
      <p>
        <strong>Why this approach?</strong><br>
        Vagrant provides a declarative, version-controlled interface to VM provisioning: the Vagrantfile is plain Ruby DSL checked into your repo, so any team member — or a fresh machine — can reproduce the exact same environment with vagrant up.<br> Under the hood, Vagrant talks to a provider (here, Parallels) via its plugin API to create, snapshot, and destroy VMs, and to a provisioner (shell scripts, Ansible, etc.) to configure what runs inside them. This separation of concerns means you can swap the provisioner or even the provider without rewriting your environment definition.<br> Running workloads inside isolated VMs also gives you proper process and network namespace separation — something Docker alone does not give you — which matters when you need to simulate a realistic multi-host topology (a web tier talking to a database tier over a private network) without polluting your host OS.
      </p>
      <p>
        <strong>Why not VirtualBox?</strong><br>
        VirtualBox relies on kernel extensions (kexts) to interface with the hypervisor layer. Apple Silicon Macs run on ARM64 and ship with Apple Hypervisor.framework as the sole officially supported virtualization interface.<br> VirtualBox has no production-ready ARM64 port and its kext model is incompatible with the security architecture of macOS on Apple Silicon. In practice this means VirtualBox either refuses to install, crashes on boot, or runs x86 guest images through binary translation at a steep performance penalty — none of which is acceptable for day-to-day development.
      </p>
      <p><strong>Prerequisites</strong></p>
      <ul>
        <li>Parallels Desktop <strong>Pro or Business</strong> edition (Standard does not expose the automation API Vagrant needs)</li>
        <li>~10 GB free disk space for the ARM64 box image and VM disks</li>
      </ul>
      <p>
        The Mac host stays completely clean — no Node.js, no Postgres, no global npm packages.<br>
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
    content: 'Always use an <strong>ARM64 box</strong> on Apple Silicon. An x86_64 box either refuses to run or crawls through emulation. The <code>bento/ubuntu-24.04-arm64</code> box by Chef is regularly maintained and well-tested on Parallels — it is the safe default choice. Check latest supported boxes at <a href="https://portal.cloud.hashicorp.com/vagrant/discover?architectures=arm64&query=ubuntu" target="_blank">HCP Vagrant Registry</a>.</p>',
  },

  {
    type: 'commands',
    section: 'init',
    sectionTitle: 'Initialize a Project',
    items: [
      {
        id: 201,
        commandTitle: 'Create a project folder and initialize a box',
        command: 'mkdir dev-env && cd dev-env && vagrant init bento/ubuntu-24.04-arm64',
        searchTerms: 'vagrant init bento ubuntu arm64 vagrantfile mkdir project folder',
        description: 'Creates a new project directory, enters it, and generates a <code>Vagrantfile</code> pre-configured to use the <code>bento/ubuntu-24.04-arm64</code> box — a clean, minimal Ubuntu 24.04 image compiled for ARM64.',
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
        description: 'Adds the NodeSource repository for Node.js 18 LTS, then installs the <code>nodejs</code> package (which includes <code>npm</code>) and <code>git</code> for cloning the project repository. The <code>npx</code> runner (bundled with npm) will be used to serve the static site without installing a global package.',
        parts: [
          { text: 'curl -fsSL … | sudo bash -', explanation: 'downloads and executes the NodeSource setup script, which registers the Node.js 18 apt repo — the version in Ubuntu\'s default repos is too old' },
          { text: 'sudo apt-get install -y nodejs', explanation: 'installs Node.js and npm from the newly added NodeSource repo' },
          { text: 'git', explanation: 'version control tool — used to clone the js4b project repository from GitHub into the VM' },
        ],
        example: "Fetching Node.js 18 LTS...\nSetting up nodejs (18.20.4-1nodesource1) ...\n$ node --version\nv18.20.4\n$ npm --version\n10.7.0\n$ git --version\ngit version 2.43.0",
        why: "app-web needs Node.js to serve the static site (via npx http-server) and Git to clone the js4b repo. <strong>Skip the Node.js install</strong> if you already provisioned it via ID 404 — but you still need Git.",
      },
      {
        id: 503,
        commandTitle: 'Clone the js4b project from GitHub',
        command: 'git clone https://github.com/BaiGanio/js4b.git /var/www/project',
        searchTerms: 'git clone github js4b project repo bai ganio static html css javascript',
        description: 'Clones the <a href="https://github.com/BaiGanio/js4b" target="_blank">js4b</a> repository — a static HTML/CSS/JS tutorial project — into <code>/var/www/project</code>. The project has no backend dependencies: it\'s pure frontend (Bootstrap-styled pages, API fetch examples, CSS/JS/fonts). This is the standalone app-web demo — static, self-contained, no database required.',
        parts: [
          { text: 'git clone', explanation: 'creates a full local copy of the remote repository including its full history' },
          { text: 'https://github.com/BaiGanio/js4b.git', explanation: 'the js4b project — JavaScript for beginners tutorial with static HTML pages, Bootstrap styling, and free API demos (Rick & Morty, Final Space)' },
          { text: '/var/www/project', explanation: 'destination path inside the VM — matches the synced_folder guest path so files are available at the same location either way' },
        ],
        example: "Cloning into '/var/www/project'...\nremote: Counting objects: 42, done.\nReceiving objects: 100% (42/42), 161.00 KiB, done.\n\n$ ls /var/www/project\ncss/  fonts/  index.html  wtf.html  ...\n\n$ head -5 /var/www/project/index.html\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>",
        why: "js4b is the perfect standalone demo for app-web — it's a real project with actual content (not a synthetic hello-world), requires zero backend, and proves the entire web-serving chain: Git clone → static files → HTTP server → Vagrant port-forward → Mac browser. The database integration comes later, in the complete Vagrantfile.",
      },
      {
        id: 504,
        commandTitle: 'Serve the static site with npx http-server',
        command: 'cd /var/www/project && npx --yes http-server . -p 3000 &',
        searchTerms: 'npx http-server static serve port 3000 foreground background js4b',
        description: 'Uses <code>npx</code> (bundled with npm) to run <code>http-server</code> on-demand — no global install, no <code>package.json</code> needed. The <code>--yes</code> flag auto-approves the one-time download. Serves the js4b static files from the current directory on port 3000, running in the background via <code>&</code>. The js4b project has no backend dependencies, so nothing to install.',
        parts: [
          { text: 'npx', explanation: 'npm package runner — downloads and executes a package without permanently installing it' },
          { text: '--yes', explanation: 'auto-approves the "install http-server?" prompt — required for non-interactive use in scripts or background tasks' },
          { text: 'http-server . -p 3000', explanation: 'starts a lightweight HTTP server serving the current directory on port 3000 — serves index.html by default' },
          { text: '&', explanation: 'sends the process to the background so you can keep using the terminal; use fg to bring it back, Ctrl+C to stop' },
        ],
        example: "npx: installed 48 in 2.3s\nStarting up http-server, serving ./\nAvailable on:\n  http://127.0.0.1:3000\n  http://192.168.56.10:3000\nHit CTRL-C to stop the server\n\n# The js4b site is now live on port 3000",
        why: "npx http-server is the zero-install approach — no package.json, no node_modules, no global package. It downloads http-server on first run (cached for subsequent runs) and serves the static site immediately. This keeps the VM clean while proving the full chain: clone → serve → port-forward → browser.",
      },
      {
        id: 505,
        commandTitle: 'Verify the js4b site from your Mac',
        command: 'curl -s http://localhost:3000/ | head -10',
        searchTerms: 'curl localhost 3000 test verify js4b static html site port forward browser',
        description: 'Runs this command <strong>on your Mac</strong> (not inside the VM). It fetches the js4b homepage through Vagrant\'s port-forward and prints the first 10 lines of HTML — proof that the static site is being served from inside <code>app-web</code>. Or just open <code>http://localhost:3000</code> in your Mac browser to see the full site.',
        parts: [
          { text: 'curl -s http://localhost:3000/', explanation: 'fetches the js4b homepage silently (-s suppresses the progress meter) through Vagrant\'s port-forward from app-web:3000' },
          { text: '| head -10', explanation: 'shows the first 10 lines of the HTML response — enough to confirm the site is being served, without flooding the terminal' },
        ],
        example: "# Run on your Mac:\n$ curl -s http://localhost:3000/ | head -10\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" ...>\n  <title>js4b — JavaScript for beginners</title>\n  ...\n\n# Or open in your Mac browser:\n# http://localhost:3000  → the full js4b site, with Bootstrap styling and API demos",
        why: "This proves the complete standalone chain: Git cloned a real project into the VM, npx served it without installing anything, and Vagrant port-forwarding delivered it to your Mac. No database, no backend, no other VM required. The js4b site even has live API demos (Rick & Morty, Final Space) that work through this same port-forward. The database integration is deferred to the final complete Vagrantfile.",
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
        why: "Unlike CentOS/RHEL, Ubuntu's apt repos ship a reasonably current PostgreSQL version with ARM64 support out of the box — no third-party repo needed. <strong>Skip this</strong> if you already provisioned PostgreSQL via the Vagrantfile in ID 404.",
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
        why: "Applications should never connect as the postgres superuser. A dedicated role with only the permissions it needs limits the blast radius of a compromised connection string — standard security practice. <strong>Skip this</strong> if the provisioner in ID 404 already created the <code>appuser</code> role and <code>appdb</code> database.",
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
        commandTitle: 'Seed the planets database — populate real data',
        command: '# The planets.sql file is in your project repo (lib/files/).\n# Copy it to app-db first (from your Mac):\n#   vagrant upload lib/files/planets.sql /tmp/planets.sql app-db\n# Then run:\npsql -U appuser -d appdb -f /tmp/planets.sql',
        searchTerms: 'psql seed database planets sql insert import table postgres data upload',
        description: 'Copies <code>planets.sql</code> from the host to the app-db VM, then executes it against <code>appdb</code>. The standalone app-db VM doesn\'t have a synced folder, so the file must be transferred first. The script creates the <code>Planet</code> table and inserts all 8 solar system planets — turning an empty database into one with visible, queryable data.',
        parts: [
          { text: 'vagrant upload ... app-db', explanation: 'copies a file from the Mac host to the named VM — the Vagrant equivalent of scp, no IP address needed' },
          { text: 'psql -U appuser', explanation: 'connect as the application role — same credentials the final Node.js API will use' },
          { text: '-d appdb', explanation: 'the target database created two steps ago' },
          { text: '-f /tmp/planets.sql', explanation: 'reads and executes the SQL file in batch mode — creates the Planet table and inserts 8 rows' },
        ],
        example: "DROP TABLE\nCREATE TABLE\nINSERT 0 1\nINSERT 0 1\nINSERT 0 1\nINSERT 0 1\nINSERT 0 1\nINSERT 0 1\nINSERT 0 1\nINSERT 0 1\n\n# 8 rows inserted — the database now has real data to query and display",
        why: "This is the data layer of the final demo. The planets.sql file ships with the project and runs identically every time — destroy the VM, rebuild it, re-run this command, and the data is back. The same file feeds the SPA at the end of the module.",
      },
      {
        id: 606,
        commandTitle: 'View the planets with a formatted query',
        command: 'psql -U appuser -d appdb -c "SELECT PlanetID, Name, MassEarths AS \\"Mass (M⊕)\\", RadiusKm AS \\"Radius (km)\\", DistanceAU AS \\"Distance (AU)\\", CASE WHEN HasRings THEN \'🪐 Yes\' ELSE \'No\' END AS Rings FROM Planet ORDER BY PlanetID;"',
        searchTerms: 'psql select planets formatted query view table data display output',
        description: 'Runs a formatted <code>SELECT</code> query directly against the <code>Planet</code> table, displaying all 8 planets with their mass, radius, distance, and ring status in a clean columnar table. This gives you immediate visibility into the data without needing a GUI or an application — pure <code>psql</code>.',
        parts: [
          { text: 'psql -c "SELECT ..."', explanation: 'executes a single query and prints the result table — no interactive shell needed' },
          { text: 'CASE WHEN HasRings THEN ...', explanation: 'converts the boolean HasRings column into a human-readable "🪐 Yes" / "No" — PostgreSQL evaluates the condition per row' },
          { text: 'AS \\"Mass (M⊕)\\"', explanation: 'aliases the column name with a unit label — the backslash-escaped quotes let you use spaces and symbols in column headers' },
        ],
        example: " planetid |  name   | Mass (M⊕) | Radius (km) | Distance (AU) |  Rings\n----------+---------+-----------+-------------+---------------+--------\n        1 | Mercury |    0.0550 |     2439.70 |        0.3900 | No\n        2 | Venus   |    0.8150 |     6051.80 |        0.7200 | No\n        3 | Earth   |    1.0000 |     6371.00 |        1.0000 | No\n        4 | Mars    |    0.1070 |     3389.50 |        1.5200 | No\n        5 | Jupiter |  317.8000 |    69911.00 |        5.2000 | 🪐 Yes\n        6 | Saturn  |   95.1600 |    58232.00 |        9.5800 | 🪐 Yes\n        7 | Uranus  |   14.5400 |    25362.00 |       19.2200 | 🪐 Yes\n        8 | Neptune |   17.1500 |    24622.00 |       30.0500 | 🪐 Yes\n(8 rows)",
        why: "Data visibility is the missing piece when you only have a database server and no frontend. A formatted psql query gives you instant, readable proof that the data is there, correct, and ready to be consumed by the API. You can also pipe this to less, grep, or CSV for further inspection.",
      },
      {
        id: 607,
        commandTitle: 'Connect a GUI database tool (optional)',
        command: '# On your Mac — connection details:\n# Host: localhost  Port: 5432\n# User: appuser  Password: secret  Database: appdb',
        searchTerms: 'tableplus pgadmin dbeaver gui database client connect localhost port forward mac',
        description: 'Shows the connection parameters for any Mac database GUI. Because the Vagrantfile forwards port 5432 from <code>app-db</code> to your Mac\'s <code>localhost:5432</code>, tools like <strong>TablePlus</strong>, <strong>pgAdmin</strong>, or <strong>DBeaver</strong> can connect directly. Browse tables, run ad-hoc queries, and visually inspect the Planet table — all from your Mac, with zero SSH or network config.',
        parts: [
          { text: 'Host: localhost', explanation: 'Vagrant port-forwarding makes the remote PostgreSQL appear local — no VM IP address needed' },
          { text: 'Port: 5432', explanation: 'the standard PostgreSQL port, forwarded from the app-db VM to your Mac' },
          { text: 'User: appuser / Password: secret', explanation: 'the credentials created in step 603 — the same ones the Node.js API uses' },
        ],
        example: "# In TablePlus on your Mac:\n# 1. Create new connection → PostgreSQL\n# 2. Host: localhost  Port: 5432\n# 3. User: appuser  Password: secret\n# 4. Database: appdb\n# 5. Connect → browse Planet table with 8 rows\n\n# Alternative — use psql from your Mac (if installed):\n$ psql -h localhost -U appuser -d appdb\nappdb=> SELECT * FROM Planet;\nappdb=> \\q",
        why: "A GUI database tool closes the 'I have a database but can't see my data' gap. With port forwarding, any Mac-native database client works as if PostgreSQL were installed locally. This is especially useful during development — you can visually verify schema changes, inspect query results, and debug data issues without SSH-ing into the VM.",
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
        commandTitle: 'Final Vagrantfile: the complete planets stack (app-web + app-db)',
        command: 'cat Vagrantfile',
        searchTerms: 'vagrantfile complete full example node postgres m1 arm64 parallels synced port provision two vm multi machine app-web app-db planets',
        description: 'The complete Vagrantfile that encodes the entire module. It defines two named machines — <code>app-web</code> (Node.js + Express API + SPA) and <code>app-db</code> (PostgreSQL + seeded planets data). One <code>vagrant up --provider parallels</code> provisions both VMs from scratch. After boot, a single <code>node server.js</code> on app-web and the full stack is live. This is where the standalone demos converge into a working end-to-end application.',
        parts: [
          { text: 'config.vm.define "app-web"', explanation: "declares a named machine — provisions Node.js, creates the Express API with pg pool, and writes the SPA frontend" },
          { text: 'config.vm.define "app-db"', explanation: "declares the second named machine — provisions PostgreSQL, creates the app role and database, seeds the Planet table with 8 rows" },
          { text: 'config.vm.box = "bento/ubuntu-22.04-arm64"', explanation: 'the ARM64 base image — mandatory for native performance on M1/M2, shared by both VMs' },
          { text: 'web.vm.network "private_network"', explanation: 'assigns static private IPs — app-web (192.168.56.10) talks to app-db (192.168.56.20) over this isolated network' },
          { text: 'prl.memory / prl.cpus', explanation: 'resource allocation per VM — 4 GB RAM, 2 CPUs each, tuned for ARM64 macOS hosts' },
          { text: 'config.vm.provision "shell"', explanation: 'each VM gets a self-contained provisioner — app-web installs Node.js + writes the API, app-db installs PostgreSQL + seeds the planets' },
        ],
        example: "Vagrant.configure('2') do |config|\n\n  config.vm.box = 'bento/ubuntu-22.04-arm64'\n\n  # ── app-web: Node.js API + planets SPA ──\n  config.vm.define 'app-web' do |web|\n    web.vm.hostname = 'app-web'\n\n    web.vm.provider 'parallels' do |prl|\n      prl.name   = 'app-web'\n      prl.memory = 4096\n      prl.cpus   = 2\n    end\n\n    web.vm.network 'private_network', ip: '192.168.56.10'\n    web.vm.network 'forwarded_port',  guest: 3000, host: 3000\n    web.vm.synced_folder '.', '/var/www/project'\n\n    web.vm.provision 'shell', inline: <<-SHELL\n      hostnamectl set-hostname app-web\n      curl -fsSL https://deb.nodesource.com/setup_18.x | bash -\n      apt-get install -y nodejs\n      cd /var/www/project && npm init -y && npm install express pg\n      # Server file (API + static SPA) created in the synced folder —\n      # see the Planets Demo section below for the full source.\n    SHELL\n  end\n\n  # ── app-db: PostgreSQL + seeded planets data ──\n  config.vm.define 'app-db' do |db|\n    db.vm.hostname = 'app-db'\n\n    db.vm.provider 'parallels' do |prl|\n      prl.name   = 'app-db'\n      prl.memory = 4096\n      prl.cpus   = 2\n    end\n\n    db.vm.network 'private_network', ip: '192.168.56.20'\n    db.vm.network 'forwarded_port',  guest: 5432, host: 5432\n    db.vm.synced_folder '.', '/var/www/project'\n\n    db.vm.provision 'shell', inline: <<-SHELL\n      hostnamectl set-hostname app-db\n      apt-get update\n      apt-get install -y postgresql postgresql-contrib\n      sudo -u postgres psql -c \"CREATE USER appuser WITH PASSWORD 'secret';\"\n      sudo -u postgres psql -c \"CREATE DATABASE appdb OWNER appuser;\"\n      echo 'host  appdb  appuser  0.0.0.0/0  md5' >> /etc/postgresql/16/main/pg_hba.conf\n      systemctl reload postgresql\n      # Seed planets data (idempotent — safe to re-run on reprovision)\n      sudo -u postgres psql -d appdb -f /var/www/project/lib/files/planets.sql\n    SHELL\n  end\n\nend\n\n# After vagrant up completes, SSH into app-web and start the server:\n# $ vagrant ssh app-web\n# $ cd /var/www/project && node server.js &\n# $ curl http://localhost:3000/api/planets   # from your Mac",
        why: "This Vagrantfile is where the standalone demos converge. app-web started as a 15-line Hello World Express app — now it provisions a full API server with pg connection pooling. app-db started as an empty PostgreSQL instance — now it seeds 8 planets on first boot. One 'vagrant up --provider parallels' and both VMs are ready. Create the server.js and index.html (see the Planets Demo section below), start the server, and the full stack is live at http://localhost:3000. The Mac host stays completely clean throughout — no Node versions, no global npm packages, no Postgres installation, no port conflicts with other projects.",
      },
    ],
  },

  // ── T-SQL vs PostgreSQL Note ──────────────────────────────────────────────

  {
    type: 'note',
    variant: 'info',
    content: '<strong>T-SQL (SQL Server) vs PostgreSQL.</strong> The <code>planets.sql</code> file bundled with this project was originally written for Microsoft SQL Server — T-SQL syntax with <code>BIT</code>, <code>GO</code> separators, and <code>master.dbo.sysdatabases</code> checks. Five straightforward changes make it PostgreSQL-compatible:<br><br><table style="font-size:0.9rem;"><tr><th style="padding:4px 12px;text-align:left;">SQL Server (T-SQL)</th><th style="padding:4px 12px;text-align:left;">PostgreSQL</th><th style="padding:4px 12px;text-align:left;">Why</th></tr><tr><td style="padding:4px 12px;"><code>BIT</code></td><td style="padding:4px 12px;"><code>BOOLEAN</code></td><td style="padding:4px 12px;">PostgreSQL has a native boolean type; <code>TRUE</code>/<code>FALSE</code> instead of 1/0</td></tr><tr><td style="padding:4px 12px;"><code>GO</code></td><td style="padding:4px 12px;">(removed)</td><td style="padding:4px 12px;"><code>GO</code> is a batch separator — PostgreSQL does not need it</td></tr><tr><td style="padding:4px 12px;"><code>USE Planets</code></td><td style="padding:4px 12px;">connect via <code>-d</code></td><td style="padding:4px 12px;">Connect at session level: <code>psql -d planets</code></td></tr><tr><td style="padding:4px 12px;"><code>IF OBJECT_ID(\'…\')</code></td><td style="padding:4px 12px;"><code>DROP TABLE IF EXISTS</code></td><td style="padding:4px 12px;">PostgreSQL supports IF EXISTS in DDL — cleaner syntax</td></tr><tr><td style="padding:4px 12px;"><code>master.dbo.sysdatabases</code></td><td style="padding:4px 12px;">shell-level creation</td><td style="padding:4px 12px;">Database creation is handled by the provisioner instead of T-SQL logic</td></tr></table><br>For this module, PostgreSQL is the pragmatic choice: it installs with one <code>apt-get</code> command and runs natively on ARM64 — no preview limitations, no Microsoft repo configuration. The <code>CREATE TABLE</code> and <code>INSERT</code> statements are otherwise identical across both databases.',
  },

  // ── Planets Demo: Build the Full Stack ────────────────────────────────────

  {
    type: 'prose',
    title: 'Putting it together: Planets SPA demo',
    content: `
      <p>
        The final section wires everything from this module into a working demo: a single-page
        application that displays the eight planets of the solar system as cards. The data flows
        PostgreSQL → Node.js API → browser — all running inside the two VMs you just built.
      </p>
      <p>
        <strong>Architecture recap:</strong><br>
        <code>app-db</code> (192.168.56.20) runs PostgreSQL with the seeded <code>Planet</code> table.<br>
        <code>app-web</code> (192.168.56.10) runs an Express server that queries PostgreSQL via the
        <code>pg</code> library and serves the SPA frontend as static files.<br>
        Your Mac browser hits <code>http://localhost:3000</code> — Vagrant port-forwarding delivers
        the request to the Node.js server inside <code>app-web</code>.
      </p>
      <p>
        This is the "two applications at the end" you set out to build: a database backend
        feeding a web frontend, both provisioned from a single Vagrantfile.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'planets',
    sectionTitle: 'Planets Demo — Seed, API, SPA',
    items: [
      {
        id: 901,
        commandTitle: 'Seed the planets database from the SQL file',
        command: 'psql -U appuser -d appdb -h 192.168.56.20 -f /var/www/project/lib/files/planets.sql',
        searchTerms: 'psql seed database planets sql insert import table postgres',
        description: 'Connects to PostgreSQL on the <code>app-db</code> VM (private IP <code>192.168.56.20</code>) and executes <code>planets.sql</code> — creating the <code>Planet</code> table and inserting all 8 planets in a single batch.',
        parts: [
          { text: 'psql -U appuser', explanation: 'connect as the application role — same credentials the Node.js API will use' },
          { text: '-d appdb', explanation: 'the target database created during provisioning' },
          { text: '-h 192.168.56.20', explanation: 'connect across the Vagrant private network — app-web talks to app-db on this static IP' },
          { text: '-f planets.sql', explanation: 'read and execute SQL from this file in batch mode — the standard way to run repeatable schema migrations' },
        ],
        example: "DROP TABLE\nCREATE TABLE\nINSERT 0 1\nINSERT 0 1\nINSERT 0 1\nINSERT 0 1\nINSERT 0 1\nINSERT 0 1\nINSERT 0 1\nINSERT 0 1\n\n# Verify the data landed:\n$ psql -U appuser -d appdb -h 192.168.56.20 -c 'SELECT PlanetID, Name, HasRings FROM Planet;'\n planetid |  name   | hasrings\n----------+---------+----------\n        1 | Mercury | f\n        2 | Venus   | f\n        3 | Earth   | f\n        4 | Mars    | f\n        5 | Jupiter | t\n        6 | Saturn  | t\n        7 | Uranus  | t\n        8 | Neptune | t\n(8 rows)",
        why: "Seeding the database with '-f' turns an empty Postgres instance into one with actual data your application can query. This is a repeatable, zero-manual-steps operation — destroy and rebuild the VM, run this command again, and the data is back.",
      },
      {
        id: 902,
        commandTitle: 'Install pg + Express and copy the API server',
        command: 'cd /var/www/project && npm install pg express && cp src/m1/server.js server.js',
        searchTerms: 'node express pg pool postgres api endpoint planets server.js npm install copy',
        description: 'Installs the <code>pg</code> (PostgreSQL client) and <code>express</code> packages, then copies the pre-built API server from <code>src/m1/server.js</code> into the project root. The server exposes <code>GET /api/planets</code> with a connection pool to PostgreSQL on <code>app-db</code> and serves the SPA from <code>src/m1/public/</code>. No need to write the file inline — it already exists in the synced project folder.',
        parts: [
          { text: 'npm install pg express', explanation: 'pg is the de facto PostgreSQL client for Node.js; express is the HTTP framework — both declared as dependencies' },
          { text: 'cp src/m1/server.js server.js', explanation: 'copies the pre-built API server from the src/m1/ directory — the synced folder makes project files available inside the VM at /var/www/project/' },
        ],
        example: "# After creating server.js:\n$ node server.js &\nPlanets API on :3000\n\n# Test from inside app-web:\n$ curl http://localhost:3000/api/planets\n[{\"planetid\":1,\"name\":\"Mercury\",\"massearths\":\"0.0550\",...},...]",
        why: "Connection pooling avoids the TCP handshake overhead of opening a new connection for every API call. The pg library handles this automatically — you create one Pool at startup and share it across all requests.",
      },
      {
        id: 903,
        commandTitle: 'Copy the planets SPA frontend into place',
        command: 'mkdir -p public && cp src/m1/public/index.html public/index.html',
        searchTerms: 'spa single page application html css planet cards frontend grid fetch api copy',
        description: 'Copies the pre-built planets SPA from <code>src/m1/public/index.html</code> into <code>public/</code>, where the Express server serves it as a static file. The page — a zero-dependency HTML/CSS/JS single-page application — fetches <code>/api/planets</code> on load and renders each planet as a card. No frameworks, no bundler, no inline heredoc needed.',
        parts: [
          { text: 'mkdir -p public', explanation: 'creates the public/ directory if it does not exist — Express serves static files from here' },
          { text: 'cp src/m1/public/index.html public/index.html', explanation: 'copies the SPA from the src/m1/ directory — the synced folder makes all project files available at /var/www/project/' },
          { text: 'See src/m1/public/index.html', explanation: 'open the file to review the full source — CSS Grid card layout, fetch API call, SVG fallback, lazy-loaded images, all in ~80 lines' },
        ],
        example: "# Open your Mac browser:\n# http://localhost:3000\n\n# You should see 8 planet cards in a responsive grid:\n# Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune\n# Each card shows: image, mass, radius, distance, rings badge, discovery info\n\n# Card layout (description):\n# ┌──────────────┐ ┌──────────────┐ ┌──────────────┐\n# │   [planet    │ │   [planet    │ │   [planet    │\n# │    image]    │ │    image]    │ │    image]    │\n# │              │ │              │ │              │\n# │ Jupiter      │ │ Saturn       │ │ Uranus       │\n# │ 317.8 M⊕     │ │ 95.16 M⊕     │ │ 14.54 M⊕     │\n# │ 🪐 Rings     │ │ 🪐 Rings     │ │ 🪐 Rings     │\n# └──────────────┘ └──────────────┘ └──────────────┘",
        why: "This is a pure platform SPA — no React, no Vue, no build step. The browser's native fetch, CSS Grid, and template literals handle everything. For a demo, this keeps the dependency footprint at zero and makes the architecture immediately obvious: HTML file → fetch API → Postgres. Every moving part is visible in ~80 lines of code.",
      },
      {
        id: 904,
        commandTitle: 'Run the server and test the full stack',
        command: 'cd /var/www/project && node server.js',
        searchTerms: 'node server start run test verify full stack demo',
        description: 'Starts the Express server in the foreground. Leave this running, then open <code>http://localhost:3000</code> in your Mac browser — Vagrant port-forwarding delivers the request to the Node.js process running inside <code>app-web</code> on port 3000.',
        parts: [
          { text: 'node server.js', explanation: 'starts the Node.js process — runs in the foreground so you see logs; for production, use the systemd service from an earlier step' },
        ],
        example: "$ node server.js\nPlanets API on :3000\n\n# On your Mac:\n# http://localhost:3000        → SPA with planet cards\n# http://localhost:3000/api/planets → raw JSON\n\n$ curl http://localhost:3000/api/planets | python3 -m json.tool | head -20\n[\n    {\n        \"planetid\": 1,\n        \"name\": \"Mercury\",\n        \"massearths\": \"0.0550\",\n        \"radiuskm\": \"2439.70\",\n        \"distanceau\": \"0.3900\",\n        \"hasrings\": false,\n        \"atmosphere\": \"Oxygen, Sodium, Hydrogen\",\n        \"discoveredby\": null,\n        \"discoveryyear\": null,\n        \"imgurl\": \"https://wallpaperaccess.com/full/1133845.jpg\"\n    },\n    ...\n]",
        why: "This is the final verification: data flows from PostgreSQL (app-db) through the Node.js API (app-web) to your Mac browser via Vagrant port forwarding. Three machines — two virtual, one physical — working together as one stack. The Vagrantfile you committed to your repo can reproduce this entire environment from scratch on any Mac with Parallels.",
      },
    ],
  },

];
