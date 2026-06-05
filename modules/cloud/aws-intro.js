// modules/cloud/aws-intro.js
// Cloud: Introduction to AWS — Cloud Concepts & Amazon Web Services
// Extracted from DOB-M7 lecture (Slides-M7-AWS.md), framed for .NET / Node.js stacks

window.pageBlocks = [

  // ── What is Cloud? ───────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'What is "The Cloud"?',
    content: `
      <p>
        <strong>Cloud computing</strong> is the on-demand delivery of compute, storage, networking,
        and software over the internet — with pay-as-you-go pricing. Instead of buying and
        maintaining physical servers, you rent capacity from a provider like AWS, Azure, or GCP.
      </p>

      <p>The cloud is not a single thing — it's a spectrum of service models:</p>
      <ul>
        <li><strong>IaaS (Infrastructure as a Service)</strong> — virtual machines, networks, storage. You manage the OS and software; the provider manages the hardware. AWS EC2, Azure VMs, GCP Compute Engine.</li>
        <li><strong>PaaS (Platform as a Service)</strong> — managed runtimes for your code. You deploy the application; the provider manages the OS, scaling, and patching. AWS Elastic Beanstalk, Azure App Service, Heroku.</li>
        <li><strong>SaaS (Software as a Service)</strong> — ready-to-use software delivered over the web. You just log in. Google Workspace, Salesforce, GitHub.</li>
      </ul>

      <p>
        For DevOps engineers, IaaS and PaaS are the relevant layers — you're provisioning
        infrastructure and deploying applications on it.
      </p>
    `,
  },

  // ── The big three ─────────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'The Big Three: AWS, Azure, GCP',
    content: `
      <p>Three providers dominate the public cloud market:</p>
      <ul>
        <li><strong>Amazon Web Services (AWS)</strong> — the oldest and largest. Over 200 services, the most mature ecosystem. Market leader since 2006.</li>
        <li><strong>Microsoft Azure</strong> — strong enterprise integration (Active Directory, .NET, SQL Server). The natural choice for Microsoft-stack organisations.</li>
        <li><strong>Google Cloud Platform (GCP)</strong> — strengths in data/analytics, Kubernetes (GKE), and machine learning. Strong open-source alignment.</li>
      </ul>

      <p>
        <strong>For this module, we focus on AWS</strong> — but the concepts (virtual machines,
        security groups, identity management, CLI, infrastructure-as-code) translate directly to
        Azure and GCP. The provider changes; the principles don't.
      </p>

      <p>
        <strong>All three offer free tiers.</strong> AWS Free Tier: 750 hours/month of t2.micro
        EC2 for 12 months, 5GB S3 storage, and limited RDS/ECS usage. You need a credit card to
        sign up, but you won't be charged if you stay within free tier limits. Always set billing
        alerts.
      </p>
    `,
  },

  {
    type: 'note',
    variant: 'warning',
    content: `
      <strong>Cost awareness.</strong> Unlike previous modules that run entirely on your laptop,
      this module provisions real cloud resources that cost money outside the free tier. Every
      exercise includes a cleanup step — always terminate instances and delete resources when
      you're done. Set a monthly budget alert in AWS Billing ($1 recommended). A forgotten t2.micro
      running 24/7 for a month costs ~$8.70 — not catastrophic, but avoidable.
    `,
  },

  // ── AWS global infrastructure ─────────────────────────────────────────────

  {
    type: 'prose',
    title: 'AWS Global Infrastructure: Regions, Availability Zones, Edge',
    content: `
      <p>AWS operates data centers worldwide, organised into:</p>
      <ul>
        <li><strong>Regions</strong> — a geographic area with multiple, isolated data centers (e.g. eu-central-1 = Frankfurt, us-east-1 = N. Virginia). Choose the region closest to your users for lower latency.</li>
        <li><strong>Availability Zones (AZs)</strong> — one or more discrete data centers within a region, connected by low-latency links. Deploy across multiple AZs for high availability.</li>
        <li><strong>Edge Locations</strong> — CDN endpoints (CloudFront) that cache content close to end users.</li>
      </ul>

      <p>
        For the exercises in this module, use <strong>eu-central-1</strong> (Frankfurt) or
        <strong>us-east-1</strong> (N. Virginia) — these have the broadest free tier support
        and are closest to most European users.
      </p>
    `,
  },

  // ── Core AWS services ────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Core AWS Services You\'ll Use in This Module',
    content: `
      <h4>Compute</h4>
      <ul>
        <li><strong>EC2 (Elastic Compute Cloud)</strong> — virtual machines. You pick an AMI (OS image), an instance type (CPU/RAM), a key pair (SSH access), and a security group (firewall rules). This is the cloud equivalent of <code>vagrant up</code>.</li>
        <li><strong>ECS (Elastic Container Service)</strong> — managed Docker container orchestration. Define task definitions (container image + resources) and services (desired count, networking). The AWS-native alternative to Kubernetes.</li>
      </ul>

      <h4>Identity & Access</h4>
      <ul>
        <li><strong>IAM (Identity and Access Management)</strong> — users, groups, roles, and policies. Every AWS action is governed by IAM. Create a dedicated admin user (never use the root account day-to-day) and a service user for CLI/programmatic access.</li>
      </ul>

      <h4>Networking</h4>
      <ul>
        <li><strong>VPC (Virtual Private Cloud)</strong> — your isolated network in AWS. Every EC2 instance lives in a VPC subnet.</li>
        <li><strong>Security Groups</strong> — virtual firewalls attached to instances. They control inbound and outbound traffic at the instance level. Think of them as the cloud-native <code>firewall-cmd</code>.</li>
      </ul>
    `,
  },

  // ── Where this module set goes next ───────────────────────────────────────

  {
    type: 'prose',
    title: 'Roadmap for This Module',
    content: `
      <p>
        This module covers AWS from account creation to containerised deployments, building
        toward the ability to provision and monitor .NET and Node.js applications in the cloud:
      </p>
      <ol>
        <li><strong>EC2</strong> — launch virtual machines via the web console, configure security groups, use user data for bootstrapping, SSH in and deploy a .NET or Node.js app</li>
        <li><strong>IAM & CLI</strong> — create IAM users and groups, install and configure the AWS CLI, manage EC2 instances from the command line</li>
        <li><strong>Vagrant + AWS</strong> — use the Vagrant AWS plugin to provision EC2 instances declaratively — infrastructure as code, cloud edition</li>
        <li><strong>ECS (Docker on AWS)</strong> — define task definitions, launch containerised .NET/Node.js services, understand the ECS compute model</li>
        <li><strong>Capstone</strong> — replicate a multi-tier environment from previous modules (web server + database) on AWS, using Vagrant or the CLI, with PostgreSQL and Docker</li>
      </ol>
      <p>
        The cloud is the final destination for most DevOps workflows. By the end of this module,
        you'll understand how to take everything you've learned — VMs, containers, monitoring,
        CI/CD — and run it on AWS infrastructure.
      </p>
    `,
  },

];
