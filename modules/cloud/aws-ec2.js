// modules/cloud/aws-ec2.js
// Cloud: AWS EC2 — Virtual Machines in the Cloud
// Extracted from DOB-M7 Practice (Practice-M7-AWS.md, Part 1)
// Reframed: .NET / Node.js deployments, PostgreSQL, cost-aware

window.commandData = [

  // ── Section 1: AWS account ────────────────────────────────────────────────

  {
    id: 101, section: "account", sectionTitle: "AWS Account Setup",
    commandTitle: "Create an AWS Free Tier account",
    command: "# Open https://aws.amazon.com/free/ → Create a Free Account",
    searchTerms: "aws free tier account create sign up credit card",
    description: "Create an AWS account. You'll need: a valid email address, a phone number (AWS calls you with a verification PIN), and a credit/debit card (for identity verification — you won't be charged if you stay within Free Tier limits). Choose the <strong>Basic (Free)</strong> support plan.",
    parts: [
      { text: "Email + password", explanation: "standard account credentials — use a strong, unique password" },
      { text: "Phone verification", explanation: "AWS calls with a 4-digit PIN you enter on-screen — proves you're a real person" },
      { text: "Credit card", explanation: "required even for free tier — used for identity verification; charges only apply if you exceed free tier limits" },
      { text: "Basic Support Plan", explanation: "free tier — includes account and billing support only, no technical support" },
    ],
    example: "Account created → Sign In to the Console → AWS Management Console dashboard visible",
    why: "The free tier gives you 750 hours/month of t2.micro EC2 for 12 months — enough to run one VM 24/7 for a year at no cost. Set a billing alert immediately after creating the account."
  },
  {
    id: 102, section: "account", sectionTitle: "AWS Account Setup",
    commandTitle: "Set a billing alert to avoid surprise charges",
    command: "# AWS Console → Billing → Budgets → Create budget → Cost budget → $1/month threshold",
    searchTerms: "aws billing alert budget cost free tier monitor",
    description: "Set a monthly cost budget of $1 with an email alert. This is your safety net — if you accidentally leave an instance running or provision something outside the free tier, you'll know within hours, not at the end of the month.",
    parts: [
      { text: "Cost budget: $1/month", explanation: "triggers an alert at 85% and 100% of $1 — early warning before free tier exhaustion" },
      { text: "Email alert", explanation: "AWS sends an email when the threshold is crossed" },
    ],
    example: "Budget 'Free Tier Guard' created — alert at $0.85 and $1.00",
    why: "A forgotten EC2 instance costs ~$8.70/month. A billing alert at $1 catches this on day 3, not day 30. Set this up before launching anything."
  },

  // ── Section 2: First EC2 instance (Web Console) ──────────────────────────

  {
    id: 110, section: "ec2-console", sectionTitle: "EC2 — Web Console",
    commandTitle: "Launch a CentOS EC2 instance via the web console",
    command: "# AWS Console → EC2 → Launch Instance → Choose AMI: CentOS 7 → t2.micro → Configure Security Group → Launch",
    searchTerms: "aws ec2 launch instance centos t2.micro security group key pair web console",
    description: "Launch your first EC2 instance using the web console wizard. Key decisions: (1) <strong>AMI</strong> — choose CentOS 7 (consistent with DOB VMs) or Amazon Linux 2 (AWS-optimised). (2) <strong>Instance type</strong> — <code>t2.micro</code> (1 vCPU, 1 GB RAM, free tier eligible). (3) <strong>Key pair</strong> — create a new one, download the .pem file immediately (you can't retrieve it later). (4) <strong>Security group</strong> — allow SSH (port 22) from your IP, and HTTP (port 80) from anywhere.",
    parts: [
      { text: "AMI: CentOS 7", explanation: "familiar OS from the Vagrant modules — same yum commands, same paths" },
      { text: "t2.micro", explanation: "free tier eligible — 1 vCPU, 1 GB RAM, burstable performance" },
      { text: "Key pair (.pem)", explanation: "download and chmod 400 immediately — lost keys cannot be recovered" },
      { text: "Security group: SSH + HTTP", explanation: "allow your IP on port 22, 0.0.0.0/0 on port 80 (public HTTP)" },
    ],
    example: "Instance 'i-0abc123def456' launching...\nState: running ✓\nPublic IP: 18.195.167.26\n→ SSH: ssh -i my-key.pem centos@18.195.167.26",
    why: "This is your 'vagrant up' moment for the cloud. One wizard, one minute, and you have a running Linux VM in a German data center — reachable from anywhere."
  },
  {
    id: 111, section: "ec2-console", sectionTitle: "EC2 — Web Console",
    commandTitle: "SSH into the EC2 instance",
    command: "chmod 400 my-key.pem && ssh -i my-key.pem centos@18.195.167.26",
    searchTerms: "ssh ec2 key pair pem centos connect login",
    description: "Connect to your EC2 instance via SSH. The username depends on the AMI: <code>centos</code> for CentOS, <code>ec2-user</code> for Amazon Linux/RHEL, <code>ubuntu</code> for Ubuntu. The private key must have 400 permissions — SSH rejects keys that are world-readable.",
    parts: [
      { text: "chmod 400 my-key.pem", explanation: "restrict key file permissions — SSH requires it" },
      { text: "ssh -i my-key.pem centos@<public-ip>", explanation: "use the key file to authenticate as the centos user" },
    ],
    example: "[centos@ip-172-31-42-17 ~]$",
    why: "SSH key pairs replace passwords in AWS — more secure, and you can revoke a key from the AWS console without touching the instance. Never share your .pem file."
  },
  {
    id: 112, section: "ec2-console", sectionTitle: "EC2 — Web Console",
    commandTitle: "Install and start a .NET web server on the instance",
    command: "sudo yum install -y dotnet-sdk-8.0 && dotnet new webapi -n HelloAws && cd HelloAws && nohup dotnet run --urls http://0.0.0.0:5000 &",
    searchTerms: "dotnet install ec2 centos webapi kestrel deploy aws",
    description: "Install the .NET 8 SDK and create a minimal Web API. The <code>nohup</code> keeps the process running after you disconnect. Verify with <code>curl http://localhost:5000</code> — you should see the default weather forecast JSON. Then open the public IP in your browser on port 5000 (you'll need to add port 5000 to the security group).",
    parts: [
      { text: "dotnet new webapi", explanation: "scaffold a .NET 8 Minimal API with /weatherforecast endpoint" },
      { text: "nohup dotnet run --urls http://0.0.0.0:5000 &", explanation: "run Kestrel on port 5000, survive SSH disconnect" },
      { text: "Security group: add port 5000", explanation: "AWS Console → EC2 → Security Groups → Edit inbound rules → Add TCP/5000" },
    ],
    example: "Building...\ninfo: Microsoft.Hosting.Lifetime[14]\n      Now listening on: http://0.0.0.0:5000\n$ curl http://localhost:5000/weatherforecast\n[{\"date\":\"2024-06-05\",\"temperatureC\":25,...}]",
    why: "This proves you can deploy a .NET app to the cloud in under 5 minutes. The same pattern works for Node.js: install Node, create an Express app, run it."
  },

  // ── Section 3: User data (bootstrapping) ──────────────────────────────────

  {
    id: 120, section: "user-data", sectionTitle: "User Data Bootstrap",
    commandTitle: "Launch an EC2 instance with a user data bootstrap script",
    command: "# In the Launch Instance wizard → Advanced Details → User Data (text):",
    searchTerms: "aws ec2 user data bootstrap script dotnet nodejs automated provision",
    description: "User data is a shell script that runs on first boot (as root). Use it to automate instance setup — install packages, clone repos, start services. This is the cloud equivalent of Vagrant shell provisioners. Example: install .NET 8, create an API, and start it — all before you first SSH in.",
    parts: [
      { text: "#!/bin/bash", explanation: "standard shebang — user data runs as a bash script" },
      { text: "yum install dotnet-sdk-8.0", explanation: "install .NET — replace with nodejs/npm for Node.js" },
      { text: "nohup dotnet run &", explanation: "start the app in the background" },
    ],
    example: `#!/bin/bash
# User data bootstrap — .NET 8 Web API on CentOS 7
yum update -y
yum install -y dotnet-sdk-8.0
mkdir -p /app && cd /app
dotnet new webapi -n MyApi --no-https
cd MyApi
sed -i 's/localhost/0.0.0.0/' Properties/launchSettings.json
nohup dotnet run --urls http://0.0.0.0:80 > /var/log/app.log 2>&1 &

# For Node.js instead:
# curl -sL https://rpm.nodesource.com/setup_20.x | bash -
# yum install -y nodejs
# npx express-generator /app && cd /app && npm install
# nohup npm start > /var/log/app.log 2>&1 &`,
    why: "User data makes instances self-configuring. Launch → wait 60 seconds → the app is running. Combine with Auto Scaling Groups and you have infrastructure that provisions itself without human intervention."
  },
  {
    id: 121, section: "user-data", sectionTitle: "User Data Bootstrap",
    commandTitle: "Verify the user data script executed",
    command: "sudo cat /var/log/cloud-init-output.log",
    searchTerms: "ec2 user data cloud init log verify bootstrap output",
    description: "User data runs via <code>cloud-init</code>. Check <code>/var/log/cloud-init-output.log</code> for the full execution log — this is your debugging tool when bootstrap scripts fail silently. Look for the last line: 'cloud-init finished' on success.",
    parts: [
      { text: "/var/log/cloud-init-output.log", explanation: "the complete stdout/stderr of your user data script" },
    ],
    example: "Cloud-init v. 19.4 running 'modules:final' at Wed, 05 Jun 2024 12:00:00 +0000. Up 42.03 seconds.\nLoaded plugins: fastestmirror\nInstalled: dotnet-sdk-8.0.x86_64\n...\ncloud-init modules:final finished. No errors reported.",
    why: "If the app isn't running after launch, this log tells you exactly what went wrong — package not found, script syntax error, port conflict. It's your first debugging stop."
  },

  // ── Section 4: Security groups & networking ───────────────────────────────

  {
    id: 130, section: "security", sectionTitle: "Security Groups & Networking",
    commandTitle: "Configure security groups for a .NET/Node.js app + PostgreSQL",
    command: "# EC2 → Security Groups → Edit inbound rules → Add:\n# TCP/5000 (.NET) or TCP/3000 (Node.js) from 0.0.0.0/0\n# TCP/5432 (PostgreSQL) from <app-security-group-id>",
    searchTerms: "aws security group inbound rules http ssh postgresql dotnet nodejs port",
    description: "Security groups are stateful firewalls. Add rules for: SSH (22, from your IP only — never 0.0.0.0/0), HTTP (80), the app port (5000 for .NET or 3000 for Node.js), and PostgreSQL (5432, from the app's security group, not from the world). Security groups can reference other security groups as sources — this lets DB instances accept traffic only from app instances.",
    parts: [
      { text: "SSH: 22 from <your-IP>/32", explanation: "never open SSH to the world — restrict to your IP" },
      { text: "HTTP: 80 from 0.0.0.0/0", explanation: "public web traffic — open to everyone" },
      { text: "App port: 5000/3000 from 0.0.0.0/0", explanation: "if your app runs on a non-standard port, open it" },
      { text: "PostgreSQL: 5432 from sg-<app>", explanation: "reference the app's security group, not an IP — DB access only from your app instances" },
    ],
    example: "Inbound rules:\n  SSH    TCP/22   203.0.113.42/32 ✓\n  HTTP   TCP/80   0.0.0.0/0      ✓\n  .NET   TCP/5000 0.0.0.0/0      ✓\n  PG     TCP/5432 sg-0abc123def   ✓",
    why: "Security groups are your first and most important line of defense. A misconfigured security group is the #1 cause of 'my app is running but I can't reach it' — always check security groups before debugging the application."
  },

  // ── Section 5: Cleanup ───────────────────────────────────────────────────

  {
    id: 140, section: "cleanup", sectionTitle: "Cleanup — Always Terminate",
    commandTitle: "Terminate EC2 instances when done",
    command: "# EC2 → Instances → Select instance → Instance State → Terminate",
    searchTerms: "aws ec2 terminate instance cleanup stop delete free tier cost",
    description: "<strong>Always terminate instances when you're done.</strong> Stopped instances don't incur compute charges, but they still consume EBS storage (~$0.10/GB/month). Terminated instances delete the root volume and stop all charges. Make this a habit: finish exercise → terminate.",
    parts: [
      { text: "Stop", explanation: "pauses the instance — no compute charges, but EBS storage still billed" },
      { text: "Terminate", explanation: "permanently deletes the instance and (by default) its root EBS volume — all charges stop" },
    ],
    example: "Instance i-0abc123def456 — Terminated\nEBS volume vol-0xyz789 — Deleted\nNo further charges for this instance.",
    why: "A stopped t2.micro with a 30 GB EBS volume costs ~$3/month in storage. Terminated costs nothing. The 10 seconds it takes to terminate is the cheapest DevOps habit you'll ever form."
  },

];
