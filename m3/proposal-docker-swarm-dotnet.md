# Proposal: .NET Docker Swarm Module

Extracts from: `M3-Advanced-Docker.md` slides 53–61, `Practice-M3-Advanced-Docker.md` Swarm section, `DOB-M3-Practice-Files/M3-3/`

## What Changes

| Original (PHP+MySQL) | Replacement (.NET + PostgreSQL) |
|---------------------|--------------------------------|
| `php:7.0-apache` for web service | `mcr.microsoft.com/dotnet/aspnet:8.0` + custom build |
| `mysql:5.7` for database | `postgres:16-alpine` |
| Alpine `ping` for demo service | `node:20-alpine` with Node.js one-liner + .NET variant |
| `docker service create` with PHP image | `docker service create` with .NET image, showing `--update-delay`, `--update-parallelism` |
| `docker stack deploy` with PHP compose file | `docker stack deploy` with .NET compose file |

## Module Structure (to become `modules/m3/docker-swarm-dotnet.js`)

### Section 1: Cluster Setup (reuses docker-machine pattern from m2)

```bash
# Create 3-node cluster infrastructure
for i in 1 2 3; do
  docker-machine create -d virtualbox docker-$i
done

# Initialize Swarm on docker-1 (manager)
docker-machine ssh docker-1
docker swarm init --advertise-addr 192.168.99.101
docker swarm join-token -q worker   # save this token

# Join docker-2 and docker-3 as workers
docker-machine ssh docker-2
docker swarm join --token <TOKEN> --advertise-addr 192.168.99.102 192.168.99.101:2377
exit

docker-machine ssh docker-3
docker swarm join --token <TOKEN> --advertise-addr 192.168.99.103 192.168.99.101:2377
exit

# Verify cluster on manager
docker-machine ssh docker-1
docker node ls
# Should show: docker-1 (Leader), docker-2 (Ready, Active), docker-3 (Ready, Active)
```

### Section 2: .NET Service Deployment

```bash
# Create a .NET web API service with 3 replicas
docker service create \
  --replicas 3 \
  --name dotnet-api \
  --publish 8080:8080 \
  --update-delay 10s \
  --update-parallelism 1 \
  --env ConnectionStrings__Default="Host=db;Database=weatherapp;Username=postgres;Password=secret" \
  dotnet-api:latest

# Inspect the service
docker service ls
docker service inspect --pretty dotnet-api
docker service ps dotnet-api
# Shows 3 replicas distributed across docker-1, docker-2, docker-3
```

```bash
# Scale the .NET service to 5 replicas
docker service scale dotnet-api=5
docker service ps dotnet-api
# Now 5 replicas across 3 nodes — Swarm auto-distributes

# Test — hit any node's IP on port 8080
curl http://192.168.99.101:8080/weather
curl http://192.168.99.102:8080/weather
curl http://192.168.99.103:8080/weather
# Swarm's ingress mesh routes to any healthy replica regardless of which node receives the request
```

### Section 3: .NET Swarm Stack (docker-compose.yml → docker stack deploy)

```yaml
# docker-compose.yml — .NET stack for Swarm
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: weatherapp
    volumes:
      - pg-data:/var/lib/postgresql/data
    networks:
      - app-network
    deploy:
      placement:
        constraints:
          - node.role == worker   # DB runs only on worker nodes

  api:
    image: dotnet-api:latest
    ports:
      - "8080:8080"
    environment:
      ConnectionStrings__Default: "Host=db;Database=weatherapp;Username=postgres;Password=secret"
    networks:
      - app-network
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure

networks:
  app-network:
    driver: overlay    # ← overlay driver for multi-host Swarm

volumes:
  pg-data:
```

```bash
# Deploy the stack
docker stack deploy -c docker-compose.yml dotnet-stack

# Inspect the stack
docker stack ps dotnet-stack
# Shows services: dotnet-stack_db (1 replica), dotnet-stack_api (3 replicas)

# Check logs
docker service logs dotnet-stack_api

# Test across nodes
curl http://192.168.99.101:8080/weather
curl http://192.168.99.102:8080/weather
curl http://192.168.99.103:8080/weather

# Remove the stack
docker stack rm dotnet-stack
```

### Section 4: Node Maintenance with .NET Services

```bash
# Drain docker-2 — .NET API replicas migrate to docker-1 and docker-3
docker node update --availability drain docker-2
docker service ps dotnet_api
# docker-2 tasks show "Shutdown" — replaced on remaining nodes

# Verify service is still available
curl http://192.168.99.101:8080/weather
# Still returns data — zero downtime during drain

# Reactivate docker-2
docker node update --availability active docker-2
docker node inspect --pretty docker-2
# Shows "Availability: Active"

# Force rebalance (tasks redistribute to docker-2)
docker service update --force dotnet_api
docker service ps dotnet_api
# Replicas now spread across all 3 nodes again
```

