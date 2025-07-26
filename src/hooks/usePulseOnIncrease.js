import { useState, useEffect, useRef } from 'preact/hooks';

export function usePulseOnIncrease(value) {
  const [isPulsing, setIsPulsing] = useState(false);
  const prevValueRef = useRef(value);
  const timerRef = useRef(null);

  useEffect(() => {
    if (value > prevValueRef.current) {
      // Clear any existing timer to ensure the animation can be re-triggered
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Remove the class to allow the animation to restart
      setIsPulsing(false);

      // We use requestAnimationFrame to ensure the class is removed and the DOM is updated
      // before we add it back, which forces the animation to restart.
      requestAnimationFrame(() => {
        setIsPulsing(true);
        timerRef.current = setTimeout(() => {
          setIsPulsing(false);
          timerRef.current = null;
        }, 1000); // Must match the CSS animation duration
      });
    }
    prevValueRef.current = value;

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value]);

  return isPulsing ? 'pulse-green' : '';
} 