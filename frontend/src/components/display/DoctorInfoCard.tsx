import React from 'react';
import { Stethoscope } from 'lucide-react';
import { getStorageBaseUrl } from '../../utils/api';
import { useSettingsStore } from '../../store/useSettingsStore';

interface DoctorInfoCardProps {
  doctor?: {
    id: number;
    name: string;
    specialization: string;
    image?: string;
  };
}

export const DoctorInfoCard: React.FC<DoctorInfoCardProps> = React.memo(({ doctor }) => {
  const { get: getSetting } = useSettingsStore();

  const doctorName = doctor?.name || getSetting('doctor_name', 'Dr. Muhammad Asif Sattar');
  const specialization = doctor?.specialization || getSetting('doctor_specialization', 'General Practitioner');
  const imagePath = doctor?.image || getSetting('doctor_image');

  const photoUrl = imagePath ? `${getStorageBaseUrl()}/storage/${imagePath}` : '/doctor_portrait.png';

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl space-y-6">
      {/* Badge / Header */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-bold uppercase tracking-widest text-sm">
        <Stethoscope className="w-5 h-5 text-indigo-400" />
        <span>Attending Consultant</span>
      </div>

      {/* Doctor Photo — 160–180px circular */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-md opacity-40 group-hover:opacity-75 transition duration-500" />
        <img
          src={photoUrl}
          alt={doctorName}
          style={{ width: 'clamp(160px, 14vw, 180px)', height: 'clamp(160px, 14vw, 180px)' }}
          className="relative rounded-full object-cover border-4 border-slate-800 shadow-2xl bg-slate-800 shrink-0"
        />
      </div>

      {/* Name & Specialization — High contrast, generous spacing */}
      <div className="w-full space-y-3">
        {/* Doctor Name (Hero of Doctor section: clamp(48px, 4vw, 56px)) */}
        <h2
          style={{ fontSize: 'clamp(48px, 4vw, 56px)' }}
          className="font-black text-white leading-none tracking-tight drop-shadow-md text-balance"
        >
          {doctorName}
        </h2>

        {/* Specialization (clamp(26px, 2.5vw, 32px)) */}
        <p
          style={{ fontSize: 'clamp(26px, 2.5vw, 32px)' }}
          className="font-semibold text-indigo-400 tracking-wide leading-tight uppercase"
        >
          {specialization}
        </p>
      </div>
    </div>
  );
});

DoctorInfoCard.displayName = 'DoctorInfoCard';
