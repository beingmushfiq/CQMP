import { useEffect } from 'react';
import { echo } from '../utils/echo';
import { audioEngine } from '../audio/AudioAnnouncementEngine';
import { AnnouncementPriority } from '../audio/types';

/**
 * useAudioSync
 *
 * Subscribes to Laravel Echo (Reverb) broadcast channels and feeds events
 * into the AudioAnnouncementEngine. Must be mounted once at the display/TV
 * root and optionally in dashboards.
 *
 * Channels:
 *  - announcements          → custom, test
 *  - display-state          → mode changes (break, emergency, report, normal)
 *  - doctor-queue.{id}      → patient.called, patient.recalled (via queue events)
 *
 * Note: doctor-queue channel requires a known doctorId. When unknown (TV
 * unauthenticated view), we subscribe to the public `announcements` channel only
 * and rely on the backend AnnouncementService to broadcast calls there.
 */
export function useAudioSync(doctorId?: number) {
  useEffect(() => {
    // ── Channel: Announcements (custom + speaker test) ─────────────────
    const announcementsChannel = echo.channel('announcements');

    announcementsChannel
      .listen('.announcement.created', (data: any) => {
        if (!data) return;
        audioEngine.announce({
          id: `custom-${Date.now()}`,
          type: data.type || 'custom',
          priority: data.priority || AnnouncementPriority.CUSTOM,
          textBn: data.text_bn,
          textEn: data.text_en,
          repeatCount: data.repeat_count || 1,
          repeatDelay: data.repeat_delay,
          timestamp: Date.now(),
        });
      });

    // ── Channel: Display State changes ─────────────────────────────────
    const displayChannel = echo.channel('display-state');

    displayChannel
      .listen('.DisplayStateUpdated', (data: any) => {
        const mode = data?.mode;
        if (!mode) return;

        if (mode === 'EMERGENCY') {
          audioEngine.announce({
            id: `emergency-${Date.now()}`,
            type: 'emergency',
            priority: AnnouncementPriority.EMERGENCY,
            textBn: 'জরুরি পরিস্থিতির কারণে চিকিৎসা সেবা সাময়িক বন্ধ আছে। অনুগ্রহ করে অপেক্ষা করুন।',
            textEn: 'Emergency in progress. Consultation is temporarily paused. Please wait.',
            repeatCount: 1,
            timestamp: Date.now(),
          });
        } else if (mode === 'BREAK' || mode === 'LUNCH' || mode === 'PRAYER') {
          audioEngine.announce({
            id: `break-${Date.now()}`,
            type: 'break_start',
            priority: AnnouncementPriority.BREAK_START,
            textBn: 'চিকিৎসক সাময়িক বিরতিতে আছেন। অনুগ্রহ করে অপেক্ষা করুন।',
            textEn: 'The doctor is currently on a short break. Please wait.',
            repeatCount: 1,
            timestamp: Date.now(),
          });
        } else if (mode === 'REPORT') {
          audioEngine.announce({
            id: `report-${Date.now()}`,
            type: 'report_review',
            priority: AnnouncementPriority.REPORT_REVIEW,
            textBn: 'চিকিৎসক রিপোর্ট পর্যালোচনা করছেন। অনুগ্রহ করে অপেক্ষা করুন।',
            textEn: 'The doctor is currently reviewing medical reports. Please wait.',
            repeatCount: 1,
            timestamp: Date.now(),
          });
        } else if (mode === 'NORMAL') {
          audioEngine.announce({
            id: `resume-${Date.now()}`,
            type: 'break_end',
            priority: AnnouncementPriority.BREAK_END,
            textBn: 'চিকিৎসা কার্যক্রম পুনরায় শুরু হয়েছে।',
            textEn: 'Medical consultations have resumed.',
            repeatCount: 1,
            timestamp: Date.now(),
          });
        }
      });

    // ── Channel: Doctor Queue events (patient called / recalled) ───────
    let queueChannel: any = null;
    if (doctorId) {
      queueChannel = echo.channel(`doctor-queue.${doctorId}`);

      queueChannel
        .listen('.QueueUpdated', (data: any) => {
          const item = data?.queue_item;
          if (!item || item.status !== 'Called') return;

          audioEngine.announce({
            id: `called-${item.serial_no}-${Date.now()}`,
            type: 'patient_called',
            priority: AnnouncementPriority.PATIENT_CALLED,
            serialNo: item.serial_no,
            patientName: item.patient?.name,
            textBn: `সিরিয়াল নম্বর ${item.serial_no}, অনুগ্রহ করে চিকিৎসকের কক্ষে প্রবেশ করুন।`,
            textEn: `Serial number ${item.serial_no}, please enter the doctor's chamber.`,
            repeatCount: 3,
            repeatDelay: 3000,
            timestamp: Date.now(),
          });
        });
    }

    return () => {
      echo.leave('announcements');
      echo.leave('display-state');
      if (doctorId) {
        echo.leave(`doctor-queue.${doctorId}`);
      }
    };
  }, [doctorId]);
}

