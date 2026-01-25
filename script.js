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

    if (sender === "jarvis") {
        bubbleDiv.innerHTML = formatJarvisMessage(text);
    } else {
        bubbleDiv.textContent = text;
    }

    messageDiv.appendChild(bubbleDiv);
    chatContainer.appendChild(messageDiv);

    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (sender === "jarvis") {
        speakText(text);
    }
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