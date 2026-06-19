import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { execSync } from 'child_process'
import * as crypto from 'crypto'
import { fetchAd, AdContext, AdPayload } from '@prism/shared'

const DEFAULT_API_URL = 'http://localhost:3004/api'
const CLAUDE_EXTENSION_GLOB = /anthropic\.claude-code-[\d.]+(?:-.+)?/
const CODEX_EXTENSION_GLOB = /openai\.chatgpt-[\d.]+(?:-.+)?/

export interface PatchResult {
  path: string
  patched: boolean
  error?: string
}

interface AdData {
  id: string
  advertiserName: string
  copy: string
  url: string
  clickUrl?: string
  iconUrl?: string
  iconHtml: string
  impressionToken?: string
  userId?: string
  sessionId?: string
  apiKey?: string
  reportUrl?: string
}

function extensionVersionFor(filePath: string): string | undefined {
  let dir = path.dirname(filePath)
  while (dir !== path.dirname(dir)) {
    const base = path.basename(dir)
    if (CLAUDE_EXTENSION_GLOB.test(base) || CODEX_EXTENSION_GLOB.test(base)) {
      return base
    }
    dir = path.dirname(dir)
  }
  return undefined
}

function backupPath(filePath: string): string {
  const version = extensionVersionFor(filePath)
  if (version) {
    return path.join(os.homedir(), '.prism', 'backups', version, path.basename(filePath))
  }
  return `${filePath}.prism-backup`
}

function ensureBackup(filePath: string): void {
  const backup = backupPath(filePath)
  if (!fs.existsSync(backup)) {
    fs.mkdirSync(path.dirname(backup), { recursive: true })
    fs.copyFileSync(filePath, backup)
  }
}

export function findClaudeCodeExtensions(): string[] {
  const roots = [
    path.join(os.homedir(), '.vscode', 'extensions'),
    path.join(os.homedir(), '.cursor', 'extensions'),
    path.join(os.homedir(), '.cursor-server', 'extensions'),
    path.join(os.homedir(), '.vscode-server', 'extensions'),
  ]

  const found: string[] = []
  for (const root of roots) {
    if (!fs.existsSync(root)) continue
    const entries = fs.readdirSync(root)
    for (const entry of entries) {
      if (CLAUDE_EXTENSION_GLOB.test(entry)) {
        found.push(path.join(root, entry))
      }
    }
  }
  return found
}

export function findCodexExtensions(): string[] {
  const roots = [
    path.join(os.homedir(), '.vscode', 'extensions'),
    path.join(os.homedir(), '.cursor', 'extensions'),
    path.join(os.homedir(), '.cursor-server', 'extensions'),
    path.join(os.homedir(), '.vscode-server', 'extensions'),
  ]

  const found: string[] = []
  for (const root of roots) {
    if (!fs.existsSync(root)) continue
    const entries = fs.readdirSync(root)
    for (const entry of entries) {
      if (CODEX_EXTENSION_GLOB.test(entry)) {
        found.push(path.join(root, entry))
      }
    }
  }
  return found
}

