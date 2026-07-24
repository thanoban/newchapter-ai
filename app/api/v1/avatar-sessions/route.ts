import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../../chatgpt-auth";

type BeyondCall = {
  id: string;
  livekit_url: string;
  livekit_token: string;
};

export async function POST() {
  const apiKey = process.env.BEY_API_KEY;
  const agentId = process.env.BEY_AGENT_ID;

  if (!apiKey || !agentId) {
    return NextResponse.json(
      { error: "Live presence is not configured." },
      { status: 503 },
    );
  }

  const user = await getChatGPTUser();

  try {
    const upstream = await fetch("https://api.bey.dev/v1/calls", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        agent_id: agentId,
        livekit_username: user?.displayName.slice(0, 80) || "Guest",
        tags: { product: "newchapter", channel: "web" },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (upstream.status === 402 || upstream.status === 403) {
      return NextResponse.json(
        {
          mode: "embed",
          embedUrl: `https://bey.chat/${encodeURIComponent(agentId)}`,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!upstream.ok) {
      throw new Error(`Beyond Presence returned ${upstream.status}.`);
    }

    const call = (await upstream.json()) as BeyondCall;
    if (!call.id || !call.livekit_url || !call.livekit_token) {
      throw new Error("Beyond Presence returned an incomplete call.");
    }

    return NextResponse.json(
      {
        mode: "livekit",
        callId: call.id,
        serverUrl: call.livekit_url,
        participantToken: call.livekit_token,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Live presence is temporarily unavailable." },
      { status: 502 },
    );
  }
}
