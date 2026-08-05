import React from 'react';
import { getStorageBaseUrl } from '../../utils/api';
import { useSettingsStore } from '../../store/useSettingsStore';

interface DoctorInfoCardProps {
  doctor?: {
    id: number;
    name: string;
    specialization: string;
    qualifications?: string;
    expertise?: string;
    image?: string;
  };
}

export const DoctorInfoCard: React.FC<DoctorInfoCardProps> = React.memo(({ doctor }) => {
  const { get: getSetting } = useSettingsStore();

  const doctorName = doctor?.name || getSetting('doctor_name', 'ডাঃ মুহাম্মদ আসিফ সাত্তার');
  const qualifications = doctor?.qualifications || getSetting('doctor_qualifications', 'MBBS • MPH\nPGPN (Boston University, USA)');
  const specialization = (doctor?.specialization || getSetting('doctor_specialization', 'GENERAL PRACTITIONER')).toUpperCase();
  const expertise = doctor?.expertise || getSetting('doctor_expertise', 'নবজাতক শিশু • মেডিসিন • নাক, কান ও গলা • সার্জারি রোগে অভিজ্ঞ');
  const imagePath = doctor?.image || getSetting('doctor_image');

  const photoUrl = imagePath ? `${getStorageBaseUrl()}/storage/${imagePath}` : '/doctor_portrait.png';

  return (
    <div
      className="w-full bg-gradient-to-b from-slate-900 via-slate-900/95 to-indigo-950/40 border-2 border-indigo-500/30 rounded-3xl flex flex-col items-center justify-center text-center shadow-[0_0_50px_rgba(99,102,241,0.25)] relative overflow-hidden shrink-0"
      style={{ padding: '1.5cqh 1.5cqw', gap: '1cqh' }}
    >
      {/* Background Accent Halo */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Doctor Photo — compact scaling */}
      <div className="relative group shrink-0">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full blur-md opacity-60 group-hover:opacity-100 transition duration-500" />
        <img
          src={photoUrl}
          alt={doctorName}
          style={{ width: 'clamp(60px, 8cqw, 120px)', height: 'clamp(60px, 8cqw, 120px)' }}
          className="relative rounded-full object-cover border-2 border-slate-900 shadow-xl bg-slate-800 shrink-0"
        />
      </div>

      {/* Doctor Information — compact & non-overflowing */}
      <div className="w-full flex flex-col items-center text-center px-2 overflow-hidden" style={{ gap: '0.6cqh' }}>
        {/* 1. Doctor Name */}
        <h2
          className="font-bold text-white leading-tight tracking-tight drop-shadow-md text-balance truncate w-full"
          style={{ fontSize: 'clamp(12px, 1.6cqw, 24px)' }}
        >
          {doctorName}
        </h2>

        {/* 2. Qualifications */}
        <div
          className="font-medium text-amber-200/90 leading-tight whitespace-pre-line tracking-wide max-h-[3.2em] overflow-hidden"
          style={{ fontSize: 'clamp(8px, 0.9cqw, 13px)' }}
        >
          {qualifications}
        </div>

        {/* 3. Primary Specialization */}
        <h3
          className="font-bold text-indigo-400 leading-none tracking-widest uppercase truncate w-full"
          style={{ fontSize: 'clamp(9px, 1.1cqw, 16px)' }}
        >
          {specialization}
        </h3>

        {/* 4. Expertise */}
        <p
          className="font-normal text-slate-300 leading-tight text-balance max-w-xl line-clamp-2"
          style={{ fontSize: 'clamp(8px, 0.85cqw, 12px)' }}
        >
          {expertise}
        </p>
      </div>
    </div>
  );
});

DoctorInfoCard.displayName = 'DoctorInfoCard';
