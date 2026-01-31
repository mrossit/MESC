import { useEffect } from 'react';

/**
 * Hook to warn user before leaving the page if there are unsaved changes
 * Uses the beforeunload event to show a browser confirmation dialog
 */
export function usePageLeaveWarning(shouldWarn: boolean) {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (shouldWarn) {
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [shouldWarn]);
}

export default usePageLeaveWarning;
