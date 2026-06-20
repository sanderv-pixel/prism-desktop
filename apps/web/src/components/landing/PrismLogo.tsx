// The master Prism logo (refracting triangle). Each instance needs a unique
// gradient `id` to avoid SVG <defs> collisions when several render on one page.
export function PrismLogo({
  size = 27,
  id,
}: {
  size?: number
  id: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flex: 'none' }}
      aria-hidden="true"
    >
      <path
        d="M16 2L28 26H4L16 2Z"
        fill={`url(#${id})`}
        fillOpacity="0.2"
        stroke={`url(#${id})`}
        strokeWidth="1.5"
      />
      <path d="M16 12L22 24H10L16 12Z" fill={`url(#${id})`} />
      <defs>
        <linearGradient
          id={id}
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
