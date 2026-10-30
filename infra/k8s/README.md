# Kubernetes (k3s)

Single-node k3s cluster. Each project lives in its own namespace.

- `platform/`: cluster-wide configuration, shared by every project.
- `nova/`: the Nova application.

## Cluster configuration

```sh
ACME_EMAIL=you@example.com envsubst < infra/k8s/platform/traefik-config.yaml \
  | sudo tee /var/lib/rancher/k3s/server/manifests/traefik-config.yaml
```

## Secrets

Secrets are not stored in git. Nova reads them from the `nova-env` secret:

```sh
kubectl -n nova create secret generic nova-env --from-env-file=.env
```

## Deployment

Pushing to `main` builds the images, publishes them to GHCR and rolls them out
(`.github/workflows/deploy.yml`).

## Adding a project

1. Create `infra/k8s/<project>/` with its own namespace.
2. Expose it through an `Ingress` using the same annotations as `nova/web.yaml`:
   Traefik requests the certificate.
3. Point the DNS record of the domain to the VPS.
