// modules/m4/practice-ansible-lab.js
// Practice lab for the Ansible track — the original DOB-M4 hands-on practice,
// presented faithfully (CentOS/Ubuntu VMs, Apache + MariaDB, real lab files).
// Source: 4/Practice-M4-Ansible.md + 4/DOB-M4-Practice-Files/{M4-1,M4-2,M4-3}
// Unlike the concept modules (which recast everything to .NET/Node), this keeps
// the authentic lab so you can follow the practice file-for-file.

window.pageBlocks = [

  // ── Intro ──────────────────────────────────────────────────────────────────
  {
    type: 'prose',
    title: 'What you will build',
    content: `
      <p>
        This is the hands-on <strong>DOB Module 4 practice</strong>, walked end to end. You provision a
        small fleet of VMs with Vagrant, then drive them entirely from a <strong>control node</strong>
        with Ansible — agentless, over SSH (and, at the very end, a <strong>Windows</strong> host over WinRM).
        You will go from one-off ad-hoc commands to a full, idempotent, role-based deploy of
        <strong>Apache</strong> and <strong>MariaDB</strong>.
      </p>
      <p>The lab follows the original three parts plus a heterogeneous finale:</p>
      <ul>
        <li><strong>Part 1</strong> — ad-hoc commands: <code>command</code> vs <code>shell</code>, running scripts on remote hosts.</li>
        <li><strong>Part 2</strong> — inventories, groups, <code>group_vars</code>/<code>host_vars</code> precedence, <code>ansible.cfg</code>, core modules.</li>
        <li><strong>Part 3</strong> — playbooks, <code>register</code>/<code>debug</code>, <code>copy</code>, retry files, conditionals, Jinja2 templates and roles.</li>
        <li><strong>Heterogeneous</strong> — add a Windows host and manage it over WinRM with the <code>win_*</code> modules.</li>
      </ul>
    `,
  },
  {
    type: 'prose',
    title: 'Why this matters',
    content: `
      <p>
        The concept modules in this group teach the same ideas recast as modern .NET / Node deploys.
        This lab does the opposite: it keeps the <em>authentic</em> practice — the exact files, hostnames
        (<code>web</code>, <code>db</code>, <code>clnt</code>, <code>webu</code>) and commands — so you can
        run it verbatim and build muscle memory. Typing the inventory, watching a <code>PLAY RECAP</code> flip
        from <code>changed</code> to <code>ok</code> on a re-run, and fixing a deliberately broken host with a
        <code>.retry</code> file is where the lesson actually lands.
      </p>
    `,
  },
  {
    type: 'note',
    variant: 'info',
    content: 'The original setup assumes a <strong>Linux control node</strong> (CentOS 7) with <strong>VirtualBox + Vagrant</strong>, and the lab archive unpacked into <code>~/DOB/M4</code>. The real files live under <code>4/DOB-M4-Practice-Files/</code> in this repo. Install Ansible on the control node first — RHEL/CentOS: <code>sudo yum install epel-release &amp;&amp; sudo yum install ansible</code>; Debian/Ubuntu: <code>sudo apt-add-repository ppa:ansible/ansible &amp;&amp; sudo apt update &amp;&amp; sudo apt install ansible</code>.',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PART 0 — PROVISION THE LAB
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'commands',
    section: 'setup',
    sectionTitle: 'Provision the lab VMs',
    items: [
      {
        id: 500,
        commandTitle: 'Author the Vagrantfile (M4-1/Vagrantfile)',
        command: 'cat Vagrantfile',
        searchTerms: 'vagrant vagrantfile centos web db clnt private network forwarded port box shekeriev insert_key',
        description: 'Working in <code>M4/M4-1</code>, create a <code>Vagrantfile</code> defining three CentOS 7 machines on a private network: <strong>web</strong>, <strong>db</strong> and <strong>clnt</strong>. <code>config.ssh.insert_key = false</code> keeps Vagrant\'s well-known insecure key so Ansible can log in with it later.',
        parts: [
          { text: 'config.ssh.insert_key = false', explanation: 'keep the shared insecure key — lets Ansible authenticate with the Vagrant private key' },
          { text: 'web → 192.168.98.100, forwarded 80→8080', explanation: 'the web host; reachable from the control node browser at http://localhost:8080' },
          { text: 'db → 192.168.98.101', explanation: 'the database host' },
          { text: 'clnt → 192.168.98.102', explanation: 'a plain client/station host used for the script and register exercises' },
        ],
        example: `# -*- mode: ruby -*-
Vagrant.configure(2) do |config|
  config.ssh.insert_key = false

  config.vm.define "web" do |web|
    web.vm.box = "shekeriev/centos-7-64-minimal"
    web.vm.hostname = "web.sulab.local"
    web.vm.network "private_network", ip: "192.168.98.100"
    web.vm.network "forwarded_port", guest: 80, host: 8080
  end

  config.vm.define "db" do |db|
    db.vm.box = "shekeriev/centos-7-64-minimal"
    db.vm.hostname = "db.sulab.local"
    db.vm.network "private_network", ip: "192.168.98.101"
  end

  config.vm.define "clnt" do |clnt|
    clnt.vm.box = "shekeriev/centos-7-64-minimal"
    clnt.vm.hostname = "clnt.sulab.local"
    clnt.vm.network "private_network", ip: "192.168.98.102"
  end
end`,
        why: "Vagrant gives you disposable, identical Linux hosts in minutes. The fixed private IPs are what every inventory in this lab targets — and forwarding 80→8080 lets you verify Apache from the host browser.",
      },
      {
        id: 501,
        commandTitle: 'Bring the machines up',
        command: 'vagrant up',
        searchTerms: 'vagrant up boot provision vms start lab three hosts',
        description: 'Boots all three VMs. The first run downloads the box and can take a few minutes; afterwards they start in seconds. Confirm they are running with <code>vagrant status</code>.',
        parts: [
          { text: 'vagrant up', explanation: 'creates and boots every machine defined in the Vagrantfile' },
          { text: 'vagrant status', explanation: 'lists each machine and whether it is running' },
        ],
        example: `Current machine states:
web   running (virtualbox)
db    running (virtualbox)
clnt  running (virtualbox)`,
        why: "These three hosts are the entire lab. Everything from here on runs from the control node against them — you never log into them to configure software by hand.",
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PART 1 — AD-HOC COMMANDS
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Part 1 — Ad-hoc commands',
    content: `
      <p>
        Before playbooks, get a feel for driving hosts one command at a time. You register the hosts in the
        <strong>global inventory</strong> (<code>/etc/ansible/hosts</code>), then run <code>ansible</code> with a
        module and arguments. Ad-hoc is perfect for quick checks (uptime, disk, restart a service) — the same
        modules you will later compose into playbooks.
      </p>
    `,
  },
  {
    type: 'commands',
    section: 'adhoc',
    sectionTitle: 'Part 1 · Ad-hoc & the script module',
    items: [
      {
        id: 510,
        commandTitle: 'Register the hosts in the global inventory',
        command: 'sudo vi /etc/ansible/hosts',
        searchTerms: 'global inventory /etc/ansible/hosts test-srv test-clnt groups add hosts su echo',
        description: 'Add the hosts (and two groups) to the default inventory at <code>/etc/ansible/hosts</code>. You can append with <code>su -c</code> or just edit the file as root.',
        parts: [
          { text: '[test-srv]', explanation: 'a group holding the two server IPs (web + db)' },
          { text: '[test-clnt]', explanation: 'a group holding the client IP (clnt)' },
        ],
        example: `[test-srv]
192.168.98.100
192.168.98.101

[test-clnt]
192.168.98.102`,
        why: "With hosts in the default inventory you can target them by IP or group name with no -i flag — the quickest way to start poking at a new fleet.",
      },
      {
        id: 511,
        commandTitle: 'Run your first ad-hoc commands',
        command: 'ansible 192.168.98.100 -a "hostname" -u vagrant -k',
        searchTerms: 'ansible ad-hoc hostname -u vagrant -k password connection ssh first command',
        description: 'Target a single host and run <code>hostname</code>. <code>-u vagrant</code> sets the SSH user; <code>-k</code> asks for the SSH password (it is <code>vagrant</code>). If the host key is unknown, log in once with <code>ssh</code> first, or use <code>ssh-keyscan</code>.',
        parts: [
          { text: 'ansible 192.168.98.100', explanation: 'the host pattern — a single IP here' },
          { text: '-a "hostname"', explanation: 'arguments for the default `command` module — run /usr/bin/hostname' },
          { text: '-u vagrant -k', explanation: 'connect as user vagrant and prompt for the SSH password (vagrant)' },
        ],
        example: `SSH password:
192.168.98.100 | CHANGED | rc=0 >>
web.sulab.local`,
        why: "This is the smallest possible Ansible run: one host, one module, no inventory file beyond the global one. It proves connectivity and credentials before you build anything bigger.",
      },
      {
        id: 512,
        commandTitle: 'Target groups, all hosts, and limit parallelism',
        command: 'ansible all -a "hostname" -u vagrant -k -f 1',
        searchTerms: 'ansible all group test-srv test-clnt forks -f 1 parallelism limit concurrency',
        description: 'Patterns scale up: a group name (<code>test-srv</code>), or <code>all</code> for every host. <code>-f 1</code> limits Ansible to one host at a time (default is 5), which makes the interleaved output easier to read.',
        parts: [
          { text: 'ansible test-srv ...', explanation: 'run against every host in the test-srv group' },
          { text: 'ansible all ...', explanation: 'run against every host in the inventory' },
          { text: '-f 1', explanation: 'forks = 1 — one host at a time instead of the default 5' },
        ],
        example: `192.168.98.100 | CHANGED | rc=0 >>
web.sulab.local
192.168.98.101 | CHANGED | rc=0 >>
db.sulab.local`,
        why: "Most real work targets a group or all, not a single host. -f controls blast radius and speed — handy when you want a careful, serial rollout.",
      },
      {
        id: 513,
        commandTitle: 'command vs shell (and why $HOSTNAME differs)',
        command: 'ansible all -m shell -a "echo $HOSTNAME" -u vagrant -k',
        searchTerms: 'command module shell module difference pipes variables redirection echo hostname df free quoting',
        description: 'The default <code>command</code> module runs the binary directly — no shell, so <strong>no</strong> pipes, redirects or variable expansion. <code>shell</code> runs through <code>/bin/sh</code>, so <code>$HOSTNAME</code> expands on the remote host. Watch the difference between double and single quotes (local vs remote expansion).',
        parts: [
          { text: '-m command -a "df -h"', explanation: 'runs df directly; the `command` module is the default and can be omitted' },
          { text: '-m shell -a "echo $HOSTNAME"', explanation: 'double quotes: $HOSTNAME expands locally before sending — usually empty' },
          { text: "-m shell -a 'echo $HOSTNAME'", explanation: "single quotes: the remote shell expands $HOSTNAME — prints each host's name" },
        ],
        example: `# command (no shell features):
$ ansible all -a "df -h" -u vagrant -k

# shell, single-quoted — expands remotely:
$ ansible all -m shell -a 'echo $HOSTNAME' -u vagrant -k
web | CHANGED | rc=0 >>
web.sulab.local`,
        why: "This is the classic gotcha: command is safer and faster but cannot use shell features; shell can, but you must mind where variables and globs expand. Choosing the right one avoids surprising empty output.",
      },
      {
        id: 514,
        commandTitle: 'Run a local script on remote hosts (script module)',
        command: 'ansible test-srv -m script -a "local_script.sh" -u vagrant -k',
        searchTerms: 'script module local_script.sh transfer execute remote bash hostname push run',
        description: 'The <code>script</code> module copies a script from the <strong>control node</strong> to each target, runs it there, and removes it. The remote host needs no copy of the file in advance. Create <code>local_script.sh</code> (M4-1) first.',
        parts: [
          { text: 'local_script.sh (on the control node)', explanation: 'a tiny bash script that echoes the remote $HOSTNAME' },
          { text: '-m script -a "local_script.sh"', explanation: 'transfer this local script to each host and execute it' },
        ],
        example: `# local_script.sh
#!/bin/bash
echo 'My hostname is '$HOSTNAME

$ ansible test-srv -m script -a "local_script.sh" -u vagrant -k
web | CHANGED => { "stdout": "My hostname is web.sulab.local\\n" }`,
        why: "script bridges the gap between ad-hoc and full automation: you can reuse an existing shell script across the fleet without writing a module or pre-copying anything.",
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PART 2 — INVENTORY, VARIABLES, CONFIG, MODULES
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Part 2 — Inventories, variables & configuration',
    content: `
      <p>
        The global inventory is convenient but project work belongs in a <strong>local</strong> inventory you
        keep next to your playbooks. Here you build one up group by group, layer variables at three precedence
        levels, tame SSH with <code>ansible.cfg</code>, and finally use real modules (<code>yum</code>,
        <code>service</code>) to install Apache and MariaDB ad-hoc.
      </p>
    `,
  },
  {
    type: 'commands',
    section: 'inventory',
    sectionTitle: 'Part 2 · Inventory, groups & variables',
    items: [
      {
        id: 520,
        commandTitle: 'Build a local inventory with groups (M4-2/1)',
        command: 'ansible grp-servers -i inventory -a "hostname"',
        searchTerms: 'inventory file groups children grp-webservers grp-databases grp-stations grp-servers vars connection variables',
        description: 'Working in <code>M4-2/1</code>, create an <code>inventory</code> file. Add hosts, then groups, then a <strong>group of groups</strong> (<code>children</code>), and finally connection variables on the parent group so you no longer pass <code>-u</code>/<code>-k</code> each time.',
        parts: [
          { text: 'web ansible_host=192.168.98.100', explanation: 'a host entry; ansible_host pins the connection IP' },
          { text: '[grp-webservers] / [grp-databases] / [grp-stations]', explanation: 'simple groups, one host each' },
          { text: '[grp-servers:children]', explanation: 'a parent group whose members are other groups (webservers + databases)' },
          { text: '[grp-servers:vars]', explanation: 'variables applied to every host under grp-servers — here the SSH user and password' },
        ],
        example: `web  ansible_host=192.168.98.100
db   ansible_host=192.168.98.101
clnt ansible_host=192.168.98.102

[grp-webservers]
web

[grp-databases]
db

[grp-stations]
clnt

[grp-servers:children]
grp-webservers
grp-databases

[grp-servers:vars]
ansible_user=vagrant
ansible_ssh_pass=vagrant

$ ansible grp-servers -i inventory -a "hostname"
web | CHANGED | rc=0 >>
web.sulab.local
db  | CHANGED | rc=0 >>
db.sulab.local`,
        why: "A local inventory makes a project self-contained and versionable. children groups let you address 'all servers' without repeating hosts, and group vars remove the repetitive -u/-k flags.",
      },
      {
        id: 521,
        commandTitle: 'Variables at three levels (M4-2/2)',
        command: 'ansible grp-servers -i inventory -m user -a "name={{username}} password=Password1" --become',
        searchTerms: 'group_vars host_vars precedence all grp-webservers web username user module become override',
        description: 'In <code>M4-2/2</code>, copy the inventory, then create <code>group_vars/</code> and <code>host_vars/</code>. The same variable <code>username</code> is defined at three levels; the <code>user</code> module shows which one wins. Precedence (most specific wins): <strong>host_vars &gt; group_vars/&lt;group&gt; &gt; group_vars/all</strong>.',
        parts: [
          { text: 'group_vars/all → username: user_all', explanation: 'global default for every host' },
          { text: 'group_vars/grp-webservers → username: user_group', explanation: 'overrides "all" for hosts in grp-webservers' },
          { text: 'host_vars/web → username: user_host', explanation: 'overrides everything, but only for host "web"' },
          { text: '--become', explanation: 'creating a user needs root — escalate privileges' },
        ],
        example: `group_vars/all          ->  username: user_all
group_vars/grp-webservers ->  username: user_group
host_vars/web           ->  username: user_host

# After running the user module:
#   web  gets user_host   (host_vars wins)
#   db   gets user_all    (only the global default applies)`,
        why: "Layered variables are how one inventory serves many hosts without duplication: sane defaults in all, per-tier overrides in group_vars, per-machine exceptions in host_vars. Knowing the precedence prevents 'why did it use the wrong value?' confusion.",
      },
    ],
  },
  {
    type: 'commands',
    section: 'config',
    sectionTitle: 'Part 2 · ansible.cfg & core modules',
    items: [
      {
        id: 530,
        commandTitle: 'Tame SSH with ansible.cfg (M4-2/3)',
        command: 'ansible web -i inventory -a "hostname"',
        searchTerms: 'ansible.cfg host_key_checking private_key_file remote_user environment ANSIBLE_HOST_KEY_CHECKING known_hosts defaults',
        description: 'In <code>M4-2/3</code>, copy the inventory and add an <code>ansible.cfg</code>. Turning off <code>host_key_checking</code> stops the unknown-host prompt; pointing at the Vagrant private key and setting <code>remote_user</code> lets you drop the password and the per-command flags entirely. An <code>ANSIBLE_*</code> env var overrides the file when set.',
        parts: [
          { text: 'host_key_checking = false', explanation: 'skip the SSH known-hosts prompt for fresh VMs' },
          { text: 'private_key_file = ~/.vagrant.d/insecure_private_key', explanation: 'authenticate with Vagrant\'s key instead of a password' },
          { text: 'remote_user = vagrant', explanation: 'default SSH user — no more -u vagrant' },
          { text: 'export ANSIBLE_HOST_KEY_CHECKING=true', explanation: 'an env var temporarily overrides the cfg; unset it to fall back' },
        ],
        example: `# ansible.cfg
[defaults]
host_key_checking = false
private_key_file = /home/devops/.vagrant.d/insecure_private_key
remote_user = vagrant

# inventory can now drop user/pass entirely:
web ansible_host=192.168.98.100
db  ansible_host=192.168.98.101

$ ansible web -i inventory -a "hostname"
web | CHANGED | rc=0 >>
web.sulab.local`,
        why: "ansible.cfg turns a fiddly command (-u, -k, host-key prompts) into a clean one. Keeping connection details in the cfg + key file, not in the inventory, is also tidier and more secure.",
      },
      {
        id: 531,
        commandTitle: 'Discover modules with ansible-doc (M4-2/4)',
        command: 'ansible-doc -l && ansible-doc yum',
        searchTerms: 'ansible-doc list modules documentation yum service help discover',
        description: 'Before installing anything, browse what is available. <code>ansible-doc -l</code> lists every module; <code>ansible-doc &lt;name&gt;</code> shows its options and examples — the fastest way to learn a module\'s exact parameters.',
        parts: [
          { text: 'ansible-doc -l', explanation: 'list all available modules' },
          { text: 'ansible-doc yum', explanation: 'show the yum module\'s parameters and examples' },
        ],
        example: `$ ansible-doc yum
> YUM    (.../modules/packaging/os/yum.py)
  Installs, upgrade, removes, and lists packages ...
OPTIONS:
  name:   A package name or list of names ...
  state:  present | latest | absent ...`,
        why: "ansible-doc is the built-in reference — no web search needed. Checking a module's options before you use it is how you avoid guessing parameter names.",
      },
      {
        id: 532,
        commandTitle: 'Install Apache + MariaDB ad-hoc (yum + service)',
        command: 'ansible grp-webservers -i inventory -m yum -a "name=httpd state=present" --become',
        searchTerms: 'yum module service module httpd apache mariadb install start enable present started --become webservers databases',
        description: 'Use the <code>yum</code> module to install packages and the <code>service</code> module to start and enable them — first Apache on the web group, then MariaDB on the database group. Verify Apache from the host browser at <code>http://localhost:8080</code>.',
        parts: [
          { text: '-m yum -a "name=httpd state=present"', explanation: 'install Apache if missing; idempotent — a second run reports ok' },
          { text: '-m service -a "name=httpd state=started enabled=true"', explanation: 'start it now and enable it on boot' },
          { text: 'grp-databases → mariadb,mariadb-server', explanation: 'same pattern for the DB tier' },
        ],
        example: `$ ansible grp-webservers -i inventory -m yum \\
    -a "name=httpd state=present" --become
$ ansible grp-webservers -i inventory -m service \\
    -a "name=httpd state=started enabled=true" --become

$ ansible grp-databases -i inventory -m yum \\
    -a "name=mariadb,mariadb-server state=present" --become
$ ansible grp-databases -i inventory -m service \\
    -a "name=mariadb state=started enabled=true" --become`,
        why: "These two modules — package + service — are the backbone of almost every deploy. Doing it ad-hoc first makes the leap to a playbook (the same modules, in YAML) obvious.",
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PART 3 — PLAYBOOKS
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Part 3 — Playbooks',
    content: `
      <p>
        Ad-hoc commands do not capture intent or repeat reliably. A <strong>playbook</strong> is a YAML file of
        plays, each binding a host group to an ordered list of tasks. Here you turn the Apache + MariaDB install
        into a playbook, validate it before running, then layer on the techniques that make Ansible powerful:
        <code>register</code>/<code>debug</code>, <code>copy</code>, retry files, and conditionals.
      </p>
    `,
  },
  {
    type: 'note',
    variant: 'tip',
    content: 'Stop the earlier VMs if needed, then work in <code>M4-3</code> and <code>vagrant up</code> again. Each numbered subfolder (<code>1</code>, <code>2</code>, <code>3</code>) copies the inventory/cfg from the previous step — keep them separate so you can compare.',
  },
  {
    type: 'commands',
    section: 'playbooks',
    sectionTitle: 'Part 3 · Playbooks, register, copy & retry',
    items: [
      {
        id: 540,
        commandTitle: 'Write and validate a playbook (M4-3/1)',
        command: 'ansible-playbook playbook.yml --syntax-check && ansible-playbook playbook.yml --list-hosts',
        searchTerms: 'playbook.yml plays hosts become tasks yum service syntax-check list-hosts validate yaml',
        description: 'In <code>M4-3/1</code>, create <code>playbook.yml</code> with two plays — Apache on the web group, MariaDB on the database group. Always validate first: <code>--syntax-check</code> parses the YAML, <code>--list-hosts</code> shows exactly which hosts each play would touch.',
        parts: [
          { text: '- hosts: grp-webservers / become: true', explanation: 'a play targeting the web tier, running tasks as root' },
          { text: 'tasks: yum + service', explanation: 'the same two modules from the ad-hoc step, now declared in YAML' },
          { text: '--syntax-check', explanation: 'fail fast on YAML/structure errors before touching any host' },
          { text: '--list-hosts', explanation: 'preview the resolved hosts per play, no execution' },
        ],
        example: `---
- hosts: grp-webservers
  become: true
  tasks:
    - name: Install Apache HTTP Server
      yum: name=httpd state=present
    - name: Start Apache HTTP Server and Enable it
      service: name=httpd state=started enabled=true

- hosts: grp-databases
  become: true
  tasks:
    - name: Install MariaDB Server
      yum: name=mariadb,mariadb-server state=present
    - name: Start and enable MariaDB
      service: name=mariadb state=started enabled=true`,
        why: "A playbook is the executable, version-controlled record of how a host should look. Validating before running turns a potential mid-deploy failure into a two-second check.",
      },
      {
        id: 541,
        commandTitle: 'Run it — and re-run to see idempotence',
        command: 'ansible-playbook playbook.yml',
        searchTerms: 'ansible-playbook run execute play recap ok changed idempotent rerun unreachable failed',
        description: 'Execute every play in order. The <strong>PLAY RECAP</strong> tallies each host. A first run on fresh hosts shows lots of <code>changed</code>; run it again and it is all <code>ok</code> — proof the hosts already match the declared state.',
        parts: [
          { text: 'changed', explanation: 'Ansible modified the host to reach the desired state' },
          { text: 'ok', explanation: 'already correct — nothing to do (what a second run shows)' },
          { text: 'unreachable / failed', explanation: 'could not connect / a task errored' },
        ],
        example: `PLAY RECAP *********************************************************
db   : ok=2  changed=2  unreachable=0  failed=0
web  : ok=2  changed=2  unreachable=0  failed=0

# run again:
db   : ok=2  changed=0  unreachable=0  failed=0
web  : ok=2  changed=0  unreachable=0  failed=0`,
        why: "Idempotence is the whole point of configuration management: describe the end state, run as often as you like, and Ansible only changes what is not already correct. The recap is your proof.",
      },
      {
        id: 542,
        commandTitle: 'Capture output with register + debug (register.yml)',
        command: 'ansible-playbook register.yml',
        searchTerms: 'register debug variable capture shell uname kernel version stdout var clnt',
        description: 'Create <code>register.yml</code> against <code>clnt</code>: a <code>shell</code> task saves its result into a variable with <code>register</code>, and a <code>debug</code> task prints it. This is how one task feeds another and how you inspect what happened.',
        parts: [
          { text: 'shell: /usr/bin/uname -r', explanation: 'grab the kernel version on the remote host' },
          { text: 'register: kver', explanation: 'store the task result (stdout, rc, changed…) in kver' },
          { text: 'debug: var=kver', explanation: 'print the whole registered variable' },
        ],
        example: `---
- hosts: clnt
  become: false
  tasks:
    - name: Get system's kernel version
      shell: /usr/bin/uname -r
      register: kver
    - name: Debug info
      debug: var=kver`,
        why: "register/debug is the print-statement of Ansible: it lets you chain steps (task A's output into task B) and see exactly what a task returned when troubleshooting.",
      },
      {
        id: 543,
        commandTitle: 'Deploy a file with the copy module (copy.yml)',
        command: 'ansible-playbook copy.yml',
        searchTerms: 'copy module src dest index.html html var www webservers deploy static file',
        description: 'Create an <code>html/index.html</code> and a <code>copy.yml</code> that ships it to the web hosts\' document root. Then open <code>http://localhost:8080</code> to see it served by the Apache you installed earlier.',
        parts: [
          { text: 'copy: src=html/index.html dest=/var/www/html/', explanation: 'push a local file to the remote document root' },
        ],
        example: `# html/index.html
<h2>Hello, Ansible!</h2>

# copy.yml
---
- hosts: grp-webservers
  become: true
  tasks:
    - name: Copy new index.html
      copy: src=html/index.html dest=/var/www/html/`,
        why: "copy is the simplest way to deliver static content or config files. Combined with the Apache install, this is a complete (if tiny) web deploy.",
      },
      {
        id: 544,
        commandTitle: 'Recover failed hosts with a retry file',
        command: 'ansible-playbook playbook.yml --limit @/home/devops/.ansible-retry/playbook.retry',
        searchTerms: 'retry_files_enabled retry_files_save_path .retry --limit failed hosts resume partial deploy ansible.cfg',
        description: 'Enable retry files in <code>ansible.cfg</code>, then break one host (e.g. remove its connection vars) and run. Ansible writes the failed hosts to a <code>.retry</code> file; after fixing the issue, replay <strong>only</strong> those hosts with <code>--limit @&lt;file&gt;</code>.',
        parts: [
          { text: 'retry_files_enabled = True', explanation: 'make Ansible write a .retry file listing failed hosts' },
          { text: 'retry_files_save_path = ~/.ansible-retry', explanation: 'where to put it' },
          { text: '--limit @....retry', explanation: 'restrict the next run to just the hosts named in that file' },
        ],
        example: `# ansible.cfg
[defaults]
host_key_checking = False
retry_files_enabled = True
retry_files_save_path = ~/.ansible-retry

# after fixing the broken host:
$ ansible-playbook playbook.yml \\
    --limit @/home/devops/.ansible-retry/playbook.retry`,
        why: "In a large rollout where a few hosts fail on a transient blip, you fix and replay just those — not the whole fleet. Faster, and it avoids needless churn on healthy hosts.",
      },
      {
        id: 545,
        commandTitle: 'One playbook, two OS families (when + facts)',
        command: 'ansible-playbook webservers.yml',
        searchTerms: 'when conditional ansible_os_family RedHat Debian yum apt httpd apache2 webu ubuntu heterogeneous facts',
        description: 'Add a second web host on Ubuntu (<code>webu</code>, 192.168.98.105) to the Vagrantfile and inventory, then write <code>webservers.yml</code> that installs Apache the right way on each OS using <code>when: ansible_os_family == ...</code>. Verify CentOS at :8080 and Ubuntu at :8081.',
        parts: [
          { text: 'webu → ubuntu/trusty64, forwarded 80→8081', explanation: 'a Debian-family web host added to the group' },
          { text: 'when: ansible_os_family == "RedHat"', explanation: 'yum/httpd path — runs only on CentOS' },
          { text: 'when: ansible_os_family == "Debian"', explanation: 'apt/apache2 path — runs only on Ubuntu' },
        ],
        example: `---
- hosts: grp-webservers
  become: true
  tasks:
    - name: Install Apache (RedHat)
      yum: name=httpd state=present
      when: ansible_os_family == "RedHat"
    - name: Start Apache (RedHat)
      service: name=httpd state=started enabled=true
      when: ansible_os_family == "RedHat"

    - name: Install Apache (Ubuntu)
      apt: name=apache2 state=present
      when: ansible_os_family == "Debian"
    - name: Start Apache (Ubuntu)
      service: name=apache2 state=started enabled=true
      when: ansible_os_family == "Debian"`,
        why: "Real fleets are mixed. when + facts lets a single playbook provision CentOS and Ubuntu correctly — the foundation of portable automation, and the setup for roles next.",
      },
    ],
  },

  // ── Part 3 · Templates ──────────────────────────────────────────────────────
  {
    type: 'commands',
    section: 'templates',
    sectionTitle: 'Part 3 · Jinja2 templates',
    items: [
      {
        id: 550,
        commandTitle: 'Render a per-host page with the template module (M4-3/2)',
        command: 'ansible-playbook webservers.yml',
        searchTerms: 'template module jinja2 index.j2 templates v_host_type vars render dynamic dest var www html',
        description: 'In <code>M4-3/2</code>, copy the cfg/inventory/playbook from <code>1</code>, create a <code>templates/index.j2</code>, and change the deploy tasks to use the <code>template</code> module. Ansible renders the Jinja2 with your variables before copying — so each OS family gets a page that names itself.',
        parts: [
          { text: 'templates/index.j2 → {{ v_host_type }}', explanation: 'a Jinja2 placeholder filled at render time' },
          { text: 'vars: v_host_type: RedHat (per task)', explanation: 'supply the value the template needs for this branch' },
          { text: 'template: src=templates/index.j2 dest=/var/www/html/index.html', explanation: 'render then deliver — replaces the static copy' },
        ],
        example: `<!-- templates/index.j2 -->
<html>
<head><title>Hello!</title></head>
<body>
<h2>Hello from Ansible on {{ v_host_type }}!</h2>
</body>
</html>

# task (RedHat branch)
- name: Deploy index.j2 on RedHat
  vars:
    v_host_type: RedHat
  template: src=templates/index.j2 dest=/var/www/html/index.html
  when: ansible_os_family == "RedHat"`,
        why: "Templates are how one file serves a heterogeneous fleet: the same index.j2 renders 'RedHat' on CentOS and 'Debian' on Ubuntu — no duplicated, drifting copies.",
      },
    ],
  },

  // ── Part 3 · Roles ──────────────────────────────────────────────────────────
  {
    type: 'commands',
    section: 'roles',
    sectionTitle: 'Part 3 · Roles',
    items: [
      {
        id: 555,
        commandTitle: 'Refactor into a role (M4-3/3)',
        command: 'ansible-playbook webservers.yml',
        searchTerms: 'roles apache-web-server tasks main redhat debian import_tasks structure reusable webservers playbook roles keyword',
        description: 'In <code>M4-3/3</code>, the OS-specific logic moves into a <strong>role</strong>: <code>roles/apache-web-server/tasks/</code> with <code>main.yml</code> dispatching to <code>redhat.yml</code> or <code>debian.yml</code> by fact. The playbook shrinks to a single <code>roles:</code> line — a statement of intent, not a script.',
        parts: [
          { text: 'roles/apache-web-server/tasks/main.yml', explanation: 'entry point — import_tasks redhat.yml / debian.yml gated by ansible_os_family' },
          { text: 'redhat.yml → yum + service + firewalld', explanation: 'the CentOS path, including opening port 80 in firewalld' },
          { text: 'debian.yml → apt + service + ufw', explanation: 'the Ubuntu path, opening port 80 with ufw' },
          { text: 'roles: - apache-web-server', explanation: 'the whole playbook — apply the role to the web group' },
        ],
        example: `# roles/apache-web-server/tasks/main.yml
---
  - import_tasks: redhat.yml
    when: ansible_os_family|lower == 'redhat'
  - import_tasks: debian.yml
    when: ansible_os_family|lower == 'debian'

# webservers.yml
---
- hosts: grp-webservers
  become: true
  roles:
    - apache-web-server`,
        why: "Roles are how Ansible scales past a single file. The same logic becomes a named, reusable unit ('this host is an apache-web-server') you can share across projects and pull from Ansible Galaxy.",
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // HETEROGENEOUS — WINDOWS OVER WINRM  (the part missing from the concept modules)
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Heterogeneous — managing a Windows host',
    content: `
      <p>
        Ansible is not Linux-only. To manage a <strong>Windows</strong> target it connects over
        <strong>WinRM</strong> (Remote PowerShell) instead of SSH, and uses the dedicated
        <code>win_*</code> modules. The lab adds a <strong>Windows Server 2016 Core</strong> host
        (192.168.98.110): you prepare WinRM on the Windows side, install the <code>pywinrm</code> Python
        library on the control node, and then drive it just like any other host.
      </p>
    `,
  },
  {
    type: 'note',
    variant: 'warning',
    content: 'The control node stays Linux — <strong>Windows is not supported as an Ansible controller</strong>. Network connectivity and the Windows firewall must allow WinRM (HTTPS on port 5986) from the control node first.',
  },
  {
    type: 'commands',
    section: 'windows',
    sectionTitle: 'Heterogeneous · Windows over WinRM',
    items: [
      {
        id: 560,
        commandTitle: 'Prepare WinRM on the Windows host',
        command: 'powershell -ExecutionPolicy Bypass -File ConfigureRemotingForAnsible.ps1',
        searchTerms: 'winrm windows ConfigureRemotingForAnsible.ps1 powershell sconfig firewall https 5986 listener certificate enable remoting',
        description: 'On the Windows host, configure WinRM so Ansible can connect. The community script <code>ConfigureRemotingForAnsible.ps1</code> enables PS Remoting, creates a self-signed HTTPS listener, and opens the firewall. Download it with <code>wget</code>/<code>curl</code> (or share it over SMB), then run it as Administrator.',
        parts: [
          { text: 'sconfig', explanation: 'on Server Core, the menu tool to configure networking/firewall before remoting' },
          { text: 'ConfigureRemotingForAnsible.ps1', explanation: 'official script: enables PS Remoting, adds an HTTPS (5986) listener + self-signed cert, opens the firewall' },
          { text: 'New-SmbShare / curl -OutFile', explanation: 'two ways to get the script onto the Windows host — an SMB share or a direct download' },
        ],
        example: `# get the script onto the Windows host, then run as Administrator:
PS> curl https://raw.githubusercontent.com/ansible/ansible/devel/examples/scripts/ConfigureRemotingForAnsible.ps1 -OutFile Ansible.ps1
PS> .\\Ansible.ps1

# (Server Core firewall/network can be configured via)
PS> sconfig`,
        why: "Windows has no SSH+Python agent by default, so Ansible relies on WinRM. This one-time prep is the Windows equivalent of 'make sure SSH and Python are present' on a Linux target.",
      },
      {
        id: 561,
        commandTitle: 'Add the Windows host to the inventory + install pywinrm',
        command: 'pip install pywinrm',
        searchTerms: 'inventory win group ansible_connection winrm ansible_port 5986 ansible_user Administrator pywinrm pip python module cert validation ignore',
        description: 'On the control node, add a <code>[win]</code> group whose vars switch the connection type to <code>winrm</code>, then install the <code>pywinrm</code> Python library (Ansible needs it to speak WinRM). Install <code>pip</code> first if missing.',
        parts: [
          { text: 'ansible_connection=winrm', explanation: 'use WinRM instead of the default SSH for this group' },
          { text: 'ansible_port=5986', explanation: 'WinRM over HTTPS' },
          { text: 'ansible_winrm_server_cert_validation=ignore', explanation: 'accept the self-signed cert created by the prep script' },
          { text: 'pip install pywinrm', explanation: 'the Python WinRM client Ansible imports to talk to Windows' },
        ],
        example: `# inventory
[win]
192.168.98.110

[win:vars]
ansible_user=Administrator
ansible_password=Password1
ansible_port=5986
ansible_connection=winrm
ansible_winrm_server_cert_validation=ignore

# control node (CentOS):
$ sudo yum install python-pip
$ pip install pywinrm`,
        why: "The connection details live entirely in inventory vars — the same inventory mechanism as Linux, just pointed at WinRM. pywinrm is the missing dependency that makes it work.",
      },
      {
        id: 562,
        commandTitle: 'Drive Windows with the win_* modules',
        command: 'ansible win -i inventory -m setup',
        searchTerms: 'ansible win setup gather facts win_ping win_whoami win_service module windows manage spooler',
        description: 'Now manage the Windows host like any other. <code>setup</code> gathers facts; <code>win_ping</code> checks the connection; <code>win_service</code> queries/controls services. These mirror their Linux counterparts but speak the Windows API.',
        parts: [
          { text: '-m setup', explanation: 'gather facts about the Windows host (OS, network, hardware)' },
          { text: '-m win_ping', explanation: 'the Windows connectivity check (not ICMP — a WinRM round-trip)' },
          { text: '-m win_service -a "name=spooler"', explanation: 'inspect (or with state=…, control) a Windows service' },
        ],
        example: `$ ansible win -i inventory -m win_ping
192.168.98.110 | SUCCESS => { "changed": false, "ping": "pong" }

$ ansible win -i inventory -m win_service -a "name=spooler"
192.168.98.110 | SUCCESS => {
    "display_name": "Print Spooler",
    "state": "running",
    "start_mode": "auto"
}`,
        why: "This closes the loop on heterogeneous management: one control node, one inventory, driving Linux over SSH and Windows over WinRM. The win_* modules give Windows the same declarative, idempotent treatment as everything else.",
      },
    ],
  },

];
