print("⏳ Initializing JARVIS AI Server & importing libraries (takes 10-15 seconds)...")
import os
import time
import uuid
import torch
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
from diffusers import AutoPipelineForText2Image

app = FastAPI(title="JARVIS Local AI Backend")

# Enable CORS for local testing if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for lazy loaded models
sd_pipeline = None

class ChatRequest(BaseModel):
    message: str
    model: str = "llama3.2"

class ImageRequest(BaseModel):
    prompt: str

# System Prompt detailing Kushang's profile and JARVIS personality
JARVIS_SYSTEM_PROMPT = """
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
  - ```html
  - ```css
  - ```js
  - ```sql
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
""".strip()

def get_sd_pipeline():
    global sd_pipeline
    if sd_pipeline is None:
        print("⏳ Loading Stable Diffusion (sd-turbo) into memory...")
        start_time = time.time()
        
        # Check if CUDA (Nvidia GPU) is available
        use_cuda = torch.cuda.is_available()
        device = "cuda" if use_cuda else "cpu"
        dtype = torch.float16 if use_cuda else torch.float32
        
        try:
            if use_cuda:
                sd_pipeline = AutoPipelineForText2Image.from_pretrained(
                    "stabilityai/sd-turbo", 
                    torch_dtype=dtype, 
                    variant="fp16"
                )
            else:
                sd_pipeline = AutoPipelineForText2Image.from_pretrained(
                    "stabilityai/sd-turbo", 
                    torch_dtype=dtype
                )
            
            sd_pipeline.to(device)
            # Disable safety checker for slightly faster local runs if desired
            if hasattr(sd_pipeline, "safety_checker") and sd_pipeline.safety_checker is not None:
                sd_pipeline.safety_checker = None
                
            print(f"✅ Stable Diffusion loaded successfully on {device.upper()} in {time.time() - start_time:.2f}s")
        except Exception as e:
            print(f"❌ Error loading SD pipeline: {e}")
            raise RuntimeError(f"Failed to load Stable Diffusion model: {e}")
            
    return sd_pipeline

@app.get("/")
def read_root():
    return {"status": "ok", "message": "JARVIS Python Local AI Server running ✅"}

@app.post("/chat")
def chat(req: ChatRequest):
    ollama_url = "http://localhost:11434/api/chat"
    
    payload = {
        "model": req.model,
        "messages": [
            {"role": "system", "content": JARVIS_SYSTEM_PROMPT},
            {"role": "user", "content": req.message}
        ],
        "stream": False
    }
    
    try:
        response = requests.post(ollama_url, json=payload, timeout=60)
        if response.status_code == 200:
            result = response.json()
            reply = result.get("message", {}).get("content", "").strip()
            return {"reply": reply}
        else:
            raise HTTPException(
                status_code=500, 
                detail=f"Ollama server returned error status: {response.status_code}"
            )
    except requests.exceptions.RequestException:
        raise HTTPException(
            status_code=503, 
            detail="Ollama service is offline. Please make sure Ollama is installed and running ('ollama run llama3.2' or similar)."
        )

@app.post("/generate-image")
def generate_image(req: ImageRequest):
    try:
        pipeline = get_sd_pipeline()
        print(f"🎨 Generating image for prompt: '{req.prompt}'")
        
        # sd-turbo works with 1 step, but we can use 1 to 4 steps for optimal speed vs quality
        start_time = time.time()
        
        # Perform inference
        # Use 1 step for sd-turbo as designed
        result = pipeline(prompt=req.prompt, num_inference_steps=1, guidance_scale=0.0)
        image = result.images[0]
        
        # Ensure public directory exists
        output_dir = os.path.join("..", "public", "generated")
        os.makedirs(output_dir, exist_ok=True)
        
        # Save image with unique filename
        filename = f"gen_{uuid.uuid4().hex[:10]}.png"
        filepath = os.path.join(output_dir, filename)
        image.save(filepath)
        
        print(f"✅ Image generated and saved to {filepath} in {time.time() - start_time:.2f}s")
        return {"openUrl": f"/generated/{filename}", "reply": f"I have generated the image for you! See it below."}
        
    except Exception as e:
        print(f"❌ Error during image generation: {e}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
