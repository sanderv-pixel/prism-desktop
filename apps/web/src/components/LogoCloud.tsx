import { siCursor, siClaude } from 'simple-icons'
import { Code2 } from 'lucide-react'

interface Logo {
  name: string
  svg: React.ReactNode
}

const simpleIconSvg = (icon: { path: string; hex: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill={`#${icon.hex}`}
    className="w-6 h-6"
    role="img"
    aria-hidden="true"
  >
    <path d={icon.path} />
  </svg>
)

const logos: Logo[] = [
  {
    name: 'VS Code',
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="#007ACC"
        className="w-6 h-6"
        role="img"
        aria-hidden="true"
      >
        <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z" />
      </svg>
    ),
  },
  {
    name: 'Cursor',
    svg: simpleIconSvg(siCursor),
  },
  {
    name: 'Codex',
    svg: <Code2 size={24} className="text-primary" />,
  },
  {
    name: 'Claude Code',
    svg: simpleIconSvg(siClaude),
  },
]

export function LogoCloud() {
  return (
    <section className="border-y border-border bg-muted/30 py-10">
      <div className="container-tight px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-medium text-muted-foreground mb-7 uppercase tracking-[0.2em]">
          Works where Ai creators work
        </p>
        <div className="flex flex-wrap justify-center gap-x-8 md:gap-x-10 gap-y-5">
          {logos.map((logo) => (
            <div
              key={logo.name}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition"
              title={logo.name}
            >
              {logo.svg}
              <span className="font-medium text-sm md:text-base">{logo.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-medium text-sm md:text-base">More to come</span>
          </div>
        </div>
      </div>
    </section>
  )
}
