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
      className="w-full bg-slate-900/95 border border-slate-800 rounded-2xl flex items-center shrink-0 overflow-hidden shadow-2xl relative z-10"
      style={{ height: 'clamp(36px, 8cqh, 72px)', padding: '0 1.5cqw', gap: '1.5cqw' }}
    >
      {/* Notice Badge */}
      <div
        className="bg-rose-500/20 border border-rose-500/40 text-rose-400 font-black uppercase tracking-wider rounded-xl flex items-center shrink-0 shadow-md"
        style={{ padding: '0.5cqh 1cqw', gap: '0.5cqw', fontSize: 'clamp(8px, 0.9cqw, 14px)' }}
      >
        <Megaphone className="animate-pulse text-rose-400" style={{ width: '1.2cqw', height: '1.2cqw' }} />
        <span>{t('footer.notice')}</span>
      </div>

      {/* Hardware-Accelerated Marquee Track */}
      <div className="flex-1 overflow-hidden relative flex items-center">
        <div className="animate-marquee whitespace-nowrap flex items-center will-change-transform translate-z-0" style={{ gap: '6cqw' }}>
          <span
            className="font-bold text-slate-100 tracking-wide leading-none"
            style={{ fontSize: 'clamp(10px, 1.8cqw, 28px)' }}
          >
            {noticeText}
          </span>
          <span
            className="font-bold text-indigo-300 tracking-wide leading-none"
            style={{ fontSize: 'clamp(10px, 1.8cqw, 28px)' }}
          >
            • {noticeText}
          </span>
        </div>
      </div>
    </div>
  );
});

AnnouncementTicker.displayName = 'AnnouncementTicker';
