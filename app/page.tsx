"use client";

import React, { useState, useEffect, useRef } from "react";

interface Message {
    id: string;
    text: string;
    sender: "user" | "jarvis";
    time: string;
}

// Custom Message Bubble Component supporting Typewriter Effect, Markdown Images, and Actions
const MessageBubble = ({ 
    text, 
    sender, 
    isNew,
    onReplaySpeech
}: { 
    text: string; 
    sender: "user" | "jarvis"; 
    isNew?: boolean;
    onReplaySpeech: (t: string) => void;
}) => {
    const [displayedText, setDisplayedText] = useState(sender === "user" ? text : "");
    const [copied, setCopied] = useState(false);
    
    useEffect(() => {
        if (sender === "user" || !isNew) {
            setDisplayedText(text);
            return;
        }

        let i = 0;
        const interval = setInterval(() => {
            setDisplayedText(text.slice(0, i + 1));
            i++;
            if (i >= text.length) {
                clearInterval(interval);
            }
        }, 5); // Fast typing speed (5ms per char)

        return () => clearInterval(interval);
    }, [text, sender, isNew]);

    // Scroll chat container to bottom when text finishes typing
    useEffect(() => {
        const container = document.getElementById("chatContainer");
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, [displayedText]);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Parse text segments to render inline markdown images and text
    const parts = displayedText.split(/```/g);

    return (
        <div className="glass-bubble">
            {/* Inline Action Bar */}
            <div className="bubble-action-bar">
                <button className="bubble-action-btn" onClick={handleCopy} title="Copy to clipboard">
                    <i className={copied ? "fas fa-check text-success" : "far fa-copy"}></i>
                </button>
                <button className="bubble-action-btn" onClick={() => onReplaySpeech(text)} title="Read out loud">
                    <i className="fas fa-volume-up"></i>
                </button>
            </div>

            {sender === "jarvis" && <span className="prompt-icon">$</span>}
            
            {parts.map((chunk, index) => {
                if (index % 2 === 0) {
                    // Normal text segment
                    if (chunk.trim() === "" && parts.length > 1) return null;
                    
                    // Split chunk by image markdown: ![(alt)](url)
                    const subParts = [];
                    const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
                    let lastIndex = 0;
                    let match;
                    
                    while ((match = imgRegex.exec(chunk)) !== null) {
                        if (match.index > lastIndex) {
                            subParts.push({ type: "text", content: chunk.slice(lastIndex, match.index) });
                        }
                        subParts.push({ type: "image", alt: match[1], src: match[2] });
                        lastIndex = imgRegex.lastIndex;
                    }
                    if (lastIndex < chunk.length) {
                        subParts.push({ type: "text", content: chunk.slice(lastIndex) });
                    }
                    
                    return (
                        <React.Fragment key={index}>
                            {subParts.map((sub, sIdx) => {
                                if (sub.type === "image") {
                                    return (
                                        <div key={sIdx} className="generated-image-container">
                                            <img src={sub.src} alt={sub.alt} />
                                        </div>
                                    );
                                } else {
                                    return (
                                        <span key={sIdx} className="message-content">
                                            {sub.content!.split("\n").map((line, lineIdx, arr) => (
                                                <React.Fragment key={lineIdx}>
                                                    {line}
                                                    {lineIdx < arr.length - 1 && <br />}
                                                </React.Fragment>
                                            ))}
                                        </span>
                                    );
                                }
                            })}
                        </React.Fragment>
                    );
                } else {
                    // Code block segment
                    const lines = chunk.split("\n");
                    const firstLine = lines[0].trim();
                    const looksLikeLang = /^[a-zA-Z0-9#+-]+$/.test(firstLine);
                    const code = looksLikeLang ? lines.slice(1).join("\n") : chunk;
                    const lang = looksLikeLang ? firstLine.toLowerCase() : "";
                    
                    return (
                        <pre key={index} className="code-block">
                            <code className={`lang-${lang}`}>{code}</code>
                        </pre>
                    );
                }
            })}
        </div>
    );
};

export default function JarvisApp() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "greeting",
            text: "Hello! I'm JARVIS, your AI assistant. How may I assist you today?",
            sender: "jarvis",
            time: "SYSTEM",
        },
    ]);
    const [status, setStatus] = useState<string>("Idle");
    const [isListening, setIsListening] = useState<boolean>(false);
    const [inputValue, setInputValue] = useState<string>("");
    
    // Sliders & settings states
    const [temperature, setTemperature] = useState<number>(0.7);
    const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");
    
    // Voices list states
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
    const [speechRate, setSpeechRate] = useState<number>(1.05);
    const [speechPitch, setSpeechPitch] = useState<number>(0.9);

    // Stats states
    const [latency, setLatency] = useState<number | null>(null);
    const [systemStatus, setSystemStatus] = useState<string>("CHECKING");
    const [uptime, setUptime] = useState<number>(95.00);
    
    // Simulated Telemetry widget states
    const [simVram, setSimVram] = useState<number>(2.2);
    const [tokenSpeed, setTokenSpeed] = useState<number>(0);

    const jarvisPanelRef = useRef<HTMLDivElement>(null);
    const chatPanelRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const startTimeRef = useRef<number>(Date.now());

    // 1. Load TTS voices
    useEffect(() => {
        if (typeof window === "undefined" || !window.speechSynthesis) return;

        const loadVoices = () => {
            const list = window.speechSynthesis.getVoices();
            setVoices(list);
            
            // Prioritize Hindi voices (preferably Hemant or Madhur for that JARVIS male voice feel, or any Hindi voice), then fall back to English
            const autoSelect = list.find(v => 
                (v.lang.startsWith("hi") || v.lang.includes("hi-IN")) && 
                (v.name.toLowerCase().includes("madhur") || v.name.toLowerCase().includes("hemant"))
            ) || list.find(v => 
                v.lang.startsWith("hi") || 
                v.lang.includes("hi-IN") || 
                v.name.toLowerCase().includes("hindi")
            ) || list.find(v => 
                v.name.includes("Natural") || 
                v.name.includes("Google") || 
                v.name.includes("English") ||
                v.lang.startsWith("en")
            );
            
            if (autoSelect && !selectedVoiceName) {
                setSelectedVoiceName(autoSelect.name);
            }
        };

        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, [selectedVoiceName]);

    // 2. Mouse move parallax effect
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (window.innerWidth > 992) {
                const x = (e.clientX / window.innerWidth - 0.5) * 20;
                const y = (e.clientY / window.innerHeight - 0.5) * 20;

                if (jarvisPanelRef.current) {
                    jarvisPanelRef.current.style.transform = `translateZ(15px) rotateY(${x * 0.25}deg) rotateX(${-y * 0.25}deg)`;
                }
                if (chatPanelRef.current) {
                    chatPanelRef.current.style.transform = `translateZ(10px) rotateY(${x * 0.15}deg) rotateX(${-y * 0.15}deg)`;
                }
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    // 3. System Stats Updater
    useEffect(() => {
        const updateSystemStats = async () => {
            const start = performance.now();
            try {
                const res = await fetch("/api/status");
                const end = performance.now();
                const currentLatency = Math.round(end - start);
                setLatency(currentLatency);

                if (res.ok) {
                    const data = await res.json();
                    if (data.status === "ok") {
                        setSystemStatus(data.mode === "cloud" ? "CLOUD" : "ONLINE");
                    } else {
                        setSystemStatus("OFFLINE");
                    }
                } else {
                    setSystemStatus("ERROR");
                }
            } catch (err) {
                setLatency(null);
                setSystemStatus("OFFLINE");
            }

            // Uptime simulation (starts at 95% + increments)
            const uptimeMs = Date.now() - startTimeRef.current;
            const uptimeHours = uptimeMs / (1000 * 60 * 60);
            const uptimePercent = Math.min(99.99, 95 + uptimeHours * 0.05);
            setUptime(uptimePercent);
            
            // Random simulated VRAM oscillation
            setSimVram(parseFloat((2.1 + Math.random() * 0.4).toFixed(2)));
        };

        updateSystemStats();
        const interval = setInterval(updateSystemStats, 10000);

        return () => clearInterval(interval);
    }, []);

    // 4. Speech Recognition Setup
    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = 
                (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                const rec = new SpeechRecognition();
                // Set language to Hindi to allow talking in Hindi/Hinglish
                rec.lang = "hi-IN";
                rec.interimResults = false;
                rec.continuous = false;

                rec.onstart = () => {
                    setIsListening(true);
                    setStatus("Listening");
                };

                rec.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setInputValue(transcript);
                    sendMessage(transcript);
                };

                rec.onerror = () => {
                    setStatus("Idle");
                    setIsListening(false);
                };

                rec.onend = () => {
                    setStatus("Idle");
                    setIsListening(false);
                };

                recognitionRef.current = rec;
            }
        }
    }, [selectedModel]);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Speech Recognition is not supported in this browser. Please use Chrome or Edge.");
            return;
        }

        window.speechSynthesis.cancel();

        if (!isListening) {
            recognitionRef.current.start();
        } else {
            recognitionRef.current.stop();
        }
    };

    // 5. Text-to-Speech (TTS) Synthesis
    const speakText = (text: string) => {
        if (typeof window === "undefined" || !window.speechSynthesis) return;

        window.speechSynthesis.cancel();

        // Strip code snippets out before reading aloud for cleaner pronunciation
        const cleanText = text.replace(/```[\s\S]*?```/g, "[Code block]").trim();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // Find and select voice
        const activeVoice = voices.find(v => v.name === selectedVoiceName);
        if (activeVoice) {
            utterance.voice = activeVoice;
        }
        
        utterance.rate = speechRate;
        utterance.pitch = speechPitch;

        setStatus("Speaking");

        utterance.onend = () => {
            setStatus("Idle");
            currentUtteranceRef.current = null;
        };

        utterance.onerror = () => {
            setStatus("Idle");
            currentUtteranceRef.current = null;
        };

        currentUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    const pauseSpeech = () => {
        if (typeof window !== "undefined" && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            setStatus("Paused");
        }
    };

    const resumeSpeech = () => {
        if (typeof window !== "undefined" && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            setStatus("Speaking");
        }
    };

    const stopSpeech = () => {
        if (typeof window !== "undefined" && (window.speechSynthesis.speaking || window.speechSynthesis.paused)) {
            window.speechSynthesis.cancel();
            setStatus("Idle");
            currentUtteranceRef.current = null;
        }
    };

    // 6. Send Message Function
    const sendMessage = async (messageText: string) => {
        const text = messageText.trim();
        if (!text) return;

        setInputValue("");
        
        const userMsg: Message = {
            id: `msg_${Date.now()}_u`,
            text,
            sender: "user",
            time: new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
            }),
        };

        setMessages((prev) => [...prev, userMsg]);
        setStatus("Thinking");
        setTokenSpeed(0);

        try {
            const start = performance.now();
            const res = await fetch("/api/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    message: text,
                    model: selectedModel,
                    temperature: temperature
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || "Something went wrong");
            }

            const elapsed = (performance.now() - start) / 1000;
            const replyLength = data.reply.split(/\s+/).length;
            const generatedSpeed = Math.round(replyLength / elapsed);
            setTokenSpeed(Math.min(120, generatedSpeed || 42));

            const jarvisMsg: Message = {
                id: `msg_${Date.now()}_j`,
                text: data.reply,
                sender: "jarvis",
                time: new Date().toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            };

            setMessages((prev) => [...prev, jarvisMsg]);
            setStatus("Idle");

            if (data.openUrl && !data.openUrl.startsWith("data:")) {
                window.open(data.openUrl, "_blank");
            }

            speakText(data.reply);

        } catch (err: any) {
            const errorMsg: Message = {
                id: `msg_${Date.now()}_err`,
                text: "⚠️ Server error: " + err.message,
                sender: "jarvis",
                time: new Date().toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            };
            setMessages((prev) => [...prev, errorMsg]);
            setStatus("Idle");
        }
    };

    const handleSend = () => {
        sendMessage(inputValue);
    };

    const clearChat = () => {
        setMessages([
            {
                id: "cleared_greeting",
                text: "Chat cleared. How may I assist you?",
                sender: "jarvis",
                time: "SYSTEM",
            },
        ]);
        stopSpeech();
        setTokenSpeed(0);
    };

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Active state classes for holographic panel core
    const getCoreStateClass = () => {
        switch (status.toLowerCase()) {
            case "listening": return "state-listening";
            case "thinking": return "state-thinking";
            case "speaking": return "state-speaking";
            default: return "state-idle";
        }
    };

    return (
        <>
            {/* Immersive Cyber Mesh */}
            <div className="bg-grid-mesh"></div>
            <div className="bg-aurora-glow"></div>

            <div className="app-container">
                {/* Header Banner */}
                <header className="app-header">
                    <div className="app-title-container">
                        <div className="app-logo-glow"></div>
                        <h1 className="app-title">JARVIS Cybernetic Terminal</h1>
                    </div>
                    <div className="widget-subtitle">COCKPIT_HUD_V2.0</div>
                </header>

                <div className="main-dashboard-grid">
                    
                    {/* Left Hand: Console Center Panel */}
                    <div className="console-center-panel">
                        
                        {/* Core Visual Display Card */}
                        <div className={`glass-widget hologram-display-card ${getCoreStateClass()}`} ref={jarvisPanelRef}>
                            <div className="widget-header" style={{ position: "absolute", top: "15px", width: "calc(100% - 48px)" }}>
                                <div className="widget-title">
                                    <i className="fas fa-microchip"></i> Holographic Core
                                </div>
                                <div className="widget-subtitle">{status.toUpperCase()}</div>
                            </div>

                            {/* Viewport Core Orb */}
                            <div className="hologram-viewport">
                                <div className="holo-hud-data top-left">RAD: 120m<br/>FRQ: 4.8Ghz</div>
                                <div className="holo-hud-data top-right">INF: SECURE<br/>MEM: {simVram}GB</div>
                                <div className="holo-hud-data bottom-left">SYS: ACTIVE<br/>CPU: 14%</div>
                                <div className="holo-hud-data bottom-right">STATE: {status.toUpperCase()}</div>
                                <div className="laser-scanner-line"></div>
                                <div className="holo-ring outer"></div>
                                <div className="holo-ring inner"></div>
                                <div className="holo-ring horizontal"></div>
                                <div className="holo-orb"></div>
                            </div>

                            {/* Dynamic state equalizer waves */}
                            <div className="dynamic-equalizer-stream">
                                <div className="eq-bar"></div>
                                <div className="eq-bar"></div>
                                <div className="eq-bar"></div>
                                <div className="eq-bar"></div>
                                <div className="eq-bar"></div>
                                <div className="eq-bar"></div>
                                <div className="eq-bar"></div>
                                <div className="eq-bar"></div>
                            </div>

                            {/* Stats overlay inside core card */}
                            <div className="audio-hud-float" style={{ position: "absolute", bottom: "15px" }}>
                                <button className="audio-btn-circle" onClick={pauseSpeech} title="Pause playback">
                                    <i className="fas fa-pause"></i>
                                </button>
                                <button className="audio-btn-circle" onClick={resumeSpeech} title="Resume playback">
                                    <i className="fas fa-play"></i>
                                </button>
                                <button className="audio-btn-circle danger" onClick={stopSpeech} title="Stop playback">
                                    <i className="fas fa-stop"></i>
                                </button>
                            </div>
                        </div>

                        {/* Interactive Settings Dashboard Panel */}
                        <div className="glass-widget">
                            <div className="widget-header">
                                <div className="widget-title">
                                    <i className="fas fa-sliders-h"></i> Telemetry & Voice Tuning
                                </div>
                            </div>

                            <div className="control-grid-layout">
                                <div>
                                    <label className="cyber-label">Core LLM Model</label>
                                    <select 
                                        className="cyber-select" 
                                        value={selectedModel} 
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                    >
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Cloud)</option>
                                        <option value="gemini-3.5-flash">Gemini 3.5 Flash (Cloud)</option>
                                        <option value="llama3.2">Llama 3.2 3B (Local)</option>
                                        <option value="llama3">Llama 3 8B (Local)</option>
                                        <option value="mistral">Mistral 7B (Local)</option>
                                        <option value="phi3">Phi-3 3.8B (Local)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="cyber-label">Synthetic Voice</label>
                                    <select 
                                        className="cyber-select" 
                                        value={selectedVoiceName}
                                        onChange={(e) => setSelectedVoiceName(e.target.value)}
                                    >
                                        {voices.length === 0 ? (
                                            <option>Loading Voices...</option>
                                        ) : (
                                            voices.map((v, idx) => (
                                                <option key={idx} value={v.name}>
                                                    {v.name.replace(/Microsoft|Google/g, "").slice(0, 24)} ({v.lang.split("-")[0]})
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="control-grid-layout" style={{ marginTop: "16px" }}>
                                <div className="cyber-slider-container">
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <label className="cyber-label">Creativity (Temp)</label>
                                        <span className="cyber-subtitle">{temperature}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="1" 
                                        step="0.1" 
                                        className="cyber-slider" 
                                        value={temperature}
                                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="cyber-slider-container">
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <label className="cyber-label">Voice Speed (Rate)</label>
                                        <span className="cyber-subtitle">{speechRate}x</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0.5" 
                                        max="2" 
                                        step="0.1" 
                                        className="cyber-slider" 
                                        value={speechRate}
                                        onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>

                            {/* Interactive simulation dials */}
                            <div className="telemetry-dials-row">
                                <div className="dial-card">
                                    <div className="dial-label">Token Speed</div>
                                    <div className="dial-value">{tokenSpeed > 0 ? `${tokenSpeed} T/s` : "0 T/s"}</div>
                                </div>
                                <div className="dial-card">
                                    <div className="dial-label">VRAM usage</div>
                                    <div className="dial-value">{simVram} GB</div>
                                </div>
                                <div className="dial-card">
                                    <div className="dial-label">Latency</div>
                                    <div className="dial-value">{latency !== null ? `${latency} ms` : "-- ms"}</div>
                                </div>
                            </div>
                        </div>

                        {/* Uptime and connection HUD row */}
                        <div className="console-stats-row">
                            <div className="stat-glass-card">
                                <span className="stat-title">Status</span>
                                <span className={`stat-num ${systemStatus === "ONLINE" || systemStatus === "CLOUD" ? "active" : ""}`}>
                                    {systemStatus}
                                </span>
                                <div className={`stat-glow-marker ${systemStatus === "ONLINE" || systemStatus === "CLOUD" ? "online" : ""}`}></div>
                            </div>
                            <div className="stat-glass-card">
                                <span className="stat-title">Core Uptime</span>
                                <span className="stat-num">{uptime.toFixed(3)}%</span>
                            </div>
                            <div className="stat-glass-card">
                                <span className="stat-title">Port</span>
                                <span className="stat-num">3000 / 8000</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Hand: Cyber-Chat Log Terminal */}
                    <div className="glass-widget chat-panel-container" ref={chatPanelRef}>
                        <div className="widget-header">
                            <div className="widget-title">
                                <i className="fas fa-terminal"></i> Command Terminal
                            </div>
                            <button className="clear-btn" onClick={clearChat} title="Clear command history">
                                <i className="fas fa-trash-alt"></i> Clear
                            </button>
                        </div>

                        {/* Interactive Chat Messages */}
                        <div className="cyber-chat-log" id="chatContainer" ref={chatContainerRef}>
                            {messages.map((msg, index) => (
                                <div key={msg.id} className={`message-card ${msg.sender}`}>
                                    <div className="message-header-line">
                                        <span className="message-sender">
                                            {msg.sender === "jarvis" ? "JARVIS@AI" : "USER@CLIENT"}
                                        </span>
                                        <span className="message-timestamp">[{msg.time}]</span>
                                    </div>
                                    <MessageBubble 
                                        text={msg.text} 
                                        sender={msg.sender} 
                                        isNew={index === messages.length - 1}
                                        onReplaySpeech={speakText}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Dock input Console */}
                        <div className="console-input-dock">
                            <span className="console-prompt-marker">&gt;</span>
                            <input 
                                type="text"
                                className="console-textbox"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                                placeholder="Query local model or generate images..."
                            />
                            
                            <div className="input-dock-actions">
                                <button 
                                    className={`cyber-dock-btn ${isListening ? "active" : ""}`}
                                    onClick={toggleListening}
                                    title="Toggle audio capture"
                                >
                                    <i className="fas fa-microphone"></i>
                                </button>
                                <button 
                                    className="cyber-dock-btn" 
                                    onClick={handleSend}
                                    title="Submit transaction"
                                >
                                    <i className="fas fa-paper-plane"></i>
                                </button>
                            </div>
                        </div>

                        <footer className="console-footer">
                            © {new Date().getFullYear()} JARVIS Core Engine. Developed by{" "}
                            <a href="https://kushangacharya.vercel.app" target="_blank" rel="noopener noreferrer">
                                Kushang Acharya
                            </a>
                        </footer>
                    </div>

                </div>
            </div>
        </>
    );
}
