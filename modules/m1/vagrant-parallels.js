// modules/m1/vagrant-parallels.js (BGAPI rework)
// Vagrant + Parallels on Apple Silicon — two-VM dev environment for BGAPI
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
        By the end you will have two named VMs — <code>bgapi</code> (.NET 10 Web API) and
        <code>sqlserver</code> (Microsoft SQL Server 2022) — both defined in a single
        <code>Vagrantfile</code> and brought up with one command.
      </p>
      <p>
        <strong>Why this approach?</strong><br>
        Vagrant provides a declarative, version-controlled interface to VM provisioning: the Vagrantfile is plain Ruby DSL checked into your repo, so any team member — or a fresh machine — can reproduce the exact same environment with vagrant up.<br> Under the hood, Vagrant talks to a provider (here, Parallels) via its plugin API to create, snapshot, and destroy VMs, and to a provisioner (shell scripts, Ansible, etc.) to configure what runs inside them. This separation of concerns means you can swap the provisioner or even the provider without rewriting your environment definition.<br> Running workloads inside isolated VMs also gives you proper process and network namespace separation — something Docker alone does not give you — which matters when you need to simulate a realistic multi-host topology (an API tier talking to a database tier over a private network) without polluting your host OS.
      </p>
      <p>
        <strong>Why not VirtualBox?</strong><br>
        VirtualBox relies on kernel extensions (kexts) to interface with the hypervisor layer. Apple Silicon Macs run on ARM64 and ship with Apple Hypervisor.framework as the sole officially supported virtualization interface.<br> VirtualBox has no production-ready ARM64 port and its kext model is incompatible with the security architecture of macOS on Apple Silicon. In practice this means VirtualBox either refuses to install, crashes on boot, or runs x86 guest images through binary translation at a steep performance penalty — none of which is acceptable for day-to-day development.
      </p>
      <p><strong>Prerequisites</strong></p>
      <ul>
        <li>Parallels Desktop <strong>Pro or Business</strong> edition (Standard does not expose the automation API Vagrant needs)</li>
        <li>~15 GB free disk space for the two box images and VM disks</li>
        <li>Network access to <code>dev.azure.com</code> with permission to clone the BGAPI repository</li>
      </ul>
      <p>
        The Mac host stays completely clean — no .NET SDK, no SQL Server, no global tooling.<br>
        Every runtime lives inside disposable VMs that can be destroyed and rebuilt in minutes.
      </p>
    `,
  },

  // ── Two-VM architecture overview ─────────────────────────────────────────

  {
    type: 'prose',
    title: 'Two-VM architecture at a glance',
    content: `
      <p>
        The environment is two VMs, declared together in one Vagrantfile and brought up
        together with one command:
      </p>
      <ul>
        <li><strong><code>bgapi</code></strong> — ARM64 Ubuntu 24.04, runs the .NET 10 Web API
            on port <code>62010</code>. Static private IP <code>192.168.56.10</code>.</li>
        <li><strong><code>sqlserver</code></strong> — x86_64 Ubuntu 22.04, runs SQL Server 2022
            on port <code>1433</code> with three databases: <em>Geography</em> and <em>TechCorp</em>
            (seeded from BGAPI's <code>Docs/sql/</code> scripts) and <em>bgapi-local</em>
            (created by EF Core migrations on first API startup). Static private IP
            <code>192.168.56.20</code>.</li>
      </ul>
      <p>
        The two VMs talk to each other over a Vagrant <em>private network</em>
        (<code>192.168.56.x</code>). Your Mac reaches both through Vagrant's
        <em>forwarded ports</em>: <code>http://localhost:62010/swagger</code> hits the API,
        <code>localhost:1433</code> hits SQL Server.
      </p>
      <p>
        Each VM is configured entirely by its <code>config.vm.provision "shell"</code> block in
        the Vagrantfile. Nothing is set up manually — <code>vagrant up --provider parallels</code>
        installs SQL Server, seeds the reference databases, installs the .NET 10 SDK, and prepares
        the API VM end-to-end. The per-VM sections later in this module are an inspection tour
        of <em>what the provisioner did</em>, not a separate manual workflow.
      </p>
    `,
  },

  // ── Architecture note: mixed-arch trade-off ───────────────────────────────

  {
    type: 'note',
    variant: 'info',
    content: '<strong>Mixed-architecture topology.</strong> The <code>bgapi</code> VM uses an <strong>ARM64</strong> Ubuntu box so .NET 10 runs natively at full Apple Silicon speed. The <code>sqlserver</code> VM uses an <strong>x86_64</strong> Ubuntu box because Microsoft only ships SQL Server for Linux as an x86_64 package — there is no native ARM64 build outside of preview container images. Parallels emulates x86_64 on Apple Silicon for the database VM; this is slower than native but works reliably for local development, and mirrors how the project ships in <code>docker-compose.yml</code> (which also pins the MSSQL image to <code>linux/amd64</code>).',
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

  // ── Step 3: The complete Vagrantfile (front-loaded) ──────────────────────

  {
    type: 'note',
    variant: 'tip',
    content: 'The Vagrantfile below is the <strong>single source of truth</strong> for the entire two-VM environment. Drop it into a fresh project folder, run <code>vagrant up --provider parallels</code>, and both VMs are built and configured end-to-end. Every later section in this module simply <em>inspects</em> what this file already provisioned.',
  },

  {
    type: 'commands',
    section: 'vagrantfile',
    sectionTitle: 'Create the project and the Vagrantfile',
    items: [
      {
        id: 201,
        commandTitle: 'Create a project folder',
        command: 'mkdir bgapi-dev && cd bgapi-dev',
        searchTerms: 'mkdir cd project folder bgapi vagrant init',
        description: 'Creates a dedicated folder for the Vagrantfile and its <code>.vagrant/</code> state directory. Everything in this module is done from this folder.',
        parts: [
          { text: 'mkdir bgapi-dev', explanation: 'each Vagrant project lives in its own folder — keeps state isolated from any other Vagrant projects you have' },
          { text: 'cd bgapi-dev', explanation: 'all vagrant commands operate on the Vagrantfile in the current directory' },
        ],
        example: "$ mkdir bgapi-dev && cd bgapi-dev\n$ pwd\n/Users/you/bgapi-dev",
        why: "A clean, empty folder makes the next step (writing the Vagrantfile) unambiguous — there is no existing Vagrantfile, .vagrant/ directory, or boxes to conflict with.",
      },
      {
        id: 202,
        commandTitle: 'Write the complete two-VM Vagrantfile',
        command: "cat > Vagrantfile <<'VAGRANTFILE'",
        searchTerms: 'vagrantfile complete two vm bgapi sqlserver dotnet mssql provision private network port forward',
        description: 'Starts a shell heredoc that writes the Vagrantfile to disk. Run the command above, then <strong>copy the full Vagrantfile content from Example output below</strong> and paste it into the terminal — the closing <code>VAGRANTFILE</code> line is included in the copy, so just press Enter once after pasting. The file declares both VMs (<code>sqlserver</code> first, because <code>bgapi</code> depends on it being reachable), each with its own box, hostname, private-network IP, port forward, and provisioning script.',
        parts: [
          { text: "config.vm.define 'sqlserver'", explanation: 'declares the database VM — gets its own box, network, and shell provisioner; declared first so vagrant up boots it first' },
          { text: "config.vm.define 'bgapi'", explanation: 'declares the API VM — different box (ARM64), different provisioner (installs the .NET SDK and writes connection strings)' },
          { text: "db.vm.hostname / web.vm.hostname", explanation: 'Vagrant sets the OS hostname at boot from this value — no need to run hostnamectl manually inside the VM' },
          { text: "private_network ip: ...", explanation: 'static IPs on the Vagrant private network — bgapi (192.168.56.10) talks to sqlserver (192.168.56.20) over this isolated link' },
          { text: "forwarded_port", explanation: '62010 → Swagger UI, 1433 → SQL Server for Mac-side GUI tools — both reachable as localhost:* on your Mac' },
          { text: "synced_folder '.', '/vagrant'", explanation: 'mounts bgapi-dev/ inside each VM at /vagrant — that is how the SQL Server provisioner finds the seed scripts from the BGAPI repo' },
        ],
        example: "Vagrant.configure('2') do |config|\n\n  # ── sqlserver: SQL Server 2022 + Geography/TechCorp seed ──\n  config.vm.define 'sqlserver' do |db|\n    db.vm.box      = 'bento/ubuntu-22.04'        # x86_64 (emulated on Apple Silicon)\n    db.vm.hostname = 'sqlserver'\n\n    db.vm.provider 'parallels' do |prl|\n      prl.name   = 'sqlserver'\n      prl.memory = 4096\n      prl.cpus   = 2\n    end\n\n    db.vm.network 'private_network', ip: '192.168.56.20'\n    db.vm.network 'forwarded_port',  guest: 1433, host: 1433\n    # Mounts the bgapi-dev folder at /vagrant. Put the BGAPI repo here so\n    # Docs/sql/geography.sql + company.sql are visible to the provisioner.\n    db.vm.synced_folder '.', '/vagrant'\n\n    db.vm.provision 'shell', inline: <<-SHELL\n      set -e\n      curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \\\n        | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg\n      curl -fsSL https://packages.microsoft.com/config/ubuntu/22.04/mssql-server-2022.list \\\n        -o /etc/apt/sources.list.d/mssql-server-2022.list\n      curl -fsSL https://packages.microsoft.com/config/ubuntu/22.04/prod.list \\\n        -o /etc/apt/sources.list.d/mssql-tools.list\n      apt-get update\n      MSSQL_SA_PASSWORD='YourStrong!Passw0rd' MSSQL_PID='Developer' ACCEPT_EULA='Y' \\\n        apt-get install -y mssql-server\n      ACCEPT_EULA=Y apt-get install -y mssql-tools18 unixodbc-dev\n      /opt/mssql/bin/mssql-conf set network.ipaddress 0.0.0.0\n      systemctl restart mssql-server\n      sleep 15\n      SQLCMD=/opt/mssql-tools18/bin/sqlcmd\n      if [ -f /vagrant/BGAPI/Docs/sql/geography.sql ]; then\n        $SQLCMD -S localhost -U sa -P 'YourStrong!Passw0rd' -C \\\n          -i /vagrant/BGAPI/Docs/sql/geography.sql\n        $SQLCMD -S localhost -U sa -P 'YourStrong!Passw0rd' -C \\\n          -i /vagrant/BGAPI/Docs/sql/company.sql\n      else\n        echo 'WARN: BGAPI repo not found at /vagrant/BGAPI — clone it on the host'\n        echo '      and re-run: vagrant provision sqlserver'\n      fi\n    SHELL\n  end\n\n  # ── bgapi: .NET 10 Web API ──\n  config.vm.define 'bgapi' do |web|\n    web.vm.box      = 'bento/ubuntu-24.04-arm64' # native ARM64 on Apple Silicon\n    web.vm.hostname = 'bgapi'\n\n    web.vm.provider 'parallels' do |prl|\n      prl.name   = 'bgapi'\n      prl.memory = 2048\n      prl.cpus   = 2\n    end\n\n    web.vm.network 'private_network', ip: '192.168.56.10'\n    web.vm.network 'forwarded_port',  guest: 62010, host: 62010\n    web.vm.synced_folder '.', '/vagrant'\n\n    web.vm.provision 'shell', inline: <<-SHELL\n      set -e\n      apt-get update\n      apt-get install -y dotnet-sdk-10.0 git\n\n      # Connection strings match docker-compose.yml — same SA password,\n      # same database names, only Server= points at the sqlserver VM.\n      cat > /etc/profile.d/bgapi.sh <<'ENV'\nexport ASPNETCORE_URLS='http://+:62010'\nexport ASPNETCORE_ENVIRONMENT='Development'\nexport ConnectionStrings__dbconn='Server=192.168.56.20,1433;Initial Catalog=bgapi-local;TrustServerCertificate=True;Integrated Security=False;User ID=sa;Password=YourStrong!Passw0rd;'\nexport ConnectionStrings__geography_dbconn='Server=192.168.56.20,1433;Initial Catalog=Geography;TrustServerCertificate=True;Integrated Security=False;User ID=sa;Password=YourStrong!Passw0rd;'\nexport ConnectionStrings__company_dbconn='Server=192.168.56.20,1433;Initial Catalog=TechCorp;TrustServerCertificate=True;Integrated Security=False;User ID=sa;Password=YourStrong!Passw0rd;'\nENV\n      chmod +x /etc/profile.d/bgapi.sh\n    SHELL\n  end\n\nend\nVAGRANTFILE",
        why: "Front-loading the full Vagrantfile makes the topology obvious from line one: two VMs, each with its own box, hostname, and provisioner. Every command in the rest of this module is something the provisioner inside this file already runs — the later sections only explain what it does.",
      },
      {
        id: 203,
        commandTitle: 'Clone the BGAPI repository into the project folder',
        command: 'git clone https://teamkepler@dev.azure.com/teamkepler/BGAPI/_git/BGAPI ./BGAPI',
        searchTerms: 'git clone azure devops bgapi teamkepler repo synced folder vagrant',
        description: 'Clones BGAPI <strong>on your Mac</strong> into <code>bgapi-dev/BGAPI/</code>. The Vagrantfile mounts the project folder into each VM at <code>/vagrant</code>, so the repo ends up at <code>/vagrant/BGAPI</code> inside both machines — that is where the sqlserver provisioner reads <code>Docs/sql/geography.sql</code> and <code>company.sql</code> from. Azure DevOps prompts for a Personal Access Token on first clone; create one at <em>dev.azure.com → User Settings → Personal access tokens</em> with <strong>Code (Read)</strong> scope.',
        parts: [
          { text: 'git clone', explanation: 'creates a full local copy of the remote repository including its full history' },
          { text: 'https://teamkepler@dev.azure.com/.../BGAPI', explanation: 'the Azure DevOps HTTPS clone URL — the embedded "teamkepler@" hints to git which org-scoped credential to use against the credential helper' },
          { text: './BGAPI', explanation: 'clone into bgapi-dev/BGAPI/ so the synced folder inside the VMs surfaces it at /vagrant/BGAPI' },
        ],
        example: "Cloning into './BGAPI'...\nPassword for 'https://teamkepler@dev.azure.com': <paste PAT here>\nremote: Azure Repos\nreceiving objects: 100% (4827/4827), 12.4 MiB | 6.2 MiB/s, done.\n\n$ ls BGAPI\nAPIs/  BGAPI.sln  Core/  Directory.Packages.props  Docs/  Infrastructure/  README.md  docker-compose.yml",
        why: "Cloning on the Mac (not inside a VM) avoids stashing an Azure DevOps PAT inside disposable VMs. The synced folder still makes the repo available everywhere it needs to be — the sqlserver provisioner reads the seed SQL, and the bgapi VM runs the API straight from /vagrant/BGAPI.",
      },
    ],
  },

  // ── Step 4: Boot both VMs ────────────────────────────────────────────────

  {
    type: 'commands',
    section: 'startup',
    sectionTitle: 'Boot both VMs',
    items: [
      {
        id: 301,
        commandTitle: 'Boot both VMs with the Parallels provider',
        command: 'vagrant up --provider parallels',
        searchTerms: 'vagrant up parallels provider start boot download box bgapi sqlserver',
        description: 'Reads the Vagrantfile, downloads both box images if not already cached, and brings up both VMs in declaration order: <code>sqlserver</code> first, then <code>bgapi</code>. Each VM\'s shell provisioner runs once on first boot — the sqlserver one installs SQL Server and runs the seed scripts, the bgapi one installs the .NET 10 SDK and writes the connection-string env file. On first run the whole sequence is ~10–15 minutes; subsequent <code>vagrant up</code> calls (after <code>halt</code> or <code>suspend</code>) skip provisioning and boot in under a minute.',
        parts: [
          { text: 'vagrant up', explanation: 'reads the Vagrantfile, creates each VM if it does not exist, starts it, and runs the provisioners on first boot' },
          { text: '--provider parallels', explanation: "explicitly selects Parallels as the hypervisor — you can also set VAGRANT_DEFAULT_PROVIDER=parallels in your shell to avoid typing it every time" },
        ],
        example: "Bringing machine 'sqlserver' up with 'parallels' provider...\n==> sqlserver: Box 'bento/ubuntu-22.04' not found. Installing now...\n==> sqlserver: Setting hostname...\n==> sqlserver: Running provisioner: shell...\n    sqlserver: Installing mssql-server (Developer edition)...\n    sqlserver: Seeding Geography database from /vagrant/BGAPI/Docs/sql/geography.sql\n    sqlserver: Seeding TechCorp database from /vagrant/BGAPI/Docs/sql/company.sql\n==> sqlserver: Machine booted and ready!\n\nBringing machine 'bgapi' up with 'parallels' provider...\n==> bgapi: Box 'bento/ubuntu-24.04-arm64' not found. Installing now...\n==> bgapi: Setting hostname...\n==> bgapi: Running provisioner: shell...\n    bgapi: Installing dotnet-sdk-10.0...\n    bgapi: Writing /etc/profile.d/bgapi.sh\n==> bgapi: Machine booted and ready!",
        why: "Without --provider parallels, Vagrant defaults to VirtualBox and immediately errors on Apple Silicon. Setting the provider explicitly (or via the environment variable) eliminates this footgun.",
      },
      {
        id: 302,
        commandTitle: 'SSH into either VM',
        command: 'vagrant ssh bgapi   # or: vagrant ssh sqlserver',
        searchTerms: 'vagrant ssh shell login terminal vm connect bgapi sqlserver',
        description: 'Opens an interactive SSH session into the named VM. With more than one VM defined, the name argument is mandatory — <code>vagrant ssh</code> on its own errors with "multiple machines defined". You land as the <code>vagrant</code> user with passwordless <code>sudo</code>, and the prompt shows the hostname Vagrant set from the Vagrantfile.',
        parts: [
          { text: 'vagrant ssh bgapi', explanation: 'targets the bgapi machine — Vagrant reads .vagrant/machines/bgapi/ for the SSH config and opens the session' },
          { text: 'vagrant ssh sqlserver', explanation: 'same idea for the database VM — different SSH key, different port forwarding, totally separate machine' },
        ],
        example: "$ vagrant ssh bgapi\nWelcome to Ubuntu 24.04 LTS (GNU/Linux 6.8.0-generic aarch64)\nvagrant@bgapi:~$\n\n$ vagrant ssh sqlserver\nWelcome to Ubuntu 22.04.4 LTS (GNU/Linux 5.15.0-generic x86_64)\nvagrant@sqlserver:~$",
        why: "Notice 'aarch64' on the bgapi VM (native ARM64 — full speed for .NET) and 'x86_64' on the sqlserver VM (emulated — slower but the only option for SQL Server on Linux). The architecture banner confirms each VM is running the kernel you expected.",
      },
    ],
  },

  // ── Step 5: Inspect the bgapi VM ─────────────────────────────────────────

  {
    type: 'prose',
    title: 'Inside the bgapi VM',
    content: `
      <p>
        The next few commands are run <strong>after <code>vagrant ssh bgapi</code></strong>.
        They inspect what the provisioner already did and start the API from source — none of
        this re-installs anything; the SDK is already on disk and the connection strings are
        already in <code>/etc/profile.d/bgapi.sh</code>.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'bgapi',
    sectionTitle: 'Run BGAPI from source on the bgapi VM',
    items: [
      {
        id: 401,
        commandTitle: 'Verify the .NET 10 SDK is installed',
        command: 'dotnet --version && dotnet --list-runtimes',
        searchTerms: 'dotnet version list runtimes verify sdk installed bgapi arm64',
        description: 'Confirms the provisioner installed <code>dotnet-sdk-10.0</code> from Ubuntu 24.04\'s main repo. Ubuntu now ships the .NET SDK directly — no Microsoft package repo configuration, no <code>packages-microsoft-prod.deb</code> dance.',
        parts: [
          { text: 'dotnet --version', explanation: 'prints the SDK version — confirms the CLI is on PATH and resolves the right SDK' },
          { text: 'dotnet --list-runtimes', explanation: 'shows the installed runtimes — Microsoft.AspNetCore.App is the one BGAPI runs on' },
        ],
        example: "$ dotnet --version\n10.0.100\n$ dotnet --list-runtimes\nMicrosoft.AspNetCore.App 10.0.0 [/usr/lib/dotnet/shared/Microsoft.AspNetCore.App]\nMicrosoft.NETCore.App 10.0.0 [/usr/lib/dotnet/shared/Microsoft.NETCore.App]",
        why: "If this prints versions you are done — no install needed. If you ever destroy the VM and rebuild it (vagrant destroy bgapi && vagrant up bgapi), the same provisioner runs again and the SDK comes back identically.",
      },
      {
        id: 402,
        commandTitle: 'Confirm the connection strings point at sqlserver',
        command: 'cat /etc/profile.d/bgapi.sh',
        searchTerms: 'connection strings env profile bgapi.sh aspnetcore sqlserver 192.168.56.20',
        description: 'Prints the env file the provisioner wrote. Every shell login (including <code>vagrant ssh bgapi</code>) sources <code>/etc/profile.d/*.sh</code>, so <code>$ConnectionStrings__dbconn</code> and friends are already in your environment. They point at <code>192.168.56.20,1433</code> — the static private-network IP of the <code>sqlserver</code> VM.',
        parts: [
          { text: 'ConnectionStrings__dbconn', explanation: 'ASP.NET Core maps double-underscore env vars to nested JSON keys — this maps to ConnectionStrings:dbconn in appsettings.json' },
          { text: 'Server=192.168.56.20,1433', explanation: 'the sqlserver VM, reachable across the Vagrant private network — comma-separated host,port is the SQL Server convention' },
          { text: 'three connection strings', explanation: 'one per EF Core DbContext: BGAPIDbContext (bgapi-local), GeographyDbContext (Geography), CompanyDbContext (TechCorp)' },
        ],
        example: "export ASPNETCORE_URLS='http://+:62010'\nexport ASPNETCORE_ENVIRONMENT='Development'\nexport ConnectionStrings__dbconn='Server=192.168.56.20,1433;Initial Catalog=bgapi-local;...'\nexport ConnectionStrings__geography_dbconn='Server=192.168.56.20,1433;Initial Catalog=Geography;...'\nexport ConnectionStrings__company_dbconn='Server=192.168.56.20,1433;Initial Catalog=TechCorp;...'",
        why: "Hard-coding connection strings into appsettings.json would force you to edit checked-in files; environment variables override JSON config at runtime with no source modifications. Same mechanism docker-compose uses; same mechanism Azure App Service uses in production.",
      },
      {
        id: 403,
        commandTitle: 'Sanity-check that bgapi can reach sqlserver',
        command: 'getent hosts 192.168.56.20 || nc -zv 192.168.56.20 1433',
        searchTerms: 'network connectivity sqlserver 192.168.56.20 1433 verify private network nc netcat',
        description: 'Confirms the API VM can open a TCP connection to the database VM on port 1433. If this fails, the private network is mis-configured in the Vagrantfile or the sqlserver VM is not running.',
        parts: [
          { text: 'nc -zv 192.168.56.20 1433', explanation: 'netcat in scan mode (-z) with verbose output (-v) — succeeds if the port accepts a TCP handshake' },
        ],
        example: "$ nc -zv 192.168.56.20 1433\nConnection to 192.168.56.20 1433 port [tcp/ms-sql-s] succeeded!",
        why: "This is the fastest single-line check that the two-VM topology is working. If it fails, fix it before trying to run the API — every BGAPI request would otherwise error out with a SqlException.",
      },
      {
        id: 404,
        commandTitle: 'Restore packages and run the API',
        command: 'cd /vagrant/BGAPI/APIs/BGAPI && dotnet restore && dotnet run --no-launch-profile',
        searchTerms: 'dotnet restore run build bgapi api start launch web kestrel 62010 vagrant synced folder',
        description: 'Restores NuGet packages declared in <code>Directory.Packages.props</code>, then starts the BGAPI web host from the synced folder. <code>--no-launch-profile</code> tells the runtime to ignore <code>Properties/launchSettings.json</code> and obey the <code>ASPNETCORE_URLS</code> env var instead, so Kestrel binds to <code>http://+:62010</code> on every interface (reachable from the Mac through port-forwarding). EF Core migrations for the <code>bgapi-local</code> database run automatically on first startup.',
        parts: [
          { text: 'cd /vagrant/BGAPI/APIs/BGAPI', explanation: 'the runnable Web API project — synced from your Mac, so dotnet watch can recompile when you edit files in your IDE on the host' },
          { text: 'dotnet restore', explanation: 'pulls every NuGet package listed in Directory.Packages.props into ~/.nuget/packages — only needs to run when dependencies change' },
          { text: 'dotnet run --no-launch-profile', explanation: 'compiles and starts the host; without --no-launch-profile, Kestrel would bind to https://localhost:44364 from launchSettings.json and would not be reachable from the Mac' },
        ],
        example: "$ dotnet restore\n  Determining projects to restore...\n  Restored /vagrant/BGAPI/APIs/BGAPI/BGAPI.csproj (in 8.3 sec)\n$ dotnet run --no-launch-profile\ninfo: Microsoft.EntityFrameworkCore.Migrations[20402]\n      Applying migration '20250403_InitialCreate' to bgapi-local.\ninfo: Microsoft.Hosting.Lifetime[14]\n      Now listening on: http://[::]:62010\ninfo: Microsoft.Hosting.Lifetime[0]\n      Application started. Press Ctrl+C to shut down.",
        why: "Running the API outside of Docker is the supported 'Run from source' path documented in BGAPI's README — it gives you live recompilation with <code>dotnet watch</code>, a real debugger over SSH, and visibility into Serilog output. The synced folder means edits on your Mac are immediately picked up.",
      },
    ],
  },

  // ── Step 6: Inspect the sqlserver VM ─────────────────────────────────────

  {
    type: 'prose',
    title: 'Inside the sqlserver VM',
    content: `
      <p>
        The next few commands are run <strong>after <code>vagrant ssh sqlserver</code></strong>.
        They inspect the SQL Server install and the two seeded reference databases. Everything
        here was set up by the <code>sqlserver</code> provisioner during <code>vagrant up</code>
        — these commands only verify the state, they do not re-install or re-seed anything.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'sqlserver',
    sectionTitle: 'Inspect SQL Server on the sqlserver VM',
    items: [
      {
        id: 501,
        commandTitle: 'Verify SQL Server is running and accepting connections',
        command: "systemctl status mssql-server --no-pager && /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'YourStrong!Passw0rd' -C -Q 'SELECT @@VERSION'",
        searchTerms: 'systemctl status mssql-server sqlcmd select version running active verify',
        description: 'Confirms the <code>mssql-server</code> systemd unit is active, then opens a quick connection as <code>sa</code> and runs <code>SELECT @@VERSION</code>. Installed edition is <strong>Developer</strong> — free for non-production use, full feature parity with Enterprise.',
        parts: [
          { text: 'systemctl status mssql-server', explanation: 'systemd state — should report "active (running)"; if it says "failed", check journalctl -u mssql-server' },
          { text: 'sqlcmd -C', explanation: 'trust the server certificate — required because SQL Server on Linux ships with a self-signed cert by default' },
          { text: '-Q "SELECT @@VERSION"', explanation: 'execute one query and exit — confirms both authentication and the engine itself are healthy' },
        ],
        example: "● mssql-server.service - Microsoft SQL Server Database Engine\n     Active: active (running)\n\nMicrosoft SQL Server 2022 (RTM-CU14) - 16.0.4xxx.x (X64) on Linux (Ubuntu 22.04.4 LTS)",
        why: "The provisioner installs mssql-server in unattended mode using MSSQL_SA_PASSWORD / MSSQL_PID / ACCEPT_EULA env vars. If this command works, every part of that installer succeeded — EULA accepted, SA password set, engine started, network listener bound.",
      },
      {
        id: 502,
        commandTitle: 'Confirm the Geography and TechCorp databases were seeded',
        command: "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'YourStrong!Passw0rd' -C -Q 'SELECT name FROM sys.databases'",
        searchTerms: 'sqlcmd sys.databases geography techcorp seeded list databases reference data',
        description: 'Lists every database on the instance. Apart from the four built-in system databases (<code>master</code>, <code>tempdb</code>, <code>model</code>, <code>msdb</code>) you should see <em>Geography</em> and <em>TechCorp</em>, both populated by the provisioner from the SQL scripts shipped in BGAPI\'s <code>Docs/sql/</code>.',
        parts: [
          { text: 'sys.databases', explanation: 'the system catalog view that lists every database on the instance — the canonical way to enumerate what is on a SQL Server' },
        ],
        example: "name\n-----------\nmaster\ntempdb\nmodel\nmsdb\nGeography\nTechCorp\n\n# Spot-check Geography:\n$ sqlcmd -S localhost -U sa -P 'YourStrong!Passw0rd' -C -d Geography -Q 'SELECT TOP 5 Name FROM Countries'\nName\n--------------\nAfghanistan\nAlbania\nAlgeria\nAndorra\nAngola",
        why: "BGAPI's README documents this split: 'data we own' (the bgapi-local schema) lives in EF Core migrations that run on API startup, while 'data we receive' (Geography, TechCorp) ships as raw .sql scripts. Seeing both reference DBs here proves the provisioner found Docs/sql/*.sql through the synced folder at /vagrant/BGAPI/Docs/sql/ and replayed them successfully.",
      },
      {
        id: 503,
        commandTitle: 'Confirm SQL Server is listening on the private-network interface',
        command: "ss -tlnp | grep 1433",
        searchTerms: 'ss netstat listen port 1433 mssql network ipaddress 0.0.0.0 remote',
        description: 'Confirms SQL Server is bound to <code>0.0.0.0:1433</code>, not just loopback. The provisioner set this via <code>mssql-conf set network.ipaddress 0.0.0.0</code> — combined with the Vagrant private network, this is what lets the <code>bgapi</code> VM connect across to <code>192.168.56.20:1433</code>.',
        parts: [
          { text: 'ss -tlnp', explanation: 'modern replacement for netstat — lists listening TCP sockets with the process holding each one' },
          { text: '0.0.0.0:1433', explanation: 'bound to every interface, including the private-network IP — required for remote connections from the bgapi VM' },
        ],
        example: "LISTEN 0  4096  0.0.0.0:1433  0.0.0.0:*  users:((\"sqlservr\",pid=1234))",
        why: "If this shows 127.0.0.1:1433 instead of 0.0.0.0:1433, the bgapi VM cannot reach SQL Server and every API call hitting the database will fail. The provisioner sets this explicitly so the failure cannot happen on a clean rebuild.",
      },
      {
        id: 504,
        commandTitle: 'Connect a GUI database tool from your Mac (optional)',
        command: '# On your Mac — connection details:\n# Host: localhost  Port: 1433\n# User: sa  Password: YourStrong!Passw0rd\n# Databases: Geography, TechCorp, bgapi-local',
        searchTerms: 'azure data studio dbeaver tableplus ssms gui database client connect mssql localhost port forward mac',
        description: 'Shows the connection parameters for any Mac SQL Server client. Because the Vagrantfile forwards port 1433 from <code>sqlserver</code> to your Mac\'s <code>localhost:1433</code>, tools like <strong>Azure Data Studio</strong>, <strong>DBeaver</strong>, or <strong>TablePlus</strong> can connect directly — no SSH or VPN required.',
        parts: [
          { text: 'Host: localhost', explanation: 'Vagrant port-forwarding makes the remote SQL Server appear local — no VM IP address needed' },
          { text: 'Port: 1433', explanation: 'the standard SQL Server port, forwarded from the sqlserver VM to your Mac' },
          { text: 'User: sa / Password: YourStrong!Passw0rd', explanation: 'the SA credentials baked into the provisioner — the same ones BGAPI uses through its connection strings' },
        ],
        example: "# In Azure Data Studio on your Mac:\n# 1. New connection → Microsoft SQL Server\n# 2. Server: localhost,1433\n# 3. Authentication: SQL Login\n# 4. User: sa  Password: YourStrong!Passw0rd\n# 5. Trust server certificate: ✔\n# 6. Connect → expand Databases → Geography → Tables → dbo.Countries",
        why: "A GUI tool closes the 'I have a database but can't see my data' gap. Especially useful when debugging the bgapi-local schema as EF Core migrations evolve it — you watch the tables appear in real time without SSH-ing in.",
      },
    ],
  },

  // ── Step 7: Swagger demo (replaces planets) ──────────────────────────────

  {
    type: 'prose',
    title: 'Putting it together: Swagger UI hitting real data',
    content: `
      <p>
        The final section verifies the full chain end-to-end through Swagger UI: a request from
        your Mac browser hits BGAPI inside the <code>bgapi</code> VM, which queries SQL Server
        on the <code>sqlserver</code> VM over the Vagrant private network, and returns JSON
        rendered in the Swagger "Try it out" panel.
      </p>
      <p>
        <strong>Data flow recap:</strong><br>
        Mac browser → <code>localhost:62010</code> (port-forward) → Kestrel on <code>bgapi</code>
        → EF Core (one of three DbContexts) → <code>192.168.56.20:1433</code> on <code>sqlserver</code>
        → response JSON back the same way.
      </p>
      <p>
        Three useful Swagger endpoints to try first — none of them require authentication, so you
        can hit them straight from the Swagger UI without going through IdentityServer:
      </p>
      <ul>
        <li><code>GET /api/Geography/countries</code> — returns all countries from the
            <em>Geography</em> reference database (seeded by <code>geography.sql</code>).</li>
        <li><code>GET /api/Companies</code> — returns the company directory from the
            <em>TechCorp</em> reference database (seeded by <code>company.sql</code>).</li>
        <li><code>GET /api/Articles</code> — returns articles from <em>bgapi-local</em>, the
            database BGAPI owns and migrates itself (empty on first boot — proves the EF Core
            migration pipeline ran successfully even when there is no seed data yet).</li>
      </ul>
    `,
  },

  {
    type: 'commands',
    section: 'swagger',
    sectionTitle: 'BGAPI Swagger Demo — Geography, Company, bgapi-local',
    items: [
      {
        id: 601,
        commandTitle: 'Open Swagger UI in your Mac browser',
        command: 'open http://localhost:62010/swagger',
        searchTerms: 'open swagger ui browser localhost 62010 bgapi mac',
        description: 'Opens BGAPI\'s Swagger UI in your default browser. Port 62010 on your Mac is forwarded by Vagrant to the same port on the <code>bgapi</code> VM, where Kestrel is listening. The Swagger page lists every controller in the API grouped by tag — Public, BackOffice, Identity, Integrations.',
        parts: [
          { text: 'open ...', explanation: 'macOS shortcut to launch a URL in the default browser — equivalent to clicking the link' },
          { text: 'http://localhost:62010/swagger', explanation: 'the Swagger UI route registered in Program.cs; the trailing /swagger is required (the root / is the API itself)' },
        ],
        example: "# Swagger UI loads showing groups:\n# ── Geography\n#     GET /api/Geography/countries\n#     GET /api/Geography/regions\n#     GET /api/Geography/cities/{countryId}\n# ── Companies\n#     GET /api/Companies\n#     GET /api/Companies/{id}\n# ── Articles\n#     GET /api/Articles\n#     POST /api/Articles  (🔒 requires JWT)\n# ... and many more",
        why: "Swagger is the fastest way to see what the API exposes and to call it without writing any client code. Every controller annotated with [ApiController] shows up automatically; Swashbuckle reads the XML doc comments and parameter attributes to generate the schemas and the 'Try it out' forms.",
      },
      {
        id: 602,
        commandTitle: 'Try the Geography endpoint — countries from the reference DB',
        command: '# In Swagger UI:\n# 1. Expand "Geography" → GET /api/Geography/countries\n# 2. Click "Try it out" → Execute\n# 3. The Response body shows the JSON returned by SQL Server',
        searchTerms: 'swagger geography countries try it out execute json response sqlserver reference data',
        description: 'Click <strong>Try it out</strong> on <code>GET /api/Geography/countries</code> and then <strong>Execute</strong>. BGAPI runs an EF Core query against the <code>GeographyDbContext</code> (connection string <code>geography_dbconn</code>), which hits the <em>Geography</em> database on the <code>sqlserver</code> VM. The result is rendered as pretty-printed JSON — proof the entire stack works.',
        parts: [
          { text: 'GET /api/Geography/countries', explanation: 'public endpoint (no padlock icon) — no JWT required, anyone with network access can call it' },
          { text: 'Try it out → Execute', explanation: 'Swagger builds the HTTP request from the operation definition, sends it to the local API, and renders the response inline' },
        ],
        example: "Response body:\n[\n  { \"id\": 1, \"name\": \"Afghanistan\", \"iso2\": \"AF\", \"phoneCode\": \"+93\" },\n  { \"id\": 2, \"name\": \"Albania\",     \"iso2\": \"AL\", \"phoneCode\": \"+355\" },\n  { \"id\": 3, \"name\": \"Algeria\",     \"iso2\": \"DZ\", \"phoneCode\": \"+213\" },\n  ...\n]\n\nResponse headers:\n  content-type: application/json; charset=utf-8\n  server: Kestrel",
        why: "This is the canonical 'is everything wired up?' test. Geography is the simplest reference dataset, has no auth, and returns hundreds of rows — making it ideal for verifying that the API VM can reach the DB VM, the EF context is configured correctly, and the seed script ran successfully.",
      },
      {
        id: 603,
        commandTitle: 'Try the Companies endpoint — data from the TechCorp DB',
        command: '# In Swagger UI:\n# 1. Expand "Companies" → GET /api/Companies\n# 2. Click "Try it out" → Execute\n# 3. JSON payload comes from the TechCorp database on sqlserver',
        searchTerms: 'swagger company companies techcorp try it out json response reference data',
        description: 'Mirrors the Geography call but hits the second reference database, <em>TechCorp</em>, through the <code>CompanyDbContext</code>. Demonstrates that BGAPI multiplexes across three DbContexts pointing at three separate catalogs on the same SQL Server instance — exactly as documented in the BGAPI README "Three databases, two strategies" section.',
        parts: [
          { text: 'GET /api/Companies', explanation: 'public endpoint backed by CompanyDbContext — reads from the TechCorp database' },
          { text: 'CompanyDbContext', explanation: 'one of three EF Core contexts in Infrastructure/Persistance/BGAPI.DB — each one binds to a different connection string and a different physical database' },
        ],
        example: "Response body:\n[\n  { \"id\": 1, \"name\": \"Contoso Ltd\",    \"founded\": 1989, \"hqCountryId\": 234 },\n  { \"id\": 2, \"name\": \"Fabrikam Inc\",   \"founded\": 2003, \"hqCountryId\": 234 },\n  { \"id\": 3, \"name\": \"Northwind Co\",   \"founded\": 1972, \"hqCountryId\": 80  },\n  ...\n]",
        why: "Confirms the second reference DB is reachable and seeded. If Geography works but Companies returns a 500, the company.sql seed failed — SSH into sqlserver and re-run it manually with sqlcmd.",
      },
      {
        id: 604,
        commandTitle: 'Try the Articles endpoint — bgapi-local created by EF Core migrations',
        command: '# In Swagger UI:\n# 1. Expand "Articles" → GET /api/Articles\n# 2. Click "Try it out" → Execute\n# 3. Returns [] on first boot — empty but real',
        searchTerms: 'swagger articles bgapi-local migrations ef core empty proves working',
        description: 'Hits an endpoint backed by <code>BGAPIDbContext</code> — the database BGAPI <em>owns</em> and manages through EF Core migrations. The response is <code>[]</code> on a fresh install because no seed data ships for bgapi-local, but a successful <code>200 OK</code> proves that the migration pipeline ran on API startup, the database exists, and the schema is correct.',
        parts: [
          { text: 'GET /api/Articles', explanation: 'public endpoint backed by BGAPIDbContext (connection string dbconn) — reads from bgapi-local' },
          { text: 'Empty array []', explanation: 'expected on first boot — the migrations created the Articles table but no rows were seeded; POST /api/Articles (which requires JWT) would populate it' },
        ],
        example: "Response body:\n[]\n\n# Sanity-check the DB was actually created (on sqlserver VM):\n$ sqlcmd -S localhost -U sa -P 'YourStrong!Passw0rd' -C -Q 'SELECT name FROM sys.databases'\nname\n----------\nmaster\nGeography\nTechCorp\nbgapi-local   ← created by EF Core migrations on API startup\n\n$ sqlcmd -S localhost -U sa -P 'YourStrong!Passw0rd' -C -d bgapi-local -Q \"SELECT name FROM sys.tables\"\nname\n--------------------------\nArticles\nBloggers\nCharacters\nSubscriptions\nUsers\n...",
        why: "Final verification: data flows from SQL Server (sqlserver VM) through three separate EF Core contexts in BGAPI (bgapi VM) to your Mac browser via Vagrant port forwarding. Three machines — two virtual, one physical — working together as one stack. The same Vagrantfile committed to your repo can reproduce this entire environment from scratch on any Apple Silicon Mac with Parallels.",
      },
    ],
  },

  // ── Step 8: Day-to-day commands ──────────────────────────────────────────

  {
    type: 'commands',
    section: 'daily',
    sectionTitle: 'Day-to-Day Commands',
    items: [
      {
        id: 701,
        commandTitle: 'Reload the VMs after Vagrantfile changes',
        command: 'vagrant reload',
        searchTerms: 'vagrant reload restart apply vagrantfile changes config port sync',
        description: 'Gracefully restarts both VMs and re-applies the Vagrantfile — picks up new port forwards, synced folder changes, and resource config without destroying the VMs or anything installed inside them. Add <code>--provision</code> to also re-run the shell provisioners.',
        parts: [
          { text: 'vagrant reload', explanation: "equivalent to vagrant halt followed by vagrant up — preserves each VM's disk state and everything installed inside it" },
        ],
        example: "==> sqlserver: Attempting graceful shutdown of VM...\n==> sqlserver: Booting VM...\n==> sqlserver: Forwarding ports... 1433 (guest) => 1433 (host)\n==> bgapi: Attempting graceful shutdown of VM...\n==> bgapi: Booting VM...\n==> bgapi: Forwarding ports... 62010 (guest) => 62010 (host)",
        why: "Use reload any time you change port forwarding, memory allocation, or synced folder config. It is faster than destroy + up and keeps everything you installed inside the VMs intact.",
      },
      {
        id: 702,
        commandTitle: 'Suspend and resume the VMs',
        command: 'vagrant suspend && vagrant resume',
        searchTerms: 'vagrant suspend resume sleep save state fast pause',
        description: "Suspending saves each VM's entire RAM state to disk — like closing a laptop lid. Resuming restores them in seconds, with every process still running exactly where it left off. Much faster than a full halt + up cycle, and especially useful for the SQL Server VM where a full startup re-init can take 30+ seconds.",
        parts: [
          { text: 'vagrant suspend', explanation: "saves each VM's state to disk and pauses it — Parallels Desktop calls this 'save state'" },
          { text: 'vagrant resume', explanation: 'restores both VMs from saved state — processes, open files, and network connections pick up where they left off' },
        ],
        example: "$ vagrant suspend\n==> bgapi: Saving VM state and suspending execution...\n==> sqlserver: Saving VM state and suspending execution...\n\n# ... do other things, even reboot your Mac ...\n\n$ vagrant resume\n==> sqlserver: Resuming suspended VM...\n==> bgapi: Resuming suspended VM...",
        why: "Suspend is the daily workflow command. Start your dev session with 'vagrant resume', end it with 'vagrant suspend'. The VMs stay warm between sessions without consuming CPU or significant battery when idle — and dotnet watch keeps recompiling on file changes as if you had never left.",
      },
      {
        id: 703,
        commandTitle: 'Check VM status',
        command: 'vagrant status && vagrant global-status',
        searchTerms: 'vagrant status global running stopped saved machines list all',
        description: '<code>vagrant status</code> shows the state of both VMs in the current project folder. <code>vagrant global-status</code> lists every Vagrant-managed VM on your machine across all project directories.',
        parts: [
          { text: 'vagrant status', explanation: "reads the .vagrant/ directory in the current folder and reports each VM's state" },
          { text: 'vagrant global-status', explanation: "queries Vagrant's global index (~/.vagrant.d/data/machine-index/) — shows all VMs regardless of current directory" },
        ],
        example: "$ vagrant status\nCurrent machine states:\nsqlserver                 running (parallels)\nbgapi                     running (parallels)\n\n$ vagrant global-status\nid       name       provider    state    directory\n--------------------------------------------------------------\na1b2c3d  sqlserver  parallels   running  /Users/you/bgapi-dev\ne4f5a6b  bgapi      parallels   running  /Users/you/bgapi-dev",
        why: "global-status is the answer to 'which VMs are eating my RAM right now?' — especially useful when you have a suspended VM from last week and wonder why your Mac is sluggish.",
      },
      {
        id: 704,
        commandTitle: 'Destroy the VMs completely',
        command: 'vagrant destroy --force',
        searchTerms: 'vagrant destroy force delete remove vm disk clean reset bgapi sqlserver',
        description: 'Stops and permanently deletes both VMs and their virtual disks. The Vagrantfile is untouched — run <code>vagrant up --provider parallels</code> again to get two brand-new identical VMs (re-running the provisioners from scratch). The box images stay cached so the next boot is fast.',
        parts: [
          { text: 'vagrant destroy', explanation: "deletes each VM's virtual disk and removes it from Parallels — reclaims disk space immediately" },
          { text: '--force', explanation: "skips the 'Are you sure?' confirmation prompt — useful in scripts" },
        ],
        example: "==> bgapi: Stopping the machine...\n==> bgapi: Deleting the machine...\n==> sqlserver: Stopping the machine...\n==> sqlserver: Deleting the machine...\n\n# Start fresh:\n$ vagrant up --provider parallels\n==> sqlserver: Machine booted and ready!\n==> bgapi: Machine booted and ready!",
        why: "Destroy is the nuclear reset button. If a VM gets into a bad state, destroy + up gives you a provably clean environment in minutes. This is the power of treating infrastructure as disposable code rather than a precious snowflake.",
      },
    ],
  },

];
