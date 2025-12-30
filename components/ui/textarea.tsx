import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground',
        'border-input min-h-[80px] w-full min-w-0 rounded-xl border-2 bg-white px-4 py-3.5 text-base shadow-sm',
        'transition-all duration-200 outline-none resize-y',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'focus:border-primary focus:shadow-[0_0_0_3px_rgba(26,77,46,0.1)] focus:ring-0',
        'aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_3px_rgba(220,53,69,0.1)]',
        'hover:border-primary/50',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }

