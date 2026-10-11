'use client'

import { useEffect, useRef, useState, useId } from 'react'
import { scrambleController } from '@/lib/scramble-controller'

// NOTE: Change this import to 'framer' when copying this component into Framer.com
import { addPropertyControls, ControlType } from '@/lib/framer-mock'

export function ScrambleText({ text = 'Scramble Text', className }: { text?: string, className?: string }) {
  const [display, setDisplay] = useState(text)
  const ref = useRef<HTMLSpanElement>(null)
  const id = useId()
  const hasTriggered = useRef(false)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasTriggered.current) {
        hasTriggered.current = true
        scrambleController.subscribe(id, text, setDisplay, 800)
      }
    }, { threshold: 0.1 })
    
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [id, text])

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  )
}

addPropertyControls(ScrambleText, {
  text: { type: ControlType.String, title: 'Text', defaultValue: 'Scramble Text' },
})
