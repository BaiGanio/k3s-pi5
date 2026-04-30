// modules/vagrant-parallels-m1.js
// Vagrant on Apple Silicon (M1/M2) with Parallels Desktop

window.commandData = [

  // ── Part 1: Parallels Plugin ──────────────────────────────────────────────

  {
    id: 101,
    section: "plugin",
    sectionTitle: "Part 1 – Install the Parallels Plugin",
    commandTitle: "Install vagrant-parallels plugin",
    command: "vagrant plugin install vagrant-parallels",
    searchTerms: "vagrant plugin install parallels provider arm64 m1 apple silicon",
    description: "Installs the <code>vagrant-parallels</code> plugin, which acts as the bridge between Vagrant and Parallels Desktop. Without it, Vagrant has no idea Parallels exists. Requires Parallels Desktop <strong>Pro or Business</strong> edition — the standard edition does not expose the automation API the plugin needs.",
    parts: [
      { text: "vagrant plugin install", explanation: "downloads and installs a Vagrant plugin from RubyGems into Vagrant's internal plugin directory" },
      { text: "vagrant-parallels", explanation: "the community-maintained provider plugin — registers 'parallels' as a valid --provider value" },
    ],
    example: "Installing the 'vagrant-parallels' plugin. This can take a few minutes...\nInstalled the plugin 'vagrant-parallels (2.4.0)'!",
    why: "Vagrant's default providers are VirtualBox and VMware. On Apple Silicon, VirtualBox does not run at all — Parallels is the native hypervisor. The plugin is the only thing that makes vagrant up --provider parallels work.",
  },

  // ── Part 2: Initialise a Project ─────────────────────────────────────────

  {
    id: 201,
    section: "init",
    sectionTitle: "Part 2 – Initialise a Project",
    commandTitle: "Create a project folder and initialise a box",
    command: "mkdir my-dev-env && cd my-dev-env && vagrant init bento/ubuntu-22.04-arm64",
    searchTerms: "vagrant init bento ubuntu arm64 vagrantfile mkdir project folder",
    description: "Creates a new project directory, enters it, and generates a <code>Vagrantfile</code> pre-configured to use the <code>bento/ubuntu-22.04-arm64</code> box — a clean, minimal Ubuntu 22.04 image compiled for ARM64. This is the critical detail on Apple Silicon: you must use an ARM64 box, not an x86_64 one.",
    parts: [
      { text: "mkdir my-dev-env && cd my-dev-env", explanation: "each Vagrant project lives in its own folder — the Vagrantfile and .vagrant/ state directory both go here" },
      { text: "vagrant init", explanation: "generates a Vagrantfile in the current directory with the named box as the base image" },
      { text: "bento/ubuntu-22.04-arm64", explanation: "the Bento project by Chef — maintained ARM64 images that are regularly updated and well-tested on Parallels" },
    ],
    example: "A `Vagrantfile` has been placed in this directory.\nYou are now ready to `vagrant up --provider parallels`!",
    why: "An x86_64 box on an M1 either refuses to run or runs through an emulation layer at a fraction of native speed. The ARM64 Bento boxes run natively on the Apple Silicon hypervisor — full CPU speed, no translation overhead.",
  },

  // ── Part 3: Start the VM ──────────────────────────────────────────────────

  {
    id: 301,
    section: "startup",
    sectionTitle: "Part 3 – Start the VM",
    commandTitle: "Boot the VM with the Parallels provider",
    command: "vagrant up --provider parallels",
    searchTerms: "vagrant up parallels provider start boot download box arm64",
    description: "Downloads the ARM64 box image if not already cached, creates the Parallels VM, and boots it. On first run this can take a few minutes while the box downloads. Subsequent starts are fast since the box is cached in <code>~/.vagrant.d/boxes/</code>.",
    parts: [
      { text: "vagrant up", explanation: "reads the Vagrantfile, creates the VM if it does not exist, and starts it — runs provisioners on first boot" },
      { text: "--provider parallels", explanation: "explicitly selects Parallels as the hypervisor — you can also set VAGRANT_DEFAULT_PROVIDER=parallels in your shell to avoid typing it every time" },
    ],
    example: "Bringing machine 'default' up with 'parallels' provider...\n==> default: Box 'bento/ubuntu-22.04-arm64' not found. Installing now...\n==> default: Booting VM...\n==> default: Machine booted and ready!",
    why: "Without --provider parallels, Vagrant defaults to VirtualBox and immediately errors on Apple Silicon. Setting the provider explicitly (or via the environment variable) eliminates this footgun.",
  },

  {
    id: 302,
    section: "startup",
    sectionTitle: "Part 3 – Start the VM",
    commandTitle: "SSH into the running VM",
    command: "vagrant ssh",
    searchTerms: "vagrant ssh shell login terminal vm connect",
    description: "Opens an interactive SSH session into the running VM. Vagrant manages the key pair automatically — no passwords, no manual key setup. You land as the <code>vagrant</code> user with passwordless <code>sudo</code>.",
    parts: [
      { text: "vagrant ssh", explanation: "reads the VM's SSH config from .vagrant/machines/default/ and opens a session — works from any subdirectory of the project folder" },
    ],
    example: "Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-91-generic aarch64)\nvagrant@ubuntu-22-04-arm64:~$",
    why: "Notice 'aarch64' in the kernel banner — that confirms you are running a real ARM64 kernel, not emulation. This matters for Node.js native add-ons and any compiled dependency.",
  },

  // ── Part 4: Configure the Vagrantfile ────────────────────────────────────

  {
    id: 401,
    section: "config",
    sectionTitle: "Part 4 – Configure the Vagrantfile",
    commandTitle: "Sync your project folder into the VM",
    command: 'config.vm.synced_folder ".", "/var/www/project"',
    searchTerms: "vagrant synced_folder shared folder code mac linux vm sync edit",
    description: "Adds a synced folder declaration to the Vagrantfile. The <code>.</code> refers to the folder where the Vagrantfile lives (your Mac project root). <code>/var/www/project</code> is where it appears inside the VM. Edit files in VS Code on your Mac — they are instantly available inside the Linux VM without any copying.",
    parts: [
      { text: '"."', explanation: "the host path — relative to the Vagrantfile, so '.' means the project root on your Mac" },
      { text: '"/var/www/project"', explanation: "the guest path — where the folder is mounted inside the Ubuntu VM" },
      { text: "config.vm.synced_folder", explanation: "Vagrant's built-in sync mechanism — uses NFS, SMB, or rsync depending on the provider; Parallels uses Parallels Tools (HGFS)" },
    ],
    example: "# In your Vagrantfile:\nVagrant.configure('2') do |config|\n  config.vm.box = 'bento/ubuntu-22.04-arm64'\n  config.vm.synced_folder '.', '/var/www/project'\nend\n\n# Inside the VM after vagrant reload:\n$ ls /var/www/project\npackage.json  src/  node_modules/",
    why: "This is the core of the 'clean Mac host' philosophy — your source code lives on the Mac (backed up by Time Machine, editable in any IDE), but Node.js, npm, and all runtimes are installed only inside the throwaway VM.",
  },

  {
    id: 402,
    section: "config",
    sectionTitle: "Part 4 – Configure the Vagrantfile",
    commandTitle: "Forward guest ports to the Mac",
    command: 'config.vm.network "forwarded_port", guest: 3000, host: 3000\nconfig.vm.network "forwarded_port", guest: 5432, host: 5432',
    searchTerms: "vagrant forwarded_port port forward network guest host 3000 5432 node postgres",
    description: "Maps ports from inside the VM to your Mac's localhost. Your Express app listening on port 3000 inside the VM becomes reachable at <code>http://localhost:3000</code> on your Mac. Same for PostgreSQL on 5432 — connect with any GUI like TablePlus without changing the host.",
    parts: [
      { text: 'guest: 3000, host: 3000', explanation: "traffic arriving at localhost:3000 on your Mac is tunnelled to port 3000 inside the VM — where your Node.js/Express app listens" },
      { text: 'guest: 5432, host: 5432', explanation: "maps the PostgreSQL default port — lets you connect from Mac-side tools like psql, TablePlus, or DataGrip directly to the VM's Postgres" },
    ],
    example: "# After vagrant reload:\n# On your Mac:\n$ curl http://localhost:3000/api/health\n{\"status\":\"ok\"}\n\n$ psql -h localhost -U devuser -d appdb\npsql (16.3)\nType 'help' for help.\nappdb=#",
    why: "Port forwarding means your Mac browser and database tools work against the VM exactly as they would against a remote server — no special network config, no VPN, no IP address to remember.",
  },

  {
    id: 403,
    section: "config",
    sectionTitle: "Part 4 – Configure the Vagrantfile",
    commandTitle: "Allocate RAM and CPU cores to the VM",
    command: 'config.vm.provider "parallels" do |prl|\n  prl.memory = 8192\n  prl.cpus = 4\nend',
    searchTerms: "vagrant parallels provider memory ram cpu cores performance config",
    description: "Tells the Parallels provider how many resources to give the VM. With 32 GB of unified memory on an M1, allocating 8 GB to the VM leaves the Mac comfortable while giving the VM enough headroom to run Node.js, PostgreSQL, and any build tooling concurrently.",
    parts: [
      { text: 'config.vm.provider "parallels" do |prl|', explanation: "opens a provider-specific config block — settings here only apply when using the Parallels provider" },
      { text: "prl.memory = 8192", explanation: "sets the VM's RAM to 8 GB (in MB) — increase to 16384 for heavier workloads like running tests in parallel" },
      { text: "prl.cpus = 4", explanation: "gives the VM 4 CPU cores — the M1's performance cores are fast enough that 4 vCPUs handle most dev workloads well" },
    ],
    example: "# Full provider block in context:\nconfig.vm.provider 'parallels' do |prl|\n  prl.memory = 8192\n  prl.cpus   = 4\n  prl.name   = 'my-dev-env'  # shown in Parallels Desktop UI\nend",
    why: "Vagrant defaults are conservative (1 GB RAM, 1 CPU). For running a Node.js app, PostgreSQL, and npm install simultaneously you need real resources. Apple Silicon's memory architecture means sharing 8 GB with the VM has almost no impact on Mac-side responsiveness.",
  },

  {
    id: 404,
    section: "config",
    sectionTitle: "Part 4 – Configure the Vagrantfile",
    commandTitle: "Provision Node.js and PostgreSQL automatically",
    command: 'config.vm.provision "shell", inline: <<-SHELL\n  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -\n  apt-get install -y nodejs postgresql postgresql-contrib\n  sudo -u postgres psql -c "CREATE USER devuser WITH PASSWORD \'secret\';"\n  sudo -u postgres psql -c "CREATE DATABASE appdb OWNER devuser;"\nSHELL',
    searchTerms: "vagrant provision shell nodejs postgresql apt-get inline script setup",
    description: "Adds an inline shell provisioner that runs once on first <code>vagrant up</code>. It installs Node.js 18 LTS via the NodeSource repo and PostgreSQL, then creates the application database user and database — so the VM is fully ready with no manual steps.",
    parts: [
      { text: 'config.vm.provision "shell"', explanation: "runs the given shell script as root inside the VM — only executes on the first 'vagrant up', or when you run 'vagrant provision' explicitly" },
      { text: "curl … | bash -", explanation: "adds the NodeSource APT repository for Node.js 18 LTS — same pattern as on a real Ubuntu server" },
      { text: "apt-get install -y nodejs postgresql", explanation: "installs both runtimes in one pass — no interactive prompts (-y confirms everything)" },
      { text: "sudo -u postgres psql -c", explanation: "runs SQL as the postgres superuser to create the app's database role and database" },
    ],
    example: "==> default: Running provisioner: shell...\n==> default: Installing Node.js 18...\n==> default: Setting up postgresql...\n==> default: CREATE ROLE\n==> default: CREATE DATABASE\n\n# Inside the VM after provisioning:\n$ node --version\nv18.20.4\n$ psql -U devuser -d appdb -c 'SELECT NOW();'\n           now\n------------------------\n 2024-11-15 10:30:00+00",
    why: "Provisioning makes the VM self-documenting and reproducible. A new team member runs 'vagrant up' and gets an identical environment in minutes — no README steps, no 'works on my machine' problems, no leftover global packages on the host.",
  },

  // ── Part 5: Day-to-Day Commands ───────────────────────────────────────────

  {
    id: 501,
    section: "daily",
    sectionTitle: "Part 5 – Day-to-Day Commands",
    commandTitle: "Reload the VM after Vagrantfile changes",
    command: "vagrant reload",
    searchTerms: "vagrant reload restart apply vagrantfile changes config port sync",
    description: "Gracefully restarts the VM and re-applies the Vagrantfile — picks up new port forwards, synced folder changes, and resource config without destroying the VM or its installed packages.",
    parts: [
      { text: "vagrant reload", explanation: "equivalent to vagrant halt followed by vagrant up — preserves the VM's disk state" },
    ],
    example: "==> default: Attempting graceful shutdown of VM...\n==> default: Booting VM...\n==> default: Forwarding ports...\n    default: 3000 (guest) => 3000 (host)\n    default: 5432 (guest) => 5432 (host)\n==> default: Machine booted and ready!",
    why: "Use reload any time you change port forwarding, memory allocation, or synced folder config. It is faster than destroy + up and keeps everything you installed inside the VM intact.",
  },

  {
    id: 502,
    section: "daily",
    sectionTitle: "Part 5 – Day-to-Day Commands",
    commandTitle: "Suspend and resume the VM",
    command: "vagrant suspend && vagrant resume",
    searchTerms: "vagrant suspend resume sleep save state fast pause",
    description: "Suspending saves the VM's entire RAM state to disk — like closing a laptop lid. Resuming restores it in seconds, with every process still running exactly where it left off. Much faster than a full halt + up cycle.",
    parts: [
      { text: "vagrant suspend", explanation: "saves the VM state to disk and pauses it — Parallels Desktop calls this 'save state'" },
      { text: "vagrant resume", explanation: "restores the VM from the saved state — processes, open files, and network connections pick up where they left off" },
    ],
    example: "$ vagrant suspend\n==> default: Saving VM state and suspending execution...\n\n# ... do other things, even reboot your Mac ...\n\n$ vagrant resume\n==> default: Resuming suspended VM...\n==> default: Machine booted and ready!\n\n# Your Node.js app is still running inside:",
    why: "Suspend is the daily workflow command. Start your dev session with 'vagrant resume', end it with 'vagrant suspend'. The VM stays warm between sessions without consuming CPU or significant battery when idle.",
  },

  {
    id: 503,
    section: "daily",
    sectionTitle: "Part 5 – Day-to-Day Commands",
    commandTitle: "Check VM status",
    command: "vagrant status && vagrant global-status",
    searchTerms: "vagrant status global running stopped saved machines list all",
    description: "<code>vagrant status</code> shows the state of the VM in the current project folder. <code>vagrant global-status</code> lists every Vagrant-managed VM on your machine across all project directories — useful when you have multiple environments and can't remember what's running.",
    parts: [
      { text: "vagrant status", explanation: "reads the .vagrant/ directory in the current folder and reports that VM's state" },
      { text: "vagrant global-status", explanation: "queries Vagrant's global index (~/.vagrant.d/data/machine-index/) — shows all VMs regardless of current directory" },
    ],
    example: "$ vagrant status\nCurrent machine states:\ndefault                   running (parallels)\n\n$ vagrant global-status\nid       name     provider    state    directory\n-----------------------------------------------------------\na1b2c3d  default  parallels   running  /Users/you/my-dev-env\ne4f5a6b  default  parallels   saved    /Users/you/other-project",
    why: "global-status is the answer to 'which VMs are eating my RAM right now?' — especially useful when you have a suspended VM from last week and wonder why your Mac is sluggish.",
  },

  {
    id: 504,
    section: "daily",
    sectionTitle: "Part 5 – Day-to-Day Commands",
    commandTitle: "Destroy the VM completely",
    command: "vagrant destroy --force",
    searchTerms: "vagrant destroy force delete remove vm disk clean reset",
    description: "Stops and permanently deletes the VM and its virtual disk. The Vagrantfile is untouched — run <code>vagrant up --provider parallels</code> again to get a brand-new identical VM. The box image stays cached so the next boot is fast.",
    parts: [
      { text: "vagrant destroy", explanation: "deletes the VM's virtual disk and removes it from Parallels — reclaims disk space immediately" },
      { text: "--force", explanation: "skips the 'Are you sure?' confirmation prompt — useful in scripts" },
    ],
    example: "==> default: Stopping the machine...\n==> default: Deleting the machine...\n\n# Start fresh:\n$ vagrant up --provider parallels\n==> default: Machine booted and ready!\n# Brand new VM, fully provisioned",
    why: "Destroy is the nuclear reset button. If the VM gets into a bad state, destroy + up gives you a provably clean environment in minutes. This is the power of treating infrastructure as disposable code rather than a precious snowflake.",
  },

  // ── Part 6: Full Vagrantfile Example ─────────────────────────────────────

  {
    id: 601,
    section: "vagrantfile",
    sectionTitle: "Part 6 – Complete Vagrantfile",
    commandTitle: "Full Vagrantfile for Node.js + PostgreSQL on M1",
    command: 'cat Vagrantfile',
    searchTerms: "vagrantfile complete full example node postgres m1 arm64 parallels synced port provision",
    description: "A complete, production-ready Vagrantfile for Apple Silicon that wires together everything from the previous steps: ARM64 box, Parallels provider with 8 GB RAM, synced folder, port forwarding for Node.js and PostgreSQL, and a shell provisioner that installs the full stack automatically.",
    parts: [
      { text: 'config.vm.box = "bento/ubuntu-22.04-arm64"', explanation: "the ARM64 base image — mandatory for native performance on M1/M2" },
      { text: 'config.vm.synced_folder ".", "/var/www/project"', explanation: "your Mac project root appears inside the VM at this path — edit on Mac, run in Linux" },
      { text: 'config.vm.network "forwarded_port"', explanation: "one line per port — lets Mac-side browsers and DB tools reach VM services transparently" },
      { text: 'prl.memory = 8192', explanation: "8 GB RAM — enough for Node.js app + PostgreSQL + background services without taxing the Mac" },
      { text: 'config.vm.provision "shell"', explanation: "runs once on first boot — installs Node.js, Postgres, creates DB user and database" },
    ],
    example: "Vagrant.configure('2') do |config|\n\n  config.vm.box = 'bento/ubuntu-22.04-arm64'\n\n  # Resources\n  config.vm.provider 'parallels' do |prl|\n    prl.name   = 'node-postgres-dev'\n    prl.memory = 8192\n    prl.cpus   = 4\n  end\n\n  # Code sync\n  config.vm.synced_folder '.', '/var/www/project'\n\n  # Port forwarding\n  config.vm.network 'forwarded_port', guest: 3000, host: 3000  # Express\n  config.vm.network 'forwarded_port', guest: 5432, host: 5432  # PostgreSQL\n\n  # Provisioning\n  config.vm.provision 'shell', inline: <<-SHELL\n    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -\n    apt-get install -y nodejs postgresql postgresql-contrib\n    sudo -u postgres psql -c \"CREATE USER devuser WITH PASSWORD 'secret';\"\n    sudo -u postgres psql -c \"CREATE DATABASE appdb OWNER devuser;\"\n    cd /var/www/project && npm install\n  SHELL\n\nend",
    why: "This Vagrantfile is the single source of truth for the environment. Commit it to your repo and every developer — on any machine with Vagrant + Parallels — gets an identical Linux box with zero manual setup. The Mac host stays completely free of Node versions, global npm packages, and Postgres installations.",
  },

];