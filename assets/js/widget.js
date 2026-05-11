(function() {
    const container = document.getElementById('labupgrade-voice-widget');
    if (!container) return;

    const clientId = container.getAttribute('data-client-id');
    if (!clientId) {
        console.error('LabUpgrade Voice Widget: lipsește atributul data-client-id');
        return;
    }

    const style = document.createElement('style');
    style.textContent = `
        .lu-floating-ai-btn {
            position: fixed; bottom: 100px; right: 20px; width: 65px; height: 65px;
            border-radius: 50%; background-color: #00c853; color: #ffffff;
            border: none; cursor: pointer; z-index: 9999999 !important;
            display: flex; justify-content: center; align-items: center;
            box-shadow: 0 8px 32px rgba(0, 200, 83, 0.4);
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            pointer-events: auto !important; padding: 0; margin: 0; outline: none;
        }
        .lu-floating-ai-btn:hover {
            transform: translateY(-5px); box-shadow: 0 12px 40px rgba(0, 200, 83, 0.6);
        }
        .lu-floating-ai-btn svg { width: 28px; height: 28px; fill: currentColor; pointer-events: none; display: block; }
        
        .lu-floating-ai-btn.lu-connecting { background-color: #ffb300; animation: lu-pulse-yellow 1.5s infinite; }
        @keyframes lu-pulse-yellow { 0% { box-shadow: 0 0 0 0 rgba(255, 179, 0, 0.6); } 70% { box-shadow: 0 0 0 15px rgba(255, 179, 0, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 179, 0, 0); } }
        
        .lu-floating-ai-btn.lu-recording { background-color: #ff3d00; animation: lu-pulse-red 1.5s infinite; }
        @keyframes lu-pulse-red { 0% { box-shadow: 0 0 0 0 rgba(255, 61, 0, 0.6); } 70% { box-shadow: 0 0 0 20px rgba(255, 61, 0, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 61, 0, 0); } }
    `;
    document.head.appendChild(style);

    container.innerHTML = `
        <button class="lu-floating-ai-btn" id="lu-ai-call-btn" title="Apelează asistentul">
            <svg id="lu-ai-icon-phone" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.03 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
            </svg>
            <svg id="lu-ai-icon-close" style="display: none;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.52-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
            </svg>
        </button>
    `;

    let activeSocket = null;
    let activeAudioContext = null;
    let activeMediaStream = null;
    let activeProcessor = null;
    let nextPlayTime = 0;

    // 🟢 Предзагружаем гудок в фоне, чтобы он был готов мгновенно
    const ringtone = new Audio('https://labupgrade.ai/assets/images/video/gudok.mp3');
    ringtone.loop = true;
    ringtone.preload = 'auto';
    ringtone.load();

    const btn = document.getElementById('lu-ai-call-btn');
    const iconPhone = document.getElementById('lu-ai-icon-phone');
    const iconClose = document.getElementById('lu-ai-icon-close');

    function stopCall() {
        if (!ringtone.paused) {
            ringtone.pause();
            ringtone.currentTime = 0;
        }

        if (activeProcessor) { activeProcessor.disconnect(); activeProcessor = null; }
        if (activeMediaStream) { activeMediaStream.getTracks().forEach(t => t.stop()); activeMediaStream = null; }
        if (activeAudioContext) { activeAudioContext.close(); activeAudioContext = null; }
        if (activeSocket) { activeSocket.close(); activeSocket = null; }

        btn.classList.remove('lu-connecting', 'lu-recording');
        iconPhone.style.display = 'block';
        iconClose.style.display = 'none';
    }

    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (activeSocket) { stopCall(); return; }

        btn.classList.add('lu-connecting');

        try {
            activeMediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
            });

            activeAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            if (activeAudioContext.state === 'suspended') { await activeAudioContext.resume(); }

            activeSocket = new WebSocket(`wss://voice.labupgrade.in/ws?client_id=${clientId}`);
            activeSocket.binaryType = "arraybuffer";

            activeSocket.onopen = async () => {
                btn.classList.remove('lu-connecting');
                btn.classList.add('lu-recording');
                iconPhone.style.display = 'none';
                iconClose.style.display = 'block';

                // 🟢 Гудок стартует только ЗДЕСЬ, когда микрофон уже активен и сокет открыт
                ringtone.play().catch(err => console.log("Браузер заблокировал звук:", err));

                const source = activeAudioContext.createMediaStreamSource(activeMediaStream);
                activeProcessor = activeAudioContext.createScriptProcessor(4096, 1, 1);
                source.connect(activeProcessor);
                activeProcessor.connect(activeAudioContext.destination);

                activeProcessor.onaudioprocess = function(e) {
                    if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
                        const float32Array = e.inputBuffer.getChannelData(0);
                        
                        let maxAmplitude = 0;
                        for (let i = 0; i < float32Array.length; i++) {
                            let absVal = Math.abs(float32Array[i]);
                            if (absVal > maxAmplitude) maxAmplitude = absVal;
                        }
                        const threshold = 0.03; 
                        const isSpeaking = maxAmplitude > threshold;

                        const int16Array = new Int16Array(float32Array.length);
                        for (let i = 0; i < float32Array.length; i++) {
                            let s = isSpeaking ? Math.max(-1, Math.min(1, float32Array[i])) : 0;
                            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                        }
                        activeSocket.send(int16Array.buffer);
                    }
                };
                nextPlayTime = activeAudioContext.currentTime;
            };

            activeSocket.onmessage = async (event) => {
                // 🟢 Отключаем гудок ТОЛЬКО если прилетело бинарное аудио (голос ИИ)
                if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
                    if (!ringtone.paused) {
                        ringtone.pause();
                        ringtone.currentTime = 0;
                    }
                } else {
                    // Если пришел текст (например, пинг), игнорируем
                    return;
                }

                try {
                    if (!activeAudioContext) return;
                    const arrayBuffer = event.data instanceof Blob ? await event.data.arrayBuffer() : event.data;
                    const int16Array = new Int16Array(arrayBuffer);
                    const float32Array = new Float32Array(int16Array.length);
                    for (let i = 0; i < int16Array.length; i++) { float32Array[i] = int16Array[i] / 32768; }
                    
                    const buffer = activeAudioContext.createBuffer(1, float32Array.length, 24000);
                    buffer.getChannelData(0).set(float32Array);
                    const source = activeAudioContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(activeAudioContext.destination);

                    if (nextPlayTime < activeAudioContext.currentTime) { nextPlayTime = activeAudioContext.currentTime + 0.1; }
                    source.start(nextPlayTime);
                    nextPlayTime += buffer.duration;
                } catch (err) { console.error("Audio Decode Error:", err); }
            };

            activeSocket.onerror = () => { alert('Eroare de rețea!'); stopCall(); };
            activeSocket.onclose = () => { stopCall(); };

        } catch (err) {
            console.error("Microphone Error:", err);
            alert('Te rugăm să acorzi acces la microfon pentru a vorbi cu asistentul.');
            stopCall();
        }
    });
})();
