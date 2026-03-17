import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * When the user clicks the same (current) menu item in the sidebar, the Layout
 * dispatches 'app-refresh-page' with the pathname. This hook listens for that
 * event and calls refetch when the event pathname matches the current route.
 * Use in pages that load data and should reload when the user re-clicks the menu.
 * @param {() => void} refetch - Function to call to reload data (e.g. fetch, load).
 */
export function useRefreshOnSameMenuClick(refetch) {
  const pathname = useLocation().pathname;
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.pathname === pathname && typeof refetchRef.current === 'function') {
        refetchRef.current();
      }
    };
    window.addEventListener('app-refresh-page', handler);
    return () => window.removeEventListener('app-refresh-page', handler);
  }, [pathname]);
}
