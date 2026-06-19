# Prism - Launch Plan

> Contextual ad network for AI builders.
> Tagline: *Get paid while AI codes.*

---

## 1. Vision

Prism monetizes the dead seconds when AI coding tools are thinking, generating, planning, or debugging. One tiny, clearly labeled ad line. Relevant to the builder's context. Real payouts through Stripe.

The positioning is honest and indie: **ads for builders, not bots.** No surveillance, no code access, no prompt tracking.

---

## 2. Target Audiences

### Builders (supply side)
- Indie hackers
- Freelancers and agency devs
- Students and bootstrapped founders
- Open-source maintainers
- Vibecoders using Cursor, Windsurf, Lovable, v0, Bolt, Claude Code

### Advertisers (demand side)
- Developer tools and APIs
- Cloud / hosting providers
- No-code / low-code platforms
- Design assets and UI kits
- Payment, marketing, and productivity tools
- Indie courses and builder communities

Banned categories: politics, gambling, adult, supplements, crypto yield schemes, consumer junk, get-rich-quick.

---

## 3. Product Surfaces

### Wave 1: Official surfaces only
1. **VS Code / Cursor extension** - Prism Line in the status bar.
2. **Claude Code CLI integration** - official `statusLine` adapter.

### Wave 2
3. **Browser extension** - for web AI builders: Lovable, v0, Bolt, Replit Agent.

### Wave 3
4. **Partner API** - AI tools integrate Prism natively.

---

## 4. Tech Stack

| Layer | Choice |
|-------|--------|
| Web app + dashboards + API | Next.js 14 App Router, TypeScript, Tailwind |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| Payments / payouts | Stripe Connect |
| Extension | TypeScript VS Code extension API |
| Claude Code adapter | Shell script using official `statusLine` hook |
| Package manager | npm workspaces |

---

## 5. Repo Structure

```
AIAD/
├── PLAN.md
├── README.md
├── package.json              # npm workspaces root
├── apps/
│   ├── web/                  # Next.js: landing page + dashboards + API
│   │   ├── supabase/
│   │   │   └── migrations/
│   │   │       └── 001_initial_schema.sql
│   │   └── src/
│   │       ├── app/
│   │       └── lib/
│   └── extension/            # VS Code / Cursor extension
│       └── src/
│           └── extension.ts
├── packages/
│   └── shared/               # shared types, constants, API client
│       └── src/
│           └── index.ts
└── claude-adapter/
    └── prism-status.sh       # Claude Code statusLine adapter
```

---

## 6. Ad Unit: The Prism Line

One line. Always labeled `Ad`. Only shown during AI wait states.

```
[Ad] Ship faster on Railway →
```

- Appears only when AI tool is actively working.
- One-click hide advertiser.
- Pause anytime.
- Click opens verified landing page.

---

## 7. Business Model

- **Inventory:** qualified developer attention blocks during AI wait states.
- **Pricing:** floor vCPM $8–$25 by context tier.
- **Auction:** bid × contextual relevance × ad quality × advertiser trust.
- **Revenue share:** 50/50 to builder, paid only on validated viewable impressions.
- **Payouts:** Stripe Connect, delayed settlement, verification required.

No click-based revenue share at launch. Clicks are tracked for advertisers but not paid to builders until fraud models mature.

---

## 8. Privacy & Trust

- Context computed locally: editor, AI tool, language mode, project type bucket.
- No source code, prompts, filenames, or model outputs sent to server.
- On-device matching where possible.
- Clear `Ad` label on every placement.
- Manual creative review at launch.
- Public Prism Ad Integrity Standard.

---

## 9. 30 / 60 / 90-Day Roadmap

### Days 0–30: Foundation
- [ ] Finalize domain and deploy empty landing page.
- [ ] Set up Next.js app, Supabase project and schema, Supabase Auth, Stripe test mode.
- [ ] Build VS Code extension scaffolding with mock Prism Line.
- [ ] Build Claude Code `statusLine` adapter.
- [ ] Interview 20 builders and 10 advertiser prospects.
- [ ] Draft Terms, Privacy Policy, Payout Policy, Advertiser Policy.

### Days 31–60: Private Beta
- [ ] Onboard 50–100 beta builders.
- [ ] Onboard 5–10 hand-picked advertisers.
- [ ] Implement impression validation and basic fraud filtering.
- [ ] Builder dashboard: earnings, hide list, settings.
- [ ] Advertiser dashboard: campaigns, spend, impressions.
- [ ] Payout verification flow.

### Days 61–90: Public Launch
- [ ] Open public waitlist.
- [ ] Self-serve advertiser signup with manual review.
- [ ] Launch on Product Hunt / Hacker News / X.
- [ ] First real payouts go out.
- [ ] Publish Prism Ad Integrity Standard.

---

## 10. Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Users see it as spam | Tiny, labeled, hideable, only during wait states |
| Platform breaks integration | Use official surfaces only |
| Fraud / fake impressions | Delayed payouts, caps, anomaly detection |
| Advertisers distrust inventory | Public standards, manual review, fraud filtering |
| Privacy compliance | Contextual-only targeting, minimal data, clear disclosures |
| Enterprise blocks extension | Ignore enterprise for first 12 months |

---

## 11. Next Immediate Steps

1. Install dependencies in `apps/web` and `apps/extension`.
2. Set up a local Supabase project and run the initial migration.
3. Build the VS Code extension MVP that fetches a real ad from the API.
4. Wire Supabase Auth and Stripe Connect.
5. Design and build the landing page.
