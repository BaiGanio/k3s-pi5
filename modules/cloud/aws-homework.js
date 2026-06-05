// modules/cloud/aws-homework.js
// Cloud: AWS — Capstone Homework
// Recast of Homework-M7-AWS.md (replicate previous modules in AWS)
// Modernised: .NET / Node.js + PostgreSQL, Vagrant + CLI, cost-aware

window.commandData = [

  // ── Section 1: The assignment ─────────────────────────────────────────────

  {
    id: 500, section: "brief", sectionTitle: "The Assignment",
    commandTitle: "Goal — replicate a multi-tier environment from previous modules on AWS",
    command: "cat README.md",
    searchTerms: "homework assignment aws ec2 multi-tier replicate vagrant cli postgresql dotnet nodejs",
    description: "Take any multi-tier environment from Modules 1-5 (e.g. the M4 WEB+DB stack or the M5 Jenkins master+slave) and deploy it on AWS instead of local VirtualBox VMs. Use the AWS CLI, the web console, or Vagrant+AWS — your choice. Every resource must be in the free tier. The deployment must include at least two EC2 instances (web/app + database), security groups, and a working connection between them.",
    parts: [
      { text: "Two EC2 instances minimum", explanation: "one for the application (.NET or Node.js), one for PostgreSQL" },
      { text: "Security groups", explanation: "SSH restricted to your IP, app port open to the world, PostgreSQL open only to the app security group" },
      { text: "Publicly accessible", explanation: "the app must be reachable from your browser via the EC2 public IP" },
      { text: "Free tier only", explanation: "t2.micro instances, 30 GB EBS or less — verify in the AWS Billing dashboard that costs are $0" },
    ],
    example: "Acceptance criteria:\n  ✓ Two EC2 instances running: web (public) + db (private access only)\n  ✓ Web app (.NET Kestrel or Node.js Express) returns a health check with DB status\n  ✓ PostgreSQL accessible from the web instance, not from the public internet\n  ✓ Security groups: SSH (your IP only), HTTP (0.0.0.0/0), PG (web security group only)\n  ✓ Cleanup: all instances terminated, no lingering EBS volumes or elastic IPs\n  ✓ AWS Billing shows $0.00 for the exercise period\n  ✓ Bonus: deployed via Vagrant+AWS (Vagrantfile + bootstrap script) instead of manual console/CLI",
    why: "This is the cloud capstone: prove you can take everything you've learned about VMs, databases, and networking and deploy it on real cloud infrastructure. The skills tested — EC2, security groups, AMIs, user data, IAM — are the same skills used in production AWS environments every day."
  },

  // ── Section 2: Approach options ───────────────────────────────────────────

  {
    id: 501, section: "brief", sectionTitle: "The Assignment",
    commandTitle: "Choose your approach: Web Console, CLI, or Vagrant",
    command: "# Option 1 (easy): Web Console wizard\n# Option 2 (intermediate): AWS CLI with run-instances\n# Option 3 (advanced): Vagrantfile + vagrant-aws plugin",
    searchTerms: "aws deployment approach console cli vagrant compare",
    description: "Three approaches, increasing in automation. <strong>Web Console:</strong> click through the Launch Instance wizard twice. <strong>AWS CLI:</strong> script two <code>aws ec2 run-instances</code> commands with user data. <strong>Vagrant+AWS:</strong> a single Vagrantfile that defines both instances as separate VM definitions — the most 'DevOps' approach and the one that best demonstrates the module's learning objectives.",
    parts: [
      { text: "Web Console", explanation: "quickest to set up, least reusable — good for learning, not for production" },
      { text: "AWS CLI", explanation: "scriptable and repeatable — wrap in a shell script for 'one-command deploy'" },
      { text: "Vagrant+AWS", explanation: "infrastructure as code — same Vagrantfile pattern from Modules 1-5, now targeting EC2" },
    ],
    example: "Vagrantfile approach (recommended):\n  config.vm.define 'web' → AMI, t2.micro, security group (HTTP+SSH), user data (install .NET/Node)\n  config.vm.define 'db'  → AMI, t2.micro, security group (SSH+PG), user data (install PostgreSQL, create user+db)",
    why: "The Vagrant approach demonstrates the highest level of DevOps maturity — infrastructure defined as code, committed to git, reproducible by any team member with an AWS account."
  },

  // ── Section 3: The web tier ───────────────────────────────────────────────

  {
    id: 510, section: "web-tier", sectionTitle: "Web Tier",
    commandTitle: "Provision the web instance — .NET or Node.js app with /health",
    command: "# Bootstrap (user data) for the web instance:",
    searchTerms: "aws ec2 web instance dotnet nodejs health endpoint bootstrap user data",
    description: "The web instance runs a .NET Kestrel or Node.js Express app with a <code>/health</code> endpoint that checks database connectivity. The health endpoint must return HTTP 200 with DB status when PostgreSQL is reachable, and HTTP 200 with 'degraded' status when it's not — so Nagios (or just curl) can tell the difference.",
    parts: [
      { text: "/health endpoint", explanation: "returns { status: 'healthy'|'degraded', db: 'connected'|'unreachable' }" },
      { text: "PostgreSQL connection", explanation: "connect to the DB instance's private IP — security group allows traffic" },
      { text: "Port 80", explanation: "run the app on port 80 so it's accessible without specifying a port in the URL" },
    ],
    example: "$ curl http://18.195.167.26/health\n{\"status\":\"healthy\",\"db\":\"connected\",\"dbHost\":\"172.31.45.67\"}\n\n$ curl http://18.195.167.26/health\n{\"status\":\"degraded\",\"db\":\"unreachable\"}",
    why: "The health endpoint proves the full stack works: EC2 → Kestrel/Express → network → PostgreSQL. It's the single endpoint that tells you whether the deployment was successful."
  },

  // ── Section 4: The database tier ──────────────────────────────────────────

  {
    id: 520, section: "db-tier", sectionTitle: "Database Tier",
    commandTitle: "Provision the PostgreSQL instance",
    command: "# Bootstrap (user data) for the DB instance:\nsudo yum install -y postgresql-server && sudo postgresql-setup initdb\nsudo systemctl start postgresql\nsudo -u postgres psql -c \"CREATE USER app_user WITH PASSWORD 'Password1';\"\nsudo -u postgres psql -c \"CREATE DATABASE appdb OWNER app_user;\"",
    searchTerms: "aws ec2 postgresql instance bootstrap user data create database user",
    description: "The database instance runs PostgreSQL. The security group must allow port 5432 only from the web instance's security group (reference the SG ID, not an IP). This is the cloud-native way to restrict database access — no IP whitelisting, no VPN, just security group references.",
    parts: [
      { text: "postgresql-server + initdb", explanation: "install and initialise PostgreSQL on CentOS 7" },
      { text: "CREATE USER app_user", explanation: "dedicated application user — separate from the postgres superuser" },
      { text: "Security group: PG from sg-<web>", explanation: "allow port 5432 only from the web instance's security group" },
    ],
    example: "DB instance running at 172.31.45.67:5432\n$ psql -h 172.31.45.67 -U app_user -d appdb\nPassword: Password1\nappdb=> SELECT 1;\n ?column?\n----------\n        1\n(1 row)",
    why: "Security group references are the cleanest AWS networking pattern. Instead of 'allow 172.31.45.66/32 on port 5432', you say 'allow the web security group on port 5432.' If the web instance's IP changes, the rule still works."
  },

  // ── Section 5: Verification & cleanup ─────────────────────────────────────

  {
    id: 590, section: "verify", sectionTitle: "Verification & Cleanup",
    commandTitle: "Verify the deployment and terminate all resources",
    command: "# 1. curl http://<web-public-ip>/health → 200 OK with db: connected\n# 2. Verify RDBMS connectivity from web: psql -h <db-private-ip> -U app_user -d appdb\n# 3. Check AWS Billing → $0.00\n# 4. Terminate both instances + delete any elastic IPs + delete unused EBS volumes",
    searchTerms: "aws verify deployment terminate cleanup billing free tier",
    description: "Verify every layer: the web app responds, the database is reachable, billing shows zero. Then <strong>terminate everything</strong> — instances, elastic IPs, unused EBS volumes. A thorough cleanup is part of the assignment.",
    parts: [
      { text: "curl /health → healthy", explanation: "the web app is running and the DB is reachable" },
      { text: "Billing → $0.00", explanation: "no unexpected charges — everything was in the free tier" },
      { text: "Terminate instances + delete volumes", explanation: "leave no resources behind — stopped instances still cost money for EBS" },
    ],
    example: "✓ Web app responds at http://18.195.167.26/health\n  → {\"status\":\"healthy\",\"db\":\"connected\"}\n✓ DB reachable from web instance: psql → connected\n✓ AWS Billing: $0.00 (usage within free tier)\n✓ Cleanup: 2 instances terminated, 2 EBS volumes deleted, 0 elastic IPs\n  → All resources destroyed. No further charges.",
    why: "Cleanup is a professional habit. Leaving resources running is the #1 cause of surprise AWS bills. The verification checklist proves both that the deployment worked AND that it was cleaned up completely."
  },

];
