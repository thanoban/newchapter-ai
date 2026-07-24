[CmdletBinding()]
param(
    [string]$ProjectId = "projectbucket-501814",
    [string]$Region = "asia-south1",
    [string]$GitHubRepository = "thanoban/newchapter-ai"
)

$ErrorActionPreference = "Stop"

$projectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
if (-not $projectNumber) {
    throw "Unable to resolve project number for $ProjectId."
}

$poolId = "github-pool"
$providerId = "newchapter-provider"
$repositoryId = "newchapter"
$deployerAccountId = "newchapter-deployer"
$webRuntimeAccountId = "newchapter-web-runtime"
$orchestratorRuntimeAccountId = "newchapter-orch-runtime"
$tokenSecret = "newchapter-orchestrator-token"

function Assert-GcloudSuccess {
    param(
        [Parameter(Mandatory)]
        [string]$Action
    )

    if ($LASTEXITCODE -ne 0) {
        throw "gcloud failed while $Action."
    }
}

gcloud services enable `
    artifactregistry.googleapis.com `
    aiplatform.googleapis.com `
    iamcredentials.googleapis.com `
    run.googleapis.com `
    secretmanager.googleapis.com `
    sts.googleapis.com `
    --project=$ProjectId
Assert-GcloudSuccess "enabling required APIs"

$repositoryExists = gcloud artifacts repositories describe $repositoryId `
    --project=$ProjectId `
    --location=$Region `
    --format="value(name)" 2>$null
if (-not $repositoryExists) {
    gcloud artifacts repositories create $repositoryId `
        --project=$ProjectId `
        --location=$Region `
        --repository-format=docker `
        --description="NewChapter Cloud Run images"
    Assert-GcloudSuccess "creating the Artifact Registry repository"
}

function Ensure-ServiceAccount {
    param(
        [Parameter(Mandatory)]
        [string]$AccountId,
        [Parameter(Mandatory)]
        [string]$DisplayName
    )

    $email = "$AccountId@$ProjectId.iam.gserviceaccount.com"
    $exists = gcloud iam service-accounts describe $email `
        --project=$ProjectId `
        --format="value(email)" 2>$null
    if (-not $exists) {
        gcloud iam service-accounts create $AccountId `
            --project=$ProjectId `
            --display-name=$DisplayName | Out-Null
        Assert-GcloudSuccess "creating service account $AccountId"
    }
    return $email
}

$deployerEmail = Ensure-ServiceAccount `
    -AccountId $deployerAccountId `
    -DisplayName "NewChapter GitHub deployer"
$webRuntimeEmail = Ensure-ServiceAccount `
    -AccountId $webRuntimeAccountId `
    -DisplayName "NewChapter web runtime"
$orchestratorRuntimeEmail = Ensure-ServiceAccount `
    -AccountId $orchestratorRuntimeAccountId `
    -DisplayName "NewChapter orchestrator runtime"

foreach ($role in @(
    "roles/artifactregistry.writer",
    "roles/run.admin"
)) {
    gcloud projects add-iam-policy-binding $ProjectId `
        --member="serviceAccount:$deployerEmail" `
        --role=$role `
        --condition=None `
        --quiet | Out-Null
    Assert-GcloudSuccess "granting $role to the deployer"
}

gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$orchestratorRuntimeEmail" `
    --role="roles/aiplatform.user" `
    --condition=None `
    --quiet | Out-Null
Assert-GcloudSuccess "granting Vertex AI access to the orchestrator"

foreach ($runtimeEmail in @($webRuntimeEmail, $orchestratorRuntimeEmail)) {
    gcloud iam service-accounts add-iam-policy-binding $runtimeEmail `
        --project=$ProjectId `
        --member="serviceAccount:$deployerEmail" `
        --role="roles/iam.serviceAccountUser" `
        --condition=None `
        --quiet | Out-Null
    Assert-GcloudSuccess "allowing the deployer to use $runtimeEmail"
}

$providerExists = gcloud iam workload-identity-pools providers describe $providerId `
    --project=$ProjectId `
    --location=global `
    --workload-identity-pool=$poolId `
    --format="value(name)" 2>$null
if (-not $providerExists) {
    gcloud iam workload-identity-pools providers create-oidc $providerId `
        --project=$ProjectId `
        --location=global `
        --workload-identity-pool=$poolId `
        --display-name="NewChapter GitHub provider" `
        --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" `
        --attribute-condition="assertion.repository=='$GitHubRepository'" `
        --issuer-uri="https://token.actions.githubusercontent.com"
    Assert-GcloudSuccess "creating the GitHub Workload Identity provider"
}

$principal = "principalSet://iam.googleapis.com/projects/$projectNumber/locations/global/workloadIdentityPools/$poolId/attribute.repository/$GitHubRepository"
gcloud iam service-accounts add-iam-policy-binding $deployerEmail `
    --project=$ProjectId `
    --member=$principal `
    --role="roles/iam.workloadIdentityUser" `
    --condition=None `
    --quiet | Out-Null
Assert-GcloudSuccess "granting the GitHub repository federated access"

$secretExists = gcloud secrets describe $tokenSecret `
    --project=$ProjectId `
    --format="value(name)" 2>$null
if (-not $secretExists) {
    gcloud secrets create $tokenSecret `
        --project=$ProjectId `
        --replication-policy=automatic
    Assert-GcloudSuccess "creating the orchestrator token secret"
}

$secretVersion = gcloud secrets versions list $tokenSecret `
    --project=$ProjectId `
    --filter="state=ENABLED" `
    --limit=1 `
    --format="value(name)"
Assert-GcloudSuccess "checking the orchestrator token secret"
if (-not $secretVersion) {
    $tokenBytes = [byte[]]::new(48)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($tokenBytes)
    $token = [Convert]::ToBase64String($tokenBytes)
    $temporaryFile = New-TemporaryFile
    $temporaryFilePath = $temporaryFile.FullName
    try {
        [System.IO.File]::WriteAllText(
            $temporaryFilePath,
            $token,
            [System.Text.UTF8Encoding]::new($false)
        )
        gcloud secrets versions add $tokenSecret `
            --project=$ProjectId `
            --data-file=$temporaryFilePath | Out-Null
        Assert-GcloudSuccess "adding the orchestrator token secret version"
    }
    finally {
        Remove-Item -LiteralPath $temporaryFilePath -Force
    }
}

foreach ($member in @(
    "serviceAccount:$deployerEmail",
    "serviceAccount:$webRuntimeEmail",
    "serviceAccount:$orchestratorRuntimeEmail"
)) {
    gcloud secrets add-iam-policy-binding $tokenSecret `
        --project=$ProjectId `
        --member=$member `
        --role="roles/secretmanager.secretAccessor" `
        --condition=None `
        --quiet | Out-Null
    Assert-GcloudSuccess "granting secret access to $member"
}

$providerName = gcloud iam workload-identity-pools providers describe $providerId `
    --project=$ProjectId `
    --location=global `
    --workload-identity-pool=$poolId `
    --format="value(name)"

Write-Host "Google Cloud bootstrap is ready."
Write-Host "Workload Identity Provider: $providerName"
Write-Host "Deploy service account: $deployerEmail"
