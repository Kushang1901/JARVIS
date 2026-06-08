import { NextResponse } from "next/server";

export async function GET() {
    if (process.env.GEMINI_API_KEY) {
        return NextResponse.json({
            status: "ok",
            message: "Jarvis Cloud Core online ✅",
            mode: "cloud"
        });
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        const res = await fetch("http://127.0.0.1:8000/", {
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            return NextResponse.json({
                status: "ok",
                message: "Jarvis Local Core online ✅",
                mode: "local"
            });
        }
    } catch (err) {
        // Local server not running
    }

    return NextResponse.json({
        status: "offline",
        message: "Jarvis Core offline ⚠️",
        mode: "offline"
    });
}
