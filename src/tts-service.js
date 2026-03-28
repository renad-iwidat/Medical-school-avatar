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

  /**
   * Generate speech audio from text
   * @param {string} text - Text to convert to speech
   * @param {string} gender - 'male' or 'female'
   * @returns {Buffer} - Audio buffer (mp3)
   */
  async generateSpeech(text, gender = 'female') {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      // Pick voice based on gender
      const voice = gender === 'female' ? 'nova' : 'echo';
      
      console.log(`🔊 Generating TTS | Voice: ${voice} | Gender: ${gender} | Text: ${text.substring(0, 50)}...`);

      const response = await this.client.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice: voice,
        input: text,
        speed: 1.5,
        response_format: 'mp3',
        instructions: gender === 'female' 
          ? 'Speak in Arabic with a natural, warm female voice. Sound like a real patient.'
          : 'Speak in Arabic with a natural, clear male voice. Sound like a real patient.'
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
