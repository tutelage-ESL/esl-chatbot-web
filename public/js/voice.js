document.addEventListener('DOMContentLoaded', () => {
    const startRecognitionBtn = document.getElementById('start-recognition');
    const stopRecognitionBtn = document.getElementById('stop-recognition');
    const recognizedTextElem = document.getElementById('recognized-text');
    const assistantResponseElem = document.getElementById('assistant-response');
    const speakResponseBtn = document.getElementById('speak-response-btn');
    const voiceStatusElem = document.getElementById('voice-status');
    const testApiBtn = document.getElementById('test-api');
    const autoSpeakCheckbox = document.getElementById('auto-speak');
    const voiceSpeedSlider = document.getElementById('voice-speed');
    const speedValueDisplay = document.getElementById('speed-value');
    const autoSpeakIndicator = document.getElementById('auto-speak-indicator');
    const testVoiceBtn = document.getElementById('test-voice');

    let recognition;
    let isRecognizing = false;
    let speechSynthesis = window.speechSynthesis;
    let currentUtterance = null;
    let voicesLoaded = false;
    
    // Load voices when available
    function loadVoices() {
        const voices = speechSynthesis.getVoices();
        console.log('Available voices:', voices.length);
        
        if (voices.length > 0) {
            voicesLoaded = true;
            console.log('Voices loaded successfully');
            
            // Log some voice details for debugging
            voices.forEach((voice, index) => {
                console.log(`Voice ${index}: ${voice.name} (${voice.lang}) - Quality: ${voice.localService ? 'High' : 'Network'}`);
            });
        }
    }
    
    // Load voices on page load and when they change
    if ('speechSynthesis' in window) {
        loadVoices();
        speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Initialize voice status
    updateVoiceStatus('Ready to listen', 'ready');

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognition = new (window.webkitSpeechRecognition || window.SpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;
        
        // Make recognition more sensitive
        recognition.grammars = new (window.webkitSpeechGrammarList || window.SpeechGrammarList)();
        
        // Add timeout settings to prevent premature no-speech errors
        if (recognition.serviceURI) {
            recognition.serviceURI = recognition.serviceURI + '&interim=true';
        }

        recognition.onstart = () => {
            isRecognizing = true;
            startRecognitionBtn.disabled = true;
            stopRecognitionBtn.disabled = false;
            startRecognitionBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> Listening...';
            stopRecognitionBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
            recognizedTextElem.textContent = '';
            assistantResponseElem.textContent = '';
            updateVoiceStatus('Listening... Speak now!', 'listening');
            
            // Set a minimum listening time to prevent premature stopping
            recognition.startTime = Date.now();
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
            
            const displayText = finalTranscript || interimTranscript;
            recognizedTextElem.textContent = displayText;
            
            if (interimTranscript) {
                updateVoiceStatus('Processing speech...', 'processing');
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            let errorMessage = 'Speech recognition error';
            
            switch(event.error) {
                case 'no-speech':
                    errorMessage = 'No speech detected. Speak clearly and try again. Make sure your microphone is working.';
                    // Auto-restart recognition after a brief delay for no-speech errors
                    setTimeout(() => {
                        if (!recognition || recognition.state === 'inactive') {
                            updateVoiceStatus('Ready to listen again', 'ready');
                        }
                    }, 2000);
                    break;
                case 'audio-capture':
                    errorMessage = 'Microphone not accessible. Please check permissions and ensure no other app is using it.';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone access denied. Please allow microphone access and refresh the page.';
                    break;
                case 'network':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
                case 'aborted':
                    errorMessage = 'Speech recognition was stopped.';
                    break;
                default:
                    errorMessage = `Speech recognition error: ${event.error}. Please try again.`;
            }
            
            recognizedTextElem.textContent = errorMessage;
            updateVoiceStatus(errorMessage, 'error');
            resetButtons();
        };

        recognition.onend = () => {
            console.log('Speech recognition ended');
            const finalTranscript = recognizedTextElem.textContent;
            const listeningTime = Date.now() - (recognition.startTime || 0);
            resetButtons();
            
            if (finalTranscript && 
                finalTranscript !== 'Listening...' && 
                !finalTranscript.includes('Error:') &&
                !finalTranscript.includes('No speech') &&
                !finalTranscript.includes('Microphone') &&
                !finalTranscript.includes('Network')) {
                updateVoiceStatus('Processing your message...', 'processing');
                sendVoiceMessage(finalTranscript);
            } else if (!finalTranscript || finalTranscript === 'Listening...') {
                // If listening time was very short, it might be a technical issue
                if (listeningTime < 1000) {
                    updateVoiceStatus('Recognition stopped too quickly. Please try again and speak clearly.', 'error');
                } else {
                    updateVoiceStatus('No speech detected. Please speak clearly and try again.', 'error');
                }
                setTimeout(() => updateVoiceStatus('Ready to listen', 'ready'), 3000);
            }
        };

        startRecognitionBtn.addEventListener('click', () => {
            if (!isRecognizing) {
                try {
                    recognition.start();
                } catch (error) {
                    console.error('Error starting recognition:', error);
                    updateVoiceStatus('Failed to start listening. Please try again.', 'error');
                }
            }
        });

        stopRecognitionBtn.addEventListener('click', () => {
            if (isRecognizing) {
                recognition.stop();
            }
        });

    } else {
        recognizedTextElem.textContent = 'Speech Recognition not supported in this browser. Please use Chrome, Edge, or Safari.';
        startRecognitionBtn.disabled = true;
        stopRecognitionBtn.disabled = true;
        updateVoiceStatus('Speech recognition not supported', 'error');
    }

    // Text-to-speech functionality
    if (speakResponseBtn) {
        speakResponseBtn.addEventListener('click', () => {
            const responseText = assistantResponseElem.textContent;
            if (responseText && responseText.trim()) {
                speakText(responseText);
            }
        });
    }
    
    // Test API button
    if (testApiBtn) {
        testApiBtn.addEventListener('click', async () => {
            console.log('Testing API connection...');
            updateVoiceStatus('Testing API connection...', 'processing');
            
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message: 'Hello, this is a test message.' }),
                });
                
                console.log('Test API response status:', response.status);
                console.log('Test API response headers:', response.headers);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Test API response data:', data);
                
                assistantResponseElem.textContent = `API Test Successful: ${data.response}`;
                updateVoiceStatus('API test completed successfully!', 'success');
                
            } catch (error) {
                console.error('API test failed:', error);
                assistantResponseElem.textContent = `API Test Failed: ${error.message}`;
                updateVoiceStatus('API test failed. Check console for details.', 'error');
            }
        });
    }
    
    // Voice settings controls
    if (voiceSpeedSlider && speedValueDisplay) {
        voiceSpeedSlider.addEventListener('input', () => {
            const speed = parseFloat(voiceSpeedSlider.value);
            speedValueDisplay.textContent = speed.toFixed(1);
        });
    }
    
    // Auto-speak checkbox
    if (autoSpeakCheckbox && autoSpeakIndicator) {
        autoSpeakCheckbox.addEventListener('change', () => {
            const isEnabled = autoSpeakCheckbox.checked;
            console.log('Auto-speak setting changed:', isEnabled);
            
            if (isEnabled) {
                autoSpeakIndicator.textContent = ' (Enabled)';
                autoSpeakIndicator.className = 'text-success';
            } else {
                autoSpeakIndicator.textContent = ' (Disabled)';
                autoSpeakIndicator.className = 'text-muted';
            }
        });
    }
    
    // Test voice button
    if (testVoiceBtn) {
        testVoiceBtn.addEventListener('click', () => {
            console.log('Testing voice synthesis...');
            const testMessage = 'Hello! This is a test of the voice synthesis system. Can you hear me?';
            speakText(testMessage);
        });
    }

    function getBestVoice() {
        const voices = speechSynthesis.getVoices();
        
        // Priority order for better quality voices
        const preferredVoices = [
            // High-quality English voices (usually local/system voices)
            'Microsoft Zira - English (United States)',
            'Microsoft David - English (United States)', 
            'Microsoft Mark - English (United States)',
            'Google US English',
            'Alex', // macOS
            'Samantha', // macOS
            'Karen', // macOS
            'Daniel', // macOS
            // Fallback to any English voice
            voices.find(v => v.lang === 'en-US' && v.localService),
            voices.find(v => v.lang === 'en-GB' && v.localService),
            voices.find(v => v.lang.startsWith('en-') && v.localService),
            voices.find(v => v.lang === 'en-US'),
            voices.find(v => v.lang === 'en-GB'),
            voices.find(v => v.lang.startsWith('en-'))
        ];
        
        for (const preferred of preferredVoices) {
            if (typeof preferred === 'string') {
                const voice = voices.find(v => v.name === preferred);
                if (voice) {
                    console.log('Selected high-quality voice:', voice.name);
                    return voice;
                }
            } else if (preferred) {
                console.log('Selected voice:', preferred.name);
                return preferred;
            }
        }
        
        console.log('Using default voice');
        return null;
    }

    function speakText(text) {
        if (!('speechSynthesis' in window)) {
            console.error('Speech synthesis not supported');
            alert('Text-to-speech is not supported in your browser.');
            return;
        }

        console.log('Starting speech synthesis...');
        console.log('Available voices:', speechSynthesis.getVoices().length);
        
        // Stop any current speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Use user's preferred speed setting
        const speed = voiceSpeedSlider ? parseFloat(voiceSpeedSlider.value) : 1.0;
        utterance.rate = speed;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';
        
        // Use the best available voice
        const bestVoice = getBestVoice();
        if (bestVoice) {
            utterance.voice = bestVoice;
            console.log('Using high-quality voice:', bestVoice.name, '- Local:', bestVoice.localService);
        }

        currentUtterance = utterance;

        utterance.onstart = () => {
            if (speakResponseBtn) {
                speakResponseBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Speaking';
                speakResponseBtn.classList.add('speaking');
            }
            updateVoiceStatus('AI is speaking...', 'speaking');
        };

        utterance.onend = () => {
            if (speakResponseBtn) {
                speakResponseBtn.innerHTML = '<i class="fas fa-volume-up"></i> Speak Response';
                speakResponseBtn.classList.remove('speaking');
            }
            currentUtterance = null;
            updateVoiceStatus('Ready to listen', 'ready');
        };

        currentUtterance.onerror = (event) => {
            if (speakResponseBtn) {
                speakResponseBtn.innerHTML = '<i class="fas fa-volume-up"></i> Speak Response';
                speakResponseBtn.classList.remove('speaking');
            }
            currentUtterance = null;
            console.error('Speech synthesis error:', event.error);
            updateVoiceStatus('Speech error occurred', 'error');
            setTimeout(() => updateVoiceStatus('Ready to listen', 'ready'), 2000);
        };

        console.log(`Speaking text at ${speed}x speed with ${bestVoice ? bestVoice.name : 'default voice'}: "${text.substring(0, 50)}..."`); 
        
        if (!voicesLoaded) {
            console.log('Voices not loaded yet, attempting to load...');
            loadVoices();
            setTimeout(() => {
                speechSynthesis.speak(currentUtterance);
            }, 100);
        } else {
            speechSynthesis.speak(currentUtterance);
        }
    }

    function resetButtons() {
        isRecognizing = false;
        startRecognitionBtn.disabled = false;
        stopRecognitionBtn.disabled = true;
        startRecognitionBtn.innerHTML = '<i class="fas fa-microphone"></i> Start Speaking';
        stopRecognitionBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Speaking';
    }

    function updateVoiceStatus(message, type) {
        if (voiceStatusElem) {
            voiceStatusElem.textContent = message;
            voiceStatusElem.className = `voice-status ${type}`;
        }
    }

    async function sendVoiceMessage(message) {
        try {
            console.log('Sending voice message:', message);
            updateVoiceStatus('Getting response from AI...', 'processing');
            
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Response data:', data);
            
            if (data.response) {
                assistantResponseElem.textContent = data.response;
                updateVoiceStatus('Response received! You can speak again.', 'success');
                
                // Show speak button if text-to-speech is supported
                if (speakResponseBtn && 'speechSynthesis' in window) {
                    speakResponseBtn.style.display = 'inline-block';
                }
                
                // Auto-speak the response if enabled and available
                const shouldAutoSpeak = autoSpeakCheckbox ? autoSpeakCheckbox.checked : true;
                if ('speechSynthesis' in window && data.response && shouldAutoSpeak) {
                    updateVoiceStatus('AI will speak the response...', 'processing');
                    
                    // Wait for voices to load if needed
                    if (!voicesLoaded) {
                        console.log('Waiting for voices to load...');
                        setTimeout(() => {
                            loadVoices();
                            speakText(data.response);
                        }, 1000);
                    } else {
                        setTimeout(() => {
                            speakText(data.response);
                        }, 500);
                    }
                } else if (data.response) {
                    if (!('speechSynthesis' in window)) {
                        console.log('Speech synthesis not supported');
                    }
                    setTimeout(() => updateVoiceStatus('Ready to listen', 'ready'), 2000);
                }
                
                setTimeout(() => updateVoiceStatus('Ready to listen', 'ready'), 3000);
            } else {
                throw new Error(data.error || 'No response received from AI');
            }
        } catch (error) {
            console.error('Error sending voice message:', error);
            let errorMessage = 'Sorry, I had trouble processing your message.';
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'Network error. Please check your connection.';
            } else if (error.message.includes('HTTP error')) {
                errorMessage = `Server error: ${error.message}`;
            }
            
            assistantResponseElem.textContent = errorMessage;
            updateVoiceStatus('Error processing message. Try again.', 'error');
            setTimeout(() => updateVoiceStatus('Ready to listen', 'ready'), 3000);
        }
    }
});