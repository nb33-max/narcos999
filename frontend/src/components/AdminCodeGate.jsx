import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, KeyRound, ArrowLeft } from 'lucide-react';

const GATE_CODE = '10042';
const GATE_KEY = 'nb_admin_gate';

export function clearAdminGate() {
  try { sessionStorage.removeItem(GATE_KEY); } catch { /* noop */ }
}

export function isAdminGateOpen() {
  try { return sessionStorage.getItem(GATE_KEY) === '1'; } catch { return false; }
}

export default function AdminCodeGate({ children }) {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [unlocked, setUnlocked] = useState(isAdminGateOpen);

  if (unlocked) return children;

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (value === GATE_CODE) {
      try { sessionStorage.setItem(GATE_KEY, '1'); } catch { /* noop */ }
      setUnlocked(true);
    } else {
      setError('Invalid access code.');
      setValue('');
    }
  };

  return (
    <div className="min-h-screen bg-subcard/40 flex items-center justify-center p-4">
      <div className="w-full max-w-sm card p-8 text-center anim-fade">
        <div className="w-14 h-14 rounded-2xl bg-crimson/10 text-crimson flex items-center justify-center mx-auto"><Lock size={24} /></div>
        <h1 className="font-serif text-xl font-bold text-pine mt-4">ADMIN ACCESS CODE</h1>
        <p className="text-moss text-sm mt-2">Enter the 5-digit access code to open the dashboard.</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="password"
            inputMode="numeric"
            maxLength={5}
            autoFocus
            className="input text-center text-xl tracking-[0.6em] font-bold"
            placeholder="•••••"
            value={value}
            onChange={(e) => { setValue(e.target.value.replace(/[^0-9]/g, '').slice(0, 5)); setError(''); }}
          />
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={value.length !== 5} className="btn-primary w-full"><KeyRound size={15} /> UNLOCK</button>
        </form>
        <button onClick={() => navigate('/')} className="btn-ghost mt-3"><ArrowLeft size={13} /> BACK TO STORE</button>
      </div>
    </div>
  );
}
