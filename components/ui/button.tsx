import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-semibold transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 outline-none touch-target",
  {
    variants: {
      variant: {
        default: 
          'bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-sm hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-destructive/50',
        outline:
          'border-2 border-primary bg-transparent text-primary shadow-sm hover:bg-primary hover:text-primary-foreground hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring',
        secondary:
          'bg-secondary text-secondary-foreground border-2 border-border shadow-sm hover:bg-muted hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring',
        ghost:
          'hover:bg-accent/10 hover:text-accent-foreground transition-colors duration-200',
        link: 
          'text-primary underline-offset-4 hover:underline hover:text-primary-hover',
        accent:
          'bg-gradient-to-br from-accent to-accent-hover text-accent-foreground shadow-sm hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-accent',
        success:
          'bg-success text-success-foreground shadow-sm hover:bg-success/90 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-success/50',
      },
      size: {
        default: 'h-11 px-8 py-3.5',
        sm: 'h-9 rounded-lg px-4 py-2 text-sm',
        lg: 'h-12 rounded-xl px-10 py-4 text-lg',
        icon: 'size-11',
        'icon-sm': 'size-9',
        'icon-lg': 'size-12',
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
