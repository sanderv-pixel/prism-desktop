# Custom SMTP + branded auth emails for Prism

These templates and DNS settings wire Prism’s Supabase Auth verification emails through Resend so they are sent from a branded `goprism.dev` address instead of Supabase’s default shared sender.

## 1. Add Resend DNS records to Cloudflare

Resend domain: `goprism.dev`  
Resend domain ID: `d38857a3-0801-4753-9956-483e2161e563`

Add these records in the Cloudflare DNS dashboard for `goprism.dev`:

| Type | Name | Value | Priority / TTL |
|------|------|-------|----------------|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDCME643Al8/Cob9osWalwr65mif9xD+qXdefyEmLYqGYg0E9VCL3+56w+3pOjepykyv3b+oA+uyI6tzstNBobIeTfK3PBpD0JPGz13K1BVKKxo4rMGi474Vi9uF74WQI+riLuQB74TbOKCyHX2O5KeNEvbaE2bYsaNnv9BLBIZSQIDAQAB` | Auto |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` | 10 / Auto |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | Auto |

Optional but recommended for deliverability:

| Type | Name | Value |
|------|------|-------|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@goprism.dev` |

After adding the records, go to **Resend → Domains → goprism.dev** and click **Verify**.

## 2. Configure Supabase Auth SMTP

In your Supabase project dashboard:

1. Go to **Authentication → Email → SMTP Settings**.
2. Turn on **Enable Custom SMTP**.
3. Fill in:

| Setting | Value |
|---------|-------|
| Sender email | `hello@goprism.dev` (or `noreply@goprism.dev`) |
| Sender name | `Prism` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | `re_9Fb25wPK_4c1XmmSRZfyRw4SbiRxVeu6Y` |
| Use TLS/SSL | ✅ On |

4. Click **Save**.

## 3. Replace the default email templates

Still in **Authentication → Email Templates**, replace each template body with the HTML in this folder. Keep the subject lines as you like, for example:

- **Confirm signup**: "Confirm your Prism account"
- **Invite user**: "You're invited to Prism"
- **Magic Link**: "Your Prism sign-in link"
- **Change Email Address**: "Confirm your new Prism email"
- **Reset Password**: "Reset your Prism password"

### Confirm signup

Paste the contents of [`confirmation.html`](./confirmation.html) into the **Confirm signup** template body. Make sure the action URL placeholder remains as Supabase expects:

```html
<a href="{{ .ConfirmationURL }}">Confirm email address</a>
```

## 4. Test

1. Open an incognito window at `https://goprism.dev/auth/sign-up`.
2. Sign up with a real email address.
3. The confirmation email should arrive from `Prism <hello@goprism.dev>` within seconds.

If it doesn't arrive, check Resend → Logs and Supabase → Auth → Logs for bounce or SMTP errors.
