// modules/ansible/playbooks-nodejs.js
// M4: Ansible — Playbooks (Node.js track)
// Parallel to the .NET track: same Ansible concepts, an Express app instead

window.commandData = [

  // ── Section 1: The app being deployed ───────────────────────────────────────

  {
    id: 440, section: "app", sectionTitle: "The Node.js / Express App",
    commandTitle: "What we provision — an Express app",
    command: "cat app.js",
    searchTerms: "node nodejs express app server javascript deploy listen port",
    description: "The Node.js mirror of the .NET track. The same shape of app — a tiny HTTP service — but built with <strong>Express</strong>. Unlike .NET, Node is interpreted, so there's no compile step: Ansible ships the source plus <code>package.json</code> and runs <code>npm ci</code> on the host.",
    parts: [
      { text: "const express = require('express')", explanation: "the Express web framework — the Node analogue of ASP.NET Minimal API" },
      { text: "app.get('/', ...)", explanation: "a single route, matching the .NET sample's behaviour" },
      { text: "app.listen(3000)", explanation: "Node runs its own HTTP server, like Kestrel for .NET" },
    ],
    example: "// app.js\nconst express = require('express');\nconst app = express();\napp.get('/', (req, res) =>\n  res.send('Hello from Express, provisioned by Ansible!'));\napp.listen(3000, '0.0.0.0');\n\n// package.json declares the dependency + start script\n{ \"name\": \"weatherapi\", \"scripts\": { \"start\": \"node app.js\" },\n  \"dependencies\": { \"express\": \"^4.19.2\" } }",
    why: "Same deployment problem as .NET, different runtime: install Node, get dependencies, keep the process alive. Comparing the two playbooks side by side shows how Ansible abstracts over the toolchain."
  },

  // ── Section 2: Authoring the playbook ───────────────────────────────────────

  {
    id: 441, section: "playbook", sectionTitle: "Authoring the Playbook",
    commandTitle: "Install Node.js from NodeSource (webservers.yml)",
    command: "cat webservers.yml",
    searchTerms: "playbook nodejs nodesource apt yum install runtime npm tasks hosts",
    description: "The play installs a current Node.js LTS. Distro packages lag badly, so we add the <strong>NodeSource</strong> repository first, then install <code>nodejs</code>. Structurally identical to the .NET play — only the package and repo differ.",
    parts: [
      { text: "- hosts: grp-webservers / become: true", explanation: "same targeting + privilege escalation as the .NET play" },
      { text: "shell: curl -fsSL https://deb.nodesource.com/setup_20.x | bash -", explanation: "register the NodeSource repo for Node 20 LTS" },
      { text: "apt: name=nodejs state=present", explanation: "install Node.js (includes npm)" },
    ],
    example: "---\n- hosts: grp-webservers\n  become: true\n  vars:\n    app_dir: /opt/weatherapi\n  tasks:\n    - name: Add NodeSource repo (Node 20 LTS)\n      ansible.builtin.shell: |\n        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -\n      args:\n        creates: /etc/apt/sources.list.d/nodesource.list\n\n    - name: Install Node.js\n      ansible.builtin.apt:\n        name: nodejs\n        state: present\n        update_cache: true",
    why: "Note 'creates:' — it makes the shell task idempotent by skipping if the repo file already exists. That's how you tame imperative shell steps inside a declarative playbook."
  },

  {
    id: 442, section: "playbook", sectionTitle: "Authoring the Playbook",
    commandTitle: "Deploy source and install dependencies",
    command: "cat webservers.yml  # deploy + npm ci",
    searchTerms: "copy synchronize npm ci install dependencies node_modules deploy source",
    description: "Ship the app to the host with the <code>copy</code> module, then run <code>npm ci</code> (clean, lockfile-faithful install) in the app directory. <code>npm ci</code> is the deploy-time counterpart to <code>dotnet restore</code> — it materialises <code>node_modules</code> from <code>package-lock.json</code>.",
    parts: [
      { text: "copy: src=./app/ dest={{ app_dir }}/", explanation: "push app.js, package.json and lockfile to the host" },
      { text: "command: npm ci  (args: chdir={{ app_dir }})", explanation: "install exact locked dependencies in the app dir" },
      { text: "creates: {{ app_dir }}/node_modules", explanation: "skip the install if node_modules already exists — idempotence" },
    ],
    example: "    - name: Deploy app source\n      ansible.builtin.copy:\n        src: ./app/\n        dest: \"{{ app_dir }}/\"\n      notify: Restart weatherapi\n\n    - name: Install dependencies\n      ansible.builtin.command: npm ci\n      args:\n        chdir: \"{{ app_dir }}\"\n        creates: \"{{ app_dir }}/node_modules\"",
    why: "npm ci (not npm install) on servers: it's faster, deterministic, and fails if package.json and the lockfile disagree — exactly the reproducibility you want in automated deploys."
  },

  {
    id: 443, section: "playbook", sectionTitle: "Authoring the Playbook",
    commandTitle: "Keep the process alive with systemd",
    command: "cat weatherapi.service.j2",
    searchTerms: "systemd node service unit template handler pm2 restart enabled keep alive",
    description: "A bare <code>node app.js</code> dies when the SSH session ends. Wrap it in a <code>systemd</code> unit — rendered from a Jinja2 template — so it restarts on crash and starts at boot. This is the same handler-driven restart pattern as the .NET track.",
    parts: [
      { text: "ExecStart=/usr/bin/npm start", explanation: "systemd launches the app via its start script" },
      { text: "Restart=always", explanation: "respawn the process if it exits — production hygiene" },
      { text: "notify: Restart weatherapi", explanation: "the deploy task triggers a restart only when code changed" },
    ],
    example: "# weatherapi.service.j2\n[Unit]\nDescription=Express Weather API\nAfter=network.target\n\n[Service]\nWorkingDirectory={{ app_dir }}\nExecStart=/usr/bin/npm start\nRestart=always\nUser=www-data\n\n[Install]\nWantedBy=multi-user.target",
    why: "systemd gives Node the same supervision .NET gets from Kestrel-under-systemd — one consistent process model across both stacks, instead of pm2 on one and systemd on the other."
  },

  // ── Section 3: Run & verify ─────────────────────────────────────────────────

  {
    id: 444, section: "run", sectionTitle: "Validate & Execute",
    commandTitle: "Syntax-check, run, and verify",
    command: "ansible-playbook webservers.yml --syntax-check && ansible-playbook webservers.yml",
    searchTerms: "ansible-playbook syntax-check run execute node verify curl recap",
    description: "Same workflow as every playbook: validate, run, read the recap, then verify the service answers. On a fresh host you'll see <code>changed</code> for each task; re-running shows <code>ok</code> because the host already matches the declared state.",
    parts: [
      { text: "--syntax-check", explanation: "validate YAML before running" },
      { text: "ansible-playbook webservers.yml", explanation: "execute the plays" },
      { text: "curl http://localhost:8080", explanation: "confirm the Express app responds (port mapped by Vagrant)" },
    ],
    example: "PLAY RECAP *********************************************************\nweb : ok=6  changed=5  unreachable=0  failed=0\n\n$ curl http://localhost:8080\nHello from Express, provisioned by Ansible!",
    why: "Identical run/verify loop to the .NET module — the proof that Ansible's mental model is runtime-agnostic. Learn it once, apply it to any stack."
  },

  {
    id: 445, section: "run", sectionTitle: "Validate & Execute",
    commandTitle: "Tag tasks to deploy code without re-provisioning",
    command: "ansible-playbook webservers.yml --tags deploy",
    searchTerms: "tags ansible-playbook skip-tags deploy provision selective partial run",
    description: "Annotate tasks with <code>tags:</code> so you can run a subset. Tag the runtime-install tasks <code>provision</code> and the copy/restart tasks <code>deploy</code>; then a routine code push runs just <code>--tags deploy</code>, skipping the slow Node install.",
    parts: [
      { text: "tasks: ... tags: [deploy]", explanation: "label the copy + restart tasks" },
      { text: "--tags deploy", explanation: "run only tasks carrying the 'deploy' tag" },
      { text: "--skip-tags provision", explanation: "the inverse — run everything except provisioning" },
    ],
    example: "$ ansible-playbook webservers.yml --tags deploy\nPLAY RECAP\nweb : ok=2  changed=1  unreachable=0  failed=0   # only the deploy tasks ran",
    why: "Day-2 reality: you provision a host once but deploy new code many times. Tags turn one playbook into both a full provisioner and a fast deploy tool — the bridge to using Ansible inside a CI/CD pipeline."
  },

];
