// modules/ansible/playbooks-dotnet.js
// M4: Ansible — Playbooks (.NET track)
// Recast of the DOB-M4 Apache/PHP playbook practice as an ASP.NET Core deployment

window.commandData = [

  // ── Section 1: The app being deployed ───────────────────────────────────────

  {
    id: 430, section: "app", sectionTitle: "The ASP.NET Core App",
    commandTitle: "What we provision — a published .NET 8 app",
    command: "dotnet publish -c Release -o ./publish",
    searchTerms: "dotnet aspnet core publish release framework-dependent kestrel minimal api app",
    description: "The DOB practice installs Apache + PHP with Ansible. We keep the <em>same Ansible concepts</em> but deploy an <strong>ASP.NET Core</strong> app instead. The app is published on the control node (or in CI) into a <code>publish/</code> folder of DLLs that Ansible then ships to the web hosts.",
    parts: [
      { text: "dotnet publish -c Release", explanation: "compile in Release mode — optimised, no debug symbols" },
      { text: "-o ./publish", explanation: "emit the runnable output (DLLs + deps.json) to ./publish" },
      { text: "framework-dependent", explanation: "needs the ASP.NET runtime on the host — Ansible installs that" },
    ],
    example: "// Program.cs — the same /weather Minimal API from the Docker module\nvar builder = WebApplication.CreateBuilder(args);\nvar app = builder.Build();\napp.MapGet(\"/\", () => \"Hello from ASP.NET Core, provisioned by Ansible!\");\napp.Run(\"http://0.0.0.0:5000\");",
    why: "This is the .NET equivalent of dropping index.php into /var/www/html — except a compiled app needs a runtime and a service to keep it alive, which is exactly what the playbook sets up."
  },

  // ── Section 2: Authoring the playbook ───────────────────────────────────────

  {
    id: 431, section: "playbook", sectionTitle: "Authoring the Playbook",
    commandTitle: "A play maps hosts to tasks (webservers.yml)",
    command: "cat webservers.yml",
    searchTerms: "playbook play hosts become tasks yaml dotnet runtime structure",
    description: "A <strong>playbook</strong> is YAML. Each <strong>play</strong> binds a host group to an ordered list of <strong>tasks</strong>; each task calls a module. <code>become: true</code> runs them as root. This play installs the ASP.NET runtime, deploys the app, and starts it as a service.",
    parts: [
      { text: "- hosts: grp-webservers", explanation: "the play targets the webservers group from the inventory" },
      { text: "become: true", explanation: "run every task with sudo/root" },
      { text: "tasks:", explanation: "the ordered list of module invocations that follow" },
    ],
    example: "---\n- hosts: grp-webservers\n  become: true\n  vars:\n    app_dir: /opt/weatherapi\n  tasks:\n    - name: Add Microsoft package repo\n      ansible.builtin.yum:\n        name: https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm\n        state: present\n\n    - name: Install the ASP.NET Core runtime\n      ansible.builtin.yum:\n        name: aspnetcore-runtime-8.0\n        state: present\n\n    - name: Deploy published app\n      ansible.builtin.copy:\n        src: ./publish/\n        dest: \"{{ app_dir }}/\"",
    why: "This is the PHP playbook recast: instead of 'yum install httpd', it's 'install the .NET repo + runtime + copy the published DLLs'. The structure — hosts, become, tasks — is identical."
  },

  {
    id: 432, section: "playbook", sectionTitle: "Authoring the Playbook",
    commandTitle: "Run the app as a systemd service (template + handler)",
    command: "cat webservers.yml  # systemd unit task",
    searchTerms: "systemd unit service template kestrel dotnet handler notify restart enabled",
    description: "A compiled .NET app isn't served by Apache — it runs its own Kestrel web server. We install a <code>systemd</code> unit (via the <code>copy</code>/<code>template</code> module), then <code>notify</code> a handler to (re)start it. The <code>service</code> module ensures it's enabled on boot.",
    parts: [
      { text: "template: src=kestrel.service.j2 dest=/etc/systemd/system/weatherapi.service", explanation: "render the unit file from a Jinja2 template" },
      { text: "notify: Restart weatherapi", explanation: "queue a handler — only fires if this task changed something" },
      { text: "service: name=weatherapi state=started enabled=true daemon_reload=true", explanation: "reload units, start now, enable on boot" },
    ],
    example: "    - name: Install systemd unit for the API\n      ansible.builtin.template:\n        src: kestrel.service.j2\n        dest: /etc/systemd/system/weatherapi.service\n      notify: Restart weatherapi\n\n    - name: Ensure the API is running and enabled\n      ansible.builtin.service:\n        name: weatherapi\n        state: started\n        enabled: true\n        daemon_reload: true\n\n  handlers:\n    - name: Restart weatherapi\n      ansible.builtin.service:\n        name: weatherapi\n        state: restarted",
    why: "systemd is the .NET-on-Linux equivalent of 'service httpd start' — it keeps Kestrel alive, restarts it on crash, and starts it at boot. The handler restarts only when the unit actually changes."
  },

  // ── Section 3: Validate before you run ──────────────────────────────────────

  {
    id: 433, section: "run", sectionTitle: "Validate & Execute",
    commandTitle: "Syntax-check and preview affected hosts",
    command: "ansible-playbook webservers.yml --syntax-check && ansible-playbook webservers.yml --list-hosts",
    searchTerms: "ansible-playbook syntax-check list-hosts dry validate yaml check",
    description: "Before running, validate the YAML with <code>--syntax-check</code>, then see which hosts a play would touch with <code>--list-hosts</code>. Add <code>--check</code> for a full dry-run that reports what <em>would</em> change without changing anything.",
    parts: [
      { text: "--syntax-check", explanation: "parse the playbook and fail fast on YAML/structure errors" },
      { text: "--list-hosts", explanation: "show the hosts each play resolves to, no execution" },
      { text: "--check", explanation: "dry-run: report changed/ok per task without applying" },
    ],
    example: "$ ansible-playbook webservers.yml --syntax-check\nplaybook: webservers.yml\n$ ansible-playbook webservers.yml --list-hosts\n  play #1 (grp-webservers): hosts (1):\n    web",
    why: "Catching a typo or a wrong target with --syntax-check / --list-hosts costs seconds; discovering it mid-deploy on production costs an outage."
  },

  {
    id: 434, section: "run", sectionTitle: "Validate & Execute",
    commandTitle: "Run the playbook",
    command: "ansible-playbook webservers.yml",
    searchTerms: "ansible-playbook run execute recap changed ok failed deploy dotnet",
    description: "Executes every play in order. The <strong>PLAY RECAP</strong> at the end summarises each host: <code>ok</code> (already correct), <code>changed</code> (Ansible modified it), <code>failed</code>, <code>unreachable</code>. Re-running is safe — idempotent tasks report <code>ok</code> the second time.",
    parts: [
      { text: "ansible-playbook webservers.yml", explanation: "run all plays against the inventory in ansible.cfg" },
      { text: "-i inventory", explanation: "or point at a specific inventory file" },
      { text: "PLAY RECAP", explanation: "per-host tally of ok / changed / unreachable / failed" },
    ],
    example: "PLAY RECAP *********************************************************\nweb : ok=5  changed=4  unreachable=0  failed=0\n\n$ curl http://localhost:8080\nHello from ASP.NET Core, provisioned by Ansible!",
    why: "The recap is your deploy report. A clean run on a fresh host shows lots of 'changed'; a re-run shows all 'ok' — proof the host already matches the declared state."
  },

  // ── Section 4: Failure handling ─────────────────────────────────────────────

  {
    id: 435, section: "resilience", sectionTitle: "Failure Handling",
    commandTitle: "Retry only the failed hosts",
    command: "ansible-playbook webservers.yml --limit @/home/devops/.ansible-retry/webservers.retry",
    searchTerms: "retry limit failed hosts ansible-retry resume partial deploy",
    description: "When a host fails, it's dropped from the rest of the run, and (with retry files enabled) its name is written to a <code>.retry</code> file. After fixing the issue, re-run with <code>--limit @&lt;retry file&gt;</code> to target <strong>only</strong> the hosts that failed — no need to redo the healthy ones.",
    parts: [
      { text: "retry_files_enabled = True (ansible.cfg)", explanation: "make Ansible write a .retry file listing failed hosts" },
      { text: "--limit @....retry", explanation: "restrict the run to the hosts named in that file" },
    ],
    example: "# ansible.cfg\n[defaults]\nretry_files_enabled = True\nretry_files_save_path = ~/.ansible-retry\n\n# after fixing the broken host:\n$ ansible-playbook webservers.yml --limit @~/.ansible-retry/webservers.retry",
    why: "In a 50-host rollout where 3 fail on a transient network blip, you fix those 3 and replay just them — not the whole fleet. Faster, and it avoids needless churn on healthy hosts."
  },

];
