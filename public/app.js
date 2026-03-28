// Global state
let currentSession = null;
let currentScenario = null;
let selectedLanguage = 'ar'; // Always Arabic
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

function goBack(screenId) {
    showScreen(screenId);
}

// Password check
function checkPassword() {
    const input = document.getElementById('password-input');
    const error = document.getElementById('password-error');
    if (input.value === '55555') {
        error.textContent = '';
        input.value = '';
        showScreen('welcome-screen');
    } else {
        error.textContent = 'كلمة المرور غير صحيحة';
        input.value = '';
        input.focus();
    }
}

// Department selection
let selectedDepartment = '';
function selectDepartment(dept) {
    const studentName = document.getElementById('student-name').value.trim();
    if (!studentName) {
        alert('الرجاء إدخال اسمك أولاً 👤');
        document.getElementById('student-name').focus();
        return;
    }
    selectedDepartment = dept;
    document.getElementById('department-select').value = dept;
    
    const deptLabel = dept === 'Internal Medicine' ? 'الباطني' : 'الجراحة';
    document.getElementById('session-screen-title').textContent = `اختر الفترة - ${deptLabel}`;
    
    showScreen('session-select-screen');
}

// Session selection - auto starts the session
function selectSession(session) {
    document.getElementById('session-select').value = session;
    
    // Find matching scenario
    const filtered = allScenarios.filter(s => s.department === selectedDepartment && s.session === session);
    if (filtered.length === 0) {
        alert(selectedLanguage === 'ar' ? 'لا توجد حالات متاحة لهذا الاختيار' : 'No cases available for this selection');
        return;
    }
    
    const select = document.getElementById('case-select');
    select.innerHTML = `<option value="${filtered[0].id}">${filtered[0].title}</option>`;
    select.value = filtered[0].id;
    
    // Trigger session start
    startSession();
}

// Session Timer
let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;

function startTimer() {
    timerSeconds = 0;
    timerRunning = true;
    document.getElementById('session-timer').textContent = '00:00';
    document.getElementById('timer-toggle-btn').textContent = '⏸';
    timerInterval = setInterval(() => {
        if (timerRunning) {
            timerSeconds++;
            const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
            const secs = String(timerSeconds % 60).padStart(2, '0');
            document.getElementById('session-timer').textContent = `${mins}:${secs}`;
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
}

function toggleTimer() {
    const btn = document.getElementById('timer-toggle-btn');
    if (timerRunning) {
        timerRunning = false;
        btn.textContent = '▶';
    } else {
        timerRunning = true;
        btn.textContent = '⏸';
    }
}

// Load scenarios on page load
let allScenarios = [];

async function loadScenarios() {
    console.log('📚 Loading scenarios...');
    try {
        const response = await fetch('/api/scenarios');
        const scenarios = await response.json();
        console.log('✅ Scenarios loaded:', scenarios.length, 'scenarios');
        
        // Remove duplicates based on ID
        const seenIds = new Set();
        allScenarios = [];
        scenarios.forEach(s => {
            if (!seenIds.has(s.id)) {
                seenIds.add(s.id);
                allScenarios.push(s);
            }
        });
        
        console.log('✅ Unique scenarios:', allScenarios.length);
    } catch (error) {
        console.error('❌ Error loading scenarios:', error);
        alert('فشل تحميل السيناريوهات');
    }
}

// Start session
async function startSession() {
    console.log('🔵 Starting session!');
    
    const studentName = document.getElementById('student-name').value.trim();
    const scenarioId = document.getElementById('case-select').value;
    const department = document.getElementById('department-select').value;
    const session = document.getElementById('session-select').value;
    
    console.log('📝 Student name:', studentName);
    console.log('📋 Scenario ID:', scenarioId);
    console.log('🏥 Department:', department);
    console.log('🕐 Session:', session);
    console.log('🌐 Language:', selectedLanguage);
    
    if (!studentName || !department || !session || !scenarioId) {
        console.log('❌ Missing data!');
        const alertMsg = selectedLanguage === 'ar' 
            ? 'الرجاء إدخال جميع البيانات واختيار القسم والفترة'
            : 'Please enter all required information and select department and session';
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
        
        // Generate video with Hedra if image available and NO local video
        if (currentScenario.patientInfo.patientImage && !currentScenario.patientInfo.patientVideo) {
            generatePatientVideo(currentScenario.presentingComplaintFull);
        }
        
        // Display investigation images
        displayInvestigationImages();
        
        // Clear transcript for new session
        document.getElementById('transcript').innerHTML = '';
        
        console.log('🎬 Showing session screen...');
        showScreen('session-screen');
        
        // Pre-generate welcome TTS audio in background
        const t = translations['ar'];
        let patientNameArabic = '';
        if (t.patientNames && t.patientNames[currentScenario.patientInfo.name]) {
            patientNameArabic = t.patientNames[currentScenario.patientInfo.name];
        } else {
            patientNameArabic = currentScenario.patientInfo.name;
        }
        const patientGender = currentScenario.patientInfo.gender;
        const patientLabel = patientGender === 'male' ? 'المريض الافتراضي الخاص' : 'المريضة الافتراضية الخاصة';
        const welcomeMsg = `مرحباً، أنا ${patientNameArabic}، ${patientLabel} بك اليوم. تفضل اسألني يلي بدك ياه.`;
        
        // Start fetching TTS audio immediately (don't await)
        window._welcomeTTSPromise = fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: welcomeMsg, gender: patientGender })
        }).then(r => r.ok ? r.blob() : null).catch(() => null);
        window._welcomeMsg = welcomeMsg;
        
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
}

