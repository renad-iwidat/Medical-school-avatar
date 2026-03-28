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
      const voice = gender === 'female' ? 'nova' : 'echo';
      
      console.log(`🔊 Generating TTS | Voice: ${voice} | Gender: ${gender} | Text: ${text.substring(0, 50)}...`);

      const response = await this.client.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice: voice,
        input: text,
        speed: 1.4,
        response_format: 'mp3',
        instructions: gender === 'female' 
          ? 'Speak in Arabic with a natural, warm female voice. Sound like a real patient - slightly worried and tired.'
          : 'Speak in Arabic with a natural, clear male voice. Sound like a real patient - express pain and concern naturally.'
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
