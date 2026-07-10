// types/framer-motion.d.ts
import { MotionProps } from 'framer-motion';

declare module 'framer-motion' {
  export interface MotionProps {
    key?: string;
    variants?: any;
    initial?: any;
    animate?: any;
    exit?: any;
    transition?: any;
    whileHover?: any;
    whileTap?: any;
    whileInView?: any;
    viewport?: any;
    style?: any;
    className?: string;
    children?: React.ReactNode;
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
  }
}