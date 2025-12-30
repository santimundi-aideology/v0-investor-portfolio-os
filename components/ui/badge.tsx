import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3.5 gap-1.5 [&>svg]:pointer-events-none transition-all duration-200 overflow-hidden shadow-sm',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90 [a&]:hover:scale-105',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground border border-border [a&]:hover:bg-muted [a&]:hover:scale-105',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90 [a&]:hover:scale-105',
        outline:
          'text-foreground border border-border bg-white [a&]:hover:bg-accent/10 [a&]:hover:scale-105',
        accent:
          'border-transparent bg-accent text-accent-foreground [a&]:hover:bg-accent-hover [a&]:hover:scale-105',
        success:
          'border-transparent bg-success text-success-foreground [a&]:hover:bg-success/90 [a&]:hover:scale-105',
        info:
          'border-transparent bg-info text-info-foreground [a&]:hover:bg-info/90 [a&]:hover:scale-105',
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