// Display patient image or video
function displayPatientImage() {
    const patientVideo = document.getElementById('patient-video');
    const patientImage = document.getElementById('patient-image');
    const avatarPlaceholder = document.getElementById('avatar-placeholder');
    
    // Check if scenario has a video file
    if (currentScenario && currentScenario.patientInfo && currentScenario.patientInfo.patientVideo) {
        const videoPath = currentScenario.patientInfo.patientVideo;
        patientVideo.src = videoPath;
        patientVideo.loop = true;
        patientVideo.muted = true;
        patientVideo.style.display = 'block';
        patientVideo.style.objectFit = 'contain';
        patientImage.style.display = 'none';
        avatarPlaceholder.style.display = 'none';
        // Load but don't play - will play when avatar speaks
        patientVideo.load();
        // Show first frame (paused)
        patientVideo.currentTime = 0;
        console.log('🎬 Patient video loaded (paused):', videoPath);
    } else if (currentScenario && currentScenario.patientInfo && currentScenario.patientInfo.patientImage) {
        patientImage.src = currentScenario.patientInfo.patientImage;
        patientImage.style.display = 'block';
        patientVideo.style.display = 'none';
        avatarPlaceholder.style.display = 'none';
        console.log('📸 Patient image loaded:', currentScenario.patientInfo.patientImage);
    } else {
        patientImage.style.display = 'none';
        patientVideo.style.display = 'none';
        avatarPlaceholder.style.display = 'flex';
    }
}

// Start playing the avatar video (called when avatar starts speaking)
function startAvatarVideo() {
    const patientVideo = document.getElementById('patient-video');
    if (patientVideo && patientVideo.src && patientVideo.style.display !== 'none') {
        patientVideo.loop = true;
        patientVideo.play().catch(err => console.log('⚠️ Video auto-play prevented:', err));
        console.log('▶️ Avatar video playing');
    }
}

