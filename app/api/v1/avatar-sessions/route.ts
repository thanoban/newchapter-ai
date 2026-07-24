import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  avatarUsageIdentity,
  consumeAvatarUsage,
  DAILY_AVATAR_LIMIT,
  readSignedUsageCookie,
  signedUsageCookie,
} from "../../../lib/avatar-usage";

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
  const cookieStore = await cookies();
  const usage = consumeAvatarUsage(
    await avatarUsageIdentity(user),
    readSignedUsageCookie(cookieStore.get("nc_avatar_usage")?.value),
  );

  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: `You’ve used today’s ${DAILY_AVATAR_LIMIT} live sessions. Text support is still open, and your live allowance resets tomorrow.`,
        remaining: 0,
      },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

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
      const response = NextResponse.json(
        {
          mode: "embed",
          embedUrl: `https://bey.chat/${encodeURIComponent(agentId)}`,
          remaining: usage.remaining,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
      response.cookies.set("nc_avatar_usage", signedUsageCookie(usage.record), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 48,
      });
      return response;
    }

    if (!upstream.ok) {
      throw new Error(`Beyond Presence returned ${upstream.status}.`);
    }

    const call = (await upstream.json()) as BeyondCall;
    if (!call.id || !call.livekit_url || !call.livekit_token) {
      throw new Error("Beyond Presence returned an incomplete call.");
    }

    const response = NextResponse.json(
      {
        mode: "livekit",
        callId: call.id,
        serverUrl: call.livekit_url,
        participantToken: call.livekit_token,
        remaining: usage.remaining,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
    response.cookies.set("nc_avatar_usage", signedUsageCookie(usage.record), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 48,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Live presence is temporarily unavailable." },
      { status: 502 },
    );
  }
}
