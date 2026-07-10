// lib/accessibility.ts
import React, { ReactNode, useEffect, useRef, useState } from 'react';

// ✅ Screen reader only
export function SrOnly({ children }: { children: ReactNode }) {
  return React.createElement('span', { className: 'sr-only' }, children);
}

// ✅ ARIA live region for dynamic updates
export function AriaLive(props: {
  children: ReactNode;
  polite?: boolean;
  'aria-atomic'?: boolean;
}) {
  const { children, polite = true, 'aria-atomic': ariaAtomic = true } = props;

  return React.createElement(
    'div',
    {
      'aria-live': polite ? 'polite' : 'assertive',
      'aria-atomic': ariaAtomic,
      className: 'sr-only',
    },
    children
  );
}

// ✅ Focus trap for modals
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Focus the first element when trap activates
    setTimeout(() => {
      firstElement?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, isActive]);
}

// ✅ Keyboard navigation helper
export function handleKeyboardNavigation(
  e: React.KeyboardEvent,
  onActivate: () => void,
  onDismiss?: () => void
) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onActivate();
  }
  if (e.key === 'Escape' && onDismiss) {
    onDismiss();
  }
}

// ✅ Reduced motion preference
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window is defined (client-side only)
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// ✅ Focus trap for dialogs with a ref
export function useDialogFocusTrap<T extends HTMLElement>(
  isOpen: boolean,
  onClose?: () => void
) {
  const dialogRef = useRef<T>(null);

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const dialog = dialogRef.current;
    const focusableElements = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus the first element
    setTimeout(() => {
      firstElement?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape key
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
        return;
      }

      // Handle Tab key
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Store previously focused element to restore
    const previousFocus = document.activeElement as HTMLElement;

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus
      setTimeout(() => {
        previousFocus?.focus();
      }, 50);
    };
  }, [isOpen, onClose]);

  return dialogRef;
}

// ✅ Keyboard navigation for list items
export function useKeyboardNavigation<T>(
  items: T[],
  onSelect: (item: T, index: number) => void,
  options?: {
    onEscape?: () => void;
  }
) {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + items.length) % items.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          onSelect(items[focusedIndex], focusedIndex);
        }
        break;
      case 'Escape':
        e.preventDefault();
        options?.onEscape?.();
        break;
    }
  };

  return {
    focusedIndex,
    handleKeyDown,
    resetFocus: () => setFocusedIndex(-1),
  };
}

// ✅ Screen reader announcement
export function announceMessage(message: string, polite: boolean = true) {
  if (typeof window === 'undefined') return;
  
  const announcer = document.getElementById('announcer');
  if (announcer) {
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = message;
    }, 50);
  } else {
    // Create announcer if it doesn't exist
    const div = document.createElement('div');
    div.id = 'announcer';
    div.setAttribute('aria-live', polite ? 'polite' : 'assertive');
    div.setAttribute('aria-atomic', 'true');
    div.className = 'sr-only';
    document.body.appendChild(div);
    setTimeout(() => {
      div.textContent = message;
    }, 50);
  }
}

// ✅ Use in components:
// announceMessage('Product added to cart');