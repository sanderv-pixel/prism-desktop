export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M16 2L28 26H4L16 2Z"
        fill="url(#prism-gradient)"
        fillOpacity="0.2"
        stroke="url(#prism-gradient)"
        strokeWidth="1.5"
      />
      <path
        d="M16 12L22 24H10L16 12Z"
        fill="url(#prism-gradient)"
      />
      <defs>
        <linearGradient
          id="prism-gradient"
          x1="4"
          y1="2"
          x2="28"
          y2="26"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#8b5cf6" />
          <stop offset="0.5" stopColor="#ec4899" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  )
}