export function findCodexWebviewEntryJsPath(extensionPath: string): string | undefined {
  const indexHtmlPath = path.join(extensionPath, 'webview', 'index.html')
  if (!fs.existsSync(indexHtmlPath)) {
    return undefined
  }
  const html = fs.readFileSync(indexHtmlPath, 'utf-8')
  const match = html.match(/<script[^>]+type=["']module["'][^>]+crossorigin[^>]+src=["']([^"']+)["'][^>]*>/i) ||
    html.match(/<script[^>]+crossorigin[^>]+type=["']module["'][^>]+src=["']([^"']+)["'][^>]*>/i)
  if (!match) {
    return undefined
  }
  return path.resolve(path.join(extensionPath, 'webview'), match[1])
}

function hashColor(name: string): string {
  const colors = ['#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777', '#4f46e5', '#0ea5e9']
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  return colors[Math.abs(hash) % colors.length]
}

function makeIconSvg(name: string): string {
  const initial = (name[0] || 'P').toUpperCase()
  const bg = hashColor(name)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 36 36"><rect width="36" height="36" rx="7" fill="${bg}"/><text x="18" y="25" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="20" font-weight="800" fill="#fff" text-anchor="middle">${initial}</text></svg>`
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function resolveIconUrl(baseUrl: string, iconUrl?: string): string | undefined {
  if (!iconUrl) return undefined
  const trimmed = iconUrl.trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const root = baseUrl.replace(/\/api$/, '')
  const sep = trimmed.startsWith('/') ? '' : '/'
  return `${root}${sep}${trimmed}`
}

async function fetchAdData(apiUrl?: string, apiKey?: string): Promise<AdData> {
  const context: AdContext = {
    editor: 'vscode',
    aiTool: 'claude-code',
    intent: 'coding',
    audience: 'developers',
    waitState: true,
  }

  const baseUrl = (apiUrl && apiUrl.trim() ? apiUrl.trim() : DEFAULT_API_URL).replace(/\/$/, '')
  const reportUrl = `${baseUrl}/impressions`

  try {
    const ad = await fetchAd(baseUrl, { context, hiddenAdvertisers: [] })
    if (ad) {
      const iconUrl = resolveIconUrl(baseUrl, ad.iconUrl)
      const iconHtml = iconUrl
        ? `<img src="${escapeHtmlAttr(iconUrl)}" width="18" height="18" style="display:block;width:18px;height:18px;border-radius:5px;object-fit:contain;" alt="" onerror="this.style.display='none'" />`
        : makeIconSvg(ad.advertiserName)
      return {
        id: ad.id,
        advertiserName: ad.advertiserName,
        copy: ad.copy,
        url: ad.clickUrl || ad.url,
        clickUrl: ad.clickUrl,
        iconUrl,
        iconHtml,
        impressionToken: ad.impressionToken,
        userId: ad.userId || ad.sessionId,
        sessionId: ad.sessionId,
        apiKey: apiKey || '',
        reportUrl,
      }
    }
  } catch {
    // fall through
  }
  return {
    id: 'prism-fallback',
    advertiserName: 'Prism',
    copy: 'contextual ads for AI wait states →',
    url: '#',
    iconHtml: makeIconSvg('Prism'),
  }
}

async function fetchAdQueue(
  apiUrl?: string,
  apiKey?: string,
  count = 5,
  platform: 'claude' | 'codex' = 'claude'
): Promise<AdData[]> {
  const context: AdContext = {
    editor: 'vscode',
    aiTool: platform === 'codex' ? 'codex' : 'claude-code',
    intent: 'coding',
    audience: 'developers',
    waitState: true,
  }

  const baseUrl = (apiUrl && apiUrl.trim() ? apiUrl.trim() : DEFAULT_API_URL).replace(/\/$/, '')
  const reportUrl = `${baseUrl}/impressions`
  const sessionId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const key = apiKey || ''
  const queue: AdData[] = []

  for (let i = 0; i < count; i++) {
    try {
      const ad = await fetchAd(baseUrl, {
        context,
        userId: sessionId,
        sessionId,
        hiddenAdvertisers: [],
      }, { apiKey: key })
      if (ad) {
        const iconUrl = resolveIconUrl(baseUrl, ad.iconUrl)
        const iconHtml = iconUrl
          ? `<img src="${escapeHtmlAttr(iconUrl)}" width="18" height="18" style="display:block;width:18px;height:18px;border-radius:5px;object-fit:contain;" alt="" onerror="this.style.display='none'" />`
          : makeIconSvg(ad.advertiserName)
        queue.push({
          id: ad.id,
          advertiserName: ad.advertiserName,
          copy: ad.copy,
          url: ad.clickUrl || ad.url,
          clickUrl: ad.clickUrl,
          iconUrl,
          iconHtml,
          impressionToken: ad.impressionToken,
          userId: ad.userId || sessionId,
          sessionId: ad.sessionId || sessionId,
          apiKey: key,
          reportUrl,
        })
      }
    } catch {
      // ignore individual failures
    }
  }

  if (queue.length === 0) {
    queue.push({
      id: 'prism-fallback',
      advertiserName: 'Prism',
      copy: 'contextual ads for AI wait states →',
      url: '#',
      iconHtml: makeIconSvg('Prism'),
    })
  }

  return queue
}

export function buildAdInjectorScript(
  ads: AdData[],
  apiUrl?: string,
  apiKey?: string,
  platform: 'claude' | 'codex' = 'claude'
): string {
  const baseUrl = (apiUrl && apiUrl.trim() ? apiUrl.trim() : DEFAULT_API_URL).replace(/\/$/, '')
  const queue = ads.map((ad) => ({
    id: ad.id,
    advertiserName: ad.advertiserName,
    copy: ad.copy,
    url: ad.url,
    clickUrl: ad.clickUrl,
    iconUrl: ad.iconUrl,
    impressionToken: ad.impressionToken,
    userId: ad.userId || ad.sessionId,
    sessionId: ad.sessionId,
    apiKey: ad.apiKey,
    reportUrl: ad.reportUrl,
  }))
  const safeQueue = JSON.stringify(queue).replace(/`/g, '\\u0060')
  const safeApiUrl = JSON.stringify(`${baseUrl}/ads`)
  const safeReportUrl = JSON.stringify(`${baseUrl}/impressions`)
  const safeApiKey = JSON.stringify(apiKey || '')
  const safePlatform = JSON.stringify(platform)
  const safeContext = JSON.stringify({
    editor: 'vscode',
    aiTool: platform === 'codex' ? 'codex' : 'claude-code',
    intent: 'coding',
    audience: 'developers',
    waitState: true,
  })
  return (
    "/*prism-panel-ads*/\n" +
    "try{\n" +
    "(function(){\n" +
    "const PLATFORM=" + safePlatform + ";\n" +
    "const AD_CONTEXT=" + safeContext + ";\n" +
    "const AD_QUEUE=" + safeQueue + ";\n" +
    "let adIndex=0;\n" +
    "let AD=null;\n" +
    "window.__prismAd=null;\n" +
    "function setAd(ad){AD=ad;window.__prismAd=ad;}\n" +
    "function useFallback(){if(AD_QUEUE.length){setAd(AD_QUEUE[adIndex]);}}\n" +
    "const API_URL=" + safeApiUrl + ";\n" +
    "const REPORT_URL=" + safeReportUrl + ";\n" +
    "const API_KEY=" + safeApiKey + ";\n" +
    "function setStyle(el,k,v){el.style.setProperty(k,v,'important');}\n" +
    "function sanitizeUrl(s){try{const u=new URL(s);if(u.protocol==='http:'||u.protocol==='https:')return s;}catch(e){}return '#';}\n" +
    "function hashColor(name){\n" +
    "  const colors=['#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777','#4f46e5','#0ea5e9'];\n" +
    "  let hash=0;\n" +
    "  for(let i=0;i<name.length;i++){hash=(hash<<5)-hash+name.charCodeAt(i);hash|=0;}\n" +
    "  return colors[Math.abs(hash)%colors.length];\n" +
    "}\n" +
    "function createIcon(ad){\n" +
    "  if(ad.iconUrl){\n" +
    "    const img=document.createElement('img');\n" +
    "    img.src=sanitizeUrl(ad.iconUrl);\n" +
    "    img.width=18;\n" +
    "    img.height=18;\n" +
    "    img.alt='';\n" +
    "    img.onerror=function(){this.style.display='none';};\n" +
    "    setStyle(img,'display','block');\n" +
    "    setStyle(img,'width','18px');\n" +
    "    setStyle(img,'height','18px');\n" +
    "    setStyle(img,'border-radius','5px');\n" +
    "    setStyle(img,'object-fit','contain');\n" +
    "    return img;\n" +
    "  }\n" +
    "  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');\n" +
    "  svg.setAttribute('xmlns','http://www.w3.org/2000/svg');\n" +
    "  svg.setAttribute('width','18');\n" +
    "  svg.setAttribute('height','18');\n" +
    "  svg.setAttribute('viewBox','0 0 36 36');\n" +
    "  const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');\n" +
    "  rect.setAttribute('width','36');\n" +
    "  rect.setAttribute('height','36');\n" +
    "  rect.setAttribute('rx','7');\n" +
    "  rect.setAttribute('fill',hashColor(ad.advertiserName||'Prism'));\n" +
    "  const text=document.createElementNS('http://www.w3.org/2000/svg','text');\n" +
    "  text.setAttribute('x','18');\n" +
    "  text.setAttribute('y','25');\n" +
    "  text.setAttribute('font-family','system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif');\n" +
    "  text.setAttribute('font-size','20');\n" +
    "  text.setAttribute('font-weight','800');\n" +
    "  text.setAttribute('fill','#fff');\n" +
    "  text.setAttribute('text-anchor','middle');\n" +
    "  text.textContent=(ad.advertiserName||'Prism')[0].toUpperCase();\n" +
    "  svg.appendChild(rect);\n" +
    "  svg.appendChild(text);\n" +
    "  setStyle(svg,'display','block');\n" +
    "  setStyle(svg,'width','18px');\n" +
    "  setStyle(svg,'height','18px');\n" +
    "  return svg;\n" +
    "}\n" +
    "function nextAd(){\n" +
    "  adIndex=(adIndex+1)%AD_QUEUE.length;\n" +
    "  setAd(AD_QUEUE[adIndex]);\n" +
    "}\n" +
    "let fetching=false;\n" +
    "function generateSessionId(){\n" +
    "  const bytes=new Uint8Array(16);\n" +
    "  for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);\n" +
    "  return Array.from(bytes).map(function(b){return b.toString(16).padStart(2,'0');}).join('');\n" +
    "}\n" +
    "const SESSION_ID=generateSessionId();\n" +
    "function fetchNextAd(){\n" +
    "  if(fetching)return;\n" +
    "  fetching=true;\n" +
    "  try{\n" +
    "    const headers={'Content-Type':'application/json'};\n" +
    "    if(API_KEY)headers['X-Prism-Api-Key']=API_KEY;\n" +
    "    fetch(API_URL,{\n" +
    "      method:'POST',\n" +
    "      headers:headers,\n" +
    "      body:JSON.stringify({context:AD_CONTEXT,userId:SESSION_ID,sessionId:SESSION_ID,hiddenAdvertisers:[]})\n" +
    "    }).then(function(r){return r.ok?r.json():null;}).then(function(next){\n" +
    "      if(next && next.id && next.copy && next.advertiserName){\n" +
    "        const mapped={id:next.id,advertiserName:next.advertiserName,copy:next.copy,url:next.clickUrl||next.url,clickUrl:next.clickUrl,iconUrl:next.iconUrl,impressionToken:next.impressionToken,userId:next.userId||SESSION_ID,sessionId:next.sessionId||SESSION_ID,apiKey:API_KEY,reportUrl:REPORT_URL};\n" +
    "        AD_QUEUE.push(mapped);\n" +
    "        setAd(mapped);\n" +
    "        if(window.__prismCheck){window.__prismCheck();}\n" +
    "      }\n" +
    "    }).catch(function(){}).finally(function(){fetching=false;});\n" +
    "  }catch(e){fetching=false;}\n" +
    "}\n" +
    "const MIN_DWELL_MS=5000;\n" +
    "let impressionReported=false;\n" +
    "let currentImpressionAd=null;\n" +
    "let adVisibleStart=0;\n" +
    "let totalVisibleMs=0;\n" +
    "function reportImpression(){\n" +
    "  const ad=currentImpressionAd;\n" +
    "  if(impressionReported || !ad || !ad.impressionToken || !ad.reportUrl || !ad.id)return;\n" +
    "  const now=Date.now();\n" +
    "  if(adVisibleStart)totalVisibleMs += now - adVisibleStart;\n" +
    "  adVisibleStart=0;\n" +
    "  if(totalVisibleMs<MIN_DWELL_MS)return;\n" +
    "  impressionReported=true;\n" +
    "  try{\n" +
    "    var headers={'Content-Type':'application/json'};\n" +
    "    if(ad.apiKey)headers['X-Prism-Api-Key']=ad.apiKey;\n" +
    "    fetch(ad.reportUrl,{\n" +
    "      method:'POST',\n" +
    "      headers:headers,\n" +
    "      body:JSON.stringify({userId:ad.userId||ad.sessionId||ad.id,sessionId:ad.sessionId||ad.id,campaignId:ad.id,impressionToken:ad.impressionToken,durationMs:totalVisibleMs,context:AD_CONTEXT})\n" +
    "    }).catch(function(){});\n" +
    "  }catch(e){}\n" +
    "}\n" +
    "function maybeRotateAd(){\n" +
    "  if(totalVisibleMs>=MIN_DWELL_MS){\n" +
    "    reportImpression();\n" +
    "    nextAd();\n" +
    "    totalVisibleMs=0;\n" +
    "    impressionReported=false;\n" +
    "    currentImpressionAd=null;\n" +
    "    adVisibleStart=0;\n" +
    "  }\n" +
    "}\n" +
    "function removeChildren(el){while(el.firstChild)el.removeChild(el.firstChild);}\n" +
    "function findSpinnerContext(doc){\n" +
    "  if(PLATFORM==='codex'){\n" +
    "    const shimmers=Array.from(doc.querySelectorAll('[class*=\"loading-shimmer-pure-text\"]'));\n" +
    "    for(let i=0;i<shimmers.length;i++){\n" +
    "      const row=shimmers[i].parentElement;\n" +
    "      if(row && /\\w/.test(shimmers[i].textContent||''))return {row:row,doc:doc,shimmer:shimmers[i]};\n" +
    "    }\n" +
    "  }else{\n" +
    "    const rows=Array.from(doc.querySelectorAll('[class*=\"spinnerRow\"]'));\n" +
    "    for(let i=0;i<rows.length;i++){\n" +
    "      if(/\\w/.test(rows[i].textContent||''))return {row:rows[i],doc:doc};\n" +
    "    }\n" +
    "  }\n" +
    "  const iframes=doc.querySelectorAll('iframe');\n" +
    "  for(let i=0;i<iframes.length;i++){\n" +
    "    try{\n" +
    "      const d=iframes[i].contentDocument;\n" +
    "      if(d && d!==doc){\n" +
    "        const ctx=findSpinnerContext(d);\n" +
    "        if(ctx)return ctx;\n" +
    "      }\n" +
    "    }catch(e){}\n" +
    "  }\n" +
    "  return null;\n" +
    "}\n" +
    "function getTextSpan(row){\n" +
    "  if(PLATFORM==='codex')return row.querySelector('[class*=\"loading-shimmer-pure-text\"]');\n" +
    "  return row.querySelector('span[class*=\"text_\"]');\n" +
    "}\n" +
    "function removeAd(doc){\n" +
    "  if(!doc)doc=document;\n" +
    "  doc.querySelectorAll('[data-prism-ad]').forEach(function(el){if(el.parentNode)el.parentNode.removeChild(el);});\n" +
    "  doc.querySelectorAll('[data-prism-text-hidden]').forEach(function(el){el.style.display='';el.removeAttribute('data-prism-text-hidden');});\n" +
    "  const iframes=doc.querySelectorAll('iframe');\n" +
    "  for(let i=0;i<iframes.length;i++){\n" +
    "    try{const d=iframes[i].contentDocument;if(d && d!==doc)removeAd(d);}catch(e){}\n" +
    "  }\n" +
    "}\n" +
    "function renderAd(ctx){\n" +
    "  if(!ctx || !ctx.row){removeAd();return;}\n" +
    "  const row=ctx.row;\n" +
    "  const doc=row.ownerDocument || document;\n" +
    "  if(!AD){\n" +
    "    useFallback();\n" +
    "    if(!AD){fetchNextAd();return;}\n" +
    "  }\n" +
    "  const now=Date.now();\n" +
    "  if(adVisibleStart){totalVisibleMs += now - adVisibleStart;}\n" +
    "  adVisibleStart=now;\n" +
    "  maybeRotateAd();\n" +
    "  if(!AD){return;}\n" +
    "  if(currentImpressionAd && currentImpressionAd.id!==AD.id){impressionReported=false;totalVisibleMs=0;adVisibleStart=now;}\n" +
    "  currentImpressionAd=AD;\n" +
    "  let adEl=row.querySelector('[data-prism-ad]');\n" +
    "  if(adEl && adEl.__prismAdId===AD.id){return;}\n" +
    "  if(!adEl){\n" +
    "    adEl=doc.createElement('span');\n" +
    "    adEl.setAttribute('data-prism-ad','true');\n" +
    "    setStyle(adEl,'display','inline-flex');\n" +
    "    setStyle(adEl,'align-items','center');\n" +
    "    setStyle(adEl,'gap','6px');\n" +
    "    setStyle(adEl,'white-space','nowrap');\n" +
    "    setStyle(adEl,'overflow','visible');\n" +
    "    setStyle(adEl,'max-width','none');\n" +
    "    setStyle(adEl,'flex-shrink','0');\n" +
    "    setStyle(adEl,'margin-left','4px');\n" +
    "    const textSpan=getTextSpan(row);\n" +
    "    if(textSpan){\n" +
    "      setStyle(textSpan,'display','none');\n" +
    "      textSpan.setAttribute('data-prism-text-hidden','true');\n" +
    "      const container=textSpan.parentNode || row;\n" +
    "      container.insertBefore(adEl,textSpan);\n" +
    "    }else{\n" +
    "      row.appendChild(adEl);\n" +
    "    }\n" +
    "  }else{\n" +
    "    removeChildren(adEl);\n" +
    "  }\n" +
    "  adEl.__prismAdId=AD.id;\n" +
    "  const iconWrap=doc.createElement('span');\n" +
    "  iconWrap.className='prism-ad-icon';\n" +
    "  setStyle(iconWrap,'display','inline-block');\n" +
    "  setStyle(iconWrap,'width','18px');\n" +
    "  setStyle(iconWrap,'height','18px');\n" +
    "  setStyle(iconWrap,'min-width','18px');\n" +
    "  setStyle(iconWrap,'min-height','18px');\n" +
    "  setStyle(iconWrap,'flex-shrink','0');\n" +
    "  setStyle(iconWrap,'flex-grow','0');\n" +
    "  setStyle(iconWrap,'overflow','visible');\n" +
    "  iconWrap.appendChild(createIcon(AD));\n" +
    "  adEl.appendChild(iconWrap);\n" +
    "  const a=doc.createElement('a');\n" +
    "  a.href=sanitizeUrl(AD.url||AD.clickUrl||'#');\n" +
    "  a.target='_blank';\n" +
    "  a.rel='noopener noreferrer sponsored';\n" +
    "  a.textContent=AD.advertiserName+' · '+AD.copy;\n" +
    "  setStyle(a,'color','inherit');\n" +
    "  setStyle(a,'text-decoration','underline');\n" +
    "  setStyle(a,'white-space','nowrap');\n" +
    "  setStyle(a,'overflow','visible');\n" +
    "  setStyle(a,'max-width','none');\n" +
    "  setStyle(a,'flex-shrink','1');\n" +
    "  a.setAttribute('data-prism-ad','true');\n" +
    "  adEl.appendChild(a);\n" +
    "  fetchNextAd();\n" +
    "}\n" +
    "function start(rootDoc){\n" +
    "  if(!rootDoc)rootDoc=document;\n" +
    "  if(rootDoc.__prismPanelStarted)return;\n" +
    "  rootDoc.__prismPanelStarted=true;\n" +
    "  const isThisWindow=rootDoc===document;\n" +
    "  if(isThisWindow){\n" +
    "    console.log('[Prism] panel ad queue injected with', AD_QUEUE.length, 'ads');\n" +
    "    fetchNextAd();\n" +
    "  }\n" +
    "  const ctx=findSpinnerContext(rootDoc);\n" +
    "  if(ctx){if(isThisWindow)console.log('[Prism] spinner row found');renderAd(ctx);}\n" +
    "  function insideAd(node){\n" +
    "    let n=node;\n" +
    "    while(n){\n" +
    "      if(n.getAttribute&&n.getAttribute('data-prism-ad'))return true;\n" +
    "      n=n.parentNode;\n" +
    "    }\n" +
    "    return false;\n" +
    "  }\n" +
    "  function check(){\n" +
    "    const ctx=findSpinnerContext(rootDoc);\n" +
    "    if(ctx){\n" +
    "      renderAd(ctx);\n" +
    "    }else{\n" +
    "      removeAd(rootDoc);\n" +
    "      if(adVisibleStart){\n" +
    "        totalVisibleMs += Date.now() - adVisibleStart;\n" +
    "        adVisibleStart=0;\n" +
    "        if(totalVisibleMs>=MIN_DWELL_MS){reportImpression();}\n" +
    "      }\n" +
    "    }\n" +
    "  }\n" +
    "  if(isThisWindow){window.__prismCheck=check;}\n" +
    "  const observer=new MutationObserver(function(mutations){\n" +
    "    const adOnly=mutations.every(function(m){\n" +
    "      if(!insideAd(m.target))return false;\n" +
    "      for(let i=0;i<m.addedNodes.length;i++){if(!insideAd(m.addedNodes[i]))return false;}\n" +
    "      return true;\n" +
    "    });\n" +
    "    if(adOnly)return;\n" +
    "    check();\n" +
    "  });\n" +
    "  if(rootDoc.body){observer.observe(rootDoc.body,{childList:true,subtree:true});}\n" +
    "  function observeFrames(doc){\n" +
    "    const iframes=doc.querySelectorAll('iframe');\n" +
    "    for(let i=0;i<iframes.length;i++){\n" +
    "      const f=iframes[i];\n" +
    "      try{\n" +
    "        const d=f.contentDocument;\n" +
    "        if(d && d!==doc){start(d);}\n" +
    "      }catch(e){}\n" +
    "      f.addEventListener('load',function(){\n" +
    "        try{const d=f.contentDocument;if(d)start(d);}catch(e){}\n" +
    "      });\n" +
    "    }\n" +
    "  }\n" +
    "  observeFrames(rootDoc);\n" +
    "}\n" +
    "if(document.readyState=='loading')document.addEventListener('DOMContentLoaded',function(){start(document);});\n" +
    "else start(document);\n" +
    "})();\n" +
    "}catch(e){console.error('[Prism] injector error',e);}"
  )
}

function patchWebview(
  webviewPath: string,
  ads: AdData[],
  apiUrl?: string,
  apiKey?: string,
  platform: 'claude' | 'codex' = 'claude'
): boolean {
  const content = fs.readFileSync(webviewPath, 'utf-8')

  // Avoid double-patching.
  if (content.includes('/*prism-panel-ads*/')) {
    return false
  }

  // Prepend the dynamic ad injector. We do not mutate the original target
  // extension functions/arrays; the injector detects the thinking element by
  // its stable class names and inserts a non-destructive ad sibling.
  const patched = buildAdInjectorScript(ads, apiUrl, apiKey, platform) + '\n' + content

  fs.writeFileSync(webviewPath, patched)
  return true
}

function getApiOrigin(apiUrl?: string): string {
  const raw = (apiUrl || DEFAULT_API_URL).trim().replace(/\/$/, '')
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`Invalid Prism API URL: ${raw}`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported Prism API URL protocol: ${url.protocol}`)
  }
  return `${url.protocol}//${url.host}`
}

export function patchExtensionJs(extensionJsPath: string, apiUrl?: string): boolean {
  let content = fs.readFileSync(extensionJsPath, 'utf-8')

  // Avoid double-patching.
  if (content.includes('/*prism-panel-csp*/')) {
    return false
  }

  // Loosen CSP to allow connections and images from the Prism API origin.
  const apiOrigin = getApiOrigin(apiUrl)

  // Inject the Prism API origin as a constant inside getHtmlForWebview.
  const afterOrigin = content.replace(
    /getHtmlForWebview\([^)]*\)\{/,
    (match) => `${match}const prismApiOrigin=${JSON.stringify(apiOrigin)};/*prism-panel-csp*/`
  )
  if (afterOrigin === content) {
    return false
  }
  content = afterOrigin

  const oldImgRe = /(\s*)m=\`img-src \${e.cspSource} data:\`/
  if (!oldImgRe.test(content)) {
    return false
  }
  content = content.replace(oldImgRe, `$1m=\`img-src \${e.cspSource} data: https:\``)

  const oldWorkerRe = /(\s*)g=\`worker-src \${e.cspSource}\`/
  if (!oldWorkerRe.test(content)) {
    return false
  }
  content = content.replace(oldWorkerRe, `$1g=\`worker-src \${e.cspSource}\`,prismConnectSrc=\`connect-src \${prismApiOrigin} \${e.cspSource}\``)

  const oldMetaTail = `script-src 'nonce-\${u}'; \${g};">`
  const newMetaTail = `script-src 'nonce-\${u}'; \${g}; \${prismConnectSrc};">`
  if (!content.includes(oldMetaTail)) {
    return false
  }
  content = content.replace(oldMetaTail, newMetaTail)

  // Bust the webview service-worker cache so our patched webview/index.js is
  // loaded after the user reloads the window.
  const oldScriptSrc = `<script nonce="\${u}" src="\${a}" type="module"></script>`
  const newScriptSrc = `<script nonce="\${u}" src="\${a}?prism=\${Date.now()}" type="module"></script>`
  if (content.includes(oldScriptSrc)) {
    content = content.replace(oldScriptSrc, newScriptSrc)
  }

  fs.writeFileSync(extensionJsPath, content)
  return true
}

export function patchCodexExtensionJs(extensionJsPath: string, apiUrl?: string): boolean {
  let content = fs.readFileSync(extensionJsPath, 'utf-8')

  // Avoid double-patching.
  if (content.includes('/*prism-panel-csp*/')) {
    return false
  }

  const apiOrigin = getApiOrigin(apiUrl)

  // Codex bundles its CSP builder as `function kL({cspSource:t,devOrigin:e,extensionSentryOrigin:r})`.
  const klRe = /function kL\(\{cspSource:t,devOrigin:e,extensionSentryOrigin:r\}\)\{let n=\[t,r,\.\.\.g3e,\.\.\.h3e\];/
  if (!klRe.test(content)) {
    return false
  }
  content = content.replace(
    klRe,
    (match) =>
      `${match}const prismApiOrigin=${JSON.stringify(apiOrigin)};n.push(prismApiOrigin);/*prism-panel-csp*/`
  )

  // Allow images served from the Prism API origin.
  const imgRe = /(`img-src \$\{t\})/
  if (!imgRe.test(content)) {
    return false
  }
  content = content.replace(imgRe, '$1 ${prismApiOrigin}')

  fs.writeFileSync(extensionJsPath, content)
  return true
}

export async function patchPanel(apiUrl?: string, apiKey?: string): Promise<PatchResult[]> {
  const extensions = findClaudeCodeExtensions()
  if (extensions.length === 0) {
    return [{ path: '', patched: false, error: 'No Claude Code extension found in VS Code or Cursor' }]
  }

  const ads = await fetchAdQueue(apiUrl, apiKey, 5, 'claude')
  const results: PatchResult[] = []

  for (const extPath of extensions) {
    const webviewPath = path.join(extPath, 'webview', 'index.js')
    const extensionJsPath = path.join(extPath, 'extension.js')

    try {
      if (!fs.existsSync(webviewPath)) {
        results.push({ path: extPath, patched: false, error: 'webview/index.js not found' })
        continue
      }

      ensureBackup(webviewPath)
      const webviewPatched = patchWebview(webviewPath, ads, apiUrl, apiKey, 'claude')

      let extensionJsPatched = false
      if (fs.existsSync(extensionJsPath)) {
        ensureBackup(extensionJsPath)
        extensionJsPatched = patchExtensionJs(extensionJsPath, apiUrl)
      }

      if (webviewPatched || extensionJsPatched) {
        results.push({ path: extPath, patched: true })
      } else {
        results.push({ path: extPath, patched: false, error: 'No changes made (already patched or unsupported build)' })
      }
    } catch (err) {
      results.push({
        path: extPath,
        patched: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return results
}

export function restorePanel(): PatchResult[] {
  const extensions = findClaudeCodeExtensions()
  const results: PatchResult[] = []

  for (const extPath of extensions) {
    const webviewPath = path.join(extPath, 'webview', 'index.js')
    const extensionJsPath = path.join(extPath, 'extension.js')

    try {
      const backups: { filePath: string; backup: string }[] = []
      let restored = false

      for (const filePath of [webviewPath, extensionJsPath]) {
        const backup = backupPath(filePath)
        if (fs.existsSync(backup)) {
          fs.copyFileSync(backup, filePath)
          backups.push({ filePath, backup })
          restored = true
        }
      }

      // Only delete backups after all restores succeeded.
      for (const { backup } of backups) {
        fs.unlinkSync(backup)
      }

      results.push({ path: extPath, patched: restored })
    } catch (err) {
      results.push({
        path: extPath,
        patched: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (results.length === 0) {
    return [{ path: '', patched: false, error: 'No Claude Code extension found' }]
  }

  return results
}

export async function patchCodexPanel(apiUrl?: string, apiKey?: string): Promise<PatchResult[]> {
  const extensions = findCodexExtensions()
  if (extensions.length === 0) {
    return [{ path: '', patched: false, error: 'No OpenAI Codex extension found in VS Code or Cursor' }]
  }

  const ads = await fetchAdQueue(apiUrl, apiKey, 5, 'codex')
  const results: PatchResult[] = []

  for (const extPath of extensions) {
    const webviewPath = findCodexWebviewEntryJsPath(extPath)
    const extensionJsPath = path.join(extPath, 'out', 'extension.js')

    try {
      if (!webviewPath || !fs.existsSync(webviewPath)) {
        results.push({ path: extPath, patched: false, error: 'Codex webview entry JS not found' })
        continue
      }

      ensureBackup(webviewPath)
      const webviewPatched = patchWebview(webviewPath, ads, apiUrl, apiKey, 'codex')

      let extensionJsPatched = false
      if (fs.existsSync(extensionJsPath)) {
        ensureBackup(extensionJsPath)
        extensionJsPatched = patchCodexExtensionJs(extensionJsPath, apiUrl)
      }

      if (webviewPatched || extensionJsPatched) {
        results.push({ path: extPath, patched: true })
      } else {
        results.push({ path: extPath, patched: false, error: 'No changes made (already patched or unsupported build)' })
      }
    } catch (err) {
      results.push({
        path: extPath,
        patched: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return results
}

export function restoreCodexPanel(): PatchResult[] {
  const extensions = findCodexExtensions()
  const results: PatchResult[] = []

  for (const extPath of extensions) {
    const webviewPath = findCodexWebviewEntryJsPath(extPath)
    const extensionJsPath = path.join(extPath, 'out', 'extension.js')

    try {
      const backups: { filePath: string; backup: string }[] = []
      let restored = false

      for (const filePath of [webviewPath, extensionJsPath]) {
        if (!filePath) continue
        const backup = backupPath(filePath)
        if (fs.existsSync(backup)) {
          fs.copyFileSync(backup, filePath)
          backups.push({ filePath, backup })
          restored = true
        }
      }

      // Only delete backups after all restores succeeded.
      for (const { backup } of backups) {
        fs.unlinkSync(backup)
      }

      results.push({ path: extPath, patched: restored })
    } catch (err) {
      results.push({
        path: extPath,
        patched: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (results.length === 0) {
    return [{ path: '', patched: false, error: 'No OpenAI Codex extension found' }]
  }

  return results
}

// ---------------------------------------------------------------------------
// Claude for Desktop (Claude.app) patching
// ---------------------------------------------------------------------------

const CLAUDE_DESKTOP_BUNDLE_PATHS = [
  '/Applications/Claude.app',
  path.join(os.homedir(), 'Applications', 'Claude.app'),
]

const CLAUDE_DESKTOP_THINKING_VERBS = [
  'Thinking',
  'Sifting',
  'Fathoming',
  'Honing',
  'Weighing',
  'Pondering',
  'Contemplating',
  'Cogitating',
  'Picturing',
  'Musing',
  'Figuring',
  'Reckoning',
  'Mulling',
  'Triangulating',
  'Crystallizing',
  'Sleuthing',
  'Untangling',
]

function claudeDesktopBackupDir(): string {
  return path.join(os.homedir(), '.prism', 'backups', 'claude-desktop')
}

function claudeDesktopIndexHtmlBackupPath(): string {
  return path.join(claudeDesktopBackupDir(), 'index.html')
}

function claudeDesktopAppAsarBackupDir(): string {
  return path.join(claudeDesktopBackupDir(), 'app-asar')
}

function claudeDesktopAppAsarBackupPath(): string {
  return path.join(claudeDesktopAppAsarBackupDir(), 'app.asar')
}

function claudeDesktopAppAsarUnpackedBackupPath(): string {
  return path.join(claudeDesktopAppAsarBackupDir(), 'app.asar.unpacked')
}

function claudeDesktopIndexHtmlPath(appPath: string): string {
  return path.join(appPath, 'Contents', 'Resources', 'ion-dist', 'index.html')
}

function claudeDesktopAppAsarPath(appPath: string): string {
  return path.join(appPath, 'Contents', 'Resources', 'app.asar')
}

function claudeDesktopInfoPlistPath(appPath: string): string {
  return path.join(appPath, 'Contents', 'Info.plist')
}

function hashFile(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

function getAsarHeaderHash(asarPath: string): string {
  // Electron's ASAR integrity check hashes the JSON header string, not the
  // entire archive. The on-disk layout is:
  //   [0..3]   outer Pickle payload size (always 4)
  //   [4..7]   outer Pickle payload: uint32 inner pickle total size
  //   [8..11]  inner Pickle payload size
  //   [12..15] inner Pickle payload: int32 JSON string length
  //   [16..]   JSON string bytes
  const buf = fs.readFileSync(asarPath)
  if (buf.length < 20) {
    throw new Error('ASAR archive too small')
  }
  const jsonLen = buf.readUInt32LE(12)
  const jsonStart = 16
  const jsonEnd = jsonStart + jsonLen
  if (jsonEnd > buf.length) {
    throw new Error('ASAR header length out of bounds')
  }
  const headerString = buf.toString('utf8', jsonStart, jsonEnd)
  return crypto.createHash('sha256').update(headerString).digest('hex')
}

function ensureClaudeDesktopBackups(): void {
  fs.mkdirSync(claudeDesktopBackupDir(), { recursive: true })
}

interface MainProcessHook {
  type: 'm7r' | 'webContentsView'
  match: string
  viewVar: string
  maxListenersArg?: string
}

function findMainProcessHook(content: string): MainProcessHook | undefined {
  // Older Claude Desktop builds (≈1.11.x) register the main chat view via
  // m7r(<view>.webContents). The surrounding code is in statement context.
  const oldMatch = content.match(/m7r\(([a-zA-Z_$][\w$]*)\.webContents\)/)
  if (oldMatch) {
    return { type: 'm7r', match: oldMatch[0], viewVar: oldMatch[1] }
  }

  // Newer builds (≈1.12.x+) create a WebContentsView and tag it with the
  // claude.ai-web identifier inside a comma expression. We must keep the
  // replacement an expression, so wrap our statements in an IIFE.
  const newMatch = content.match(
    /new [a-zA-Z_$][\w$]*\.WebContentsView\([^)]+\),[a-zA-Z_$][\w$]*\(([a-zA-Z_$][\w$]*)\.webContents,(?:[a-zA-Z_$][\w$]*\.CLAUDE_AI_WEB|"claude\.ai-web")\),\1\.webContents\.setMaxListeners\(([^)]+)\)/
  )
  if (newMatch) {
    return {
      type: 'webContentsView',
      match: newMatch[0],
      viewVar: newMatch[1],
      maxListenersArg: newMatch[2],
    }
  }

  return undefined
}

function buildInjection(viewVar: string, ad: AdData): string {
  const rendererScript = buildClaudeDesktopInjectorScript(ad)
  const scriptLiteral = JSON.stringify(rendererScript)
  return `
const __prismAdInjector=${scriptLiteral};
function __prismInjectAds(wc){if(!wc||wc.isDestroyed())return;wc.executeJavaScript(__prismAdInjector).catch(()=>{});}
${viewVar}.webContents.on("dom-ready",()=>__prismInjectAds(${viewVar}.webContents));
${viewVar}.webContents.on("did-finish-load",()=>__prismInjectAds(${viewVar}.webContents));
${viewVar}.webContents.on("did-navigate",()=>__prismInjectAds(${viewVar}.webContents));
${viewVar}.webContents.on("did-navigate-in-page",()=>__prismInjectAds(${viewVar}.webContents));
`
}

function patchMainProcessBundle(bundlePath: string, ad: AdData): boolean {
  let content = fs.readFileSync(bundlePath, 'utf-8')

  // Avoid double-patching.
  if (content.includes('__prismAdInjector')) {
    return false
  }

  const hook = findMainProcessHook(content)
  if (!hook) {
    return false
  }

  const injection = buildInjection(hook.viewVar, ad)
  let replacement: string

  if (hook.type === 'm7r') {
    replacement = `${hook.match};${injection}`
  } else {
    // Insert an IIFE into the comma expression so the injected statements run
    // immediately when the view is created, without breaking the surrounding
    // return expression.
    const tail = `,${hook.viewVar}.webContents.setMaxListeners(${hook.maxListenersArg})`
    replacement = hook.match.replace(tail, `,(function(){${injection}})()${tail}`)
  }

  const patched = content.replace(hook.match, replacement)
  if (patched === content) {
    return false
  }

  fs.writeFileSync(bundlePath, patched)
  return true
}

function updateElectronAsarIntegrity(infoPlistPath: string, asarPath: string): boolean {
  if (!fs.existsSync(infoPlistPath) || !fs.existsSync(asarPath)) {
    return false
  }

  let content: string
  try {
    content = fs.readFileSync(infoPlistPath, 'utf-8')
  } catch {
    return false
  }

  // Only patch Info.plist files that contain the expected ElectronAsarIntegrity
  // block for Resources/app.asar.
  if (!content.includes('<key>ElectronAsarIntegrity</key>')) {
    return false
  }
  if (!content.includes('<key>Resources/app.asar</key>')) {
    return false
  }

  const hash = getAsarHeaderHash(asarPath)

  // Replace the hash value inside the Resources/app.asar integrity dict.
  // This regex targets the structure:
  //   <key>hash</key>
  //   <string>OLD_HASH</string>
  // when it appears after <key>Resources/app.asar</key>.
  const hashRe = /(<key>Resources\/app\.asar<\/key>\s*<dict>\s*<key>algorithm<\/key>\s*<string>SHA256<\/string>\s*<key>hash<\/key>\s*<string>)[a-fA-F0-9]+(<\/string>)/
  const patched = content.replace(hashRe, `$1${hash}$2`)
  if (patched === content) {
    return false
  }

  try {
    fs.writeFileSync(infoPlistPath, patched)
    return true
  } catch {
    return false
  }
}

export function findClaudeDesktopApp(
  paths: readonly string[] = CLAUDE_DESKTOP_BUNDLE_PATHS
): string | undefined {
  for (const base of paths) {
    const indexHtml = path.join(base, 'Contents', 'Resources', 'ion-dist', 'index.html')
    if (fs.existsSync(indexHtml)) {
      return base
    }
  }
  return undefined
}

export function buildClaudeDesktopInjectorScript(ad: AdData): string {
  const safe = JSON.stringify(ad).replace(/`/g, '\\u0060')
  const verbPattern = CLAUDE_DESKTOP_THINKING_VERBS.map((v) =>
    v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|')

  return (
    "try{\n" +
    ";(function(){\n" +
    "if(window.__prismDesktopAdInjected)return;window.__prismDesktopAdInjected=true;\n" +
    "const AD=" + safe + ";\n" +
    "window.__prismAd=AD;\n" +
    "function setStyle(el,k,v){el.style.setProperty(k,v,'important');}\n" +
    "const MIN_DWELL_MS=5000;\n" +
    "let impressionReported=false;\n" +
    "let adVisibleStart=0;\n" +
    "let totalVisibleMs=0;\n" +
    "let currentThinkingEl=null;\n" +
    "let adContainer=null;\n" +
    "let lastDetectedEl=null;\n" +
    "function reportImpression(){\n" +
    "  if(impressionReported || !AD.impressionToken || !AD.reportUrl || !AD.id)return;\n" +
    "  if(totalVisibleMs<MIN_DWELL_MS)return;\n" +
    "  impressionReported=true;\n" +
    "  try{\n" +
    "    var headers={'Content-Type':'application/json'};\n" +
    "    if(AD.apiKey)headers['X-Prism-Api-Key']=AD.apiKey;\n" +
    "    fetch(AD.reportUrl,{\n" +
    "      method:'POST',\n" +
    "      headers:headers,\n" +
    "      body:JSON.stringify({userId:AD.sessionId||AD.id,campaignId:AD.id,impressionToken:AD.impressionToken,durationMs:totalVisibleMs,context:{editor:'claude-desktop',aiTool:'claude',waitState:true}})\n" +
    "    }).catch(function(){});\n" +
    "  }catch(e){}\n" +
    "}\n" +
    "var thinkingRe=/^(" + verbPattern + ")(?:\\.{1,3}|\\u2026)?$/i;\n" +
    "function isThinkingText(s){return thinkingRe.test((s||'').trim());}\n" +
    "function insidePrismAd(el){\n" +
    "  var n=el;\n" +
    "  while(n){\n" +
    "    if(n.getAttribute && n.getAttribute('data-prism-ad'))return true;\n" +
    "    n=n.parentNode;\n" +
    "  }\n" +
    "  return false;\n" +
    "}\n" +
    "function isVisible(el){\n" +
    "  if(!el)return false;\n" +
    "  var r=el.getBoundingClientRect();\n" +
    "  return r.width>0 && r.height>0;\n" +
    "}\n" +
    "function hasAnimation(el){\n" +
    "  try{\n" +
    "    var st=window.getComputedStyle(el);\n" +
    "    return !!(st && st.animationName && st.animationName!=='none');\n" +
    "  }catch(e){return false;}\n" +
    "}\n" +
    "function isForbiddenParent(el){\n" +
    "  var n=el;\n" +
    "  while(n){\n" +
    "    if(!n.tagName)return false;\n" +
    "    var tag=n.tagName.toLowerCase();\n" +
    "    if(tag==='button'||tag==='a'||tag==='input'||tag==='textarea'||tag==='select'||tag==='form')return true;\n" +
    "    var role=(n.getAttribute('role')||'').toLowerCase();\n" +
    "    if(role==='textbox'||role==='button'||role==='searchbox'||role==='menu'||role==='dialog')return true;\n" +
    "    if(n.isContentEditable)return true;\n" +
    "    var cls=(n.getAttribute('class')||'').toLowerCase();\n" +
    "    var forbidden=['composer','prompt','input','textarea','send','sidebar','frame-peek','popover','banner','toast','tooltip','overlay','modal','menu','drawer'];\n" +
    "    for(var i=0;i<forbidden.length;i++){if(cls.indexOf(forbidden[i])>=0)return true;}\n" +
    "    n=n.parentNode;\n" +
    "  }\n" +
    "  return false;\n" +
    "}\n" +
    "function looksLikeSpinner(el){\n" +
    "  if(!el || el.tagName.toLowerCase()!=='svg')return false;\n" +
    "  var cls=(el.getAttribute('class')||'').toLowerCase();\n" +
    "  if(cls.indexOf('spinner')>=0 || cls.indexOf('loading')>=0 || cls.indexOf('thinking')>=0)return true;\n" +
    "  var vb=(el.getAttribute('viewBox')||'').replace(/\\s+/g,' ').trim();\n" +
    "  if(vb==='0 0 256 256')return true;\n" +
    "  return false;\n" +
    "}\n" +
    "function logDetection(el,kind){\n" +
    "  try{\n" +
    "    var chain=[];\n" +
    "    var n=el;\n" +
    "    while(n && n!==document.body && chain.length<6){\n" +
    "      chain.push((n.tagName||'?')+(n.id?'#'+n.id:'')+(n.className?'.'+String(n.className).split(' ').slice(0,2).join('.'):''));\n" +
    "      n=n.parentNode;\n" +
    "    }\n" +
    "    console.log('[Prism] detected '+kind+':', chain.reverse().join(' > '));\n" +
    "  }catch(e){}\n" +
    "}\n" +
    "function findTarget(){\n" +
    "  // Claude's newer chat UI uses a flower-style SVG spinner instead of text.\n" +
    "  // Match a visible, animated spinner SVG that is not inside the composer.\n" +
    "  var svgs=Array.from(document.querySelectorAll('svg'));\n" +
    "  for(var i=svgs.length-1;i>=0;i--){\n" +
    "    var s=svgs[i];\n" +
    "    if(insidePrismAd(s))continue;\n" +
    "    if(!looksLikeSpinner(s))continue;\n" +
    "    if(!isVisible(s))continue;\n" +
    "    if(!hasAnimation(s))continue;\n" +
    "    if(isForbiddenParent(s))continue;\n" +
    "    return {el:s, hide:false};\n" +
    "  }\n" +
    "\n" +
    "  // Fall back to the old thinking-text heuristic.\n" +
    "  var selectors='[role=\"status\"],[aria-live],[class*=\"thinking\"]';\n" +
    "  var candidates=Array.from(document.querySelectorAll(selectors));\n" +
    "  var best=null;\n" +
    "  for(var i=0;i<candidates.length;i++){\n" +
    "    var c=candidates[i];\n" +
    "    if(insidePrismAd(c) || isForbiddenParent(c))continue;\n" +
    "    if(isThinkingText(c.textContent||'')){\n" +
    "      if(!best || (c.textContent||'').length < (best.textContent||'').length){best=c;}\n" +
    "    }\n" +
    "  }\n" +
    "  if(best)return {el:best, hide:true};\n" +
    "  if(!document.body)return null;\n" +
    "  var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,false);\n" +
    "  var node;\n" +
    "  while((node=walker.nextNode())){\n" +
    "    var p=node.parentElement;\n" +
    "    if(!p || insidePrismAd(p) || isForbiddenParent(p))continue;\n" +
    "    if(isThinkingText(node.textContent||''))return {el:p, hide:true};\n" +
    "  }\n" +
    "  return null;\n" +
    "}\n" +
    "function removeAd(){\n" +
    "  if(adContainer && adContainer.parentNode){adContainer.parentNode.removeChild(adContainer);}\n" +
    "  adContainer=null;\n" +
    "  if(currentThinkingEl){\n" +
    "    if(currentThinkingEl.getAttribute('data-prism-thinking-hidden')){\n" +
    "      currentThinkingEl.style.removeProperty('display');\n" +
    "      currentThinkingEl.removeAttribute('data-prism-thinking-hidden');\n" +
    "    }\n" +
    "    currentThinkingEl=null;\n" +
    "  }\n" +
    "}\n" +
    "function renderAd(target){\n" +
    "  if(!target || !target.el)return;\n" +
    "  var el=target.el;\n" +
    "  var now=Date.now();\n" +
    "  if(!adVisibleStart)adVisibleStart=now;\n" +
    "  if(currentThinkingEl===el && adContainer && adContainer.parentNode)return;\n" +
    "  removeAd();\n" +
    "  currentThinkingEl=el;\n" +
    "  if(target.hide){\n" +
    "    el.setAttribute('data-prism-thinking-hidden','true');\n" +
    "    setStyle(el,'display','none');\n" +
    "  }\n" +
    "  adContainer=document.createElement('span');\n" +
    "  adContainer.setAttribute('data-prism-ad','true');\n" +
    "  setStyle(adContainer,'display','inline-flex');\n" +
    "  setStyle(adContainer,'align-items','center');\n" +
    "  setStyle(adContainer,'gap','6px');\n" +
    "  setStyle(adContainer,'white-space','nowrap');\n" +
    "  setStyle(adContainer,'overflow','visible');\n" +
    "  setStyle(adContainer,'max-width','none');\n" +
    "  setStyle(adContainer,'flex-shrink','0');\n" +
    "  var iconWrap=document.createElement('span');\n" +
    "  iconWrap.className='prism-ad-icon';\n" +
    "  setStyle(iconWrap,'display','inline-block');\n" +
    "  setStyle(iconWrap,'width','18px');\n" +
    "  setStyle(iconWrap,'height','18px');\n" +
    "  setStyle(iconWrap,'min-width','18px');\n" +
    "  setStyle(iconWrap,'min-height','18px');\n" +
    "  setStyle(iconWrap,'flex-shrink','0');\n" +
    "  setStyle(iconWrap,'flex-grow','0');\n" +
    "  iconWrap.innerHTML=AD.iconHtml;\n" +
    "  var svg=iconWrap.querySelector('svg');\n" +
    "  if(svg){setStyle(svg,'display','block');setStyle(svg,'width','18px');setStyle(svg,'height','18px');}\n" +
    "  var img=iconWrap.querySelector('img');\n" +
    "  if(img){setStyle(img,'display','block');setStyle(img,'width','18px');setStyle(img,'height','18px');setStyle(img,'border-radius','5px');setStyle(img,'object-fit','contain');}\n" +
    "  adContainer.appendChild(iconWrap);\n" +
    "  var a=document.createElement('a');\n" +
    "  a.href=AD.url||AD.clickUrl||'#';\n" +
    "  a.target='_blank';\n" +
    "  a.rel='noopener noreferrer sponsored';\n" +
    "  a.textContent=AD.advertiserName+' · '+AD.copy;\n" +
    "  setStyle(a,'color','inherit');\n" +
    "  setStyle(a,'text-decoration','underline');\n" +
    "  setStyle(a,'white-space','nowrap');\n" +
    "  setStyle(a,'overflow','visible');\n" +
    "  setStyle(a,'max-width','none');\n" +
    "  setStyle(a,'flex-shrink','1');\n" +
    "  a.setAttribute('data-prism-ad','true');\n" +
    "  adContainer.appendChild(a);\n" +
    "  if(el.parentNode){el.parentNode.insertBefore(adContainer,el.nextSibling);}\n" +
    "}\n" +
    "function check(){\n" +
    "  var target=findTarget();\n" +
    "  if(target){\n" +
    "    if(!lastDetectedEl || lastDetectedEl!==target.el){\n" +
    "      lastDetectedEl=target.el;\n" +
    "      logDetection(target.el, target.hide?'text':'spinner');\n" +
    "    }\n" +
    "    renderAd(target);\n" +
    "  }else{\n" +
    "    lastDetectedEl=null;\n" +
    "    if(adVisibleStart){totalVisibleMs += Date.now() - adVisibleStart;adVisibleStart=0;}\n" +
    "    removeAd();\n" +
    "    if(totalVisibleMs>=MIN_DWELL_MS && !impressionReported){reportImpression();}\n" +
    "  }\n" +
    "}\n" +
    "function start(){\n" +
    "  console.log('[Prism] desktop ad injector active for', AD.advertiserName);\n" +
    "  check();\n" +
    "  if(!document.body)return;\n" +
    "  var observer=new MutationObserver(function(){check();});\n" +
    "  observer.observe(document.body,{childList:true,subtree:true});\n" +
    "}\n" +
    "if(document.readyState=='loading')document.addEventListener('DOMContentLoaded',start);\n" +
    "else start();\n" +
    "})();\n" +
    "}catch(e){console.error('[Prism] desktop injector error',e);}\n"
  )
}

const DEFAULT_CLAUDE_DESKTOP_ENTITLEMENTS = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key><true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key><true/>
  <key>com.apple.security.cs.disable-library-validation</key><true/>
  <key>com.apple.security.cs.disable-executable-page-protection</key><true/>
  <key>com.apple.security.network.client</key><true/>
  <key>com.apple.security.network.server</key><true/>
  <key>com.apple.security.automation.apple-events</key><true/>
  <key>com.apple.security.device.audio-input</key><true/>
  <key>com.apple.security.device.bluetooth</key><true/>
  <key>com.apple.security.device.camera</key><true/>
  <key>com.apple.security.device.print</key><true/>
  <key>com.apple.security.device.usb</key><true/>
  <key>com.apple.security.personal-information.location</key><true/>
  <key>com.apple.security.personal-information.photos-library</key><true/>
</dict>
</plist>`

function extractEntitlementsXml(appPath: string): string | undefined {
  try {
    const raw = execSync(`codesign -d --entitlements - "${appPath}"`, { stdio: 'pipe' }).toString()
    // codesign may prefix the XML with an "Executable=..." line; strip it.
    const lines = raw.split(/\r?\n/)
    const firstXmlIndex = lines.findIndex((l) => l.trim().startsWith('<?xml'))
    if (firstXmlIndex >= 0) {
      return lines.slice(firstXmlIndex).join('\n').trim()
    }
  } catch {
    // No entitlements available.
  }
  return undefined
}

function runCodesign(appPath: string): { ok: boolean; output: string } {
  const backupDir = claudeDesktopBackupDir()
  fs.mkdirSync(backupDir, { recursive: true })

  // Extract original entitlements *before* stripping the signature.
  const originalEntitlements = extractEntitlementsXml(appPath)
  const entitlementsFile = path.join(backupDir, 'entitlements.xml')
  fs.writeFileSync(entitlementsFile, originalEntitlements || DEFAULT_CLAUDE_DESKTOP_ENTITLEMENTS)

  try {
    execSync(`codesign --remove-signature "${appPath}"`, { stdio: 'pipe' })
  } catch {
    // The app may already be unsigned; keep going.
  }

  try {
    execSync(
      `codesign --force --deep --sign - --entitlements "${entitlementsFile}" "${appPath}"`,
      { stdio: 'pipe' }
    )
    return { ok: true, output: 'Re-signed ad-hoc with entitlements' }
  } catch (err) {
    return { ok: false, output: err instanceof Error ? err.message : String(err) }
  }
}

export function injectClaudeDesktopAd(html: string, ad: AdData): string {
  if (html.includes('window.__prismAd')) {
    throw new Error('Claude desktop app already patched')
  }

  const scriptTag = `<script>${buildClaudeDesktopInjectorScript(ad)}</script>`

  const patched = html.replace('</head>', `${scriptTag}\n</head>`)
  if (patched === html) {
    throw new Error('Could not find </head> in index.html')
  }
  return patched
}

export async function buildClaudeDesktopTestPage(
  apiUrl?: string,
  apiKey?: string
): Promise<string> {
  const ad = await fetchAdData(apiUrl, apiKey)
  const script = buildClaudeDesktopInjectorScript(ad)

  const spinnerSvg = `<svg class="spinner" viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="width:18px;height:18px;color:#b8b5a9;animation:spin 0.8s linear infinite;"><path d="M128 0C134 48 176 52 192 96C236 112 240 154 256 160C240 166 236 208 192 224C176 268 134 272 128 320C122 272 80 268 64 224C20 208 16 166 0 160C16 154 20 112 64 96C80 52 122 48 128 0Z"/></svg>`

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prism Claude Desktop Test</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; background: #0f0f0f; color: #e5e5e5; }
      button { padding: 10px 18px; margin-right: 10px; border-radius: 8px; border: 1px solid #333; background: #1a1a1a; color: #fff; cursor: pointer; }
      button:hover { background: #2a2a2a; }
      #stage { margin-top: 24px; padding: 24px; border: 1px solid #333; border-radius: 12px; min-height: 60px; }
      [role="status"] { color: #a1a1aa; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <h1>Prism Claude Desktop test page</h1>
    <p>Click "Show thinking" to simulate the old text indicator, or "Show spinner" to simulate the new flower spinner.</p>
    <button id="show">Show thinking</button>
    <button id="show-spinner">Show spinner</button>
    <button id="hide">Hide thinking</button>
    <div id="stage">
      <div class="flex items-center gap-2"><p role="status" class="text-sm">Thinking…</p></div>
    </div>
    <script>${script}</script>
    <script>
      const stage = document.getElementById('stage');
      document.getElementById('show').addEventListener('click', () => {
        stage.innerHTML = '<div class="flex items-center gap-2"><p role="status" class="text-sm">Thinking…</p></div>';
      });
      document.getElementById('show-spinner').addEventListener('click', () => {
        stage.innerHTML = '<div class="flex items-center gap-2">${spinnerSvg}</div>';
      });
      document.getElementById('hide').addEventListener('click', () => {
        stage.innerHTML = '';
      });
    </script>
  </body>
</html>`
}

export async function patchClaudeDesktopApp(
  apiUrl?: string,
  apiKey?: string,
  bundlePaths?: readonly string[]
): Promise<PatchResult[]> {
  const appPath = findClaudeDesktopApp(bundlePaths)
  if (!appPath) {
    return [{ path: '', patched: false, error: 'Claude desktop app not found' }]
  }

  const indexHtmlPath = claudeDesktopIndexHtmlPath(appPath)
  const appAsarPath = claudeDesktopAppAsarPath(appPath)
  const infoPlistPath = claudeDesktopInfoPlistPath(appPath)
  const ad = await fetchAdData(apiUrl, apiKey)

  const details: string[] = []
  let changed = false
  let indexBackupPath: string | undefined

  try {
    // Patch the splash-screen index.html as a fallback (kept for compatibility).
    if (fs.existsSync(indexHtmlPath)) {
      const original = fs.readFileSync(indexHtmlPath, 'utf-8')
      const patched = injectClaudeDesktopAd(original, ad)

      // Older patcher versions left backup files inside the signed bundle, which breaks the
      // code signature. Remove them before re-signing.
      const legacyBackup = `${indexHtmlPath}.prism-backup`
      if (fs.existsSync(legacyBackup)) {
        fs.unlinkSync(legacyBackup)
      }

      ensureClaudeDesktopBackups()
      indexBackupPath = claudeDesktopIndexHtmlBackupPath()
      if (!fs.existsSync(indexBackupPath)) {
        fs.copyFileSync(indexHtmlPath, indexBackupPath)
      }
      fs.writeFileSync(indexHtmlPath, patched)
      details.push('index.html')
      changed = true
    }

    // Patch the main process bundle inside app.asar so the remote chat WebContentsView
    // injects the Prism ad script via executeJavaScript.
    if (fs.existsSync(appAsarPath)) {
      ensureClaudeDesktopBackups()
      const asarBackupPath = claudeDesktopAppAsarBackupPath()
      const asarUnpackedBackupPath = claudeDesktopAppAsarUnpackedBackupPath()
      const appAsarUnpackedPath = `${appAsarPath}.unpacked`
      fs.mkdirSync(claudeDesktopAppAsarBackupDir(), { recursive: true })
      if (!fs.existsSync(asarBackupPath)) {
        fs.copyFileSync(appAsarPath, asarBackupPath)
        if (fs.existsSync(appAsarUnpackedPath)) {
          fs.cpSync(appAsarUnpackedPath, asarUnpackedBackupPath, { recursive: true })
        }
      }

      const extractDir = path.join(os.tmpdir(), `prism-claude-asar-${Date.now()}`)
      const tempBase = path.join(os.tmpdir(), `prism-claude-asar-tmp-${Date.now()}`)
      const tempAsar = `${tempBase}.asar`
      const tempUnpacked = `${tempAsar}.unpacked`
      try {
        const asar = await import('@electron/asar')
        asar.extractAll(appAsarPath, extractDir)
        const mainBundlePath = path.join(extractDir, '.vite', 'build', 'index.js')
        if (fs.existsSync(mainBundlePath)) {
          const bundlePatched = patchMainProcessBundle(mainBundlePath, ad)
          if (bundlePatched) {
            // Repack app.asar atomically. Keep native addons unpacked because
            // the runtime loads them from app.asar.unpacked/.
            await asar.createPackageWithOptions(extractDir, tempAsar, {
              unpack: '**/{*.node,*.dylib,spawn-helper}',
            })
            if (fs.existsSync(appAsarUnpackedPath)) {
              fs.rmSync(appAsarUnpackedPath, { recursive: true, force: true })
            }
            if (fs.existsSync(tempUnpacked)) {
              fs.renameSync(tempUnpacked, appAsarUnpackedPath)
            }
            fs.renameSync(tempAsar, appAsarPath)
            updateElectronAsarIntegrity(infoPlistPath, appAsarPath)
            details.push('app.asar')
            changed = true
          }
        }
      } finally {
        try {
          fs.rmSync(extractDir, { recursive: true, force: true })
        } catch {
          // ignore cleanup failures
        }
        try {
          if (fs.existsSync(tempAsar)) {
            fs.rmSync(tempAsar, { force: true })
          }
        } catch {
          // ignore cleanup failures
        }
        try {
          if (fs.existsSync(tempUnpacked)) {
            fs.rmSync(tempUnpacked, { recursive: true, force: true })
          }
        } catch {
          // ignore cleanup failures
        }
      }
    }

    if (!changed) {
      return [
        {
          path: appPath,
          patched: false,
          error: 'No changes made (already patched or unsupported bundle)',
        },
      ]
    }

    const sign = runCodesign(appPath)
    return [
      {
        path: appPath,
        patched: true,
        error: sign.ok ? undefined : `Patched ${details.join(', ')}, but signing failed: ${sign.output}`,
      },
    ]
  } catch (err) {
    // Roll back index.html if we modified it before app.asar patching failed.
    if (indexBackupPath && fs.existsSync(indexBackupPath) && fs.existsSync(indexHtmlPath)) {
      try {
        fs.copyFileSync(indexBackupPath, indexHtmlPath)
      } catch {
        // ignore rollback failures
      }
    }
    return [{ path: appPath, patched: false, error: err instanceof Error ? err.message : String(err) }]
  }
}

export function restoreClaudeDesktopApp(bundlePaths?: readonly string[]): PatchResult[] {
  const appPath = findClaudeDesktopApp(bundlePaths)
  if (!appPath) {
    return [{ path: '', patched: false, error: 'Claude desktop app not found' }]
  }

  const indexHtmlPath = claudeDesktopIndexHtmlPath(appPath)
  const appAsarPath = claudeDesktopAppAsarPath(appPath)
  const infoPlistPath = claudeDesktopInfoPlistPath(appPath)
  const indexBackup = claudeDesktopIndexHtmlBackupPath()
  const asarBackup = claudeDesktopAppAsarBackupPath()

  try {
    const details: string[] = []
    let restored = false

    if (fs.existsSync(indexBackup) && fs.existsSync(indexHtmlPath)) {
      fs.copyFileSync(indexBackup, indexHtmlPath)
      fs.unlinkSync(indexBackup)
      details.push('index.html')
      restored = true
    }

    if (fs.existsSync(asarBackup) && fs.existsSync(appAsarPath)) {
      const appAsarUnpackedPath = `${appAsarPath}.unpacked`
      const asarUnpackedBackup = claudeDesktopAppAsarUnpackedBackupPath()
      fs.copyFileSync(asarBackup, appAsarPath)
      fs.unlinkSync(asarBackup)
      if (fs.existsSync(appAsarUnpackedPath)) {
        fs.rmSync(appAsarUnpackedPath, { recursive: true, force: true })
      }
      if (fs.existsSync(asarUnpackedBackup)) {
        fs.cpSync(asarUnpackedBackup, appAsarUnpackedPath, { recursive: true })
        fs.rmSync(asarUnpackedBackup, { recursive: true, force: true })
      }
      updateElectronAsarIntegrity(infoPlistPath, appAsarPath)
      details.push('app.asar')
      restored = true
    }

    if (!restored) {
      return [{ path: appPath, patched: false, error: 'No backups found' }]
    }

    const sign = runCodesign(appPath)
    return [
      {
        path: appPath,
        patched: true,
        error: sign.ok ? undefined : `Restored ${details.join(', ')}, but signing failed: ${sign.output}`,
      },
    ]
  } catch (err) {
    return [{ path: appPath, patched: false, error: err instanceof Error ? err.message : String(err) }]
  }
}
