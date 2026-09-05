export function BitcoinIcon({ size = 26, className = 'text-pine' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.545-2.19c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.524 2.75 2.084v.006z" />
    </svg>
  );
}

export function PayPalIcon({ size = 26, className = '' }) {
  return (
    <span className={`${className} font-serif font-black leading-none select-none`} style={{ fontSize: Math.round(size * 0.6) }} aria-hidden="true">PP</span>
  );
}

export function BankIcon({ size = 26, className = 'text-pine' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M3 9.5v2h18v-2" />
      <path d="M5 11.5V19M9 11.5V19M15 11.5V19M19 11.5V19" />
      <path d="M3 19h18" />
      <path d="M3 21h18" />
    </svg>
  );
}

export function GiftCardIcon({ size = 26, className = 'text-pine' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M12 8v12" />
      <path d="M3 13h18" />
      <path d="M12 8C10 8 8.4 7.1 8.4 5.6 8.4 4.3 9.6 3.4 11 4.2 11.7 4.7 12 5.6 12 8z" />
      <path d="M12 8c2 0 3.6-.9 3.6-2.4C15.6 4.3 14.4 3.4 13 4.2 12.3 4.7 12 5.6 12 8z" />
    </svg>
  );
}
