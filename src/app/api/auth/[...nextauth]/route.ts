import { NextResponse } from "next/server";
import { handlers } from "@/auth";
import { authEnabled } from "@/lib/auth/config";

const off = () => NextResponse.json({ error: "Sign-in is not configured on this site." }, { status: 404 });

export const GET: typeof handlers.GET = async (req) => (authEnabled() ? handlers.GET(req) : off());
export const POST: typeof handlers.POST = async (req) => (authEnabled() ? handlers.POST(req) : off());
