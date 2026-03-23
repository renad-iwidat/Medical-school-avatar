import dotenv from 'dotenv';

dotenv.config();

export class HedraService {
  constructor() {
    this.apiKey = process.env.HEDRA_API_KEY;
    this.baseUrl = 'https://api.hedra.com/web-app/public';
  }

  isEnabled() {
    return !!this.apiKey;
  }

  async generateVideoWithLipSync(text, imageUrl, voiceId = 'default') {
    if (!this.isEnabled()) {
      console.log('⚠️ Hedra API not configured');
      return this.getFallbackResponse(imageUrl);
    }

    try {
      console.log('🎬 Generating video with Hedra API...');
      console.log('📝 Text:', text.substring(0, 50) + '...');
      console.log('🖼️ Image URL:', imageUrl);
      
      const payload = {
        image_url: imageUrl,
        text: text,
        voice_id: voiceId,
      };
      
      console.log('📤 Sending payload to Hedra API');
      
      const response = await fetch(`${this.baseUrl}/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      console.log('📊 Response status:', response.status);

      const responseText = await response.text();

      if (!response.ok) {
        console.error('❌ Hedra API error - Status:', response.status);
        console.error('❌ Response:', responseText.substring(0, 200));
        
        // Check if it's a subscription error
        if (response.status === 402) {
          console.log('⚠️ Hedra API requires paid subscription. Using fallback...');
          return this.getFallbackResponse(imageUrl);
        }
        
        return null;
      }

      const data = JSON.parse(responseText);
      console.log('✅ Video generation request submitted');
      console.log('✅ Response keys:', Object.keys(data));
      
      // Handle different response formats
      const videoUrl = data.video_url || data.url || data.result?.video_url || data.data?.video_url;
      
      return {
        videoUrl: videoUrl,
        duration: data.duration,
        status: data.status || 'completed',
        id: data.id,
      };
    } catch (error) {
      console.error('❌ Error generating video:', error.message);
      console.log('⚠️ Using fallback response');
      return this.getFallbackResponse(imageUrl);
    }
  }

  getFallbackResponse(imageUrl) {
    // Return fallback response with static image
    return {
      videoUrl: null,
      imageUrl: imageUrl,
      status: 'fallback',
      message: 'Using static image (Hedra API unavailable)',
    };
  }

  async getVideoStatus(videoId) {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/generations/${videoId}`, {
        headers: {
          'X-API-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error getting video status:', error);
      return null;
    }
  }
}
