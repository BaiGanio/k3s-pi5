// modules/m1/exam-m1.js
// M1 Exam — Introduction to DevOps & Vagrant.
// Derived from the existing M1 modules (devops-intro, vagrant-parallels,
// practice-vagrant-docker) and adapted to the project's platform — Apple Silicon
// with the Parallels provider and the native ARM64 Ubuntu box. pageBlocks format.

window.pageBlocks = [

  // ── Intro ──────────────────────────────────────────────────────────────────
  {
    type: 'prose',
    title: 'About this exam',
    content: `
      <p>
        This exam consolidates <strong>Module 1 — Introduction to DevOps</strong> into one
        end-to-end exercise: describe a server entirely in code, conjure it into existence with a
        single command, provision it automatically, and tear it down without fear. By the end you
        will have built a reproducible Vagrant environment on Apple Silicon — the foundation every
        later module (Docker, k3s, the Raspberry Pi 5) builds on.
      </p>
      <p>The parts mirror the exam paper:</p>
      <ul>
        <li><strong>A — Set up Vagrant</strong> and the Parallels provider on Apple Silicon.</li>
        <li><strong>B — Author a Vagrantfile</strong> — declare a VM's box, resources, network, and provisioner.</li>
        <li><strong>C — VM lifecycle</strong> — <code>up</code>, <code>ssh</code>, <code>status</code>, <code>halt</code>, <code>reload</code>, <code>destroy</code>.</li>
        <li><strong>D — Provision automatically</strong> — a shell provisioner that installs Docker on first boot.</li>
        <li><strong>E — Multi-machine</strong> — a two-VM web + database environment on a private network.</li>
      </ul>
    `,
  },
  {
    type: 'note',
    variant: 'info',
    content: 'On an <strong>Apple Silicon</strong> Mac, Parallels is the native hypervisor — it runs <code>arm64</code> guests directly on the CPU with no instruction translation. Pairing it with the native <code>bento/ubuntu-24.04-arm64</code> box means the VM, and every container inside it, runs at full speed. That same ARM64 architecture is what the Raspberry Pi 5 uses, so what you build here behaves identically there. (Swap <code>--provider parallels</code> for <code>--provider vmware_desktop</code> if you use VMware Fusion instead.)',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PART A — SET UP VAGRANT & PROVIDER
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Part A — Set up Vagrant & the Parallels provider',
    content: `
      <p>
        Vagrant talks to a hypervisor through a <em>provider</em> plugin. On Apple Silicon the default
        provider (VirtualBox) does not work, so you install the <code>vagrant-parallels</code> plugin
        and tell Vagrant to use it. Setting a default provider once saves typing
        <code>--provider</code> on every command.
      </p>
    `,
  },
  {
    type: 'commands',
    section: 'setup',
    sectionTitle: 'Part A — Set up Vagrant',
    items: [
      {
        id: 1,
        commandTitle: 'Verify Vagrant is installed',
        command: 'vagrant --version',
        searchTerms: 'vagrant version install verify check homebrew',
        description: 'Confirms the Vagrant CLI is on your PATH and prints its version. If this errors, install Vagrant first (e.g. <code>brew install --cask vagrant</code>) along with Parallels Desktop Pro.',
        parts: [
          { text: 'vagrant --version', explanation: 'prints the installed Vagrant version — the quickest install smoke test' },
        ],
        example: 'Vagrant 2.4.x',
        why: 'Everything in this exam runs through the <code>vagrant</code> CLI. Confirming it is present avoids chasing "command not found" errors mid-exercise.',
      },
      {
        id: 2,
        commandTitle: 'Install the Parallels provider plugin',
        command: 'vagrant plugin install vagrant-parallels && vagrant plugin list',
        searchTerms: 'vagrant plugin install parallels provider apple silicon list arm64',
        description: 'Installs the <code>vagrant-parallels</code> plugin so Vagrant can drive Parallels Desktop, then lists installed plugins to confirm it registered.',
        parts: [
          { text: 'vagrant plugin install vagrant-parallels', explanation: 'adds the Parallels provider — required on Apple Silicon, where VirtualBox is unavailable' },
          { text: 'vagrant plugin list', explanation: 'shows installed plugins and versions so you can confirm the install succeeded' },
        ],
        example: 'Installing the \'vagrant-parallels\' plugin. This can take a few minutes...\nInstalled the plugin \'vagrant-parallels (2.4.x)\'!\n\nvagrant-parallels (2.4.x, global)',
        why: 'Without a working provider plugin, <code>vagrant up</code> has nothing to talk to. The plugin is what bridges Vagrant\'s declarative file to a real Parallels VM.',
      },
      {
        id: 3,
        commandTitle: 'Set Parallels as the default provider',
        command: 'export VAGRANT_DEFAULT_PROVIDER=parallels',
        searchTerms: 'vagrant default provider environment variable parallels export shell profile',
        description: 'Sets an environment variable so Vagrant uses Parallels without an explicit <code>--provider</code> flag. Add this line to your <code>~/.zshrc</code> to make it permanent.',
        parts: [
          { text: 'export VAGRANT_DEFAULT_PROVIDER=parallels', explanation: 'tells every vagrant command in this shell to default to the Parallels provider' },
        ],
        example: '$ vagrant up        # now uses Parallels automatically, no --provider needed',
        why: 'On Apple Silicon, forgetting <code>--provider parallels</code> makes Vagrant fall back to VirtualBox and fail immediately. Setting the default removes that whole class of error.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PART B — AUTHOR A VAGRANTFILE
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Part B — Author a Vagrantfile',
    content: `
      <p>
        The <code>Vagrantfile</code> is the single declarative source of truth for a VM — its OS image,
        CPU/RAM, network, port forwarding, and which provisioner to run. Anyone who has this file can
        reproduce the exact same machine with one command. That reproducibility is the whole point of
        Infrastructure as Code.
      </p>
    `,
  },
  {
    type: 'commands',
    section: 'vagrantfile',
    sectionTitle: 'Part B — Write the Vagrantfile',
    items: [
      {
        id: 101,
        commandTitle: 'Create the project folder',
        command: 'mkdir dob-docker && cd dob-docker',
        searchTerms: 'mkdir cd project folder vagrant isolated state',
        description: 'Each Vagrant project lives in its own folder, which holds the <code>Vagrantfile</code>, the provisioner, and Vagrant\'s <code>.vagrant/</code> state directory. Run every command from here.',
        parts: [
          { text: 'mkdir dob-docker', explanation: 'a dedicated folder isolates this VM\'s state from other projects' },
          { text: 'cd dob-docker', explanation: 'all vagrant commands act on the Vagrantfile in the current directory' },
        ],
        example: '$ mkdir dob-docker && cd dob-docker\n$ pwd\n/Users/you/dob-docker',
        why: 'An empty folder makes the next steps unambiguous — no stale Vagrantfile, .vagrant/ state, or cached box to conflict with.',
      },
      {
        id: 102,
        commandTitle: 'Write the Vagrantfile',
        command: 'cat Vagrantfile',
        searchTerms: 'vagrantfile define box parallels private network forwarded port provision shell arm64 ubuntu memory cpus',
        description: 'Create a file named <code>Vagrantfile</code> and paste the content below. It declares one VM, <code>dob-docker</code>, on the native ARM64 Ubuntu box, gives it a static private-network IP and a forwarded port, sizes it on Parallels, and points the shell provisioner at <code>dobdocker.sh</code>.',
        parts: [
          { text: 'config.vm.define "dobdocker"', explanation: 'names the VM — Vagrant uses this identifier for up/ssh/halt/destroy' },
          { text: 'dobdocker.vm.box = "bento/ubuntu-24.04-arm64"', explanation: 'the native ARM64 Ubuntu 24.04 box — runs at full speed on Apple Silicon' },
          { text: 'private_network ip: "192.168.56.100"', explanation: 'a static IP on an isolated host-only network — reachable from your Mac at this address' },
          { text: 'forwarded_port guest: 8080, host: 8080', explanation: 'maps VM port 8080 to localhost:8080; auto_correct picks another host port if 8080 is taken' },
          { text: 'provision "shell", path: "dobdocker.sh"', explanation: 'runs dobdocker.sh inside the VM on first boot — this is where Docker gets installed (Part D)' },
          { text: 'provider :parallels { memory = 2048; cpus = 2 }', explanation: 'selects Parallels and sizes the VM at 2 GB RAM / 2 vCPUs' },
        ],
        example: `# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|

  config.ssh.insert_key = false

  config.vm.define "dobdocker" do |dobdocker|
    dobdocker.vm.box      = "bento/ubuntu-24.04-arm64"
    dobdocker.vm.hostname = "dob-docker"
    dobdocker.vm.network "private_network", ip: "192.168.56.100"
    dobdocker.vm.network "forwarded_port", guest: 8080, host: 8080, auto_correct: true
    dobdocker.vm.synced_folder ".", "/vagrant"
    dobdocker.vm.provision "shell", path: "dobdocker.sh"

    dobdocker.vm.provider :parallels do |prl|
      prl.name   = "dob-docker"
      prl.memory = 2048
      prl.cpus   = 2
    end
  end

end`,
        why: 'The Vagrantfile is the declarative source of truth. Anyone with it plus the provisioner can reproduce the exact same host with one command — that is Infrastructure as Code in practice.',
      },
      {
        id: 103,
        commandTitle: 'Validate the Vagrantfile syntax',
        command: 'vagrant validate',
        searchTerms: 'vagrant validate syntax check ruby error before up',
        description: 'Parses the <code>Vagrantfile</code> and reports any syntax or configuration errors — without creating a VM. A fast sanity check before <code>vagrant up</code>.',
        parts: [
          { text: 'vagrant validate', explanation: 'evaluates the Vagrantfile and confirms it is well-formed' },
        ],
        example: 'Vagrantfile validated successfully.',
        why: 'Catching a typo here takes a second; catching it five minutes into a failed <code>vagrant up</code> does not. Validate early.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PART C — VM LIFECYCLE
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Part C — Operate the VM lifecycle',
    content: `
      <p>
        These verbs are the day-to-day of working with a Vagrant VM: bring it <code>up</code>, get a
        shell with <code>ssh</code>, check <code>status</code>, pause it with <code>halt</code>, apply
        config changes with <code>reload</code>, and throw it away with <code>destroy</code>.
        Understanding what each does to your machine <em>and your data</em> is the core of the exam.
      </p>
    `,
  },
  {
    type: 'commands',
    section: 'lifecycle',
    sectionTitle: 'Part C — VM lifecycle',
    items: [
      {
        id: 201,
        commandTitle: 'Bring the VM up',
        command: 'vagrant up --provider parallels',
        searchTerms: 'vagrant up parallels provider boot download box provision first run',
        description: 'Reads the Vagrantfile, downloads the ARM64 Ubuntu box on first run (cached afterwards), creates the VM, configures networking, and runs the provisioner. First boot takes a few minutes; later boots after a <code>halt</code> take well under a minute.',
        parts: [
          { text: 'vagrant up', explanation: 'creates and boots the VM, running its provisioner on first boot only' },
          { text: '--provider parallels', explanation: 'selects Parallels explicitly (omit it if you set VAGRANT_DEFAULT_PROVIDER in Part A)' },
        ],
        example: "Bringing machine 'dobdocker' up with 'parallels' provider...\n==> dobdocker: Box 'bento/ubuntu-24.04-arm64' not found. Installing now...\n==> dobdocker: Configuring and enabling network interfaces...\n==> dobdocker: Running provisioner: shell...\n==> dobdocker: Machine booted and ready!",
        why: 'One command takes you from nothing to a fully provisioned VM — the DevOps payoff. A new hire runs this and gets the exact same setup as a senior engineer.',
      },
      {
        id: 202,
        commandTitle: 'Check VM status',
        command: 'vagrant status && vagrant global-status',
        searchTerms: 'vagrant status global-status running poweroff state list all vms',
        description: 'Shows the state of the VM(s) defined in this folder, then lists every Vagrant VM known on your whole machine (running or not) with its ID and directory.',
        parts: [
          { text: 'vagrant status', explanation: 'state of the VM(s) for the Vagrantfile in the current directory' },
          { text: 'vagrant global-status', explanation: 'every Vagrant environment on the system — handy for finding VMs you forgot to destroy' },
        ],
        example: 'Current machine states:\ndobdocker    running (parallels)\n\nid       name        provider   state    directory\n1a2b3c4  dobdocker   parallels  running  /Users/you/dob-docker',
        why: '<code>global-status</code> is how you find stray VMs eating RAM and disk from old projects — a common source of "why is my Mac slow" surprises.',
      },
      {
        id: 203,
        commandTitle: 'SSH into the VM',
        command: 'vagrant ssh',
        searchTerms: 'vagrant ssh connect login shell vm interactive aarch64',
        description: 'Opens an interactive shell inside the VM as the <code>vagrant</code> user, using the key Vagrant manages for you — no password needed.',
        parts: [
          { text: 'vagrant ssh', explanation: 'connects to the running VM over SSH and drops you at its prompt' },
        ],
        example: 'Welcome to Ubuntu 24.04 LTS (GNU/Linux 6.8.0 aarch64)\nvagrant@dob-docker:~$',
        why: 'The <code>aarch64</code> in the banner confirms the VM is native ARM64 — exactly what you want on Apple Silicon, and the same architecture as the Pi 5.',
      },
      {
        id: 204,
        commandTitle: 'Reload after a config change',
        command: 'vagrant reload --provision',
        searchTerms: 'vagrant reload restart reboot apply vagrantfile change provision again',
        description: 'Reboots the VM and re-reads the Vagrantfile — the way to apply changes to networking, ports, or resources without destroying the machine. <code>--provision</code> re-runs the provisioner too.',
        parts: [
          { text: 'vagrant reload', explanation: 'halts then boots the VM, re-applying the current Vagrantfile (memory, networks, ports)' },
          { text: '--provision', explanation: 'forces the provisioner to run again on this boot (it normally runs only on first up)' },
        ],
        example: '==> dobdocker: Attempting graceful shutdown of VM...\n==> dobdocker: Booting VM...\n==> dobdocker: Running provisioner: shell...',
        why: 'Not every Vagrantfile change needs a full destroy/rebuild. <code>reload</code> applies machine-level changes while keeping the disk and its data.',
      },
      {
        id: 205,
        commandTitle: 'Pause the VM (keeps everything)',
        command: 'vagrant halt',
        searchTerms: 'vagrant halt stop shutdown pause keep state disk resume',
        description: 'Gracefully shuts the VM down while keeping its disk. Bring it back with <code>vagrant up</code> — everything you installed is still there, and the boot is fast because no provisioning re-runs.',
        parts: [
          { text: 'vagrant halt', explanation: 'sends an ACPI shutdown to the guest, preserving the virtual disk' },
        ],
        example: '==> dobdocker: Attempting graceful shutdown of VM...',
        why: 'Use halt when you are done for the day but want to resume quickly — it frees RAM and CPU without throwing away the VM.',
      },
      {
        id: 206,
        commandTitle: 'Destroy the VM (start over clean)',
        command: 'vagrant destroy -f',
        searchTerms: 'vagrant destroy delete remove vm disk fresh clean disposable reproducible cattle',
        description: 'Permanently deletes the VM and its virtual disk. The Vagrantfile and provisioner are untouched, so <code>vagrant up</code> rebuilds an identical VM from scratch (the box stays cached, so no re-download).',
        parts: [
          { text: 'vagrant destroy', explanation: 'stops and deletes the VM and all its disks' },
          { text: '-f', explanation: 'skips the confirmation prompt' },
        ],
        example: '==> dobdocker: Forcing shutdown of VM...\n==> dobdocker: Deleting the machine...',
        why: 'Being able to throw the VM away and recreate it identically is the payoff of the declarative approach — servers are cattle, not pets. <code>destroy</code> is freedom, not fear.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PART D — PROVISIONING
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Part D — Provision automatically',
    content: `
      <p>
        A server you set up by hand is a server nobody can reproduce. The provisioner captures the
        install steps in a script that Vagrant runs as <strong>root</strong> on first boot — turning
        "I think I installed Docker like this" into an exact, repeatable recipe. Here the provisioner
        installs Docker Engine from Docker's official APT repository.
      </p>
    `,
  },
  {
    type: 'commands',
    section: 'provision',
    sectionTitle: 'Part D — Shell provisioner',
    items: [
      {
        id: 301,
        commandTitle: 'Write the dobdocker.sh provisioner',
        command: 'cat dobdocker.sh',
        searchTerms: 'provision shell script install docker engine apt ubuntu gpg key repository usermod group set -e',
        description: 'Create <code>dobdocker.sh</code> next to the Vagrantfile. Vagrant runs it as root on first boot: it adds Docker\'s official APT repo, installs Docker Engine, enables the service, and adds the <code>vagrant</code> user to the <code>docker</code> group.',
        parts: [
          { text: 'set -e', explanation: 'aborts the whole script if any command fails, so a half-installed VM surfaces immediately' },
          { text: 'apt-get install ... ca-certificates curl gnupg', explanation: 'prerequisites for fetching and verifying the Docker repository signing key' },
          { text: 'gpg --dearmor -o /etc/apt/keyrings/docker.gpg', explanation: "stores Docker's signing key so apt can verify the packages are authentic" },
          { text: 'deb [arch=arm64 ...]', explanation: 'pins the repo to the ARM64 packages — matching the native architecture of the VM' },
          { text: 'docker-ce docker-ce-cli containerd.io ...', explanation: 'the Engine, CLI, container runtime, and the buildx/compose plugins' },
          { text: 'usermod -aG docker vagrant', explanation: 'lets the vagrant user run docker without sudo (takes effect on next login)' },
        ],
        example: `#!/bin/bash
# Provisioner runs as root via Vagrant's shell provisioner — no sudo needed.
set -e

echo "* Install prerequisites ..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg

echo "* Add Docker's official GPG key ..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "* Add Docker repository (arm64) ..."
echo \\
  "deb [arch=arm64 signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \\
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \\
  > /etc/apt/sources.list.d/docker.list

echo "* Install Docker Engine ..."
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "* Enable and start Docker ..."
systemctl enable docker
systemctl start docker

echo "* Add vagrant user to docker group ..."
usermod -aG docker vagrant`,
        why: 'Putting install steps in a provisioner — rather than typing them after <code>vagrant up</code> — means the VM is identical every time you create it. Destroy it, recreate it, and Docker is back exactly as configured.',
      },
      {
        id: 302,
        commandTitle: 'Verify the provisioner worked',
        command: 'vagrant ssh -c "docker version && docker run --rm hello-world"',
        searchTerms: 'vagrant ssh command docker version hello-world verify provision arm64 native',
        description: 'Runs commands inside the VM without an interactive session: prints the Docker client/server versions and runs the <code>hello-world</code> container. Confirms the provisioner installed Docker and the group change took effect.',
        parts: [
          { text: 'vagrant ssh -c "…"', explanation: 'runs the given command inside the VM and returns — no interactive shell needed' },
          { text: 'docker version', explanation: 'a Server section means the daemon is running and your user can reach it without sudo' },
          { text: 'docker run --rm hello-world', explanation: 'pulls and runs the smoke-test image, then auto-removes the container' },
        ],
        example: 'Server: Docker Engine - Community\n  OS/Arch:  linux/arm64\n\nHello from Docker!\nThis message shows that your installation appears to be working correctly.',
        why: '<code>linux/arm64</code> proves Docker runs natively in the VM — no x86 emulation — and the green hello-world confirms the provisioner did its job end to end.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PART E — MULTI-MACHINE ENVIRONMENT
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Part E — A two-VM web + database environment',
    content: `
      <p>
        Real systems are more than one machine. A single Vagrantfile can define several VMs that boot
        together and talk over a private network — modelling a real deployment: a web tier and a
        database tier on an isolated network. Here you declare <code>app-web</code> and
        <code>app-db</code>, then prove they can reach each other.
      </p>
    `,
  },
  {
    type: 'commands',
    section: 'twovm',
    sectionTitle: 'Part E — Multi-machine setup',
    items: [
      {
        id: 401,
        commandTitle: 'Write a two-VM Vagrantfile',
        command: 'mkdir two-vm && cd two-vm && cat Vagrantfile',
        searchTerms: 'vagrantfile multi machine two vm web db private network define block parallels',
        description: 'In a new folder, create a Vagrantfile with two <code>config.vm.define</code> blocks — one per VM. Both sit on the same private network so they can talk by IP.',
        parts: [
          { text: 'config.vm.define "app-web"', explanation: 'the first VM — the web tier, on 192.168.56.10' },
          { text: 'config.vm.define "app-db"', explanation: 'the second VM — the database tier, on 192.168.56.20' },
          { text: 'private_network ip: "192.168.56.x"', explanation: 'puts both VMs on the same host-only network so they can reach each other directly' },
          { text: 'each on bento/ubuntu-24.04-arm64', explanation: 'the native ARM64 box for both — full speed on Apple Silicon' },
        ],
        example: `Vagrant.configure("2") do |config|
  config.ssh.insert_key = false
  config.vm.box = "bento/ubuntu-24.04-arm64"

  config.vm.define "app-web" do |web|
    web.vm.hostname = "app-web"
    web.vm.network "private_network", ip: "192.168.56.10"
    web.vm.provider :parallels do |prl|
      prl.name = "app-web"; prl.memory = 2048; prl.cpus = 2
    end
  end

  config.vm.define "app-db" do |db|
    db.vm.hostname = "app-db"
    db.vm.network "private_network", ip: "192.168.56.20"
    db.vm.provider :parallels do |prl|
      prl.name = "app-db"; prl.memory = 1024; prl.cpus = 1
    end
  end
end`,
        why: 'One file, two machines, version-controlled together — the same pattern scales to a whole environment. This models the web + database split you will containerise in later modules.',
      },
      {
        id: 402,
        commandTitle: 'Bring both VMs up',
        command: 'vagrant up --provider parallels',
        searchTerms: 'vagrant up multi machine both vms web db boot parallels',
        description: 'Boots every VM defined in the Vagrantfile in order. Vagrant creates <code>app-web</code> and <code>app-db</code>, each on its private-network IP.',
        parts: [
          { text: 'vagrant up', explanation: 'with multiple define blocks, brings up all VMs (pass a name to start just one)' },
        ],
        example: "==> app-web: Machine booted and ready!\n==> app-db: Machine booted and ready!",
        why: 'The whole environment comes up from one command — no manual ordering, no clicking. Run <code>vagrant status</code> to see both listed.',
      },
      {
        id: 403,
        commandTitle: 'SSH into a specific VM',
        command: 'vagrant ssh app-web',
        searchTerms: 'vagrant ssh named vm app-web target multi machine which',
        description: 'With more than one VM, you must name which to connect to. This opens a shell on <code>app-web</code>.',
        parts: [
          { text: 'vagrant ssh app-web', explanation: 'the VM name picks which machine to SSH into; without it Vagrant errors asking which one' },
        ],
        example: 'vagrant@app-web:~$',
        why: 'Every lifecycle command (<code>ssh</code>, <code>halt</code>, <code>destroy</code>, <code>provision</code>) takes an optional VM name in a multi-machine setup — target one without touching the others.',
      },
      {
        id: 404,
        commandTitle: 'Prove the two VMs can talk',
        command: 'vagrant ssh app-web -c "ping -c 3 192.168.56.20"',
        searchTerms: 'ping private network two vms app-web app-db connectivity reach 192.168.56 verify',
        description: 'From inside <code>app-web</code>, pings <code>app-db</code> at its private-network IP. Replies confirm the two VMs share a network and can communicate — the foundation of a web tier talking to a database tier.',
        parts: [
          { text: 'vagrant ssh app-web -c "…"', explanation: 'runs the ping inside app-web non-interactively' },
          { text: 'ping -c 3 192.168.56.20', explanation: "sends 3 packets to app-db's private IP" },
        ],
        example: 'PING 192.168.56.20 (192.168.56.20): 56 data bytes\n64 bytes from 192.168.56.20: icmp_seq=0 ttl=64 time=0.43 ms\n3 packets transmitted, 3 packets received, 0% packet loss',
        why: 'Successful replies prove the private network works — the web VM can reach the database VM. This is exactly the connectivity a real multi-tier app depends on.',
      },
    ],
  },

];
