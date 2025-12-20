export default function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer vault ring */}
      <circle cx="24" cy="24" r="20" fill="#1a1a1e" stroke="url(#gradient)" strokeWidth="2"/>
      
      {/* Inner dial */}
      <circle cx="24" cy="24" r="16" fill="#252529" stroke="#3a3a3e" strokeWidth="1"/>
      
      {/* Dial markers at 12, 3, 6, 9 positions */}
      <circle cx="24" cy="8" r="1.5" fill="#f09432"/>
      <circle cx="40" cy="24" r="1.5" fill="#f09432"/>
      <circle cx="24" cy="40" r="1.5" fill="#f09432"/>
      <circle cx="8" cy="24" r="1.5" fill="#f09432"/>
      
      {/* Dial pointer/handle */}
      <line x1="24" y1="24" x2="24" y2="12" stroke="url(#gradient)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="24" cy="12" r="2" fill="#21ada0"/>
      
      {/* Center lock */}
      <circle cx="24" cy="24" r="4" fill="#ec7912"/>
      <circle cx="24" cy="24" r="2" fill="#1a1a1e"/>
      
      {/* Decorative notches around edge */}
      <path d="M 24 4 L 24 7" stroke="#6e6e73" strokeWidth="1"/>
      <path d="M 44 24 L 41 24" stroke="#6e6e73" strokeWidth="1"/>
      <path d="M 24 44 L 24 41" stroke="#6e6e73" strokeWidth="1"/>
      <path d="M 4 24 L 7 24" stroke="#6e6e73" strokeWidth="1"/>
      
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f09432"/>
          <stop offset="100%" stopColor="#21ada0"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
