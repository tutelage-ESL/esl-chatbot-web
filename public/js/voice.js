document.addEventListener('DOMContentLoaded', () => {
    const startRecognitionBtn = document.getElementById('start-recognition');
    const stopRecognitionBtn = document.getElementById('stop-recognition');
    const recognizedTextElem = document.getElementById('recognized-text');
    const assistantResponseElem = document.getElementById('assistant-response');

    let recognition;
    let isRecognizing = false;

    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false; // Set to true for continuous recognition
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isRecognizing = true;
            startRecognitionBtn.disabled = true;
            stopRecognitionBtn.disabled = false;
            recognizedTextElem.textContent = 'Listening...';
            assistantResponseElem.textContent = '';
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            recognizedTextElem.textContent = finalTranscript || interimTranscript;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            recognizedTextElem.textContent = `Error: ${event.error}`;
            isRecognizing = false;
            startRecognitionBtn.disabled = false;
            stopRecognitionBtn.disabled = true;
        };

        recognition.onend = () => {
            isRecognizing = false;
            startRecognitionBtn.disabled = false;
            stopRecognitionBtn.disabled = true;
            const finalTranscript = recognizedTextElem.textContent;
            if (finalTranscript && finalTranscript !== 'Listening...') {
                // Send the recognized text to the server for processing
                sendVoiceMessage(finalTranscript);
            }
        };

        startRecognitionBtn.addEventListener('click', () => {
            if (!isRecognizing) {
                recognition.start();
            }
        });

        stopRecognitionBtn.addEventListener('click', () => {
            if (isRecognizing) {
                recognition.stop();
            }
        });

    } else {
        recognizedTextElem.textContent = 'Speech Recognition Not Supported in this Browser.';
        startRecognitionBtn.disabled = true;
        stopRecognitionBtn.disabled = true;
    }

    async function sendVoiceMessage(message) {
        try {
            const response = await fetch('/api/voice-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });
            const data = await response.json();
            if (data.success) {
                assistantResponseElem.textContent = data.response;
            } else {
                assistantResponseElem.textContent = `Error: ${data.message}`;
            }
        } catch (error) {
            console.error('Error sending voice message:', error);
            assistantResponseElem.textContent = 'Error communicating with server.';
        }
    }
});