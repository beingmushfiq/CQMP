import type { AnnouncementItem } from './types';
import { AnnouncementPriority } from './types';


export class PriorityPlaybackQueue {
  private queue: AnnouncementItem[] = [];
  private lastAnnouncedSerial: number | null = null;
  private lastAnnouncedTime: number = 0;
  private cooldownMs: number = 5000; // 5s duplicate call cooldown

  enqueue(item: AnnouncementItem): AnnouncementItem[] {
    // Smart Deduplication Rule: Don't enqueue same serial call within cooldown
    if (
      item.serialNo &&
      item.serialNo === this.lastAnnouncedSerial &&
      Date.now() - this.lastAnnouncedTime < this.cooldownMs &&
      item.priority > AnnouncementPriority.PATIENT_RECALL
    ) {
      return this.queue;
    }

    if (item.serialNo) {
      this.lastAnnouncedSerial = item.serialNo;
      this.lastAnnouncedTime = Date.now();
    }

    // High Priority Preemption Rule: Emergency (P1) or Doctor Ready (P2) clears lower items
    if (item.priority <= AnnouncementPriority.DOCTOR_READY) {
      this.queue = [item];
    } else {
      this.queue.push(item);
      // Sort by priority ascending (P1 highest, P9 lowest), then by timestamp
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.timestamp - b.timestamp;
      });
    }

    return this.queue;
  }

  dequeue(): AnnouncementItem | undefined {
    return this.queue.shift();
  }

  clear(): void {
    this.queue = [];
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  peek(): AnnouncementItem | undefined {
    return this.queue[0];
  }
}
