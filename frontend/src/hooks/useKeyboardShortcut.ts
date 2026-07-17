import { useEffect } from 'react';

type ShortcutMap = {
  [key: string]: (e: KeyboardEvent) => void;
};

export const useKeyboardShortcut = (shortcuts: ShortcutMap, active: boolean = true) => {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true');

      // If typing in an input, only allow Escape to blur the input
      if (isInput) {
        if (event.key === 'Escape') {
          (activeEl as HTMLElement).blur();
        }
        return;
      }

      // Check shortcuts
      const key = event.key.toLowerCase();
      if (shortcuts[key]) {
        event.preventDefault();
        shortcuts[key](event);
      } else if (event.key === 'Escape' && shortcuts['escape']) {
        event.preventDefault();
        shortcuts['escape'](event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, active]);
};
