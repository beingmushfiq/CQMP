export type LanguageMode = 'bn' | 'en' | 'bilingual';

export type AnnouncementPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const AnnouncementPriority = {
  EMERGENCY: 1 as AnnouncementPriority,
  DOCTOR_READY: 2 as AnnouncementPriority,
  PATIENT_CALLED: 3 as AnnouncementPriority,
  PATIENT_RECALL: 4 as AnnouncementPriority,
  REPORT_REVIEW: 5 as AnnouncementPriority,
  BREAK_START: 6 as AnnouncementPriority,
  BREAK_END: 7 as AnnouncementPriority,
  SYSTEM_STATUS: 8 as AnnouncementPriority,
  GENERAL: 9 as AnnouncementPriority,
  CUSTOM: 9 as AnnouncementPriority,
};

export interface AnnouncementItem {
  id: string;
  type: string;
  priority: AnnouncementPriority;
  textBn?: string;
  textEn?: string;
  audioUrl?: string;
  serialNo?: number;
  patientName?: string;
  repeatCount?: number;
  repeatDelay?: number;
  timestamp: number;
}

export type AnnouncementEvent = AnnouncementItem;

export interface VoiceProvider {
  name: string;
  isAvailable(): boolean;
  speak(
    text: string,
    lang: 'bn-BD' | 'en-US',
    options?: { rate?: number; pitch?: number; volume?: number }
  ): Promise<void>;
  stop(): void;
}
