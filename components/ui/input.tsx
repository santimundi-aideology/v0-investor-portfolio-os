import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground',
        'border-input h-11 w-full min-w-0 rounded-xl border-2 bg-white px-4 py-3.5 text-base shadow-sm',
        'transition-all duration-200 outline-none',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
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

export { Input }
