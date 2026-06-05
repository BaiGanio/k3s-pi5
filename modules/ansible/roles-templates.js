// modules/ansible/roles-templates.js
// M4: Ansible — Roles, Templates, Galaxy & Advanced Techniques
// Extracted from DOB-M4-Practice-Files M4-3 (roles, templates, register/debug, when)

window.commandData = [

  // ── Section 1: Roles ────────────────────────────────────────────────────────

  {
    id: 450, section: "roles", sectionTitle: "Roles",
    commandTitle: "The standard role directory structure",
    command: "ansible-galaxy init roles/app-server && tree roles/app-server",
    searchTerms: "role directory structure tasks handlers defaults vars files templates meta main.yml init",
    description: "A <strong>role</strong> is a reusable bundle with a conventional layout. Ansible auto-loads <code>main.yml</code> from each subfolder. <code>ansible-galaxy init</code> scaffolds the whole structure for you. A role turns a wall of tasks into a named, shareable unit.",
    parts: [
      { text: "tasks/", explanation: "the main list of tasks (main.yml) — what the role does" },
      { text: "handlers/", explanation: "handlers triggered by notify (e.g. restart a service)" },
      { text: "templates/ and files/", explanation: "Jinja2 templates and static files the role deploys" },
      { text: "defaults/ and vars/", explanation: "default variables (low precedence) and role vars (high)" },
    ],
    example: "roles/app-server/\n├── tasks/      main.yml   # install runtime, deploy app\n├── handlers/   main.yml   # restart weatherapi\n├── templates/  app.service.j2\n├── files/      index.html\n├── defaults/   main.yml   # app_port: 5000\n└── meta/       main.yml   # author, dependencies",
    why: "Roles are how Ansible scales past a single file. The .NET and Node deploy logic from the previous modules becomes a 'dotnet-app' and a 'node-app' role you can reuse across projects."
  },

  {
    id: 451, section: "roles", sectionTitle: "Roles",
    commandTitle: "Use a role in a playbook",
    command: "ansible-playbook webservers.yml",
    searchTerms: "role usage playbook roles keyword apply include reuse apache web server",
    description: "A playbook applies roles via the <code>roles:</code> keyword instead of an inline <code>tasks:</code> list. Ansible runs the role's <code>tasks/main.yml</code>, wiring in its handlers, templates, and defaults automatically. The playbook becomes a short statement of intent.",
    parts: [
      { text: "- hosts: grp-webservers", explanation: "target the web tier" },
      { text: "roles: - app-server", explanation: "apply the app-server role to those hosts" },
      { text: "(tasks/main.yml can include redhat.yml / debian.yml)", explanation: "roles split OS-specific logic into included task files" },
    ],
    example: "---\n- hosts: grp-webservers\n  become: true\n  roles:\n    - app-server\n\n# roles/app-server/tasks/main.yml\n- import_tasks: redhat.yml\n  when: ansible_os_family == 'RedHat'\n- import_tasks: debian.yml\n  when: ansible_os_family == 'Debian'",
    why: "Compare to the inline playbooks earlier: same outcome, but the logic is now reusable and the playbook reads as a list of capabilities ('this host is an app-server'), not a script."
  },

  {
    id: 452, section: "roles", sectionTitle: "Roles",
    commandTitle: "Pull a shared role from Ansible Galaxy",
    command: "ansible-galaxy install -r requirements.yml",
    searchTerms: "ansible-galaxy install role requirements community share download reuse",
    description: "<strong>Ansible Galaxy</strong> is the public registry of community roles. Instead of writing a Docker or nginx role yourself, install a vetted one. Pin versions in a <code>requirements.yml</code> so installs are reproducible.",
    parts: [
      { text: "ansible-galaxy install username.role", explanation: "install a single role by name" },
      { text: "ansible-galaxy install -r requirements.yml", explanation: "install every role listed in a requirements file" },
      { text: "ansible-galaxy install --roles-path . username.role", explanation: "install into a custom path (e.g. project-local roles/)" },
    ],
    example: "# requirements.yml\n- src: geerlingguy.docker\n  version: \"7.0.0\"\n- src: geerlingguy.nodejs\n\n$ ansible-galaxy install -r requirements.yml\n- downloading role 'docker', owned by geerlingguy\n- geerlingguy.docker (7.0.0) was installed successfully",
    why: "The homework asks for a Docker host — geerlingguy.docker from Galaxy does it in one line. Reuse vetted roles for commodity work; write your own only for app-specific logic."
  },

  // ── Section 2: Templates ────────────────────────────────────────────────────

  {
    id: 453, section: "templates", sectionTitle: "Jinja2 Templates",
    commandTitle: "Render a dynamic file with the template module",
    command: "cat index.j2",
    searchTerms: "template module jinja2 j2 variables render dynamic config file dest",
    description: "The <code>template</code> module renders a <strong>Jinja2</strong> file with your variables and copies the result to the host. Use it for any config that varies by host or environment — an nginx vhost, an appsettings.json, a systemd unit.",
    parts: [
      { text: "src=templates/index.j2", explanation: "the Jinja2 source on the control node" },
      { text: "dest=/var/www/html/index.html", explanation: "where the rendered output lands on the host" },
      { text: "{{ v_host_type }}", explanation: "a variable interpolated at render time" },
    ],
    example: "<!-- templates/index.j2 -->\n<html><body>\n  <h2>Hello from Ansible on {{ v_host_type }}!</h2>\n  <p>App port: {{ app_port }} · Host: {{ inventory_hostname }}</p>\n</body></html>\n\n# task\n- name: Deploy landing page\n  ansible.builtin.template:\n    src: templates/index.j2\n    dest: /var/www/html/index.html",
    why: "Templates are how one role serves a heterogeneous fleet: the same index.j2 renders 'RedHat' on CentOS and 'Debian' on Ubuntu, driven by facts — no duplicated files."
  },

  {
    id: 454, section: "templates", sectionTitle: "Jinja2 Templates",
    commandTitle: "Conditional tasks with when + facts",
    command: "ansible-playbook webservers.yml",
    searchTerms: "when conditional ansible_os_family facts redhat debian apt yum cross-platform",
    description: "The <code>when:</code> clause gates a task on a condition — most often an <strong>Ansible fact</strong> like <code>ansible_os_family</code>. This is how one playbook handles both CentOS (yum) and Ubuntu (apt) targets: each install task runs only on the matching OS.",
    parts: [
      { text: "when: ansible_os_family == 'RedHat'", explanation: "run this task only on RHEL/CentOS hosts" },
      { text: "when: ansible_os_family == 'Debian'", explanation: "run this task only on Debian/Ubuntu hosts" },
      { text: "ansible_os_family", explanation: "a fact Ansible auto-gathers about each host at play start" },
    ],
    example: "- name: Install Apache (RedHat)\n  ansible.builtin.yum: { name: httpd, state: present }\n  when: ansible_os_family == 'RedHat'\n\n- name: Install Apache (Debian)\n  ansible.builtin.apt: { name: apache2, state: present }\n  when: ansible_os_family == 'Debian'",
    why: "The homework requires one CentOS host and one Ubuntu host. when + facts lets a single playbook provision both correctly — the heart of writing portable automation."
  },

  // ── Section 3: register, debug, handlers ────────────────────────────────────

  {
    id: 455, section: "advanced", sectionTitle: "register · debug · handlers",
    commandTitle: "Capture task output with register and inspect with debug",
    command: "ansible-playbook register.yml",
    searchTerms: "register debug variable capture output shell stdout var msg verbosity",
    description: "<code>register</code> saves a task's result into a variable; <code>debug</code> prints it. Together they let one task feed another and give you visibility into what happened — the print-statement of Ansible.",
    parts: [
      { text: "register: kver", explanation: "store this task's result (stdout, rc, changed…) in 'kver'" },
      { text: "debug: var=kver", explanation: "dump the whole registered variable" },
      { text: "debug: msg=\"Kernel {{ kver.stdout }}\"", explanation: "print a specific field with a message" },
    ],
    example: "- hosts: clnt\n  tasks:\n    - name: Get kernel version\n      ansible.builtin.shell: /usr/bin/uname -r\n      register: kver\n    - name: Show it\n      ansible.builtin.debug:\n        msg: \"Kernel is {{ kver.stdout }}\"",
    why: "register/debug is how you chain steps (use task A's output as task B's input) and how you troubleshoot — far better than blindly re-running and hoping."
  },

  {
    id: 456, section: "advanced", sectionTitle: "register · debug · handlers",
    commandTitle: "Handlers run once, at the end, only when notified",
    command: "ansible-playbook webservers.yml",
    searchTerms: "handler notify changed restart service once end idempotent reload config",
    description: "A <strong>handler</strong> is a task that runs only when <code>notify</code>-ed, fires <strong>once</strong> even if notified many times, and runs at the <strong>end</strong> of the play. The classic use: restart a service only if its config file actually changed.",
    parts: [
      { text: "notify: Restart app", explanation: "queue the handler — but only if this task reported 'changed'" },
      { text: "handlers: - name: Restart app", explanation: "the handler definition, matched by name" },
      { text: "runs once, after all tasks", explanation: "ten config changes → one restart, at the end" },
    ],
    example: "tasks:\n  - name: Deploy appsettings.json\n    ansible.builtin.template:\n      src: appsettings.json.j2\n      dest: /opt/weatherapi/appsettings.json\n    notify: Restart weatherapi\n\nhandlers:\n  - name: Restart weatherapi\n    ansible.builtin.service:\n      name: weatherapi\n      state: restarted",
    why: "Handlers prevent needless restarts: edit five config files and the app bounces once, not five times — and not at all if nothing changed. Zero-churn deploys depend on this."
  },

];
