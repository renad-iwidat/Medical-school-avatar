// Global state
let currentSession = null;
let currentScenario = null;
let selectedLanguage = 'ar'; // Default Arabic
let socket = null; // WebSocket connection

// Fallback translations if translations.js not loaded
if (typeof translations === 'undefined') {
    window.translations = {
        ar: { you: 'أنت', patient: 'المريض', system: 'النظام', name: 'الاسم:', age: 'العمر:', gender: 'الجنس:', occupation: 'المهنة:', male: 'ذكر', female: 'أنثى', years: 'سنة', from: 'من', points: 'نقطة' },
        en: { you: 'You', patient: 'Patient', system: 'System', name: 'Name:', age: 'Age:', gender: 'Gender:', occupation: 'Occupation:', male: 'Male', female: 'Female', years: 'years old', from: 'out of', points: 'points' }
    };
}

// Fallback for updateUILanguage
if (typeof updateUILanguage === 'undefined') {
    window.updateUILanguage = function(lang) {
        console.log('Language updated to:', lang);
    };
}

// Fallback for getCategoryName and getItemName
if (typeof getCategoryName === 'undefined') {
    window.getCategoryName = function(category, lang) {
        const names = {
            ar: { history: 'القصة المرضية', examination: 'الفحص السريري', investigations: 'الفحوصات', diagnosis: 'التشخيص', management: 'الخطة العلاجية' },
            en: { history: 'History Taking', examination: 'Physical Examination', investigations: 'Investigations', diagnosis: 'Diagnosis', management: 'Management Plan' }
        };
        return names[lang][category] || category;
    };
}

if (typeof getItemName === 'undefined') {
    window.getItemName = function(key, lang) {
        const names = {
            ar: {
                chiefComplaint: 'الشكوى الرئيسية', onset: 'بداية الأعراض', character: 'طبيعة الألم',
                radiation: 'انتشار الألم', severity: 'شدة الألم', associatedSymptoms: 'الأعراض المصاحبة',
                riskFactors: 'عوامل الخطورة', pastMedicalHistory: 'السوابق المرضية', medications: 'الأدوية',
                familyHistory: 'التاريخ العائلي', vitals: 'العلامات الحيوية', cardiovascular: 'فحص القلب',
                respiratory: 'فحص الجهاز التنفسي', ecg: 'تخطيط القلب', cardiacMarkers: 'إنزيمات القلب',
                correctDiagnosis: 'التشخيص الصحيح', immediateManagement: 'الإسعافات الأولية'
            },
            en: {
                chiefComplaint: 'Chief Complaint', onset: 'Onset of Symptoms', character: 'Character of Pain',
                radiation: 'Radiation of Pain', severity: 'Severity of Pain', associatedSymptoms: 'Associated Symptoms',
                riskFactors: 'Risk Factors', pastMedicalHistory: 'Past Medical History', medications: 'Medications',
                familyHistory: 'Family History', vitals: 'Vital Signs', cardiovascular: 'Cardiovascular Exam',
                respiratory: 'Respiratory Exam', ecg: 'ECG', cardiacMarkers: 'Cardiac Markers',
                correctDiagnosis: 'Correct Diagnosis', immediateManagement: 'Immediate Management'
            }
        };
        return names[lang][key] || key;
    };
}

// Screen management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Load scenarios on page load
async function loadScenarios() {
    console.log('📚 Loading scenarios...');
    try {
        const response = await fetch('/api/scenarios');
        const scenarios = await response.json();
        console.log('✅ Scenarios loaded:', scenarios);
        
        const select = document.getElementById('scenario-select');
        select.innerHTML = scenarios.map(s => 
            `<option value="${s.id}">${s.title} - ${s.chiefComplaint}</option>`
        ).join('');
        console.log('✅ Scenarios populated in dropdown');
    } catch (error) {
        console.error('❌ Error loading scenarios:', error);
        alert('فشل تحميل السيناريوهات');
    }
}

