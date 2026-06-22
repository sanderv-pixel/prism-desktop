import type { Metadata } from 'next'
import './v2.css'
import { LandingV2 } from '@/components/v2/LandingV2'

export const metadata: Metadata = {
  title: 'Get paid while AI thinks',
  description:
    'While your AI is thinking, Prism slips one small, relevant ad onto the status line, and pays you half of what the advertiser bids. It is gone the second your AI replies.',
}

/**
 * Review alias for the "Inside the Stream" landing. Same composition now served
 * at `/`; kept here so the design can be linked/reviewed directly.
 */
export default function V2Page() {
  return <LandingV2 />
}
