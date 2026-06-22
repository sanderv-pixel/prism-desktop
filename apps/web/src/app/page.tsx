import './v2/v2.css'
import { LandingV2 } from '@/components/v2/LandingV2'

export const metadata = {
  title: 'Prism — Get paid while AI thinks',
  description:
    'Prism shows one small, relevant ad while your AI is already thinking, and pays you half of every advertiser dollar. Private by architecture. Works with Claude, Cursor, Codex, VS Code, Gemini, and more.',
}

export default function Home() {
  return <LandingV2 />
}