// Start session
document.getElementById('start-btn').addEventListener('click', async () => {
    console.log('🔵 Start button clicked!');
    
    const studentName = document.getElementById('student-name').value.trim();
    const scenarioId = document.getElementById('scenario-select').value;
    selectedLanguage = document.getElementById('language-select').value;
    
    console.log('📝 Student name:', studentName);
    console.log('📋 Scenario ID:', scenarioId);
    console.log('🌐 Language:', selectedLanguage);
    
    if (!studentName || !scenarioId) {
        console.log('❌ Missing data!');
        const alertMsg = selectedLanguage === 'ar' 
            ? 'الرجاء إدخال جميع البيانات'
            : 'Please enter all required information';
        alert(alertMsg);
        return;
    }
    
    console.log('✅ Data validated, starting session...');
    
    // Update UI language
    if (typeof updateUILanguage === 'function') {
        console.log('🔄 Updating UI language...');
        updateUILanguage(selectedLanguage);
    }

    try {
        console.log('📡 Fetching scenario details...');
        // Get scenario details
        const scenarioResponse = await fetch(`/api/scenarios/${scenarioId}`);
        currentScenario = await scenarioResponse.json();
        console.log('✅ Scenario loaded:', currentScenario);
        
        console.log('🔑 Starting session...');
        // Start session
        const sessionResponse = await fetch('/api/session/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                studentName, 
                scenarioId,
                language: selectedLanguage
            })
        });
        
        const sessionData = await sessionResponse.json();
        console.log('✅ Session started:', sessionData);
        
        currentSession = {
            sessionId: sessionData.sessionId,
            studentName,
            scenarioId,
            language: selectedLanguage
        };
        
        console.log('👤 Displaying patient info...');
        // Display patient info
        displayPatientInfo();
        
        console.log('🎬 Showing session screen...');
        showScreen('session-screen');
        
        // Initialize WebSocket connection
        initializeWebSocket();
        
        // Welcome message with voice (based on language)
        const welcomeMsg = sessionData.welcomeMessage || (selectedLanguage === 'ar' 
            ? `مرحباً، أنا أحمد، المريض الافتراضي الخاص بك اليوم.

تم تطويري من قبل وحدة ليمينال في مركز الإعلام بجامعة النجاح الوطنية لتدريبك على مهاراتك السريرية بأمان وثقة.

لا تقلق، أنا صديقك اليوم وسأساعدك على الإجابة عن أي سؤال يخطر ببالك.

هيا نبدأ رحلتنا معاً بطريقة مريحة وممتعة!`
            : `Hello, I'm Ahmed, your virtual patient today.

I was developed by the Liminal Unit at the Media Center of An-Najah National University to help you practice your clinical skills safely and confidently.

Don't worry, I'm your friend today and I'll help you answer any questions you have.

Let's start our journey together in a comfortable and fun way!`);
        
        addToTranscript('avatar', welcomeMsg);
        
        // Speak welcome message (full version for voice - clear and energetic)
        const voiceMsg = selectedLanguage === 'ar'
            ? `مرحباً، أنا أحمد، المريض الافتراضي الخاص بك اليوم. تم تطويري من قبل وحدة ليمينال في مركز الإعلام بجامعة النجاح الوطنية لتدريبك على مهاراتك السريرية بأمان وثقة. لا تقلق، أنا صديقك اليوم وسأساعدك على الإجابة عن أي سؤال يخطر ببالك. هيا نبدأ رحلتنا معاً بطريقة مريحة وممتعة`
            : `Hello, I'm Ahmed, your virtual patient today. I was developed by the Liminal Unit at the Media Center of An-Najah National University to help you practice your clinical skills safely and confidently. Don't worry, I'm your friend today and I'll help you answer any questions you have. Let's start our journey together in a comfortable and fun way`;
        
        speak(voiceMsg);
    } catch (error) {
        console.error('❌ ERROR starting session:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        const alertMsg = selectedLanguage === 'ar' 
            ? 'فشل بدء الجلسة: ' + error.message
            : 'Failed to start session: ' + error.message;
        alert(alertMsg);
    }
});

