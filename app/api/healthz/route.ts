import { NextResponse } from "next/server";

export async function GET() {
  const orchestratorUrl = process.env.ORCHESTRATOR_BASE_URL;
  if (!orchestratorUrl) {
    return NextResponse.json(
      { status: "degraded", orchestrator: "not-configured" },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(
      `${orchestratorUrl.replace(/\/$/, "")}/healthz`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!response.ok) {
      throw new Error(`Orchestrator returned ${response.status}.`);
    }

    return NextResponse.json({ status: "ok", orchestrator: "ready" });
  } catch {
    return NextResponse.json(
      { status: "degraded", orchestrator: "unavailable" },
      { status: 503 },
    );
  }
}
