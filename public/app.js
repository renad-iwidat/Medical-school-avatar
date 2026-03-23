// Global state
let currentSession = null;
let currentScenario = null;
let selectedLanguage = 'ar'; // Default Arabic
let socket = null; // WebSocket connection

// Fallback translations if translations.js not loaded
if (typeof translations === 'undefined') {
    window.translations = {
        ar: { you: 'أنت', patient: 'المريض', system: 'النظام', name: 'الاسم:', age: 'العمر:', gender: 'الجنس:', occupation: 'المهنة:', male: 'ذكر', female: 'أنثى', years: 'سنة' },
        en: { you: 'You', patient: 'Patient', system: 'System', name: 'Name:', age: 'Age:', gender: 'Gender:', occupation: 'Occupation:', male: 'Male', female: 'Female', years: 'years old' }
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
        return category;
    };
}

if (typeof getItemName === 'undefined') {
    window.getItemName = function(key, lang) {
        return key;
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
        console.log('✅ Scenarios loaded:', scenarios.length, 'scenarios');
        console.log('Scenario IDs:', scenarios.map(s => s.id));
        
        const select = document.getElementById('case-select');
        
        // Remove duplicates based on ID
        const uniqueScenarios = [];
        const seenIds = new Set();
        
        scenarios.forEach(s => {
            if (!seenIds.has(s.id)) {
                seenIds.add(s.id);
                uniqueScenarios.push(s);
            }
        });
        
        console.log('✅ Unique scenarios:', uniqueScenarios.length);
        
        select.innerHTML = uniqueScenarios.map(s => {
            // Determine case letter
            let caseLetter = 'L';
            if (s.id.includes('cushing')) caseLetter = 'C';
            else if (s.id.includes('sarcoidosis')) caseLetter = 'S';
            else if (s.id.includes('gout')) caseLetter = 'G';
            
            return `<option value="${s.id}">Case ${caseLetter}</option>`;
        }).join('');
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
    const scenarioId = document.getElementById('case-select').value;
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
        
        // Display patient image
        displayPatientImage();
        
        // Generate video with Hedra if image available
        if (currentScenario.patientInfo.patientImage) {
            generatePatientVideo(currentScenario.presentingComplaintFull);
        }
        
        // Display investigation images
        displayInvestigationImages();
        
        // Clear transcript for new session
        document.getElementById('transcript').innerHTML = '';
        
        console.log('🎬 Showing session screen...');
        showScreen('session-screen');
        
        // Initialize WebSocket connection
        initializeWebSocket();
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

// Display patient image
function displayPatientImage() {
    const patientImage = document.getElementById('patient-image');
    const avatarPlaceholder = document.getElementById('avatar-placeholder');
    
    if (currentScenario && currentScenario.patientInfo && currentScenario.patientInfo.patientImage) {
        patientImage.src = currentScenario.patientInfo.patientImage;
        patientImage.style.display = 'block';
        avatarPlaceholder.style.display = 'none';
        console.log('📸 Patient image loaded:', currentScenario.patientInfo.patientImage);
    } else {
        patientImage.style.display = 'none';
        avatarPlaceholder.style.display = 'flex';
    }
}

// Generate patient video with lip sync using Hedra API
async function generatePatientVideo(text) {
    try {
        let patientImage = currentScenario.patientInfo.patientImage;
        if (!patientImage) {
            console.log('⚠️ No patient image available for video generation');
            return;
        }

        // Convert local path to full URL if needed
        if (patientImage.startsWith('/')) {
            const protocol = window.location.protocol;
            const host = window.location.host;
            patientImage = `${protocol}//${host}${patientImage}`;
        }

        console.log('🎬 Requesting video generation from Hedra API...');
        console.log('📝 Text length:', text.length);
        console.log('🖼️ Image URL:', patientImage);
        
        const response = await fetch('/api/generate-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                imageUrl: patientImage,
                voiceId: 'default'
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('❌ Failed to generate video:', error);
            displayPatientImageFallback(patientImage);
            return;
        }

        const videoData = await response.json();
        console.log('✅ Video response received:', videoData);
        
        // Display video or fallback to image
        const patientVideo = document.getElementById('patient-video');
        const patientImage_elem = document.getElementById('patient-image');
        const avatarPlaceholder = document.getElementById('avatar-placeholder');
        
        if (videoData.videoUrl) {
            console.log('✅ Video URL available, displaying video');
            patientVideo.src = videoData.videoUrl;
            patientVideo.style.display = 'block';
            patientImage_elem.style.display = 'none';
            avatarPlaceholder.style.display = 'none';
            
            // Auto play
            patientVideo.play().catch(err => console.log('⚠️ Auto-play prevented:', err));
        } else if (videoData.status === 'fallback' || videoData.imageUrl) {
            console.log('⚠️ Using fallback image (Hedra API unavailable)');
            displayPatientImageFallback(videoData.imageUrl || patientImage);
        } else {
            console.log('⚠️ No video or image URL in response');
            displayPatientImageFallback(patientImage);
        }
        
    } catch (error) {
        console.error('❌ Error generating video:', error);
        // Fallback to showing the image
        let patientImage = currentScenario.patientInfo.patientImage;
        if (patientImage && patientImage.startsWith('/')) {
            const protocol = window.location.protocol;
            const host = window.location.host;
            patientImage = `${protocol}//${host}${patientImage}`;
        }
        displayPatientImageFallback(patientImage);
    }
}

function displayPatientImageFallback(imageUrl) {
    const patientVideo = document.getElementById('patient-video');
    const patientImage_elem = document.getElementById('patient-image');
    const avatarPlaceholder = document.getElementById('avatar-placeholder');
    
    if (imageUrl) {
        patientImage_elem.src = imageUrl;
        patientImage_elem.style.display = 'block';
        patientVideo.style.display = 'none';
        avatarPlaceholder.style.display = 'none';
        console.log('✅ Displaying patient image');
    } else {
        avatarPlaceholder.style.display = 'block';
        patientVideo.style.display = 'none';
        patientImage_elem.style.display = 'none';
        console.log('✅ Displaying avatar placeholder');
    }
}

// Display patient information
function displayPatientInfo() {
    const patient = currentScenario.patientInfo;
    const t = translations['ar']; // Always use Arabic for patient info
    
    // Clear previous data
    document.getElementById('patient-info').innerHTML = '';
    document.getElementById('chief-complaint').innerHTML = '';
    
    // Translate name to Arabic - check translations first
    let patientNameArabic = '';
    if (t.patientNames && t.patientNames[patient.name]) {
        patientNameArabic = `السيد ${t.patientNames[patient.name]}`;
    } else {
        const gender = patient.gender;
        const prefix = gender === 'male' ? 'السيد' : 'السيدة';
        patientNameArabic = `${prefix} ${patient.name}`;
    }
    
    // Translate gender
    const genderText = patient.gender === 'male' ? t.male : t.female;
    
    // Translate occupation
    const occupationText = t.occupations[patient.occupation] || patient.occupation;
    
    // Build patient info HTML - all in Arabic
    let patientHTML = `
        <p><strong>${t.name}</strong> ${patientNameArabic}</p>
        <p><strong>${t.age}</strong> ${patient.age} ${t.years}</p>
        <p><strong>${t.gender}</strong> ${genderText}</p>
        <p><strong>${t.occupation}</strong> ${occupationText}</p>
    `;
    
    document.getElementById('patient-info').innerHTML = patientHTML;
    
    // Get chief complaint - use Arabic translation if available
    let complaintText = '';
    
    // Try to get Arabic translation first
    if (currentScenario.arabicTranslations && 
        currentScenario.arabicTranslations.presentingComplaint && 
        currentScenario.arabicTranslations.presentingComplaint.full) {
        complaintText = currentScenario.arabicTranslations.presentingComplaint.full;
    } else {
        // Fallback to English
        complaintText = currentScenario.presentingComplaintFull 
            || currentScenario.presentingComplaintShort 
            || 'Chief Complaint';
    }
    
    const complaintHTML = `
        <p>${complaintText}</p>
    `;
    
    document.getElementById('chief-complaint').innerHTML = complaintHTML;
}

// Display investigation images
function displayInvestigationImages() {
    const imagesContainer = document.getElementById('investigation-images');
    
    // Clear previous images
    imagesContainer.innerHTML = '';
    
    if (!currentScenario.investigationImages || Object.keys(currentScenario.investigationImages).length === 0) {
        return;
    }
    
    let imagesData = [];
    
    Object.values(currentScenario.investigationImages).forEach(image => {
        let imagePath = image.imagePath;
        if (!imagePath.startsWith('/data')) {
            if (imagePath.startsWith('/')) {
                imagePath = '/data' + imagePath;
            } else {
                imagePath = '/data/' + imagePath;
            }
        }
        imagesData.push({ path: imagePath, title: image.title });
    });
    
    let imagesHTML = `
        <button id="toggle-images-btn" class="btn-toggle-images" onclick="toggleInvestigationImages()">
            📸 عرض الصور الطبية
        </button>
        <div id="images-content" class="images-content hidden">
    `;
    
    imagesData.forEach(img => {
        imagesHTML += `
            <div class="investigation-image-item">
                <img src="${img.path}" alt="${img.title}" style="display: block; width: 100%; max-width: 400px; border-radius: 8px;" />
            </div>
        `;
    });
    
    imagesHTML += '</div>';
    imagesContainer.innerHTML = imagesHTML;
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
            utterance.rate = 1.4; // أسرع قليلاً
            utterance.volume = 1.0; // صوت واضح جداً
            utterance.pitch = 1.0;
        } else {
            utterance.lang = 'en-US';
            utterance.rate = 1.4;
            utterance.volume = 1.0;
            utterance.pitch = 1.0;
        }
        
        const voices = speechSynthesis.getVoices();
        let selectedVoice = null;
        
        if (selectedLanguage === 'ar') {
            // Use the DEFAULT Arabic voice (Microsoft Naayf)
            selectedVoice = voices.find(voice => voice.default && voice.lang.startsWith('ar'));
            
            if (!selectedVoice) {
                selectedVoice = voices.find(voice => voice.lang === 'ar-SA');
            }
            
            if (selectedVoice) {
                console.log('✅ Using Arabic voice:', selectedVoice.name);
            }
        } else {
            // English voices
            const preferredVoices = [
                'Google US English',
                'Microsoft David',
                'Microsoft Mark',
                'Microsoft Zira'
            ];
            
            for (const preferred of preferredVoices) {
                selectedVoice = voices.find(voice => 
                    voice.name.includes(preferred) && voice.lang.startsWith('en')
                );
                if (selectedVoice) break;
            }
            
            if (!selectedVoice) {
                selectedVoice = voices.find(voice => voice.lang.startsWith('en-US'));
            }
        }
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log('🔊 Speaking | Voice:', selectedVoice.name, '| Rate:', utterance.rate, '| Volume:', utterance.volume);
        }
        
        utterance.onstart = () => {
            console.log('🔊 Started speaking');
        };
        
        utterance.onerror = (event) => {
            console.error('❌ Speech error:', event.error);
            if (soundWave) {
                soundWave.classList.remove('active');
            }
        };
        
        utterance.onend = () => {
            console.log('✅ Speech completed');
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
    console.log('Total voices:', voices.length);
    voices.forEach((voice, index) => {
        console.log(`${index}: ${voice.name} (${voice.lang}) - ${voice.default ? 'DEFAULT' : ''}`);
    });
}

// Load voices when available
if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => {
        const voices = speechSynthesis.getVoices();
        console.log('🎤 ALL VOICES LOADED! Total:', voices.length);
        console.log('='.repeat(60));
        
        voices.forEach((v, i) => {
            console.log(`${i}: ${v.name} (${v.lang}) ${v.default ? '⭐ DEFAULT' : ''}`);
        });
        
        console.log('='.repeat(60));
        console.log('📢 Arabic voices:');
        voices.filter(v => v.lang.startsWith('ar')).forEach(v => {
            console.log(`  ✓ ${v.name} (${v.lang}) ${v.default ? '⭐ DEFAULT' : ''}`);
        });
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
        // Stop speech synthesis immediately
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            console.log('🔇 Speech stopped');
        }
        
        // Stop microphone recording
        if (isRecording && recognition) {
            recognition.stop();
            isRecording = false;
            const micBtn = document.getElementById('mic-btn');
            micBtn.classList.remove('active');
            console.log('🎤 Microphone stopped');
        }
        
        // Disconnect WebSocket
        if (socket) {
            socket.disconnect();
        }
        
        // Show end session message
        const messageAr = 'شكراً لك على المشاركة في هذه الجلسة التدريبية';
        const messageEn = 'Thank you for participating in this training session';
        const message = selectedLanguage === 'ar' ? messageAr : messageEn;
        
        document.getElementById('results-content').innerHTML = `<p>${message}</p>`;
        showScreen('results-screen');
    } catch (error) {
        console.error('Error ending session:', error);
        const alertMsg = selectedLanguage === 'ar' 
            ? 'فشل إنهاء الجلسة'
            : 'Failed to end session';
        alert(alertMsg);
    }
}

