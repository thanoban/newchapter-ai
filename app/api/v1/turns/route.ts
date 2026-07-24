import { NextResponse } from "next/server";

type IncomingTurn = {
  sessionId?: unknown;
  message?: unknown;
  history?: unknown;
};

const immediateRiskPatterns = [
  /\bkill myself\b/i,
  /\bend my life\b/i,
  /\bwant to die\b/i,
  /\bsuicid(?:e|al)\b/i,
  /\bhurt myself\b/i,
  /\bhurt (?:him|her|them|someone)\b/i,
];

function localCareResponse(message: string) {
  if (immediateRiskPatterns.some((pattern) => pattern.test(message))) {
    return {
      message:
        "I’m really glad you said this out loud. Your immediate safety matters more than this chat. Please contact local emergency services now or go to the nearest emergency department, and ask a trusted person to stay with you. Move away from anything you could use to hurt yourself. Are you in immediate danger right now?",
      riskLevel: "immediate",
      contributors: ["safety"],
      mode: "local-safety-fallback",
    };
  }

  const normalized = message.toLowerCase();
  const opening = normalized.includes("miss")
    ? "Missing them can be real without being a command to contact them."
    : normalized.includes("fault") || normalized.includes("blame")
      ? "Your mind may be searching for one clean cause because uncertainty hurts."
      : normalized.includes("sleep") || normalized.includes("night")
        ? "Nights can make the mind replay what the day managed to hold at a distance."
        : "What you’re feeling makes sense in the middle of a loss.";

  return {
    message: `${opening} We do not need to solve the whole story right now. Name the strongest feeling in one word, then notice where it sits in your body. After that, we can choose one small action for the next ten minutes—not forever, just the next ten minutes.`,
    riskLevel: "standard",
    contributors: ["safety", "listener", "reframe", "coach", "critic"],
    mode: "local-development-fallback",
  };
}

export async function POST(request: Request) {
  let body: IncomingTurn;

  try {
    body = (await request.json()) as IncomingTurn;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    typeof body.sessionId !== "string" ||
    body.sessionId.length > 128 ||
    typeof body.message !== "string" ||
    body.message.trim().length === 0 ||
    body.message.length > 4000
  ) {
    return NextResponse.json(
      { error: "sessionId and a message up to 4000 characters are required." },
      { status: 422 },
    );
  }

  const orchestratorUrl = process.env.ORCHESTRATOR_BASE_URL;
  if (!orchestratorUrl) {
    return NextResponse.json(localCareResponse(body.message));
  }

  try {
    const upstream = await fetch(
      `${orchestratorUrl.replace(/\/$/, "")}/v1/conversations/${encodeURIComponent(body.sessionId)}/turns`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(process.env.ORCHESTRATOR_SERVICE_TOKEN
            ? { authorization: `Bearer ${process.env.ORCHESTRATOR_SERVICE_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({
          message: body.message,
          history: Array.isArray(body.history) ? body.history.slice(-8) : [],
          channel: "web",
        }),
        signal: AbortSignal.timeout(20_000),
      },
    );

    if (!upstream.ok) {
      throw new Error(`Orchestrator returned ${upstream.status}.`);
    }

    return NextResponse.json(await upstream.json());
  } catch {
    return NextResponse.json(localCareResponse(body.message));
  }
}
