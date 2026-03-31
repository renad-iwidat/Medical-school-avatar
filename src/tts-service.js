import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export class TTSService {
  constructor() {
    this.client = null;
    const ttsKey = process.env.OPENAI_TTS_API_KEY || process.env.OPENAI_API_KEY;
    if (ttsKey) {
      this.client = new OpenAI({
        apiKey: ttsKey
      });
    }
  }

  isEnabled() {
    return this.client !== null;
  }

  async generateSpeech(text, gender = 'female') {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      // Use more natural voices
      const voice = gender === 'female' ? 'shimmer' : 'fable';
      
      console.log(`🔊 Generating TTS | Voice: ${voice} | Gender: ${gender} | Text: ${text.substring(0, 50)}...`);

      // Enhanced instructions for more natural patient-like speech
      const instructions = gender === 'female' 
        ? 'تحدثي بالعربية بنبرة طبيعية ودافئة كمريضة حقيقية. أظهري القلق والتعب بشكل خفيف. تكلمي بهدوء وتعاون مع الطبيب. عبّري عن الألم والانزعاج بطريقة واقعية وإنسانية. استخدمي نبرة صوت متعبة قليلاً لكن واضحة.'
        : 'تحدث بالعربية بنبرة طبيعية وواضحة كمريض حقيقي. أظهر القلق والألم بشكل طبيعي. تكلم بهدوء وتعاون مع الطبيب. عبّر عن الانزعاج والتعب بطريقة واقعية وإنسانية. استخدم نبرة صوت متعبة قليلاً لكن واضحة ومفهومة.';

      const response = await this.client.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice: voice,
        input: text,
        speed: 1.4,
        response_format: 'mp3',
        instructions: instructions
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      console.log(`✅ TTS generated | Size: ${buffer.length} bytes`);
      return buffer;
    } catch (error) {
      console.error('❌ TTS Error:', error.message);
      return null;
    }
  }
}
