import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};
const COLORS = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const value = useMemo(() => ({ toast: push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div key={t.id} className="anim-toast bg-white border border-stone rounded-xl shadow-lift px-4 py-3 flex items-start gap-3">
              <Icon size={18} className={`shrink-0 mt-0.5 ${COLORS[t.type] || COLORS.info}`} />
              <p className="text-sm text-pine flex-1 leading-snug">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-moss/50 hover:text-moss transition-colors">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
