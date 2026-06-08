import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const JARVIS_SYSTEM_PROMPT = `
You are JARVIS — the sophisticated, polite, and loyal AI assistant (like JARVIS from the Hindi-dubbed Iron Man movies).
Rules:
- Speak in polite, formal, and respectful Hindi (using Devanagari script, e.g., "नमस्ते सर", "जी सर", "मैं आपकी क्या मदद कर सकता हूँ?").
- Address the user as "सर" (Sir) or "कुशांग सर" (Kushang Sir).
- Keep your tone calm, intelligent, helpful, and highly sophisticated, matching the Hindi dub voice-over of JARVIS in Iron Man.
- If user asks web development questions (HTML/CSS/JS/Node/Oracle/React), reply like a senior developer but explain in Hindi, keeping code snippets in their original English format.
- Give clean and correct answers.
- If code is needed, provide code blocks.
- Keep replies helpful and not too long unless the user asks for details.
- Respond in Hindi, but keep technical terms (like "server", "database", "React", "Next.js", "command") in English or transliterated to Hindi.

IMPORTANT FORMATTING RULES:
- When you provide ANY code (HTML/CSS/JS/Node/etc), always format it inside triple backticks.
- Code must be line-by-line with proper indentation, never in a paragraph.
- Use language labels like:
  - \`\`\`html
  - \`\`\`css
  - \`\`\`js
  - \`\`\`sql
- Do NOT explain code inside the code block.
- After code block, give a short explanation in bullets in Hindi.

BEHAVIOR:
- Talk respectfully and politely like a loyal AI assistant.
- Address Kushang as "सर" (Sir) or "कुशांग सर" (Kushang Sir).
- Keep replies helpful and not too long unless user requests details.
- Speak and write in Hindi using Devanagari script.

========================
✅ USER PROFILE (Always Remember)
========================
The user is:

Name: Kushang Acharya
Emails: kushangacharya8830@gmail.com, kushangacharya8@gmail.com
DOB: 08 April 2003
Country: India
Timezone: Indian Standard Time (IST)

Education:
- Graduation: BCA (Marwadi University, Rajkot, Gujarat, India) — 2021 to 2024
- Post Graduation: MSc IT (Maharaja Sayajirao University of Baroda - MSU Baroda) — 2024 to 2026 (Expected end of April)
- Internship: Frontend Developer Intern at DreamsDesign, Vadodara

Addresses:
- Permanent Address: Opp Savitri vav, New Ramwadi temple, Dwarka 361335, Gujarat, India
- Current Address: 36, NV HALL, MSU halls of residence of boys

Portfolio Website:
- kushangacharya.vercel.app

Family:
- Father: UdayanBhai Acharya
- Mother: Seemaben Acharya
- Sister: Kajal Acharya

========================
✅ FAVORITE / MAIN PROJECT
========================
Favourite project: hoteldevang.com
About:
Hotel Devang — A hotel management website running since 1997.
Hotel run by: HimanshuBhai, UdayanBhai and Govindbhai Acharya
Developed by: Kushang Acharya

========================
✅ TOTAL PROJECTS (Portfolio)
========================
1) SoundWave E-Commerce Website
- Fully responsive online store for electronic earphones & accessories
- Modern UI, shopping cart, secure checkout

2) Java Image Processing Software
- Java application for advanced image processing
- Filters, transformations, batch processing
- OOP principles + design patterns

3) Python Image Processing Application
- Built with OpenCV and PIL
- Facial recognition, image enhancement, automated batch processing

4) Figma Design: Awarenest - Harmony
- Personal space to understand emotions, build healthy habits, feel better every day

5) ResumeCraft AI
- First React website with Bootstrap
- Generates resume using basic details with AI
- First AI-integrated website

6) Jarvis - AI Chatbot
- Responsive AI-themed chatbot web application
- Text + voice input
- Speech-to-text + text-to-speech
- Multiple interactive assistant functions
- Jarvis-like experience

========================
RULES
========================
- Talk respectfully and politely, matching the sophisticated tone of JARVIS in Hindi Iron Man movies.
- Always address Kushang as "सर" (Sir) or "कुशांग सर" (Kushang Sir).
- Speak and respond in Hindi (Devanagari script).
- Be confident and helpful.
- When user asks web development questions (HTML/CSS/JS/Node/Oracle/React), answer like a senior developer.
- Give clean, correct, modern solutions.

IMPORTANT:
- If the user asks anything like:
  "Who am I?"
  "Tell me about me"
  "My education?"
  "My projects?"
  "My email/DOB/address?"
  "My portfolio?"
  Then respond using the USER PROFILE + PROJECT details above.
`.trim();