// Pause the avatar video (called when avatar stops speaking)
function pauseAvatarVideo() {
    const patientVideo = document.getElementById('patient-video');
    if (patientVideo && patientVideo.src && patientVideo.style.display !== 'none') {
        patientVideo.pause();
        console.log('⏸️ Avatar video paused');
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
        const prefix = patient.gender === 'male' ? 'السيد' : 'السيدة';
        patientNameArabic = `${prefix} ${t.patientNames[patient.name]}`;
    } else {
        const prefix = patient.gender === 'male' ? 'السيد' : 'السيدة';
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
        <button id="toggle-images-btn" class="btn-toggle-images" onclick="showImageOverlay()">
            📸 عرض الصور الطبية
        </button>
    `;
    
    // Build hidden overlay for full-screen image viewing
    let overlayHTML = '<div id="images-overlay" class="images-overlay hidden" onclick="closeImageOverlay(event)">';
    overlayHTML += '<div class="images-overlay-content">';
    overlayHTML += '<button class="images-overlay-close" onclick="closeImageOverlay()">✕</button>';
    imagesData.forEach(img => {
        overlayHTML += `
            <div class="overlay-image-item">
                <img src="${img.path}" alt="${img.title}" />
                <p>${img.title}</p>
            </div>
        `;
    });
    overlayHTML += '</div></div>';
    
    imagesContainer.innerHTML = imagesHTML;
    
    // Add overlay to body if not already there
    let existing = document.getElementById('images-overlay');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', overlayHTML);
}

function showImageOverlay() {
    const overlay = document.getElementById('images-overlay');
    if (overlay) overlay.classList.remove('hidden');
}

function closeImageOverlay(event) {
    if (event && event.target !== event.currentTarget && !event.target.classList.contains('images-overlay-close')) return;
    const overlay = document.getElementById('images-overlay');
    if (overlay) overlay.classList.add('hidden');
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
        recognition.continuous = true;
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
// Current audio element for TTS playback
let currentAudio = null;
let ttsEnabled = null; // null = not checked yet

// Check TTS availability on load
async function checkTTSStatus() {
    try {
        const response = await fetch('/api/tts-status');
        const data = await response.json();
        ttsEnabled = data.enabled;
        console.log('🔊 TTS Status:', ttsEnabled ? 'OpenAI TTS enabled' : 'Using browser TTS');
    } catch (e) {
        ttsEnabled = false;
    }
}

async function speak(text) {
    if (ttsEnabled === null) {
        await checkTTSStatus();
    }

    stopSpeaking();

    const soundWave = document.getElementById('sound-wave');
    if (soundWave) soundWave.classList.add('active');
    startAvatarVideo();

    if (ttsEnabled) {
        try {
            const gender = currentScenario?.patientInfo?.gender || 'female';

            // Create audio element that plays as it downloads
            currentAudio = new Audio();
            currentAudio.onended = () => {
                if (soundWave) soundWave.classList.remove('active');
                currentAudio = null;
                pauseAvatarVideo();
            };
            currentAudio.onerror = () => {
                if (soundWave) soundWave.classList.remove('active');
                currentAudio = null;
                pauseAvatarVideo();
            };

            // Fetch and start playing as soon as possible
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, gender })
            });

            if (response.ok && response.headers.get('content-type')?.includes('audio')) {
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                currentAudio.src = audioUrl;
                currentAudio.onended = () => {
                    if (soundWave) soundWave.classList.remove('active');
                    URL.revokeObjectURL(audioUrl);
                    currentAudio = null;
                    pauseAvatarVideo();
                };
                await currentAudio.play();
                return;
            }
        } catch (e) {
            console.log('⚠️ TTS failed:', e.message);
        }
    }

    // No fallback - only OpenAI TTS
    if (soundWave) soundWave.classList.remove('active');
    pauseAvatarVideo();
}

// Fetch TTS audio first, then show text + play audio together
async function speakWithText(text) {
    // Show text immediately
    addToTranscript('avatar', text);
    // Play audio in parallel (don't wait)
    speak(text);
}

function speakWithBrowser(text, soundWave) {
    if (!('speechSynthesis' in window)) {
        if (soundWave) soundWave.classList.remove('active');
        return;
    }

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    if (selectedLanguage === 'ar') {
        utterance.lang = 'ar-SA';
        utterance.rate = 1.4;
    } else {
        utterance.lang = 'en-US';
        utterance.rate = 1.4;
    }
    utterance.volume = 1.0;
    utterance.pitch = 1.0;

    const voices = speechSynthesis.getVoices();
    let voice = null;
    if (selectedLanguage === 'ar') {
        voice = voices.find(v => v.default && v.lang.startsWith('ar')) || voices.find(v => v.lang === 'ar-SA');
    } else {
        voice = voices.find(v => v.lang.startsWith('en-US'));
    }
    if (voice) utterance.voice = voice;

    utterance.onend = () => { 
        if (soundWave) soundWave.classList.remove('active'); 
        pauseAvatarVideo();
    };
    utterance.onerror = () => { 
        if (soundWave) soundWave.classList.remove('active'); 
        pauseAvatarVideo();
    };

    speechSynthesis.speak(utterance);
}

function stopSpeaking() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }
    pauseAvatarVideo();
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

// Microphone control (Toggle mode + Push-to-talk)
document.getElementById('mic-btn').addEventListener('click', () => {
    if (!currentSession) return;
    if (isRecording) {
        stopMic();
    } else {
        startMic();
    }
});

// Push-to-talk with Spacebar
function startMic() {
    const micBtn = document.getElementById('mic-btn');
    const micStatus = document.getElementById('mic-status');
    
    if (isRecording) return; // Already recording
    
    if (!recognition) {
        initializeSpeechRecognition();
    }
    if (!recognition) return;
    
    try {
        recognition.start();
        isRecording = true;
        micBtn.classList.add('active');
        micStatus.textContent = '🎤 يستمع... ارفع إصبعك عن المسطرة لإرسال السؤال';
        console.log('✅ Microphone ON');
    } catch (e) {
        console.log('Recognition already started');
    }
}

function stopMic() {
    const micBtn = document.getElementById('mic-btn');
    const micStatus = document.getElementById('mic-status');
    
    if (!isRecording) return;
    
    try {
        recognition.stop();
        isRecording = false;
        micBtn.classList.remove('active');
        micStatus.textContent = '🎤 اضغط مطولاً على مسطرة الكيبورد (Space) للتحدث';
        console.log('⏸️ Microphone OFF');
    } catch (e) {
        console.error('Error stopping recognition:', e);
    }
}

// Spacebar keydown = start mic, keyup = stop mic
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.repeat) {
        // Don't trigger if typing in input field
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        // Only work during session
        if (!currentSession) return;
        e.preventDefault();
        startMic();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        if (!currentSession) return;
        e.preventDefault();
        stopMic();
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
        // Stop timer
        stopTimer();
        
        // Stop all audio immediately
        stopSpeaking();
        console.log('🔇 Speech stopped');
        
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
        
        // Show thank you message then redirect to welcome
        currentSession = null;
        currentScenario = null;
        
        // Show thank you overlay
        const overlay = document.createElement('div');
        overlay.className = 'thank-you-overlay';
        overlay.innerHTML = '<div class="thank-you-box"><div class="thank-you-icon">✅</div><p>شكراً لك على المشاركة في هذه الجلسة التدريبية</p></div>';
        document.body.appendChild(overlay);
        
        // After 2.5 seconds, go back to welcome screen
        setTimeout(() => {
            overlay.remove();
            showScreen('password-screen');
        }, 2500);
        
    } catch (error) {
        console.error('Error ending session:', error);
        alert('فشل إنهاء الجلسة');
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
    // Stop all audio
    stopSpeaking();
    
    // Stop microphone recording
    if (isRecording && recognition) {
        recognition.stop();
        isRecording = false;
    }
    
    currentSession = null;
    currentScenario = null;
    showScreen('password-screen');
});

// Initialize WebSocket connection
function initializeWebSocket() {
    console.log('🔌 Connecting to WebSocket...');
    
    socket = io();
    
    socket.on('connect', async () => {
        console.log('✅ WebSocket connected:', socket.id);
        
        if (currentSession && currentScenario && window._welcomeMsg) {
            addToTranscript('avatar', window._welcomeMsg);
            
            // Use pre-fetched TTS audio
            if (window._welcomeTTSPromise) {
                const audioBlob = await window._welcomeTTSPromise;
                if (audioBlob) {
                    const soundWave = document.getElementById('sound-wave');
                    if (soundWave) soundWave.classList.add('active');
                    startAvatarVideo();
                    
                    const audioUrl = URL.createObjectURL(audioBlob);
                    currentAudio = new Audio(audioUrl);
                    currentAudio.onended = () => {
                        if (soundWave) soundWave.classList.remove('active');
                        URL.revokeObjectURL(audioUrl);
                        currentAudio = null;
                        pauseAvatarVideo();
                    };
                    currentAudio.onerror = () => {
                        if (soundWave) soundWave.classList.remove('active');
                        URL.revokeObjectURL(audioUrl);
                        currentAudio = null;
                        pauseAvatarVideo();
                    };
                    await currentAudio.play();
                    // Start timer when avatar actually starts speaking
                    startTimer();
                }
                window._welcomeTTSPromise = null;
                window._welcomeMsg = null;
            }
        }
    });
    
    socket.on('chat-response', (data) => {
        console.log('📨 Received response:', data);
        
        if (data.response) {
            // Generate Hedra video only if no local video available
            if (currentScenario && currentScenario.patientInfo && currentScenario.patientInfo.patientImage && !currentScenario.patientInfo.patientVideo) {
                generatePatientVideo(data.response);
            }
            
            // Show text and play audio together
            speakWithText(data.response);
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
