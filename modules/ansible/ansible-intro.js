// modules/ansible/ansible-intro.js
// M4: Introduction to Ansible — Agentless Configuration Management
// Extracted from DOB-M4 lecture (M4-Ansible.md), framed for .NET / Node.js stacks

window.pageBlocks = [

  // ── What is Ansible? ──────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'What is Ansible?',
    content: `
      <p>
        <strong>Ansible</strong> is an open-source <strong>configuration management,
        provisioning, and orchestration</strong> engine. You describe the <em>desired state</em>
        of your servers in YAML, and Ansible makes them match that state — installing packages,
        copying files, starting services, and deploying applications.
      </p>

      <p>
        The name is borrowed from science fiction: an <em>ansible</em> is a fictional device for
        instantaneous communication across any distance. The tool lets one control machine
        command many remote machines at once.
      </p>

      <h4>The four jobs Ansible does</h4>
      <ul>
        <li><strong>Change management</strong> — define and track system state. Idempotent:
          running the same playbook twice changes nothing the second time.</li>
        <li><strong>Provisioning</strong> — move a host from <em>State A</em> to <em>State B</em>
          (e.g. a bare Ubuntu box → a running ASP.NET Core or Node.js app server).</li>
        <li><strong>Automation</strong> — execute tasks on a system without manual SSH sessions.</li>
        <li><strong>Orchestration</strong> — coordinate automation <em>across</em> systems
          (deploy the database, wait, then deploy the API that depends on it).</li>
      </ul>
    `,
  },

  // ── Why agentless matters ─────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Key Characteristics: Agentless by Design',
    content: `
      <p>
        Ansible's defining trait is that it is <strong>agentless</strong>. There is no daemon to
        install on the managed hosts, no central database, no certificate authority. Ansible
        connects over the protocols that are <em>already there</em>:
      </p>
      <ul>
        <li><strong>OpenSSH</strong> for Linux / Unix / macOS targets</li>
        <li><strong>WinRM</strong> (Remote PowerShell) for Windows targets</li>
      </ul>

      <p>The practical consequences:</p>
      <ul>
        <li><strong>Minimal footprint</strong> — the managed host needs only Python and SSH;
          nothing Ansible-specific is left running.</li>
        <li><strong>Easy to read and write</strong> — playbooks are YAML, declarative and
          reviewable in a pull request.</li>
        <li><strong>Secure by default</strong> — it rides on SSH keys, <code>sudo</code>/<code>root</code>
          escalation, and your existing auth model.</li>
        <li><strong>Open and extendable</strong> — 450+ bundled modules plus shareable roles
          from Ansible Galaxy.</li>
      </ul>
    `,
  },

  {
    type: 'note',
    variant: 'tip',
    content: `
      <strong>Mental model for app developers:</strong> a Dockerfile bakes an image; an Ansible
      playbook configures a long-lived host <em>in place</em>. Where Docker ships an immutable
      artifact, Ansible converges a mutable server toward a declared state. The two are
      complementary — Ansible often provisions the Docker host, the .NET runtime, or the Node.js
      version that everything else runs on.
    `,
  },

  // ── Where Ansible sits among the alternatives ─────────────────────────────

  {
    type: 'prose',
    title: 'Other Solutions — and Why Ansible Won Mindshare',
    content: `
      <p>Ansible is one of several configuration-management tools. The historic field:</p>
      <ul>
        <li><strong>Chef</strong> — recipes in a Ruby DSL; master–agent, pull-based.</li>
        <li><strong>Puppet</strong> — recipes in a Ruby DSL + embedded Ruby; master–agent.</li>
        <li><strong>Salt</strong> — recipes in YAML; agent (minions) or agentless modes.</li>
        <li><strong>Ansible</strong> (Red Hat) — recipes in YAML; <strong>agentless</strong>,
          push-based over SSH.</li>
      </ul>
      <p>
        Chef and Puppet require an agent and a master server. Ansible removed both: YAML instead
        of Ruby lowered the learning curve, and "just SSH" removed the bootstrap problem of
        getting an agent onto every node. That simplicity is why it became the default teaching
        tool and a fixture in CI/CD pipelines.
      </p>
    `,
  },

  // ── Architecture & components ─────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Architecture & Core Components',
    content: `
      <p>Everything in Ansible is built from a small set of pieces:</p>
      <ul>
        <li><strong>Inventory</strong> — the list of managed hosts, grouped and parameterised.
          Static (a file) or dynamic (a script/plugin that queries a cloud API).</li>
        <li><strong>Modules</strong> — the units that do the actual work (<code>apt</code>,
          <code>yum</code>, <code>service</code>, <code>copy</code>, <code>template</code>,
          <code>user</code>…). ~450 ship in the box.</li>
        <li><strong>Tasks</strong> — a single invocation of a module ("install nginx").</li>
        <li><strong>Plays</strong> — map a group of hosts to an ordered list of tasks.</li>
        <li><strong>Playbooks</strong> — one or more plays in a YAML file; the unit you run and
          commit to git.</li>
        <li><strong>Roles</strong> — a reusable, shareable directory structure of tasks, vars,
          templates, handlers, and files.</li>
      </ul>
      <p>
        Flow: a <strong>playbook</strong> contains <strong>plays</strong> → each play targets
        hosts from the <strong>inventory</strong> and runs <strong>tasks</strong> → each task
        calls a <strong>module</strong> over SSH. Python on the remote host executes the module
        and reports back <em>changed / ok / failed</em>.
      </p>
    `,
  },

  {
    type: 'note',
    variant: 'info',
    content: `
      <strong>Requirements.</strong> The <em>control node</em> needs Python 3.x and runs on
      Linux/Unix/macOS (Windows is not supported as a controller — use WSL). Each
      <em>managed node</em> needs SSH and Python (Linux) or Remote PowerShell (Windows).
      No version of Ansible runs <em>on</em> the hosts it manages.
    `,
  },

  // ── Installation (commands block inside pageBlocks) ───────────────────────

  {
    type: 'commands',
    section: 'install',
    sectionTitle: 'Installation & First Contact',
    items: [
      {
        id: 400, section: 'install', sectionTitle: 'Installation & First Contact',
        commandTitle: 'Install Ansible (Debian / Ubuntu)',
        command: 'sudo apt-add-repository --yes ppa:ansible/ansible && sudo apt-get update && sudo apt-get install -y ansible',
        searchTerms: 'install ansible ubuntu debian apt ppa repository',
        description: 'Adds the official Ansible PPA and installs from it. The distro packages are often old, so the PPA (or <code>pip</code>) gets you a current release on Ubuntu/Debian.',
        parts: [
          { text: 'apt-add-repository ppa:ansible/ansible', explanation: 'registers the Ansible-maintained PPA so apt sees up-to-date packages' },
          { text: 'apt-get update', explanation: 'refreshes the package index to pick up the new repo' },
          { text: 'apt-get install -y ansible', explanation: 'installs the ansible CLI, ansible-playbook, ansible-doc and ansible-galaxy' },
        ],
        example: '$ ansible --version\nansible [core 2.16.3]\n  config file = /etc/ansible/ansible.cfg\n  python version = 3.12.3',
        why: 'Ubuntu is the most common Node.js target distro, so this is the install you will reach for most when provisioning Express/Nuxt boxes.'
      },
      {
        id: 401, section: 'install', sectionTitle: 'Installation & First Contact',
        commandTitle: 'Install Ansible (RHEL / CentOS / Rocky)',
        command: 'sudo yum install -y epel-release && sudo yum install -y ansible',
        searchTerms: 'install ansible centos rhel rocky yum epel redhat',
        description: 'On RHEL-family systems Ansible lives in EPEL (Extra Packages for Enterprise Linux). Enable EPEL first, then install. This is the family used throughout the DOB practice (CentOS 7).',
        parts: [
          { text: 'yum install epel-release', explanation: 'enables the EPEL repository that carries the ansible package' },
          { text: 'yum install ansible', explanation: 'installs Ansible and its CLI tools' },
        ],
        example: '$ which ansible ansible-playbook ansible-doc ansible-galaxy\n/usr/bin/ansible\n/usr/bin/ansible-playbook\n/usr/bin/ansible-doc\n/usr/bin/ansible-galaxy',
        why: 'CentOS/RHEL is the classic .NET-on-Linux and enterprise host. The DOB labs target CentOS 7, so this is the controller install for the practice exercises.'
      },
      {
        id: 402, section: 'install', sectionTitle: 'Installation & First Contact',
        commandTitle: 'Install Ansible (pip — any platform)',
        command: 'python3 -m pip install --user ansible',
        searchTerms: 'install ansible pip python package manager virtualenv',
        description: 'The portable way: install Ansible as a Python package. Works inside a virtualenv and gives you exact version control — handy on a macOS control node or in CI.',
        parts: [
          { text: 'python3 -m pip install --user ansible', explanation: 'installs the latest Ansible into the user site-packages, no root needed' },
          { text: '(optional) pip install ansible==9.*', explanation: 'pin a major version for reproducible CI runs' },
        ],
        example: '$ python3 -m pip install --user ansible\nSuccessfully installed ansible-9.5.1 ansible-core-2.16.6',
        why: 'In a CI/CD pipeline you want a pinned, reproducible Ansible. pip in a virtualenv is how you get that, independent of whatever the build image ships.'
      },
      {
        id: 403, section: 'install', sectionTitle: 'Installation & First Contact',
        commandTitle: 'Verify connectivity with the ping module',
        command: 'ansible all -i inventory -m ping',
        searchTerms: 'ansible ping module verify connectivity ssh test reachable',
        description: 'The <code>ping</code> module is not ICMP — it SSHes to each host, runs a tiny Python payload, and confirms the host is reachable <em>and</em> usable by Ansible. The canonical "is my inventory wired up?" check.',
        parts: [
          { text: 'ansible all', explanation: 'targets every host in the inventory' },
          { text: '-i inventory', explanation: 'use this inventory file instead of the global /etc/ansible/hosts' },
          { text: '-m ping', explanation: 'run the ping module — SSH in, execute Python, return pong' },
        ],
        example: 'web | SUCCESS => {\n    "changed": false,\n    "ping": "pong"\n}\ndb | SUCCESS => {\n    "ping": "pong"\n}',
        why: 'Before any real playbook, prove Ansible can log in and run Python on every node. A green pong rules out SSH, key, and Python problems up front.'
      },
    ],
  },

  // ── Where this module set goes next ───────────────────────────────────────

  {
    type: 'note',
    variant: 'tip',
    content: `
      <strong>Roadmap for this group.</strong> Next: <em>Inventory & Configuration</em> →
      <em>Ad-hoc Commands & Modules</em> → two parallel deploy tracks
      (<em>Playbooks · .NET</em> and <em>Playbooks · Node.js</em>) →
      <em>Roles, Templates & Galaxy</em> → the capstone <em>Homework: WEB + DB</em>.
      The .NET and Node.js tracks deploy the same shape of app so you can compare the two
      toolchains side by side.
    `,
  },

];
