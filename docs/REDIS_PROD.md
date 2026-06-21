# Production Redis Recommendations

This document describes a minimal, secure Redis deployment layout for Lullow
suitable for staging/production. It's intentionally conservative for a
hackathon-to-prod transition: separate concerns, restrict access, enable
persistence and backups, and prefer managed Redis where possible.

1) Topology
- Use two isolated Redis instances (or managed databases) for separation of
  concerns:
  - `redis-app` — stores story RAG records, vector index keys, cached assets.
  - `redis-profile` — stores user profiles, sessions, auth-related data.
  - Optionally run a third instance for ephemeral caches or analytics.

2) Redis Options
- Prefer Redis Stack / managed Redis that supports persistence and snapshotting
  (RDB + AOF) and TLS. For vector search at scale, use a vector-capable store
  (Redis 7.2+ with RediSearch module or a dedicated vector DB). For hackathon
  parity the simple Redis-backed vector index works but is not production-ready.

3) Security (ACLs and users)
- Do NOT use the default `requirepass`-only model. Use Redis ACLs and unique
  per-role users. Example (run as admin):

```
# Create an app user that can read/write keys for the app DB only
ACL SETUSER lullow_app on >app_password ~* +@all -ACL +select
# Create a restricted profile user (only profile DB commands)
ACL SETUSER lullow_profile on >profile_password ~* +@all -ACL +select
# Recommended: create even more restricted users for automation tasks
```

Notes: when using managed Redis (e.g., AWS ElastiCache, Memorystore, Redis
Enterprise) follow the provider's IAM/VPC/TLS best practices and create
network-level access controls rather than relying on plaintext ACLs.

4) DB numbering and access
- If you must use a single Redis instance, avoid DB SELECT in app code and
  instead namespace keys (e.g., `app:...` and `profile:...`). Prefer separate
  instances so you can enforce different persistence or eviction policies.

5) Persistence and backup
- Enable RDB snapshots and AOF (or continuous backups via the managed service).
- Regularly test restore procedures and monitor RPO/RTO requirements.

6) TLS and network
- Terminate Redis TLS on a proxy or use a managed TLS-enabled endpoint. Put
  Redis instances in a private VPC/subnet and only allow connections from the
  application hosts or trusted CI systems.

7) Operational notes
- Monitor memory usage and eviction events — vectors can be large. Use
  LRU/LFU eviction for ephemeral caches and reserved RAM for the vector store.
- Set `maxmemory` appropriately and consider disk-backed vector stores if
  your dataset grows substantially.

8) Example docker-compose (development with ACLs)

```
version: '3.8'
services:
  redis-app:
    image: redis:7.2
    command: ["redis-server", "--requirepass", "app_password"]
    ports: ["6379:6379"]
  redis-profile:
    image: redis:7.2
    command: ["redis-server", "--requirepass", "profile_password"]
    ports: ["6380:6379"]
```

9) Migration & rollout
- Start in staging with separate instances and a replica for failover. Run
  smoke tests for RAG retrieval and asset caching before switching production
  traffic; observe memory and latency patterns when seeding initial vectors.

10) Further reading
- Redis Security: https://redis.io/docs/manual/security/
- Redis Modules & RediSearch for vectors: https://redis.io/docs/stack/
