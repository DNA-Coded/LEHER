import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-sky-400 via-cyan-300 to-sky-400 text-black font-semibold hover:brightness-110 shadow-[0_0_20px_rgba(56,189,248,0.35)] active:scale-[0.99] rounded-full",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full",
        outline:
          "border border-white/20 bg-black/40 hover:bg-white/10 hover:text-white rounded-full",
        secondary:
          "bg-gradient-to-b from-zinc-800 to-zinc-950 text-zinc-300 border border-zinc-700 hover:border-sky-400 hover:text-sky-200 shadow-[inset_0_1px_0_rgba(56,189,248,0.45)] hover:shadow-[0_0_20px_rgba(56,189,248,0.3)] rounded-full",
        ghost: "hover:bg-white/10 hover:text-white rounded-full",
        link: "text-cyan-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
