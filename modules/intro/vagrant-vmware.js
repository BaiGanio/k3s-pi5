// modules/intro/vagrant-vmware.js
// Vagrant + VMware Fusion on Apple Silicon — two-VM dev environment
// Uses the pageBlocks format: prose, note, and commands blocks can be mixed freely.

window.pageBlocks = [

  // ── Introduction ──────────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'What you will build',
    content: `
      <p>
        This module walks through setting up a fully reproducible, two-VM development environment
        on an Apple Silicon Mac using <strong>Vagrant</strong> and <strong>VMware Fusion</strong>.
        By the end you will have two named VMs — <code>app-web</code> (Node.js) and
        <code>app-db</code> (PostgreSQL) — both defined in a single <code>Vagrantfile</code>
        and brought up with one command.
      </p>
      <p>
        <strong>Why VMware Fusion?</strong><br>
        VMware Fusion is one of the few mature virtualization solutions with native Apple Silicon
        support. Unlike VirtualBox (which does not run on ARM64 at all) or Parallels (which requires
        a paid Pro/Business license for automation), VMware Fusion Player is <strong>free for personal
        and non-commercial use</strong> — making it the most accessible choice for independent
        developers and open-source contributors. The underlying hypervisor (VMware's VMkernel)
        communicates directly with Apple's Hypervisor.framework, giving you near-native performance.
      </p>
      <p>
        <strong>vagrant-vmware-desktop plugin</strong><br>
        Vagrant communicates with VMware Fusion through the official
        <code>vagrant-vmware-desktop</code> plugin provided by HashiCorp. Unlike the open-source
        VirtualBox provider, the VMware plugin is a commercial product — but HashiCorp offers a
        free license for up to 5 Vagrant-managed VMs, which is sufficient for most development
        setups. The plugin translates Vagrant commands (up, halt, suspend, destroy) into VMware
        RunTime (vmrun) API calls, giving you the same declarative workflow as any other provider.
      </p>
      <p><strong>Prerequisites</strong></p>
      <ul>
        <li>VMware Fusion Player or Pro <strong>13.x or newer</strong> (Player is free for personal use)</li>
        <li>~10 GB free disk space for the ARM64 box image and VM disks</li>
        <li>A HashiCorp account to download the VMware plugin license (free for ≤5 VMs)</li>
      </ul>
      <p>
        The Mac host stays completely clean — no Node.js, no Postgres, no global npm packages.<br>
        Every runtime lives inside disposable VMs that can be destroyed and rebuilt in minutes.
        VMware's snapshot and linked-clone capabilities make this workflow exceptionally fast.
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
        description: 'Adds the official HashiCorp Homebrew tap, then installs Vagrant directly from it. The tap ensures you get the canonical build of Vagrant, including the VMware provider plugin infrastructure.',
        parts: [
          { text: 'brew tap hashicorp/tap', explanation: 'registers the HashiCorp formula repository with Homebrew' },
          { text: 'brew install hashicorp/tap/hashicorp-vagrant', explanation: 'installs Vagrant from the HashiCorp tap — this is the same binary you would download from vagrantup.com' },
        ],
        example: "🍺  hashicorp-vagrant was successfully installed!",
        why: 'The HashiCorp tap gives you the official Vagrant build with full VMware provider support. The Homebrew core cask lags behind and sometimes ships a version with incomplete plugin infrastructure.',
      },
    ],
  },

  // ── Step 2: Install VMware Fusion ─────────────────────────────────────────

  {
    type: 'commands',
    section: 'fusion',
    sectionTitle: 'Install VMware Fusion',
    items: [
      {
        id: 101,
        commandTitle: 'Download VMware Fusion Player (free for personal use)',
        command: 'https://customerconnect.vmware.com/en/evalcenter?p=fusion-player-personal-13',
        searchTerms: 'vmware fusion download player free personal apple silicon arm64 mac',
        description: 'VMware Fusion Player is free for personal, non-commercial use. Use the link above to download the Apple Silicon (ARM64) version. After installation, launch Fusion once and accept the license agreement — this ensures the vmrun CLI tool and required kernel extensions are properly registered.',
        parts: [
          { text: 'https://customerconnect.vmware.com/...', explanation: 'official VMware Customer Connect download portal — requires a free VMware account' },
        ],
        example: '# After download, install the .dmg normally. Then verify:\n$ vmrun -T fusion list\nTotal running VMs: 0',
        why: 'Launching Fusion once registers the vmrun CLI tool with your PATH — Vagrant depends on vmrun to issue commands to the hypervisor. Without this first launch, vagrant up --provider vmware_desktop will error.',
      },
    ],
  },

  // ── Step 3: Install the VMware provider plugin ────────────────────────────

  {
    type: 'commands',
    section: 'plugin',
    sectionTitle: 'Install vagrant-vmware-desktop plugin',
    items: [
      {
        id: 201,
        commandTitle: 'Install vagrant-vmware-desktop plugin',
        command: 'vagrant plugin install vagrant-vmware-desktop',
        searchTerms: 'vagrant vmware fusion desktop plugin install plugin provider arm64 m1',
        description: 'Installs the official HashiCorp VMware plugin. This is a commercial plugin — HashiCorp provides a free license for up to 5 Vagrant-managed VMs. The plugin acts as a bridge between Vagrant and VMware Fusion, translating Vagrant commands into vmrun API calls.',
        parts: [
          { text: 'vagrant plugin install vagrant-vmware-desktop', explanation: 'downloads and installs the VMware provider plugin from HashiCorp' },
        ],
        example: "Installing the 'vagrant-vmware-desktop' plugin...\nInstalled the plugin 'vagrant-vmware-desktop (3.0.x)'!",
        why: 'This plugin is required — without it, Vagrant has no idea how to talk to VMware Fusion. It is the equivalent of vagrant-parallels for the Parallels hypervisor.',
      },
      {
        id: 202,
        commandTitle: 'Install the plugin license',
        command: 'vagrant plugin license vagrant-vmware-desktop ~/Downloads/license.lic',
        searchTerms: 'vagrant plugin license vmware desktop license.lic install activate',
        description: 'Applies the VMware plugin license file you downloaded from the HashiCorp portal. The license is per-user and covers up to 5 concurrently managed VMs.',
        parts: [
          { text: 'vagrant plugin license vagrant-vmware-desktop', explanation: 'registers the license file for the VMware provider plugin' },
        ],
        example: 'License installed successfully.',
        why: 'Without a license, the plugin operates in trial mode (typically 14 days). The free personal license removes this time limit.',
      },
    ],
  },

  // ── Step 4: Choose an ARM64 box ───────────────────────────────────────────

  {
    type: 'note',
    variant: 'warning',
    content: '<strong>ARM64 boxes only.</strong> VMware Fusion on Apple Silicon does <em>not</em> emulate x86_64. Using an x86_64 box causes an immediate "CPU mismatch" error. Use only boxes tagged as ARM64 (aarch64). The Bento project publishes regularly updated ARM64 Ubuntu images tested on VMware Fusion. Check the <a href="https://portal.cloud.hashicorp.com/vagrant/discover?architectures=arm64&query=ubuntu" target="_blank">HCP Vagrant Registry</a> for the latest supported boxes.',
  },

  {
    type: 'commands',
    section: 'init',
    sectionTitle: 'Initialize a Project',
    items: [
      {
        id: 301,
        commandTitle: 'Create a project folder and initialize a box',
        command: 'mkdir dev-env && cd dev-env && vagrant init bento/ubuntu-24.04-arm64',
        searchTerms: 'vagrant init bento ubuntu arm64 vagrantfile mkdir project folder vmware fusion',
        description: 'Creates a new project directory, enters it, and generates a <code>Vagrantfile</code> pre-configured to use the <code>bento/ubuntu-24.04-arm64</code> box — a clean, minimal Ubuntu 24.04 image compiled for ARM64 and tested on VMware Fusion.',
        parts: [
          { text: 'mkdir dev-env && cd dev-env', explanation: 'each Vagrant project lives in its own folder — the Vagrantfile and .vagrant/ state directory both go here' },
          { text: 'vagrant init', explanation: 'generates a Vagrantfile in the current directory with the named box as the base image' },
          { text: 'bento/ubuntu-24.04-arm64', explanation: 'the Bento project by Chef — maintained ARM64 images that are regularly updated and well-tested on VMware Fusion' },
        ],
        example: "A `Vagrantfile` has been placed in this directory.\nYou are now ready to `vagrant up --provider vmware_desktop`!",
        why: "VMware Fusion does not emulate x86 — it virtualizes ARM64 natively. Using an x86_64 box will cause vmrun to throw a 'CPU mismatch' error immediately, so the ARM64 Bento box is mandatory.",
      },
    ],
  },

  // ── Step 5: Start the VM ─────────────────────────────────────────────────

  {
    type: 'commands',
    section: 'startup',
    sectionTitle: 'Start the VM',
    items: [
      {
        id: 401,
        commandTitle: 'Boot the VM with the VMware provider',
        command: 'vagrant up --provider vmware_desktop',
        searchTerms: 'vagrant up vmware_desktop provider fusion start boot download box arm64',
        description: 'Downloads the ARM64 box image if not already cached, creates the VMware Fusion VM, and boots it. On first run this can take a few minutes while the box downloads. VMware Fusion creates a linked clone from the base box — subsequent VMs based on the same box are nearly instantaneous.',
        parts: [
          { text: 'vagrant up', explanation: 'reads the Vagrantfile, creates the VM if it does not exist, and starts it — runs provisioners on first boot' },
          { text: '--provider vmware_desktop', explanation: "selects VMware Fusion as the hypervisor — you can also set VAGRANT_DEFAULT_PROVIDER=vmware_desktop in your shell to avoid typing it every time" },
        ],
        example: "Bringing machine 'default' up with 'vmware_desktop' provider...\n==> default: Box 'bento/ubuntu-22.04-arm64' could not be found. Cloning from cached box...\n==> default: Creating a linked clone...\n==> default: Booting VM...\n==> default: Waiting for machine to boot. This may take a few minutes...\n==> default: Machine booted and ready!",
        why: "VMware's linked clone feature is a key differentiator: each new VM from the same base box only creates a thin delta disk. This means subsequent vagrant up commands are dramatically faster than other providers, and disk usage per VM is minimal.",
      },
    ],
  },

  // ── Step 6: Configure the Vagrantfile ────────────────────────────────────

  {
    type: 'note',
    variant: 'info',
    content: 'The four settings below — synced folders, port forwarding, resource allocation, and the VMware-specific disk and GUI options — form the core of the Vagrant + VMware workflow. VMware Fusion supports NFS for high-performance synced folders and provides robust snapshot and cloning capabilities.',
  },

  {
    type: 'commands',
    section: 'config',
    sectionTitle: 'Configure the Vagrantfile',
    items: [
      {
        id: 501,
        commandTitle: 'Sync your project folder using NFS',
        command: 'config.vm.synced_folder ".", "/var/www/project", type: "nfs"',
        searchTerms: 'vagrant synced_folder nfs shared folder code mac linux vm sync edit vmware fusion',
        description: 'Adds an NFS-based synced folder declaration. NFS is significantly faster than the default VMware HGFS (Host Guest File System) for workloads with many small files — especially JavaScript projects with deep node_module trees. The <code>.</code> refers to the folder where the Vagrantfile lives (your Mac project root).',
        parts: [
          { text: '"."', explanation: "the host path — relative to the Vagrantfile, so '.' means the project root on your Mac" },
          { text: '"/var/www/project"', explanation: 'the guest path — where the folder is mounted inside the Ubuntu VM' },
          { text: 'type: "nfs"', explanation: "forces NFS as the sync mechanism — VMware's default HGFS can be slow for npm install; NFS with the 'udp' and 'vers=3' options offers better performance" },
        ],
        example: "# In your Vagrantfile:\nVagrant.configure('2') do |config|\n  config.vm.box = 'bento/ubuntu-22.04-arm64'\n  config.vm.synced_folder '.', '/var/www/project', type: 'nfs'\nend\n\n# On macOS, NFS requires sudoers configuration — Vagrant prompts you for your password once.\n# Inside the VM after vagrant reload:\n$ mount | grep nfs\n192.168.xxx.xxx:/Users/you/dev-env on /var/www/project type nfs",
        why: "For Node.js development, npm install creates thousands of small files in node_modules. HGFS (the default VMware file sharing) can be painfully slow for this pattern — npm install might take 2-3 minutes. NFS reduces that to 15-20 seconds by moving the file operation overhead to the host's kernel. The trade-off is that NFS requires sudo privileges on the host to configure exports.",
      },
      {
        id: 502,
        commandTitle: 'Forward guest ports to the Mac',
        command: 'config.vm.network "forwarded_port", guest: 3000, host: 3000\nconfig.vm.network "forwarded_port", guest: 5432, host: 5432',
        searchTerms: 'vagrant forwarded_port port forward network guest host 3000 5432 node postgres vmware',
        description: 'Maps ports from inside the VM to your Mac\'s localhost. Your Express app listening on port 3000 inside the VM becomes reachable at <code>http://localhost:3000</code> on your Mac. Same for PostgreSQL on 5432 — connect with any GUI like TablePlus without changing the host.',
        parts: [
          { text: 'guest: 3000, host: 3000', explanation: "traffic arriving at localhost:3000 on your Mac is forwarded to port 3000 inside the VM" },
        ],
        example: "# Add to Vagrantfile:\nconfig.vm.network 'forwarded_port', guest: 3000, host: 3000\nconfig.vm.network 'forwarded_port', guest: 5432, host: 5432\n\n# After vagrant reload, verify from Mac:\n$ curl http://localhost:3000\n# Or connect a database GUI to localhost:5432",
        why: "Port forwarding makes the VM feel local — your browser and database tools connect to localhost as if the services were running directly on your Mac.",
      },
      {
        id: 503,
        commandTitle: 'Allocate CPU and RAM (VMware .vmx configuration)',
        command: "config.vm.provider 'vmware_desktop' do |vmware|\n  vmware.vmx['memsize'] = '8192'\n  vmware.vmx['numvcpus'] = '4'\n  vmware.gui = false\n  vmware.allowlist_verified = true\nend",
        searchTerms: 'vagrant vmware vmx memsize numvcpus gui allowlist cpu ram memory resource vmware fusion',
        description: 'Opens a VMware-specific configuration block and directly edits the .vmx (VMware Virtual Machine Configuration) file parameters. Sets 8 GB RAM, 4 CPU cores, disables the Fusion GUI window, and suppresses the "unverified VM" dialog.',
        parts: [
          { text: 'config.vm.provider "vmware_desktop"', explanation: 'opens a provider-specific config block — settings here only apply when using VMware' },
          { text: 'vmware.vmx["memsize"] = "8192"', explanation: 'sets VM RAM to 8 GB via the .vmx parameter — VMware expects this as a string' },
          { text: 'vmware.vmx["numvcpus"] = "4"', explanation: 'gives the VM 4 CPU cores — VMware cores are presented as vCPUs (virtual CPUs) to the guest, scheduled to M1/M2 performance cores by the hypervisor' },
          { text: 'vmware.gui = false', explanation: 'prevents the VMware Fusion GUI window from opening when the VM boots — headless mode saves system resources and reduces clutter' },
          { text: 'vmware.allowlist_verified = true', explanation: 'suppresses the "unverified VM" warning dialog for boxes from trusted sources — prevents Fusion from blocking automation with modal popups' },
        ],
        example: "Vagrant.configure('2') do |config|\n  config.vm.provider 'vmware_desktop' do |vmware|\n    vmware.vmx['memsize'] = '8192'\n    vmware.vmx['numvcpus'] = '4'\n    vmware.gui = false\n    vmware.allowlist_verified = true\n  end\nend",
        why: "Direct .vmx editing gives you full control over VMware's hypervisor parameters. The gui and allowlist_verified settings are critical for a smooth automation experience — without them, VMware Fusion can pop up modal dialogs that block vagrant up and break scripts.",
      },
    ],
  },

  // ── Step 7: Inside the VM — set up a Node.js + PostgreSQL stack ──────────

  {
    type: 'prose',
    title: 'Inside the VM — set up a Node.js + PostgreSQL stack',
    content: `
      <p>
        SSH into the VM and install the application layer. This section covers
        hostname configuration, Node.js installation, cloning the project,
        setting up the Express app as a systemd service, and installing PostgreSQL.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'inside',
    sectionTitle: 'Inside the VM',
    items: [
      {
        id: 601,
        commandTitle: 'Set the VM hostname',
        command: 'sudo hostnamectl set-hostname app-web',
        searchTerms: 'hostname hostnamectl set-hostname rename vm app-web ubuntu vmware',
        description: 'Permanently renames this VM to <code>app-web</code>, identifying it as the application server in the two-VM architecture.',
        parts: [
          { text: 'sudo hostnamectl set-hostname', explanation: 'systemd command to change the system hostname persistently — writes to /etc/hostname' },
          { text: 'app-web', explanation: 'the new hostname — makes it immediately clear which VM you\'re on when you have multiple terminals open' },
        ],
        example: "# No output on success — re-login to see the updated prompt:\nvagrant@app-web:~$",
        why: "When SSHing into multiple VMs simultaneously (common with VMware's fast start times), a meaningful hostname in the shell prompt prevents you from running commands on the wrong machine.",
      },
      {
        id: 602,
        commandTitle: 'Install Node.js and Git',
        command: 'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - && sudo apt-get install -y nodejs git',
        searchTerms: 'nodejs node npm git install apt nodesource web server ubuntu vmware',
        description: 'Adds the NodeSource repository for Node.js 20 LTS, then installs the <code>nodejs</code> package (which includes <code>npm</code>) and <code>git</code> for cloning the project repository.',
        parts: [
          { text: 'curl -fsSL … | sudo bash -', explanation: 'downloads and executes the NodeSource setup script, which registers the Node.js 20 apt repo' },
          { text: 'sudo apt-get install -y nodejs', explanation: 'installs Node.js and npm from the newly added NodeSource repo' },
          { text: 'git', explanation: 'version control tool — used to clone the project repository into the VM' },
        ],
        example: "Fetching Node.js 20 LTS...\nSetting up nodejs (20.18.0-1nodesource1) ...\n$ node --version\nv20.18.0\n$ npm --version\n10.8.2",
        why: "Node.js 20 LTS is the current LTS (Long-Term Support) release as of Ubuntu 24.04. Installing via NodeSource guarantees the upstream ARM64 build, not the often-outdated Ubuntu universe package.",
      },
      {
        id: 603,
        commandTitle: 'Clone the project repository',
        command: 'git clone https://github.com/your-org/dev-env /var/www/project',
        searchTerms: 'git clone github project repo clone var www',
        description: 'Clones the application repository from GitHub directly into <code>/var/www/project</code> — the same path the Vagrantfile\'s synced folder maps to. If you\'re using the NFS synced folder approach, this step is skipped; cloning is the alternative for CI or environments without a host mount.',
        parts: [
          { text: 'git clone', explanation: 'creates a full local copy of the remote repository including its full history' },
          { text: 'https://github.com/your-org/dev-env', explanation: 'the remote repository URL — replace with your actual project repo' },
          { text: '/var/www/project', explanation: 'destination path inside the VM — matches the synced_folder guest path so tools find files in the same location either way' },
        ],
        example: "Cloning into '/var/www/project'...\nremote: Enumerating objects: 142, done.\nReceiving objects: 100% (142/142), done.\n$ ls /var/www/project\npackage.json  src/  README.md",
        why: "Keeping the clone target consistent with the synced folder path means the app config, scripts, and systemd service file all reference the same location regardless of how the code got there.",
      },
      {
        id: 604,
        commandTitle: 'Install app dependencies and create systemd service',
        command: 'cd /var/www/project && npm install && sudo cp app-web.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable app-web && sudo systemctl start app-web',
        searchTerms: 'npm install app web systemd service enable start auto restart',
        description: 'Installs all npm dependencies, copies a pre-written systemd unit file into the systemd directory, reloads systemd\'s configuration, enables the service to start on boot, and starts it immediately.',
        parts: [
          { text: 'cd /var/www/project && npm install', explanation: 'installs project dependencies from package.json' },
          { text: 'sudo cp app-web.service /etc/systemd/system/', explanation: 'copies the systemd unit file to the standard location' },
          { text: 'sudo systemctl daemon-reload', explanation: 'tells systemd to re-read its unit files — required after adding or modifying .service files' },
          { text: 'sudo systemctl enable app-web', explanation: 'creates the symlink so the service starts automatically on boot' },
          { text: 'sudo systemctl start app-web', explanation: 'starts the service immediately without waiting for a reboot' },
        ],
        example: "npm install complete (324 packages in 12s)\nCreated symlink /etc/systemd/system/multi-user.target.wants/app-web.service → /etc/systemd/system/app-web.service.\n$ systemctl status app-web --no-pager\n● app-web.service - Express Application Server\n   Active: active (running)",
        why: "Running the app as a systemd service has three benefits: it starts on boot without manual intervention, it restarts on failure (Restart=always), and systemd captures its stdout/stderr to journald — giving you persistent logs you can query with journalctl.",
      },
      {
        id: 701,
        commandTitle: 'Set the second VM hostname',
        command: 'sudo hostnamectl set-hostname app-db',
        searchTerms: 'hostname hostnamectl set-hostname rename vm app-db postgresql ubuntu vmware',
        description: 'Permanently renames this VM to <code>app-db</code>, identifying it as the dedicated database server.',
        parts: [
          { text: 'sudo hostnamectl set-hostname', explanation: 'systemd command to change the system hostname persistently — writes to /etc/hostname' },
          { text: 'app-db', explanation: 'the new hostname — pairs with app-web to make the two-VM architecture immediately obvious from the shell prompt' },
        ],
        example: "# Re-login to see the updated prompt:\nvagrant@app-db:~$",
        why: "With two VMs running in parallel (VMware handles this with minimal overhead thanks to linked clones), a clear hostname in the prompt is the first line of defence against running a destructive command on the wrong machine.",
      },
      {
        id: 702,
        commandTitle: 'Install PostgreSQL server and client',
        command: 'sudo apt-get install -y postgresql postgresql-contrib',
        searchTerms: 'postgresql postgres install apt-get database server client ubuntu vmware',
        description: 'Installs the PostgreSQL server daemon and its companion <code>postgresql-contrib</code> package, which adds commonly used extensions like <code>uuid-ossp</code>, <code>pg_stat_statements</code>, and <code>hstore</code>.',
        parts: [
          { text: 'sudo apt-get install -y', explanation: 'installs packages non-interactively — -y confirms all prompts automatically' },
          { text: 'postgresql', explanation: "the PostgreSQL server daemon — Ubuntu's apt repo ships the current stable release (PostgreSQL 16 on Ubuntu 24.04)" },
          { text: 'postgresql-contrib', explanation: 'additional extensions and utilities that ship separately from the core — required for uuid-ossp and other commonly used modules' },
        ],
        example: "Setting up postgresql (16+251) ...\nCreating new PostgreSQL cluster 16/main ...\n\n$ psql --version\npsql (PostgreSQL) 16.4",
        why: "Ubuntu's apt repos on ARM64 ship a current PostgreSQL version with full aarch64 support — no need for third-party repos. The PostgreSQL community maintains excellent ARM64 builds.",
      },
      {
        id: 703,
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
        why: "Never use the postgres superuser from application code. Creating a dedicated role with limited permissions follows the principle of least privilege — if the app is compromised, the attacker has access only to appdb, not to the entire PostgreSQL cluster.",
      },
    ],
  },

  // ── Step 8: Verify the environment ───────────────────────────────────────

  {
    type: 'prose',
    title: 'Verify the environment',
    content: `
      <p>
        Run these sanity checks to confirm everything is wired correctly.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'verify',
    sectionTitle: 'Verification commands',
    items: [
      {
        id: 801,
        commandTitle: 'Test the Express app from your Mac',
        command: 'curl http://localhost:3000',
        searchTerms: 'curl express test node localhost 3000 verify app running vmware',
        description: 'Sends an HTTP GET to the Express app through Vagrant\'s port forwarding. If the app and the systemd service are working, this returns the app\'s response.',
        parts: [
          { text: 'curl http://localhost:3000', explanation: 'hits the forwarded port on localhost — Vagrant tunnels the request to the VM' },
        ],
        example: '{"status":"ok","message":"Express app is running on VMware Fusion"}',
        why: 'This confirms the full pipeline: Vagrant started the VM, the provisioner installed Node.js, the systemd service launched the app, and port forwarding exposes it to your Mac.',
      },
    ],
  },

  // ── Step 9: Day-to-day VM management ─────────────────────────────────────

  {
    type: 'commands',
    section: 'manage',
    sectionTitle: 'Day-to-Day Management',
    items: [
      {
        id: 802,
        commandTitle: 'Suspend the VM (fast resume with VMware)',
        command: 'vagrant suspend',
        searchTerms: 'vagrant suspend save state pause resume fast vmware fusion linked clone ram',
        description: 'Saves the running state of the VM to disk and frees CPU and RAM. <code>vagrant resume</code> brings it back in seconds — VMware\'s suspend/resume is significantly faster than other hypervisors due to its memory snapshot optimization.',
        parts: [
          { text: 'vagrant suspend', explanation: 'saves VM state (RAM + CPU registers) to disk — like hibernating a physical machine' },
        ],
        example: '==> app-web: Saving VM state and suspending execution...',
        why: "Use suspend at the end of the day to free resources while keeping the VM's exact state. VMware's resume is typically 2-3 seconds, versus 20-30 seconds for a full halt + up cycle.",
      },
      {
        id: 803,
        commandTitle: 'Check VM status (including VMware-specific details)',
        command: 'vagrant status && vagrant global-status',
        searchTerms: 'vagrant status global running stopped saved machines list all vmware fusion',
        description: '<code>vagrant status</code> shows the state of the VM in the current project folder. <code>vagrant global-status</code> lists every Vagrant-managed VM on your machine across all project directories.',
        parts: [
          { text: 'vagrant status', explanation: "reads the .vagrant/ directory in the current folder and reports that VM's state" },
          { text: 'vagrant global-status', explanation: "queries Vagrant's global index (~/.vagrant.d/data/machine-index/) — shows all VMs regardless of current directory" },
        ],
        example: "$ vagrant status\nCurrent machine states:\napp-web                   running (vmware_desktop)\napp-db                    saved (vmware_desktop)\n\n$ vagrant global-status\nid       name     provider        state    directory\n-----------------------------------------------------------\na1b2c3d  app-web  vmware_desktop  running  /Users/you/dev-env\ne4f5a6b  app-db   vmware_desktop  saved    /Users/you/dev-env",
        why: "global-status is the answer to 'which VMs are eating my RAM right now?' — especially useful when you have a suspended VM from last week and wonder why your Mac is sluggish. VMware VMs generally have a smaller memory footprint when suspended than Parallels VMs due to different compression strategies.",
      },
      {
        id: 804,
        commandTitle: 'Destroy the VM completely (fast with linked clones)',
        command: 'vagrant destroy --force',
        searchTerms: 'vagrant destroy force delete remove vm disk clean reset vmware fusion linked clone',
        description: 'Stops and permanently deletes the VM and its linked clone overlay. The base box stays cached. Because VMware uses linked clones, <code>vagrant up</code> after a destroy recreates the VM in seconds — much faster than rebuilding from the full box image.',
        parts: [
          { text: 'vagrant destroy', explanation: "deletes the VM's linked clone overlay and removes it from Fusion — reclaims disk space immediately" },
          { text: '--force', explanation: "skips the 'Are you sure?' confirmation prompt — useful in scripts" },
        ],
        example: "==> app-web: Stopping the machine...\n==> app-web: Deleting the machine...\n==> app-db: Stopping the machine...\n==> app-db: Deleting the machine...\n\n# Start fresh — extremely fast due to linked clones:\n$ time vagrant up --provider vmware_desktop\n==> app-web: Machine booted and ready!\n==> app-db: Machine booted and ready!\nreal    0m 45.23s   <-- much faster than Parallels or VirtualBox",
        why: "VMware's linked clone technology is a killer feature for destroy+recreate workflows. Each 'vagrant up' from the same base box creates a new overlay that is only a few megabytes, and the VM boots in seconds. This encourages treating VMs as truly disposable — destroy and rebuild whenever something feels off.",
      },
    ],
  },

  // ── Step 10: Complete Vagrantfile ─────────────────────────────────────────

  {
    type: 'note',
    variant: 'tip',
    content: 'The command below shows the complete <code>Vagrantfile</code> for VMware Fusion. Notice the <code>private_network</code> lines — these assign static IPs so <code>app-web</code> can reach <code>app-db</code> using a reliable address (<code>192.168.56.20</code>) rather than relying on mDNS or DHCP.',
  },

  {
    type: 'commands',
    section: 'vagrantfile',
    sectionTitle: 'Complete Vagrantfile (VMware Fusion)',
    items: [
      {
        id: 901,
        commandTitle: 'Full two-VM Vagrantfile: app-web + app-db on VMware Fusion',
        command: 'cat Vagrantfile',
        searchTerms: 'vagrantfile complete full example node postgres vmware fusion arm64 m1 m2 synced nfs port provision two vm multi machine app-web app-db',
        description: 'The complete Vagrantfile that ties together everything from this module. It defines <strong>two named machines</strong> — <code>app-web</code> (Node.js) and <code>app-db</code> (PostgreSQL) — each with their own hostname, resources, NFS synced folders, port forwarding, private IPs for cross-VM communication, and inline provisioners. One <code>vagrant up --provider vmware_desktop</code> builds the entire stack from scratch.',
        parts: [
          { text: 'config.vm.define "app-web"', explanation: "declares a named machine — you can target it individually with 'vagrant ssh app-web' or 'vagrant reload app-web'" },
          { text: 'config.vm.define "app-db"', explanation: "declares the second named machine — both spin up together on 'vagrant up' unless you specify a name" },
          { text: 'web.vm.network "private_network", ip: "192.168.56.10"', explanation: 'assigns a static private IP to the web VM — used by the Mac for port forwarding and by app-db as a known endpoint' },
          { text: 'db.vm.network "private_network", ip: "192.168.56.20"', explanation: 'assigns a static private IP to the db VM — app-web connects to this IP in its DATABASE_URL environment variable' },
          { text: 'type: "nfs"', explanation: 'forces NFS for synced folders — critical for npm install performance' },
          { text: 'vmware.vmx["memsize"] / "numvcpus"', explanation: 'direct .vmx editing for resource allocation' },
          { text: 'config.vm.provision "shell"', explanation: 'each VM gets its own provisioner block — app-web installs Node.js, app-db installs PostgreSQL and creates the database with private-network-restricted pg_hba.conf' },
        ],
        example: "Vagrant.configure('2') do |config|\n\n  config.vm.box = 'bento/ubuntu-24.04-arm64'\n\n  # ── app-web: Node.js application server ──\n  config.vm.define 'app-web' do |web|\n    web.vm.hostname = 'app-web'\n    web.vm.network 'private_network', ip: '192.168.56.10'\n    web.vm.network 'forwarded_port', guest: 3000, host: 3000\n    web.vm.synced_folder '.', '/var/www/project', type: 'nfs'\n\n    web.vm.provider 'vmware_desktop' do |vmware|\n      vmware.vmx['memsize'] = '4096'\n      vmware.vmx['numvcpus'] = '2'\n      vmware.vmx['ethernet0.pcislotnumber'] = '32'\n      vmware.gui = false\n      vmware.allowlist_verified = true\n    end\n\n    web.vm.provision 'shell', inline: <<-SHELL\n      hostnamectl set-hostname app-web\n      curl -fsSL https://deb.nodesource.com/setup_20.x | bash -\n      apt-get install -y nodejs git\n      cd /var/www/project && npm install\n      cp app-web.service /etc/systemd/system/\n      systemctl daemon-reload\n      systemctl enable app-web\n      systemctl start app-web\n    SHELL\n  end\n\n  # ── app-db: PostgreSQL database server ──\n  config.vm.define 'app-db' do |db|\n    db.vm.hostname = 'app-db'\n    db.vm.network 'private_network', ip: '192.168.56.20'\n    db.vm.network 'forwarded_port', guest: 5432, host: 5432\n\n    db.vm.provider 'vmware_desktop' do |vmware|\n      vmware.vmx['memsize'] = '4096'\n      vmware.vmx['numvcpus'] = '2'\n      vmware.gui = false\n      vmware.allowlist_verified = true\n    end\n\n    db.vm.provision 'shell', inline: <<-SHELL\n      hostnamectl set-hostname app-db\n      apt-get update\n      apt-get install -y postgresql postgresql-contrib\n      sudo -u postgres psql -c \"CREATE USER appuser WITH PASSWORD 'secret';\"\n      sudo -u postgres psql -c \"CREATE DATABASE appdb OWNER appuser;\"\n      echo 'host  appdb  appuser  192.168.56.0/24  md5' >> /etc/postgresql/16/main/pg_hba.conf\n      systemctl reload postgresql\n    SHELL\n  end\n\nend",
        why: "This Vagrantfile is the single source of truth for the entire development environment. Commit it to your repo and any developer — on any Mac with Vagrant + VMware Fusion Player (free!) — gets an identical two-VM stack with one command. The Mac host stays completely clean: no Node versions, no global npm packages, no Postgres installation. VMware's linked clone architecture makes 'vagrant destroy' and 'vagrant up' cycles nearly instantaneous — encouraging a truly disposable infrastructure mindset.",
      },
    ],
  },

  // ── Bonus: Apple Silicon Gotchas ─────────────────────────────────────────

  {
    type: 'prose',
    title: 'Apple Silicon & VMware: What works and what doesn\'t',
    content: `
      <p><strong>✅ Works well</strong></p>
      <ul>
        <li><strong>ARM64 guests only.</strong> VMware Fusion on Apple Silicon does <em>not</em> emulate x86_64. You must use ARM64 box images (like <code>bento/ubuntu-24.04-arm64</code>).</li>
        <li><strong>Docker inside the VM.</strong> Ubuntu ARM64 runs Docker natively, and containers built for ARM64 work perfectly. If your team uses multi-arch images (including amd64), Docker will emulate x86 via QEMU — this works but is slow.</li>
        <li><strong>Nested virtualization.</strong> VMware Fusion on Apple Silicon does <strong>not</strong> support nested virtualization (running a hypervisor inside the VM). Tools like <code>minikube</code> or <code>kind</code> that try to start a second hypervisor will fail.</li>
      </ul>
      <p><strong>⚠️ Common pitfalls</strong></p>
      <ul>
        <li><strong>First-time GUI popups.</strong> Even with <code>allowlist_verified = true</code>, the very first time you start a VM you may see a 'This virtual machine might have been moved or copied' dialog. Open VMware Fusion once, right-click the VM in the library, and choose 'Settings' → 'Encryption & Restrictions' → set a dummy password to suppress future warnings.</li>
        <li><strong>NFS sudo prompts.</strong> The NFS synced folder requires modifying <code>/etc/exports</code>. Vagrant prompts for your Mac password once per <code>vagrant up</code>. To avoid this, you can manually set up passwordless sudo for the <code>/sbin/nfsd</code> command. The trade-off (performance vs convenience) usually favours accepting the prompt.</li>
      </ul>
      <p>
        For most developers working on ARM-native codebases (Node.js, Python, Go, modern Java), VMware Fusion is the most cost-effective choice: the Player edition is free for personal use, the performance is excellent, and the Vagrant workflow is identical to other providers. The lack of nested virtualization is the only major limitation compared to Parallels — but for standard web app development (Node.js + PostgreSQL), this rarely matters.
      </p>
    `,
  },

];
