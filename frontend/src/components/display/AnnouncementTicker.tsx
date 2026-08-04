import React from 'react';
import { Megaphone } from 'lucide-react';
import { useLanguageStore } from '../../store/useLanguageStore';

interface AnnouncementTickerProps {
  customText?: string;
}

export const AnnouncementTicker: React.FC<AnnouncementTickerProps> = React.memo(({ customText }) => {
  const { t } = useLanguageStore();

  const noticeText = customText || t('reception.print.footer') || 'অনুগ্রহ করে আপনার সিরিয়াল আসা পর্যন্ত অপেক্ষা করুন। ধন্যবাদ। Please wait for your serial number to be called.';

  return (
    <div
      style={{ height: 'clamp(60px, 8vh, 70px)' }}
      className="w-full bg-slate-900/95 border border-slate-800 rounded-2xl px-4 flex items-center gap-4 shrink-0 overflow-hidden shadow-2xl relative z-10"
    >
      {/* Notice Badge */}
      <div className="bg-rose-500/20 border border-rose-500/40 text-rose-400 font-black uppercase tracking-wider px-4 py-2 rounded-xl flex items-center gap-2 shrink-0 z-20 shadow-md">
        <Megaphone className="w-5 h-5 text-rose-400 animate-pulse" />
        <span className="text-sm md:text-base">{t('footer.notice')}</span>
      </div>

      {/* Hardware-Accelerated Marquee Track */}
      <div className="flex-1 overflow-hidden relative flex items-center">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-12 will-change-transform translate-z-0">
          <span
            style={{ fontSize: 'clamp(28px, 2vw, 32px)' }}
            className="font-bold text-slate-100 tracking-wide leading-none"
          >
            {noticeText}
          </span>
          <span
            style={{ fontSize: 'clamp(28px, 2vw, 32px)' }}
            className="font-bold text-indigo-300 tracking-wide leading-none"
          >
            • {noticeText}
          </span>
        </div>
      </div>
    </div>
  );
});

AnnouncementTicker.displayName = 'AnnouncementTicker';
