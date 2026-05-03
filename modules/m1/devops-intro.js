// modules/m1-devops-intro.js
// M1: Introduction to DevOps — From Local Dev to Production

window.pageBlocks = [

  // ── What is DevOps? ───────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'What is DevOps?',
    content: `
      <p>
        <strong>DevOps</strong> is not a tool, a job title, or a team. It is a <strong>cultural
        and technical movement</strong> that aims to break down the traditional silos between
        development (writing code) and operations (running code in production).
      </p>

      <h4>The "Throw It Over the Wall" Anti-Pattern</h4>
      <p>
        In traditional organisations, developers write code and then "throw it over the wall"
        to operations. The operations team is responsible for deploying, monitoring, and keeping
        it alive — often without understanding how the application works internally. This leads to:
      </p>
      <ul>
        <li><strong>"Works on my machine"</strong> — differences between dev and prod environments</li>
        <li><strong>Fear of deployment</strong> — releases happen once a quarter because they're risky</li>
        <li><strong>Blamelessness failure</strong> — ops blames devs for bad code; devs blame ops for bad infrastructure</li>
        <li><strong>Long lead times</strong> — months from code commit to production</li>
      </ul>

      <h4>The DevOps Approach</h4>
      <p>
        DevOps applies lean manufacturing principles (from Toyota) and systems thinking to software delivery.
        The goal is <strong>shared ownership</strong> across the entire lifecycle:
      </p>
      <ul>
        <li>Developers understand the production environment — they write code that is <em>deployable</em></li>
        <li>Operations understand the application — they contribute to monitoring and reliability requirements</li>
        <li>Infrastructure is defined as code — version-controlled, reviewed, tested</li>
        <li>Deployments are small, frequent, and reversible — not terrifying events</li>
      </ul>
    `,
  },

  // ── The Three Ways ────────────────────────────────────────────────────────

  {
    type: 'note',
    variant: 'info',
    content: `
      <strong>The Three Ways of DevOps</strong> (from <em>The DevOps Handbook</em> by Gene Kim et al.):
      <ol style="margin-top: 0.5rem; padding-left: 1.5rem;">
        <li><strong>Flow</strong> — fast, predictable movement of work from dev to operations to customer</li>
        <li><strong>Feedback</strong> — short, rapid feedback loops so problems are caught early</li>
        <li><strong>Continuous learning</strong> — experimentation and improvement become routine</li>
      </ol>
    `,
  },

  // ── The Reproducible Environment Problem ─────────────────────────────────

  {
    type: 'prose',
    title: 'The Core Problem: Environment Drift',
    content: `
      <p>
        Every piece of software runs <em>somewhere</em> — on a laptop, a staging server, or a
        production data centre. The environment includes:
      </p>
      <ul>
        <li>The operating system and its version</li>
        <li>System libraries (OpenSSL, glibc, zlib)</li>
        <li>Language runtimes (Node.js, Python, Java, Go)</li>
        <li>Databases, message queues, caches</li>
        <li>Configuration files and environment variables</li>
        <li>Network topology (firewalls, load balancers, DNS)</li>
      </ul>

      <p>
        <strong>Environment drift</strong> happens when these slowly diverge across environments.
        Your laptop has Node 20, staging has Node 18, production has Node 16 — and one day, a
        dependency starts using a feature that only exists in Node 20. The code passes all tests
        locally but fails silently in production.
      </p>

      <h4>The Pre-DevOps Fix: Documentation</h4>
      <p>
        "Install PostgreSQL 16. Run 'npm install'. Set these five environment variables."
        Wikis, READMEs, and onboarding documents. They go stale the moment they're written.
      </p>

      <h4>The DevOps Fix: Infrastructure as Code (IaC)</h4>
      <p>
        Instead of documenting how to set up an environment, you <strong>encode it in files</strong>
        that are version-controlled, reviewed, and executed. The same definition builds your
        laptop VM, your CI pipeline, your staging environment, and — when extended carefully —
        your production infrastructure.
      </p>
    `,
  },

  // ── A Taste of Infrastructure as Code ────────────────────────────────────

  {
    type: 'commands',
    section: 'taste',
    sectionTitle: 'A Taste of Infrastructure as Code',
    items: [
      {
        id: 10,
        commandTitle: 'Define a complete web server in 5 lines',
        command: 'cat Vagrantfile',
        searchTerms: 'vagrantfile example simple web server nodejs',
        description: 'This tiny Vagrantfile defines a complete Ubuntu web server with Node.js — all in version-controlled text. No clicking through installers, no "I ran these commands last month but forgot which ones".',
        parts: [
          { text: 'config.vm.box', explanation: 'the base OS image — Ubuntu 24.04 for ARM64' },
          { text: 'config.vm.network "forwarded_port"', explanation: 'maps port 3000 from the VM to your Mac — open localhost:3000 in your browser' },
          { text: 'config.vm.provision "shell"', explanation: 'runs these commands once on first boot — installs Node.js and starts your app' },
        ],
        example: `Vagrant.configure("2") do |config|
  config.vm.box = "bento/ubuntu-24.04-arm64"
  config.vm.network "forwarded_port", guest: 3000, host: 3000
  config.vm.provision "shell", inline: <<-SHELL
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    npm install -g serve
    serve -s /var/www -l 3000 &
  SHELL
end`,
        why: 'This file is the single source of truth. Commit it to Git. Any developer on your team gets an identical environment with one command: <code>vagrant up</code>.',
      },
      {
        id: 11,
        commandTitle: 'Spin up the environment from nothing',
        command: 'vagrant up --provider parallels',
        searchTerms: 'vagrant up start vm from scratch infrastructure as code',
        description: 'One command downloads the OS image, creates the VM, configures networking, installs Node.js, and starts your application. No manual steps, no hidden dependencies, no "works on my machine" surprises.',
        parts: [
          { text: 'vagrant up', explanation: 'the main IaC command — brings infrastructure from zero to running' },
          { text: '--provider parallels', explanation: 'chooses which hypervisor to use (Parallels, VMware, or VirtualBox)' },
        ],
        example: 'Bringing machine \'default\' up with \'parallels\' provider...\n==> default: Box \'bento/ubuntu-24.04-arm64\' could not be found. Installing now...\n==> default: Machine booted and ready!\n==> default: Running provisioner: shell...\n    default: Installing Node.js 20...\n    default: Starting web server on port 3000...',
        why: 'This is the DevOps payoff — reproducible environments on demand. A new hire runs this and gets the exact same setup as the senior dev with 10 years of experience.',
      },
      {
        id: 12,
        commandTitle: 'Destroy and rebuild in minutes',
        command: 'vagrant destroy --force && vagrant up',
        searchTerms: 'vagrant destroy rebuild clean reset disposable infrastructure',
        description: 'Destroys the VM completely, then recreates it from scratch. This is the "disposable infrastructure" mindset — if something is broken or suspicious, you don\'t debug it. You destroy and rebuild.',
        parts: [
          { text: 'vagrant destroy', explanation: 'deletes the VM entirely — frees disk space, wipes all state' },
          { text: 'vagrant up', explanation: 'rebuilds from the same Vagrantfile — returns to a known good state' },
        ],
        example: '==> default: Deleting the machine...\n==> default: Box \'bento/ubuntu-24.04-arm64\' already cached. Reusing...\n==> default: Machine booted and ready!\nTotal time: 47 seconds — back to a clean environment',
        why: 'Traditional ops treats servers as pets — you nurse them back to health when sick. DevOps treats servers as cattle — if sick, you replace. This mindset is only possible with Infrastructure as Code.',
      },
    ],
  },

  // ── The IaC Spectrum ──────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Where Vagrant Fits in the IaC Ecosystem',
    content: `
      <p>
        "Infrastructure as Code" covers a spectrum. Vagrant handles the foundation — local development VMs.
      </p>

      <h4>Layer 1: Machine Definition (Vagrant) — YOU ARE HERE</h4>
      <p>
        <strong>What it does:</strong> Defines a single VM — OS, memory, CPU, networks, provisioners.<br>
        <strong>The file:</strong> <code>Vagrantfile</code>
      </p>

      <h4>Layer 2: Configuration Management (Ansible, Chef, Puppet)</h4>
      <p>
        <strong>What it does:</strong> Installs and configures software inside machines.<br>
        <strong>The files:</strong> Playbooks (<code>.yml</code>), cookbooks, manifests
      </p>

      <h4>Layer 3: Image Building (Packer)</h4>
      <p>
        <strong>What it does:</strong> Creates <em>golden images</em> — pre-baked VMs with everything installed.<br>
        <strong>The file:</strong> <code>template.pkr.hcl</code>
      </p>

      <h4>Layer 4: Cloud Provisioning (Terraform)</h4>
      <p>
        <strong>What it does:</strong> Manages cloud resources — VPCs, load balancers, databases.<br>
        <strong>The file:</strong> <code>.tf</code> (HashiCorp Configuration Language)
      </p>

      <p>
        <strong>You start with Vagrant</strong> because it's the closest to real servers.
        Every command you learn (SSH, systemd, journalctl, firewall config) transfers directly to production.
      </p>
    `,
  },

  // ── Why VMs Over Containers for Learning ─────────────────────────────────

  {
    type: 'note',
    variant: 'tip',
    content: `
      <strong>Why Vagrant VMs instead of Docker Compose?</strong> Docker Desktop runs a hidden Linux VM
      under the hood anyway. Vagrant gives you full control over that VM — you see the kernel boot,
      you configure real network interfaces, you manage systemd services. These are <em>exactly</em>
      the skills you need to manage production Linux servers. Docker abstracts them away.
    `,
  },

  // ── The DevOps Loop ──────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Closing the Loop: From Local to Production',
    content: `
      <p>
        The two-VM environment you'll build in the next modules is not just a local playground.
        It models a real deployment pipeline:
      </p>

      <h4>Development (Your Mac)</h4>
      <ul>
        <li>Write code on your Mac, synced into <code>app-web</code> VM</li>
        <li>Test against <code>app-db</code> VM (PostgreSQL) on a private network</li>
        <li>Commit and push to Git</li>
      </ul>

      <h4>Continuous Integration (CI Pipeline)</h4>
      <ul>
        <li>CI server downloads the same Vagrantfile from your repo</li>
        <li>Runs <code>vagrant up --provider ...</code> on a cloud VM runner</li>
        <li>Automated tests run against the identical two-VM setup</li>
        <li>VMs are destroyed after tests complete — clean slate every time</li>
      </ul>

      <h4>Production Deployment</h4>
      <ul>
        <li>The same Ansible playbook that provisioned your local VMs runs against production servers</li>
        <li>Or: Packer builds an AMI using the same provisioner scripts</li>
        <li>Or: Terraform launches cloud VMs configured identically to your local definition</li>
      </ul>

      <p>
        The <strong>artifact that travels through this pipeline</strong> is not a binary or a container
        image — it's the <em>definition of the infrastructure itself</em>. That's Infrastructure as Code.
      </p>
    `,
  },

  // ── Common DevOps Anti-Patterns ──────────────────────────────────────────

  {
    type: 'note',
    variant: 'warning',
    content: `
      <strong>Common DevOps Anti-Patterns (Avoid These)</strong>
      <ul style="margin-top: 0.5rem; margin-bottom: 0;">
        <li><strong>Snowflake Servers:</strong> "Let me just SSH in and fix this one thing manually" — now that server is unique and unreproducible</li>
        <li><strong>Configuration Drift:</strong> Running provisioners on a server that already has manual changes — leads to unpredictable results</li>
        <li><strong>Golden Image Amnesia:</strong> Building an image without versioning or documentation — nobody knows what\'s inside it</li>
        <li><strong>CI That Doesn\'t Test Infrastructure:</strong> Testing the application code but never testing the provisioning scripts</li>
        <li><strong>Production Credentials in Dev:</strong> Using real database passwords or API keys in a local Vagrantfile</li>
      </ul>
    `,
  },

  // ── What You'll Build ─────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'What You\'ll Build in the Next Modules',
    content: `
      <p>
        By the end of the next two modules (Parallels and VMware), you will have built a
        fully reproducible, two-machine infrastructure from scratch. You will understand:
      </p>

      <h4>Technical Skills</h4>
      <ul>
        <li>Writing and reading a declarative <code>Vagrantfile</code> for multiple VMs</li>
        <li>Managing a web tier (<code>app-web</code> with Node.js) and a database tier (<code>app-db</code> with PostgreSQL)</li>
        <li>Configuring private networking so VMs can talk to each other</li>
        <li>Using shell provisioners idempotently</li>
        <li>Port forwarding, firewall rules, and systemd services</li>
      </ul>

      <h4>DevOps Mindset Shifts</h4>
      <ul>
        <li><strong>Servers are disposable.</strong> <code>vagrant destroy</code> is freedom, not fear.</li>
        <li><strong>The definition is the truth.</strong> If it's not in the Vagrantfile, it doesn't exist.</li>
        <li><strong>Your laptop is not special.</strong> Any teammate, any CI runner can run the same definition.</li>
        <li><strong>Configuration is code.</strong> It can be reviewed, versioned, tested, and debugged.</li>
      </ul>

      <p>
        This is not just about learning a tool. It's about learning a philosophy: <strong>treating
        infrastructure as code, servers as disposable, and environments as reproducible artifacts.</strong>
        These ideas scale from your laptop to the largest cloud deployments. Ready to get hands-on?
      </p>
    `,
  },

];