// Display patient information
function displayPatientInfo() {
    const patient = currentScenario.patientInfo;
    const t = translations[selectedLanguage];
    
    const genderText = patient.gender === 'male' ? t.male : t.female;
    const ageText = selectedLanguage === 'ar' ? `${patient.age} ${t.years}` : `${patient.age} ${t.years}`;
    
    document.getElementById('patient-info').innerHTML = `
        <p><strong>${t.name}</strong> ${selectedLanguage === 'ar' ? patient.name : 'Ahmad Mohammad'}</p>
        <p><strong>${t.age}</strong> ${ageText}</p>
        <p><strong>${t.gender}</strong> ${genderText}</p>
        <p><strong>${t.occupation}</strong> ${selectedLanguage === 'ar' ? patient.occupation : 'Employee'}</p>
    `;
    
    const complaintText = selectedLanguage === 'ar' 
        ? currentScenario.chiefComplaint
        : 'Chest pain for two hours';
    
    document.getElementById('chief-complaint').innerHTML = `<p>${complaintText}</p>`;
}

// Speech Recognition Setup
let recognition = null;
let isRecording = false;

function initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        // Set language based on selection
        recognition.lang = selectedLanguage === 'ar' ? 'ar-SA' : 'en-US';
        recognition.continuous = true; // استمر في الاستماع
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            console.log('Recognized:', transcript);
            
            // Add to input and send
            document.getElementById('message-input').value = transcript;
            sendMessage();
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            
            // If error, restart if still recording
            if (isRecording && event.error !== 'no-speech') {
                console.log('Restarting recognition...');
                setTimeout(() => {
                    if (isRecording) {
                        try {
                            recognition.start();
                        } catch (e) {
                            console.log('Recognition already started');
                        }
                    }
                }, 100);
            }
        };

        recognition.onend = () => {
            console.log('Recognition ended');
            
            // Auto-restart if still in recording mode
            if (isRecording) {
                console.log('Auto-restarting recognition...');
                try {
                    recognition.start();
                } catch (e) {
                    console.log('Recognition already started');
                }
            }
        };
    }
}

// Text-to-Speech Setup
function speak(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        // Show sound wave animation
        const soundWave = document.getElementById('sound-wave');
        if (soundWave) {
            soundWave.classList.add('active');
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set language and voice parameters based on selected language
        if (selectedLanguage === 'ar') {
            utterance.lang = 'ar-SA';
            utterance.rate = 1.6; // أسرع بكثير!
            utterance.pitch = 1.0; // طبقة صوت طبيعية
            utterance.volume = 1.0; // صوت واضح
        } else {
            utterance.lang = 'en-US';
            utterance.rate = 1.5; // Much faster!
            utterance.pitch = 1.0; // Natural pitch
            utterance.volume = 1.0;
        }
        
        // Try to find best voice for selected language
        const voices = speechSynthesis.getVoices();
        
        let selectedVoice = null;
        
        if (selectedLanguage === 'ar') {
            // Priority order for Arabic voices - try different dialects
            const preferredVoices = [
                'Majed', // Saudi
                'Maged', // Egyptian
                'Microsoft Naayf', // Saudi
                'Tarik', // Saudi
                'Google العربية',
                'Microsoft Hoda', // Egyptian female
                'Laila' // Egyptian
            ];
            
            for (const preferred of preferredVoices) {
                selectedVoice = voices.find(voice => 
                    voice.name.includes(preferred)
                );
                if (selectedVoice) {
                    console.log('🔊 Found preferred voice:', selectedVoice.name);
                    break;
                }
            }
            
            // Fallback to any Arabic voice
            if (!selectedVoice) {
                selectedVoice = voices.find(voice => voice.lang.startsWith('ar'));
            }
            
            // If still no voice, try ar-EG (Egyptian)
            if (!selectedVoice) {
                utterance.lang = 'ar-EG';
                selectedVoice = voices.find(voice => voice.lang.startsWith('ar-EG'));
            }
        } else {
            // Priority order for English voices
            const preferredVoices = [
                'Google US English Male',
                'Microsoft David',
                'Alex',
                'Daniel',
                'Google US English'
            ];
            
            for (const preferred of preferredVoices) {
                selectedVoice = voices.find(voice => 
                    voice.name.includes(preferred) && voice.lang.startsWith('en')
                );
                if (selectedVoice) break;
            }
            
            // Fallback to any English voice
            if (!selectedVoice) {
                selectedVoice = voices.find(voice => voice.lang.startsWith('en-US'));
            }
        }
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log('🔊 Using voice:', selectedVoice.name, '| Rate:', utterance.rate);
        } else {
            console.log('⚠️ No specific voice found, using default');
        }
        
        utterance.onstart = () => {
            console.log('🔊 Speaking:', text.substring(0, 50) + '...');
        };
        
        utterance.onerror = (event) => {
            console.error('Speech error:', event);
            // Hide sound wave on error
            if (soundWave) {
                soundWave.classList.remove('active');
            }
        };
        
        utterance.onend = () => {
            console.log('✅ Speech completed');
            // Hide sound wave when done
            if (soundWave) {
                soundWave.classList.remove('active');
            }
        };
        
        speechSynthesis.speak(utterance);
    }
}

