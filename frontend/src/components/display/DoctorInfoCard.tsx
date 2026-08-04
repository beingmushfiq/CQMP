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
    <div className="w-full bg-gradient-to-b from-slate-900 via-slate-900/95 to-indigo-950/40 border-2 border-indigo-500/30 rounded-3xl p-6 md:p-8 flex flex-col items-center text-center shadow-[0_0_50px_rgba(99,102,241,0.25)] space-y-6 shrink-0 relative overflow-hidden">
      {/* Background Accent Halo */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Doctor Photo — 160–180px circular */}
      <div className="relative group shrink-0">
        <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full blur-md opacity-60 group-hover:opacity-100 transition duration-500" />
        <img
          src={photoUrl}
          alt={doctorName}
          style={{ width: 'clamp(160px, 14vw, 180px)', height: 'clamp(160px, 14vw, 180px)' }}
          className="relative rounded-full object-cover border-4 border-slate-900 shadow-2xl bg-slate-800 shrink-0"
        />
      </div>

      {/* Doctor Information Sections — Ordered 1 to 4 with generous vertical spacing */}
      <div className="w-full flex flex-col items-center space-y-5 text-center px-2">
        {/* 1. Doctor Name: 54–60px, Bold */}
        <h2
          style={{ fontSize: 'clamp(54px, 4.5vw, 60px)' }}
          className="font-bold text-white leading-tight tracking-tight drop-shadow-md text-balance"
        >
          {doctorName}
        </h2>

        {/* 2. Qualifications: 26–30px, Medium */}
        <div
          style={{ fontSize: 'clamp(26px, 2.2vw, 30px)' }}
          className="font-medium text-amber-200/90 leading-snug whitespace-pre-line tracking-wide"
        >
          {qualifications}
        </div>

        {/* 3. Primary Specialization: 34–40px, Bold (ALL CAPS) */}
        <h3
          style={{ fontSize: 'clamp(34px, 2.8vw, 40px)' }}
          className="font-bold text-indigo-400 leading-none tracking-widest uppercase py-1"
        >
          {specialization}
        </h3>

        {/* 4. Expertise: 24–28px, Regular */}
        <p
          style={{ fontSize: 'clamp(24px, 2vw, 28px)' }}
          className="font-normal text-slate-300 leading-relaxed text-balance max-w-xl"
        >
          {expertise}
        </p>
      </div>
    </div>
  );
});

DoctorInfoCard.displayName = 'DoctorInfoCard';
