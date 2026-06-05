// modules/m4/adhoc-modules.js
// M4: Ansible — Ad-hoc Commands & Modules
// Extracted from DOB-M4-Practice-Files M4-1 / M4-2/4 (ad-hoc runs, command vs shell, modules)

window.commandData = [

  // ── Section 1: Ad-hoc command anatomy ───────────────────────────────────────

  {
    id: 420, section: "adhoc", sectionTitle: "Ad-hoc Commands",
    commandTitle: "Run a one-off command against a host",
    command: "ansible 192.168.98.100 -a 'hostname' -u vagrant -k",
    searchTerms: "adhoc command ansible -a -u -k user ask pass one-off hostname",
    description: "An <strong>ad-hoc command</strong> runs a single module against hosts without writing a playbook — ideal for quick checks. With no <code>-m</code> the default is the <code>command</code> module, so <code>-a 'hostname'</code> just runs <code>hostname</code> remotely.",
    parts: [
      { text: "ansible 192.168.98.100", explanation: "target: a single host (IP, alias, group, or 'all')" },
      { text: "-a 'hostname'", explanation: "arguments passed to the module — here, the command to run" },
      { text: "-u vagrant", explanation: "SSH as the vagrant user" },
      { text: "-k", explanation: "prompt for the SSH password (the vagrant box password is 'vagrant')" },
    ],
    example: "$ ansible 192.168.98.100 -a 'hostname' -u vagrant -k\nSSH password:\n192.168.98.100 | CHANGED | rc=0 >>\nweb.sulab.local",
    why: "Ad-hoc is your sanity check and firefighting tool: confirm reachability, read a config, restart one service — without the ceremony of a playbook."
  },

  {
    id: 421, section: "adhoc", sectionTitle: "Ad-hoc Commands",
    commandTitle: "Target a group, then everything; throttle with -f",
    command: "ansible all -i inventory -a 'hostname' -u vagrant -k -f 1",
    searchTerms: "ansible all group forks -f parallel throttle concurrency limit",
    description: "Swap the single host for a group name or <code>all</code> to fan out. Ansible runs hosts in parallel; <code>-f</code> (forks) caps how many at once. <code>-f 1</code> forces strictly serial execution — useful for ordered or rate-limited operations.",
    parts: [
      { text: "ansible all", explanation: "every host in the inventory" },
      { text: "-i inventory", explanation: "use the project inventory file" },
      { text: "-f 1", explanation: "one fork — run hosts one at a time instead of in parallel" },
    ],
    example: "$ ansible all -i inventory -a 'hostname' -u vagrant -k -f 1\nweb | CHANGED | rc=0 >>\nweb.sulab.local\ndb | CHANGED | rc=0 >>\ndb.sulab.local",
    why: "Default parallelism (5 forks) is great for speed but bad when order matters or a downstream service would be overwhelmed. -f gives you the dial."
  },

  // ── Section 2: command vs shell ─────────────────────────────────────────────

  {
    id: 422, section: "modules", sectionTitle: "command vs shell",
    commandTitle: "command runs directly — no shell features",
    command: "ansible all -m command -a 'echo $HOSTNAME' -u vagrant -k",
    searchTerms: "command module shell variables expansion pipe redirect difference direct",
    description: "The <code>command</code> module (the default) executes the program <strong>directly</strong>, without a shell. So <code>$HOSTNAME</code>, pipes, redirects, and globs are <em>not</em> expanded — they're passed as literal text.",
    parts: [
      { text: "-m command", explanation: "explicit command module (also the default if -m is omitted)" },
      { text: "-a 'echo $HOSTNAME'", explanation: "$HOSTNAME is NOT expanded — printed literally" },
    ],
    example: "$ ansible all -m command -a 'echo $HOSTNAME' -u vagrant -k\nweb | CHANGED | rc=0 >>\n$HOSTNAME",
    why: "command is safer and more predictable (no shell injection, no surprise expansion). Use it unless you specifically need shell behaviour."
  },

  {
    id: 423, section: "modules", sectionTitle: "command vs shell",
    commandTitle: "shell runs through /bin/sh — expansions work",
    command: "ansible all -m shell -a 'echo $HOSTNAME' -u vagrant -k",
    searchTerms: "shell module pipe redirect environment variable expansion bin sh",
    description: "The <code>shell</code> module runs the argument through <code>/bin/sh</code>, so environment variables, pipes (<code>|</code>), redirects (<code>&gt;</code>), and globbing all work. Compare the output to the <code>command</code> version — same args, different result.",
    parts: [
      { text: "-m shell", explanation: "run the command in a shell" },
      { text: "-a 'echo $HOSTNAME'", explanation: "$HOSTNAME IS expanded by the remote shell" },
      { text: "-a 'df -h | grep /dev'", explanation: "pipes work too — only with shell, not command" },
    ],
    example: "$ ansible all -m shell -a 'echo $HOSTNAME' -u vagrant -k\nweb | CHANGED | rc=0 >>\nweb.sulab.local",
    why: "Reach for shell only when you need its features. The cost is that you become responsible for quoting and injection safety that command handles for you."
  },

  {
    id: 424, section: "modules", sectionTitle: "command vs shell",
    commandTitle: "Push and run a local script remotely",
    command: "ansible test-srv -m script -a 'local_script.sh' -u vagrant -k",
    searchTerms: "script module copy execute local remote bash file transfer",
    description: "The <code>script</code> module copies a script <em>from the control node</em> to each target, executes it there, and removes it — no need to pre-install the script on the hosts. Great for bootstrap logic too complex for a one-liner.",
    parts: [
      { text: "-m script", explanation: "transfer-and-run a local script on the remote hosts" },
      { text: "-a 'local_script.sh'", explanation: "path to the script on the control node" },
    ],
    example: "# local_script.sh on the control node:\n#!/bin/bash\necho 'My hostname is '$HOSTNAME\n\n$ ansible test-srv -m script -a 'local_script.sh' -u vagrant -k\nweb | CHANGED => { \"stdout\": \"My hostname is web.sulab.local\" }",
    why: "Bridges the gap between a single command and a full playbook — you keep an existing shell script but gain Ansible's fan-out, auth, and reporting."
  },

  // ── Section 3: Discovering & using real modules ─────────────────────────────

  {
    id: 425, section: "discover", sectionTitle: "Discovering Modules",
    commandTitle: "List and document modules with ansible-doc",
    command: "ansible-doc -l && ansible-doc yum",
    searchTerms: "ansible-doc list modules help documentation snippet -s reference",
    description: "<code>ansible-doc -l</code> lists every available module; <code>ansible-doc &lt;name&gt;</code> shows full docs for one; <code>ansible-doc -s &lt;name&gt;</code> prints a ready-to-paste playbook snippet. Your offline reference for the ~450 bundled modules.",
    parts: [
      { text: "ansible-doc -l", explanation: "list all installed modules" },
      { text: "ansible-doc yum", explanation: "full documentation for the yum module" },
      { text: "ansible-doc -s service", explanation: "a copy-paste playbook snippet for the service module" },
    ],
    example: "$ ansible-doc -s service\n- name: Manage services\n  service:\n      name:          # (required) name of the service\n      state:         # started / stopped / restarted / reloaded\n      enabled:       # yes/no — start on boot",
    why: "Don't memorise module arguments — ansible-doc is faster and always matches your installed version. -s gives you a scaffold to drop straight into a playbook."
  },

  {
    id: 426, section: "discover", sectionTitle: "Discovering Modules",
    commandTitle: "Install a package idempotently (yum / apt)",
    command: "ansible grp-webservers -i inventory -m yum -a 'name=httpd state=present' --become",
    searchTerms: "yum apt package module install state present absent idempotent become",
    description: "Package modules are <strong>idempotent</strong>: <code>state=present</code> means 'make sure it's installed', not 'install it'. Run it twice — the second run reports <em>ok</em> (no change) because the desired state already holds. Use <code>yum</code> on RHEL/CentOS, <code>apt</code> on Debian/Ubuntu.",
    parts: [
      { text: "-m yum -a 'name=httpd state=present'", explanation: "ensure the httpd package is installed (RHEL family)" },
      { text: "state=present / latest / absent", explanation: "installed / upgraded-to-newest / removed" },
      { text: "--become", explanation: "escalate to root to manage packages" },
    ],
    example: "$ ansible grp-webservers -i inventory -m yum -a 'name=httpd state=present' --become\nweb | CHANGED   # first run: installs it\n$ ansible grp-webservers -i inventory -m yum -a 'name=httpd state=present' --become\nweb | SUCCESS   # second run: already present, no change",
    why: "Idempotence is the whole point of config management: you declare the end state and can run it repeatedly, safely. The same pattern installs the .NET runtime or Node.js in the next modules."
  },

  {
    id: 427, section: "discover", sectionTitle: "Discovering Modules",
    commandTitle: "Start and enable a service",
    command: "ansible grp-webservers -i inventory -m service -a 'name=httpd state=started enabled=true' --become",
    searchTerms: "service module systemd start enable boot state started restarted",
    description: "The <code>service</code> module manages init/systemd units: <code>state=started</code> ensures it's running now, <code>enabled=true</code> ensures it starts on boot. Same two flags you'll use to bring up <code>kestrel</code> (.NET) or a Node.js systemd unit later.",
    parts: [
      { text: "name=httpd", explanation: "the service/unit to manage" },
      { text: "state=started", explanation: "ensure the service is running right now" },
      { text: "enabled=true", explanation: "ensure it auto-starts on reboot" },
    ],
    example: "$ ansible grp-webservers -i inventory -m service \\\n    -a 'name=httpd state=started enabled=true' --become\nweb | CHANGED => { \"name\": \"httpd\", \"state\": \"started\", \"enabled\": true }",
    why: "Installing a package doesn't start it. 'present + started + enabled' is the trio that takes a host from 'package on disk' to 'service serving traffic after every reboot'."
  },

];
