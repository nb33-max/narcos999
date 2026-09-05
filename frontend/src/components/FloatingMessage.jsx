import { MessageSquare, X, Send } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { t } from '../lib/i18n';
import { telegramBotUrl } from '../lib/telegram';

export default function FloatingMessage() {
  const { user, settings } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (!user) {
      navigate('/auth?redirect=/contact');
      return;
    }
    navigate('/contact');
  };

  return (
    <div className="fixed bottom-20 right-5 z-40 lg:bottom-5 flex flex-col items-end gap-3">
      {open && (
        <div className="relative bg-white border border-stone rounded-2xl shadow-lift p-4 max-w-xs anim-fade">
          <button onClick={() => setOpen(false)} className="absolute top-2 right-2 p-1 text-moss/60 hover:text-crimson">
            <X size={14} />
          </button>
          <p className="font-serif font-semibold text-pine uppercase tracking-wide text-sm">{t('msg_title')}</p>
          <p className="text-xs text-moss mt-1.5 leading-relaxed">{t('msg_subtitle')}</p>
          <a
            href={telegramBotUrl(settings)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 btn-outline w-full !py-2.5 !text-[11px] mt-3"
          >
            <Send size={12} /> {t('telegram_bot_chat')}
          </a>
          <button onClick={handleClick} className="btn-primary w-full !py-2.5 !text-[11px] mt-2">
            {user ? t('msg_open') : t('msg_signin')}
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('msg_title')}
        className="w-14 h-14 rounded-full bg-pine text-canvas shadow-lift flex items-center justify-center hover:bg-crimson transition-colors"
      >
        <MessageSquare size={22} />
      </button>
    </div>
  );
}
