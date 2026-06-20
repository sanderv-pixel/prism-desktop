import { LegalLayout } from '@/components/LegalLayout'

export const metadata = {
  title: 'Terms of Service Prism',
  description:
    'Terms and conditions for creators, advertisers, and visitors using Prism.',
}

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="June 15, 2026">
      <p>
        These Terms of Service (“Terms”) are a legal agreement between you and alsa LLC
        (“Prism,” “we,” “us,” or “our”). They govern your access to and use of the Prism
        website, browser extensions, editor extensions, APIs, advertising platform, and
        all related services (collectively, the “Service”).
      </p>
      <p>
        By creating an account, installing the extension, running campaigns, or
        otherwise using the Service, you agree to be bound by these Terms and our{' '}
        <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use the
        Service.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least 16 years old to use the Service. To receive payouts as a
        creator or place paid campaigns as an advertiser, you must be at least 18 years
        old and capable of entering into a binding contract. By using the Service, you
        represent that you meet these requirements.
      </p>

      <h2>2. Accounts and registration</h2>
      <ul>
        <li>
          You must provide accurate, current, and complete information when creating an
          account.
        </li>
        <li>
          You are responsible for safeguarding your password and for all activity that
          occurs under your account.
        </li>
        <li>
          You agree to notify us immediately of any unauthorized use of your account.
        </li>
        <li>
          We may suspend or terminate accounts that provide false information, violate
          these Terms, or engage in fraudulent or harmful activity.
        </li>
      </ul>

      <h2>3. Creator program</h2>
      <p>
        Creators may opt in to display small, labeled ads during AI-assisted workflows
        through Prism extensions or integrations.
      </p>
      <ul>
        <li>
          Earnings are based on validated, viewable impressions as determined by Prism,
          not on raw impressions or clicks alone.
        </li>
        <li>
          We reserve the right to withhold, void, or claw back earnings resulting from
          fraud, automated activity, invalid traffic, self-dealing, or any violation of
          these Terms.
        </li>
        <li>
          Payouts require a valid payout method and, where required, identity
          verification. Payouts are processed through Stripe or another payment
          provider we designate.
        </li>
        <li>
          Creators keep the revenue share stated in the applicable pricing or payout
          policy, subject to fees, taxes, and chargebacks.
        </li>
        <li>
          You may pause or uninstall the extension at any time, but any earned balance
          remains subject to minimum payout thresholds and verification requirements.
        </li>
      </ul>

      <h2>4. Advertiser program</h2>
      <p>
        Advertisers may purchase contextual ad placements subject to approval, available
        inventory, and these Terms.
      </p>
      <ul>
        <li>
          All campaigns, creative copy, and landing pages are subject to manual or
          automated policy review before going live.
        </li>
        <li>
          Only approved categories are permitted. Prohibited categories include, but
          are not limited to, gambling, adult content, deceptive financial products,
          illicit substances, weapons, and political advertising unless explicitly
          approved.
        </li>
        <li>
          Advertisers must prepay or provide valid payment authorization before
          campaigns run. All charges are non-refundable except as required by law or at
          our sole discretion.
        </li>
        <li>
          Ad delivery depends on budget, auction competitiveness, targeting criteria,
          inventory availability, and campaign approval status. We do not guarantee any
          specific volume of impressions, clicks, or conversions.
        </li>
        <li>
          You are solely responsible for the accuracy, legality, and content of your
          ads and the websites to which they link.
        </li>
      </ul>

      <h2>5. Auction, pricing, and reporting</h2>
      <ul>
        <li>
          Prism uses a blind second-price auction for eligible contextual placements.
          The winning advertiser pays the greater of the market floor and the
          second-highest qualifying bid.
        </li>
        <li>
          All pricing, minimums, and revenue shares are described in our pricing
          materials and may change from time to time.
        </li>
        <li>
          Reporting metrics, including impressions, clicks, conversions, CTR, CPM, CPC,
          and CPA, are provided for operational and billing purposes. Discrepancies
          between Prism reporting and third-party analytics are normal and do not
          entitle you to refunds.
        </li>
      </ul>

      <h2>6. Prohibited conduct</h2>
      <p>You may not, and may not permit others to:</p>
      <ul>
        <li>
          Manipulate impressions, clicks, conversions, or any other metric through
          bots, scripts, click farms, automated tools, or coordinated human activity.
        </li>
        <li>
          Interfere with the Service, extensions, auction, or other users, including by
          reverse engineering, scraping, or exploiting vulnerabilities.
        </li>
        <li>
          Upload malicious code, malware, or content that violates applicable laws or
          third-party rights.
        </li>
        <li>
          Use the Service to collect, store, or process sensitive personal data
          without authorization or lawful basis.
        </li>
        <li>Harass, abuse, or impersonate any person or entity.</li>
        <li>
          Run ads or use the Service for any unlawful, fraudulent, defamatory, or
          discriminatory purpose.
        </li>
      </ul>

      <h2>7. Intellectual property</h2>
      <p>
        Prism and its licensors own all rights in the Service, including trademarks,
        logos, software, and content. You retain ownership of the content you create or
        upload. By submitting ad creative or other content, you grant us a limited
        license to use, display, and distribute it solely to operate the Service.
      </p>

      <h2>8. Privacy and data</h2>
      <p>
        Your use of the Service is also governed by our{' '}
        <a href="/privacy">Privacy Policy</a>. By using the Service, you consent to the
        collection, use, and sharing of data as described therein.
      </p>

      <h2>9. Termination and suspension</h2>
      <p>
        We may suspend or terminate your access to the Service at any time, with or
        without notice, if you violate these Terms, engage in fraud, or create risk or
        legal exposure for us. You may close your account at any time by contacting us.
        Upon termination, your right to use the Service ceases immediately, but
        provisions regarding payment, confidentiality, intellectual property, and
        liability survive.
      </p>

      <h2>10. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY
        KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE
        UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF HARMFUL COMPONENTS. WE DO NOT
        GUARANTEE ANY SPECIFIC ADVERTISING RESULTS, EARNINGS, OR AUDIENCE REACH.
      </p>

      <h2>11. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, ALSA LLC AND ITS AFFILIATES, OFFICERS,
        EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
        SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, ARISING
        OUT OF OR RELATED TO YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE
        POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF
        THESE TERMS WILL NOT EXCEED THE GREATER OF THE AMOUNT YOU PAID US IN THE 12
        MONTHS PRIOR TO THE CLAIM OR $100 USD.
      </p>

      <h2>12. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless alsa LLC and its affiliates, officers,
        employees, and agents from any claims, damages, liabilities, costs, or expenses
        arising out of your use of the Service, your content, your ads, or your
        violation of these Terms.
      </p>

      <h2>13. Governing law and dispute resolution</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware, United States,
        without regard to conflict-of-law principles. Any dispute arising from these
        Terms or the Service will be resolved through binding arbitration in Delaware,
        except that either party may seek injunctive relief in a court of competent
        jurisdiction.
      </p>

      <h2>14. Changes to the Terms</h2>
      <p>
        We may modify these Terms from time to time. We will post the updated Terms on
        this page with a revised “Last updated” date. Material changes will be notified
        by email or through the Service. Your continued use after changes constitutes
        acceptance.
      </p>

      <h2>15. Contact us</h2>
      <p>
        If you have any questions about these Terms, please contact us at{' '}
        <a href="mailto:hello@goprism.dev">hello@goprism.dev</a>.
      </p>
    </LegalLayout>
  )
}
