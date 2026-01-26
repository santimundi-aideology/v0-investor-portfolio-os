import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3.5 gap-1.5 [&>svg]:pointer-events-none transition-colors overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'bg-green-500 text-white',
        secondary:
          'bg-gray-100 text-gray-700 border border-gray-200',
        destructive:
          'bg-red-500 text-white',
        outline:
          'text-gray-700 border border-gray-200 bg-white hover:bg-gray-50',
        accent:
          'bg-gray-100 text-gray-900',
        success:
          'bg-green-100 text-green-700',
        info:
          'bg-blue-100 text-blue-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
