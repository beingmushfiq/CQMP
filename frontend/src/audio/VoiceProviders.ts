import type { VoiceProvider } from './types';


export class WebSpeechProvider implements VoiceProvider {
  name = 'web_speech';

  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  stop(): void {
    if (this.isAvailable()) {
      window.speechSynthesis.cancel();
    }
  }

  speak(
    text: string,
    lang: 'bn-BD' | 'en-US',
    options?: { rate?: number; pitch?: number; volume?: number }
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isAvailable()) {
        resolve();
        return;
      }

      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = options?.rate ?? 0.85;
      utterance.pitch = options?.pitch ?? 0.9;
      utterance.volume = options?.volume ?? 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }
}

export class ServerTtsProvider implements VoiceProvider {
  name = 'server_tts';

  isAvailable(): boolean {
    return true; // Cloud/Server fallback available
  }

  stop(): void {}

  async speak(text: string, lang: 'bn-BD' | 'en-US'): Promise<void> {
    // Stub for cloud audio API/pre-recorded audio files
    console.log(`[ServerTtsProvider] Playing server audio: "${text}" (${lang})`);
    return new Promise((r) => setTimeout(r, 1000));
  }
}

export class FallbackProvider implements VoiceProvider {
  name = 'fallback';
  private primary = new WebSpeechProvider();
  private secondary = new ServerTtsProvider();

  isAvailable(): boolean {
    return true;
  }

  stop(): void {
    this.primary.stop();
    this.secondary.stop();
  }

  async speak(
    text: string,
    lang: 'bn-BD' | 'en-US',
    options?: { rate?: number; pitch?: number; volume?: number }
  ): Promise<void> {
    if (this.primary.isAvailable()) {
      try {
        await this.primary.speak(text, lang, options);
        return;
      } catch {
        // Fallthrough to secondary
      }
    }
    await this.secondary.speak(text, lang);
  }
}
