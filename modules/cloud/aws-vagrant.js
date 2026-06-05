// modules/cloud/aws-vagrant.js
// Cloud: Vagrant + AWS — Infrastructure as Code for the Cloud
// Extracted from DOB-M7 Practice (Practice-M7-AWS.md, Part 2 — Vagrant section)
// Reframed: .NET / Node.js provisioning, PostgreSQL, security best practices

window.commandData = [

  // ── Section 1: Vagrant AWS plugin ─────────────────────────────────────────

  {
    id: 301, section: "plugin", sectionTitle: "Vagrant AWS Plugin",
    commandTitle: "Install the Vagrant AWS plugin",
    command: "vagrant plugin install vagrant-aws",
    searchTerms: "vagrant aws plugin install ec2 provider cloud",
    description: "The <code>vagrant-aws</code> plugin adds AWS as a Vagrant provider — just like VirtualBox or VMware, but instead of creating local VMs, it provisions EC2 instances. Install it once globally; all Vagrant AWS projects use it.",
    parts: [
      { text: "vagrant plugin install vagrant-aws", explanation: "download and install the plugin from RubyGems" },
      { text: "vagrant plugin list", explanation: "verify installation — should show vagrant-aws in the list" },
    ],
    example: "Installing the 'vagrant-aws' plugin...\nInstalled plugin 'vagrant-aws (0.8.0)'\n$ vagrant plugin list\nvagrant-aws (0.8.0)",
    why: "The AWS plugin bridges the gap between local Vagrant workflows and cloud provisioning. The same Vagrantfile syntax you know from VirtualBox now targets AWS — just swap the provider configuration."
  },
  {
    id: 302, section: "plugin", sectionTitle: "Vagrant AWS Plugin",
    commandTitle: "Add the Vagrant AWS dummy box",
    command: "vagrant box add aws-box https://github.com/mitchellh/vagrant-aws/raw/master/dummy.box",
    searchTerms: "vagrant aws dummy box add mitchellh",
    description: "Vagrant requires a 'box' for every provider. For AWS, there's no actual VM image to download — the plugin creates EC2 instances from AMIs. The <strong>dummy box</strong> is a placeholder that satisfies Vagrant's box requirement without downloading anything.",
    parts: [
      { text: "vagrant box add aws-box", explanation: "register a box named 'aws-box' — you'll reference this in the Vagrantfile" },
      { text: "dummy.box", explanation: "a minimal metadata-only box — no OS image, just enough to satisfy Vagrant" },
    ],
    example: "==> box: Adding box 'aws-box' (v0)...\n==> box: Successfully added box 'aws-box' (v0)!",
    why: "The dummy box is a convention, not a real box. The actual OS comes from the AMI you specify in the Vagrantfile. The dummy box just tells Vagrant 'use the AWS provider for this VM.'"
  },

  // ── Section 2: Vagrantfile for AWS ────────────────────────────────────────

  {
    id: 310, section: "vagrantfile", sectionTitle: "AWS Vagrantfile",
    commandTitle: "Create a Vagrantfile for AWS EC2 provisioning",
    command: "cat Vagrantfile",
    searchTerms: "vagrant aws vagrantfile ec2 provider access key ami instance type security group",
    description: "Create a Vagrantfile that uses the AWS provider. Key fields: <code>aws.access_key_id</code> and <code>aws.secret_access_key</code> (your IAM user credentials), <code>aws.ami</code> (the AMI ID for CentOS 7), <code>aws.instance_type</code> (t2.micro), <code>aws.keypair_name</code> (your EC2 key pair), and <code>aws.user_data</code> (a bootstrap script).",
    parts: [
      { text: "require 'vagrant-aws'", explanation: "load the AWS provider plugin" },
      { text: "config.vm.box = 'aws-box'", explanation: "use the dummy box — tells Vagrant to use the AWS provider" },
      { text: "aws.access_key_id / aws.secret_access_key", explanation: "IAM credentials — use env vars in production, never commit these" },
      { text: "aws.ami = 'ami-xxx'", explanation: "the CentOS 7 AMI ID for your region — find via describe-images" },
      { text: "aws.user_data = File.read('bootstrap.sh')", explanation: "run a local bootstrap script on first boot" },
      { text: "override.ssh.private_key_path", explanation: "path to your .pem key file for SSH access" },
    ],
    example: `require 'vagrant-aws'

Vagrant.configure("2") do |config|
  config.vm.box = "aws-box"

  config.vm.provider 'aws' do |aws, override|
    # ⚠️  Use environment variables, never hardcode credentials in files
    aws.access_key_id     = ENV['AWS_ACCESS_KEY_ID']
    aws.secret_access_key = ENV['AWS_SECRET_ACCESS_KEY']

    aws.keypair_name = "my-key"
    aws.region       = "eu-central-1"
    aws.ami          = "ami-c86c3f23"      # CentOS 7 in eu-central-1
    aws.instance_type = "t2.micro"

    # Bootstrap — install .NET 8 and deploy a Web API
    aws.user_data = File.read("bootstrap.sh")

    override.ssh.username         = "centos"
    override.ssh.private_key_path = "~/.ssh/my-key.pem"

    aws.tags = {
      'Name' => 'DOB-AWS-Demo',
      'Env'  => 'practice'
    }
  end
end`,
    why: "This Vagrantfile is the cloud equivalent of the local Vagrantfiles from Modules 1-5. Same syntax, same workflow (vagrant up/destroy/ssh), different target (EC2 instead of VirtualBox). Infrastructure as code scales from your laptop to the cloud. ⚠️ Never hardcode credentials — the example uses <code>ENV['AWS_ACCESS_KEY_ID']</code>. Hardcoding keys means committing them to git, and AWS scans public repos for exposed credentials. Use environment variables, IAM roles, or <code>~/.aws/credentials</code>."
  },

  // ── Section 3: Bootstrap script ───────────────────────────────────────────

  {
    id: 320, section: "bootstrap", sectionTitle: "Bootstrap Script",
    commandTitle: "Write a bootstrap script for .NET/Node.js provisioning",
    command: "cat bootstrap.sh",
    searchTerms: "aws ec2 user data bootstrap script dotnet nodejs provision automated",
    description: "Create a bootstrap script that installs the runtime (.NET SDK or Node.js), clones or creates an application, and starts it. This runs as the <code>user_data</code> on first boot — when <code>vagrant up</code> completes, the app is already running.",
    parts: [
      { text: "yum install dotnet-sdk-8.0 / nodejs", explanation: "install the language runtime" },
      { text: "dotnet new webapi / npx express-generator", explanation: "scaffold a minimal app" },
      { text: "nohup dotnet run & / nohup npm start &", explanation: "start the app in the background" },
    ],
    example: `#!/bin/bash
# Bootstrap — .NET 8 Web API on CentOS 7
set -e
exec > /var/log/bootstrap.log 2>&1   # log everything for debugging

yum update -y
yum install -y dotnet-sdk-8.0

mkdir -p /app && cd /app
dotnet new webapi -n MyApi --no-https
cd MyApi
# Add a /health endpoint that also checks PostgreSQL connectivity
cat > Program.cs << 'DOTNET'
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
app.MapGet("/health", async () => {
    try {
        using var conn = new NpgsqlConnection(builder.Configuration
            .GetConnectionString("Default"));
        await conn.OpenAsync();
        return Results.Ok(new { status = "healthy", db = "connected" });
    } catch {
        return Results.Ok(new { status = "degraded", db = "unreachable" });
    }
});
app.Run();
DOTNET

nohup dotnet run --urls http://0.0.0.0:80 > /var/log/app.log 2>&1 &
echo "Bootstrap complete — .NET API running on port 80"`,
    why: "A good bootstrap script is idempotent (safe to re-run) and logs everything. The <code>exec > /var/log/bootstrap.log 2>&1</code> pattern captures all output — essential for debugging when user data fails silently."
  },

  // ── Section 4: Vagrant lifecycle with AWS ─────────────────────────────────

  {
    id: 330, section: "lifecycle", sectionTitle: "Vagrant Lifecycle on AWS",
    commandTitle: "vagrant up — provision an EC2 instance",
    command: "vagrant up --provider=aws",
    searchTerms: "vagrant up aws ec2 provision create instance",
    description: "Run <code>vagrant up --provider=aws</code> to create the EC2 instance. Vagrant handles: creating the instance, waiting for it to be ready, running user data, and SSH key setup. The process takes 60-90 seconds (mostly waiting for AWS to provision the VM).",
    parts: [
      { text: "vagrant up --provider=aws", explanation: "explicitly use the AWS provider — required the first time" },
    ],
    example: "Bringing machine 'default' up with 'aws' provider...\n==> default: Launching an EC2 instance...\n==> default: Waiting for instance to become 'ready'...\n==> default: Instance i-0abc123def456 is ready\n==> default: Machine booted and ready!\n$ vagrant ssh\n[centos@ip-172-31-42-17 ~]$",
    why: "<code>vagrant up</code> on AWS feels identical to local Vagrant — same commands, different provider. This is the power of the Vagrant abstraction: your workflow doesn't change when your infrastructure moves from VirtualBox to the cloud."
  },
  {
    id: 331, section: "lifecycle", sectionTitle: "Vagrant Lifecycle on AWS",
    commandTitle: "vagrant destroy — terminate the EC2 instance",
    command: "vagrant destroy -f",
    searchTerms: "vagrant destroy terminate aws ec2 instance cleanup",
    description: "<code>vagrant destroy</code> terminates the EC2 instance and cleans up associated resources. Always run this when you're done — it's the cloud equivalent of <code>vagrant destroy</code> locally, with the added benefit of stopping AWS charges.",
    parts: [
      { text: "vagrant destroy -f", explanation: "force-terminate without confirmation prompt" },
    ],
    example: "==> default: Terminating the instance i-0abc123def456...\n==> default: Instance terminated. All resources cleaned up.",
    why: "One command to destroy everything. No clicking through the AWS console, no forgotten instances. <code>vagrant destroy</code> is your cleanup safety net — make it a reflex."
  },

];
