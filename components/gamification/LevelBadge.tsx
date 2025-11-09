"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGamification } from "@/components/providers";

interface LevelBadgeProps {
  size?: "sm" | "md" | "lg";
  showAnimation?: boolean;
  className?: string;
}

export function LevelBadge({ 
  size = "md", 
  showAnimation = true,
  className = "" 
}: LevelBadgeProps) {
  const { level, levelInfo, isConnected } = useGamification();

  // Size configurations
  const sizeConfig = {
    sm: {
      container: "w-8 h-8 text-xs",
      badge: "w-6 h-6 text-[10px]",
    },
    md: {
      container: "w-10 h-10 text-sm",
      badge: "w-8 h-8 text-xs",
    },
    lg: {
      container: "w-12 h-12 text-base",
      badge: "w-10 h-10 text-sm",
    },
  };

  const config = sizeConfig[size];

  // Animation variants
  const containerVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
      }
    },
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: "easeInOut",
      }
    },
  };

  const badgeVariants = {
    initial: { rotate: -180, scale: 0 },
    animate: { 
      rotate: 0, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay: 0.1,
      }
    },
    levelUp: {
      rotate: [0, 360, 0],
      scale: [1, 1.2, 1],
      transition: {
        duration: 0.8,
        ease: "easeInOut",
      }
    },
  };

  const textVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        delay: 0.2,
        duration: 0.3,
      }
    },
    levelUp: {
      scale: [1, 1.3, 1],
      transition: {
        duration: 0.4,
        ease: "easeInOut",
      }
    },
  };

  // Determine if we should animate (respect reduced motion)
  const shouldAnimate = showAnimation && 
    typeof window !== "undefined" && 
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className={`relative ${config.container} ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={level}
          variants={shouldAnimate ? containerVariants : {}}
          initial="initial"
          animate={isConnected ? "animate" : "initial"}
          whileHover={shouldAnimate ? "pulse" : undefined}
          className="relative flex items-center justify-center"
        >
          {/* Background circle */}
          <div 
            className={`
              absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary/80
              shadow-lg ${isConnected ? "animate-pulse" : ""}
            `}
            style={{
              boxShadow: isConnected 
                ? "0 0 20px rgba(var(--primary-rgb), 0.5)" 
                : undefined,
            }}
          />
          
          {/* Level badge */}
          <motion.div
            variants={shouldAnimate ? badgeVariants : {}}
            animate="animate"
            className={`
              ${config.badge} relative z-10 rounded-full bg-background 
              border-2 border-primary flex items-center justify-center
              font-bold text-primary shadow-md
            `}
          >
            <motion.span
              variants={shouldAnimate ? textVariants : {}}
              animate="animate"
              className="select-none"
            >
              {level}
            </motion.span>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Connection indicator */}
      <div 
        className={`
          absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background
          ${isConnected ? "bg-green-500" : "bg-gray-400"}
        `}
        aria-label={isConnected ? "Connected" : "Disconnected"}
      />
    </div>
  );
}