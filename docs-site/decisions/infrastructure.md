# Terraform and CLI setup

**Status:** Discussed implementation approach; no infrastructure provisioned. **Updated:** 9 September 2026.

## What can be automated

Terraform can describe infrastructure resources. Provider CLIs, SSH and configuration tooling can prepare hosts and deploy the application. The work can be kept in version control and repeated for another environment.

| Layer | Proposed responsibility |
| --- | --- |
| Terraform | Compute, networks/firewalls, storage, managed database resources, supported DNS and service identities |
| Configuration scripts or Ansible | Host packages, users, Docker and host configuration for a rented server |
| Docker Compose | Initial application/worker services on a single host |
| Deployment commands or CI | Build images, run migrations, deploy, check health and roll back |
| Operational checks | Monitoring, backups, restore exercises and worker recovery |

Use the provider's supported resources rather than treating Terraform as a replacement for every deployment action.

## Proposed setup sequence

1. **Set the deployment inputs:** provider, region, environment, budget, domain, service choices and maintenance owner.
2. **Connect accounts locally:** authenticated provider CLI, appropriate access and controlled secret storage.
3. **Prepare infrastructure code:** versioned providers, resource definitions, environment inputs and a resource/cost summary.
4. **Review the plan:** make the exact resource changes and expected charges visible before creation.
5. **Apply infrastructure:** record outputs needed for deployment and keep state protected.
6. **Configure and deploy:** install/configure host services where needed, build an immutable image, migrate deliberately and launch the API/worker.
7. **Verify operation:** HTTPS/authentication, persistence, queued work, restart behavior, backup restoration and rollback.

No provider credentials or live values belong in the documentation, source repository or task notes.

## State and repeatability

Choose a protected remote Terraform state backend with locking supported by the chosen backend, restricted access and appropriate recovery. State can contain sensitive values; marking an output sensitive only changes how it is displayed.

Pin provider versions and retain the lockfile. Separate environment inputs and state so staging changes do not target production. Review the plan for each environment.

These are implementation requirements for the proposed setup, not evidence that state storage or environments currently exist. [Terraform state](https://developer.hashicorp.com/terraform/language/state), [Sensitive data in state](https://developer.hashicorp.com/terraform/language/state/sensitive-data)

## Release and verification

A release should identify the code/image version, database migration state and supported workflow capability versions. API and worker must remain compatible with pinned in-flight runs.

The first deployment check should prove a small deterministic workflow: start, pause for a question, restart, answer, resume, and retain the result. Paid AI calls can be checked separately when authorized and configured.

On a rented host, configure restart policies and a graceful shutdown window. Keep assets durable outside the container filesystem. Database recovery needs a tested backup rather than only a successful backup-job message.

## Decisions still needed

Provider, region, budget, domain/account access, managed versus self-hosted database, acceptable downtime and maintenance ownership are open. Terraform/CLI capability was discussed; it was not permission to buy infrastructure.

For the application design behind this sequence, see [Delivery stages](/decisions/delivery).

## Twelve-Factor connection

Deployment addresses and service credentials are environment configuration; editable workflow recipes are versioned product data. API and worker processes keep durable state in backing services. Migrations and repair commands are controlled one-off operations. [Config](https://www.12factor.net/config), [Processes](https://www.12factor.net/processes), [Admin processes](https://www.12factor.net/admin-processes)
