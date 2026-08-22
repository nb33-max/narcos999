import { useState } from 'react';
import { ShieldAlert, Lock, Check } from 'lucide-react';
import { useToast } from '../store/ToastContext';
import { t } from '../lib/i18n';

const KEY = 'nb_age_verified';

export function isAgeVerified() {
  return localStorage.getItem(KEY) === 'true';
}

export function verifyAge() {
  localStorage.setItem(KEY, 'true');
}

export default function AgeVerificationModal({ open, onVerify }) {
  const { toast } = useToast();
  const [leaving, setLeaving] = useState(false);

  if (!open) return null;

  const confirmAge = () => {
    verifyAge();
    toast(t('age_welcome'), 'success');
    onVerify();
  };

  const leave = () => {
    setLeaving(true);
    window.location.href = 'https://www.google.com';
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm anim-fade flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-canvas rounded-2xl shadow-lift anim-slide-right overflow-hidden border border-stone">
        <div className="bg-pine text-canvas px-6 py-5 text-center">
          <div className="mx-auto w-12 h-12 bg-canvas/10 border border-canvas/20 rounded-full flex items-center justify-center">
            <ShieldAlert size={22} />
          </div>
          <h3 className="font-serif text-lg font-bold uppercase tracking-[0.12em] mt-3">{t('age_title')}</h3>
        </div>

        <div className="px-6 py-6">
          <p className="text-sm text-moss leading-relaxed text-center">{t('age_notice')}</p>
          <p className="text-xs text-moss/80 leading-relaxed text-center mt-3">{t('age_disclaimer')}</p>

          <div className="flex items-center justify-center gap-2 mt-4 text-[10px] font-bold uppercase tracking-widest text-moss">
            <Lock size={12} /> {t('age_private')}
          </div>

          <button onClick={confirmAge} className="btn-primary w-full mt-6 !py-4">
            <Check size={16} /> {t('age_confirm')}
          </button>
          <button onClick={leave} className="btn-ghost w-full mt-2 text-[11px]">
            {t('age_decline')}
          </button>
        </div>
      </div>
    </div>
  );
}
