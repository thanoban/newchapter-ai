# Google Cloud deployment

NewChapter deploys from GitHub Actions to one public Cloud Run service in
`projectbucket-501814`:

- `newchapter-web` runs the Next.js web application as the ingress container.
- A private FastAPI sidecar in the same Cloud Run instances handles safety and
  Vertex AI orchestration over localhost.

The web and orchestrator remain separate container images, stored in the
`newchapter` Artifact Registry repository in `asia-south1`. The workflow uses
GitHub OIDC and Google Workload Identity Federation, so no service-account key
is stored in GitHub. Only the web container has a public port; the orchestrator
is not directly exposed.

## One-time Google Cloud bootstrap

Run the bootstrap from an authenticated PowerShell session:

```powershell
.\scripts\bootstrap-gcp.ps1
```

The script is safe to rerun. It enables the required APIs, creates the image
repository and least-privilege service accounts, adds a provider scoped to
`thanoban/newchapter-ai`, and stores a generated service-to-service token in
Secret Manager.

The GitHub workflow contains only non-secret Google Cloud resource names. No
GitHub Actions secret is required for Google authentication.

## Deploy

Push to `main`, or run **Deploy to Google Cloud** manually from the repository's
Actions tab. The workflow:

1. verifies the web and Python services;
2. builds and pushes immutable web and orchestrator images;
3. deploys both images as one multi-container Cloud Run revision;
4. smoke-tests the public page and its internal orchestrator health path.

The first deployment can take several minutes while images and Cloud Run
revisions are created.