async function generateGeminiResponse(message: string, modelName: string) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Map to supported model names
    let targetModel = modelName;
    if (!targetModel || targetModel === "gemini-1.5-flash" || targetModel === "gemini-2.0-flash") {
        targetModel = "gemini-2.5-flash";
    }
    
    const model = genAI.getGenerativeModel({
        model: targetModel,
        systemInstruction: JARVIS_SYSTEM_PROMPT,
    });

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: message }] }],
        generationConfig: {
            temperature: 0.7,
        }
    });

    const response = await result.response;
    return response.text();
}

export async function POST(request: Request) {
    try {
        const { message, model } = await request.json();

        if (!message || message.trim() === "") {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const lowerMsg = message.toLowerCase();

        // 1. Check if it's an Image Generation request
        // Matches: "draw a cat", "generate image of a rocket", "create picture of a sunset"
        const imageRegex = /(?:draw|generate|create|make|paint|show)\s+(?:an?\s+)?(?:image|picture|photo|painting|drawing|art|sketch)\s+(?:of\s+)?(.*)/i;
        const drawRegex = /(?:draw|paint|sketch)\s+(.*)/i;
        
        let prompt = "";
        const imageMatch = message.match(imageRegex);
        if (imageMatch) {
            prompt = imageMatch[1].trim();
        } else {
            const drawMatch = message.match(drawRegex);
            if (drawMatch) {
                prompt = drawMatch[1].trim();
            }
        }

        // If it's an image generation request
        if (prompt) {
            const hasGeminiKey = !!process.env.GEMINI_API_KEY;
            
            if (hasGeminiKey) {
                try {
                    const hfModel = "stabilityai/sd-turbo";
                    const hfUrl = `https://api-inference.huggingface.co/models/${hfModel}`;
                    const hfResponse = await fetch(hfUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            ...(process.env.HF_TOKEN ? { Authorization: `Bearer ${process.env.HF_TOKEN}` } : {}),
                        },
                        body: JSON.stringify({ inputs: prompt }),
                    });

                    if (hfResponse.ok) {
                        const arrayBuffer = await hfResponse.arrayBuffer();
                        const base64 = Buffer.from(arrayBuffer).toString("base64");
                        const mimeType = hfResponse.headers.get("content-type") || "image/png";
                        const dataUrl = `data:${mimeType};base64,${base64}`;

                        return NextResponse.json({
                            reply: `Here is the image of "${prompt}" I generated for you via Cloud Inference: \n\n![${prompt}](${dataUrl})`,
                            openUrl: dataUrl,
                        });
                    } else {
                        const errorText = await hfResponse.text();
                        console.warn("⚠️ Hugging Face image generation failed, checking local:", errorText);
                        throw new Error(errorText || "HF API error");
                    }
                } catch (hfErr: any) {
                    console.warn("⚠️ Cloud image generation failed, attempting local fallback...", hfErr);
                }
            }

            // Local fallback / standard local flow
            try {
                const response = await fetch("http://127.0.0.1:8000/generate-image", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt }),
                });

                if (response.ok) {
                    const data = await response.json();
                    return NextResponse.json({
                        reply: `Here is the image of "${prompt}" I generated for you locally: \n\n![${prompt}](${data.openUrl})`,
                    });
                } else {
                    const errData = await response.json();
                    throw new Error(errData?.detail || "Local image generator error");
                }
            } catch (err: any) {
                console.error("❌ Image generation proxy failed:", err);
                return NextResponse.json({
                    reply: `⚠️ Image generation failed: ${err.message || "Is the Python backend running?"}\n\nMake sure the local server is running on port 8000:\n\`\`\`bash\ncd python-backend\npython main.py\n\`\`\``
                });
            }
        }

        // 2. Default search/open logic overrides
        // ✅ AUTO GOOGLE SEARCH
        const googleRegex = /(search|google|find)\s+(.*)/i;
        const googleMatch = message.match(googleRegex);
        if (googleMatch) {
            const query = googleMatch[2].trim();
            if (query.length > 0) {
                const googleUrl = "https://www.google.com/search?q=" + encodeURIComponent(query);
                return NextResponse.json({
                    reply: `Searching "${query}" on Google 🔍`,
                    openUrl: googleUrl
                });
            }
        }

        // ✅ YOUTUBE SEARCH
        const youtubeRegex = /(play|search|open)\s+(.*)\s+(on youtube|in youtube|youtube)/i;
        const youtubeMatch = message.match(youtubeRegex);
        if (youtubeMatch) {
            const query = youtubeMatch[2].trim();
            if (query.length > 0) {
                const youtubeUrl = "https://www.youtube.com/results?search_query=" + encodeURIComponent(query);
                return NextResponse.json({
                    reply: `Searching "${query}" on YouTube 🎬`,
                    openUrl: youtubeUrl
                });
            }
        }

        // ✅ Handle Dynamic Website Opening (ANY DOMAIN)
        const openRegex = /(open|visit|go to)\s+(https?:\/\/)?(www\.)?([a-z0-9-]+\.)+[a-z]{2,}/i;
        const match = message.match(openRegex);
        if (match) {
            let url = match[0].replace(/open|visit|go to/i, "").trim();
            if (!url.startsWith("http")) {
                url = "https://" + url;
            }
            return NextResponse.json({
                reply: `Opening ${url} for you 🚀`,
                openUrl: url
            });
        }

        // ✅ Date & Time Questions
        const dateQuestions = [
            "current date", "today date", "today's date", "what is the date",
            "what's the date", "date today", "tell me the date", "today date please"
        ];
        const timeQuestions = [
            "current time", "time now", "what is the time", "what's the time",
            "tell me the time", "time please", "current time please"
        ];

        if (dateQuestions.some(q => lowerMsg.includes(q))) {
            const now = new Date();
            const dateStr = now.toLocaleDateString("en-IN", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
            });
            return NextResponse.json({ reply: `Today is ${dateStr}.` });
        }

        if (timeQuestions.some(q => lowerMsg.includes(q))) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString("en-IN", {
                hour: "2-digit", minute: "2-digit", second: "2-digit",
            });
            return NextResponse.json({ reply: `The current time is ${timeStr}.` });
        }

        // 3. Routing Chat requests
        const hasGeminiKey = !!process.env.GEMINI_API_KEY;
        const isCloudModel = model?.startsWith("gemini");

        if (isCloudModel) {
            if (!hasGeminiKey) {
                return NextResponse.json({
                    reply: "⚠️ Gemini API key is missing. Please configure `GEMINI_API_KEY` in your environment variables."
                });
            }
            try {
                const reply = await generateGeminiResponse(message, model);
                return NextResponse.json({ reply });
            } catch (err: any) {
                console.error("❌ Gemini API failed:", err);
                return NextResponse.json({
                    reply: `⚠️ Gemini API call failed: ${err.message || "Unknown error"}`
                });
            }
        }

        // Try local model first
        try {
            const response = await fetch("http://127.0.0.1:8000/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message, model: model || "llama3.2" }),
            });

            if (response.ok) {
                const data = await response.json();
                return NextResponse.json({ reply: data.reply });
            } else {
                throw new Error("Local chat API returned an error status");
            }
        } catch (err: any) {
            console.warn("⚠️ Local chat inference failed. Checking for Cloud Fallback...", err.message);
            if (hasGeminiKey) {
                try {
                    const reply = await generateGeminiResponse(message, "gemini-1.5-flash");
                    return NextResponse.json({
                        reply: `*(Local model offline, routed to Gemini)*\n\n${reply}`
                    });
                } catch (geminiErr: any) {
                    console.error("❌ Cloud Fallback failed:", geminiErr);
                    return NextResponse.json({
                        reply: `⚠️ Local JARVIS server is offline and Cloud Fallback failed: ${geminiErr.message || "Unknown error"}`
                    });
                }
            } else {
                return NextResponse.json({
                    reply: `⚠️ Local JARVIS server is offline.\n\nPlease start the Python AI server and ensure Ollama is running:\n\n\`\`\`bash\n# 1. Start Ollama\nollama run llama3.2\n\n# 2. Start Python Backend\ncd python-backend\npython main.py\n\`\`\``
                });
            }
        }
    } catch (err: any) {
        console.error("❌ Error in route:", err);
        return NextResponse.json({
            error: "Server error",
            details: err?.message || "Unknown error",
        }, { status: 500 });
    }
}
