import { sendEmail } from './index'

/**
 * Branded signup-confirmation email, sent via Resend (not Supabase's built-in
 * mailer). The link points at /auth/confirm with a token_hash minted by
 * supabase.auth.admin.generateLink, which that route verifies via verifyOtp.
 * Dark Prism card, violet CTA; table layout + inline styles for email clients.
 */
export function buildSignupConfirmationHtml(confirmUrl: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:0;background-color:#06060b;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
      <tr><td style="padding:8px 4px 22px 4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle;"><span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;background:linear-gradient(135deg,#8b5cf6,#6d28d9);border-radius:8px;color:#ffffff;font-size:15px;font-weight:700;">&#9650;</span></td>
          <td style="vertical-align:middle;padding-left:11px;"><span style="color:#ffffff;font-size:19px;font-weight:700;letter-spacing:-0.2px;">Prism</span></td>
        </tr></table>
      </td></tr>
      <tr><td style="background-color:#0e0e16;border:1px solid #23232f;border-radius:16px;padding:38px 34px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
        <div style="height:3px;width:46px;background:linear-gradient(90deg,#8b5cf6,#ec4899);border-radius:3px;margin-bottom:24px;"></div>
        <h1 style="margin:0 0 14px 0;color:#ffffff;font-size:24px;line-height:1.25;font-weight:700;">Confirm your email</h1>
        <p style="margin:0 0 26px 0;color:#9aa3b2;font-size:15.5px;line-height:1.65;">You are one click from earning while your AI thinks. Confirm your email to finish setting up your Prism account.</p>
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td align="center" style="border-radius:11px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);box-shadow:0 8px 24px -8px rgba(124,58,237,0.7);">
            <a href="${confirmUrl}" style="display:inline-block;padding:14px 30px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Confirm my email</a>
          </td>
        </tr></table>
        <p style="margin:26px 0 6px 0;color:#64748b;font-size:12.5px;line-height:1.6;">Or paste this link into your browser:</p>
        <p style="margin:0;word-break:break-all;"><a href="${confirmUrl}" style="color:#a78bfa;font-size:12.5px;text-decoration:none;">${confirmUrl}</a></p>
      </td></tr>
      <tr><td style="padding:22px 8px 4px 8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
        <p style="margin:0 0 6px 0;color:#5b6373;font-size:12px;line-height:1.6;">If you did not create a Prism account, you can safely ignore this email.</p>
        <p style="margin:0;color:#3f4654;font-size:12px;"><a href="https://goprism.dev" style="color:#7c8597;text-decoration:none;">goprism.dev</a>&nbsp;&middot;&nbsp;<a href="mailto:security@goprism.dev" style="color:#7c8597;text-decoration:none;">security@goprism.dev</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>`
}

export async function sendSignupConfirmationEmail(to: string, confirmUrl: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Confirm your Prism account',
    html: buildSignupConfirmationHtml(confirmUrl),
    text: `Confirm your Prism account by opening this link:\n\n${confirmUrl}\n\nIf you did not create a Prism account, you can safely ignore this email.`,
  })
}
