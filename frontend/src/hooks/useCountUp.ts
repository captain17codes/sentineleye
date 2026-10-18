import { useState, useEffect } from 'react';

export function useCountUp(target: number, duration = 1200, start = 0): number {
  const [count, setCount] = useState(start);

  useEffect(() => {
    let startTime: number | null = null;
    let animId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + (target - start) * ease));

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [target, duration, start]);

  return count;
}
