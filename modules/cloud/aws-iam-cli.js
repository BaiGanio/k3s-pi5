// modules/cloud/aws-iam-cli.js
// Cloud: AWS IAM & CLI — Identity Management & Command-Line Tools
// Extracted from DOB-M7 Practice (Practice-M7-AWS.md, Part 2)
// Reframed: .NET / Node.js context, PostgreSQL, programmatic access patterns

window.commandData = [

  // ── Section 1: IAM — never use the root account ───────────────────────────

  {
    id: 201, section: "iam", sectionTitle: "IAM Users & Groups",
    commandTitle: "Create an IAM admin user (never use root day-to-day)",
    command: "# IAM → Users → Add user → User name: aws-admin → Access type: Programmatic + Console → Set password → Attach AdministratorAccess policy",
    searchTerms: "aws iam create user admin administrator access policy root account security",
    description: "Create a dedicated IAM admin user for daily work. <strong>Never use the root account for anything except billing.</strong> Give the user both programmatic access (for CLI/SDK) and console access (for web UI). Attach the <code>AdministratorAccess</code> managed policy — this is the 'full access' equivalent of root, but revocable and auditable.",
    parts: [
      { text: "Programmatic access", explanation: "generates an Access Key ID + Secret Access Key for CLI/SDK use" },
      { text: "AWS Management Console access", explanation: "creates a password for web console login" },
      { text: "AdministratorAccess policy", explanation: "full access to all AWS services — equivalent to root but without the irreversible privileges" },
    ],
    example: "User 'aws-admin' created\nAccess Key ID: AKIA...\nSecret Access Key: (shown once — download CSV immediately!)\nConsole login: https://your-account.signin.aws.amazon.com/console",
    why: "The root account can't be restricted by IAM policies. If root credentials leak, the attacker owns your account permanently. IAM users can be deleted, keys rotated, and permissions scoped. This is AWS security rule #1."
  },
  {
    id: 202, section: "iam", sectionTitle: "IAM Users & Groups",
    commandTitle: "Create an IAM group with EC2 full access",
    command: "# IAM → Groups → Create New Group → group-admins → Attach Policy: AmazonEC2FullAccess → Add user aws-admin",
    searchTerms: "aws iam group create attach policy ec2 full access admin",
    description: "Groups are the IAM way to manage permissions at scale. Create a <code>group-admins</code> group, attach the <code>AmazonEC2FullAccess</code> policy, and add your admin user. Now any user added to this group automatically gets EC2 admin rights — no per-user policy management.",
    parts: [
      { text: "group-admins", explanation: "a logical group — name it by role (admins, developers, auditors), not by individual" },
      { text: "AmazonEC2FullAccess", explanation: "AWS managed policy — allows all EC2 actions (launch, terminate, describe, modify)" },
    ],
    example: "Group 'group-admins' created\nPolicy 'AmazonEC2FullAccess' attached\nUser 'aws-admin' added to group",
    why: "Groups are the DRY principle applied to IAM. Attach policies to groups, add users to groups. When a developer changes teams, move them to a different group — their permissions change instantly with no per-user edits."
  },

  // ── Section 2: AWS CLI ────────────────────────────────────────────────────

  {
    id: 210, section: "cli-install", sectionTitle: "AWS CLI Setup",
    commandTitle: "Install the AWS CLI",
    command: "sudo yum install -y awscli",
    searchTerms: "aws cli install yum centos command line interface",
    description: "Install the AWS CLI. On CentOS/RHEL, it's available from the base repository. Verify: <code>aws --version</code>. For other platforms: <code>pip install awscli</code> (Python), <code>brew install awscli</code> (macOS), or the MSI installer (Windows).",
    parts: [
      { text: "yum install awscli", explanation: "install from CentOS base repository — version may be older but is stable" },
      { text: "aws --version", explanation: "verify installation — shows CLI version, Python version, and platform" },
    ],
    example: "aws-cli/1.18.147 Python/2.7.18 Linux/3.10.0 botocore/1.18.6",
    why: "The CLI is the primary interface for automation. Everything you can do in the web console, you can do from the CLI — and CLI commands are scriptable, repeatable, and version-controllable."
  },
  {
    id: 211, section: "cli-install", sectionTitle: "AWS CLI Setup",
    commandTitle: "Configure the AWS CLI with your IAM user credentials",
    command: "aws configure",
    searchTerms: "aws configure access key secret region output format",
    description: "Run <code>aws configure</code> and enter: your IAM user's Access Key ID, Secret Access Key, default region (e.g. <code>eu-central-1</code>), and output format (<code>json</code>, <code>text</code>, or <code>table</code>). Credentials are stored in <code>~/.aws/credentials</code> — never commit this file to git.",
    parts: [
      { text: "Access Key ID", explanation: "from the IAM user creation step — looks like AKIAIOSFODNN7EXAMPLE" },
      { text: "Secret Access Key", explanation: "shown once when the user is created — store it in a password manager" },
      { text: "Default region: eu-central-1", explanation: "Frankfurt — closest to Europe; change to us-east-1 for N. Virginia" },
      { text: "Output format: json", explanation: "machine-readable — use 'table' for human-readable or 'text' for grep-friendly" },
    ],
    example: "AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE\nAWS Secret Access Key [None]: ****************************************\nDefault region name [None]: eu-central-1\nDefault output format [None]: json",
    why: "The <code>~/.aws/credentials</code> file is plaintext. Add it to <code>.gitignore</code>. Use IAM roles instead of long-lived access keys on EC2 instances — roles automatically rotate credentials every few hours."
  },

  // ── Section 3: CLI-based EC2 management ───────────────────────────────────

  {
    id: 220, section: "cli-ec2", sectionTitle: "CLI EC2 Management",
    commandTitle: "Find available AMIs via the CLI",
    command: "aws ec2 describe-images --filters 'Name=name,Values=RHEL-7*' --output table --query 'Images[*].{ID:ImageId,Name:Name}'",
    searchTerms: "aws ec2 describe-images ami filter centos rhel query output",
    description: "List available AMIs (Amazon Machine Images) matching a filter. The <code>--query</code> parameter uses JMESPath syntax to select and format fields — much cleaner than grepping raw JSON. Find the CentOS 7 AMI ID, then use it in <code>run-instances</code>.",
    parts: [
      { text: "--filters 'Name=name,Values=CentOS*'", explanation: "search for AMIs whose name starts with 'CentOS'" },
      { text: "--query 'Images[*].{ID:ImageId,Name:Name}'", explanation: "JMESPath — extract only ImageId and Name from the full response" },
      { text: "--output table", explanation: "format as a readable table instead of JSON" },
    ],
    example: "------------------------------------\n|          DescribeImages           |\n+------------+---------------------+\n|     ID     |        Name         |\n+------------+---------------------+\n| ami-c86... | CentOS 7 (x86_64)   |\n+------------+---------------------+",
    why: "<code>--query</code> is the CLI's superpower — it filters server-side and returns only what you need. Master JMESPath and you'll never pipe AWS CLI output through grep again."
  },
  {
    id: 221, section: "cli-ec2", sectionTitle: "CLI EC2 Management",
    commandTitle: "Launch an EC2 instance from the CLI",
    command: "aws ec2 run-instances --image-id ami-c86c3f23 --count 1 --instance-type t2.micro --key-name my-key --security-group-ids sg-xxx --subnet-id subnet-xxx --user-data file://bootstrap.sh",
    searchTerms: "aws ec2 run-instances cli launch ami key pair security group subnet user data",
    description: "Launch an EC2 instance entirely from the command line — no web console needed. This is the foundation for scripting and automation. The instance ID, public IP, and other details are returned as JSON.",
    parts: [
      { text: "--image-id ami-c86c3f23", explanation: "the AMI ID from describe-images — use the latest CentOS 7 AMI" },
      { text: "--instance-type t2.micro", explanation: "free tier eligible" },
      { text: "--key-name my-key", explanation: "the key pair name from the EC2 console (not the file path)" },
      { text: "--user-data file://bootstrap.sh", explanation: "path to a local bootstrap script — AWS reads and executes it on first boot" },
    ],
    example: "{\n  \"Instances\": [{\n    \"InstanceId\": \"i-0abc123def456\",\n    \"InstanceType\": \"t2.micro\",\n    \"State\": { \"Name\": \"pending\" },\n    \"PublicIpAddress\": \"18.195.167.26\"\n  }]\n}",
    why: "CLI-based launching is scriptable. Wrap this in a bash script with your key, security group, subnet, and bootstrap file — and you have 'vagrant up' for AWS. One command, a running instance."
  },
  {
    id: 222, section: "cli-ec2", sectionTitle: "CLI EC2 Management",
    commandTitle: "Get the public IP and SSH in",
    command: "aws ec2 describe-instances --instance-ids i-xxx --query 'Reservations[*].Instances[*].PublicIpAddress' --output text",
    searchTerms: "aws ec2 describe-instances public ip ssh connect query",
    description: "Extract the public IP address of a running instance. Chain this into an SSH command: <code>ssh -i my-key.pem centos@$(aws ec2 describe-instances ... --output text)</code>. This is the CLI-native way to connect without opening the web console.",
    parts: [
      { text: "--query '...PublicIpAddress'", explanation: "JMESPath to extract just the IP" },
      { text: "--output text", explanation: "returns the raw IP string — no quotes, no JSON wrapper" },
    ],
    example: "18.195.167.26\n$ ssh -i my-key.pem centos@18.195.167.26\n[centos@ip-172-31-42-17 ~]$",
    why: "When you manage dozens of instances, you don't want to click through the console for each IP. A one-liner that resolves the instance name to its IP and SSHs in is worth memorising."
  },
  {
    id: 223, section: "cli-ec2", sectionTitle: "CLI EC2 Management",
    commandTitle: "Stop and terminate instances from the CLI",
    command: "aws ec2 terminate-instances --instance-ids i-xxx",
    searchTerms: "aws ec2 terminate stop instance cli cleanup",
    description: "Terminate an instance from the CLI. <code>stop-instances</code> pauses it (EBS storage still billed); <code>terminate-instances</code> deletes it permanently (all charges stop). Always terminate when done.",
    parts: [
      { text: "stop-instances", explanation: "pauses — instance can be restarted; EBS volumes persist" },
      { text: "terminate-instances", explanation: "permanently deletes — root EBS volume destroyed; all charges stop" },
    ],
    example: "{\n  \"TerminatingInstances\": [{\n    \"InstanceId\": \"i-0abc123def456\",\n    \"CurrentState\": { \"Name\": \"shutting-down\" }\n  }]\n}",
    why: "A CLI terminate is faster than clicking through the console. Add it to your workflow: finish a session → run the terminate command. Automation makes cleanup a habit."
  },

];
