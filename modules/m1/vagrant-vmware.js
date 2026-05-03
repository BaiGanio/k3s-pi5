// modules/m2/vagrant-vmware.js
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

  // ── Step 2: VMware Fusion ─────────────────────────────────────────────────

  {
    type: 'commands',
    section: 'vmware',
    sectionTitle: 'Install VMware Fusion',
    items: [
      {
        id: 101,
        commandTitle: 'Download VMware Fusion Player for Apple Silicon',
        command: 'https://customerconnect.vmware.com/en/evalcenter?p=fusion-player-personal-13',
        searchTerms: 'vmware fusion download personal license free apple silicon arm64 m1 m2',
        description: 'VMware Fusion Player is free for personal, non-commercial use. Use the link above to download the Apple Silicon (ARM64) version. After installation, launch Fusion once and accept the license agreement — this ensures the vmrun CLI tool and required kernel extensions are properly registered.',
        parts: [
          { text: 'Fusion Player Personal License', explanation: "free for non-commercial use — no time limit, but you must register for a VMware Customer Connect account and generate a free personal license key" },
          { text: 'ARM64 build', explanation: "explicit Apple Silicon version — the x86 build runs under Rosetta and has severe performance penalties" },
        ],
        example: "VMware Fusion 13.x for Apple Silicon (ARM64) — 約 800 MB installer.\nAfter installation: Applications > VMware Fusion > right-click > Open (first launch bypasses Gatekeeper)",
        why: "VMware Fusion Player is the only free-as-in-beer hypervisor with full Apple Silicon support. The free personal license allows unlimited usage for development, learning, and open-source work — no credit card required, only a basic registration.",
      },
    ],
  },

  // ── Step 3: VMware Plugin ─────────────────────────────────────────────────

  {
    type: 'note',
    variant: 'warning',
    content: '<strong>VMware Fusion must be launched and activated at least once</strong> before the Vagrant plugin will work. The plugin uses the <code>vmrun</code> command-line tool that Fusion installs — but only after you have accepted the EULA and entered your license key (even the free personal license requires activation inside the GUI).',
  },

  {
    type: 'commands',
    section: 'plugin',
    sectionTitle: 'Install the VMware Plugin',
    items: [
      {
        id: 201,
        commandTitle: 'Install vagrant-vmware-desktop plugin',
        command: 'vagrant plugin install vagrant-vmware-desktop',
        searchTerms: 'vagrant vmware fusion desktop plugin install plugin provider arm64 m1',
        description: 'Installs the official HashiCorp VMware plugin. This is a commercial plugin — HashiCorp provides a free license for up to 5 Vagrant-managed VMs. The plugin acts as a bridge between Vagrant and VMware Fusion, translating Vagrant commands into vmrun API calls.',
        parts: [
          { text: 'vagrant plugin install', explanation: "downloads and installs a Vagrant plugin from RubyGems into Vagrant's internal plugin directory" },
          { text: 'vagrant-vmware-desktop', explanation: "the official VMware provider plugin — registers 'vmware_desktop' as a valid --provider value (also accepts 'vmware_fusion' as an alias)" },
        ],
        example: "Installing the 'vagrant-vmware-desktop' plugin. This can take a few minutes...\nInstalled the plugin 'vagrant-vmware-desktop (3.0.3)'!\n\nVagrant has installed the VMware plugin! The plugin itself requires a license.\nRun `vagrant plugin license vagrant-vmware-desktop <license-file.lic>` to activate.",
        why: "Unlike the open-source VirtualBox provider, VMware requires a proprietary plugin maintained by HashiCorp. The plugin is the only officially supported way to drive VMware Fusion from Vagrant — using it ensures compatibility with VMware's VMCI (Virtual Machine Communication Interface) and fast IPC (Inter-Process Communication) for features like file sync and guest info.",
      },
      {
        id: 202,
        commandTitle: 'Obtain and install the free VMware plugin license',
        command: 'vagrant plugin license vagrant-vmware-desktop ~/Downloads/license.lic',
        searchTerms: 'vagrant vmware plugin license free 5 vms commercial license activation',
        description: 'After downloading the free license file from HashiCorp (requires a free account), this command installs the license into Vagrant. The free license allows up to 5 simultaneously running Vagrant-managed VMs — more than enough for standard development.',
        parts: [
          { text: 'vagrant plugin license', explanation: "subcommand that installs a license file for a commercial Vagrant plugin" },
          { text: 'vagrant-vmware-desktop', explanation: "the plugin name to license" },
          { text: '~/Downloads/license.lic', explanation: "path to the .lic file you downloaded — the file contains an encrypted license payload" },
        ],
        example: "$ vagrant plugin license vagrant-vmware-desktop ~/Downloads/license.lic\nInstalling license for plugin: vagrant-vmware-desktop\nLicense successfully installed!\n\n$ vagrant plugin list\nvagrant-vmware-desktop (3.0.3, licensed)\n  - Version Constraint: 3.0.3\n  - License: Commercial (5 VM limit)",
        why: "The license file is required — without it, 'vagrant up' fails with a licensing error. HashiCorp offers the free tier to encourage use of the VMware ecosystem without an upfront cost, while the 5-VM limit prevents commercial datacenter-scale usage without a paid license.",
      },
    ],
  },

  // ── Step 4: Initialise a Project ─────────────────────────────────────────

  {
    type: 'note',
    variant: 'tip',
    content: 'Always use an <strong>ARM64 box</strong> on Apple Silicon. The <code>bento/ubuntu-24.04-arm64</code> box by Chef is maintained and regularly updated. VMware Fusion requires boxes with <strong>Virtual Hardware version 21 or later</strong> for Apple Silicon compatibility — the current Bento images meet this requirement. Check latest supported boxes at <a href="https://portal.cloud.hashicorp.com/vagrant/discover?architectures=arm64&query=ubuntu" target="_blank">HCP Vagrant Registry</a>.',
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
        why: "VMware's linked clone feature is a key differentiator from VirtualBox and a major advantage over Parallels for some workflows — the base box remains immutable, each 'vagrant up' creates a lightweight copy-on-write overlay. This makes destroying and recreating VMs extremely fast and disk-efficient.",
      },
      {
        id: 402,
        commandTitle: 'SSH into the running VM',
        command: 'vagrant ssh',
        searchTerms: 'vagrant ssh shell login terminal vm connect vmware fusion',
        description: 'Opens an interactive SSH session into the running VM. Vagrant manages the key pair automatically via the VMware GuestInfo channel — no passwords, no manual key setup. You land as the <code>vagrant</code> user with passwordless <code>sudo</code>.',
        parts: [
          { text: 'vagrant ssh', explanation: "reads the VM's SSH config from .vagrant/machines/default/vmware_desktop and opens a session — VMware's HGFS (Host Guest File System) sharing is not required for SSH access" },
        ],
        example: "Welcome to Ubuntu 24.04 LTS (GNU/Linux 5.15.0-91-generic aarch64)\nvagrant@ubuntu-24-04-arm64:~$ uname -m\naarch64",
        why: "The VMware provider uses vmrun to start the VM, then retrieves the IP address from VMware's VMX (Virtual Machine Configuration) file via the 'ip' option. SSH is then tunneled over the host's network stack — no reliance on VirtualBox-style host-only networking artifacts that break on Apple Silicon.",
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
          { text: 'guest: 3000, host: 3000', explanation: "traffic arriving at localhost:3000 on your Mac is tunnelled to port 3000 inside the VM — where your Node.js/Express app listens" },
          { text: 'guest: 5432, host: 5432', explanation: "maps the PostgreSQL default port — lets you connect from Mac-side tools directly to the VM's Postgres" },
        ],
        example: "# After vagrant reload:\n# On your Mac:\n$ curl http://localhost:3000/api/health\n{\"status\":\"ok\"}\n\n$ psql -h localhost -U appuser -d appdb\npsql (16.3)\nappdb=#",
        why: "VMware Fusion uses NAT (Network Address Translation) by default, giving each VM an IP in the 192.168.x.x range. Port forwarding is the simplest way to expose services to your Mac — no need to remember IP addresses or configure host-only adapters, which can be finicky on Apple Silicon.",
      },
      {
        id: 503,
        commandTitle: 'Allocate RAM and CPU cores, plus VMware-specific tweaks',
        command: 'config.vm.provider "vmware_desktop" do |vmware|\n  vmware.vmx["memsize"] = "8192"\n  vmware.vmx["numvcpus"] = "4"\n  vmware.gui = false\n  vmware.allowlist_verified = true\nend',
        searchTerms: 'vagrant vmware_desktop provider memory ram cpu cores performance vmx gui apple silicon',
        description: 'Configures the VMware provider with resource allocation and VMware-specific settings. Unlike VirtualBox/Parallels, VMware uses a .vmx configuration file — the vmware.vmx hash allows direct manipulation of any VMX parameter. This gives you fine-grained control over features like nested virtualization, vPMC (performance monitoring counters), and vIOMMU (I/O Memory Management Unit).',
        parts: [
          { text: 'config.vm.provider "vmware_desktop"', explanation: 'opens a provider-specific config block — settings here only apply when using VMware' },
          { text: 'vmware.vmx["memsize"] = "8192"', explanation: 'sets VM RAM to 8 GB via the .vmx parameter — VMware expects this as a string' },
          { text: 'vmware.vmx["numvcpus"] = "4"', explanation: 'gives the VM 4 CPU cores — VMware cores are presented as vCPUs (virtual CPUs) to the guest, scheduled to M1/M2 performance cores by the hypervisor' },
          { text: 'vmware.gui = false', explanation: 'prevents the VMware Fusion GUI window from opening when the VM boots — headless mode saves system resources and reduces clutter' },
          { text: 'vmware.allowlist_verified = true', explanation: 'suppresses the "unverified VM" warning dialog for boxes from trusted sources — prevents Fusion from blocking automation with modal popups' },
        ],
        example: "# Full provider block in context:\nconfig.vm.provider 'vmware_desktop' do |vmware|\n  vmware.vmx['memsize'] = '8192'\n  vmware.vmx['numvcpus'] = '4'\n  vmware.vmx['ethernet0.pcislotnumber'] = '32'  # Fixes network device ordering on some ARM64 VMs\n  vmware.gui = false\n  vmware.allowlist_verified = true\nend",
        why: "The .vmx file is VMware's equivalent of VirtualBox's .vbox file — a plaintext configuration. Tweaking 'memsize' and 'numvcpus' directly sets the resources the VM will see. The hidden gem: setting 'ethernet0.pcislotnumber' to a fixed value prevents network device reordering on Apple Silicon, which can cause intermittent 'network unreachable' errors if left to auto-assign.",
      },
      {
        id: 504,
        commandTitle: 'Provision Node.js and PostgreSQL automatically',
        command: 'config.vm.provision "shell", inline: <<-SHELL\n  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -\n  apt-get install -y nodejs postgresql postgresql-contrib\n  sudo -u postgres psql -c "CREATE USER appuser WITH PASSWORD \'secret\';"\n  sudo -u postgres psql -c "CREATE DATABASE appdb OWNER appuser;"\nSHELL',
        searchTerms: 'vagrant provision shell nodejs postgresql apt-get inline script setup vmware',
        description: 'Adds an inline shell provisioner that runs once on first <code>vagrant up</code>. It installs Node.js 20 LTS via the NodeSource repo and PostgreSQL, then creates the application database user and database — so the VM is fully ready with no manual steps.',
        parts: [
          { text: 'config.vm.provision "shell"', explanation: "runs the given shell script as root inside the VM — only executes on the first 'vagrant up', or when you run 'vagrant provision' explicitly" },
          { text: 'curl … | bash -', explanation: 'adds the NodeSource APT repository for Node.js 20 LTS — the current LTS as of Ubuntu 24.04' },
          { text: 'apt-get install -y nodejs postgresql', explanation: 'installs both runtimes in one pass — no interactive prompts (-y confirms everything)' },
        ],
        example: "==> default: Running provisioner: shell...\n==> default: Installing Node.js 20...\n==> default: Setting up postgresql...\n==> default: CREATE ROLE\n==> default: CREATE DATABASE\n\n# Inside the VM after provisioning:\n$ node --version\nv20.18.0\n$ psql -U appuser -d appdb -c 'SELECT NOW();'\n           now\n------------------------\n 2024-11-15 10:30:00+00",
        why: "Provisioning makes the VM self-documenting and reproducible. A new team member runs 'vagrant up --provider vmware_desktop' and gets an identical environment in minutes — no README steps, no 'works on my machine' problems, no leftover global packages on the host.",
      },
    ],
  },

  // ── Step 7 & 8: Two-VM Architecture ──────────────────────────────────────

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
        <li><strong>VMware linked clones</strong> — each VM is a linked clone of the base box,
            so starting a second VM adds only megabytes of disk storage instead of gigabytes.</li>
      </ul>
      <p>
        Both VMs are defined in the same <code>Vagrantfile</code> using
        <code>config.vm.define</code> blocks. <code>vagrant up --provider vmware_desktop</code>
        starts both; <code>vagrant ssh app-web</code> or <code>vagrant ssh app-db</code>
        targets each individually.
      </p>
    `,
  },

  // ── Step 7: Web Server Setup ──────────────────────────────────────────────

  {
    type: 'commands',
    section: 'app-web',
    sectionTitle: 'Web Server Setup (app-web)',
    items: [
      {
        id: 601,
        commandTitle: 'Set hostname to app-web',
        command: 'sudo hostnamectl set-hostname app-web',
        searchTerms: 'hostname hostnamectl set rename machine app-web web server vmware',
        description: 'Permanently changes the VM\'s hostname to <code>app-web</code>, identifying it as the web/application server. The change takes effect on next login.',
        parts: [
          { text: 'sudo', explanation: 'run as superuser — hostname changes require root' },
          { text: 'hostnamectl', explanation: 'systemd tool to query and change the system hostname' },
          { text: 'set-hostname', explanation: 'sub-command that writes the new name to /etc/hostname and updates the running system' },
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
        searchTerms: 'npm install systemctl enable start node service systemd daemon app-web',
        description: 'Installs the project\'s npm dependencies, registers the Node.js app as a systemd service so it starts on boot, reloads the daemon to pick up the new unit file, then enables and starts the service immediately.',
        parts: [
          { text: 'npm install', explanation: 'reads package.json and downloads all declared dependencies into node_modules/ — expect this to be faster with NFS sync than with HGFS' },
          { text: 'sudo cp app-web.service /etc/systemd/system/', explanation: 'places the systemd unit file where systemd can find it — the file lives in the repo so it\'s version-controlled' },
          { text: 'sudo systemctl daemon-reload', explanation: 'tells systemd to re-scan unit files after adding or modifying one — required before enable/start' },
          { text: 'sudo systemctl enable app-web', explanation: 'creates a symlink so systemd starts the Node.js app automatically on every boot' },
          { text: 'sudo systemctl start app-web', explanation: 'starts the service immediately without requiring a reboot' },
        ],
        example: "added 97 packages in 4.2s\nCreated symlink /etc/systemd/system/multi-user.target.wants/app-web.service\n\n$ sudo systemctl status app-web\n● app-web.service - Node.js Web Application\n   Active: active (running) since ...",
        why: "Running the app as a systemd service gives you automatic restarts on crash, boot-time startup, and standard log integration via journald — without a third-party process manager like pm2. VMware's fast resume times make the service start very snappy after 'vagrant resume'.",
      },
      {
        id: 605,
        commandTitle: 'Verify the app is reachable from your Mac',
        command: 'curl http://localhost:3000/api/health',
        searchTerms: 'curl localhost 3000 test verify node express api health check port forward vmware',
        description: 'Runs this command <strong>on your Mac</strong> (not inside the VM). Thanks to port forwarding in the Vagrantfile, traffic to <code>localhost:3000</code> on your Mac is transparently tunnelled to port 3000 inside <code>app-web</code>.',
        parts: [
          { text: 'curl', explanation: 'command-line HTTP client — available by default on macOS' },
          { text: 'http://localhost:3000/api/health', explanation: "hits the health-check endpoint on your Mac's loopback interface — Vagrant's port forward delivers it to the VM's Express server" },
        ],
        example: "# Run on your Mac:\n$ curl http://localhost:3000/api/health\n{\"status\":\"ok\",\"db\":\"connected\"}\n\n# Or open in your Mac browser:\n# http://localhost:3000",
        why: "This is the payoff of port forwarding — your Mac browser and API clients talk to the VMware VM as if it were running locally. No IP address, no VPN, no network config to remember.",
      },
    ],
  },

  // ── Step 8: Database Server Setup ────────────────────────────────────────

  {
    type: 'commands',
    section: 'app-db',
    sectionTitle: 'Database Server Setup (app-db)',
    items: [
      {
        id: 701,
        commandTitle: 'Set hostname to app-db',
        command: 'sudo hostnamectl set-hostname app-db',
        searchTerms: 'hostname hostnamectl set rename machine app-db database server vmware',
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
        why: "Applications should never connect as the postgres superuser. A dedicated role with only the permissions it needs limits the blast radius of a compromised connection string — standard security practice.",
      },
      {
        id: 704,
        commandTitle: 'Allow remote connections in pg_hba.conf',
        command: "sudo bash -c \"echo 'host  appdb  appuser  192.168.56.0/24  md5' >> /etc/postgresql/16/main/pg_hba.conf\" && sudo systemctl reload postgresql",
        searchTerms: 'pg_hba.conf postgres remote connection md5 host authentication allow subnet vmware private network',
        description: 'Appends a host-based authentication rule to <code>pg_hba.conf</code> that allows <code>appuser</code> to connect to <code>appdb</code> from the private subnet (<code>192.168.56.0/24</code>) using a password. This limits access to other Vagrant VMs on the same network, not the entire internet.',
        parts: [
          { text: "echo 'host  appdb  appuser  192.168.56.0/24  md5'", explanation: 'the HBA rule: type (host=TCP), database, user, CIDR range (same subnet as private network), auth method (md5 password)' },
          { text: '>> /etc/postgresql/16/main/pg_hba.conf', explanation: "appends the rule — Ubuntu keeps pg_hba.conf here, unlike RHEL's /var/lib/pgsql path" },
          { text: 'sudo systemctl reload postgresql', explanation: 'sends SIGHUP to the postgres process, causing it to re-read pg_hba.conf without dropping active connections' },
        ],
        example: "# Verify the rule was added:\n$ sudo tail -3 /etc/postgresql/16/main/pg_hba.conf\nhost  appdb  appuser  192.168.56.0/24  md5\n\n# Test from app-web VM (on the same private network):\n$ psql -h 192.168.56.20 -U appuser -d appdb\nPassword for user appuser:\nappdb=>",
        why: "PostgreSQL rejects all remote connections by default. The narrow CIDR range (<code>192.168.56.0/24</code>) is a defence-in-depth measure — even if the authentication password is leaked, only VMs on the same private network can attempt connections. The database is not exposed to your Mac's Wi-Fi network or the internet.",
      },
      {
        id: 705,
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

  // ── Step 9: Day-to-Day Commands ───────────────────────────────────────────

  {
    type: 'commands',
    section: 'daily',
    sectionTitle: 'Day-to-Day Commands',
    items: [
      {
        id: 801,
        commandTitle: 'Reload the VM after Vagrantfile changes',
        command: 'vagrant reload',
        searchTerms: 'vagrant reload restart apply vagrantfile changes config port sync vmware',
        description: 'Gracefully restarts the VM and re-applies the Vagrantfile — picks up new port forwards, synced folder changes, and resource config without destroying the VM or its installed packages.',
        parts: [
          { text: 'vagrant reload', explanation: "equivalent to vagrant halt followed by vagrant up — preserves the VM's disk state and everything installed inside it" },
        ],
        example: "==> default: Attempting graceful shutdown of VM...\n==> default: Booting VM...\n==> default: Forwarding ports...\n    default: 3000 (guest) => 3000 (host)\n    default: 5432 (guest) => 5432 (host)\n==> default: Machine booted and ready!",
        why: "Use reload any time you change port forwarding, memory allocation, or synced folder config. VMware Fusion applies the .vmx changes without recreating the entire VM — faster than Parallels for many operations.",
      },
      {
        id: 802,
        commandTitle: 'Suspend and resume the VM',
        command: 'vagrant suspend && vagrant resume',
        searchTerms: 'vagrant suspend resume sleep save state fast pause vmware fusion',
        description: "Suspending saves the VM's entire RAM state to disk — like closing a laptop lid. Resuming restores it in seconds, with every process still running exactly where it left off. Much faster than a full halt + up cycle. VMware's suspend/resume is particularly efficient on Apple Silicon.",
        parts: [
          { text: 'vagrant suspend', explanation: "saves the VM state to disk and pauses it — VMware Fusion calls this 'suspend'" },
          { text: 'vagrant resume', explanation: 'restores the VM from the saved state — processes, open files, and network connections pick up where they left off' },
        ],
        example: "$ vagrant suspend\n==> default: Saving VM state and suspending execution...\n\n# ... do other things, even reboot your Mac ...\n\n$ vagrant resume\n==> default: Resuming suspended VM...\n==> default: Machine booted and ready!",
        why: "Suspend is the daily workflow command. Start your dev session with 'vagrant resume', end it with 'vagrant suspend'. The VM stays warm between sessions without consuming CPU or significant battery when idle.",
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