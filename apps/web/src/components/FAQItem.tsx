'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/cn'

interface FAQItemProps {
  question: string
  answer: string
}

export function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-border">
      <button
        className="flex w-full items-center justify-between py-6 text-left group"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="text-base md:text-lg font-medium text-foreground pr-8 group-hover:text-primary transition">
          {question}
        </span>
        <div className="shrink-0 h-8 w-8 rounded-full border border-border bg-muted flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:border-slate-300 transition">
          {isOpen ? <Minus size={16} /> : <Plus size={16} />}
        </div>
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isOpen ? 'max-h-96 pb-6' : 'max-h-0'
        )}
      >
        <p className="text-muted-foreground leading-relaxed max-w-3xl">{answer}</p>
      </div>
    </div>
  )
}
