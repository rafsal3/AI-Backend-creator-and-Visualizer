import React, { useEffect, useRef } from 'react';

type EffectCallback = () => void;

export function useDebouncedEffect(
  effect: EffectCallback,
  deps: React.DependencyList,
  delay: number
) {
  const callback = useRef(effect);

  // Update the callback reference on every render
  useEffect(() => {
    callback.current = effect;
  }, [effect]);

  useEffect(() => {
    if (deps) {
      const handler = setTimeout(() => {
        callback.current();
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }
  // FIX: Added React import to resolve React.DependencyList type.
  }, [...deps, delay]);
}