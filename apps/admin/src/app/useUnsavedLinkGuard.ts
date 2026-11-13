import { useEffect } from 'react';

export function useUnsavedLinkGuard(dirty: boolean, onBlocked: (path: string) => void) {
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const interceptLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!target || target.target || target.hasAttribute('download')) return;
      const destination = new URL(target.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      event.preventDefault();
      event.stopPropagation();
      onBlocked(`${destination.pathname}${destination.search}${destination.hash}`);
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', interceptLink, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', interceptLink, true);
    };
  }, [dirty, onBlocked]);
}
