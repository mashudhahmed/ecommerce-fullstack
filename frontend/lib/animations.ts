// lib/animations.ts
// CSS Animation Helpers (No Framer Motion dependency)

export const fadeInUp = {
  className: 'animate-fade-in-up',
};

export const fadeIn = {
  className: 'animate-fade-in',
};

export const scaleIn = {
  className: 'animate-scale-in',
};

export const slideIn = {
  className: 'animate-slide-in',
};

export const staggerContainer = {
  className: 'animate-stagger',
};

export const staggerContainerFast = {
  className: 'animate-stagger-fast',
};

// Helper to apply animation classes with delay
export const getAnimationClass = (
  animation: { className: string },
  delay?: number
): string => {
  if (!delay) return animation.className;
  return `${animation.className} animate-delay-${delay}`;
};