// Function to list all available voices (for debugging)
function listAvailableVoices() {
    const voices = speechSynthesis.getVoices();
    console.log('📢 Available voices:');
    voices.forEach((voice, index) => {
        if (voice.lang.startsWith('ar') || voice.lang.startsWith('en')) {
            console.log(`${index}: ${voice.name} (${voice.lang})`);
        }
    });
}

// Load voices when available
if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => {
        speechSynthesis.getVoices();
        listAvailableVoices(); // Show available voices in console
    };
}

// Microphone control (Toggle mode)
document.getElementById('mic-btn').addEventListener('click', () => {
    const micBtn = document.getElementById('mic-btn');
    const micStatus = document.getElementById('mic-status');
    
    // Initialize recognition if not already done
    if (!recognition) {
        initializeSpeechRecognition();
    }
    
    if (!recognition) {
        const alertMsg = selectedLanguage === 'ar' 
            ? 'التعرف على الصوت غير مدعوم في هذا المتصفح. استخدم Chrome أو Edge.'
            : 'Speech recognition not supported in this browser. Use Chrome or Edge.';
        alert(alertMsg);
        return;
    }
    
    // Toggle recording state
    if (!isRecording) {
        // Start recording
        try {
            recognition.start();
            isRecording = true;
            micBtn.classList.add('active');
            const statusText = selectedLanguage === 'ar' 
                ? '🎤 يستمع... (اضغط للإيقاف)'
                : '🎤 Listening... (Click to stop)';
            micStatus.textContent = statusText;
            console.log('✅ Microphone ON - Continuous listening');
        } catch (error) {
            console.error('Error starting recognition:', error);
            const alertMsg = selectedLanguage === 'ar' 
                ? 'فشل تفعيل الميكروفون'
                : 'Failed to activate microphone';
            alert(alertMsg);
        }
    } else {
        // Stop recording
        try {
            recognition.stop();
            isRecording = false;
            micBtn.classList.remove('active');
            const statusText = selectedLanguage === 'ar' 
                ? '🎤 متوقف (اضغط للتشغيل)'
                : '🎤 Stopped (Click to start)';
            micStatus.textContent = statusText;
            console.log('⏸️ Microphone OFF');
        } catch (error) {
            console.error('Error stopping recognition:', error);
        }
    }
});

// End session
document.getElementById('end-btn').addEventListener('click', async () => {
    const confirmMsg = selectedLanguage === 'ar' 
        ? 'هل تريد إنهاء الجلسة؟'
        : 'Do you want to end the session?';
    if (confirm(confirmMsg)) {
        await endSession();
    }
});

