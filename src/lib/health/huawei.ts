import type { HealthMetricsSnapshot } from "@/types";

export interface HuaweiTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

const AUTH_BASE =
  process.env.HUAWEI_OAUTH_BASE ?? "https://oauth-login.cloud.huawei.com/oauth2/v3";
const HEALTH_BASE =
  process.env.HUAWEI_HEALTH_API_BASE ?? "https://health-api.cloud.huawei.com";

export const HUAWEI_SCOPES = (
  process.env.HUAWEI_HEALTH_SCOPES ??
  [
    "openid",
    "profile",
    "https://www.huawei.com/healthkit/sleep.read",
    "https://www.huawei.com/healthkit/heartrate.read",
    "https://www.huawei.com/healthkit/spo2.read",
    "https://www.huawei.com/healthkit/stress.read",
  ].join(" ")
).trim();

export function getHuaweiConfig() {
  return {
    clientId: process.env.HUAWEI_CLIENT_ID?.trim() ?? "",
    clientSecret: process.env.HUAWEI_CLIENT_SECRET?.trim() ?? "",
    redirectUri: process.env.HUAWEI_REDIRECT_URI?.trim() ?? "",
  };
}

export function buildHuaweiAuthUrl(state: string): string {
  const { clientId, redirectUri } = getHuaweiConfig();
  const q = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: HUAWEI_SCOPES,
    state,
    access_type: "offline",
    prompt: "consent",
  });
  return `${AUTH_BASE}/authorize?${q.toString()}`;
}

export async function exchangeHuaweiCode(code: string): Promise<HuaweiTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getHuaweiConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const res = await fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`huawei_token_exchange_failed_${res.status}`);
  }
  return (await res.json()) as HuaweiTokenResponse;
}

export async function refreshHuaweiToken(refreshToken: string): Promise<HuaweiTokenResponse> {
  const { clientId, clientSecret } = getHuaweiConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`huawei_refresh_failed_${res.status}`);
  }
  return (await res.json()) as HuaweiTokenResponse;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function recordArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

async function callHealthApi(path: string, accessToken: string): Promise<unknown | null> {
  const res = await fetch(`${HEALTH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

function toIso(v: unknown): string {
  if (typeof v === "number" || typeof v === "string") {
    const date = new Date(v);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
}

export async function fetchHuaweiMetrics(
  accessToken: string
): Promise<HealthMetricsSnapshot> {
  // Endpoints vary by tenant/version; keep paths overridable via env.
  const sleepPath = process.env.HUAWEI_SLEEP_PATH ?? "/healthkit/v1/sleep";
  const hrPath = process.env.HUAWEI_HR_PATH ?? "/healthkit/v1/heart-rate";
  const spo2Path = process.env.HUAWEI_SPO2_PATH ?? "/healthkit/v1/spo2";
  const stressPath = process.env.HUAWEI_STRESS_PATH ?? "/healthkit/v1/stress";

  const [sleepRaw, hrRaw, spo2Raw, stressRaw] = await Promise.all([
    callHealthApi(sleepPath, accessToken),
    callHealthApi(hrPath, accessToken),
    callHealthApi(spo2Path, accessToken),
    callHealthApi(stressPath, accessToken),
  ]);
  const sleep = asRecord(sleepRaw);
  const heartRate = asRecord(hrRaw);
  const spo2 = asRecord(spo2Raw);
  const stress = asRecord(stressRaw);

  const sleepRecords = recordArray(
    sleep.records ?? sleep.data ?? sleep.sleepRecords
  );
  const lastSleep = sleepRecords[0];
  const hrRecords = recordArray(heartRate.records ?? heartRate.data);
  const restingBpm =
    heartRate.restingBpm ??
    heartRate.restingHeartRate ??
    hrRecords[0]?.restingBpm ??
    null;

  return {
    fetchedAt: new Date().toISOString(),
    sleep: {
      lastNight: lastSleep
        ? {
            startTime: toIso(lastSleep.startTime ?? lastSleep.start),
            endTime: toIso(lastSleep.endTime ?? lastSleep.end),
            durationMin: Math.round(
              Number(lastSleep.durationMin ?? lastSleep.duration ?? 0)
            ),
            phases: recordArray(lastSleep.phases ?? lastSleep.stage).map((p) => ({
              phase: String(p.phase ?? p.type ?? "unknown"),
              durationMin: Math.round(Number(p.durationMin ?? p.duration ?? 0)),
            })),
          }
        : null,
    },
    heartRate: {
      restingBpm: restingBpm != null ? Number(restingBpm) : null,
      points: hrRecords.slice(0, 1440).map((p) => ({
        t: toIso(p.time ?? p.timestamp ?? p.t),
        bpm: Number(p.bpm ?? p.heartRate ?? 0),
      })),
    },
    spo2: { latest: spo2.latest != null ? Number(spo2.latest) : null },
    stress: { latest: stress.latest != null ? Number(stress.latest) : null },
  };
}
