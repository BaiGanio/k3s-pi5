// modules/monitoring/nagios-intro.js
// Monitoring: Introduction to Nagios — Infrastructure & Application Monitoring
// Extracted from DOB-M6 lecture (Slides-M6-Nagios.md), framed for .NET / Node.js stacks

window.pageBlocks = [

  // ── What is Nagios? ──────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'What is Nagios?',
    content: `
      <p>
        <strong>Nagios</strong> is an open-source <strong>monitoring suite</strong> — it watches
        your servers, services, and applications and alerts you when something goes wrong. It has
        been the standard for infrastructure monitoring since 1999 and remains widely deployed in
        enterprise data centers.
      </p>

      <p>
        Nagios monitors <em>anything reachable over a network</em>: HTTP endpoints, database
        servers, Docker containers, disk usage, CPU load, memory, and custom application metrics.
        It is:
      </p>
      <ul>
        <li><strong>Flexible</strong> — can monitor virtually anything attached to a network</li>
        <li><strong>Extensible</strong> — plugins are simple binaries or scripts; hundreds exist on the Nagios Exchange</li>
        <li><strong>Scalable</strong> — one Nagios host can monitor dozens or hundreds of nodes</li>
        <li><strong>Open source</strong> — Nagios Core is free; Nagios XI is the paid enterprise edition</li>
      </ul>
    `,
  },

  // ── Why monitoring exists ─────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Why Monitoring Matters',
    content: `
      <p>
        Monitoring is the fourth pillar of DevOps, alongside provisioning, configuration management,
        and CI/CD. Without it, you're <strong>flying blind</strong> — you don't know if your app is
        up, if your database is responding, or if your disk is about to fill until a user complains.
      </p>

      <p>Nagios solves four core problems:</p>
      <ul>
        <li><strong>Detection</strong> — is the service up? Is the disk full? Is the CPU pegged?</li>
        <li><strong>Notification</strong> — email, Slack, PagerDuty when a check fails</li>
        <li><strong>Visualisation</strong> — a web dashboard showing the state of every host and service</li>
        <li><strong>Response</strong> — event handlers that run scripts automatically (restart a service, scale up, fail over)</li>
      </ul>

      <p>
        The goal is <strong>mean time to detection (MTTD) → 0</strong>. You want Nagios to know
        about a problem before your users do — ideally, before the problem becomes user-visible.
      </p>
    `,
  },

  // ── The monitoring landscape ──────────────────────────────────────────────

  {
    type: 'prose',
    title: 'The Monitoring Landscape — and Where Nagios Fits',
    content: `
      <p>Nagios is not the only monitoring tool. The modern landscape includes:</p>
      <ul>
        <li><strong>Nagios</strong> (free/paid) — the classic. Agent-based (NRPE) and agentless. File-driven configuration.</li>
        <li><strong>Icinga</strong> (free) — a Nagios fork with a modern UI, compatible with Nagios plugins and configs.</li>
        <li><strong>Zabbix</strong> (free/paid) — agent-based, auto-discovery, built-in graphing. More "batteries included" than Nagios.</li>
        <li><strong>Prometheus</strong> (free) — pull-based, time-series native, designed for cloud-native/microservice monitoring. Grafana for dashboards.</li>
        <li><strong>Sensu</strong> (free/paid) — modern rewrite of Nagios concepts, API-driven, designed for dynamic infrastructure.</li>
        <li><strong>New Relic / Datadog</strong> (paid SaaS) — APM + infrastructure, no self-hosting required.</li>
      </ul>

      <p>
        Nagios remains relevant because: it runs on minimal hardware, it's battle-tested in
        enterprise environments, the plugin ecosystem is enormous, and its file-driven configuration
        is easy to version-control and automate with Ansible. Understanding Nagios gives you the
        mental model for every monitoring tool that followed.
      </p>
    `,
  },

  // ── Nagios architecture ───────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Nagios Architecture & Core Concepts',
    content: `
      <p>
        A Nagios deployment has one <strong>Nagios Core host</strong> (the monitoring server) and
        zero or more <strong>monitored hosts</strong>. The core host runs scheduled checks and
        stores results; monitored hosts expose services that Nagios verifies.
      </p>

      <h4>Core Objects</h4>
      <ul>
        <li><strong>Hosts</strong> — a device on the network (server, VM, container, switch). Defined by name, IP/FQDN, and a template.</li>
        <li><strong>Host Groups</strong> — logical grouping of hosts (e.g. "web-servers", "db-servers", "docker-nodes").</li>
        <li><strong>Services</strong> — a specific thing to monitor on a host (HTTP, SSH, disk, CPU, PostgreSQL, Docker container).</li>
        <li><strong>Service Groups</strong> — logical grouping of services across hosts (e.g. "HTTP Services", "Database Services").</li>
        <li><strong>Commands</strong> — the plugin invocation: which binary/script to run with which arguments.</li>
        <li><strong>Contacts / Contact Groups</strong> — who gets notified and how (email, SMS, custom script).</li>
        <li><strong>Templates</strong> — reusable base definitions for hosts and services (DRY principle).</li>
        <li><strong>Time Periods</strong> — when checks run and when notifications are sent (e.g. "workhours", "24x7").</li>
      </ul>

      <h4>Monitoring Methods</h4>
      <ul>
        <li><strong>Active checks (agentless)</strong> — Nagios initiates the check: pings the host, HTTP GETs an endpoint, connects to a TCP port. No agent needed on the target.</li>
        <li><strong>Passive checks (NRPE)</strong> — the Nagios Remote Plugin Executor (NRPE) agent runs on the monitored host. Nagios asks NRPE to execute a plugin locally and report the result. Needed for checks that can't be done remotely (disk space, CPU, process counts, Docker container state).</li>
      </ul>
    `,
  },

  // ── State model ───────────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Nagios State Model: OK, WARNING, CRITICAL, UNKNOWN',
    content: `
      <p>Every check returns one of four states:</p>
      <ul>
        <li><strong>0 — OK</strong> (green): the service is healthy</li>
        <li><strong>1 — WARNING</strong> (yellow): something is degraded but not yet broken (disk at 80%, response time elevated)</li>
        <li><strong>2 — CRITICAL</strong> (red): the service is broken and needs immediate attention (disk full, HTTP 500, process not running)</li>
        <li><strong>3 — UNKNOWN</strong> (orange): the check itself failed (plugin error, timeout, permission denied)</li>
      </ul>

      <h4>Soft vs Hard States</h4>
      <p>
        A check doesn't trigger an alert immediately. Nagios uses a <strong>max_check_attempts</strong>
        counter: the first failure is a <strong>SOFT</strong> state (transient glitch?) and the check
        is retried. Only after <code>max_check_attempts</code> consecutive failures does the state
        become <strong>HARD</strong> — and only HARD states trigger notifications. This prevents
        alert storms from transient network blips.
      </p>

      <p>Additional state modifiers:</p>
      <ul>
        <li><strong>FLAPPING</strong> — the service is rapidly oscillating between OK and CRITICAL. Nagios suppresses notifications during flap.</li>
        <li><strong>DOWNTIME</strong> — scheduled maintenance window. Checks still run but notifications are suppressed.</li>
        <li><strong>ACKNOWLEDGED</strong> — a human has seen the problem and is working on it. Suppresses further notifications.</li>
      </ul>
    `,
  },

  {
    type: 'note',
    variant: 'tip',
    content: `
      <strong>Mental model for app developers.</strong> Nagios is to servers what unit tests are to
      code — a continuous assertion that "the system is in the expected state." A .NET health check
      endpoint (<code>/health</code>) tells you the app is alive; Nagios polls that endpoint every
      5 minutes and pages you if it stops responding. The two together give you confidence to deploy
      on Friday afternoon.
    `,
  },

  // ── Where this module set goes next ───────────────────────────────────────

  {
    type: 'prose',
    title: 'Roadmap for This Module',
    content: `
      <p>
        This module walks through Nagios from installation to advanced monitoring, building
        toward a realistic monitoring setup for .NET and Node.js applications backed by PostgreSQL:
      </p>
      <ol>
        <li><strong>Setup</strong> — install Nagios Core on CentOS, configure the web UI, install plugins, create the admin user</li>
        <li><strong>Configuration</strong> — define hosts, host groups, services, service groups, commands, and templates. Monitor HTTP, SSH, disk, CPU.</li>
        <li><strong>Remote Monitoring (NRPE)</strong> — install the NRPE agent on remote nodes, configure custom checks, monitor from the Nagios host</li>
        <li><strong>Advanced</strong> — monitor PostgreSQL connection and query health, monitor Docker containers (.NET/Node.js apps), event handlers for auto-remediation</li>
        <li><strong>Capstone</strong> — a fully automated Nagios environment (Vagrant + shell provisioners) with PostgreSQL, Docker, and HTTP monitoring. Plus: explore Icinga as a modern Nagios-compatible alternative.</li>
      </ol>
      <p>
        By the end, you'll understand the monitoring fundamentals that every operations engineer
        relies on — and you'll have a foundation that translates directly to Prometheus, Grafana,
        and cloud-native observability.
      </p>
    `,
  },

];
