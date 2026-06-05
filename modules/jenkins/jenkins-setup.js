// modules/jenkins/jenkins-setup.js
// M5: Jenkins Setup — Installation, Security, Users, Plugins
// Extracted from DOB-M5 Practice (Practice-M5-Jenkins.md, Part 1)

window.commandData = [

  // ── Section 1: Vagrant environment ────────────────────────────────────────

  {
    id: 501, section: "environment", sectionTitle: "Vagrant Environment",
    commandTitle: "Create the add_hosts.sh helper",
    command: "cat add_hosts.sh",
    searchTerms: "add hosts hosts file vagrant provision shell jenkins cluster",
    description: "Create an <code>add_hosts.sh</code> script that populates <code>/etc/hosts</code> with all cluster members. The Vagrantfile runs this as a shell provisioner so every VM can resolve the others by hostname on the private network.",
    parts: [
      { text: "#!/bin/bash", explanation: "standard bash shebang" },
      { text: "set -e", explanation: "exit immediately if any command fails — failsafe for provisioning" },
      { text: "192.168.99.100 master.sulab.local master", explanation: "the Jenkins master — also reachable as just 'master'" },
      { text: "192.168.99.101 client.sulab.local client", explanation: "remote SSH execution target (used in later exercises)" },
      { text: "192.168.99.102 slave.sulab.local slave", explanation: "dedicated build agent with Docker (used in later exercises)" },
    ],
    example: `#!/bin/bash
# add_hosts.sh — populate /etc/hosts for DOB Module 5 (Jenkins)
set -e

echo "192.168.99.100 master.sulab.local master" >> /etc/hosts
echo "192.168.99.101 client.sulab.local client" >> /etc/hosts
echo "192.168.99.102 slave.sulab.local   slave"  >> /etc/hosts

echo "[add_hosts] /etc/hosts updated with cluster members."`,
    why: "Without name resolution, you'd need to use raw IPs everywhere — 192.168.99.101 instead of client.sulab.local. Hostnames are self-documenting and survive IP changes if you update this one file."
  },
  {
    id: 502, section: "environment", sectionTitle: "Vagrant Environment",
    commandTitle: "Create the Vagrantfile (single-node master)",
    command: "cat Vagrantfile",
    searchTerms: "vagrant vagrantfile centos master jenkins port forward private network",
    description: "Create a <code>Vagrantfile</code> defining a single CentOS 7 VM — the Jenkins master. Port 8080 (Jenkins UI) and port 80 (HTTP, for later web demos) are forwarded to the host. The <code>add_hosts.sh</code> provisioner runs on first boot to set up inter-VM hostname resolution.",
    parts: [
      { text: "config.ssh.insert_key = false", explanation: "keep Vagrant's well-known insecure key — lets you SSH without manual key setup" },
      { text: "node.vm.box = 'shekeriev/centos-7-64-minimal'", explanation: "CentOS 7 minimal image — consistent with all DOB modules" },
      { text: "forwarded_port guest: 8080, host: 8080", explanation: "Jenkins UI reachable at http://localhost:8080 from your host browser" },
      { text: "forwarded_port guest: 80, host: 8000", explanation: "web server port — used later for deployed apps" },
      { text: "provision 'shell', path: 'add_hosts.sh'", explanation: "run the hosts file script on first boot" },
    ],
    example: `# -*- mode: ruby -*-
# vi: set ft=ruby :
#
# Vagrantfile — Jenkins Master (single node)
# DOB Module 5: Jenkins

Vagrant.configure("2") do |config|

  config.ssh.insert_key = false

  config.vm.define "master" do |node|
    node.vm.box      = "shekeriev/centos-7-64-minimal"
    node.vm.hostname = "master.sulab.local"
    node.vm.network "private_network", ip: "192.168.99.100"
    node.vm.network "forwarded_port", guest: 80,   host: 8000
    node.vm.network "forwarded_port", guest: 8080, host: 8080
    node.vm.provision "shell", path: "add_hosts.sh"
  end

end`,
    why: "A Vagrantfile is infrastructure as code — version-controlled, reviewable, and reproducible. Anyone on your team can run <code>vagrant up</code> from this file and get an identical Jenkins environment."
  },
  {
    id: 503, section: "environment", sectionTitle: "Vagrant Environment",
    commandTitle: "Bring up the VM",
    command: "vagrant up",
    searchTerms: "vagrant up boot provision vm start jenkins master",
    description: "Boot the master VM. The first run downloads the box image (~400 MB) and runs the <code>add_hosts.sh</code> provisioner — takes 2-5 minutes depending on your connection. Subsequent boots take seconds.",
    parts: [
      { text: "vagrant up", explanation: "creates and boots every machine defined in the Vagrantfile" },
      { text: "vagrant status", explanation: "lists each machine and whether it is running" },
    ],
    example: "Bringing machine 'master' up with 'virtualbox' provider...\n==> master: Importing base box 'shekeriev/centos-7-64-minimal'...\n==> master: Running provisioner: shell...\n==> master: Machine booted and ready!",
    why: "Vagrant gives you a disposable, reproducible environment. If something breaks, <code>vagrant destroy -f && vagrant up</code> resets everything. This is the foundation for all M5 exercises."
  },
  {
    id: 504, section: "environment", sectionTitle: "Vagrant Environment",
    commandTitle: "SSH into the master",
    command: "vagrant ssh master",
    searchTerms: "vagrant ssh master connect login",
    description: "Open an SSH session to the Jenkins master VM. All subsequent Jenkins installation and configuration commands are run inside this session.",
    parts: [
      { text: "vagrant ssh", explanation: "SSH into a Vagrant-managed VM using the auto-generated key" },
      { text: "master", explanation: "the VM name defined in the Vagrantfile" },
    ],
    example: "[vagrant@master ~]$",
    why: "Vagrant handles the SSH key exchange automatically — no password, no manual <code>ssh-copy-id</code>. You land as the <code>vagrant</code> user with passwordless sudo."
  },

  // ── Section 2: Jenkins installation ───────────────────────────────────────

  {
    id: 510, section: "install", sectionTitle: "Jenkins Installation",
    commandTitle: "Add the Jenkins repository (RHEL/CentOS)",
    command: "sudo wget https://pkg.jenkins.io/redhat/jenkins.repo -O /etc/yum.repos.d/jenkins.repo",
    searchTerms: "jenkins repository redhat centos yum repo add install",
    description: "Download the official Jenkins repository definition for RHEL-family distributions. This tells <code>yum</code> where to find the Jenkins packages. For Debian/Ubuntu, substitute <code>redhat</code> with <code>debian</code> in the URL. For LTS (Long-Term Support) releases, use <code>redhat-stable</code> instead of <code>redhat</code>.",
    parts: [
      { text: "sudo wget", explanation: "download a file as root" },
      { text: "pkg.jenkins.io/redhat/jenkins.repo", explanation: "the official Jenkins RPM repository definition" },
      { text: "-O /etc/yum.repos.d/jenkins.repo", explanation: "write the downloaded content to the yum repos directory" },
    ],
    example: "Length: 85 [text/plain]\nSaving to: '/etc/yum.repos.d/jenkins.repo'",
    why: "Adding the repository is the recommended installation method. It gives you automatic updates via <code>yum update</code> and proper dependency resolution. After installation, consider disabling the repo (<code>yum-config-manager --disable jenkins</code>) to prevent surprise upgrades — re-enable when you're ready to update."
  },
  {
    id: 511, section: "install", sectionTitle: "Jenkins Installation",
    commandTitle: "Import the Jenkins GPG key",
    command: "sudo rpm --import https://pkg.jenkins.io/redhat/jenkins.io.key",
    searchTerms: "jenkins gpg key import rpm verify signature",
    description: "Import the GPG signing key that Jenkins uses to sign its packages. Without this, <code>yum</code> will refuse to install from the repository because the packages aren't trusted.",
    parts: [
      { text: "rpm --import", explanation: "import a GPG public key into the RPM keyring" },
      { text: "jenkins.io.key", explanation: "the official Jenkins project signing key" },
    ],
    example: "(no output on success — verify with: rpm -qa gpg-pubkey*)",
    why: "Package signing prevents supply-chain attacks. Without the key import, you'd have to use <code>--nogpgcheck</code> — which defeats the purpose."
  },
  {
    id: 512, section: "install", sectionTitle: "Jenkins Installation",
    commandTitle: "Install Jenkins",
    command: "sudo yum install -y jenkins",
    searchTerms: "yum install jenkins package centos rhel",
    description: "Download and install Jenkins and its Java dependency. The <code>-y</code> flag auto-confirms, so the install runs without prompts. Jenkins will be installed to <code>/usr/lib/jenkins/</code> with configuration in <code>/etc/sysconfig/jenkins</code>. To install a specific version, first list available versions with <code>sudo yum list --show-duplicates jenkins</code>, then install with <code>sudo yum install jenkins-2.440-1.1</code>.",
    parts: [
      { text: "yum install", explanation: "install a package and its dependencies" },
      { text: "-y", explanation: "assume 'yes' to all prompts — non-interactive install" },
      { text: "jenkins", explanation: "the package name from the Jenkins repository" },
    ],
    example: "Installed:\n  jenkins.noarch 0:2.440.1-1.1\nDependency Installed:\n  java-11-openjdk.x86_64 1:11.0.22.0.7-2.el7_9",
    why: "The <code>jenkins</code> package depends on Java, so <code>yum</code> resolves and installs OpenJDK automatically. No separate Java install step needed."
  },
  {
    id: 513, section: "install", sectionTitle: "Jenkins Installation",
    commandTitle: "Start and enable Jenkins",
    command: "sudo systemctl start jenkins && sudo systemctl enable jenkins",
    searchTerms: "systemctl start enable jenkins service boot",
    description: "Start the Jenkins service immediately and configure it to auto-start on system boot. Jenkins listens on port 8080 by default.",
    parts: [
      { text: "systemctl start jenkins", explanation: "start the service now" },
      { text: "systemctl enable jenkins", explanation: "create symlinks so the service starts at boot" },
    ],
    example: "Created symlink /etc/systemd/system/multi-user.target.wants/jenkins.service → /usr/lib/systemd/system/jenkins.service.",
    why: "<code>start</code> brings it up now; <code>enable</code> ensures it survives a VM reboot. Both are needed for a persistent setup."
  },
  {
    id: 514, section: "install", sectionTitle: "Jenkins Installation",
    commandTitle: "Check Jenkins service status",
    command: "sudo systemctl status jenkins",
    searchTerms: "systemctl status jenkins check running verify",
    description: "Verify that Jenkins started successfully. Look for <code>active (running)</code> in the output. If it failed, check the logs with <code>sudo journalctl -u jenkins -n 50</code>.",
    parts: [
      { text: "systemctl status", explanation: "show the current state of a systemd service" },
      { text: "jenkins", explanation: "the Jenkins service unit name" },
    ],
    example: "● jenkins.service - Jenkins Continuous Integration Server\n   Active: active (running) since Fri 2024-06-05 10:15:22 UTC",
    why: "If Jenkins doesn't start, common causes: port 8080 is already in use, Java is missing, or <code>/var/lib/jenkins</code> has wrong permissions."
  },

  // ── Section 3: Firewall ───────────────────────────────────────────────────

  {
    id: 520, section: "firewall", sectionTitle: "Firewall Configuration",
    commandTitle: "Open port 8080 (Jenkins UI) and port 80 (HTTP)",
    command: "sudo firewall-cmd --permanent --zone=public --add-port=8080/tcp && sudo firewall-cmd --permanent --zone=public --add-port=80/tcp && sudo firewall-cmd --reload",
    searchTerms: "firewall firewalld open port 8080 80 jenkins web access",
    description: "Allow incoming TCP traffic on port 8080 (Jenkins web UI) and port 80 (HTTP, used later for web server demos). The <code>--permanent</code> flag persists the rules across reboots; <code>--reload</code> applies them immediately. If SELinux is enforcing, you may also need: <code>sudo setenforce 0</code> (temporarily set permissive) or configure SELinux policies for port 8080.",
    parts: [
      { text: "firewall-cmd --permanent --zone=public --add-port=8080/tcp", explanation: "add a permanent rule allowing TCP on the Jenkins port" },
      { text: "firewall-cmd --permanent --zone=public --add-port=80/tcp", explanation: "add a permanent rule for standard HTTP" },
      { text: "firewall-cmd --reload", explanation: "activate the new rules without dropping existing connections" },
    ],
    example: "success\nsuccess\nsuccess",
    why: "CentOS 7 ships with firewalld enabled by default. Without these rules, your host browser cannot reach Jenkins at <code>http://localhost:8080</code> — the port forward exists in Vagrant, but the VM's firewall still blocks it."
  },

  // ── Section 4: Unlocking Jenkins ──────────────────────────────────────────

  {
    id: 530, section: "unlock", sectionTitle: "First-Time Setup",
    commandTitle: "Retrieve the initial admin password",
    command: "sudo cat /var/lib/jenkins/secrets/initialAdminPassword",
    searchTerms: "jenkins initial admin password unlock first setup secret",
    description: "Jenkins locks itself on first run and requires a one-time password stored in <code>/var/lib/jenkins/secrets/initialAdminPassword</code>. Copy this value and paste it into the 'Unlock Jenkins' page at <code>http://localhost:8080</code>.",
    parts: [
      { text: "sudo cat", explanation: "read a file as root — the secrets directory is owned by jenkins:jenkins" },
      { text: "/var/lib/jenkins/secrets/initialAdminPassword", explanation: "the auto-generated one-time password file" },
    ],
    example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    why: "This prevents unauthorised access to a fresh Jenkins install before you've set up proper authentication. Without this password, you can't proceed past the setup wizard."
  },

  // ── Section 5: Plugin installation ────────────────────────────────────────

  {
    id: 540, section: "plugins", sectionTitle: "Plugin Installation",
    commandTitle: "Install suggested plugins (Web UI)",
    command: "# In the browser: http://localhost:8080 → select 'Install suggested plugins'",
    searchTerms: "jenkins install suggested plugins setup wizard",
    description: "After unlocking, Jenkins offers two paths: 'Install suggested plugins' (recommended — covers Git, Pipeline, SSH, and common integrations) or 'Select plugins to install' (manual curation). Choose <strong>Install suggested plugins</strong>.",
    parts: [
      { text: "Install suggested plugins", explanation: "installs ~16 plugins: Git, Pipeline, Folders, SSH Build Agents, Matrix Authorization, etc." },
      { text: "Select plugins to install", explanation: "choose individual plugins manually — use when you need a minimal install" },
    ],
    example: "Installing plugins... (takes 2-5 minutes)\nGit plugin ✓\nPipeline plugin ✓\nFolders plugin ✓\n...",
    why: "The suggested set covers the essentials you'll use throughout this module. Additional plugins (SSH, Schedule Build, Docker) are installed later as needed."
  },

  // ── Section 6: Admin user ─────────────────────────────────────────────────

  {
    id: 550, section: "users", sectionTitle: "User Management",
    commandTitle: "Create the admin user",
    command: "# In the setup wizard, after plugins install: fill in the admin user form",
    searchTerms: "jenkins create admin user first account setup",
    description: "Jenkins prompts you to create the first administrator account. This user gets full permissions (the 'Overall/Administer' right). For the DOB exercises, use: username <code>doadmin</code>, password <code>Password1</code>, full name <code>DevOps Administrator</code>.",
    parts: [
      { text: "Username: doadmin", explanation: "the admin account — used for all configuration tasks" },
      { text: "Password: Password1", explanation: "practice password (never use this in production!)" },
      { text: "Full name: DevOps Administrator", explanation: "display name shown in the UI" },
      { text: "E-mail: doadmin@sulab.local", explanation: "required field; can be any valid-looking address" },
    ],
    example: "Jenkins URL: http://192.168.99.100:8080/\n→ Click 'Save and Finish' → 'Start using Jenkins'",
    why: "The admin user controls all Jenkins configuration, job creation, and plugin management. Without it, Jenkins runs in a limited unsecured mode."
  },

  // ── Section 7: Jenkins system user ────────────────────────────────────────

  {
    id: 560, section: "system-user", sectionTitle: "Jenkins System User",
    commandTitle: "Check the jenkins system user",
    command: "cat /etc/passwd | grep jenkins",
    searchTerms: "jenkins system user shell passwd bash false",
    description: "The Jenkins service runs as a dedicated <code>jenkins</code> user. By default, its login shell is <code>/bin/false</code> — it can't log in interactively. For the exercises, we change this to <code>/bin/bash</code> so the user can run SSH commands and <code>docker</code>.",
    parts: [
      { text: "cat /etc/passwd", explanation: "display the user database" },
      { text: "grep jenkins", explanation: "filter for the jenkins user entry" },
    ],
    example: "jenkins:x:996:993:Jenkins:/var/lib/jenkins:/bin/false",
    why: "You need to see the current shell before changing it. <code>/bin/false</code> means the user exists for running services but cannot open a login session."
  },
  {
    id: 561, section: "system-user", sectionTitle: "Jenkins System User",
    commandTitle: "Change the jenkins user shell to bash",
    command: "sudo usermod -s /bin/bash jenkins",
    searchTerms: "usermod change shell jenkins bash login",
    description: "Set the login shell for the <code>jenkins</code> user to <code>/bin/bash</code>. This allows us to <code>su - jenkins</code> and run commands as that user — needed for SSH key generation and Docker access.",
    parts: [
      { text: "sudo usermod", explanation: "modify a user account" },
      { text: "-s /bin/bash", explanation: "set the login shell to bash" },
      { text: "jenkins", explanation: "the target user" },
    ],
    example: "(no output on success — verify with: getent passwd jenkins)",
    why: "Without a real shell, you can't generate SSH keys or run interactive commands as the jenkins user. This is a lab convenience — in production, you'd keep <code>/bin/false</code> and use the Jenkins UI for everything."
  },
  {
    id: 562, section: "system-user", sectionTitle: "Jenkins System User",
    commandTitle: "Set a password for the jenkins user",
    command: "echo 'jenkins:Password1' | sudo chpasswd",
    searchTerms: "set password jenkins user chpasswd passwd",
    description: "Set the password for the <code>jenkins</code> system user. This is needed for <code>ssh-copy-id</code> and <code>su</code> later. For the labs, use <code>Password1</code>.",
    parts: [
      { text: "echo 'jenkins:Password1'", explanation: "output the username:password pair" },
      { text: "sudo chpasswd", explanation: "read username:password pairs from stdin and update /etc/shadow" },
    ],
    example: "(no output on success)",
    why: "<code>chpasswd</code> is non-interactive — useful in provisioning scripts. Avoids the <code>passwd</code> interactive prompt which is hard to script."
  },
  {
    id: 563, section: "system-user", sectionTitle: "Jenkins System User",
    commandTitle: "Generate SSH keys for the jenkins user",
    command: "sudo su - jenkins -c 'ssh-keygen -t rsa -b 2048 -f ~/.ssh/id_rsa -N \"\"'",
    searchTerms: "ssh-keygen rsa key pair jenkins passwordless",
    description: "Generate an RSA key pair for the <code>jenkins</code> user. The <code>-N \"\"</code> flag means 'no passphrase' — required for automated SSH (Jenkins can't type a passphrase during builds). The keys are stored in <code>/var/lib/jenkins/.ssh/</code>.",
    parts: [
      { text: "su - jenkins -c '...' ", explanation: "run a command as the jenkins user in a login shell" },
      { text: "ssh-keygen -t rsa -b 2048", explanation: "generate a 2048-bit RSA key pair" },
      { text: "-N \"\"", explanation: "empty passphrase — no interactive prompt" },
    ],
    example: "Generating public/private rsa key pair.\nYour identification has been saved in /var/lib/jenkins/.ssh/id_rsa.\nYour public key has been saved in /var/lib/jenkins/.ssh/id_rsa.pub.",
    why: "Jenkins uses SSH keys (not passwords) to connect to agent nodes and remote hosts. A passphrase-less key is mandatory — there's no human to type the passphrase during an automated build."
  },

  // ── Section 8: Sudo privileges ────────────────────────────────────────────

  {
    id: 570, section: "sudo", sectionTitle: "Sudo Configuration",
    commandTitle: "Grant passwordless sudo to the jenkins user",
    command: "echo 'jenkins ALL=(ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/jenkins",
    searchTerms: "sudo visudo jenkins nopasswd passwordless privilege",
    description: "Add a sudoers rule that lets the <code>jenkins</code> user run any command as root without a password prompt. This is written to a dedicated file in <code>/etc/sudoers.d/</code> — cleaner than editing <code>/etc/sudoers</code> directly.",
    parts: [
      { text: "jenkins ALL=(ALL)", explanation: "the jenkins user, on any host, can run commands as any user" },
      { text: "NOPASSWD: ALL", explanation: "all commands, no password required" },
      { text: "tee /etc/sudoers.d/jenkins", explanation: "write to a drop-in sudoers file (included by the main config)" },
    ],
    example: "jenkins ALL=(ALL) NOPASSWD: ALL",
    why: "Jenkins build steps often need root — installing packages, restarting services, running Docker. Without NOPASSWD, the build hangs waiting for a password that will never arrive."
  },

  // ── Section 9: Security (Matrix-based auth) ───────────────────────────────

  {
    id: 580, section: "security", sectionTitle: "Security Configuration",
    commandTitle: "Configure Matrix-based security (Web UI)",
    command: "# Manage Jenkins → Configure Global Security → Authorization → Matrix-based security",
    searchTerms: "jenkins matrix security authorization role-based access control",
    description: "Enable <strong>Matrix-based security</strong> — a fine-grained permission model where each user gets individual checkboxes per right. Add <code>doadmin</code> with all permissions checked, then save.",
    parts: [
      { text: "Manage Jenkins → Configure Global Security", explanation: "navigate to the security settings page" },
      { text: "Matrix-based security", explanation: "granular user-level permission matrix — not role-based (that's a separate plugin)" },
      { text: "Add user: doadmin, grant all", explanation: "the admin user gets every permission" },
    ],
    example: "Permissions granted to doadmin:\n  Overall: Administer ✓ Read ✓\n  Job: Build ✓ Configure ✓ Create ✓ Delete ✓ Discover ✓ Read ✓\n  Run: Delete ✓ Replay ✓ Update ✓\n  View: Configure ✓ Create ✓ Delete ✓ Read ✓",
    why: "Without explicit security configuration, Jenkins runs in 'Anyone can do anything' mode — which is fine for a local VM but teaches bad habits. Matrix-based security is the standard enterprise pattern."
  },
  {
    id: 581, section: "security", sectionTitle: "Security Configuration",
    commandTitle: "Create a restricted user (douser)",
    command: "# Manage Jenkins → Manage Users → Create User",
    searchTerms: "jenkins create user restricted permissions douser",
    description: "Create a second user with limited permissions: <code>douser</code> / <code>Password2</code>. This user gets read access plus the ability to build and configure jobs — but not administer Jenkins itself. Demonstrates the principle of least privilege.",
    parts: [
      { text: "Username: douser", explanation: "the restricted user account" },
      { text: "Password: Password2", explanation: "different password — never reuse admin credentials" },
      { text: "Grant: Overall Read, Job Build/Configure/Read, Run Update, View Read", explanation: "enough to work with jobs, not enough to change global settings" },
    ],
    example: "douser permissions:\n  Overall: Read ✓\n  Job: Build ✓ Cancel ✓ Configure ✓ Discover ✓ Read ✓ Workspace ✓\n  Run: Update ✓\n  View: Configure ✓ Create ✓ Read ✓",
    why: "In a real team, developers get <code>douser</code>-level permissions — they can see and trigger builds but can't install plugins or change security settings. Only the DevOps lead has <code>doadmin</code> rights."
  },

  // ── Section 10: Restart & next steps ──────────────────────────────────────

  {
    id: 590, section: "restart", sectionTitle: "Restart & Verify",
    commandTitle: "Restart Jenkins to apply all changes",
    command: "sudo systemctl restart jenkins",
    searchTerms: "restart jenkins service apply changes systemctl",
    description: "Restart the Jenkins service. This applies the shell change, sudoers rule, and any plugin installations that require a restart. Wait ~15 seconds for Jenkins to come back up before refreshing the browser. You're done with setup — the Jenkins master is now installed, secured, and ready for job creation. Log in as <code>doadmin</code> at <code>http://localhost:8080</code>. Next: <em>jenkins-jobs</em> — creating your first builds, connecting to GitHub, and scheduling work.",
    parts: [
      { text: "systemctl restart jenkins", explanation: "stop the service and start it again" },
    ],
    example: "(no output on success — check with: systemctl status jenkins)",
    why: "Jenkins picks up system-level changes (user shell, environment, sudoers) only on restart. The web UI will show a brief 'Jenkins is restarting' page, then reload automatically."
  },

];
