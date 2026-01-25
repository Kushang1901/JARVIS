const micButton = document.getElementById('micButton');
const statusText = document.getElementById('statusText');
const chatContainer = document.getElementById('chatContainer');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const pauseSpeechBtn = document.getElementById("pauseSpeechBtn");
const resumeSpeechBtn = document.getElementById("resumeSpeechBtn");
const stopSpeechBtn = document.getElementById("stopSpeechBtn");



const statuses = ['Idle', 'Listening…', 'Thinking…', 'Speaking…'];

let recognition;
let isListening = false;

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Speech Recognition not supported. Use Chrome or Edge.");
        return null;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
        isListening = true;
        micButton.classList.add("active");
        statusText.textContent = "Listening…";
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
        sendMessage(); // auto send
    };

    recognition.onerror = () => {
        statusText.textContent = "Idle";
        micButton.classList.remove("active");
        isListening = false;
    };

    recognition.onend = () => {
        statusText.textContent = "Idle";
        micButton.classList.remove("active");
        isListening = false;
    };

    return recognition;
}

initSpeechRecognition();

micButton.addEventListener("click", () => {
    if (!recognition) return;

    speechSynthesis.cancel(); 

    if (!isListening) recognition.start();
    else recognition.stop();
});


async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    addMessage(message, "user");
    chatInput.value = "";
    statusText.textContent = "Thinking…";

    try {
        const res = await fetch("https://jarvis-backend-dol8.onrender.com/ask", {

            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data?.error || "Something went wrong");
        }

        addMessage(data.reply, "jarvis");
        statusText.textContent = "Idle";

        // ✅ Open website if backend sends URL
        if (data.openUrl) {
            window.open(data.openUrl, "_blank");
        }

    } catch (err) {
        addMessage("⚠️ Server error: " + err.message, "jarvis");
        statusText.textContent = "Idle";
    }
}



function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[m]));
}

function formatJarvisMessage(text) {
    // Convert ```lang ... ``` blocks into <pre><code>
    const parts = text.split(/```/g);

    // If no code blocks, just return text with line breaks
    if (parts.length === 1) {
        return `<div class="msg-text">${escapeHtml(text).replace(/\n/g, "<br>")}</div>`;
    }

    let html = "";

    for (let i = 0; i < parts.length; i++) {
        const chunk = parts[i];

        if (i % 2 === 0) {
            // normal text
            if (chunk.trim() !== "") {
                html += `<div class="msg-text">${escapeHtml(chunk).replace(/\n/g, "<br>")}</div>`;
            }
        } else {
            // code block
            const lines = chunk.split("\n");
            const firstLine = lines[0].trim();
            const looksLikeLang = /^[a-zA-Z]+$/.test(firstLine);

            const code = looksLikeLang ? lines.slice(1).join("\n") : chunk;
            const lang = looksLikeLang ? firstLine.toLowerCase() : "";

            html += `
                <pre class="code-block"><code class="lang-${lang}">${escapeHtml(code)}</code></pre>
            `;
        }
    }

    return html;
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[m]));
}

function formatJarvisMessage(text) {
    // Convert ```lang ... ``` blocks into <pre><code>
    const parts = text.split(/```/g);

    // If no code blocks, just return text with line breaks
    if (parts.length === 1) {
        return `<div class="msg-text">${escapeHtml(text).replace(/\n/g, "<br>")}</div>`;
    }

    let html = "";

    for (let i = 0; i < parts.length; i++) {
        const chunk = parts[i];

        if (i % 2 === 0) {
            // normal text
            if (chunk.trim() !== "") {
                html += `<div class="msg-text">${escapeHtml(chunk).replace(/\n/g, "<br>")}</div>`;
            }
        } else {
            // code block
            const lines = chunk.split("\n");
            const firstLine = lines[0].trim();
            const looksLikeLang = /^[a-zA-Z]+$/.test(firstLine);

            const code = looksLikeLang ? lines.slice(1).join("\n") : chunk;
            const lang = looksLikeLang ? firstLine.toLowerCase() : "";

            html += `
                <pre class="code-block"><code class="lang-${lang}">${escapeHtml(code)}</code></pre>
            `;
        }
    }

    return html;
}

