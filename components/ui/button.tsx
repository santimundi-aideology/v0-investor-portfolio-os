import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 outline-none touch-target",
  {
    variants: {
      variant: {
        default:
          'bg-green-500 hover:bg-green-600 text-white shadow-sm focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2',
        destructive:
          'bg-red-500 text-white shadow-sm hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-500/50',
        outline:
          'border border-gray-200 bg-white text-gray-900 shadow-sm hover:bg-gray-50 hover:border-gray-300',
        secondary:
          'bg-gray-900 text-white shadow-sm hover:bg-gray-800',
        ghost:
          'hover:bg-gray-100 text-gray-700 hover:text-gray-900',
        link:
          'text-green-600 underline-offset-4 hover:underline hover:text-green-700',
        accent:
          'bg-gray-100 hover:bg-gray-200 text-gray-900',
        success:
          'bg-green-500 text-white shadow-sm hover:bg-green-600',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-6 text-base',
        icon: 'size-10',
        'icon-sm': 'size-9',
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
