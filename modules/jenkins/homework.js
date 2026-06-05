// modules/jenkins/homework.js
// M5: Jenkins — Capstone Homework
// Recast of Homework-M5-Jenkins.md (Jenkins master + slave + Docker)
// Modernised: .NET / Node.js pipeline + PostgreSQL, automated with Vagrant

window.commandData = [

  // ── Section 1: The assignment ─────────────────────────────────────────────

  {
    id: 950, section: "brief", sectionTitle: "The Assignment",
    commandTitle: "Goal — a Jenkins master + slave with Docker, fully automated CI/CD",
    command: "cat README.md",
    searchTerms: "homework assignment jenkins master slave docker pipeline .net nodejs postgresql",
    description: "Build a complete Jenkins CI/CD environment with one master and one slave node. The slave must have Docker installed. Create a Pipeline (Jenkinsfile) that checks out a .NET <em>or</em> Node.js application from GitHub, builds it, runs unit tests, spins up a temporary PostgreSQL container for integration tests, builds a Docker image, and deploys it. Every step must be automated — zero manual intervention after <code>vagrant up</code>.",
    parts: [
      { text: "Master node", explanation: "Jenkins controller — serves the UI, schedules jobs, stores artefacts" },
      { text: "Slave node", explanation: "Jenkins agent with Docker installed — executes the build and runs containers" },
      { text: "Jenkinsfile", explanation: "a Declarative Pipeline checked into the application repository" },
      { text: "PostgreSQL", explanation: "temporary container for integration tests, torn down after the test stage" },
    ],
    example: "Acceptance criteria:\n  ✓ vagrant up brings up both VMs, master and slave\n  ✓ Slave auto-registers with the master (SSH launch method)\n  ✓ Pipeline job is pre-configured (via Jenkins CLI or Configuration as Code)\n  ✓ Pipeline: checkout → restore → build → unit test → integration test (PostgreSQL) → Docker build → deploy\n  ✓ Integration tests run against a real PostgreSQL container, then clean up\n  ✓ The app is reachable on http://localhost:8080 (or :3000 for Node.js) after the pipeline succeeds\n  ✓ Re-running the pipeline is idempotent — second run produces the same result\n  ✓ All secrets (DB password, registry credentials) are stored as Jenkins credentials, never hardcoded",
    why: "This pulls together everything from M5: master/slave topology, SSH credentials, Docker on agents, GitHub integration, Declarative Pipelines, PostgreSQL integration tests, secret management, and Vagrant automation. It's the M5 equivalent of the M4 Ansible homework — a capstone that proves you can build a real CI/CD pipeline from scratch."
  },

  // ── Section 2: Vagrant environment ────────────────────────────────────────

  {
    id: 951, section: "brief", sectionTitle: "The Assignment",
    commandTitle: "Vagrantfile — provision the two target VMs",
    command: "vagrant up",
    searchTerms: "vagrant vagrantfile jenkins master slave centos docker",
    description: "Bring up the infrastructure with Vagrant: a master VM (Jenkins controller) and a slave VM (build agent with Docker). Both run CentOS 7 on a private network. The master forwards port 8080 for Jenkins UI; the slave forwards port 8088 for deployed apps.",
    parts: [
      { text: "master → centos, 192.168.99.100, ports :8080 :8000", explanation: "Jenkins controller" },
      { text: "slave → centos, 192.168.99.102, port :8088", explanation: "dedicated build agent with Docker" },
      { text: "provision scripts", explanation: "shell provisioners that install Jenkins on master, Docker on slave, and configure SSH keys" },
    ],
    example: "Vagrant.configure('2') do |config|\n  config.vm.define 'master' do |m|\n    m.vm.box = 'shekeriev/centos-7-64-minimal'\n    m.vm.network 'private_network', ip: '192.168.99.100'\n    m.vm.network 'forwarded_port', guest: 8080, host: 8080\n    m.vm.provision 'shell', path: 'provision-master.sh'\n  end\n  config.vm.define 'slave' do |s|\n    s.vm.box = 'shekeriev/centos-7-64-minimal'\n    s.vm.network 'private_network', ip: '192.168.99.102'\n    s.vm.network 'forwarded_port', guest: 80, host: 8088\n    s.vm.provision 'shell', path: 'provision-slave.sh'\n  end\nend",
    why: "Vagrant makes the environment reproducible. A teammate clones your repo, runs <code>vagrant up</code>, and has the identical Jenkins environment — no manual setup."
  },

  // ── Section 3: Choice of stack ────────────────────────────────────────────

  {
    id: 952, section: "brief", sectionTitle: "The Assignment",
    commandTitle: "Choose your stack: .NET or Node.js",
    command: "# Pick ONE path and implement it end-to-end:",
    searchTerms: ".net nodejs choose stack asp.net express postgresql",
    description: "You have two paths — pick one and implement the full pipeline. <strong>.NET path:</strong> ASP.NET Core Web API with Entity Framework Core + PostgreSQL. <strong>Node.js path:</strong> Express (or Fastify) with node-postgres (pg) + PostgreSQL. Both paths have the same shape: a REST API that reads/writes a PostgreSQL database.",
    parts: [
      { text: ".NET path", explanation: "ASP.NET Core 8 Web API, EF Core, Npgsql, xUnit tests, Docker multi-stage build" },
      { text: "Node.js path", explanation: "Express + pg (node-postgres), Jest tests, Docker multi-stage build" },
    ],
    example: "Health endpoint: GET /health → { status: 'ok', db: 'connected', timestamp: '...' }\nData endpoint: GET /items → [{ id, name, ... }] from PostgreSQL",
    why: "Both stacks exercise the same CI/CD skills — the pipeline is the important part, not the language. Pick the stack you're more comfortable with, or implement both for extra credit."
  },

  // ── Section 4: The Pipeline (Jenkinsfile) ─────────────────────────────────

  {
    id: 960, section: "pipeline", sectionTitle: "The Pipeline",
    commandTitle: "Stage 1: Checkout",
    command: "# Jenkinsfile stage:\ncheckout scm",
    searchTerms: "jenkinsfile checkout scm clone git repository",
    description: "The first stage clones the application repository. Use <code>checkout scm</code> (which respects the Git configuration set in the Jenkins job) or an explicit <code>git url: '...', branch: 'main'</code> step. The pipeline assumes the repository contains both the application code and the Jenkinsfile.",
    parts: [
      { text: "checkout scm", explanation: "clone the repository using the job's configured Git settings" },
    ],
    example: "Cloning repository https://github.com/your-org/your-app.git\n > git rev-parse --is-inside-work-tree\n > git config remote.origin.url\n > git fetch --tags --progress origin +refs/heads/main",
    why: "The Jenkinsfile lives in the same repo as the code it builds. This is the 'Pipeline as Code' pattern — the pipeline definition is versioned alongside the application."
  },
  {
    id: 961, section: "pipeline", sectionTitle: "The Pipeline",
    commandTitle: "Stage 2: Restore & Build",
    command: "# .NET:\nsh 'dotnet restore && dotnet build -c Release --no-restore'\n# Node.js:\nsh 'npm ci && npm run build'",
    searchTerms: "dotnet restore build release npm ci compile",
    description: "Restore dependencies and compile the application in Release mode. This stage fails fast if there are compilation errors — no point running tests against broken code.",
    parts: [
      { text: "dotnet restore / npm ci", explanation: "download and cache dependencies" },
      { text: "dotnet build -c Release / npm run build", explanation: "compile the application with optimisations" },
    ],
    example: "Build succeeded. 0 Warning(s), 0 Error(s)\nTime Elapsed 00:00:04.23",
    why: "A failed build stage is the fastest feedback Jenkins can give — you know within seconds that your code doesn't compile."
  },
  {
    id: 962, section: "pipeline", sectionTitle: "The Pipeline",
    commandTitle: "Stage 3: Unit Tests",
    command: "# .NET:\nsh 'dotnet test tests/UnitTests -c Release --no-build --logger trx'\n# Node.js:\nsh 'npm test -- --coverage --reporters=jest-junit'",
    searchTerms: "dotnet test xunit nunit jest nodejs unit tests logger junit",
    description: "Run the unit test suite. Unit tests must not require a database or external services — they test individual classes and functions in isolation. Archive test results as JUnit XML so Jenkins can display trends and failure details.",
    parts: [
      { text: "dotnet test / npm test", explanation: "execute the test suite" },
      { text: "--logger trx / --reporters=jest-junit", explanation: "output results in JUnit XML format for Jenkins" },
    ],
    example: "Total tests: 47. Passed: 47. Failed: 0. Skipped: 0.\nTest Run Successful.\nResults File: TestResults/unit_results.trx",
    why: "JUnit XML output enables Jenkins' test reporting: trend graphs, failure drill-down, and the 'Test Result Trend' chart on the job page."
  },
  {
    id: 963, section: "pipeline", sectionTitle: "The Pipeline",
    commandTitle: "Stage 4: Integration Tests (PostgreSQL)",
    command: "sh '''\n  docker run -d --name pg-test \\\n    -e POSTGRES_DB=app_test \\\n    -e POSTGRES_USER=app_user \\\n    -e POSTGRES_PASSWORD=test123 \\\n    -p 5433:5432 postgres:16-alpine\n  sleep 5\n  pg_isready -h localhost -p 5433 -U app_user\n'''\n# Then run integration tests:\nsh 'dotnet test tests/IntegrationTests -c Release --no-build --logger trx'\n# or: sh 'npm run test:integration'",
    searchTerms: "postgresql docker integration test temporary container setup teardown",
    description: "Spin up a temporary PostgreSQL container, run integration tests against it, then tear it down. Use <code>post { always { sh 'docker rm -f pg-test || true' } }</code> to guarantee cleanup even if tests fail. The container uses a random port (5433) to avoid conflicts.",
    parts: [
      { text: "docker run -d --name pg-test postgres:16-alpine", explanation: "start a throwaway PostgreSQL container" },
      { text: "sleep 5 && pg_isready", explanation: "wait for PostgreSQL to accept connections before running tests" },
      { text: "post { always { docker rm -f pg-test } }", explanation: "guaranteed cleanup — container is removed even if tests fail" },
    ],
    example: "pg-test container started on port 5433\npg_isready: db.sulab.local:5433 - accepting connections\n\nRunning integration tests...\n  ✓ should return health status with DB connected\n  ✓ should create and retrieve an item\n  ✓ should handle concurrent requests\n\nTotal tests: 12. Passed: 12. Failed: 0.\n\nCleaning up... pg-test removed.",
    why: "Temporary PostgreSQL containers make integration tests fast, isolated, and reproducible. No shared test database, no test pollution, no 'it passes on my machine' — every build gets a fresh database."
  },
  {
    id: 964, section: "pipeline", sectionTitle: "The Pipeline",
    commandTitle: "Stage 5: Docker Build (main branch only)",
    command: "when { branch 'main' }\nsteps {\n  sh 'docker image build -t myorg/myapp:${BUILD_NUMBER} .'\n  // sh 'docker push myorg/myapp:${BUILD_NUMBER}'  // requires registry credentials\n}",
    searchTerms: "docker build image tag push branch main gate jenkinsfile when",
    description: "Build a Docker image, gated to the <code>main</code> branch. Feature branches run tests but don't produce images. Tag with <code>$BUILD_NUMBER</code> for traceability. Optionally push to a registry (Docker Hub, GitHub Container Registry, or a private registry).",
    parts: [
      { text: "when { branch 'main' }", explanation: "only execute this stage on the main branch — feature branches skip it" },
      { text: "docker image build -t myorg/myapp:$BUILD_NUMBER", explanation: "build and tag the image with the Jenkins build number" },
    ],
    example: "Step 1/8 : FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build\nStep 2/8 : WORKDIR /src\n...\nSuccessfully built abc123def456\nSuccessfully tagged myorg/myapp:47",
    why: "Branch-gating prevents feature branches from pushing images that could accidentally be deployed. Only <code>main</code> produces deployable artefacts."
  },
  {
    id: 965, section: "pipeline", sectionTitle: "The Pipeline",
    commandTitle: "Stage 6: Deploy (main branch only)",
    command: "sh '''\n  docker container rm -f myapp || true\n  docker container run -d --name myapp -p 80:80 \\\n    -e ConnectionStrings__DefaultConnection=\"$DB_CONNECTION\" \\\n    myorg/myapp:${BUILD_NUMBER}\n'''",
    searchTerms: "deploy docker run container environment variables connection string",
    description: "Deploy the new container: stop the old one, start the new one. The database connection string comes from a Jenkins credential (<code>$DB_CONNECTION</code>) — never hardcoded. After deployment, verify with <code>curl http://localhost:80/health</code> in a post-success step.",
    parts: [
      { text: "docker container rm -f myapp || true", explanation: "force-remove the old container; don't fail if it doesn't exist" },
      { text: "docker container run -d --name myapp -p 80:80", explanation: "start the new container, bind to port 80" },
      { text: "-e ConnectionStrings__DefaultConnection", explanation: "pass the database connection string as an environment variable" },
    ],
    example: "myapp\nabc123def456... → Container started\n$ curl http://localhost:80/health\n{\"status\":\"healthy\",\"db\":\"connected\",\"uptime\":\"00:00:15\"}",
    why: "This is Continuous Deployment: every push to main that passes tests is automatically deployed. The blue-green pattern (stop old, start new) ensures zero-downtime deploys."
  },

  // ── Section 5: Automation requirements ────────────────────────────────────

  {
    id: 970, section: "automation", sectionTitle: "Automation Requirements",
    commandTitle: "Provisioning: master setup script",
    command: "# provision-master.sh: install Jenkins, configure users, create pipeline job\nsudo yum install -y jenkins java-11-openjdk git\nsudo systemctl enable jenkins && sudo systemctl start jenkins\n# ... create jenkins user, SSH keys, sudoers, add slave node ...",
    searchTerms: "provision shell script master jenkins install automate vagrant",
    description: "Write a shell provisioner for the master VM that installs Jenkins, creates the jenkins system user, generates SSH keys, and pre-configures the slave node. After <code>vagrant up</code>, the master should be ready — Jenkins running, slave registered, pipeline job created.",
    parts: [
      { text: "Jenkins installation", explanation: "add repo, import GPG key, install package, start service" },
      { text: "User & SSH setup", explanation: "create jenkins user, set shell to bash, generate SSH key pair" },
      { text: "Slave registration", explanation: "add the slave as a permanent agent via the Jenkins REST API or JCasC" },
    ],
    example: "==> master: Running provisioner: shell...\n  Jenkins installed: 2.440.1\n  SSH key generated: /var/lib/jenkins/.ssh/id_rsa\n  Slave 'slave-node' registered\n  Pipeline job 'DOB-Demo/Capstone-Pipeline' created",
    why: "Automated provisioning is the core DevOps principle: infrastructure as code. A new team member runs <code>vagrant up</code> and has the full environment — no wiki pages, no manual steps, no 'ask Bob how he set it up'."
  },
  {
    id: 971, section: "automation", sectionTitle: "Automation Requirements",
    commandTitle: "Provisioning: slave setup script",
    command: "# provision-slave.sh: install Docker, .NET SDK or Node.js, configure jenkins user\nsudo yum install -y docker-ce git\nsudo usermod -aG docker jenkins\n# ... install .NET SDK 8.0 (or Node.js 20), copy SSH public key from master ...",
    searchTerms: "provision shell script slave docker install dotnet nodejs automate",
    description: "Write a shell provisioner for the slave VM that installs Docker, the chosen SDK (.NET 8 or Node.js 20), and git. Create the jenkins user and add the master's public SSH key to <code>authorized_keys</code> so the master can connect to launch the agent.",
    parts: [
      { text: "Docker CE", explanation: "add Docker repo, install docker-ce, start and enable the service" },
      { text: ".NET SDK 8.0 / Node.js 20", explanation: "install the build toolchain for your chosen stack" },
      { text: "SSH authorized_keys", explanation: "copy the master's jenkins public key so the agent can be launched via SSH" },
    ],
    example: "==> slave: Running provisioner: shell...\n  Docker installed: 24.0.7\n  .NET SDK 8.0 installed: /usr/share/dotnet\n  SSH key authorised for user jenkins\n  Slave ready for agent connection",
    why: "The slave must have the exact toolchain the pipeline expects. The provisioner script documents these dependencies in code — if someone needs to add a new agent, they run the same script and get an identical node."
  },

  // ── Section 6: Secrets management ─────────────────────────────────────────

  {
    id: 980, section: "secrets", sectionTitle: "Secrets Management",
    commandTitle: "Store secrets as Jenkins credentials, not in code",
    command: "# Manage Jenkins → Manage Credentials → Add Credentials\n# Kind: Secret text → Secret: [the actual password] → ID: DB_PASSWORD",
    searchTerms: "jenkins credentials secret text password database api key",
    description: "All secrets (database password, Docker registry credentials, API keys) must be stored as Jenkins credentials — never in the Jenkinsfile or shell scripts. Reference them in the pipeline as <code>withCredentials([string(credentialsId: 'DB_PASSWORD', variable: 'DB_PASS')]) { ... }</code> or via the <code>environment</code> directive.",
    parts: [
      { text: "Secret text credential", explanation: "stores a single string (password, token, API key) encrypted in Jenkins" },
      { text: "withCredentials step", explanation: "injects the credential value as an environment variable for the duration of the block" },
    ],
    example: "pipeline {\n  environment {\n    DB_PASS = credentials('DB_PASSWORD')\n  }\n  stages { ... }\n}",
    why: "Credentials in Jenkins are encrypted at rest and masked in console output. If <code>$DB_PASS</code> appears in a log line, Jenkins replaces it with <code>****</code>. This is table stakes for any CI/CD system that touches production."
  },

  // ── Section 7: Verification checklist ─────────────────────────────────────

  {
    id: 990, section: "verify", sectionTitle: "Verification Checklist",
    commandTitle: "Verify the complete pipeline end-to-end",
    command: "# 1. vagrant up — both VMs come up cleanly\n# 2. Jenkins is reachable at http://localhost:8080\n# 3. Slave is online in Manage Nodes\n# 4. Pipeline job exists and is configured\n# 5. Build Now → pipeline runs all 6 stages\n# 6. All tests pass (unit + integration)\n# 7. Docker image built and tagged correctly\n# 8. curl http://localhost:8080 (or :3000) returns health check with DB connected\n# 9. Re-running the pipeline produces the same result (idempotent)\n# 10. No hardcoded secrets in any file",
    searchTerms: "verify pipeline jenkins check end-to-end acceptance criteria",
    description: "Run through the full acceptance checklist. Each item must pass. This is the evidence you submit with the homework — screenshots or a terminal recording of each step succeeding.",
    parts: [
      { text: "vagrant up", explanation: "infrastructure comes up with no errors" },
      { text: "pipeline execution", explanation: "all stages green — no skipped, no failed" },
      { text: "health check", explanation: "the deployed app confirms DB connectivity" },
    ],
    example: "✓ 1. vagrant up — success\n✓ 2. Jenkins at :8080 — reachable, logged in as doadmin\n✓ 3. Slave online — 'slave-node' shows free disk/ram\n✓ 4. Pipeline job — configured under DOB-Demo/Capstone-Pipeline\n✓ 5. Build Now — pipeline runs:\n     Checkout ✓  Restore&Build ✓  UnitTests ✓  IntegrationTests ✓  DockerBuild ✓  Deploy ✓\n✓ 6. All tests pass — 47 unit + 12 integration = 59 total, 0 failures\n✓ 7. Docker image — myorg/myapp:1 tagged\n✓ 8. curl :8080/health → {\"status\":\"healthy\",\"db\":\"connected\"}\n✓ 9. Re-run — second build produces identical output, no drift\n✓ 10. Secrets — all passwords in Jenkins credentials, none in git",
    why: "The verification checklist is your proof that the system works. Walk through it yourself before submitting — every item must be observable and reproducible."
  },

];
