import type { AnnouncementItem, VoiceProvider } from './types';
import { AnnouncementPriority } from './types';
import { FallbackProvider } from './VoiceProviders';
import { PriorityPlaybackQueue } from './PriorityPlaybackQueue';



export class AudioAnnouncementEngine {
  private static instance: AudioAnnouncementEngine;
  private queue = new PriorityPlaybackQueue();
  private provider: VoiceProvider = new FallbackProvider();
  private isPlaying = false;
  private currentItem: AnnouncementItem | null = null;
  private listeners: ((currentItem: AnnouncementItem | null) => void)[] = [];

  // Audio settings
  public volume = 1.0;
  public speechRate = 0.85;
  public pitch = 0.9;
  public isMuted = false;

  private constructor() {}

  public static getInstance(): AudioAnnouncementEngine {
    if (!AudioAnnouncementEngine.instance) {
      AudioAnnouncementEngine.instance = new AudioAnnouncementEngine();
    }
    return AudioAnnouncementEngine.instance;
  }

  public subscribe(listener: (currentItem: AnnouncementItem | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.currentItem));
  }

  public setProvider(provider: VoiceProvider): void {
    this.provider = provider;
  }

  public announce(item: AnnouncementItem): void {
    if (this.isMuted) return;

    // Check if new item preempts current playing item
    if (this.currentItem && item.priority < this.currentItem.priority) {
      this.provider.stop();
      this.isPlaying = false;
    }

    this.queue.enqueue(item);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isPlaying || this.queue.isEmpty()) return;

    const item = this.queue.dequeue();
    if (!item) return;

    this.isPlaying = true;
    this.currentItem = item;
    this.notify();

    try {

      const repeatCount = item.repeatCount || (item.priority <= AnnouncementPriority.PATIENT_RECALL ? 3 : 1);
      const repeatDelay = item.repeatDelay || 3500;


      for (let i = 0; i < repeatCount; i++) {
        if (!this.isPlaying) break; // Interrupted

        // 1. Speak Bangla
        if (item.textBn) {
          await this.provider.speak(item.textBn, 'bn-BD', {
            volume: this.volume,
            rate: this.speechRate,
            pitch: this.pitch,
          });
        }

        // Inter-language pause
        if (item.textBn && item.textEn) {
          await new Promise((r) => setTimeout(r, 1200));
        }

        // 2. Speak English
        if (item.textEn) {
          await this.provider.speak(item.textEn, 'en-US', {
            volume: this.volume,
            rate: this.speechRate,
            pitch: this.pitch,
          });
        }


        // Inter-repeat pause
        if (i < repeatCount - 1) {
          await new Promise((r) => setTimeout(r, repeatDelay));
        }
      }
    } catch (e) {
      console.error('[AudioAnnouncementEngine] Playback error:', e);
    } finally {
      this.isPlaying = false;
      this.currentItem = null;
      this.notify();
      // Process next item in queue
      setTimeout(() => this.processQueue(), 500);
    }
  }

  public stop(): void {
    this.provider.stop();
    this.queue.clear();
    this.isPlaying = false;
    this.currentItem = null;
    this.notify();
  }

  public getCurrentItem(): AnnouncementItem | null {
    return this.currentItem;
  }
}

export const audioEngine = AudioAnnouncementEngine.getInstance();
