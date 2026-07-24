import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import type { ChatGPTUser } from "../chatgpt-auth";

export const DAILY_AVATAR_LIMIT = 3;

type UsageRecord = {
  day: string;
  count: number;
};

const usageByIdentity = new Map<string, UsageRecord>();

function utcDay() {
  return new Date().toISOString().slice(0, 10);
}

function signingSecret() {
  return (
    process.env.USAGE_LIMIT_SECRET ||
    process.env.ORCHESTRATOR_SERVICE_TOKEN ||
    "newchapter-local-development-only"
  );
}

function sign(value: string) {
  return createHmac("sha256", signingSecret()).update(value).digest("base64url");
}

export function readSignedUsageCookie(cookieValue: string | undefined): UsageRecord | null {
  if (!cookieValue) return null;
  const separator = cookieValue.lastIndexOf(".");
  if (separator < 1) return null;

  const payload = cookieValue.slice(0, separator);
  const suppliedSignature = cookieValue.slice(separator + 1);
  const expectedSignature = sign(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);

  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return null;
  }

  try {
    const record = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as UsageRecord;
    return typeof record.day === "string" && Number.isInteger(record.count)
      ? record
      : null;
  } catch {
    return null;
  }
}

export function signedUsageCookie(record: UsageRecord) {
  const payload = Buffer.from(JSON.stringify(record)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export async function avatarUsageIdentity(user: ChatGPTUser | null) {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const rawIdentity = user?.email.toLowerCase() || forwardedFor || "unknown";
  return createHash("sha256").update(rawIdentity).digest("hex");
}

export function consumeAvatarUsage(identity: string, cookie: UsageRecord | null) {
  const day = utcDay();
  const serverRecord = usageByIdentity.get(identity);
  const serverCount = serverRecord?.day === day ? serverRecord.count : 0;
  const cookieCount = cookie?.day === day ? cookie.count : 0;
  const current = Math.max(serverCount, cookieCount);

  if (current >= DAILY_AVATAR_LIMIT) {
    return { allowed: false, record: { day, count: current }, remaining: 0 };
  }

  const record = { day, count: current + 1 };
  usageByIdentity.set(identity, record);
  return {
    allowed: true,
    record,
    remaining: Math.max(0, DAILY_AVATAR_LIMIT - record.count),
  };
}
