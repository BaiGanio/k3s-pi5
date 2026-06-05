// modules/m1/practice-vagrant-docker.js
// k3s-pi5 practice lab for the VMs group — provision a single Docker host VM with Vagrant.
// Lab files live in modules/m1/labs/intro/ (Vagrantfile + dobdocker.sh).
// Parallels provider + native ARM64 Ubuntu — full speed on Apple Silicon. pageBlocks format.

window.pageBlocks = [

  // ── Intro ──────────────────────────────────────────────────────────────────
  {
    type: 'prose',
    title: 'What you will learn',
    content: `
      <p>
        This lab teaches you to treat a server as <strong>code</strong> instead of something you
        click together by hand. You will write two small files that, together, describe a complete
        Docker host — and then conjure that host into existence with a single command. This is the
        core idea behind everything later in the course: a Raspberry Pi, a k3s node, a cloud VM —
        all of them are just machines described by files you can version, share, and rebuild.
      </p>
      <p>By the end you will be able to:</p>
      <ul>
        <li><strong>Describe a VM declaratively</strong> in a <code>Vagrantfile</code> — its OS image, CPU/RAM, network, and port forwarding.</li>
        <li><strong>Automate setup with a provisioner</strong> — a shell script (<code>dobdocker.sh</code>) that installs and configures Docker on first boot, with zero manual steps.</li>
        <li><strong>Operate the VM lifecycle</strong> — <code>up</code>, <code>ssh</code>, <code>halt</code>, and <code>destroy</code> — and understand what each one does to your machine and your data.</li>
        <li><strong>Verify a container runtime</strong> and prove your containers run as native ARM64 on Apple Silicon.</li>
      </ul>
    `,
  },

  {
    type: 'prose',
    title: 'Why you are doing it this way',
    content: `
      <p>
        <strong>Why a VM at all, when you could just install Docker on your Mac?</strong>
        Because the goal is to practice provisioning a <em>Linux server</em> the way you will in
        production. Docker on a real Linux host behaves differently from Docker Desktop's macOS
        VM wrapper — systemd manages the daemon, packages come from APT, and the user/group model
        is the real thing. A throwaway VM lets you make mistakes, wipe it, and start clean.
      </p>
      <p>
        <strong>Why Parallels and an ARM64 Ubuntu box?</strong> On an Apple Silicon Mac, Parallels
        is the native hypervisor — it runs ARM64 guests directly on the CPU with no instruction
        translation. Pairing it with the native <code>bento/ubuntu-24.04-arm64</code> box means the
        VM, and every container inside it, runs at full speed. That same ARM64 architecture is what
        your Raspberry Pi 5 uses, so the images you build here behave identically there.
      </p>
      <p>
        <strong>Why put the install in a script instead of typing it?</strong> Because a server you
        set up by hand is a server nobody can reproduce. Capturing the steps in
        <code>dobdocker.sh</code> turns "I think I installed Docker like this" into an exact,
        repeatable recipe — the essence of Infrastructure as Code.
      </p>
      <p><strong>The two files you will write</strong> (they live in <code>modules/m1/labs/intro/</code>):</p>
      <ul>
        <li><code>Vagrantfile</code> — declares the <code>dob-docker</code> VM: box, resources, network, port forward, and which provisioner to run.</li>
        <li><code>dobdocker.sh</code> — the provisioner: installs Docker Engine from Docker's official APT repository and wires up the <code>vagrant</code> user.</li>
      </ul>
    `,
  },

  {
    type: 'note',
    variant: 'tip',
    content: 'This lab assumes Vagrant and the <code>vagrant-parallels</code> plugin are already installed — both are covered in the <em>Vagrant + Parallels on M1 Pro</em> module. If <code>vagrant plugin list</code> does not show <code>vagrant-parallels</code>, run <code>vagrant plugin install vagrant-parallels</code> first.',
  },

  // ── Step 1: Project files ────────────────────────────────────────────────
  {
    type: 'commands',
    section: 'files',
    sectionTitle: 'Set up the project files',
    items: [
      {
        id: 1,
        commandTitle: 'Create the project folder',
        command: 'mkdir dob-docker && cd dob-docker',
        searchTerms: 'mkdir cd project folder vagrant lab docker host',
        description: 'Creates a clean folder to hold the <code>Vagrantfile</code>, the <code>dobdocker.sh</code> provisioner, and Vagrant\'s <code>.vagrant/</code> state directory. Run every command in this lab from here.',
        parts: [
          { text: 'mkdir dob-docker', explanation: 'each Vagrant project lives in its own folder so its state is isolated from other projects' },
          { text: 'cd dob-docker', explanation: 'all vagrant commands act on the Vagrantfile in the current directory' },
        ],
        example: "$ mkdir dob-docker && cd dob-docker\n$ pwd\n/Users/you/dob-docker",
        why: "An empty folder makes the next two steps unambiguous — no stale Vagrantfile, .vagrant/ state, or cached box to conflict with.",
      },
      {
        id: 2,
        commandTitle: 'Write the Vagrantfile',
        command: 'cat Vagrantfile',
        searchTerms: 'vagrantfile define box parallels private network forwarded port provision shell arm64 ubuntu',
        description: 'Create a file named <code>Vagrantfile</code> in the project folder and paste the content from <strong>Example output</strong> below. It declares one VM, <code>dob-docker</code>, on the ARM64 Ubuntu box, wires a private-network IP and a forwarded port, and points the shell provisioner at <code>dobdocker.sh</code>.',
        parts: [
          { text: "config.vm.define \"dobdocker\"", explanation: 'names the VM — Vagrant uses this as the machine identifier for up/ssh/halt/destroy' },
          { text: "dobdocker.vm.box = \"bento/ubuntu-24.04-arm64\"", explanation: 'the native ARM64 Ubuntu 24.04 box — runs at full speed on Apple Silicon' },
          { text: "private_network ip: \"192.168.56.100\"", explanation: 'static IP on an isolated host-only network — the VM is reachable from your Mac at this address' },
          { text: "forwarded_port guest: 8080, host: 8080", explanation: 'maps VM port 8080 to localhost:8080 on your Mac; auto_correct picks another host port if 8080 is taken' },
          { text: "provision \"shell\", path: \"dobdocker.sh\"", explanation: 'runs dobdocker.sh inside the VM on first boot — this is where Docker gets installed' },
          { text: "provider :parallels", explanation: 'selects Parallels as the hypervisor and sizes the VM at 2 GB RAM / 2 vCPUs' },
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
        why: "The Vagrantfile is the single declarative source of truth for the VM. Anyone who has it plus dobdocker.sh can reproduce the exact same Docker host with one command — that reproducibility is the whole point of Infrastructure as Code.",
      },
      {
        id: 3,
        commandTitle: 'Write the dobdocker.sh provisioner',
        command: 'cat dobdocker.sh',
        searchTerms: 'provision shell script install docker engine apt ubuntu gpg key repository usermod group',
        description: 'Create <code>dobdocker.sh</code> next to the Vagrantfile and paste the content below. Vagrant runs it as <strong>root</strong> inside the VM on first boot. It adds Docker\'s official APT repo, installs Docker Engine, enables the service, and adds the <code>vagrant</code> user to the <code>docker</code> group.',
        parts: [
          { text: 'set -e', explanation: 'aborts the whole script if any command fails, so a half-installed VM surfaces immediately instead of silently' },
          { text: 'apt-get install ... ca-certificates curl gnupg', explanation: 'prerequisites for fetching and verifying the Docker repository signing key' },
          { text: 'gpg --dearmor -o /etc/apt/keyrings/docker.gpg', explanation: "stores Docker's signing key so apt can verify the packages are authentic" },
          { text: 'deb [arch=arm64 ...]', explanation: 'pins the repo to the ARM64 packages — matching the native architecture of the VM' },
          { text: 'docker-ce docker-ce-cli containerd.io ...', explanation: 'the Engine, CLI, container runtime, and the buildx/compose plugins' },
          { text: 'usermod -aG docker vagrant', explanation: 'lets the vagrant user run docker without sudo (takes effect on the next login)' },
        ],
        example: `#!/bin/bash
# Provisioner runs as root via Vagrant's shell provisioner — no sudo needed.
set -e

echo "* Add host entry ..."
echo "192.168.56.100 dob-docker" >> /etc/hosts

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
        why: "Putting install steps in a provisioner — rather than typing them by hand after vagrant up — means the VM is identical every single time you create it. Destroy it, recreate it, and Docker is back exactly as configured.",
      },
    ],
  },

  // ── Step 2: Boot the VM ──────────────────────────────────────────────────
  {
    type: 'commands',
    section: 'up',
    sectionTitle: 'Boot the VM and connect',
    items: [
      {
        id: 101,
        commandTitle: 'Bring the VM up with the Parallels provider',
        command: 'vagrant up --provider parallels',
        searchTerms: 'vagrant up parallels provider boot download box provision docker install',
        description: 'Reads the Vagrantfile, downloads the ARM64 Ubuntu box on first run (cached afterwards), creates the VM, and runs <code>dobdocker.sh</code>. First boot takes a few minutes — mostly the apt installs; later boots after a <code>halt</code> take well under a minute.',
        parts: [
          { text: 'vagrant up', explanation: 'creates and boots the VM defined in the Vagrantfile, running its provisioner on first boot only' },
          { text: '--provider parallels', explanation: 'selects Parallels explicitly — without it Vagrant defaults to VirtualBox and errors immediately on Apple Silicon' },
        ],
        example: "Bringing machine 'dobdocker' up with 'parallels' provider...\n==> dobdocker: Box 'bento/ubuntu-24.04-arm64' not found. Installing now...\n==> dobdocker: Setting hostname...\n==> dobdocker: Configuring and enabling network interfaces...\n==> dobdocker: Running provisioner: shell...\n    dobdocker: * Install prerequisites ...\n    dobdocker: * Install Docker Engine ...\n    dobdocker: * Enable and start Docker ...\n==> dobdocker: Machine booted and ready!",
        why: "One command takes you from nothing to a fully provisioned Docker host. Set VAGRANT_DEFAULT_PROVIDER=parallels in your shell if you would rather not type --provider every time.",
      },
      {
        id: 102,
        commandTitle: 'SSH into the VM',
        command: 'vagrant ssh',
        searchTerms: 'vagrant ssh connect login shell vm dobdocker',
        description: 'Opens an interactive shell inside the <code>dob-docker</code> VM as the <code>vagrant</code> user. Because that user was added to the <code>docker</code> group by the provisioner, you can run <code>docker</code> without <code>sudo</code>.',
        parts: [
          { text: 'vagrant ssh', explanation: 'connects to the running VM using the key Vagrant manages for you — no password needed' },
        ],
        example: "Welcome to Ubuntu 24.04 LTS (GNU/Linux 6.8.0 aarch64)\nvagrant@dob-docker:~$",
        why: "Everything from here is run inside the VM. The aarch64 in the banner confirms the VM is native ARM64 — exactly what you want on Apple Silicon.",
      },
    ],
  },

  // ── Step 3: Verify Docker ─────────────────────────────────────────────────
  {
    type: 'note',
    variant: 'info',
    content: 'Run the commands in this step <strong>inside the VM</strong>, in the shell opened by <code>vagrant ssh</code>.',
  },
  {
    type: 'commands',
    section: 'verify',
    sectionTitle: 'Verify Docker works',
    items: [
      {
        id: 201,
        commandTitle: 'Check the Docker version',
        command: 'docker version',
        searchTerms: 'docker version client server engine verify check no sudo',
        description: 'Prints both the client and server (daemon) versions. If the server section appears, the daemon is running and your user can reach it without <code>sudo</code> — confirming the group change worked.',
        parts: [
          { text: 'docker version', explanation: 'queries both the CLI and the daemon; if the daemon were unreachable you would get a permission or connection error instead' },
        ],
        example: "Client: Docker Engine - Community\n Version:    27.x.x\nServer: Docker Engine - Community\n Engine:\n  Version:  27.x.x\n  OS/Arch:  linux/arm64",
        why: "linux/arm64 in the Server section is the proof that Docker is running natively — no x86 emulation layer anywhere in the stack.",
      },
      {
        id: 202,
        commandTitle: 'Run the hello-world container',
        command: 'docker run hello-world',
        searchTerms: 'docker run hello-world first container test smoke pull image',
        description: 'Pulls the tiny <code>hello-world</code> image from Docker Hub and runs it. It prints a success message and exits — the simplest end-to-end test that pull, create, run, and output streaming all work.',
        parts: [
          { text: 'docker run', explanation: 'creates and starts a container from an image, pulling it from Docker Hub if not already cached' },
          { text: 'hello-world', explanation: "a minimal official image whose only job is to print a success message and exit" },
        ],
        example: "Unable to find image 'hello-world:latest' locally\nlatest: Pulling from library/hello-world\n\nHello from Docker!\nThis message shows that your installation appears to be working correctly.",
        why: "Proves the whole pipeline — Docker can reach the registry, pull a multi-arch image (the arm64 variant here), create a container, run it, and stream its output back.",
      },
      {
        id: 203,
        commandTitle: 'Confirm containers run as ARM64',
        command: 'docker run --rm alpine uname -m',
        searchTerms: 'docker run alpine uname architecture arm64 aarch64 native rm',
        description: 'Runs <code>uname -m</code> inside a throwaway Alpine container to print the machine architecture. On Apple Silicon this is <code>aarch64</code>, confirming containers share the host\'s native ARM64 architecture.',
        parts: [
          { text: '--rm', explanation: 'automatically removes the container once it exits, leaving no clutter behind' },
          { text: 'alpine uname -m', explanation: "overrides the image's default command to print the kernel architecture the container sees" },
        ],
        example: "aarch64",
        why: "It makes the architecture concrete: containers are not VMs — they share the host kernel, so an ARM64 host runs ARM64 containers. This is why image architecture matters when you later move work onto the Raspberry Pi 5 (also ARM64).",
      },
    ],
  },

  // ── Step 4: Tear down ──────────────────────────────────────────────────────
  {
    type: 'commands',
    section: 'teardown',
    sectionTitle: 'Stop or destroy the VM',
    items: [
      {
        id: 301,
        commandTitle: 'Leave the VM (back to your Mac)',
        command: 'exit',
        searchTerms: 'exit logout leave vm ssh session back mac host',
        description: 'Ends the SSH session and returns you to your Mac\'s shell. The VM keeps running in the background.',
        parts: [
          { text: 'exit', explanation: 'closes the in-VM shell; the VM itself is unaffected and stays up' },
        ],
        example: "vagrant@dob-docker:~$ exit\nlogout\n$",
        why: "exit only ends the SSH session — useful when you want to keep the VM running but get back to your Mac.",
      },
      {
        id: 302,
        commandTitle: 'Pause the VM (keeps everything)',
        command: 'vagrant halt',
        searchTerms: 'vagrant halt stop shutdown pause keep state disk',
        description: 'Gracefully shuts the VM down while keeping its disk. Bring it back with <code>vagrant up --provider parallels</code> — Docker and everything you installed are still there, and the boot is fast because no provisioning re-runs.',
        parts: [
          { text: 'vagrant halt', explanation: 'sends an ACPI shutdown to the guest OS, preserving the virtual disk' },
        ],
        example: "==> dobdocker: Attempting graceful shutdown of VM...",
        why: "Use halt when you are done for the day but want to resume quickly — it frees RAM and CPU on your Mac without throwing away the VM.",
      },
      {
        id: 303,
        commandTitle: 'Destroy the VM (start over clean)',
        command: 'vagrant destroy -f',
        searchTerms: 'vagrant destroy delete remove vm disk fresh clean reproducible',
        description: 'Permanently deletes the VM and its virtual disk. The Vagrantfile and <code>dobdocker.sh</code> are untouched, so <code>vagrant up --provider parallels</code> rebuilds an identical VM from scratch. The box image stays cached, so the rebuild skips the download.',
        parts: [
          { text: 'vagrant destroy', explanation: 'stops and deletes the VM and all its disks' },
          { text: '-f', explanation: 'skips the confirmation prompt' },
        ],
        example: "==> dobdocker: Forcing shutdown of VM...\n==> dobdocker: Deleting the machine...",
        why: "Being able to throw the VM away and recreate it identically is the payoff of the whole declarative approach — the VM is disposable because the Vagrantfile and provisioner are the real artifacts.",
      },
    ],
  },

];
