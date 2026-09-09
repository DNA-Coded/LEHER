"use client"

import * as React from "react"
import { type HTMLMotionProps, type Variants, motion } from "motion/react"

import { cn } from "@/lib/utils"

const curtainVariants: Variants = {
  visible: {
    clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      delay: 0.1,
      ease: [0.25, 1, 0.5, 1],
    },
  },
  hidden: {
    clipPath: "polygon(50% 0, 50% 0, 50% 100%, 50% 100%)",
    opacity: 0,
    y: 8,
    transition: {
      duration: 0.2,
      ease: [0.25, 1, 0.5, 1],
    },
  },
}

interface CardCurtainRevealContextValue {
  isMouseIn: boolean
}

const CardCurtainRevealContext = React.createContext<
  CardCurtainRevealContextValue | undefined
>(undefined)

export function useCardCurtainRevealContext() {
  const context = React.useContext(CardCurtainRevealContext)
  if (!context) {
    throw new Error(
      "useCardCurtainRevealContext must be used within a CardCurtainReveal Component"
    )
  }
  return context
}

const CardCurtainReveal = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => {
  const [isMouseIn, setIsMouseIn] = React.useState(false)
  const handleMouseEnter = React.useCallback(() => setIsMouseIn(true), [])
  const handleMouseLeave = React.useCallback(() => setIsMouseIn(false), [])

  return (
    <CardCurtainRevealContext.Provider value={{ isMouseIn }}>
      <div
        ref={ref}
        className={cn(
          "relative flex flex-col gap-2 overflow-hidden",
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {children}
      </div>
    </CardCurtainRevealContext.Provider>
  )
})
CardCurtainReveal.displayName = "CardCurtainReveal"

const CardCurtainRevealFooter = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ className, ...props }, ref) => {
  const { isMouseIn } = useCardCurtainRevealContext()

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={curtainVariants}
      animate={isMouseIn ? "visible" : "hidden"}
      {...props}
    />
  )
})
CardCurtainRevealFooter.displayName = "CardCurtainRevealFooter"

const CardCurtainRevealBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("flex-1 p-6", className)} {...props} />
})
CardCurtainRevealBody.displayName = "CardCurtainRevealBody"

export interface CardCurtainRevealTitleProps extends HTMLMotionProps<"h2"> {
  centerOffset?: number;
}

const CardCurtainRevealTitle = React.forwardRef<
  HTMLHeadingElement,
  CardCurtainRevealTitleProps
>(({ className, centerOffset = 48, ...props }, ref) => {
  const { isMouseIn } = useCardCurtainRevealContext()

  return (
    <motion.h2
      ref={ref}
      className={cn("will-change-transform", className)}
      animate={isMouseIn ? { y: 0 } : { y: centerOffset }}
      transition={{ 
        duration: 0.35, 
        ease: [0.25, 1, 0.5, 1] 
      }}
      {...props}
    />
  )
})
CardCurtainRevealTitle.displayName = "CardCurtainRevealTitle"

const CardCurtain = React.forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  ({ className, ...props }, ref) => {
    const { isMouseIn } = useCardCurtainRevealContext()

    return (
      <motion.div
        ref={ref}
        className={cn(
          "pointer-events-none absolute inset-0 size-full",
          className
        )}
        variants={curtainVariants}
        initial="hidden"
        animate={isMouseIn ? "visible" : "hidden"}
        {...props}
      />
    )
  }
)
CardCurtain.displayName = "CardCurtain"

export interface CardCurtainRevealDescriptionProps extends HTMLMotionProps<"div"> {
  alwaysVisible?: boolean;
}

const CardCurtainRevealDescription = React.forwardRef<
  HTMLDivElement,
  CardCurtainRevealDescriptionProps
>(({ className, alwaysVisible = false, ...props }, ref) => {
  const { isMouseIn } = useCardCurtainRevealContext()

  if (alwaysVisible) {
    return (
      <div
        ref={ref}
        className={cn("text-neutral-400 text-sm leading-relaxed", className)}
        {...(props as any)}
      />
    )
  }

  return (
    <motion.div
      ref={ref}
      className={cn("will-change-transform", className)}
      variants={curtainVariants}
      initial="hidden"
      animate={isMouseIn ? "visible" : "hidden"}
      {...props}
    />
  )
})
CardCurtainRevealDescription.displayName = "CardCurtainRevealDescription"

export {
  CardCurtainReveal,
  CardCurtainRevealBody,
  CardCurtainRevealFooter,
  CardCurtainRevealDescription,
  CardCurtainRevealTitle,
  CardCurtain,
}

export default CardCurtainReveal
