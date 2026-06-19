import { LegalLayout } from '@/components/LegalLayout'

export const metadata = {
  title: 'Privacy Policy Prism',
  description:
    'How Prism collects, uses, and protects your personal data.',
}

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="June 15, 2026">
      <p>
        alsa LLC (“Prism,” “we,” “us,” or “our”) operates the Prism
        contextual advertising platform, including our website, browser extensions,
        editor extensions, and APIs (collectively, the “Service”). This Privacy Policy
        explains how we collect, use, store, share, and protect your personal data
        when you use the Service as a creator, advertiser, or visitor.
      </p>
      <p>
        By using the Service, you acknowledge that you have read and understood this
        Privacy Policy. If you do not agree, please do not use the Service.
      </p>

      <h2>1. Important privacy principles</h2>
      <p>
        Prism is designed with privacy at its core. We do not collect, process, or
        store the content of your prompts, source code, designs, model outputs,
        filenames, repository names, chat history, or any other content of your work.
        Ad matching is performed using coarse, on-device contextual signals, not by
        building behavioral profiles across services.
      </p>

      <h2>2. Data controller</h2>
      <p>
        For purposes of the EU/UK General Data Protection Regulation (“GDPR”), alsa
        LLC is the data controller of personal data processed through
        the Service. You can contact our privacy team at{' '}
        <a href="mailto:privacy@goprism.dev">privacy@goprism.dev</a>.
      </p>

      <h2>3. Personal data we collect</h2>
      <p>
        We collect only the personal data that is necessary to provide, secure, and
        improve the Service.
      </p>

      <h3>3.1 Account and profile data</h3>
      <ul>
        <li>Email address and authentication credentials (managed by Supabase Auth).</li>
        <li>Creator profile information, such as display name and payout preferences.</li>
        <li>Advertiser profile information, such as company name, website, billing address, and tax details.</li>
        <li>Stripe account identifiers, Connect account IDs, and transaction records.</li>
      </ul>

      <h3>3.2 Contextual signals</h3>
      <p>
        When the Service matches an ad, it may receive coarse contextual signals from
        your device or browser extension, such as:
      </p>
      <ul>
        <li>The type of editor or Ai tool in use (e.g., VS Code, Cursor, ChatGPT).</li>
        <li>Programming language mode or rough project category (e.g., TypeScript, SaaS).</li>
        <li>General region or timezone, derived from coarse IP geolocation.</li>
        <li>Time window or day-of-week preferences selected by the advertiser.</li>
      </ul>
      <p>
        These signals are intentionally high-level. We do not receive the underlying
        content of your work, your prompts, or any detailed browsing history.
      </p>

      <h3>3.3 Editor extension data</h3>
      <p>
        The Prism extension for VS Code, Cursor, and compatible editors collects
        only what is needed to deliver contextual ads and prevent fraud:
      </p>
      <ul>
        <li>
          A first-party, randomly generated device/install identifier created on
          first run.
        </li>
        <li>
          Coarse contextual signals, such as the active programming language
          mode (e.g., TypeScript, Python) and the type of Ai tool detected (e.g.,
          Cursor Tab, Copilot).
        </li>
        <li>
          Ad interaction events (impressions, clicks, hides) tied to the
          device/session ID and campaign ID.
        </li>
        <li>
          Client IP address and user-agent string sent automatically by the
          network request.
        </li>
      </ul>
      <p>
        We do not collect, transmit, or store source code, file names, prompts,
        chat history, terminal output, repository names, or any other content of
        your work. All ad matching uses coarse, on-device signals.
      </p>

      <h3>3.4 Ad event and interaction data</h3>
      <p>
        To operate the advertising network, measure performance, and prevent fraud, we
        collect event data such as:
      </p>
      <ul>
        <li>
          <strong>Impressions:</strong> campaign ID, session ID, contextual signal,
          attention time (duration), auction clearing price, validation result, payout
          amount, fraud flags, and a hash of the context.
        </li>
        <li>
          <strong>Clicks:</strong> campaign ID, destination URL, session ID, contextual
          signal, and timestamp.
        </li>
        <li>
          <strong>Conversions:</strong> campaign ID, event name (e.g., “purchase”),
          optional value, currency, and attribution window.
        </li>
        <li>
          <strong>User feedback:</strong> ad hides, pauses, reports, and preference
          choices.
        </li>
      </ul>

      <h3>3.4 Fraud and security signals</h3>
      <ul>
        <li>Client IP address and user-agent string.</li>
        <li>Device/session identifiers generated by our first-party systems.</li>
        <li>Anomaly signals and trust scores used to detect invalid traffic.</li>
        <li>Audit logs of account actions and API requests.</li>
      </ul>

      <h3>3.5 Payment and billing data</h3>
      <p>
        Payment processing is handled by Stripe. We do not store full payment card
        numbers or bank account credentials. We do retain transaction records,
        invoices, and Stripe account identifiers for billing, tax, and accounting
        purposes.
      </p>

      <h3>3.6 Communications</h3>
      <ul>
        <li>Emails, support tickets, and other messages you send us.</li>
        <li>Marketing preferences and consent records.</li>
      </ul>

      <h2>4. How we collect personal data</h2>
      <ul>
        <li>
          <strong>Directly from you:</strong> when you create an account, complete
          onboarding, create campaigns, or contact support.
        </li>
        <li>
          <strong>Automatically:</strong> when you use the extensions or interact with
          ads, through server logs, analytics, and fraud-detection systems.
        </li>
        <li>
          <strong>From service providers:</strong> such as Stripe for payment
          verification and Supabase for authentication.
        </li>
      </ul>

      <h2>5. Legal bases and purposes of processing</h2>
      <p>We process personal data for the following purposes and legal bases:</p>
      <ul>
        <li>
          <strong>To provide the Service (contractual necessity):</strong> authenticate
          users, serve contextual ads, record validated impressions, process clicks and
          conversions, and operate the auction.
        </li>
        <li>
          <strong>To process payments (contractual necessity and legal obligation):</strong>{' '}
          bill advertisers, pay creators, issue invoices, and meet tax and accounting
          obligations.
        </li>
        <li>
          <strong>To ensure security and prevent fraud (legitimate interest):</strong>{' '}
          detect invalid traffic, enforce rate limits, calculate trust scores, and
          protect the integrity of the network.
        </li>
        <li>
          <strong>To comply with legal obligations:</strong> respond to lawful requests,
          enforce our Terms of Service, and meet regulatory requirements.
        </li>
        <li>
          <strong>To improve the Service (legitimate interest or consent):</strong>{' '}
          analyze aggregated usage, troubleshoot issues, and develop new features. Where
          required, we obtain your consent for non-essential analytics or marketing.
        </li>
      </ul>

      <h2>6. Cookies and similar technologies</h2>
      <p>
        Prism does not use third-party advertising or behavioral tracking cookies. We
        use:
      </p>
      <ul>
        <li>
          <strong>First-party authentication cookies</strong> to keep you signed in
          (provided by Supabase Auth).
        </li>
        <li>
          <strong>Preference and security tokens</strong> stored locally where necessary
          for Service functionality.
        </li>
        <li>
          <strong>Cloudflare Turnstile</strong> may set cookies or use local storage to
          distinguish humans from bots during sign-up.
        </li>
      </ul>
      <p>
        You can manage cookies through your browser settings. Disabling authentication
        cookies may prevent you from signing in.
      </p>

      <h2>7. How we share personal data</h2>
      <p>We do not sell your personal data. We share data only with:</p>
      <ul>
        <li>
          <strong>Service providers:</strong> Supabase (authentication, database, and
          hosting), Stripe (payment processing), Cloudflare (security and bot
          detection), Upstash (rate-limiting infrastructure), and our hosting/cloud
          infrastructure providers.
        </li>
        <li>
          <strong>Advertisers (aggregated only):</strong> campaign performance reports
          contain aggregated metrics such as impression counts, CTR, and spend. We do
          not share creator identities or personal identifiers with advertisers without
          consent.
        </li>
        <li>
          <strong>Legal and regulatory authorities:</strong> when required by law,
          subpoena, or to protect our rights and safety.
        </li>
        <li>
          <strong>Business transfers:</strong> in connection with a merger,
          acquisition, or sale of assets, subject to confidentiality obligations.
        </li>
      </ul>

      <h2>8. Data retention</h2>
      <p>We retain personal data only as long as necessary for the purposes above:</p>
      <ul>
        <li>
          <strong>Account data:</strong> retained while your account is active and for
          up to 12 months after closure, unless longer retention is required by law.
        </li>
        <li>
          <strong>Ad event data:</strong> retained for 12–24 months for billing, fraud
          prevention, and reporting, after which it is aggregated or anonymized.
        </li>
        <li>
          <strong>Fraud and security logs:</strong> retained for up to 24 months to
          support investigations and legal compliance.
        </li>
        <li>
          <strong>Payment records:</strong> retained for 7 years or as required by tax
          and accounting laws.
        </li>
        <li>
          <strong>Marketing data:</strong> retained until you withdraw consent or opt
          out.
        </li>
      </ul>

      <h2>9. International data transfers</h2>
      <p>
        Prism is operated from the United States. Our service providers may process
        data in the United States, the European Union, and other jurisdictions. When we
        transfer personal data outside the European Economic Area, Switzerland, or the
        United Kingdom, we rely on appropriate safeguards such as Standard Contractual
        Clauses approved by the European Commission and the UK Information
        Commissioner’s Office.
      </p>

      <h2>10. Data security</h2>
      <p>
        We implement technical and organizational measures to protect personal data,
        including encryption in transit (TLS), access controls, rate limiting, fraud
        detection, and regular security reviews. No method of transmission or storage is
        100% secure, and we cannot guarantee absolute security.
      </p>

      <h2>11. Automated decision-making</h2>
      <p>
        We use automated fraud scoring and trust scoring to identify suspicious traffic
        and temporarily hold payouts. These systems may produce legal or similarly
        significant effects for creators. If your payout is held and you believe it was
        in error, you may contact us at{' '}
        <a href="mailto:privacy@goprism.dev">privacy@goprism.dev</a> to request a review.
      </p>

      <h2>12. Your privacy rights</h2>
      <p>
        Depending on your location, you may have the following rights regarding your
        personal data:
      </p>
      <ul>
        <li>
          <strong>Access:</strong> request a copy of the personal data we hold about
          you.
        </li>
        <li>
          <strong>Correction:</strong> request that we correct inaccurate or incomplete
          data.
        </li>
        <li>
          <strong>Deletion:</strong> request deletion of your personal data, subject to
          legal retention requirements.
        </li>
        <li>
          <strong>Restriction:</strong> request that we limit processing of your data.
        </li>
        <li>
          <strong>Portability:</strong> receive your data in a structured, commonly
          used format.
        </li>
        <li>
          <strong>Objection:</strong> object to processing based on legitimate
          interests, including direct marketing.
        </li>
        <li>
          <strong>Withdraw consent:</strong> where processing is based on consent, you
          may withdraw it at any time.
        </li>
      </ul>
      <p>
        To exercise your rights, email us at{' '}
        <a href="mailto:privacy@goprism.dev">privacy@goprism.dev</a>. We will respond
        within the timeframe required by applicable law.
      </p>

      <h2>13. California privacy rights</h2>
      <p>
        Under the California Consumer Privacy Act (“CCPA”) and California Privacy
        Rights Act (“CPRA”), California residents have the right to:
      </p>
      <ul>
        <li>Know what personal information we collect and how we use it.</li>
        <li>Request deletion of personal information, subject to exceptions.</li>
        <li>Correct inaccurate personal information.</li>
        <li>Opt out of the sale or sharing of personal information.</li>
        <li>Non-discrimination for exercising privacy rights.</li>
      </ul>
      <p>
        Prism does not sell personal information. We do not share personal information
        for cross-context behavioral advertising. To exercise your California privacy
        rights, contact us at{' '}
        <a href="mailto:privacy@goprism.dev">privacy@goprism.dev</a>.
      </p>

      <h2>14. Children’s privacy</h2>
      <p>
        The Service is not intended for children under 16 years of age (or the age of
        majority in your jurisdiction). We do not knowingly collect personal data from
        children. If you believe we have collected data from a child, please contact us
        and we will delete it promptly.
      </p>

      <h2>15. Do Not Track</h2>
      <p>
        Because Prism does not engage in cross-service behavioral tracking, we do not
        respond to browser “Do Not Track” signals by altering data practices that are
        necessary to operate the Service.
      </p>

      <h2>16. Third-party services and links</h2>
      <p>
        The Service may contain links to third-party websites or advertiser landing
        pages. This Privacy Policy does not apply to those sites. We encourage you to
        review the privacy policies of any third-party service you visit.
      </p>

      <h2>17. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy to reflect changes in our practices, legal
        requirements, or Service functionality. We will post the updated policy on this
        page with a revised “Last updated” date. For material changes, we will notify
        you by email or through the Service.
      </p>

      <h2>18. Contact us</h2>
      <p>
        If you have any questions, concerns, or requests regarding this Privacy Policy
        or our data practices, please contact us at:
      </p>
      <p>
        <strong>Email:</strong>{' '}
        <a href="mailto:privacy@goprism.dev">privacy@goprism.dev</a>
        <br />
        <strong>Postal:</strong> alsa LLC, Attn: Privacy Team
      </p>
    </LegalLayout>
  )
}
