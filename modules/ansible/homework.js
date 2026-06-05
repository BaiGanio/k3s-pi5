// modules/m4/homework.js
// M4: Ansible — Homework (capstone)
// Recast of Homework-M4-Ansible.md (PHP+MySQL) as a heterogeneous WEB+DB deploy
// WEB: ASP.NET Core on CentOS  /  Node.js Express on Ubuntu  ·  DB: PostgreSQL

window.commandData = [

  // ── Section 1: The assignment ───────────────────────────────────────────────

  {
    id: 460, section: "brief", sectionTitle: "The Assignment",
    commandTitle: "Goal — a two-host WEB + DB stack via Ansible",
    command: "cat README.md",
    searchTerms: "homework assignment two host web db centos ubuntu deploy heterogeneous",
    description: "The original DOB homework builds a PHP WEB host + MySQL DB host across CentOS and Ubuntu. We keep the <strong>heterogeneous two-host shape</strong> but modernise the app tier: a <strong>WEB</strong> server (ASP.NET Core <em>or</em> Node.js Express) and a <strong>DB</strong> server (PostgreSQL). One playbook, both OS families, driven by Ansible facts.",
    parts: [
      { text: "Host 1 — WEB", explanation: "app server: ASP.NET Core on CentOS (or Node.js Express on Ubuntu)" },
      { text: "Host 2 — DB", explanation: "PostgreSQL server the app connects to" },
      { text: "one playbook, two roles", explanation: "a web-app role and a db role, applied to the right group each" },
    ],
    example: "Acceptance criteria:\n  ✓ DB host runs PostgreSQL, reachable from the WEB host\n  ✓ WEB host runs the app as a systemd service\n  ✓ App reads its connection string from a templated config\n  ✓ Re-running the playbook is a no-op (all 'ok')\n  ✓ curl http://<web>:8080 returns data from the DB",
    why: "This pulls together everything: inventory groups, group_vars, roles, templates, handlers, when/facts, and orchestration order. It's the M4 equivalent of the M1/M2 exams."
  },

  {
    id: 461, section: "brief", sectionTitle: "The Assignment",
    commandTitle: "Vagrantfile — provision the two target VMs",
    command: "vagrant up",
    searchTerms: "vagrant vagrantfile two vms centos ubuntu web db private network ip",
    description: "Bring up the infrastructure with Vagrant: one CentOS box (<code>web</code>) and one Ubuntu box (<code>db</code>) on a private network. Ansible then configures them — Vagrant makes the machines, Ansible makes them <em>useful</em>.",
    parts: [
      { text: "web → centos, 192.168.98.100", explanation: "the WEB host (ASP.NET Core / Node.js)" },
      { text: "db → ubuntu, 192.168.98.101", explanation: "the DB host (PostgreSQL)" },
      { text: "forwarded_port guest:80 host:8080", explanation: "reach the app from the host browser" },
    ],
    example: "Vagrant.configure(2) do |config|\n  config.vm.define 'web' do |web|\n    web.vm.box = 'shekeriev/centos-7-64-minimal'\n    web.vm.network 'private_network', ip: '192.168.98.100'\n    web.vm.network 'forwarded_port', guest: 8080, host: 8080\n  end\n  config.vm.define 'db' do |db|\n    db.vm.box = 'ubuntu/jammy64'\n    db.vm.network 'private_network', ip: '192.168.98.101'\n  end\nend",
    why: "Mixing CentOS and Ubuntu on purpose forces you to write OS-portable tasks (when + facts) — exactly the skill the homework is testing."
  },

  // ── Section 2: Inventory & variables ────────────────────────────────────────

  {
    id: 462, section: "wire", sectionTitle: "Inventory & Vars",
    commandTitle: "Inventory groups + shared connection vars",
    command: "cat inventory",
    searchTerms: "inventory grp-webservers grp-databases group_vars connection string db host",
    description: "Two groups — <code>grp-webservers</code> and <code>grp-databases</code>. Shared data (DB name, user, the WEB→DB connection string) lives in <code>group_vars/</code> so neither the inventory nor the roles hardcode it.",
    parts: [
      { text: "[grp-webservers] / web", explanation: "the app host" },
      { text: "[grp-databases] / db", explanation: "the PostgreSQL host" },
      { text: "group_vars/all → db_host, db_name, db_user", explanation: "one source of truth both roles read" },
    ],
    example: "# inventory\nweb ansible_host=192.168.98.100\ndb  ansible_host=192.168.98.101\n[grp-webservers]\nweb\n[grp-databases]\ndb\n\n# group_vars/all\ndb_host: 192.168.98.101\ndb_name: weatherapp\ndb_user: appuser\ndb_password: \"{{ vault_db_password }}\"",
    why: "Centralising db_host means the WEB role's connection-string template and the DB role's createdb task stay in sync from one variable — change it once, both follow."
  },

  // ── Section 3: The DB role ──────────────────────────────────────────────────

  {
    id: 463, section: "db", sectionTitle: "DB Role — PostgreSQL",
    commandTitle: "Install and configure PostgreSQL",
    command: "ansible-playbook site.yml --tags db",
    searchTerms: "postgresql install role apt database user createdb listen addresses ubuntu",
    description: "The DB role installs PostgreSQL, creates the application database and user, and configures it to accept connections from the WEB host. The DB play runs <strong>first</strong> so the database is ready before the app starts.",
    parts: [
      { text: "apt: name=postgresql state=present", explanation: "install PostgreSQL on the Ubuntu DB host" },
      { text: "community.postgresql.postgresql_db / _user", explanation: "create the app database and a least-privilege user" },
      { text: "listen_addresses + pg_hba.conf (template)", explanation: "allow connections from the WEB host's IP only" },
    ],
    example: "- name: Create app database\n  community.postgresql.postgresql_db:\n    name: \"{{ db_name }}\"\n  become_user: postgres\n\n- name: Create app user\n  community.postgresql.postgresql_user:\n    db: \"{{ db_name }}\"\n    name: \"{{ db_user }}\"\n    password: \"{{ db_password }}\"\n    priv: ALL\n  become_user: postgres\n  notify: Restart postgresql",
    why: "Orchestration order matters: the database must exist and accept connections before the API tries to query it. Plays run top-to-bottom, so DB-then-WEB in site.yml enforces that."
  },

  // ── Section 4: The WEB role ─────────────────────────────────────────────────

  {
    id: 464, section: "web", sectionTitle: "WEB Role — App + Config",
    commandTitle: "Deploy the app with a templated connection string",
    command: "ansible-playbook site.yml --tags web",
    searchTerms: "web role dotnet node deploy connection string template appsettings env systemd",
    description: "The WEB role installs the runtime (ASP.NET Core or Node.js depending on the host's OS family), deploys the app, and <strong>templates the connection string</strong> so the app points at the DB host. A handler restarts the service when config changes.",
    parts: [
      { text: "when: ansible_os_family == 'RedHat' → .NET", explanation: "CentOS host gets the ASP.NET Core runtime + app" },
      { text: "when: ansible_os_family == 'Debian' → Node", explanation: "Ubuntu host gets Node.js + the Express app" },
      { text: "template: appsettings.json.j2 / .env.j2", explanation: "inject Host={{ db_host }} into the app config" },
    ],
    example: "# appsettings.json.j2 (.NET)\n{\n  \"ConnectionStrings\": {\n    \"Default\": \"Host={{ db_host }};Database={{ db_name }};Username={{ db_user }};Password={{ db_password }}\"\n  }\n}\n# .env.j2 (Node)\nDATABASE_URL=postgres://{{ db_user }}:{{ db_password }}@{{ db_host }}/{{ db_name }}",
    why: "The app never hardcodes where the database is — Ansible renders it from db_host at deploy time. Move the DB and one variable change re-points every app. This is the 12-factor config pattern, automated."
  },

  // ── Section 5: Run & verify ─────────────────────────────────────────────────

  {
    id: 465, section: "verify", sectionTitle: "Run & Verify",
    commandTitle: "Run the whole stack and confirm end-to-end",
    command: "ansible-playbook site.yml && curl http://localhost:8080",
    searchTerms: "site.yml run verify end to end recap idempotent curl web db connection",
    description: "Run the top-level <code>site.yml</code> (DB play, then WEB play). Verify the app answers and reads from PostgreSQL. Then <strong>run it again</strong> — a fully idempotent playbook reports all <code>ok</code> and <code>changed=0</code>, the real grading criterion.",
    parts: [
      { text: "ansible-playbook site.yml", explanation: "DB role first, WEB role second — full provision + deploy" },
      { text: "curl http://localhost:8080", explanation: "hit the app; it queries PostgreSQL on the DB host" },
      { text: "re-run → changed=0", explanation: "second run proves true idempotence" },
    ],
    example: "$ ansible-playbook site.yml\nPLAY RECAP ********************************************************\ndb  : ok=6  changed=5  unreachable=0  failed=0\nweb : ok=8  changed=7  unreachable=0  failed=0\n\n$ ansible-playbook site.yml   # second run\ndb  : ok=6  changed=0  ...\nweb : ok=8  changed=0  ...   # ✓ idempotent",
    why: "A deploy that works once is luck; a deploy that's a clean no-op on the second run is engineering. The changed=0 re-run is the proof your playbook describes state, not steps."
  },

];
