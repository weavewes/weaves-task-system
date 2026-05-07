import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#1c1c1c] text-[#fcfbf8]',
        secondary: 'border-transparent bg-[#eceae4] text-[#1c1c1c]',
        outline: 'border-[#eceae4] text-[#1c1c1c]',
        pendiente: 'border-transparent bg-[#5f5f5d] text-white',
        progreso: 'border-transparent bg-[#3b82f6] text-white',
        esperando_humano: 'border-transparent bg-[#f59e0b] text-white',
        esperando_cliente: 'border-transparent bg-[#8b5cf6] text-white',
        bloqueada: 'border-transparent bg-[#ef4444] text-white',
        revision: 'border-transparent bg-[#06b6d4] text-white',
        completada: 'border-transparent bg-[#22c55e] text-white',
        error: 'border-transparent bg-[#dc2626] text-white',
        cancelada: 'border-transparent bg-[#6b7280] text-white',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
