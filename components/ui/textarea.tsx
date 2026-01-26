import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'placeholder:text-gray-400 selection:bg-green-100 selection:text-green-900',
        'border-gray-200 min-h-[80px] w-full min-w-0 rounded-lg border bg-white px-4 py-3 text-base text-gray-900 shadow-sm',
        'transition-colors outline-none resize-y',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
        'focus:border-green-500 focus:ring-2 focus:ring-green-500/20',
        'aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-500/20',
        'hover:border-gray-300',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }

