import { useEffect } from 'react';

export function useTheme() {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  return { theme: 'dark' as const };
}
