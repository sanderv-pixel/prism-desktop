'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile'

interface TurnstileWidgetProps {
  siteKey: string
  action: string
  onSuccess?: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  onLoad?: () => void
  className?: string
}

export const TurnstileWidget = forwardRef<TurnstileInstance | undefined, TurnstileWidgetProps>(
  function TurnstileWidget(
    { siteKey, action, onSuccess, onError, onExpire, onLoad, className },
    ref
  ) {
    const innerRef = useRef<TurnstileInstance>(null)
    const [mounted, setMounted] = useState(false)

    useImperativeHandle(ref, () => innerRef.current ?? undefined)

    useEffect(() => {
      setMounted(true)
    }, [])

    if (!mounted) {
      return <div className={`min-h-[65px] ${className ?? ''}`} aria-hidden="true" />
    }

    return (
      <Turnstile
        ref={innerRef}
        siteKey={siteKey}
        options={{ action }}
        onWidgetLoad={onLoad}
        onSuccess={onSuccess}
        onError={onError}
        onExpire={onExpire}
        scriptOptions={{
          onError: () => onError?.(),
        }}
        className={className}
      />
    )
  }
)
