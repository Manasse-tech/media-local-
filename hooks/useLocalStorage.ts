'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value, initialized to initialValue for SSR hydration stability
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const currentValueRef = useRef<T>(initialValue);

  useEffect(() => {
    currentValueRef.current = storedValue;
  }, [storedValue]);

  // Load from localStorage on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        const parsed = JSON.parse(item);
        setStoredValue(parsed);
        currentValueRef.current = parsed;
      }
    } catch (error) {
      console.warn('Error reading localStorage key', key, error);
    }
  }, [key]);

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(currentValueRef.current) : value;
      currentValueRef.current = valueToStore;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        // Defer dispatching custom event to microtask queue so it never fires synchronously during a React render cycle
        queueMicrotask(() => {
          window.dispatchEvent(new CustomEvent(`local-storage-${key}`, { detail: valueToStore }));
        });
      }
    } catch (error) {
      console.warn('Error setting localStorage key', key, error);
    }
  }, [key]);

  // Listen to cross-tab storage events and key-specific local events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          const newVal = e.newValue ? JSON.parse(e.newValue) : initialValue;
          currentValueRef.current = newVal;
          setStoredValue(newVal);
        } catch {}
      }
    };

    const handleCustomEvent = (e: Event) => {
      try {
        const customEvent = e as CustomEvent<T>;
        if (customEvent.detail !== undefined) {
          currentValueRef.current = customEvent.detail;
          setStoredValue(customEvent.detail);
        } else {
          const item = window.localStorage.getItem(key);
          if (item !== null) {
            const parsed = JSON.parse(item);
            currentValueRef.current = parsed;
            setStoredValue(parsed);
          }
        }
      } catch {}
    };

    const eventName = `local-storage-${key}`;
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(eventName, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(eventName, handleCustomEvent);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
}
