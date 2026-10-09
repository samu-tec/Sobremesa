import React from 'react';

interface AdBannerPlaceholderProps {
  position?: 'top' | 'bottom' | 'modal';
  label?: string;
}

export const AdBannerPlaceholder: React.FC<AdBannerPlaceholderProps> = ({
  position = 'bottom',
  label = 'Publicidad / Patrocinador',
}) => {
  return (
    <div
      className={`w-full max-w-md mx-auto my-2 px-4 py-2 bg-slate-900/60 border border-dashed border-slate-700/80 rounded-xl flex items-center justify-between text-xs text-slate-400 select-none ${
        position === 'modal' ? 'shadow-inner' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
          Anuncio
        </span>
        <span className="truncate">{label}</span>
      </div>
      <span className="text-[10px] text-slate-500 font-mono">games.samuelciocan.com</span>
    </div>
  );
};
