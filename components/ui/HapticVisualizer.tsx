'use client';

import React, { useEffect, useState } from 'react';

interface VisualRipple {
  id: number;
  x: number;
  y: number;
}

export function HapticVisualizer() {
  const [ripples, setRipples] = useState<VisualRipple[]>([]);

  // Trigger browser-level physical vibration (Vibration API)
  const triggerPhysicalVibration = (ms = 12) => {
    if (
      typeof window !== 'undefined' &&
      typeof window.navigator !== 'undefined' &&
      'vibrate' in window.navigator
    ) {
      try {
        window.navigator.vibrate(ms);
      } catch (err) {
        // Safe fallback if blocked or unsupported by security policies
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePointerDown = (e: PointerEvent) => {
      // Find out if the clicked element or any of its ancestors is an interactive element
      let target = e.target as HTMLElement | null;
      let isInteractive = false;

      while (target && target !== document.body) {
        const tagName = target.tagName ? target.tagName.toLowerCase() : '';
        const classStr = typeof target.className === 'string'
          ? target.className
          : (typeof target.getAttribute === 'function' ? target.getAttribute('class') || '' : '');
        
        if (
          tagName === 'button' ||
          tagName === 'a' ||
          tagName === 'select' ||
          tagName === 'input' ||
          classStr.includes('cursor-pointer') ||
          classStr.includes('group') ||
          classStr.includes('track-row') ||
          classStr.includes('tab-button') ||
          (typeof target.getAttribute === 'function' && target.getAttribute('role') === 'button') ||
          (typeof target.getAttribute === 'function' && target.getAttribute('data-haptic') === 'true')
        ) {
          isInteractive = true;
          break;
        }
        target = target.parentElement;
      }

      if (isInteractive) {
        // 1. Trigger haptic vibration (12ms for a subtle tap sensation)
        triggerPhysicalVibration(12);

        // 2. Add visual feedback ripple circle
        const newRipple: VisualRipple = {
          id: Date.now() + Math.random(),
          x: e.clientX,
          y: e.clientY,
        };

        setRipples((prev) => [...prev, newRipple]);

        // Clean up ripple after animation completes
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
        }, 500);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="absolute rounded-full border border-blue-400/40 bg-blue-500/10 animate-haptic-ping shadow-lg shadow-blue-500/20"
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: 'translate(-50%, -50%)',
            width: '24px',
            height: '24px',
          }}
        />
      ))}
    </div>
  );
}

export default HapticVisualizer;
