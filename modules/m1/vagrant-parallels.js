// modules/m1/vagrant-parallels.js
// Vagrant + Parallels on Apple Silicon — two-VM dev environment: .NET Minimal API + PostgreSQL planets
// Uses the pageBlocks format: prose, note, and commands blocks can be mixed freely.

window.pageBlocks = [

  // ── Introduction ──────────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'What you will build',
    content: `
      <p>
        This module picks up where <strong>Introduction to DevOps</strong> left off. There you ran
        a single-VM Vagrant environment with a .NET 10 Minimal API that returned dummy weather data.
        Here you upgrade to a <strong>two-VM environment</strong> — a web tier and a real database tier —
        still on an Apple Silicon Mac using <strong>Vagrant</strong> and <strong>Parallels Desktop</strong>.
      </p>
      <p>
        By the end you will have two named VMs — <code>app-web</code> (a .NET 10 Minimal API that
        queries a real database) and <code>app-db</code> (PostgreSQL 16 seeded with planets data) —
        both defined in a single <code>Vagrantfile</code> and brought up with one command.
        Hit <code>localhost:5000/planets</code> in your browser and get real JSON back from the database.
      </p>
      <p>
        <strong>Why PostgreSQL instead of SQL Server?</strong><br>
        PostgreSQL ships native ARM64 packages — both VMs can run at full Apple Silicon speed.
        No x86_64 emulation, no extra memory overhead, no mixed-architecture complexity. It is also
        open-source, free, and the most widely deployed relational database in DevOps pipelines.
      </p>
      <p>
        <strong>Why not VirtualBox?</strong><br>
        VirtualBox relies on kernel extensions (kexts) that are incompatible with Apple Silicon's
        security architecture. It has no production-ready ARM64 port. Parallels is the native
        hypervisor on M-series Macs — full speed, no binary translation.
      </p>
      <p><strong>Prerequisites</strong></p>
      <ul>
        <li>Parallels Desktop <strong>Pro or Business</strong> edition (Standard does not expose the automation API Vagrant needs)</li>
        <li>~5 GB free disk space for both box images and VM disks</li>
        <li>No .NET SDK, no PostgreSQL installed on your Mac — everything lives inside the VMs</li>
      </ul>
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
        <li><strong><code>app-db</code></strong> — ARM64 Ubuntu 24.04, runs PostgreSQL 16
            on port <code>5432</code>. Seeded with eight rows of solar system planets data.
            Static private IP <code>192.168.56.20</code>.</li>
        <li><strong><code>app-web</code></strong> — ARM64 Ubuntu 24.04, runs a .NET 10 Minimal API
            on port <code>5000</code> that queries <code>app-db</code> with Npgsql and returns
            <code>GET /planets</code> as JSON. Static private IP <code>192.168.56.10</code>.</li>
      </ul>
      <p>
        The two VMs talk to each other over a Vagrant <em>private network</em>
        (<code>192.168.56.x</code>). Your Mac reaches both through Vagrant's
        <em>forwarded ports</em>: <code>http://localhost:5000/planets</code> hits the API,
        <code>localhost:5432</code> hits PostgreSQL directly for any GUI tool you want to use.
      </p>
      <p>
        Each VM is configured entirely by its <code>config.vm.provision "shell"</code> block in
        the Vagrantfile. Nothing is set up manually — <code>vagrant up --provider parallels</code>
        installs PostgreSQL, seeds the planets data, installs the .NET 10 SDK, builds the API,
        and starts it as a systemd service end-to-end. The per-VM sections later in this module
        inspect <em>what the provisioner already did</em>.
      </p>
    `,
  },

  // ── Architecture note: both ARM64 ────────────────────────────────────────

  {
    type: 'note',
    variant: 'info',
    content: '<strong>Both VMs are ARM64.</strong> Unlike a SQL Server setup — where the database VM must run x86_64 under emulation because Microsoft has no native ARM64 Linux build — PostgreSQL ships first-class ARM64 packages. Both <code>app-db</code> and <code>app-web</code> use <code>bento/ubuntu-24.04-arm64</code> and run at full native speed on Apple Silicon. Parallels never needs to emulate a foreign instruction set here.',
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
          { text: 'brew tap hashicorp/tap', explanation: "registers HashiCorp's official Homebrew tap — a third-party formula repository — so Homebrew knows where to find HashiCorp's own packages" },
          { text: 'brew install hashicorp/tap/hashicorp-vagrant', explanation: "installs Vagrant from the HashiCorp tap specifically — the fully qualified path avoids any name collision with the older community cask" },
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
        command: 'mkdir planets-dev && cd planets-dev',
        searchTerms: 'mkdir cd project folder planets vagrant init',
        description: 'Creates a dedicated folder for the Vagrantfile and its <code>.vagrant/</code> state directory. Everything in this module is done from this folder.',
        parts: [
          { text: 'mkdir planets-dev', explanation: 'each Vagrant project lives in its own folder — keeps state isolated from any other Vagrant projects you have' },
          { text: 'cd planets-dev', explanation: 'all vagrant commands operate on the Vagrantfile in the current directory' },
        ],
        example: "$ mkdir planets-dev && cd planets-dev\n$ pwd\n/Users/you/planets-dev",
        why: "A clean, empty folder makes the next step (writing the Vagrantfile) unambiguous — there is no existing Vagrantfile, .vagrant/ directory, or boxes to conflict with.",
      },
      {
        id: 202,
        commandTitle: 'Write the complete two-VM Vagrantfile',
        command: 'cat Vagrantfile',
        searchTerms: 'vagrantfile complete two vm app-web app-db dotnet postgresql planets provision private network port forward',
        description: 'Create a file named <code>Vagrantfile</code> in your <code>planets-dev</code> folder — use any editor, VS Code, or right-click → New File. Copy the complete content from <strong>Example output</strong> below and paste it in. The file declares both VMs (<code>app-db</code> first, because <code>app-web</code> depends on the database being ready), each with its own hostname, private-network IP, port forward, and provisioning script.',
        parts: [
          { text: "config.vm.define 'app-db'", explanation: 'declares the database VM — installs PostgreSQL, creates the planets database, seeds all eight planet rows; declared first so vagrant up boots it first' },
          { text: "config.vm.define 'app-web'", explanation: 'declares the API VM — installs the .NET 10 SDK, scaffolds a Minimal API project, adds Npgsql, writes Program.cs, publishes, and starts a systemd service' },
          { text: "db.vm.hostname / web.vm.hostname", explanation: 'Vagrant sets the OS hostname at boot from this value — visible as the shell prompt inside the VM' },
          { text: "private_network ip: ...", explanation: 'static IPs on the Vagrant private network — app-web (192.168.56.10) connects to app-db (192.168.56.20) over this isolated link' },
          { text: "forwarded_port", explanation: '5000 → Minimal API, 5432 → PostgreSQL for Mac-side GUI tools — both reachable as localhost:* on your Mac' },
        ],
        example: `Vagrant.configure('2') do |config|

  # ── app-db: PostgreSQL 16 + planets seed ──
  config.vm.define 'app-db' do |db|
    db.vm.box      = 'bento/ubuntu-24.04-arm64'
    db.vm.hostname = 'app-db'

    db.vm.provider 'parallels' do |prl|
      prl.name   = 'app-db'
      prl.memory = 1024
      prl.cpus   = 1
    end

    db.vm.network 'private_network', ip: '192.168.56.20'
    db.vm.network 'forwarded_port',  guest: 5432, host: 5432

    db.vm.provision 'shell', inline: <<-SHELL
      set -e
      apt-get update -q
      apt-get install -y postgresql postgresql-contrib

      PG_HBA=$(find /etc/postgresql -name pg_hba.conf | head -1)
      PG_CONF=$(find /etc/postgresql -name postgresql.conf | head -1)
      sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"
      echo "host  planets  planets_user  192.168.56.0/24  scram-sha-256" >> "$PG_HBA"

      systemctl restart postgresql
      sleep 3

      sudo -u postgres psql -c "CREATE USER planets_user WITH PASSWORD 'DevPass123!';"
      sudo -u postgres psql -c "CREATE DATABASE planets OWNER planets_user;"
      sudo -u postgres psql -d planets <<'SQL'
CREATE TABLE planet (
  planetid      INT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  massearths    DECIMAL(10,4),
  radiuskm      DECIMAL(10,2),
  distanceau    DECIMAL(10,4),
  hasrings      BOOLEAN,
  atmosphere    VARCHAR(255),
  discoveredby  VARCHAR(100),
  discoveryyear INT
);
INSERT INTO planet VALUES
  (1,'Mercury',0.055,2439.7,0.39,FALSE,'Oxygen, Sodium, Hydrogen',NULL,NULL),
  (2,'Venus',0.815,6051.8,0.72,FALSE,'CO2, Nitrogen',NULL,NULL),
  (3,'Earth',1.000,6371.0,1.00,FALSE,'Nitrogen, Oxygen',NULL,NULL),
  (4,'Mars',0.107,3389.5,1.52,FALSE,'CO2, Nitrogen, Argon',NULL,NULL),
  (5,'Jupiter',317.8,69911,5.20,TRUE,'Hydrogen, Helium','Galileo Galilei',1610),
  (6,'Saturn',95.16,58232,9.58,TRUE,'Hydrogen, Helium','Galileo Galilei',1610),
  (7,'Uranus',14.54,25362,19.22,TRUE,'Hydrogen, Helium, Methane','William Herschel',1781),
  (8,'Neptune',17.15,24622,30.05,TRUE,'Hydrogen, Helium, Methane','Urbain Le Verrier',1846);
GRANT ALL ON TABLE planet TO planets_user;
SQL
    SHELL
  end

  # ── app-web: .NET 10 Minimal API ──
  config.vm.define 'app-web' do |web|
    web.vm.box      = 'bento/ubuntu-24.04-arm64'
    web.vm.hostname = 'app-web'

    web.vm.provider 'parallels' do |prl|
      prl.name   = 'app-web'
      prl.memory = 1024
      prl.cpus   = 1
    end

    web.vm.network 'private_network', ip: '192.168.56.10'
    web.vm.network 'forwarded_port',  guest: 5000, host: 5000

    web.vm.provision 'shell', inline: <<-SHELL
      set -e
      apt-get update -q
      apt-get install -y dotnet-sdk-10.0

      mkdir -p /opt/planets-api && cd /opt/planets-api
      dotnet new web -o . --force
      dotnet add package Npgsql

      cat > Program.cs <<'CSHARP'
using Npgsql;
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
var connStr = Environment.GetEnvironmentVariable("DB_CONN")
    ?? "Host=192.168.56.20;Database=planets;Username=planets_user;Password=DevPass123!";
app.MapGet("/planets", async () => {
    await using var conn = new NpgsqlConnection(connStr);
    await conn.OpenAsync();
    await using var cmd = new NpgsqlCommand(
        "SELECT planetid, name, massearths, radiuskm, distanceau, hasrings FROM planet ORDER BY planetid",
        conn);
    await using var reader = await cmd.ExecuteReaderAsync();
    var list = new List<object>();
    while (await reader.ReadAsync())
        list.Add(new {
            id         = reader.GetInt32(0),
            name       = reader.GetString(1),
            massEarths = reader.IsDBNull(2) ? (decimal?)null : reader.GetDecimal(2),
            radiusKm   = reader.IsDBNull(3) ? (decimal?)null : reader.GetDecimal(3),
            distanceAU = reader.IsDBNull(4) ? (decimal?)null : reader.GetDecimal(4),
            hasRings   = reader.GetBoolean(5)
        });
    return Results.Ok(list);
});
app.Run("http://0.0.0.0:5000");
CSHARP

      dotnet publish -c Release -o /opt/planets-api/publish

      cat > /etc/systemd/system/planets-api.service <<'UNIT'
[Unit]
Description=Planets Minimal API
After=network.target

[Service]
WorkingDirectory=/opt/planets-api/publish
ExecStart=/usr/bin/dotnet /opt/planets-api/publish/planets-api.dll
Restart=on-failure
Environment=ASPNETCORE_ENVIRONMENT=Development
Environment=ASPNETCORE_URLS=http://+:5000
Environment=DB_CONN=Host=192.168.56.20;Database=planets;Username=planets_user;Password=DevPass123!

[Install]
WantedBy=multi-user.target
UNIT
      systemctl daemon-reload
      systemctl enable --now planets-api
    SHELL
  end

end`,
        why: "Front-loading the full Vagrantfile makes the topology obvious from line one: two VMs, each with its own box, hostname, and provisioner. Every command in the rest of this module is something the provisioner inside this file already ran — the later sections only explain what it did and how to verify it.",
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
        searchTerms: 'vagrant up parallels provider start boot download box app-web app-db',
        description: 'Reads the Vagrantfile, downloads the ARM64 Ubuntu 24.04 box image if not already cached (once, then reused), and brings up both VMs in declaration order: <code>app-db</code> first, then <code>app-web</code>. Each VM\'s shell provisioner runs once on first boot. On first run the whole sequence is ~5–8 minutes (most of that is <code>dotnet publish</code>); subsequent <code>vagrant up</code> calls after a <code>halt</code> boot in under a minute.',
        parts: [
          { text: 'vagrant up', explanation: 'reads the Vagrantfile, creates each VM if it does not exist, starts it, and runs the provisioners on first boot' },
          { text: '--provider parallels', explanation: "explicitly selects Parallels as the hypervisor — you can also set VAGRANT_DEFAULT_PROVIDER=parallels in your shell to avoid typing it every time" },
        ],
        example: "Bringing machine 'app-db' up with 'parallels' provider...\n==> app-db: Box 'bento/ubuntu-24.04-arm64' not found. Installing now...\n==> app-db: Setting hostname...\n==> app-db: Running provisioner: shell...\n    app-db: Installing postgresql...\n    app-db: Creating database planets and user planets_user...\n    app-db: Seeding 8 planet rows...\n==> app-db: Machine booted and ready!\n\nBringing machine 'app-web' up with 'parallels' provider...\n==> app-web: Box 'bento/ubuntu-24.04-arm64' already cached. Reusing.\n==> app-web: Setting hostname...\n==> app-web: Running provisioner: shell...\n    app-web: Installing dotnet-sdk-10.0...\n    app-web: Adding Npgsql package...\n    app-web: Publishing Minimal API...\n    app-web: Starting planets-api.service...\n==> app-web: Machine booted and ready!",
        why: "Without --provider parallels, Vagrant defaults to VirtualBox and immediately errors on Apple Silicon. Setting the provider explicitly (or via the environment variable) eliminates this footgun.",
      },
      {
        id: 302,
        commandTitle: 'SSH into either VM',
        command: 'vagrant ssh app-web   # or: vagrant ssh app-db',
        searchTerms: 'vagrant ssh shell login terminal vm connect app-web app-db',
        description: 'Opens an interactive SSH session into the named VM. With more than one VM defined, the name argument is mandatory — <code>vagrant ssh</code> on its own errors with "multiple machines defined". You land as the <code>vagrant</code> user with passwordless <code>sudo</code>, and the prompt shows the hostname set in the Vagrantfile.',
        parts: [
          { text: 'vagrant ssh app-web', explanation: 'targets the API VM — Vagrant reads .vagrant/machines/app-web/ for the SSH config and opens the session' },
          { text: 'vagrant ssh app-db', explanation: 'targets the database VM — different SSH key, different port forwarding, totally separate machine' },
        ],
        example: "$ vagrant ssh app-web\nWelcome to Ubuntu 24.04 LTS (GNU/Linux 6.8.0-generic aarch64)\nvagrant@app-web:~$\n\n$ vagrant ssh app-db\nWelcome to Ubuntu 24.04 LTS (GNU/Linux 6.8.0-generic aarch64)\nvagrant@app-db:~$",
        why: "Both VMs show 'aarch64' — this is the confirmation that no x86_64 emulation is happening anywhere in this stack. Everything runs at native Apple Silicon speed.",
      },
    ],
  },

  // ── Step 5: Inspect the app-web VM ───────────────────────────────────────

  {
    type: 'prose',
    title: 'Inside the app-web VM',
    content: `
      <p>
        The next few commands are run <strong>after <code>vagrant ssh app-web</code></strong>.
        They inspect what the provisioner already did — the SDK is installed, the API is compiled,
        and the systemd service is running. Nothing here re-installs or rebuilds anything.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'app-web',
    sectionTitle: 'Inspect the Minimal API on app-web',
    items: [
      {
        id: 401,
        commandTitle: 'Verify the .NET 10 SDK is installed',
        command: 'dotnet --version',
        searchTerms: 'dotnet version verify sdk installed app-web arm64',
        description: 'Confirms the provisioner installed <code>dotnet-sdk-10.0</code> from Ubuntu 24.04\'s main repository. Ubuntu now ships the .NET SDK directly — no Microsoft package repository configuration needed.',
        parts: [
          { text: 'dotnet --version', explanation: 'prints the SDK version — confirms the CLI is on PATH' },
        ],
        example: "$ dotnet --version\n10.0.100",
        why: "If this prints a version, the SDK is in place. If you destroy the VM and rebuild it, the same provisioner runs again and the SDK comes back identically — that is the reproducibility guarantee.",
      },
      {
        id: 402,
        commandTitle: 'Check that the planets-api systemd service is running',
        command: 'systemctl status planets-api --no-pager',
        searchTerms: 'systemctl status planets-api service running active systemd',
        description: 'Confirms the <code>planets-api.service</code> unit the provisioner registered is active and running. The service starts the published <code>planets-api.dll</code> and restarts it automatically if it crashes.',
        parts: [
          { text: 'systemctl status planets-api', explanation: 'shows the systemd unit state — should read "active (running)"' },
          { text: '--no-pager', explanation: 'dumps the output directly without opening less — useful in SSH sessions' },
        ],
        example: "● planets-api.service - Planets Minimal API\n     Loaded: loaded (/etc/systemd/system/planets-api.service; enabled)\n     Active: active (running) since ...\n   Main PID: 1842 (dotnet)\n\nJun 01 ... app-web planets-api[1842]: info: Microsoft.Hosting.Lifetime[14]\nJun 01 ... app-web planets-api[1842]:       Now listening on: http://[::]:5000",
        why: "Running the API as a systemd service means it starts automatically if the VM reboots — no need to SSH in and run dotnet manually after every vagrant resume.",
      },
      {
        id: 403,
        commandTitle: 'Sanity-check that app-web can reach app-db',
        command: 'nc -zv 192.168.56.20 5432',
        searchTerms: 'network connectivity app-db 192.168.56.20 5432 verify private network nc netcat postgresql',
        description: 'Confirms the API VM can open a TCP connection to the database VM on port 5432. If this fails, the private network is mis-configured in the Vagrantfile or the app-db VM is not running.',
        parts: [
          { text: 'nc -zv 192.168.56.20 5432', explanation: 'netcat in scan mode (-z) with verbose output (-v) — succeeds if the port accepts a TCP handshake' },
        ],
        example: "$ nc -zv 192.168.56.20 5432\nConnection to 192.168.56.20 5432 port [tcp/postgresql] succeeded!",
        why: "This is the fastest single-line check that the two-VM topology is working. If it fails, fix the network before debugging the API — every /planets request would otherwise time out with a Npgsql connection exception.",
      },
      {
        id: 404,
        commandTitle: 'Call /planets from inside the VM',
        command: 'curl -s http://localhost:5000/planets | head -c 400',
        searchTerms: 'curl planets api json response localhost 5000 verify running',
        description: 'Calls the <code>GET /planets</code> endpoint from inside the VM itself. If the service is running and the database is reachable, you get a JSON array back. <code>head -c 400</code> trims the output to keep it readable in the terminal.',
        parts: [
          { text: 'curl -s http://localhost:5000/planets', explanation: 'sends an HTTP GET to Kestrel on the local interface — same request your Mac browser will make through port forwarding' },
          { text: 'head -c 400', explanation: 'limits output to 400 bytes — eight planets worth of JSON is verbose; this shows just the first two' },
        ],
        example: '[{"id":1,"name":"Mercury","massEarths":0.0550,"radiusKm":2439.70,"distanceAU":0.3900,"hasRings":false},{"id":2,"name":"Venus","massEarths":0.8150,"radiusKm":6051.80,"distanceAU":0.7200,"hasRings":false},{"id":3,"name":"Earth",',
        why: "Calling from inside the VM eliminates port forwarding as a variable — if this works but the Mac browser does not, the issue is in Vagrant's forwarded_port config. If this fails, the issue is in the API or the database.",
      },
    ],
  },

  // ── Step 6: Inspect the app-db VM ────────────────────────────────────────

  {
    type: 'prose',
    title: 'Inside the app-db VM',
    content: `
      <p>
        The next few commands are run <strong>after <code>vagrant ssh app-db</code></strong>.
        They inspect the PostgreSQL install and the seeded planets table. Everything here was
        set up by the <code>app-db</code> provisioner during <code>vagrant up</code> — these
        commands only verify the state.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'app-db',
    sectionTitle: 'Inspect PostgreSQL on app-db',
    items: [
      {
        id: 501,
        commandTitle: 'Verify PostgreSQL is running',
        command: 'systemctl status postgresql --no-pager',
        searchTerms: 'systemctl status postgresql running active verify app-db',
        description: 'Confirms the <code>postgresql</code> systemd unit is active. PostgreSQL on Ubuntu 24.04 installs as version 16 and registers its own service unit automatically.',
        parts: [
          { text: 'systemctl status postgresql', explanation: 'should report "active (running)"; if it says "failed", check journalctl -u postgresql' },
        ],
        example: "● postgresql.service - PostgreSQL RDBMS\n     Loaded: loaded (/lib/systemd/system/postgresql.service; enabled)\n     Active: active (running)",
        why: "PostgreSQL on Ubuntu starts automatically after install and after every reboot. The provisioner did not need to call systemctl enable — apt handles that during installation.",
      },
      {
        id: 502,
        commandTitle: 'Confirm the planets database and table were seeded',
        command: "sudo -u postgres psql -d planets -c 'SELECT planetid, name, hasrings FROM planet ORDER BY planetid;'",
        searchTerms: 'psql planets planet table seeded data select rows verify postgresql',
        description: 'Connects to the <code>planets</code> database as the <code>postgres</code> superuser and lists all eight rows. Confirms both that the database creation and the <code>INSERT</code> statements in the provisioner ran successfully.',
        parts: [
          { text: 'sudo -u postgres psql', explanation: 'runs psql as the postgres OS user — this is the standard way to administer PostgreSQL without a password' },
          { text: '-d planets', explanation: 'connects to the planets database specifically — without -d it would connect to the default postgres database' },
          { text: "-c 'SELECT ...'", explanation: 'executes one query and exits immediately — no interactive session needed' },
        ],
        example: " planetid |  name   | hasrings\n----------+---------+----------\n        1 | Mercury | f\n        2 | Venus   | f\n        3 | Earth   | f\n        4 | Mars    | f\n        5 | Jupiter | t\n        6 | Saturn  | t\n        7 | Uranus  | t\n        8 | Neptune | t\n(8 rows)",
        why: "Seeing all eight rows here confirms the provisioner's inline SQL block ran completely. If you only see some rows, the INSERT was interrupted — destroy the app-db VM and run vagrant up app-db to reprovision it cleanly.",
      },
      {
        id: 503,
        commandTitle: 'Confirm PostgreSQL is listening on the private-network interface',
        command: "ss -tlnp | grep 5432",
        searchTerms: 'ss netstat listen port 5432 postgresql network 0.0.0.0 remote',
        description: 'Confirms PostgreSQL is bound to <code>0.0.0.0:5432</code>, not just loopback. The provisioner patched <code>postgresql.conf</code> to set <code>listen_addresses = \'*\'</code> and added a <code>pg_hba.conf</code> rule for the <code>192.168.56.0/24</code> subnet — combined, these are what lets <code>app-web</code> connect across the private network.',
        parts: [
          { text: 'ss -tlnp', explanation: 'modern replacement for netstat — lists listening TCP sockets with the process holding each one' },
          { text: '0.0.0.0:5432', explanation: 'bound to every interface, including the private-network IP — required for remote connections from the app-web VM' },
        ],
        example: "LISTEN 0  244  0.0.0.0:5432  0.0.0.0:*  users:((\"postgres\",pid=856))",
        why: "If this shows 127.0.0.1:5432 instead of 0.0.0.0:5432, app-web cannot reach the database and every /planets request will fail with a connection refused error. The provisioner sets listen_addresses explicitly so this failure cannot happen on a clean rebuild.",
      },
      {
        id: 504,
        commandTitle: 'Connect a GUI database tool from your Mac (optional)',
        command: '# On your Mac — connection details:\n# Host: localhost  Port: 5432\n# Database: planets\n# User: planets_user  Password: DevPass123!',
        searchTerms: 'tableplus dbeaver pgadmin gui postgresql client connect localhost port forward mac',
        description: 'Shows the connection parameters for any Mac PostgreSQL client. Because the Vagrantfile forwards port 5432 from <code>app-db</code> to your Mac\'s <code>localhost:5432</code>, tools like <strong>TablePlus</strong>, <strong>DBeaver</strong>, or <strong>pgAdmin</strong> can connect directly — no SSH or VPN required.',
        parts: [
          { text: 'Host: localhost', explanation: "Vagrant port-forwarding makes the remote PostgreSQL appear local — no VM IP address needed" },
          { text: 'Port: 5432', explanation: "the standard PostgreSQL port, forwarded from the app-db VM to your Mac" },
          { text: 'User: planets_user / Password: DevPass123!', explanation: "the dedicated application user created by the provisioner — narrower privileges than the postgres superuser" },
        ],
        example: "# In TablePlus on your Mac:\n# 1. New connection → PostgreSQL\n# 2. Host: localhost   Port: 5432\n# 3. Database: planets\n# 4. User: planets_user   Password: DevPass123!\n# 5. Connect → open the planet table → all 8 rows",
        why: "A GUI tool is useful when you want to inspect or edit the data without SSHing in — especially helpful when you start extending the planets schema or writing more complex queries.",
      },
    ],
  },

  // ── Step 7: End-to-end demo ──────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Putting it together: /planets from your Mac browser',
    content: `
      <p>
        The final section verifies the full chain end-to-end: a request from your Mac browser
        travels through Vagrant port forwarding into the <code>app-web</code> VM, Kestrel handles
        it, Npgsql queries <code>app-db</code> over the Vagrant private network, and the response
        JSON comes back to the browser.
      </p>
      <p>
        <strong>Data flow:</strong><br>
        Mac browser → <code>localhost:5000</code> (port-forward) → Kestrel on <code>app-web</code>
        → Npgsql → <code>192.168.56.20:5432</code> on <code>app-db</code> → JSON back the same way.
      </p>
      <p>
        Compare this to the single-VM weather API from the Introduction module: the data flow was
        Mac → VM → in-memory <code>Random.Shared</code>. Here the data flows across two VMs and
        comes from a real relational database. The topology is the same one used in production —
        a web tier and a database tier on separate machines, connected over a private network.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'demo',
    sectionTitle: 'Call /planets from your Mac',
    items: [
      {
        id: 601,
        commandTitle: 'Open /planets in your Mac browser',
        command: 'open http://localhost:5000/planets',
        searchTerms: 'open browser localhost 5000 planets api mac json response',
        description: 'Opens the <code>GET /planets</code> endpoint in your default Mac browser. Port 5000 on your Mac is forwarded by Vagrant to port 5000 on the <code>app-web</code> VM, where Kestrel is listening. The browser renders a JSON array of all eight planets.',
        parts: [
          { text: 'open ...', explanation: 'macOS shortcut to launch a URL in the default browser' },
          { text: 'http://localhost:5000/planets', explanation: 'the only endpoint the Minimal API exposes — no authentication, no Swagger, just a raw JSON array' },
        ],
        example: '[\n  {"id":1,"name":"Mercury","massEarths":0.0550,"radiusKm":2439.70,"distanceAU":0.3900,"hasRings":false},\n  {"id":2,"name":"Venus","massEarths":0.8150,"radiusKm":6051.80,"distanceAU":0.7200,"hasRings":false},\n  {"id":3,"name":"Earth","massEarths":1.0000,"radiusKm":6371.00,"distanceAU":1.0000,"hasRings":false},\n  {"id":4,"name":"Mars","massEarths":0.1070,"radiusKm":3389.50,"distanceAU":1.5200,"hasRings":false},\n  {"id":5,"name":"Jupiter","massEarths":317.8000,"radiusKm":69911.00,"distanceAU":5.2000,"hasRings":true},\n  {"id":6,"name":"Saturn","massEarths":95.1600,"radiusKm":58232.00,"distanceAU":9.5800,"hasRings":true},\n  {"id":7,"name":"Uranus","massEarths":14.5400,"radiusKm":25362.00,"distanceAU":19.2200,"hasRings":true},\n  {"id":8,"name":"Neptune","massEarths":17.1500,"radiusKm":24622.00,"distanceAU":30.0500,"hasRings":true}\n]',
        why: "This is the proof the full stack works: two VMs, a real database, a real HTTP server, real data. The same Vagrantfile any teammate clones from your repo produces an identical response. That is Infrastructure as Code.",
      },
      {
        id: 602,
        commandTitle: 'Or call it with curl from your Mac terminal',
        command: 'curl -s http://localhost:5000/planets | python3 -m json.tool',
        searchTerms: 'curl planets api json pretty print mac terminal localhost 5000',
        description: 'An alternative to the browser — <code>curl</code> fetches the response and <code>python3 -m json.tool</code> pretty-prints it. Useful for scripting or for quick inspection in a terminal workflow.',
        parts: [
          { text: 'curl -s', explanation: 'silent mode — suppresses curl progress output, leaving only the response body' },
          { text: 'python3 -m json.tool', explanation: 'built-in JSON formatter on macOS — no jq required' },
        ],
        example: "[\n    {\n        \"id\": 1,\n        \"name\": \"Mercury\",\n        \"massEarths\": 0.055,\n        \"radiusKm\": 2439.7,\n        \"distanceAU\": 0.39,\n        \"hasRings\": false\n    },\n    {\n        \"id\": 2,\n        \"name\": \"Venus\",\n        ...\n    },\n    ...\n]",
        why: "curl is the scripting-friendly alternative to a browser. Once you can call the API from your Mac with curl, you can write shell scripts, test in CI, or chain requests together — the same workflow used in integration test suites.",
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
        example: "==> app-db: Attempting graceful shutdown of VM...\n==> app-db: Booting VM...\n==> app-db: Forwarding ports... 5432 (guest) => 5432 (host)\n==> app-web: Attempting graceful shutdown of VM...\n==> app-web: Booting VM...\n==> app-web: Forwarding ports... 5000 (guest) => 5000 (host)",
        why: "Use reload any time you change port forwarding, memory allocation, or synced folder config. It is faster than destroy + up and keeps everything you installed inside the VMs intact.",
      },
      {
        id: 702,
        commandTitle: 'Suspend and resume the VMs',
        command: 'vagrant suspend && vagrant resume',
        searchTerms: 'vagrant suspend resume sleep save state fast pause',
        description: "Suspending saves each VM's entire RAM state to disk — like closing a laptop lid. Resuming restores them in seconds, with every process still running exactly where it left off. Much faster than a full halt + up cycle.",
        parts: [
          { text: 'vagrant suspend', explanation: "saves each VM's state to disk and pauses it — Parallels Desktop calls this 'save state'" },
          { text: 'vagrant resume', explanation: 'restores both VMs from saved state — the planets-api service on app-web and PostgreSQL on app-db are immediately available again' },
        ],
        example: "$ vagrant suspend\n==> app-web: Saving VM state and suspending execution...\n==> app-db: Saving VM state and suspending execution...\n\n$ vagrant resume\n==> app-db: Resuming suspended VM...\n==> app-web: Resuming suspended VM...",
        why: "Suspend is the daily workflow command. Start your dev session with 'vagrant resume', end it with 'vagrant suspend'. The VMs stay warm between sessions without consuming CPU or significant battery when idle.",
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
        example: "$ vagrant status\nCurrent machine states:\napp-db                    running (parallels)\napp-web                   running (parallels)\n\n$ vagrant global-status\nid       name     provider    state    directory\n----------------------------------------------------------\na1b2c3d  app-db   parallels   running  /Users/you/planets-dev\ne4f5a6b  app-web  parallels   running  /Users/you/planets-dev",
        why: "global-status is the answer to 'which VMs are eating my RAM right now?' — especially useful when you have a suspended VM from a previous session and wonder why your Mac is sluggish.",
      },
      {
        id: 704,
        commandTitle: 'Destroy the VMs completely',
        command: 'vagrant destroy --force',
        searchTerms: 'vagrant destroy force delete remove vm disk clean reset app-web app-db',
        description: 'Stops and permanently deletes both VMs and their virtual disks. The Vagrantfile is untouched — run <code>vagrant up --provider parallels</code> again to get two brand-new identical VMs. The box image stays cached so the next boot skips the download.',
        parts: [
          { text: 'vagrant destroy', explanation: "deletes each VM's virtual disk and removes it from Parallels — reclaims disk space immediately" },
          { text: '--force', explanation: "skips the 'Are you sure?' confirmation prompt — useful in scripts" },
        ],
        example: "==> app-web: Stopping the machine...\n==> app-web: Deleting the machine...\n==> app-db: Stopping the machine...\n==> app-db: Deleting the machine...\n\n# Start fresh:\n$ vagrant up --provider parallels\n==> app-db: Machine booted and ready!\n==> app-web: Machine booted and ready!",
        why: "Destroy is the nuclear reset button. If a VM gets into a bad state, destroy + up gives you a provably clean environment in minutes. This is the power of treating infrastructure as disposable code rather than a precious snowflake.",
      },
    ],
  },

];