function getCategoryName(category, lang) {
    return category;
}

function getItemName(key, lang) {
    return key;
}

// New session
document.getElementById('new-session-btn').addEventListener('click', () => {
    // Stop speech synthesis
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }
    
    // Stop microphone recording
    if (isRecording && recognition) {
        recognition.stop();
        isRecording = false;
    }
    
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
        
        // Send welcome message to transcript after connection
        if (currentSession && currentScenario) {
            const t = translations['ar'];
            let patientNameArabic = '';
            if (t.patientNames && t.patientNames[currentScenario.patientInfo.name]) {
                patientNameArabic = t.patientNames[currentScenario.patientInfo.name];
            } else {
                patientNameArabic = currentScenario.patientInfo.name;
            }
            
            const patientGender = currentScenario.patientInfo.gender;
            const patientLabel = patientGender === 'male' ? 'المريض' : 'المريضة';
            
            const welcomeMsg = `مرحباً، أنا ${patientNameArabic}، ${patientLabel} الافتراضي الخاص بك اليوم.

تم تطويري من قبل وحدة ليمينال في مركز الإعلام بجامعة النجاح الوطنية لتدريبك على مهاراتك السريرية بأمان وثقة.

هيا نبدأ رحلتنا معاً بطريقة مريحة وممتعة!`;
            
            addToTranscript('avatar', welcomeMsg);
            speak(welcomeMsg);
        }
    });
    
    socket.on('chat-response', (data) => {
        console.log('📨 Received response:', data);
        
        // Add agent response to transcript
        if (data.response) {
            addToTranscript('avatar', data.response);
            
            // Generate video for the response
            if (currentScenario && currentScenario.patientInfo && currentScenario.patientInfo.patientImage) {
                generatePatientVideo(data.response);
            }
            
            speak(data.response);
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
    
    const t = translations['ar']; // Always use Arabic
    
    let label = '';
    if (role === 'student') {
        label = t.you;
    } else if (role === 'avatar') {
        // Use "المريض" or "المريضة" based on gender
        const patientGender = currentScenario?.patientInfo?.gender;
        label = patientGender === 'male' ? 'المريض' : 'المريضة';
    } else {
        label = t.system;
    }
    
    // Replace patient name in message with Arabic version
    let displayMessage = message;
    if (currentScenario?.patientInfo?.name) {
        const englishName = currentScenario.patientInfo.name;
        let arabicName = '';
        
        // Check if name exists in translations
        if (t.patientNames && t.patientNames[englishName]) {
            arabicName = t.patientNames[englishName];
        } else {
            // Generate Arabic name based on gender
            const gender = currentScenario.patientInfo.gender;
            const prefix = gender === 'male' ? 'السيد' : 'السيدة';
            arabicName = `${prefix} ${englishName}`;
        }
        
        displayMessage = message.replace(new RegExp(englishName, 'g'), arabicName);
    }
    
    item.innerHTML = `<strong>${label}:</strong> ${displayMessage}`;
    
    transcript.appendChild(item);
    transcript.scrollTop = transcript.scrollHeight;
}

// Toggle investigation images visibility
function toggleInvestigationImages() {
    const content = document.getElementById('images-content');
    const btn = document.getElementById('toggle-images-btn');
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        btn.textContent = '📸 إخفاء الصور الطبية';
    } else {
        content.classList.add('hidden');
        btn.textContent = '📸 عرض الصور الطبية';
    }
}

// Initialize
console.log('🚀 Initializing app...');
loadScenarios();
console.log('✅ App initialized');
