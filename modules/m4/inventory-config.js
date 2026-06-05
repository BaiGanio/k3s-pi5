// modules/m4/inventory-config.js
// M4: Ansible — Inventory & Configuration
// Extracted from DOB-M4-Practice-Files M4-2 (inventory, group_vars/host_vars, ansible.cfg)

window.commandData = [

  // ── Section 1: Building an inventory ────────────────────────────────────────

  {
    id: 410, section: "inventory", sectionTitle: "Inventory",
    commandTitle: "A minimal static inventory (inventory)",
    command: "cat inventory",
    searchTerms: "inventory hosts ini static ansible_host ansible_user behavioral parameters",
    description: "An inventory describes the environment Ansible manages. The simplest form is an INI file: one host per line, with <strong>behavioral parameters</strong> like <code>ansible_host</code>, <code>ansible_user</code>, and <code>ansible_ssh_pass</code> that tell Ansible how to connect.",
    parts: [
      { text: "web ansible_host=192.168.98.100", explanation: "an inventory alias 'web' mapped to a real IP — playbooks refer to the friendly name" },
      { text: "ansible_user=vagrant", explanation: "SSH user to log in as on that host" },
      { text: "ansible_ssh_pass=vagrant", explanation: "password auth (lab only — use SSH keys in real life)" },
    ],
    example: "web  ansible_host=192.168.98.100 ansible_user=vagrant ansible_ssh_pass=vagrant\ndb   ansible_host=192.168.98.101 ansible_user=vagrant ansible_ssh_pass=vagrant\nclnt ansible_host=192.168.98.102 ansible_user=vagrant ansible_ssh_pass=vagrant",
    why: "Two default groups always exist — <code>all</code> (every host) and <code>ungrouped</code>. Even a flat list like this is usable: <code>ansible web -i inventory -a hostname</code> works immediately."
  },

  {
    id: 411, section: "inventory", sectionTitle: "Inventory",
    commandTitle: "Groups and groups-of-groups",
    command: "ansible grp-servers -i inventory -a 'hostname'",
    searchTerms: "inventory groups children grp-servers grp-webservers grp-databases group of groups",
    description: "Hosts are organised into <strong>groups</strong> (by role, location, or environment). Groups can contain other groups via the <code>:children</code> suffix, letting you address a whole tier of infrastructure with one name.",
    parts: [
      { text: "[grp-webservers]", explanation: "a group containing the web host(s)" },
      { text: "[grp-servers:children]", explanation: "a super-group whose members are other groups" },
      { text: "ansible grp-servers ...", explanation: "targets every host reachable through the children — web + db at once" },
    ],
    example: "[grp-webservers]\nweb\n\n[grp-databases]\ndb\n\n[grp-stations]\nclnt\n\n[grp-servers:children]\ngrp-webservers\ngrp-databases\n\n$ ansible grp-servers -i inventory -a 'hostname'\nweb | CHANGED | rc=0 >>\nweb.sulab.local\ndb  | CHANGED | rc=0 >>\ndb.sulab.local",
    why: "Grouping is how a single playbook can say 'install the .NET runtime on grp-webservers and PostgreSQL on grp-databases' without hardcoding hostnames."
  },

  {
    id: 412, section: "inventory", sectionTitle: "Inventory",
    commandTitle: "The YAML inventory form",
    command: "cat inventory.yml",
    searchTerms: "inventory yaml format hosts children all nested",
    description: "The same inventory can be written in YAML. It's more verbose but nests cleanly and is easier to generate programmatically — the format dynamic-inventory plugins emit.",
    parts: [
      { text: "all:", explanation: "the root group every host belongs to" },
      { text: "children:", explanation: "nested groups under all" },
      { text: "hosts:", explanation: "the actual host entries within a group" },
    ],
    example: "all:\n  children:\n    web:\n      hosts:\n        w1.sulab.org:\n        w2.sulab.org:\n    db:\n      hosts:\n        db1.sulab.org:",
    why: "INI is quickest to hand-write; YAML scales better and is what tools emit. Ansible reads either — pick INI for the labs, YAML when generating inventories from a cloud API."
  },

  // ── Section 2: Variables & precedence ───────────────────────────────────────

  {
    id: 413, section: "vars", sectionTitle: "Variables & Precedence",
    commandTitle: "group_vars and host_vars directories",
    command: "tree group_vars host_vars",
    searchTerms: "group_vars host_vars variables precedence all groupname hostname directory",
    description: "Rather than cramming variables into the inventory, Ansible auto-loads them from <code>group_vars/</code> and <code>host_vars/</code> directories next to your playbook. A file named after a group or host supplies variables for it.",
    parts: [
      { text: "group_vars/all", explanation: "variables applied to every host — lowest precedence" },
      { text: "group_vars/grp-webservers", explanation: "variables for one group — overrides 'all'" },
      { text: "host_vars/web", explanation: "variables for a single host — overrides group vars" },
    ],
    example: "group_vars/\n├── all              # username: user_all\n└── grp-webservers   # username: user_group\nhost_vars/\n└── web              # username: user_host",
    why: "Separating data (vars) from logic (tasks) is the core of clean Ansible. Your .NET app version or Node.js LTS line lives in group_vars, so the playbook stays generic and reusable."
  },

  {
    id: 414, section: "vars", sectionTitle: "Variables & Precedence",
    commandTitle: "Demonstrate variable precedence with the user module",
    command: "ansible grp-servers -i inventory -m user -a 'name={{username}} password=Password1' --become",
    searchTerms: "variable precedence override group host user module become privilege jinja",
    description: "Run the same command after adding each level of variable. The created user's name changes from <code>user_all</code> → <code>user_group</code> → <code>user_host</code> as the more specific definition wins. The <code>{{username}}</code> Jinja2 reference resolves to whichever value has highest precedence for that host.",
    parts: [
      { text: "-m user", explanation: "the user module — creates/manages OS user accounts" },
      { text: "-a 'name={{username}} password=Password1'", explanation: "module args; {{username}} is substituted from the resolved variable" },
      { text: "--become", explanation: "escalate to root (sudo) — required to manage users" },
    ],
    example: "# order of precedence (low → high):\n#   group_vars/all  <  group_vars/<group>  <  host_vars/<host>\n\n$ ansible web -i inventory -m user -a 'name={{username}} password=Password1' --become\nweb | CHANGED => { \"name\": \"user_host\", ... }   # host_vars wins",
    why: "Precedence lets you set a sane default in group_vars/all and override it for one special host without copy-pasting. Knowing the order prevents 'why is this the wrong value?' debugging."
  },

  // ── Section 3: Configuration ────────────────────────────────────────────────

  {
    id: 415, section: "config", sectionTitle: "Configuration",
    commandTitle: "Configuration file search order",
    command: "ansible --version | grep 'config file'",
    searchTerms: "ansible.cfg configuration order ANSIBLE_CONFIG etc precedence",
    description: "Ansible looks for its config in a fixed order and uses the <strong>first one found</strong> — they are not merged. A project-local <code>./ansible.cfg</code> is the usual choice so settings travel with the repo.",
    parts: [
      { text: "$ANSIBLE_CONFIG", explanation: "an env var pointing at a config file — highest priority" },
      { text: "./ansible.cfg", explanation: "config in the current directory — the per-project standard" },
      { text: "~/.ansible.cfg then /etc/ansible/ansible.cfg", explanation: "user-level, then system-wide fallbacks" },
    ],
    example: "# precedence (first found wins):\n#   $ANSIBLE_CONFIG  >  ./ansible.cfg  >  ~/.ansible.cfg  >  /etc/ansible/ansible.cfg\n\n$ ansible --version | grep 'config file'\n  config file = /home/devops/M4/M4-2/3/ansible.cfg",
    why: "Committing ./ansible.cfg to the repo means every teammate and the CI runner use identical settings. Override one setting at runtime with ANSIBLE_<SETTING> env vars."
  },

  {
    id: 416, section: "config", sectionTitle: "Configuration",
    commandTitle: "Disable host key checking for fresh VMs",
    command: "cat ansible.cfg",
    searchTerms: "ansible.cfg defaults host_key_checking known_hosts ssh false",
    description: "Brand-new VMs aren't in <code>~/.ssh/known_hosts</code>, so SSH prompts to confirm the fingerprint and Ansible hangs/fails. Setting <code>host_key_checking=false</code> in <code>ansible.cfg</code> skips that prompt — fine for ephemeral lab VMs, not for production.",
    parts: [
      { text: "[defaults]", explanation: "the main config section" },
      { text: "host_key_checking = false", explanation: "don't verify or prompt for SSH host keys" },
      { text: "ANSIBLE_HOST_KEY_CHECKING=true ansible ...", explanation: "an env var overrides the file per-run when you want checking back on" },
    ],
    example: "[defaults]\nhost_key_checking = false\nprivate_key_file = /home/devops/.vagrant.d/insecure_private_key\nremote_user = vagrant",
    why: "Vagrant recreates VMs constantly, each with a new host key. Without this, every 'vagrant destroy && up' breaks your playbook run with an interactive prompt."
  },

  {
    id: 417, section: "config", sectionTitle: "Configuration",
    commandTitle: "Key-based auth — drop passwords from the inventory",
    command: "ansible web -i inventory -a 'hostname'",
    searchTerms: "ansible.cfg private_key_file ssh key remote_user passwordless inventory clean",
    description: "Once <code>ansible.cfg</code> points at a private key and default user, the inventory no longer needs <code>ansible_user</code> / <code>ansible_ssh_pass</code> on every line. Connection details live in one place; the inventory becomes a clean list of hosts and groups.",
    parts: [
      { text: "private_key_file = .../insecure_private_key", explanation: "the SSH private key Ansible authenticates with" },
      { text: "remote_user = vagrant", explanation: "default login user for all hosts" },
      { text: "inventory now: 'web ansible_host=192.168.98.100'", explanation: "no per-host creds — they came from ansible.cfg" },
    ],
    example: "# ansible.cfg\n[defaults]\nhost_key_checking = false\nprivate_key_file = /home/devops/.vagrant.d/insecure_private_key\nremote_user = vagrant\n\n# inventory (clean)\nweb ansible_host=192.168.98.100\ndb  ansible_host=192.168.98.101\n\n$ ansible web -i inventory -a 'hostname'\nweb | CHANGED | rc=0 >>\nweb.sulab.local",
    why: "Passwords in an inventory file are a security smell and break automation. Key-based auth + a clean inventory is the pattern you carry into the .NET and Node.js deploy playbooks next."
  },

];
