// modules/jenkins/jenkins-jobs.js
// M5: Jenkins Jobs — Local/Remote Builds, Schedules, GitHub Integration
// Extracted from DOB-M5 Practice (Practice-M5-Jenkins.md, Part 2)
// Reframed for .NET / Node.js workflows

window.commandData = [

  // ── Section 1: Folder organisation ────────────────────────────────────────

  {
    id: 601, section: "organisation", sectionTitle: "Project Organisation",
    commandTitle: "Create a Folder for your projects (Web UI)",
    command: "# New Item → Folder → name: 'DOB-Demo' → OK → Save",
    searchTerms: "jenkins folder organise project group",
    description: "Folders group related jobs under a namespace. Create a folder called <code>DOB-Demo</code> to hold all M5 practice projects. Folders support inheritance of settings, credentials, and permissions — they're the Jenkins equivalent of a directory.",
    parts: [
      { text: "New Item → Folder", explanation: "create a container that holds other jobs" },
      { text: "name: DOB-Demo", explanation: "the folder name — use kebab-case or PascalCase" },
    ],
    example: "Folder 'DOB-Demo' created. All subsequent jobs will be created inside this folder.",
    why: "Without folders, a Jenkins instance with 50+ jobs becomes unmanageable. Folders also let you scope credentials and permissions to a team or project."
  },

  // ── Section 2: First local build ──────────────────────────────────────────

  {
    id: 610, section: "local-build", sectionTitle: "Local Builds",
    commandTitle: "Create a Freestyle job — list running processes",
    command: "# Inside DOB-Demo → New Item → Freestyle project → 'Get-All-Processes' → OK",
    searchTerms: "jenkins freestyle job create new item project",
    description: "A <strong>Freestyle project</strong> is the simplest Jenkins job type — you configure build steps through the UI. This first job simply lists all running processes on the master: a 'hello world' that proves Jenkins can execute shell commands.",
    parts: [
      { text: "Freestyle project", explanation: "GUI-configured job — steps are added via the web UI" },
      { text: "Get-All-Processes", explanation: "a descriptive job name — pick something self-documenting" },
    ],
    example: "Job 'Get-All-Processes' created inside folder 'DOB-Demo'.",
    why: "Freestyle jobs are the fastest way to prototype a build pipeline. Once the logic stabilises, you graduate to a Pipeline (Jenkinsfile) for version control and reusability."
  },
  {
    id: 611, section: "local-build", sectionTitle: "Local Builds",
    commandTitle: "Add a shell build step and run it",
    command: "# In job config → Build → Add build step → Execute shell → Command: 'ps ax'",
    searchTerms: "jenkins execute shell build step command ps",
    description: "Add a build step that runs a shell command on the master. For this exercise: <code>ps ax</code> (list all processes). Save and click <strong>Build Now</strong>. Check the result in <strong>Console Output</strong> from the build history.",
    parts: [
      { text: "Execute shell", explanation: "runs a bash command in the job's workspace on the node" },
      { text: "ps ax", explanation: "list every running process — confirms Jenkins has a working shell" },
      { text: "Build Now", explanation: "trigger the job manually (later you'll add triggers: SCM poll, cron, webhook)" },
    ],
    example: "Console Output:\nStarted by user doadmin\nBuilding in workspace /var/lib/jenkins/workspace/DOB-Demo/Get-All-Processes\n[Build] $ /bin/sh -xe /tmp/jenkins12345.sh\n+ ps ax\n  PID TTY      STAT   TIME COMMAND\n    1 ?        Ss     0:01 /usr/lib/systemd/systemd\n  ...",
    why: "The shell step is Jenkins' most-used build step. It runs everything: <code>dotnet build</code>, <code>npm install && npm test</code>, <code>docker build</code>, <code>pg_isready</code> for PostgreSQL health checks. If it runs in a terminal, it runs in Jenkins."
  },

  // ── Section 3: .NET/Node.js build examples ────────────────────────────────

  {
    id: 612, section: "local-build", sectionTitle: "Local Builds",
    commandTitle: "Build a .NET project (local)",
    command: "# Execute shell:\ndotnet restore && dotnet build --configuration Release && dotnet test --no-build",
    searchTerms: "dotnet build test restore jenkins ci pipeline",
    description: "A realistic CI build step for a .NET solution. <code>dotnet restore</code> pulls NuGet packages, <code>dotnet build</code> compiles in Release mode, and <code>dotnet test</code> runs the test suite. Chain them with <code>&&</code> — if any step fails, the build stops.",
    parts: [
      { text: "dotnet restore", explanation: "download and cache NuGet dependencies" },
      { text: "dotnet build --configuration Release", explanation: "compile the solution with optimisations" },
      { text: "dotnet test --no-build", explanation: "run unit tests without recompiling (the build step already compiled)" },
    ],
    example: "Build succeeded.\n    0 Warning(s)\n    0 Error(s)\nTotal tests: 47. Passed: 47. Failed: 0. Skipped: 0.",
    why: "This is the CI core loop: restore → build → test. A green build means the code compiles and passes all tests. This runs on every push — catch regressions in minutes, not days."
  },
  {
    id: 613, section: "local-build", sectionTitle: "Local Builds",
    commandTitle: "Build a Node.js project (local)",
    command: "# Execute shell:\nnpm ci && npm run build && npm test",
    searchTerms: "nodejs npm ci build test jenkins pipeline",
    description: "A CI build step for a Node.js project. <code>npm ci</code> (clean install) is preferred over <code>npm install</code> in CI — it respects <code>package-lock.json</code> exactly and fails if the lock file is out of date. Then <code>npm run build</code> (e.g. TypeScript compile, webpack, or Next.js build) and <code>npm test</code>.",
    parts: [
      { text: "npm ci", explanation: "clean install — deletes node_modules and installs exactly what's in package-lock.json" },
      { text: "npm run build", explanation: "runs the build script (tsc, webpack, next build, etc.)" },
      { text: "npm test", explanation: "runs the test script (jest, mocha, vitest)" },
    ],
    example: "added 847 packages in 12s\n> my-app@1.0.0 build\n> tsc && vite build\n✓ built in 4.2s\nTests: 32 passed, 32 total",
    why: "<code>npm ci</code> is mandatory in CI — <code>npm install</code> can mutate <code>package-lock.json</code>, breaking reproducibility. CI must be deterministic: same commit → same result, every time."
  },

  // ── Section 4: Remote builds via SSH ──────────────────────────────────────

  {
    id: 620, section: "remote-build", sectionTitle: "Remote Builds (SSH)",
    commandTitle: "Extend the Vagrantfile to 2 nodes (master + client)",
    command: "cat Vagrantfile",
    searchTerms: "vagrant vagrantfile two nodes master client centos private network",
    description: "Exit the master SSH session and extend the Vagrantfile to add a <code>client</code> VM. The client is a remote SSH target — Jenkins will execute build steps on it via the SSH plugin. Keep the master definition; just add the client block.",
    parts: [
      { text: "config.vm.define \"client\"", explanation: "add a second VM definition — the remote execution target" },
      { text: "client.vm.network \"private_network\", ip: \"192.168.99.101\"", explanation: "a distinct IP on the private network — reachable from master" },
      { text: "vagrant up", explanation: "brings up the new client VM; master is already running so Vagrant skips it" },
    ],
    example: `# Master node (keep the existing definition above)
  config.vm.define "master" do |node|
    node.vm.box      = "shekeriev/centos-7-64-minimal"
    node.vm.hostname = "master.sulab.local"
    node.vm.network "private_network", ip: "192.168.99.100"
    node.vm.network "forwarded_port", guest: 80,   host: 8000
    node.vm.network "forwarded_port", guest: 8080, host: 8080
    node.vm.provision "shell", path: "add_hosts.sh"
  end

  # ── Client node (NEW — add this below the master block) ────────────────────
  config.vm.define "client" do |node|
    node.vm.box      = "shekeriev/centos-7-64-minimal"
    node.vm.hostname = "client.sulab.local"
    node.vm.network "private_network", ip: "192.168.99.101"
    node.vm.provision "shell", path: "add_hosts.sh"
  end`,
    why: "The 2-node setup models a realistic Jenkins topology: master orchestrates, client executes. The add_hosts.sh provisioner ensures both VMs can resolve each other by hostname — no IP hardcoding in Jenkins configs."
  },
  {
    id: 621, section: "remote-build", sectionTitle: "Remote Builds (SSH)",
    commandTitle: "Bring up the client VM",
    command: "vagrant up",
    searchTerms: "vagrant up client second vm boot provision",
    description: "Bring up the new client VM. Vagrant detects the master is already running and only provisions the client. The <code>add_hosts.sh</code> script runs on first boot.",
    parts: [
      { text: "vagrant up", explanation: "boots any VMs not yet running — master is skipped, client is created" },
    ],
    example: "==> client: Importing base box 'shekeriev/centos-7-64-minimal'...\n==> client: Running provisioner: shell...\n==> client: Machine booted and ready!",
    why: "You can grow a Vagrant environment incrementally. Start with one VM, add more as exercises require — Vagrant only creates what's new."
  },
  {
    id: 622, section: "remote-build", sectionTitle: "Remote Builds (SSH)",
    commandTitle: "Create jenkins user on the client VM",
    command: "vagrant ssh client -c 'sudo useradd jenkins && echo \"jenkins:Password1\" | sudo chpasswd && echo \"jenkins ALL=(ALL) NOPASSWD: ALL\" | sudo tee /etc/sudoers.d/jenkins'",
    searchTerms: "create jenkins user client remote ssh access",
    description: "Create a matching <code>jenkins</code> user on the client VM with the same password and sudo privileges as the master. Jenkins will SSH into the client as this user to execute remote build steps.",
    parts: [
      { text: "useradd jenkins", explanation: "create the jenkins system user on the client" },
      { text: "chpasswd", explanation: "set the password non-interactively" },
      { text: "tee /etc/sudoers.d/jenkins", explanation: "grant passwordless sudo" },
    ],
    example: "jenkins ALL=(ALL) NOPASSWD: ALL",
    why: "The jenkins user must exist on every node Jenkins connects to. Same username, same password (or, better, SSH key-based auth — which we set up next)."
  },
  {
    id: 623, section: "remote-build", sectionTitle: "Remote Builds (SSH)",
    commandTitle: "Copy SSH key from master to client",
    command: "sudo su - jenkins -c 'ssh-copy-id jenkins@client.sulab.local'",
    searchTerms: "ssh-copy-id key passwordless jenkins client remote",
    description: "Copy the jenkins user's public SSH key from the master to the client. After this, the master can SSH to <code>client.sulab.local</code> without a password. This is run on the master VM.",
    parts: [
      { text: "su - jenkins -c '...'", explanation: "run the command as the jenkins user" },
      { text: "ssh-copy-id jenkins@client.sulab.local", explanation: "append the local public key to the remote user's authorized_keys" },
    ],
    example: "Number of key(s) added: 1\nNow try logging into the machine: ssh jenkins@client.sulab.local",
    why: "SSH keys are the standard authentication method for Jenkins agent connections. Passwords in build scripts are a security anti-pattern — keys are revokable, auditable, and never appear in console output."
  },
  {
    id: 624, section: "remote-build", sectionTitle: "Remote Builds (SSH)",
    commandTitle: "Install the SSH plugin (Web UI)",
    command: "# Manage Jenkins → Manage Plugins → Available → search 'SSH' → install 'SSH plugin'",
    searchTerms: "jenkins ssh plugin install remote execution",
    description: "The <strong>SSH plugin</strong> (also called 'SSH Build Agents' or 'Publish Over SSH') lets Jenkins execute build steps on remote hosts via SSH. Install it, then configure SSH sites under <strong>Manage Jenkins → Configure System</strong>.",
    parts: [
      { text: "SSH plugin", explanation: "enables SSH-based remote command execution as build steps" },
      { text: "Configure System → SSH remote hosts", explanation: "add remote host entries with hostname, port, and credentials" },
    ],
    example: "SSH Plugin 1.1 — Installed.\nRestart Jenkins to activate? Yes (Jenkins will restart automatically if 'Download now and install after restart' was selected).",
    why: "The SSH plugin decouples build execution from the master. You can run commands on any reachable machine — useful for targeting specific OS environments (.NET on Windows, Node.js on Linux) from a single Jenkins instance."
  },
  {
    id: 625, section: "remote-build", sectionTitle: "Remote Builds (SSH)",
    commandTitle: "Configure SSH credentials for the client (Web UI)",
    command: "# Manage Jenkins → Manage Credentials → Add Credentials → SSH Username with private key",
    searchTerms: "jenkins ssh credentials private key jenkins user client",
    description: "Add the jenkins user's private key (<code>/var/lib/jenkins/.ssh/id_rsa</code> from the master) as a Jenkins credential. Then configure an SSH site: hostname <code>client.sulab.local</code>, port 22, select the credential. Test with <strong>Check connection</strong>.",
    parts: [
      { text: "Credentials: SSH Username with private key", explanation: "store the private key so Jenkins can authenticate to remote hosts" },
      { text: "SSH site: client.sulab.local:22", explanation: "define a remote host Jenkins can target in build steps" },
    ],
    example: "Check connection → 'Successful connection to client.sulab.local:22'",
    why: "Credentials are stored encrypted in Jenkins (in <code>$JENKINS_HOME/secrets/</code>). They never appear in job configs or console logs — Jenkins injects them at runtime."
  },
  {
    id: 626, section: "remote-build", sectionTitle: "Remote Builds (SSH)",
    commandTitle: "Create a remote build job — .NET health check",
    command: "# New Item → Freestyle → 'Remote-Dotnet-Check'\n# Build → Execute shell script on remote host using ssh\n# SSH site: client.sulab.local\n# Command: dotnet --version && dotnet --list-sdks",
    searchTerms: "jenkins remote ssh build dotnet version check",
    description: "Create a freestyle job that runs on the client VM via SSH. The build step checks whether .NET SDK is installed and which versions are available — useful for verifying the target environment before a real build.",
    parts: [
      { text: "Execute shell script on remote host using ssh", explanation: "SSH plugin build step — runs commands on the configured remote host" },
      { text: "dotnet --version && dotnet --list-sdks", explanation: "verify .NET is installed and show SDK versions" },
    ],
    example: "Console Output:\nExecuting command on client.sulab.local[22]: dotnet --version && dotnet --list-sdks\n8.0.4\n8.0.4 [/usr/share/dotnet/sdk]",
    why: "Environment validation should be the first step of any CI pipeline. A 'dotnet --version' check catches missing SDKs before a 10-minute build fails with 'command not found'."
  },
  {
    id: 627, section: "remote-build", sectionTitle: "Remote Builds (SSH)",
    commandTitle: "Create a remote build job — Node.js health check",
    command: "# Build → Execute shell script on remote host using ssh\n# Command: node --version && npm --version",
    searchTerms: "jenkins remote ssh node npm version check",
    description: "Same pattern for Node.js: verify <code>node</code> and <code>npm</code> are installed on the client. This confirms the remote execution path works and the Node.js runtime is present.",
    parts: [
      { text: "node --version", explanation: "print the Node.js version" },
      { text: "npm --version", explanation: "print the npm version" },
    ],
    example: "v20.12.2\n10.5.2",
    why: "Remote execution means the client VM must have the toolchain installed. The Jenkins master doesn't need .NET or Node.js at all — it just orchestrates."
  },

  // ── Section 5: Source control (GitHub) ────────────────────────────────────

  {
    id: 630, section: "github", sectionTitle: "GitHub Integration",
    commandTitle: "Install git on the master and client",
    command: "sudo yum install -y git",
    searchTerms: "install git centos yum jenkins source control",
    description: "Git is required for any job that clones a repository. Install it on the master (the Git plugin uses the system's <code>git</code> binary) and on any remote node that will run <code>git clone</code> steps.",
    parts: [
      { text: "yum install -y git", explanation: "install the git package from CentOS base repository" },
    ],
    example: "Installed:\n  git.x86_64 0:1.8.3.1-23.el7_8",
    why: "Jenkins' Git plugin shells out to the system <code>git</code> binary — it's not a pure-Java implementation. The binary must be on $PATH for the user running the build."
  },
  {
    id: 631, section: "github", sectionTitle: "GitHub Integration",
    commandTitle: "Create a GitHub-integrated build job (Web UI)",
    command: "# New Item → Freestyle → 'GitHub-Build'\n# Source Code Management → Git → Repository URL: https://github.com/your-org/your-dotnet-app.git\n# Branches to build: */main",
    searchTerms: "jenkins git github clone repository freestyle build",
    description: "Create a job that clones a GitHub repository before building. Under <strong>Source Code Management</strong>, select <strong>Git</strong> and enter the repository URL. Jenkins clones the repo into the job's workspace before running build steps.",
    parts: [
      { text: "Source Code Management → Git", explanation: "tell Jenkins to clone a git repository before the build" },
      { text: "Repository URL", explanation: "the HTTPS or SSH URL of the repo — public repos need no credentials" },
      { text: "Branches to build: */main", explanation: "build the main branch; use */feature/* for all feature branches" },
    ],
    example: "Cloning repository https://github.com/your-org/your-dotnet-app.git\n > git init /var/lib/jenkins/workspace/DOB-Demo/GitHub-Build\n > git fetch --tags --progress origin +refs/heads/main:refs/remotes/origin/main\n > git checkout -b main origin/main",
    why: "Git integration is the bridge between 'code on my laptop' and 'code in CI'. Every push triggers a build — the feedback loop closes."
  },
  {
    id: 632, section: "github", sectionTitle: "GitHub Integration",
    commandTitle: "Add post-build steps — deploy build artefacts",
    command: "# Build → Execute shell:\ndotnet publish -c Release -o ./publish && sudo cp -r ./publish/* /var/www/dotnet-app/",
    searchTerms: "jenkins post build copy artefacts deploy dotnet publish",
    description: "After a successful build, copy the published artefacts to a web server directory. For .NET: <code>dotnet publish</code> produces a self-contained deployment. For Node.js: <code>cp -r dist/</code> or <code>rsync</code>. This is the 'Deploy' half of CI/CD.",
    parts: [
      { text: "dotnet publish -c Release -o ./publish", explanation: "produce a self-contained deployment package" },
      { text: "sudo cp -r ./publish/* /var/www/dotnet-app/", explanation: "copy artefacts to the web server root" },
    ],
    example: "Published 42 files to /var/lib/jenkins/workspace/DOB-Demo/GitHub-Build/publish\nCopied to /var/www/dotnet-app/",
    why: "Post-build actions close the CI/CD loop: build → test → publish → deploy. In production you'd push to a package registry (NuGet, npm, Docker Hub) or trigger a deployment tool, but the principle is the same."
  },

  // ── Section 6: Scheduled builds ───────────────────────────────────────────

  {
    id: 640, section: "schedules", sectionTitle: "Scheduled Builds",
    commandTitle: "Install the Schedule Build Plugin (Web UI)",
    command: "# Manage Jenkins → Manage Plugins → Available → search 'Schedule Build Plugin' → install",
    searchTerms: "jenkins schedule build plugin cron trigger",
    description: "The <strong>Schedule Build Plugin</strong> adds a 'Schedule Build' button to job pages, letting you pick a one-time future execution time from a calendar widget. For recurring schedules, use the native <strong>Build periodically</strong> trigger with cron syntax.",
    parts: [
      { text: "Schedule Build Plugin", explanation: "adds UI for one-time scheduled builds" },
      { text: "Build periodically (native)", explanation: "cron-based recurring trigger — no plugin needed" },
    ],
    example: "Schedule Build Plugin 1.0 — Installed.",
    why: "One-time schedules are useful for planned maintenance windows ('deploy at 3 AM Saturday'). Recurring schedules are for nightly builds, database backups, or periodic integration tests."
  },
  {
    id: 641, section: "schedules", sectionTitle: "Scheduled Builds",
    commandTitle: "Configure a periodic build trigger (cron)",
    command: "# Job config → Build Triggers → Build periodically → Schedule: 'H/30 * * * *'",
    searchTerms: "jenkins cron schedule periodic build every 30 minutes",
    description: "The <strong>Build periodically</strong> trigger uses cron syntax. <code>H/30 * * * *</code> means 'every 30 minutes, at a hashed offset' — Jenkins spreads out the exact minute to avoid thundering-herd problems. <code>H</code> is a Jenkins-specific hash of the job name, not a cron feature.",
    parts: [
      { text: "H/30", explanation: "every 30 minutes, hashed — different jobs get different offsets" },
      { text: "* * * * *", explanation: "minute hour day-of-month month day-of-week (all wildcards = every)" },
    ],
    example: "Would last have run at: 6/5/2024 10:12:34 AM\nWould next run at: 6/5/2024 10:42:34 AM",
    why: "<code>H</code> (hash) is preferred over a fixed minute like <code>*/30</code> — if 50 jobs all trigger on the same minute, the Jenkins master gets hammered. The hash spreads load evenly across the interval."
  },
  {
    id: 642, section: "schedules", sectionTitle: "Scheduled Builds",
    commandTitle: "Create a scheduled PostgreSQL health check",
    command: "# Build → Execute shell:\npg_isready -h db.sulab.local -p 5432 -U app_user",
    searchTerms: "postgresql pg_isready health check jenkins scheduled build",
    description: "A periodic job that checks whether PostgreSQL is reachable. <code>pg_isready</code> is a lightweight utility that tests connectivity without running a query. Useful as a canary — if the DB is down, this job fails and alerts the team before the main application jobs run.",
    parts: [
      { text: "pg_isready", explanation: "PostgreSQL connection checker — returns 0 if reachable, non-zero otherwise" },
      { text: "-h db.sulab.local -p 5432", explanation: "host and port of the PostgreSQL server" },
      { text: "-U app_user", explanation: "connect as this user (needs a .pgpass file or PGPASSWORD env var)" },
    ],
    example: "db.sulab.local:5432 - accepting connections",
    why: "Database health checks should run before any build that depends on the database. A scheduled check every 5 minutes catches outages early — and Jenkins' notification system (email, Slack) alerts the team automatically."
  },

  // ── Section 7: Parameterised builds ───────────────────────────────────────

  {
    id: 650, section: "parameters", sectionTitle: "Parameterised Builds",
    commandTitle: "Add a string parameter for the target environment",
    command: "# Job config → This project is parameterised → Add Parameter → String Parameter → Name: DEPLOY_ENV, Default: staging",
    searchTerms: "jenkins parameterised build string parameter environment deploy",
    description: "Parameterised builds let you supply values at runtime. A <code>DEPLOY_ENV</code> parameter lets the same job deploy to <code>staging</code> or <code>production</code> depending on user input. Access the value in shell steps as <code>$DEPLOY_ENV</code>.",
    parts: [
      { text: "String Parameter: DEPLOY_ENV", explanation: "a text input the user fills in when triggering the build" },
      { text: "Default: staging", explanation: "pre-filled value — safe default that doesn't deploy to prod accidentally" },
    ],
    example: "Build → User prompted: 'DEPLOY_ENV: [staging]' → enters 'production' → build runs with $DEPLOY_ENV=production",
    why: "Parameters make jobs reusable. One 'Deploy' job can handle staging and production, controlled by the person who clicks 'Build'. Avoids maintaining duplicate jobs that differ only in one variable."
  },

];