### Section 5: Command Walkthrough (to become `commandData` entries)

| id | commandTitle | command | What it teaches |
|----|-------------|---------|-----------------|
| 400 | Create 3-node Swarm infra | `for i in 1 2 3; do docker-machine create -d virtualbox docker-$i; done` | Provisioning multi-node clusters |
| 401 | Init Swarm on manager | `docker swarm init --advertise-addr 192.168.99.101` | Swarm manager election |
| 402 | Get worker join token | `docker swarm join-token -q worker` | Token-based node authentication |
| 403 | Join workers to cluster | `docker swarm join --token <TOKEN> --advertise-addr ...` | Adding nodes to Swarm |
| 404 | Inspect cluster nodes | `docker node ls` | Node roles, status, availability |
| 405 | Create .NET service | `docker service create --replicas 3 --name dotnet-api ...` | Service definition, replicas, env vars |
| 406 | List services | `docker service ls` | Service overview |
| 407 | Inspect service | `docker service inspect --pretty dotnet-api` | Service configuration details |
| 408 | Check task distribution | `docker service ps dotnet-api` | Which node runs which replica |
| 409 | Scale service | `docker service scale dotnet-api=5` | Horizontal scaling across nodes |
| 410 | Drain a node | `docker node update --availability drain docker-2` | Graceful maintenance |
| 411 | Reactivate a node | `docker node update --availability active docker-2` | Bringing node back |
| 412 | Force rebalance | `docker service update --force dotnet-api` | Redistribute tasks after reactivation |
| 413 | Deploy .NET stack | `docker stack deploy -c docker-compose.yml dotnet-stack` | Stack deployment, overlay network |
| 414 | Inspect stack tasks | `docker stack ps dotnet-stack` | Stack task distribution |
| 415 | Remove stack | `docker stack rm dotnet-stack` | Stack cleanup |
| 416 | Remove services | `docker service rm dotnet-api` | Individual service cleanup |
| 417 | Leave Swarm (worker) | `docker swarm leave` | Node decommissioning |
| 418 | Leave Swarm (manager, force) | `docker swarm leave --force` | Manager decommissioning |

### Section 6: Node.js Comparison (callout)

```bash
# Node.js equivalent — service creation
docker service create \
  --replicas 3 \
  --name node-api \
  --publish 3000:3000 \
  --update-delay 10s \
  --update-parallelism 1 \
  --env DATABASE_URL="postgresql://postgres:secret@db:5432/weatherapp" \
  node-api:latest

# Same Swarm mechanics, different:
# - Port: 3000 vs 8080
# - Env var format: DATABASE_URL vs ConnectionStrings__Default
# - Image size: ~180 MB (node:20-alpine) vs ~210 MB (dotnet/aspnet:8.0)
# - Cold start: ~200ms (Node.js) vs ~800ms (.NET JIT)
```

## Deviations from Original M3 Material

1. **Overlay network for Swarm:** The original M3 Compose file uses `driver: bridge`. Swarm stacks that span multiple nodes require `driver: overlay` — this is a critical conceptual difference the module must explain.

2. **Placement constraints (.deploy.placement):** The original M3 doesn't use Swarm's placement constraints. The .NET module shows how to pin the database to worker nodes (not managers) — a production pattern.

3. **Rolling update config in Compose:** The original M3 uses CLI flags (`--update-delay`). The .NET module shows both CLI and Compose-based `deploy.update_config` — the more modern declarative approach.

4. **Database across nodes:** In a real Swarm, database placement matters. The original M3 copies PHP files to all nodes via SCP. The .NET module uses `docker stack deploy` which distributes images automatically, but the database volume must be on a single node (or use external networked storage).

5. **Image distribution:** `docker stack deploy` pulls images automatically on each node. The original M3 requires manual `scp` of files to each node because the images aren't in a registry. The .NET module should note that in production, a container registry (Docker Hub, GHCR, ACR) is used instead.

6. **ARM64 note:** The Swarm exercises assume x86 VirtualBox VMs. For Pi 5 owners, the conceptual knowledge transfers directly to k3s (covered in `modules/m3/k3s-pi5.js`). A footnote should link the two.

## Estimated Module Size

~18–22 `commandData` entries covering full Swarm lifecycle with .NET as primary stack and Node.js comparisons.
