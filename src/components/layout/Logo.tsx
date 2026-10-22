/** Docutile mark: four document tiles in a grid, one highlighted. */
export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false" style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.7))" }}>
      <rect x="3" y="3" width="12" height="12" rx="2.5" fill="#5eead4" />
      <rect x="17" y="3" width="12" height="12" rx="2.5" fill="none" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="3" y="17" width="12" height="12" rx="2.5" fill="none" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="17" y="17" width="12" height="12" rx="2.5" fill="none" stroke="#cbd5e1" strokeWidth="2" />
    </svg>
  );
}
