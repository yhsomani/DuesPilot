import { sweepOverduePromises } from "@/lib/collections";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

async function handleSweep(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = process.env.CRON_SECRET;
  if (!token || !authHeader || !safeEqual(authHeader, `Bearer ${token}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sweepOverduePromises();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  return handleSweep(req);
}

export async function POST(req: Request) {
  return handleSweep(req);
}
