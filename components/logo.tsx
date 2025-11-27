interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 48 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
        <linearGradient id="logoGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>
      </defs>
      
      {/* Outer rounded square frame */}
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="14"
        stroke="url(#logoGradient)"
        strokeWidth="3"
        fill="none"
      />
      
      {/* Inner frames for GIF/animation effect */}
      <rect
        x="10"
        y="10"
        width="44"
        height="44"
        rx="10"
        stroke="url(#logoGradientLight)"
        strokeWidth="2"
        fill="none"
        opacity="0.5"
      />
      
      {/* Play triangle */}
      <path
        d="M26 20L46 32L26 44V20Z"
        fill="url(#logoGradient)"
      />
      
      {/* Motion lines */}
      <line
        x1="18"
        y1="26"
        x2="22"
        y2="26"
        stroke="url(#logoGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <line
        x1="16"
        y1="32"
        x2="22"
        y2="32"
        stroke="url(#logoGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
      <line
        x1="18"
        y1="38"
        x2="22"
        y2="38"
        stroke="url(#logoGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

