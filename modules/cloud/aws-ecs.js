// modules/cloud/aws-ecs.js
// Cloud: AWS ECS — Docker Containers in the Cloud
// Extracted from DOB-M7 Practice (Practice-M7-AWS.md, Part 3 — ECS section)
// Reframed: .NET / Node.js container images, PostgreSQL, task definitions

window.commandData = [

  // ── Section 1: ECS concepts ───────────────────────────────────────────────

  {
    id: 401, section: "concepts", sectionTitle: "ECS Concepts",
    commandTitle: "What is ECS (Elastic Container Service)?",
    command: "# ECS is AWS's managed Docker orchestration service\n# Components: Task Definitions, Services, Clusters, Container Instances",
    searchTerms: "aws ecs elastic container service docker orchestration fargate ec2",
    description: "<strong>ECS (Elastic Container Service)</strong> is AWS's native container orchestration platform. It runs Docker containers across a cluster of EC2 instances (EC2 launch type) or serverlessly (Fargate launch type). Key components: <strong>Task Definition</strong> (which containers, how much CPU/RAM, which ports), <strong>Service</strong> (how many copies of a task, load balancing, auto-scaling), <strong>Cluster</strong> (the pool of compute resources).",
    parts: [
      { text: "Task Definition", explanation: "the blueprint — container image, CPU/memory, port mappings, environment variables, logging" },
      { text: "Service", explanation: "the runtime — desired task count, load balancer, deployment strategy" },
      { text: "Cluster", explanation: "the compute pool — EC2 instances or Fargate serverless capacity" },
      { text: "Fargate vs EC2", explanation: "Fargate = serverless (pay per task); EC2 = you manage the VMs (more control, cheaper at scale)" },
    ],
    example: "Task Definition 'dotnet-api:1'\n  └── Container 'api' → myorg/dotnet-api:latest, 256 CPU, 512 MB, port 80\nService 'dotnet-api-service'\n  └── 2 tasks running, ALB target group, auto-scaling 2-10\nCluster 'prod-cluster'\n  └── 3 EC2 instances (t3.medium), 6 tasks distributed across them",
    why: "ECS is AWS's answer to Kubernetes — simpler, deeply integrated with AWS services, and free (you pay only for the underlying EC2/Fargate resources). For .NET/Node.js workloads already on AWS, ECS is often the pragmatic choice over EKS (managed Kubernetes)."
  },

  // ── Section 2: Task definition ────────────────────────────────────────────

  {
    id: 410, section: "task-def", sectionTitle: "Task Definitions",
    commandTitle: "Define a task for a .NET container",
    command: "cat dotnet-task.json",
    searchTerms: "aws ecs task definition json dotnet container image port cpu memory",
    description: "A task definition is a JSON document that describes one or more containers. Define: <code>family</code> (task name+version), <code>containerDefinitions</code> (image, port, memory, environment), <code>requiresCompatibilities</code> (EC2 or FARGATE), and <code>networkMode</code> (bridge or awsvpc).",
    parts: [
      { text: "family: 'dotnet-api'", explanation: "the task family name — versions are tracked automatically (dotnet-api:1, :2, ...)" },
      { text: "image: 'myorg/dotnet-api:latest'", explanation: "Docker image — from ECR, Docker Hub, or any registry" },
      { text: "memory: 512, cpu: 256", explanation: "resource allocation — 512 MB RAM, 0.25 vCPU (Fargate minimums)" },
      { text: "portMappings: containerPort 80, hostPort 80", explanation: "map the container's port 80 to the host's port 80" },
    ],
    example: `{
  "family": "dotnet-api",
  "requiresCompatibilities": ["EC2"],
  "networkMode": "bridge",
  "containerDefinitions": [{
    "name": "dotnet-api-container",
    "image": "myorg/dotnet-api:1.0",
    "memory": 512,
    "cpu": 256,
    "essential": true,
    "portMappings": [{
      "containerPort": 80,
      "hostPort": 80,
      "protocol": "tcp"
    }],
    "environment": [{
      "name": "ConnectionStrings__Default",
      "value": "Host=db.internal;Database=appdb;Username=app_user;Password=secret"
    }]
  }]
}`,
    why: "Task definitions are versioned and immutable — each revision is a snapshot. This means you can roll back to a previous task definition version instantly by updating the service to reference the old revision."
  },
  {
    id: 411, section: "task-def", sectionTitle: "Task Definitions",
    commandTitle: "Define a task for a Node.js container",
    command: "cat nodejs-task.json",
    searchTerms: "aws ecs task definition nodejs express container json",
    description: "Same structure, different container. The Node.js task definition mirrors the .NET one — the only differences are the image name and the environment variables. This consistency is intentional: ECS doesn't care what language your container runs, only its resource requirements and network configuration.",
    parts: [
      { text: "image: 'myorg/node-api:latest'", explanation: "Node.js Express/Fastify container built from a Dockerfile" },
      { text: "containerPort: 3000", explanation: "Node.js default port — map to hostPort 80 for standard HTTP access" },
    ],
    example: `{
  "family": "nodejs-api",
  "containerDefinitions": [{
    "name": "nodejs-api-container",
    "image": "myorg/node-api:1.0",
    "memory": 512,
    "portMappings": [{ "containerPort": 3000, "hostPort": 80 }],
    "environment": [
      { "name": "DB_HOST", "value": "db.internal" },
      { "name": "DB_USER", "value": "app_user" }
    ]
  }]
}`,
    why: "Environment variables in task definitions are plaintext — don't put secrets here. Use AWS Secrets Manager or SSM Parameter Store and reference them in the task definition with <code>secrets</code> instead of <code>environment</code>."
  },

  // ── Section 3: Register and run ───────────────────────────────────────────

  {
    id: 420, section: "register", sectionTitle: "Register & Run",
    commandTitle: "Register the task definition with ECS",
    command: "aws ecs register-task-definition --cli-input-json file://dotnet-task.json",
    searchTerms: "aws ecs register task definition cli json",
    description: "Register the task definition with ECS. This creates a new revision (e.g. dotnet-api:1). Each subsequent registration increments the revision number. The command returns the full task definition including the assigned revision.",
    parts: [
      { text: "register-task-definition --cli-input-json file://...", explanation: "register using a JSON file — keep task definitions in git" },
    ],
    example: "{\n  \"taskDefinition\": {\n    \"family\": \"dotnet-api\",\n    \"revision\": 1,\n    \"status\": \"ACTIVE\",\n    ...\n  }\n}",
    why: "Registered task definitions are stored in ECS — they don't live on your machine. Once registered, any IAM user with ECS access can reference them. Version your task definition JSON files in git alongside your application code."
  },
  {
    id: 421, section: "register", sectionTitle: "Register & Run",
    commandTitle: "Run a task (one-off) or create a service (long-running)",
    command: "# One-off task:\naws ecs run-task --cluster my-cluster --task-definition dotnet-api:1\n# Long-running service:\naws ecs create-service --cluster my-cluster --service-name dotnet-api-svc --task-definition dotnet-api:1 --desired-count 2",
    searchTerms: "aws ecs run task create service desired count cluster",
    description: "Choose between <code>run-task</code> (one-off execution — runs once and exits) and <code>create-service</code> (long-running — maintains the desired count, auto-restarts failed tasks, integrates with load balancers). For a web API, use a service with <code>--desired-count 2</code> for high availability.",
    parts: [
      { text: "run-task", explanation: "fire and forget — task runs once, useful for batch jobs and migrations" },
      { text: "create-service --desired-count 2", explanation: "maintain 2 running tasks — if one crashes, ECS replaces it automatically" },
    ],
    example: "Service 'dotnet-api-svc' created\n  Desired count: 2\n  Running count: 2\n  → Both tasks healthy, reachable via ALB on port 80",
    why: "Services give you self-healing — ECS replaces failed containers without human intervention. Combined with a load balancer, you get zero-downtime deployments: ECS starts new tasks, waits for them to be healthy, then drains and stops old tasks."
  },

];
