"use client";

import React from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, useSyncExternalStore } from "react";

interface ScrollAnimationProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  stagger?: boolean;
}

const subscribeToMount = () => () => {};
const getClientMounted = () => true;
const getServerMounted = () => false;

export function ScrollAnimation({
  children,
  className = "",
  delay = 0,
  direction = "up",
  stagger = false,
}: ScrollAnimationProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    margin: "-50px", // Optimization: trigger animation earlier for better perceived performance
  });
  const isMounted = useSyncExternalStore(
    subscribeToMount,
    getClientMounted,
    getServerMounted
  );
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = isMounted && !shouldReduceMotion;
  const staticState = { opacity: 1, x: 0, y: 0, filter: "none" };

  const getInitialPosition = () => {
    switch (direction) {
      case "up":
        return { y: 30, x: 0 };
      case "down":
        return { y: -30, x: 0 };
      case "left":
        return { x: 30, y: 0 };
      case "right":
        return { x: -30, y: 0 };
      default:
        return { y: 30, x: 0 };
    }
  };

  const containerVariants = {
    hidden: shouldAnimate ? { opacity: 0 } : staticState,
    visible: {
      ...staticState,
      transition: {
        staggerChildren: shouldAnimate ? 0.1 : 0,
        delayChildren: shouldAnimate ? delay : 0,
      },
    },
  };

  const itemVariants = {
    hidden: shouldAnimate
      ? {
          opacity: 0,
          ...getInitialPosition(),
          filter: "blur(4px)",
        }
      : staticState,
    visible: {
      ...staticState,
      transition: {
        duration: shouldAnimate ? 0.6 : 0,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  if (stagger) {
    return (
      <motion.div
        ref={ref}
        variants={containerVariants}
        initial="hidden"
        animate={shouldAnimate && isInView ? "visible" : "hidden"}
        className={className}
      >
        {React.Children.map(children, (child) => (
          <motion.div variants={itemVariants}>{child}</motion.div>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={ref}
      initial={shouldAnimate ? {
        opacity: 0,
        ...getInitialPosition(),
        filter: "blur(4px)",
      } : staticState}
      animate={
        shouldAnimate && isInView
          ? staticState
          : shouldAnimate
            ? {
                opacity: 0,
                ...getInitialPosition(),
                filter: "blur(4px)",
              }
            : staticState
      }
      transition={{
        duration: shouldAnimate ? 0.6 : 0,
        delay: shouldAnimate ? delay : 0,
        ease: [0.22, 1, 0.36, 1] as const,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
