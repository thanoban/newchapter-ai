# Google Cloud deployment

NewChapter deploys from GitHub Actions to two Cloud Run services in
`projectbucket-501814`:

- `newchapter-web` runs the Next.js web application and server-side API routes.
- `newchapter-orchestrator` runs the FastAPI safety and Vertex AI orchestration
  service.

Container images are stored in the `newchapter` Artifact Registry repository in
`asia-south1`. The workflow uses GitHub OIDC and Google Workload Identity
Federation, so no service-account key is stored in GitHub.

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
3. deploys the orchestrator and injects its URL into the web service;
4. smoke-tests both deployed services.

The first deployment can take several minutes while images and Cloud Run
revisions are created.
