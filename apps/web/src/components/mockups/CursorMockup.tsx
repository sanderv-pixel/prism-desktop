import { cn } from '@/lib/cn'
import { MockupWindow } from './MockupWindow'
import {
  FileCode,
  FolderOpen,
  Settings,
  Search,
  GitBranch,
  Bug,
  Command,
  Sparkles,
} from 'lucide-react'

interface CursorMockupProps {
  className?: string
}

export function CursorMockup({ className }: CursorMockupProps) {
  const files = [
    { name: 'src', type: 'folder', open: true, indent: 0 },
    { name: 'components', type: 'folder', open: true, indent: 1 },
    { name: 'Dashboard.tsx', type: 'ts', active: false, indent: 2 },
    { name: 'analytics.ts', type: 'ts', active: false, indent: 2 },
    { name: 'lib', type: 'folder', open: false, indent: 1 },
    { name: 'app', type: 'folder', open: false, indent: 1 },
    { name: 'package.json', type: 'json', active: false, indent: 0 },
  ]

  const codeLines = [
    { num: 1, content: [
      { text: 'import', color: 'text-purple-400' },
      { text: ' { useState } ', color: 'text-cyan-300' },
      { text: 'from', color: 'text-purple-400' },
      { text: ' "react"', color: 'text-green-300' },
      { text: ';', color: 'text-slate-400' },
    ]},
    { num: 2, content: [] },
    { num: 3, content: [
      { text: 'export function', color: 'text-purple-400' },
      { text: ' Dashboard', color: 'text-yellow-300' },
      { text: '() {', color: 'text-slate-300' },
    ]},
    { num: 4, content: [
      { text: '  const', color: 'text-purple-400' },
      { text: ' [earnings] = ', color: 'text-blue-300' },
      { text: 'useState', color: 'text-yellow-300' },
      { text: '(', color: 'text-slate-300' },
      { text: '0', color: 'text-orange-300' },
      { text: ');', color: 'text-slate-400' },
    ]},
    { num: 5, content: [
      { text: '  const', color: 'text-purple-400' },
      { text: ' [count] = ', color: 'text-blue-300' },
      { text: 'useState', color: 'text-yellow-300' },
      { text: '(', color: 'text-slate-300' },
      { text: '1240', color: 'text-orange-300' },
      { text: ');', color: 'text-slate-400' },
    ]},
    { num: 6, content: [
      { text: '  ', color: '' },
    ]},
    { num: 7, content: [
      { text: '  return', color: 'text-purple-400' },
      { text: ' (', color: 'text-slate-300' },
    ]},
    { num: 8, content: [
      { text: '    <', color: 'text-slate-400' },
      { text: 'div', color: 'text-red-300' },
      { text: ' className=', color: 'text-cyan-300' },
      { text: '"dash"', color: 'text-green-300' },
      { text: '>', color: 'text-slate-400' },
    ]},
    { num: 9, content: [
      { text: '      <', color: 'text-slate-400' },
      { text: 'Chart', color: 'text-yellow-300' },
      { text: ' data={', color: 'text-cyan-300' },
      { text: 'data', color: 'text-blue-300' },
      { text: '}/>', color: 'text-slate-400' },
    ]},
    { num: 10, content: [
      { text: '    </', color: 'text-slate-400' },
      { text: 'div', color: 'text-red-300' },
      { text: '>', color: 'text-slate-400' },
    ]},
    { num: 11, content: [
      { text: '  );', color: 'text-slate-400' },
    ]},
    { num: 12, content: [
      { text: '}', color: 'text-slate-300' },
    ]},
  ]

  return (
    <MockupWindow
      title="dashboard.tsx Cursor"
      icon={<Command size={12} className="text-slate-500" />}
      className={cn('w-full', className)}
    >
      <div className="flex h-[340px] sm:h-[420px]">
        {/* Activity bar */}
        <div className="hidden sm:flex w-10 flex-col items-center gap-4 py-4 border-r border-white/[0.06] bg-[#13131c] flex-shrink-0">
          <div className="h-5 w-5 rounded text-slate-500"><FileCode size={18} /></div>
          <div className="h-5 w-5 rounded text-slate-500"><Search size={18} /></div>
          <div className="h-5 w-5 rounded text-violet-400"><Sparkles size={18} /></div>
          <div className="h-5 w-5 rounded text-slate-500"><GitBranch size={18} /></div>
          <div className="h-5 w-5 rounded text-slate-500"><Bug size={18} /></div>
          <div className="mt-auto h-5 w-5 rounded text-slate-500"><Settings size={18} /></div>
        </div>

        {/* File explorer */}
        <div className="hidden md:flex w-36 flex-col border-r border-white/[0.06] bg-[#13131c]/60 flex-shrink-0">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Explorer
            </p>
          </div>
          <div className="p-2 space-y-0.5">
            {files.map((file, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] ${
                  file.active
                    ? 'bg-white/[0.08] text-slate-200'
                    : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
                }`}
                style={{ paddingLeft: `${12 + file.indent * 14}px` }}
              >
                {file.type === 'folder' ? (
                  <FolderOpen size={12} className={file.open ? 'text-yellow-500/80' : 'text-slate-600'} />
                ) : (
                  <FileCode size={12} className={
                    file.type === 'ts' ? 'text-blue-400' : 'text-green-400'
                  } />
                )}
                <span>{file.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0f0f16]">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-2 border-b border-white/[0.06] bg-[#13131c]">
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-md bg-[#0f0f16] border-t border-violet-500/50 text-[12px] text-slate-200">
              <FileCode size={12} className="text-blue-400" />
              <span>dashboard.tsx</span>
            </div>
          </div>

          {/* Code */}
          <div className="flex-1 p-4 font-mono text-[11px] leading-5 overflow-x-auto">
            <div className="flex min-w-0">
              <div className="text-slate-700 select-none pr-4 text-right text-[10px] pt-0.5 flex-shrink-0">
                {codeLines.map((line) => (
                  <div key={line.num} className="h-5">{line.num}</div>
                ))}
              </div>
              <div className="text-slate-300 whitespace-nowrap">
                {codeLines.map((line, i) => (
                  <div key={i} className="h-5">
                    {line.content.length === 0 ? (
                      <span>&nbsp;</span>
                    ) : (
                      line.content.map((part, j) => (
                        <span key={j} className={part.color}>
                          {part.text}
                        </span>
                      ))
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ai composer */}
          <div className="mx-5 mb-4 rounded-xl border border-violet-500/20 bg-gradient-to-b from-violet-500/[0.08] to-[#15151e] p-4 shadow-lg shadow-violet-900/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <Sparkles size={10} className="text-white" />
                </div>
                <span className="text-xs font-medium text-violet-200">Cursor agent</span>
                <span className="text-xs text-slate-500">is working</span>
              </div>
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse delay-75" />
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse delay-150" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
                <div className="h-full w-2/3 bg-gradient-to-r from-violet-500/60 to-fuchsia-500/40 animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="h-2 w-3/4 rounded-full bg-slate-800/60" />
                <div className="h-2 w-1/4 rounded-full bg-slate-800/40" />
              </div>
            </div>
          </div>

          {/* Status bar ad */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06] bg-gradient-to-r from-violet-600/15 via-violet-500/10 to-transparent">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-violet-200 bg-violet-500/25 px-1.5 py-0.5 rounded">
                  Ad
                </span>
                <div className="h-5 w-5 rounded bg-white/[0.08] flex items-center justify-center">
                  <span className="text-[10px]">🚀</span>
                </div>
              </div>
              <span className="text-xs text-slate-200 truncate">
                Ship on Railway →
              </span>
            </div>
          </div>
        </div>
      </div>
    </MockupWindow>
  )
}
