// modules/intro/vagrant-parallels.js
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
        (<code>192.168.56.x</code>).
      </p>
    `,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 1 — INSTALL VAGRANT + PARALLELS PROVIDER
  // ════════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Step 1: Install Vagrant and the Parallels provider',
    content: `
      <p>
        Before creating any VMs, you need Vagrant on your Mac and the
        <code>vagrant-parallels</code> plugin. Vagrant itself can be installed via
        Homebrew. The Parallels plugin is what lets Vagrant talk to Parallels Desktop —
        without it, <code>vagrant up</code> errors immediately on Apple Silicon.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'install',
    sectionTitle: 'Install Vagrant + provider',
    items: [
      {
        id: 1,
        commandTitle: 'Install Vagrant (Homebrew)',
        command: 'brew install --cask vagrant',
        searchTerms: 'vagrant install homebrew cask macos arm64 apple silicon m1',
        description: 'Installs Vagrant via Homebrew. The cask pulls the official HashiCorp package — same as the download from vagrantup.com. After install, <code>vagrant</code> is on your PATH.',
        parts: [
          { text: 'brew install --cask vagrant', explanation: 'downloads and installs the Vagrant macOS package from HashiCorp' },
        ],
        example: "🍺  vagrant was successfully installed!",
        why: 'Homebrew is the most common macOS package manager — using it keeps Vagrant in a known location and makes updates a one-liner.',
      },
      {
        id: 2,
        commandTitle: 'Install vagrant-parallels plugin',
        command: 'vagrant plugin install vagrant-parallels',
        searchTerms: 'vagrant plugin install parallels provider arm64 apple silicon',
        description: 'Installs the Parallels provider plugin. This is the bridge between Vagrant and the Parallels Desktop hypervisor API. VirtualBox does not run on Apple Silicon, so this plugin is required.',
        parts: [
          { text: 'vagrant plugin install', explanation: 'downloads and installs a Vagrant plugin from RubyGems' },
          { text: 'vagrant-parallels', explanation: 'the official Parallels provider plugin — maintained by Parallels Inc.' },
        ],
        example: "Installing the 'vagrant-parallels' plugin. This can take a few minutes...\nInstalled the plugin 'vagrant-parallels (3.1.x)'!",
        why: 'No plugin, no VM. Parallels Desktop is the only mature Apple Silicon hypervisor with a Vagrant provider.',
      },
      {
        id: 3,
        commandTitle: 'Set Parallels as the default provider',
        command: 'export VAGRANT_DEFAULT_PROVIDER=parallels',
        searchTerms: 'vagrant default provider parallels env var export',
        description: 'Sets an environment variable so all subsequent Vagrant commands use Parallels without <code>--provider</code> on every invocation. Add this line to your <code>~/.zshrc</code> to make it permanent.',
        parts: [
          { text: 'export VAGRANT_DEFAULT_PROVIDER=parallels', explanation: 'tells Vagrant to use Parallels unless --provider overrides it' },
        ],
        example: '$ echo "export VAGRANT_DEFAULT_PROVIDER=parallels" >> ~/.zshrc && source ~/.zshrc',
        why: 'Eliminates the most common failure mode on Apple Silicon: forgetting --provider and Vagrant defaulting to (broken) VirtualBox.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 2 — CREATE THE VAGRANTFILE
  // ════════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Step 2: Create the project and write the Vagrantfile',
    content: `
      <p>
        Every Vagrant project is a folder. Inside it lives the Vagrantfile — the file
        that defines the VMs, their resources, their networks, and what software to install.
      </p>

      <p><strong>Choose your path:</strong></p>
      <ul>
        <li><strong>Single Vagrantfile</strong> (main path, below) — both VMs in one file;
        one <code>vagrant up</code> boots the full stack. Best when you want everything now.</li>
        <li><strong>Split Vagrantfiles</strong> (alternative) — one file per VM in separate
        subdirectories; boot only the database, only the web tier, or both. Best when you
        want per-VM control.</li>
      </ul>

      <p>
        <strong>All commands use shell heredocs</strong> (<code>cat > file <<'DELIM'</code>)
        to create files entirely from the terminal. Copy the example content, paste it,
        type the closing delimiter on its own line — no GUI editor needed.
      </p>
    `,
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
        commandTitle: 'Create the full-stack Vagrantfile (heredoc — no editor needed)',
        command: "cat > Vagrantfile <<'VFILE'",
        searchTerms: 'vagrantfile heredoc create terminal cat write file dotnet postgresql planets provision private network port forward',
        description: 'Creates the Vagrantfile from the terminal using a shell heredoc. After running the command, the terminal waits for input: <strong>copy the entire content from the Example block below and paste it in</strong>. Then type <code>VFILE</code> on its own line and press Enter — the file is written immediately. No VS Code, no right-click, no GUI. The single Vagrantfile declares both VMs (<code>app-db</code> first, then <code>app-web</code>), each with its own hostname, private-network IP, port forward, and provisioning script.',
        parts: [
          { text: "cat > Vagrantfile", explanation: 'redirects all subsequent keyboard input into Vagrantfile, overwriting any existing content' },
          { text: "<<'VFILE'", explanation: 'opens a heredoc — everything you type next is treated as literal text; the single quotes around VFILE prevent shell expansion of $variables' },
          { text: '(paste the full content from Example below, then type VFILE on its own line)', explanation: 'the complete two-VM Vagrantfile — copy it from the Example section and paste into the terminal' },
        ],
        example: `Vagrant.configure('2') do |config|

  # ── app-db: PostgreSQL 16 + planets seed ──
  config.vm.define 'app-db' do |db|
    db.vm.box      = 'bento/ubuntu-24.04'
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
    web.vm.box      = 'bento/ubuntu-24.04'
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
            hasRings   = !reader.IsDBNull(5) && reader.GetBoolean(5)
        });
    return Results.Ok(list);
});
app.Run();
CSHARP

      dotnet publish -c Release -o /opt/planets-api/publish

      cat > /etc/systemd/system/planets-api.service <<'UNIT'
[Unit]
Description=Planets Minimal API
After=network.target

[Service]
WorkingDirectory=/opt/planets-api/publish
ExecStart=/usr/bin/dotnet /opt/planets-api/publish/planets-api.dll
Restart=always
RestartSec=5
Environment=ASPNETCORE_URLS=http://0.0.0.0:5000
Environment=DB_CONN=Host=192.168.56.20;Database=planets;Username=planets_user;Password=DevPass123!

[Install]
WantedBy=multi-user.target
UNIT

      systemctl daemon-reload
      systemctl enable planets-api
      systemctl start planets-api
    SHELL
  end

end`,
        why: 'A heredoc keeps you entirely in the terminal — no context switch to a GUI editor. Copy the example content, paste it, type <code>VFILE</code>, and the Vagrantfile is ready. The single-file approach means one <code>vagrant up</code> boots both VMs with correct ordering (db before web).',
      },
    ],
  },

  // ── Split Vagrantfiles Alternative ───────────────────────────────────────

  {
    type: 'prose',
    title: 'Alternative: split Vagrantfiles (one per VM)',
    content: `
      <p>
        If you prefer to manage each VM independently — boot only the database, only the
        web tier, or both on demand — use separate Vagrantfiles in subdirectories.
      </p>
      <p>
        Each subdirectory is its own Vagrant project with its own <code>.vagrant/</code>
        state. Destroy the database VM without touching the web VM, or vice versa. The
        two VMs still talk over the same <code>192.168.56.x</code> private network.
      </p>
      <p><strong>Boot order:</strong> start <code>db</code> first, then <code>web</code>:</p>
      <pre><code>cd db && vagrant up --provider parallels
cd ../web && vagrant up --provider parallels</code></pre>
    `,
  },

  {
    type: 'commands',
    section: 'split-db',
    sectionTitle: 'Create db/Vagrantfile (app-db only)',
    items: [
      {
        id: 211,
        commandTitle: 'Database VM Vagrantfile',
        command: "mkdir -p db && cat > db/Vagrantfile <<'VFILE'",
        searchTerms: 'vagrantfile split database app-db postgresql planets private subdirectory parallel',
        description: 'Creates the database-only Vagrantfile in a <code>db/</code> subdirectory using a heredoc. Run <code>cd db && vagrant up --provider parallels</code> to boot just this VM. Paste the Example content, type <code>VFILE</code> on its own line, and press Enter.',
        parts: [
          { text: 'mkdir -p db', explanation: 'creates the db subdirectory for the database Vagrant project' },
          { text: "cat > db/Vagrantfile <<'VFILE'", explanation: 'opens a heredoc that writes into db/Vagrantfile — paste the content, then type VFILE to close' },
        ],
        example: `Vagrant.configure('2') do |config|
  config.vm.define 'app-db' do |db|
    db.vm.box      = 'bento/ubuntu-24.04'
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
end`,
        why: 'A separate Vagrantfile per VM means each can be destroyed, rebuilt, suspended, or snapshotted independently — useful when you only need the database running during frontend development, or only the API for integration testing.',
      },
    ],
  },

  {
    type: 'commands',
    section: 'split-web',
    sectionTitle: 'Create web/Vagrantfile (app-web only)',
    items: [
      {
        id: 212,
        commandTitle: 'Web VM Vagrantfile',
        command: "mkdir -p web && cat > web/Vagrantfile <<'VFILE'",
        searchTerms: 'vagrantfile split web app-web dotnet api planets minimal private subdirectory parallel',
        description: 'Creates the web-only Vagrantfile in a <code>web/</code> subdirectory using a heredoc. Run <code>cd web && vagrant up --provider parallels</code> to boot just this VM. <strong>Note:</strong> the <code>app-db</code> VM must already be running — this Vagrantfile does not create or manage the database.',
        parts: [
          { text: 'mkdir -p web', explanation: 'creates the web subdirectory for the API Vagrant project' },
          { text: "cat > web/Vagrantfile <<'VFILE'", explanation: 'opens a heredoc that writes into web/Vagrantfile — paste the content, then type VFILE to close' },
        ],
        example: `Vagrant.configure('2') do |config|
  config.vm.define 'app-web' do |web|
    web.vm.box      = 'bento/ubuntu-24.04'
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
            hasRings   = !reader.IsDBNull(5) && reader.GetBoolean(5)
        });
    return Results.Ok(list);
});
app.Run();
CSHARP

      dotnet publish -c Release -o /opt/planets-api/publish

      cat > /etc/systemd/system/planets-api.service <<'UNIT'
[Unit]
Description=Planets Minimal API
After=network.target

[Service]
WorkingDirectory=/opt/planets-api/publish
ExecStart=/usr/bin/dotnet /opt/planets-api/publish/planets-api.dll
Restart=always
RestartSec=5
Environment=ASPNETCORE_URLS=http://0.0.0.0:5000
Environment=DB_CONN=Host=192.168.56.20;Database=planets;Username=planets_user;Password=DevPass123!

[Install]
WantedBy=multi-user.target
UNIT

      systemctl daemon-reload
      systemctl enable planets-api
      systemctl start planets-api
    SHELL
  end
end`,
        why: 'The web VM needs the database VM already running — it connects to <code>192.168.56.20:5432</code> at boot. Running only the web VM is useful when iterating on the API code and you want to keep the database stable and untouched.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 3 — BOOT THE VMS
  // ════════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Step 3: Boot both VMs',
    content: `
      <p>
        With the Vagrantfile written, one command spins up the entire environment.
        The first boot takes a few minutes (downloading the box, installing packages);
        subsequent boots are fast.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'up',
    sectionTitle: 'Boot the VMs',
    items: [
      {
        id: 301,
        commandTitle: 'Bring both VMs up',
        command: 'vagrant up --provider parallels',
        searchTerms: 'vagrant up parallels provider boot download box provision dotnet postgresql',
        description: 'Reads the Vagrantfile, downloads the ARM64 box on first run (cached afterwards), creates both VMs in order (<code>app-db</code> first, then <code>app-web</code>), configures networking, and runs the provisioners. First boot takes several minutes — mostly the <code>apt-get install</code> of PostgreSQL and the .NET 10 SDK.',
        parts: [
          { text: 'vagrant up', explanation: 'creates and boots all VMs defined in the Vagrantfile, running provisioners on first boot' },
          { text: '--provider parallels', explanation: 'selects Parallels explicitly — omit if you set VAGRANT_DEFAULT_PROVIDER in Step 1' },
        ],
        example: "Bringing machine 'app-db' up with 'parallels' provider...\n==> app-db: Box 'bento/ubuntu-24.04' not found. Installing now...\n==> app-db: Machine booted and ready!\n==> app-db: Running provisioner: shell...\n    app-db: * Install PostgreSQL ...\n    app-db: * Create planets database ...\nBringing machine 'app-web' up with 'parallels' provider...\n==> app-web: Machine booted and ready!\n==> app-web: Running provisioner: shell...\n    app-web: * Install .NET SDK 10.0 ...\n    app-web: * Build planets-api ...\n    app-web: * Start systemd service ...",
        why: 'One command, whole stack. No manual ordering — Vagrant boots <code>app-db</code> first because it appears first in the Vagrantfile, then <code>app-web</code> after.',
      },
      {
        id: 302,
        commandTitle: 'Check both VMs are running',
        command: 'vagrant status',
        searchTerms: 'vagrant status running check both vms state',
        description: 'Lists each VM defined in the current Vagrantfile along with its state. Both should show <code>running (parallels)</code>.',
        parts: [
          { text: 'vagrant status', explanation: 'shows every VM in this Vagrantfile and whether it is running, saved, or powered off' },
        ],
        example: "Current machine states:\napp-db                    running (parallels)\napp-web                   running (parallels)",
        why: 'Quick sanity check that everything came up. If one says "not created" or "poweroff", something failed during vagrant up — check the provisioner logs.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 4 — CONNECT & VERIFY
  // ════════════════════════════════════════════════════════════════════════════

  {
    type: 'prose',
    title: 'Step 4: Connect to the VMs',
    content: `
      <p>
        With both VMs running, SSH into each one and confirm the provisioners did their
        job. The ARM64 architecture banner confirms everything is native.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'ssh',
    sectionTitle: 'SSH into each VM',
    items: [
      {
        id: 401,
        commandTitle: 'SSH into the database VM',
        command: 'vagrant ssh app-db',
        searchTerms: 'vagrant ssh app-db connect login shell database postgresql',
        description: 'Opens an interactive shell inside the <code>app-db</code> VM as the <code>vagrant</code> user. The hostname in the prompt confirms which machine you are on.',
        parts: [
          { text: 'vagrant ssh app-db', explanation: 'targets a specific VM by the name given in config.vm.define' },
        ],
        example: "Welcome to Ubuntu 24.04 LTS (GNU/Linux 6.8.0-generic aarch64)\nvagrant@app-db:~$",
        why: 'The <code>aarch64</code> banner proves the VM is native ARM64 — exactly what you want on Apple Silicon.',
      },
      {
        id: 402,
        commandTitle: 'SSH into the web VM',
        command: 'vagrant ssh app-web',
        searchTerms: 'vagrant ssh app-web connect login shell web dotnet api',
        description: 'Opens a shell in <code>app-web</code>. The hostname in the prompt confirms you are on the right machine.',
        parts: [
          { text: 'vagrant ssh app-web', explanation: 'targets the web VM specifically — without the name, Vagrant errors asking which VM' },
        ],
        example: "Welcome to Ubuntu 24.04 LTS (GNU/Linux 6.8.0-generic aarch64)\nvagrant@app-web:~$",
        why: 'Being able to SSH into either VM independently is how you debug, inspect logs, and run ad-hoc commands.',
      },
    ],
  },

  // ── Verify PostgreSQL inside the app-db VM ──────────────────────────────

  {
    type: 'prose',
    title: 'Inside the app-db VM',
    content: `
      <p>
        Now that you are inside the database VM, run these commands to verify PostgreSQL is
        healthy and the planets data was seeded correctly. Everything here was set up by the
        <code>app-db</code> provisioner during <code>vagrant up</code> — these commands
        only verify the state.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'app-db',
    sectionTitle: 'Inspect PostgreSQL on app-db',
    items: [
      {
        id: 601,
        commandTitle: 'Verify PostgreSQL is running',
        command: 'systemctl status postgresql --no-pager',
        searchTerms: 'systemctl status postgresql running active verify app-db',
        description: 'Confirms the <code>postgresql</code> systemd unit is active. PostgreSQL on Ubuntu 24.04 installs as version 16 and registers its own service unit automatically.',
        parts: [
          { text: 'systemctl status postgresql', explanation: 'should report "active (running)"; if it says "failed", check journalctl -u postgresql' },
        ],
        example: "● postgresql.service - PostgreSQL RDBMS\n   Active: active (exited)\n● postgresql@16-main.service - PostgreSQL Cluster 16-main\n   Active: active (running)",
        why: 'PostgreSQL on Ubuntu uses a two-service model: the umbrella <code>postgresql.service</code> and the versioned <code>postgresql@16-main.service</code>. Both must be active.',
      },
      {
        id: 602,
        commandTitle: 'List the planets database',
        command: 'sudo -u postgres psql -c "\\l"',
        searchTerms: 'psql postgres list databases planets l',
        description: 'Connects as the postgres superuser and lists all databases. The <code>planets</code> database should appear with <code>planets_user</code> as the owner — confirming the provisioner created it correctly.',
        parts: [
          { text: 'sudo -u postgres psql -c "\\l"', explanation: 'runs as the postgres OS user and lists databases in a single non-interactive command' },
        ],
        example: "   Name    |  Owner       | Encoding\n-----------+--------------+----------\n planets   | planets_user | UTF8",
        why: 'If the planets database is missing, the provisioner SQL did not run — check vagrant provision app-db to re-run it.',
      },
      {
        id: 603,
        commandTitle: 'Query the seeded planets table',
        command: 'sudo -u postgres psql -d planets -c "SELECT planetid, name, hasrings FROM planet ORDER BY planetid;"',
        searchTerms: 'psql postgres select planets seeded data rows verify',
        description: 'Queries the <code>planet</code> table directly. Should return eight rows — Mercury through Neptune — with their ring status. If this works, the seed data from the provisioner is intact.',
        parts: [
          { text: 'sudo -u postgres psql -d planets -c "SELECT ..."', explanation: 'connects to the planets database and runs a single SQL query' },
        ],
        example: " planetid |  name   | hasrings\n----------+---------+----------\n        1 | Mercury | f\n        2 | Venus   | f\n        3 | Earth   | f\n        4 | Mars    | f\n        5 | Jupiter | t\n        6 | Saturn  | t\n        7 | Uranus  | t\n        8 | Neptune | t\n(8 rows)",
        why: 'The eight rows prove the INSERT statements ran correctly. If there are zero rows, the provisioner SQL failed — re-run vagrant provision app-db.',
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
        id: 501,
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
        id: 502,
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
        id: 503,
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
        id: 504,
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

  // ── Step 6: End-to-End Test from Your Mac ────────────────────────────────

  {
    type: 'prose',
    title: 'Step 6: End-to-end test — call the API from your Mac browser',
    content: `
      <p>
        Thanks to Vagrant\'s port forwarding, <code>localhost:5000</code> on your Mac
        reaches the Minimal API inside <code>app-web</code>. Open a browser or curl and
        call <code>/planets</code> — you should get all eight planets as JSON.
      </p>
    `,
  },

  {
    type: 'commands',
    section: 'e2e',
    sectionTitle: 'Test from your Mac',
    items: [
      {
        id: 701,
        commandTitle: 'Open /planets in your browser',
        command: 'http://localhost:5000/planets',
        searchTerms: 'browser localhost 5000 planets api json response mac',
        description: 'Opens the Minimal API endpoint through Vagrant\'s port forwarding. Your Mac browser sends an HTTP GET to <code>localhost:5000</code>, which Vagrant forwards to <code>app-web:5000</code> inside the VM. If everything works, you get a JSON array of all eight planets.',
        parts: [
          { text: 'http://localhost:5000/planets', explanation: 'the URL your browser loads — port 5000 is forwarded from app-web to your Mac' },
        ],
        example: '[{"id":1,"name":"Mercury","massEarths":0.0550,"radiusKm":2439.70,"distanceAU":0.3900,"hasRings":false},\n  {"id":2,"name":"Venus","massEarths":0.8150,"radiusKm":6051.80,"distanceAU":0.7200,"hasRings":false},\n  {"id":3,"name":"Earth","massEarths":1.0000,"radiusKm":6371.00,"distanceAU":1.0000,"hasRings":false},\n  {"id":4,"name":"Mars","massEarths":0.1070,"radiusKm":3389.50,"distanceAU":1.5200,"hasRings":false},\n  {"id":5,"name":"Jupiter","massEarths":317.8000,"radiusKm":69911.00,"distanceAU":5.2000,"hasRings":true},\n  {"id":6,"name":"Saturn","massEarths":95.1600,"radiusKm":58232.00,"distanceAU":9.5800,"hasRings":true},\n  {"id":7,"name":"Uranus","massEarths":14.5400,"radiusKm":25362.00,"distanceAU":19.2200,"hasRings":true},\n  {"id":8,"name":"Neptune","massEarths":17.1500,"radiusKm":24622.00,"distanceAU":30.0500,"hasRings":true}\n]',
        why: "This is the proof the full stack works: two VMs, a real database, a real HTTP server, real data. The same Vagrantfile any teammate clones from your repo produces an identical response. That is Infrastructure as Code.",
      },
      {
        id: 702,
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

  // ── Step 7: Day-to-day commands ──────────────────────────────────────────

  {
    type: 'commands',
    section: 'daily',
    sectionTitle: 'Day-to-Day Commands',
    items: [
      {
        id: 801,
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
        id: 802,
        commandTitle: 'Suspend VMs (fast resume)',
        command: 'vagrant suspend',
        searchTerms: 'vagrant suspend pause save state fast resume ram',
        description: 'Saves the running state of both VMs to disk and frees CPU and RAM. <code>vagrant resume</code> brings them back in seconds — faster than <code>halt</code> + <code>up</code> because the OS does not reboot; it just resumes from the saved state.',
        parts: [
          { text: 'vagrant suspend', explanation: 'saves the VM state (RAM + CPU registers) to disk — like hibernating a laptop' },
        ],
        example: "==> app-db: Saving VM state and suspending execution...\n==> app-web: Saving VM state and suspending execution...",
        why: 'Suspend is the fastest way to free resources when stepping away briefly — resume is near-instant compared to a full halt + up cycle.',
      },
      {
        id: 803,
        commandTitle: 'Check VM status (including all Vagrant VMs on the system)',
        command: 'vagrant status && vagrant global-status',
        searchTerms: 'vagrant status global running stopped saved machines list all parallels',
        description: '<code>vagrant status</code> shows the state of the VMs defined in the current folder. <code>vagrant global-status</code> lists every Vagrant VM on your system across all project folders, including any you might have forgotten about.',
        parts: [
          { text: 'vagrant status', explanation: "reads the .vagrant/ directory and reports those VMs' states" },
          { text: 'vagrant global-status', explanation: "queries Vagrant's global machine index (~/.vagrant.d/data/machine-index/) — shows all VMs regardless of current directory" },
        ],
        example: "$ vagrant status\nCurrent machine states:\napp-db                    running (parallels)\napp-web                   running (parallels)\n\n$ vagrant global-status\nid       name     provider    state    directory\n----------------------------------------------------------\na1b2c3d  app-db   parallels   running  /Users/you/planets-dev\ne4f5a6b  app-web  parallels   running  /Users/you/planets-dev",
        why: "global-status is the answer to 'which VMs are eating my RAM right now?' — especially useful when you have a suspended VM from a previous session and wonder why your Mac is sluggish.",
      },
      {
        id: 804,
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
