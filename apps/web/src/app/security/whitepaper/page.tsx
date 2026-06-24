import fs from 'node:fs'
import path from 'node:path'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { OVERLAY_REPO_URL } from '@/lib/site'
// Light syntax-highlight theme for the code blocks (the point of the whitepaper).
// Only styles `.hljs` code, which appears only on this page.
import 'highlight.js/styles/github.css'

export const metadata = {
  title: 'Security Whitepaper — Prism',
  description:
    'Prism only needs to know whether your AI is busy or idle, never what you are working on. Every privacy claim is backed by the actual overlay source so you can verify it yourself.',
}

// Read the whitepaper at build time. Strips the trailing author note (it is
// explicitly marked "remove before publishing") and centralizes the source-repo
// reference through OVERLAY_REPO_URL. Technical claims + code render verbatim.
function loadWhitepaper(): string {
  const file = path.join(process.cwd(), 'src/content/security-whitepaper.md')
  let md = fs.readFileSync(file, 'utf8')
  md = md.replace(/\n>\s*Author note \(remove before publishing\)[\s\S]*$/m, '\n')
  const repo = OVERLAY_REPO_URL ?? 'the public overlay repo (link coming soon)'
  md = md.split('[REPO_URL]').join(repo)
  return md.trim()
}

export default function SecurityWhitepaperPage() {
  const markdown = loadWhitepaper()
  return (
    <section className="bg-white pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="container-tight max-w-3xl px-4 sm:px-6 lg:px-8">
        <article className="prose prose-slate max-w-none whitepaper-prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {markdown}
          </ReactMarkdown>
        </article>
      </div>
    </section>
  )
}
