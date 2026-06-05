// modules/jenkins/jenkins-intro.js
// M5: Introduction to Jenkins — Continuous Integration & Delivery
// Extracted from DOB-M5 lecture (Slides-M5-Jenkins.md), framed for .NET / Node.js stacks

window.pageBlocks = [

  // ── What is Jenkins? ──────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'What is Jenkins?',
    content: `
      <p>
        <strong>Jenkins</strong> is an open-source <strong>automation server</strong> — a platform
        that orchestrates the Software Development Life Cycle (SDLC). It is the most widely-adopted
        tool for implementing <strong>Continuous Integration</strong> (CI) and
        <strong>Continuous Delivery/Deployment</strong> (CD).
      </p>

      <p>
        Written in Java and backed by CloudBees, Jenkins runs on Linux, macOS, and Windows. It is:
      </p>
      <ul>
        <li><strong>Extensible</strong> — over 1,800 plugins at <a href="https://plugins.jenkins.io/">plugins.jenkins.io</a></li>
        <li><strong>Scalable</strong> — one master can orchestrate dozens of agent (slave) nodes</li>
        <li><strong>Lightweight</strong> — a single <code>.war</code> file or a native package</li>
        <li><strong>Pipeline-aware</strong> — define multi-stage workflows as code (Jenkinsfile)</li>
      </ul>
    `,
  },

  // ── Why CI/CD exists ──────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'The Problem Jenkins Solves',
    content: `
      <p>
        Before CI/CD, the release process looked like this: a developer writes code for weeks,
        then "throws it over the wall" to an operations team who deploys it — often at 2 AM on a
        Saturday. The result:
      </p>
      <ul>
        <li><strong>Integration hell</strong> — merging months of divergent branches</li>
        <li><strong>"Works on my machine"</strong> — environment drift between dev and prod</li>
        <li><strong>Fear of deployment</strong> — releases are infrequent, high-risk events</li>
        <li><strong>Slow feedback</strong> — bugs discovered days or weeks after they were written</li>
      </ul>
      <p>
        Jenkins automates the pipeline: <strong>Build → Test → Deploy</strong>. Every commit
        triggers a build. Every build runs the test suite. A green build can be deployed with
        confidence. The feedback loop shrinks from weeks to minutes.
      </p>
    `,
  },

  // ── CI vs CD vs CD ────────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'CI, CD, and CD — The Three Acronyms',
    content: `
      <h4>Continuous Integration (CI)</h4>
      <p>
        The practice of merging code changes into a shared mainline <strong>frequently</strong>
        (multiple times a day). Each merge triggers an automated build and test run. If it fails,
        the team fixes it immediately — the build is never broken for long.
      </p>

      <h4>Continuous Delivery (CD)</h4>
      <p>
        Every change that passes CI <em>could</em> be released to production at the push of a
        button. The release is automated but still requires a manual approval step. You have the
        <em>ability</em> to deploy constantly.
      </p>

      <h4>Continuous Deployment (CD)</h4>
      <p>
        Every change that passes CI <em>is</em> released to production automatically — no human
        gate. This requires exceptional test coverage, feature flags, and rollback capability.
        You <em>are</em> deploying constantly.
      </p>

      <p>
        Jenkins supports the full spectrum: from a simple CI build on commit, through a gated
        delivery pipeline, to a fully automated deployment sequence.
      </p>
    `,
  },

  {
    type: 'note',
    variant: 'tip',
    content: `
      <strong>Mental model.</strong> CI is about <em>integration risk</em> — catching merge
      conflicts and regressions early. CD is about <em>release risk</em> — making the act of
      deploying boring, routine, and reversible. Jenkins is the engine that makes both possible.
    `,
  },

  // ── The CI/CD tool landscape ──────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Other CI/CD Solutions — and Why Jenkins Endures',
    content: `
      <p>Jenkins is not the only option. The landscape includes:</p>
      <ul>
        <li><strong>Buildbot</strong> (free) — Python-based, programmatic configuration. Powerful but high ceremony.</li>
        <li><strong>TeamCity</strong> (JetBrains, freemium) — polished UI, excellent .NET support out of the box.</li>
        <li><strong>Bamboo</strong> (Atlassian, paid only) — tight Jira/Bitbucket integration.</li>
        <li><strong>GitHub Actions / GitLab CI / CircleCI</strong> — SaaS-native, YAML-defined, per-repository.</li>
      </ul>
      <p>
        Jenkins remains dominant because:
      </p>
      <ul>
        <li><strong>Self-hosted</strong> — you control the data, the hardware, the network.</li>
        <li><strong>Plugin ecosystem</strong> — 1,800+ plugins cover nearly every tool and platform.</li>
        <li><strong>Language-agnostic</strong> — builds .NET, Node.js, Java, Go, Python equally well.</li>
        <li><strong>Proven at scale</strong> — Netflix, NASA, and thousands of enterprises run on it.</li>
      </ul>
    `,
  },

  // ── Jenkins architecture ──────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Jenkins Architecture: Master, Agents, and Jobs',
    content: `
      <p>
        A Jenkins installation has one <strong>master</strong> (controller) and zero or more
        <strong>agents</strong> (historically called slaves or nodes).
      </p>

      <h4>Master (Controller)</h4>
      <ul>
        <li>Serves the web UI and the REST API</li>
        <li>Schedules jobs and dispatches them to agents</li>
        <li>Stores all configuration, job definitions, and build history</li>
        <li>Can execute jobs itself — but best practice is to reserve it for orchestration only</li>
      </ul>

      <h4>Agent (Node / Slave)</h4>
      <ul>
        <li>A separate machine (VM, container, or bare metal) that executes build steps</li>
        <li>Communicates with the master over SSH or the Jenkins Remoting protocol (JNLP)</li>
        <li>Can be labelled (e.g. <code>linux-dotnet</code>, <code>windows-nodejs</code>) so jobs target the right environment</li>
        <li>Offloads work from the master — one master can manage dozens of agents</li>
      </ul>

      <h4>Job / Project</h4>
      <ul>
        <li>The unit of work: a configured task that Jenkins executes</li>
        <li>Types: <strong>Freestyle</strong> (GUI-configured), <strong>Pipeline</strong> (Jenkinsfile), <strong>Multibranch Pipeline</strong>, <strong>Folder</strong> (organisation)</li>
        <li>Each job has a build history, console output, and artefact storage</li>
      </ul>
    `,
  },

  // ── Pipeline as Code ──────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Pipeline as Code — The Jenkinsfile',
    content: `
      <p>
        A <strong>Jenkinsfile</strong> is a text file (checked into your repository) that defines
        the entire CI/CD pipeline in Groovy. This is "Pipeline as Code" — the pipeline definition
        lives alongside the application code it builds.
      </p>

      <h4>Two Styles</h4>
      <ul>
        <li><strong>Declarative</strong> (recommended) — structured, opinionated, easier to read.
          Starts with <code>pipeline { }</code> and uses <code>stages { stage('Name') { steps { } } }</code>.</li>
        <li><strong>Scripted</strong> — full Groovy power, more flexible but higher ceremony.
          Starts with <code>node { }</code>.</li>
      </ul>

      <h4>Key Directives (Declarative)</h4>
      <ul>
        <li><code>agent</code> — where the pipeline or stage runs (<code>any</code>, <code>none</code>, a label, or a Docker image)</li>
        <li><code>stages</code> — the top-level wrapper for <code>stage</code> blocks</li>
        <li><code>steps</code> — the actual work: shell commands, Docker commands, checkout, etc.</li>
        <li><code>environment</code> — variables available to all steps</li>
        <li><code>post</code> — actions that run after the pipeline completes (success, failure, always)</li>
        <li><code>parameters</code> — user-supplied values at build time</li>
        <li><code>triggers</code> — cron schedules, poll SCM, upstream builds</li>
      </ul>
    `,
  },

  // ── Requirements ──────────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Requirements & Installation Options',
    content: `
      <h4>Requirements</h4>
      <ul>
        <li><strong>Java 8 or 11</strong> (OpenJDK recommended; Java 17+ supported from Jenkins 2.357+)</li>
        <li>Linux, macOS, or Windows</li>
        <li>~1 GB RAM minimum for the master (2+ GB for production workloads)</li>
        <li>Port 8080 (web UI) and a random high port for agent communication (JNLP)</li>
      </ul>

      <h4>Installation Methods</h4>
      <ul>
        <li><strong>Native package</strong> — <code>apt</code> (Debian/Ubuntu), <code>yum</code> (RHEL/CentOS), <code>brew</code> (macOS), MSI (Windows)</li>
        <li><strong>Generic .war file</strong> — <code>java -jar jenkins.war</code> — runs anywhere Java runs</li>
        <li><strong>Docker container</strong> — <code>docker run -p 8080:8080 jenkins/jenkins:lts</code></li>
        <li><strong>Kubernetes</strong> — Helm chart or the Jenkins Operator</li>
      </ul>

      <p>
        This module focuses on the <strong>native package installation on CentOS</strong> —
        consistent with the Vagrant environments used throughout the DOB course.
      </p>
    `,
  },

  {
    type: 'note',
    variant: 'info',
    content: `
      <strong>Jenkins version terminology.</strong> Jenkins ships two release lines:
      <strong>Weekly</strong> (latest features, more frequent updates) and <strong>LTS</strong>
      (Long-Term Support — stable, updated every 12 weeks). For production, always choose LTS.
      The practice exercises use the current stable release available from the official repository.
    `,
  },

  // ── Where this module set goes next ───────────────────────────────────────

  {
    type: 'prose',
    title: 'Roadmap for This Module',
    content: `
      <p>
        This module walks through the full Jenkins lifecycle, building toward a realistic
        CI/CD pipeline for .NET and Node.js applications backed by PostgreSQL:
      </p>
      <ol>
        <li><strong>Setup</strong> — install the master, configure security, create users, install plugins</li>
        <li><strong>Jobs</strong> — create freestyle jobs, local and remote builds, schedules, GitHub integration</li>
        <li><strong>Slaves</strong> — add agent nodes, label them, distribute builds across environments</li>
        <li><strong>Docker</strong> — install Docker on agents, build and run containers as build steps</li>
        <li><strong>Pipelines</strong> — define multi-stage pipelines in a Jenkinsfile, chain master/slave jobs</li>
        <li><strong>Capstone</strong> — a full pipeline: checkout → restore → build → test → containerise → deploy,
          with .NET and Node.js variants and a PostgreSQL integration test stage</li>
      </ol>
      <p>
        By the end, you'll have the automation foundation that every modern development team
        relies on — the CI/CD engine that turns code commits into deployed, tested artefacts.
      </p>
    `,
  },

];