async function endSession() {
    try {
        // Get evaluation
        const response = await fetch(`/api/evaluation/${currentSession.sessionId}`);
        const evaluation = await response.json();
        
        // Disconnect WebSocket
        if (socket) {
            socket.disconnect();
        }
        
        // Display results
        displayResults(evaluation);
        showScreen('results-screen');
    } catch (error) {
        console.error('Error ending session:', error);
        const alertMsg = selectedLanguage === 'ar' 
            ? 'فشل إنهاء الجلسة'
            : 'Failed to end session';
        alert(alertMsg);
    }
}

// Display results
function displayResults(evaluation) {
    const resultsContent = document.getElementById('results-content');
    const score = evaluation.score;
    const t = translations[selectedLanguage];
    
    let html = `
        <div class="score-display">
            <h3>${score.percentage}%</h3>
            <p>${score.earnedPoints} ${t.from} ${score.totalPoints} ${t.points}</p>
        </div>
    `;
    
    // Display checklist
    const checklist = evaluation.evaluationChecklist;
    
    for (const [category, items] of Object.entries(checklist)) {
        html += `<div class="checklist-category">`;
        html += `<h4>${getCategoryName(category, selectedLanguage)}</h4>`;
        
        for (const [key, item] of Object.entries(items)) {
            const className = item.asked ? 'completed' : 'missed';
            const status = item.asked ? '✓' : '✗';
            html += `
                <div class="checklist-item ${className}">
                    <span>${status} ${getItemName(key, selectedLanguage)}</span>
                    <span>${item.points} ${t.points}</span>
                </div>
            `;
        }
        
        html += `</div>`;
    }
    
    resultsContent.innerHTML = html;
}

function getCategoryName(category, lang) {
    return translations[lang][category] || category;
}

function getItemName(key, lang) {
    return translations[lang][key] || key;
}

// New session
document.getElementById('new-session-btn').addEventListener('click', () => {
    currentSession = null;
    currentScenario = null;
    showScreen('setup-screen');
});

// Initialize WebSocket connection
function initializeWebSocket() {
    console.log('🔌 Connecting to WebSocket...');
    
    socket = io();
    
    socket.on('connect', () => {
        console.log('✅ WebSocket connected:', socket.id);
    });
    
    socket.on('chat-response', (data) => {
        console.log('📨 Received response:', data);
        
        // Add agent response to transcript
        if (data.response) {
            addToTranscript('avatar', data.response);
            speak(data.response);
        }
        
        // Update score display (optional)
        if (data.score) {
            console.log('📊 Current score:', data.score);
        }
    });
    
    socket.on('chat-error', (data) => {
        console.error('❌ Chat error:', data.error);
        const errorMsg = selectedLanguage === 'ar' 
            ? 'حدث خطأ في الإرسال'
            : 'Error sending message';
        addToTranscript('system', errorMsg);
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 WebSocket disconnected');
    });
}

// Send text message
document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    
    if (!message || !currentSession) return;
    
    // Add student message to transcript
    addToTranscript('student', message);
    
    // Clear input
    input.value = '';
    
    if (!socket || !socket.connected) {
        console.error('❌ WebSocket not connected');
        const errorMsg = selectedLanguage === 'ar' 
            ? 'غير متصل بالسيرفر'
            : 'Not connected to server';
        addToTranscript('system', errorMsg);
        return;
    }
    
    // Send via WebSocket (faster!)
    console.log('📤 Sending message via WebSocket:', message);
    socket.emit('chat-message', {
        sessionId: currentSession.sessionId,
        message: message,
        language: selectedLanguage
    });
}

function addToTranscript(role, message) {
    const transcript = document.getElementById('transcript');
    const item = document.createElement('div');
    item.className = `transcript-item ${role}`;
    
    const t = translations[selectedLanguage];
    const label = role === 'student' ? t.you : role === 'avatar' ? t.patient : t.system;
    item.innerHTML = `<strong>${label}:</strong> ${message}`;
    
    transcript.appendChild(item);
    transcript.scrollTop = transcript.scrollHeight;
}

// Initialize
console.log('🚀 Initializing app...');
loadScenarios();
console.log('✅ App initialized');