function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';

    messageDiv.appendChild(bubbleDiv);
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (sender === "jarvis") {
        typeWriterEffect(text, bubbleDiv);
        speakText(text);
    } else {
        bubbleDiv.textContent = text;
    }
}
// ✅ Typing Animation for Jarvis
function typeWriterEffect(text, element) {
    let index = 0;
    element.innerHTML = "";

    const speed = 25; // typing speed (ms)

    function type() {
        if (index < text.length) {
            element.innerHTML += escapeHtml(text.charAt(index));
            index++;

            chatContainer.scrollTop = chatContainer.scrollHeight;

            setTimeout(type, speed);
        }
    }

    type();
}




sendBtn.addEventListener('click', sendMessage);


chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});


clearBtn.addEventListener('click', () => {
    chatContainer.innerHTML = `
                <div class="message jarvis">
                    <div class="message-bubble">
                        Chat cleared. How may I assist you?
                    </div>
                </div>
            `;
});


let currentUtterance = null;

function speakText(text) {
    
    window.speechSynthesis.cancel();

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = "en-US";
    currentUtterance.rate = 1;
    currentUtterance.pitch = 1;

    statusText.textContent = "Speaking…";

    currentUtterance.onend = () => {
        statusText.textContent = "Idle";
        currentUtterance = null;
    };

    currentUtterance.onerror = () => {
        statusText.textContent = "Idle";
        currentUtterance = null;
    };

    window.speechSynthesis.speak(currentUtterance);
}

pauseSpeechBtn.addEventListener("click", () => {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        statusText.textContent = "Paused";
    }
});

resumeSpeechBtn.addEventListener("click", () => {
    if (speechSynthesis.paused) {
        speechSynthesis.resume();
        statusText.textContent = "Speaking…";
    }
});

stopSpeechBtn.addEventListener("click", () => {
    if (speechSynthesis.speaking || speechSynthesis.paused) {
        speechSynthesis.cancel();
        statusText.textContent = "Idle";
        currentUtterance = null;
    }
});

document.getElementById("year").textContent = new Date().getFullYear();


//system stats 

const latencyStat = document.getElementById("latencyStat");
const statusStat = document.getElementById("statusStat");
const uptimeStat = document.getElementById("uptimeStat");

let appStartTime = Date.now();

// Check Backend Status + Latency
async function updateSystemStats() {
    const start = performance.now();

    try {
        const res = await fetch("https://jarvis-backend-dol8.onrender.com/");

        const end = performance.now();
        const latency = Math.round(end - start);

        // Latency
        latencyStat.textContent = latency + " ms";

        // Status
        if (res.ok) {
            statusStat.textContent = "ONLINE";
            statusStat.classList.add("stat-online");
        } else {
            statusStat.textContent = "ERROR";
            statusStat.classList.remove("stat-online");
        }

    } catch (err) {
        latencyStat.textContent = "-- ms";
        statusStat.textContent = "OFFLINE";
        statusStat.classList.remove("stat-online");
    }

    // Uptime
    const uptimeMs = Date.now() - appStartTime;
    const uptimeHours = uptimeMs / (1000 * 60 * 60);
    const uptimePercent = Math.min(99.99, 95 + uptimeHours * 0.1);

    uptimeStat.textContent = uptimePercent.toFixed(2) + "%";
}

// Auto Update Every 10 Seconds
setInterval(updateSystemStats, 10000);

// Run on Load
updateSystemStats();

document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;

    const jarvisPanel = document.querySelector('.jarvis-panel');
    const chatPanel = document.querySelector('.chat-panel');

    if (window.innerWidth > 992) {
        jarvisPanel.style.transform = `translateZ(20px) rotateY(${x * 0.3}deg) rotateX(${-y * 0.3}deg)`;
        chatPanel.style.transform = `translateZ(10px) rotateY(${x * 0.2}deg) rotateX(${-y * 0.2}deg)`;
    }
});
