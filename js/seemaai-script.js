function escapeHTML(texto) {
    const div = document.createElement("div");
    div.innerText = texto;
    return div.innerHTML;
}

const textarea = document.getElementById("mensaje");

textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
});

const btnSendMessage = document.getElementById('btn-send-message');

btnSendMessage.addEventListener("click", function () {
    enviarMensaje();
    iconSending.classList.add("oculto");
    iconStop.classList.remove("oculto");
});

btnSendMessage.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        if (!iconStop.classList.contains("oculto")) {
            e.preventDefault();
            iconStop.click();
            textarea.focus();
        }
    }
});

textarea.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();

        enviarMensaje();
    }
});

const chat = document.getElementById("chat");
const gradient = document.getElementById("chat-gradient");

chat.addEventListener('scroll', () => {
    const shouldShow = chat.scrollTop > 10;
    gradient.style.opacity = shouldShow ? "1" : "0";
});

const iconSending = document.getElementById("icon-sending");
const iconStop = document.getElementById("icon-stop");

iconStop.addEventListener("click", cancelarPeticion);
iconStop.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        iconStop.click();
        textarea.focus();
    }
});


let currentAbortController = null;
let currentThinkingMessage = null;

async function enviarMensaje() {
    const messageText = textarea.value.trim();
    document.getElementById("initial-warning").style.display = "none";

    if (messageText !== "") {

        const newMessage = document.createElement("div");
        newMessage.className = "message";

        const safeText = escapeHTML(messageText);

        const formattedMessage = safeText.replace(/\n/g, "<br>");

        newMessage.innerHTML = formattedMessage

        iconSending.classList.add("oculto");
        iconStop.classList.remove("oculto");
        document.querySelector(".chat-messages").appendChild(newMessage);

        if (currentAbortController) {
            currentAbortController.abort();
        }

        const controller = new AbortController();
        currentAbortController = controller;

        const thinkingMessage = document.createElement("p");
        thinkingMessage.className = "thinking";
        currentThinkingMessage = thinkingMessage;

        document.querySelector(".chat-messages").appendChild(thinkingMessage);

        const alt = Math.random();

        if (alt <= 0.25) {
            thinkingMessage.innerHTML = '<i class="ri-brain-2-line"></i> Analizando la respuesta';
        } else if (alt <= 0.5) {
            thinkingMessage.innerHTML = '<i class="ri-brain-2-line"></i> Conectando ideas';
        } else if (alt <= 0.75) {
            thinkingMessage.innerHTML = '<i class="ri-brain-2-line"></i> Reflexionando';
        } else {
            thinkingMessage.innerHTML = '<i class="ri-brain-2-line"></i> Ordenando los pensamientos';
        }


        textarea.value = "";
        textarea.style.height = "auto";

        chat.scrollTop = chat.scrollHeight;

        try {
            const response = await fetch("https://testserver-575l.onrender.com/webhook/aitest", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    mensaje: messageText,
                    sessionId: obtenerUsuarioID()
                }),
                signal: controller.signal
            });

            const data = await response.json();

            // Eliminar mensaje de espera
            if (currentThinkingMessage) {
                currentThinkingMessage.remove();
                currentThinkingMessage = null;
            }

            // Crear respuesta IA
            const aiResponse = document.createElement("div");
            aiResponse.className = "ai-response";

            const icon = document.createElement("i");
            icon.className = "ri-brain-2-line";
            icon.style.fontWeight = "normal";

            const p = document.createElement("p");
            p.className = "ai-answer";

            const copyIcon = document.createElement("i");
            copyIcon.className = "ri-file-copy-line";
            copyIcon.style.fontWeight = "normal";

            // Inserta el texto seguro, preservando saltos de línea
            p.innerHTML = escapeHTML(data.respuesta || "Lo siento, no entendí.").replace(/\n/g, "<br>");

            aiResponse.appendChild(icon);
            aiResponse.appendChild(p);
            p.appendChild(copyIcon)

            document.querySelector(".chat-messages").appendChild(aiResponse);

            // Scroll hacia abajo nuevamente
            chat.scrollTop = chat.scrollHeight;

            iconSending.classList.remove("oculto");
            iconStop.classList.add("oculto");

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log("Solicitud cancelada por el usuario.")
            } else {
                if (currentThinkingMessage) {
                    currentThinkingMessage.className = "thinking-error";
                    currentThinkingMessage.innerHTML = '<i class="ri-error-warning-line"></i> Ocurrió un error, intenta de nuevo.';
                    currentThinkingMessage = null;
                }
                console.error("Error al conectar con el servidor:", error);
            }

            iconStop.classList.add("oculto");
            iconSending.classList.remove("oculto");
        }
    }
};

//Lógica de copiado de mensaje
document.querySelector(".chat-messages").addEventListener("click", function (e) {
    if (e.target.classList.contains("ri-file-copy-line")) {
        const pElement = e.target.closest(".ai-answer");
        if (!pElement) return;

        const textToCopy = pElement.textContent.trim(); // ← más compatible en móvil
        const parent = e.target.closest(".ai-response");
        const iconBrain = parent?.querySelector(".ri-brain-2-line");

        // Aseguramos foco para algunos navegadores móviles
        e.target.focus();

        navigator.clipboard.writeText(textToCopy).then(() => {
            const copiedMsg = document.createElement("span");
            copiedMsg.className = "copied";
            copiedMsg.innerHTML = '<i class="ri-check-line"></i> Copiado';

            if (parent && iconBrain) {
                iconBrain.insertAdjacentElement("afterend", copiedMsg);

                setTimeout(() => {
                    copiedMsg.style.animation = "slideLeft 0.3s ease-in-out forwards";
                    setTimeout(() => copiedMsg.remove(), 1000);
                }, 2000);
            }
        }).catch(err => {
            console.error("Error al copiar al portapapeles:", err);
            alert("Tu navegador no permite copiar automáticamente. Intenta mantener presionado el texto.");
        });
    }
});


function cancelarPeticion() {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }

    if (currentThinkingMessage) {
        currentThinkingMessage.className = "thinking-error"
        currentThinkingMessage.innerHTML = '<i class="ri-brain-2-line"></i> Petición cancelada por el usuario.';
        currentThinkingMessage = null;
    }

    requestAnimationFrame(() => {
        iconStop.classList.add("oculto");
        iconSending.classList.remove("oculto");
    });

    textarea.focus();
};

function obtenerUsuarioID() {
    const idGuardado = localStorage.getItem("usuario_id");

    if (idGuardado) {
        return idGuardado;
    } else {
        const nuevoID = crypto.randomUUID(); // genera un UUID único  
        localStorage.setItem("usuario_id", nuevoID);
        return nuevoID;
    }
}

//En mobile detectar cuando el teclado está abierto
let initialInnerHeight = window.innerHeight;

const chatContainer = document.querySelector('.chat-container');
const inputContainer = document.querySelector('.chat-input');
const mensajeInput = document.getElementById('mensaje');

mensajeInput.addEventListener('focus', () => {
    setTimeout(() => {
        const keyboardIsLikelyOpen = window.innerHeight < initialInnerHeight * 0.75;

        if (keyboardIsLikelyOpen) {
            chatContainer.style.height = '60vh';
            setTimeout(() => {
                chat.scrollTop = chat.scrollHeight;
            }, 100);
        }
    }, 300); // espera que se active el teclado
});

mensajeInput.addEventListener('blur', () => {
    chatContainer.style.height = '90vh';
});
