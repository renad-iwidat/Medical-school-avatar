// Translations for UI
const translations = {
    ar: {
        title: 'أفاتار طبي تفاعلي',
        subtitle: 'نظام تدريب OSCE',
        yourName: 'اسمك:',
        namePlaceholder: 'أدخل اسمك',
        language: 'اللغة / Language:',
        selectScenario: 'اختر السيناريو:',
        loading: 'جاري التحميل...',
        startSession: 'ابدأ الجلسة',
        patientInfo: 'معلومات المريض',
        chiefComplaint: 'الشكوى الرئيسية',
        conversation: 'المحادثة',
        virtualPatient: 'المريض الافتراضي',
        endSession: 'إنهاء',
        notConnected: '⚪ غير متصل',
        connected: '🟢 متصل',
        micStopped: '🎤 اضغط الميكروفون للتحدث',
        micRecording: '🎤 يسجل... تكلم الآن',
        micActive: '🎤 نشط',
        messagePlaceholder: 'اكتب سؤالك هنا...',
        send: 'إرسال',
        newSession: 'جلسة جديدة',
        you: 'أنت',
        patient: 'المريض',
        system: 'النظام',
        name: 'الاسم:',
        age: 'العمر:',
        gender: 'الجنس:',
        occupation: 'المهنة:',
        male: 'ذكر',
        female: 'أنثى',
        years: 'سنة',
        // Occupations translations
        occupations: {
            'Office employee': 'موظف مكتب',
            'Teacher': 'معلم',
            'Housewife': 'ربة منزل',
            'Graphic designer': 'مصمم جرافيك'
        },
        // Patient names translations to Arabic
        patientNames: {
            'Ms. Sara Ahmad': 'سارة أحمد',
            'Mr. Khaled Mohamed': 'خالد محمد',
            'Mr. Ahmad Khalil': 'أحمد خليل',
            'Sarah Ahmed': 'سارة أحمد'
        },
        // Chief complaints translations - short version with Arabic meaning
        chiefComplaints: {
            'Right radius/ulnar fracture and weight gain': 'كسر في الكعبرة والزند وزيادة الوزن - Right radius/ulnar fracture and weight gain',
            'Cough and shortness of breath': 'سعال وضيق في التنفس - Cough and shortness of breath',
            'Severe right knee pain': 'ألم شديد في الركبة اليمنى - Severe right knee pain',
            'bilateral hand pain': 'ألم ثنائي في اليدين - bilateral hand pain'
        }
    },
    en: {
        title: 'Interactive Medical Avatar',
        subtitle: 'OSCE Training System',
        yourName: 'Your Name:',
        namePlaceholder: 'Enter your name',
        language: 'Language / اللغة:',
        selectScenario: 'Select Scenario:',
        loading: 'Loading...',
        startSession: 'Start Session',
        patientInfo: 'Patient Information',
        chiefComplaint: 'Chief Complaint',
        conversation: 'Conversation',
        virtualPatient: 'Virtual Patient',
        endSession: 'End',
        notConnected: '⚪ Not Connected',
        connected: '🟢 Connected',
        micStopped: '🎤 Click microphone to speak',
        micRecording: '🎤 Recording... Speak now',
        micActive: '🎤 Active',
        messagePlaceholder: 'Type your question here...',
        send: 'Send',
        newSession: 'New Session',
        you: 'You',
        patient: 'Patient',
        system: 'System',
        name: 'Name:',
        age: 'Age:',
        gender: 'Gender:',
        occupation: 'Occupation:',
        male: 'Male',
        female: 'Female',
        years: 'years old',
        // Occupations translations
        occupations: {
            'Office employee': 'Office employee',
            'Teacher': 'Teacher',
            'Housewife': 'Housewife',
            'Graphic designer': 'Graphic designer'
        },
        // Patient names translations
        patientNames: {
            'Ms. Sara Ahmad': 'Ms. Sara Ahmad',
            'Mr. Khaled Mohamed': 'Mr. Khaled Mohamed',
            'Mr. Ahmad Khalil': 'Mr. Ahmad Khalil',
            'Sarah Ahmed': 'Sarah Ahmed'
        },
        // Chief complaints translations - short version with Arabic meaning
        chiefComplaints: {
            'Right radius/ulnar fracture and weight gain': 'Right radius/ulnar fracture and weight gain',
            'Cough and shortness of breath': 'Cough and shortness of breath',
            'Severe right knee pain': 'Severe right knee pain',
            'bilateral hand pain': 'bilateral hand pain'
        }
    }
};

function getCategoryName(category, lang) {
    return category;
}

function getItemName(key, lang) {
    return key;
}

function updateUILanguage(lang) {
    const t = translations[lang];
    
    console.log('🔄 Updating UI to language:', lang);
    
    // Update page direction
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    
    // Update header - check if exists
    const headerH1 = document.querySelector('header h1');
    const headerP = document.querySelector('header p');
    if (headerH1) headerH1.textContent = `🏥 ${t.title}`;
    if (headerP) headerP.textContent = t.subtitle;
    
    // Update setup screen - check if exists
    const studentNameLabel = document.querySelector('label[for="student-name"]');
    const studentNameInput = document.getElementById('student-name');
    const languageLabel = document.querySelector('label[for="language-select"]');
    const scenarioLabel = document.querySelector('label[for="scenario-select"]');
    const startBtn = document.getElementById('start-btn');
    
    if (studentNameLabel) studentNameLabel.textContent = t.yourName;
    if (studentNameInput) studentNameInput.placeholder = t.namePlaceholder;
    if (languageLabel) languageLabel.textContent = t.language;
    if (scenarioLabel) scenarioLabel.textContent = t.selectScenario;
    if (startBtn) startBtn.textContent = t.startSession;
    
    // Update session screen labels - check if exists
    const infoCards = document.querySelectorAll('.info-section .card h3');
    if (infoCards[0]) infoCards[0].textContent = t.patientInfo;
    if (infoCards[1]) infoCards[1].textContent = t.chiefComplaint;
    if (infoCards[2]) infoCards[2].textContent = t.conversation;
    
    // Update buttons - check if exists
    const endBtn = document.getElementById('end-btn');
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');
    
    if (endBtn) endBtn.textContent = t.endSession;
    if (sendBtn) sendBtn.textContent = t.send;
    if (messageInput) messageInput.placeholder = t.messagePlaceholder;
    
    // Update results screen - check if exists
    const newSessionBtn = document.getElementById('new-session-btn');
    
    if (newSessionBtn) newSessionBtn.textContent = t.newSession;
    
    // Update status - check if exists
    const connectionStatus = document.getElementById('connection-status');
    const micStatus = document.getElementById('mic-status');
    
    if (!currentSession) {
        if (connectionStatus) connectionStatus.textContent = t.notConnected;
        if (micStatus) micStatus.textContent = t.micStopped;
    }
    
    console.log('✅ UI language updated successfully');
}

// Listen for language changes
document.getElementById('language-select')?.addEventListener('change', (e) => {
    updateUILanguage(e.target.value);
});
