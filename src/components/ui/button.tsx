import type { ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva('button', {
  variants: {
    variant: {
      default: 'button-primary',
      secondary: 'button-secondary',
      ghost: 'button-ghost',
      outline: 'button-outline',
      destructive: 'button-danger',
    },
    size: { default: '', sm: 'button-sm', icon: 'button-icon' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }
export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
