import { Button } from '@/components/Button'
import { SectionHeader } from '@/components/SectionHeader'
import { CodeWindow } from '@/components/CodeWindow'

export const metadata = {
  title: 'Docs Prism',
  description: 'Documentation for installing and using Prism.',
}

export default function DocsPage() {
  return (
    <section className="section-padding pt-32">
      <div className="container-narrow px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Docs"
          title="Getting started with Prism"
          description="Install Prism and start monetizing Ai wait time in minutes."
        />

        <div className="prose max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-li:text-muted-foreground prose-code:text-primary prose-pre:bg-muted">
          <h2>Install for VS Code or Cursor</h2>
          <p>
            The fastest way is the install script. It downloads the Prism extension
            (<code>.vsix</code>) and installs it into VS Code or Cursor. The script checks
            PATH first, then common macOS app-bundle and Linux install locations.
          </p>

          <CodeWindow className="my-6" title="VS Code">
            <div className="text-foreground/80 font-mono text-sm">
              curl -fsSL https://goprism.dev/install.sh | bash
            </div>
          </CodeWindow>

          <CodeWindow className="my-6" title="Cursor">
            <div className="text-foreground/80 font-mono text-sm">
              curl -fsSL https://goprism.dev/install.sh | bash -s -- --cursor
            </div>
          </CodeWindow>

          <h3>Windows (PowerShell)</h3>

          <CodeWindow className="my-6" title="VS Code">
            <div className="text-foreground/80 font-mono text-sm">
              irm https://goprism.dev/install.ps1 | iex
            </div>
          </CodeWindow>

          <CodeWindow className="my-6" title="Cursor">
            <div className="text-foreground/80 font-mono text-sm">
              & ([scriptblock]::Create((irm https://goprism.dev/install.ps1))) -Cursor
            </div>
          </CodeWindow>

          <p>
            If you prefer, you can also{' '}
            <a href="https://goprism.dev/prism-extension.vsix">download the .vsix manually</a>{' '}
            and run <code>code --install-extension prism-extension.vsix</code>,{' '}
            <code>cursor --install-extension prism-extension.vsix</code>, or install it through
            the Extensions view.
          </p>

          <h2>Link your account (VS Code / Cursor)</h2>
          <ol>
            <li>After installing, reload the editor.</li>
            <li>Open the Command Palette and run <strong>Prism: Open dashboard to connect account</strong>.</li>
            <li>Sign in to your Prism account (or create one).</li>
            <li>The page will link that editor instance to your account automatically.</li>
          </ol>

          <h2>Install for Claude Code (beta)</h2>
          <p>
            Claude Code supports a custom <code>statusLine</code> script. Prism provides
            a lightweight adapter that fetches a one-line ad while Claude is working.
          </p>

          <CodeWindow className="my-6" title="Download the adapter">
            <div className="text-foreground/80 font-mono text-sm">
              mkdir -p ~/.local/bin &&{' '}
              curl -fsSL https://goprism.dev/claude-status.sh -o ~/.local/bin/prism-status.sh &&{' '}
              chmod +x ~/.local/bin/prism-status.sh
            </div>
          </CodeWindow>

          <p>Add the adapter to your Claude Code config:</p>

          <CodeWindow className="my-6" title="~/.claude/config.json">
            <div className="text-foreground/80">
              <p>{`{`}</p>
              <p className="pl-4">
                {`"statusLine": "~/.local/bin/prism-status.sh"`}
              </p>
              <p>{`}`}</p>
            </div>
          </CodeWindow>

          <p>
            Restart Claude Code or run <code>/refresh</code>. By default the adapter
            works anonymously. To attribute earnings to your Prism account, set{' '}
            <code>PRISM_USER_ID</code> to the user ID shown on your dashboard.
          </p>

          <h2>Hide an advertiser</h2>
          <p>
            In VS Code / Cursor, click the Prism ad line and select <strong>Hide this advertiser</strong>,
            or run <strong>Prism: Hide this advertiser</strong> from the Command Palette.
            You will no longer see ads from that company.
          </p>

          <h2>Pause ads</h2>
          <p>
            Run <strong>Prism: Disable</strong> from the Command Palette to pause all ads.
            Run <strong>Prism: Enable</strong> to resume.
          </p>

          <h2>Payouts</h2>
          <p>
            Add your Wise or Payoneer details in the Prism dashboard. Once you hit the
            $50 minimum and pass verification, payouts are sent on the platform schedule.
          </p>
        </div>

        <div className="mt-12 text-center">
          <Button href="/contact" variant="outline">
            Need help? Contact us
          </Button>
        </div>
      </div>
    </section>
  )
}
