import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { dataBus } from '../services/dataBus';
import { friendlyError } from '../utils/errors';

const EMPTY_LIST = [];

// Loads data from the API and keeps it fresh WITHOUT a page refresh:
//   * reloads right after any create / update / delete made in this browser ("mutated" event)
//   * reloads when you come back to the tab, and every `pollMs` milliseconds (so changes made by
//     other users - e.g. a manager approving a request - show up by themselves)
// Returns { data, loading, error, reload } - the same shape the pages already use.
export default function useApi(path, { enabled = true, initial = EMPTY_LIST, pollMs = 20000 } = {}) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const latest = useRef(0); // ignores answers that arrive late (out of order)

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const ticket = ++latest.current;
      if (!silent) setLoading(true);
      try {
        const result = await api.get(path);
        if (ticket !== latest.current) return;
        setData(result);
        setError('');
      } catch (err) {
        if (ticket !== latest.current) return;
        setError(friendlyError(err));
      } finally {
        if (ticket === latest.current) setLoading(false);
      }
    },
    [path]
  );

  useEffect(() => {
    if (!enabled) {
      setData(initial);
      setLoading(false);
      return undefined;
    }
    load();
    const refresh = () => { if (document.visibilityState === 'visible') load({ silent: true }); };
    dataBus.addEventListener('mutated', refresh);
    window.addEventListener('focus', refresh);
    const timer = setInterval(refresh, pollMs);
    return () => {
      latest.current += 1; // cancel anything still in flight
      dataBus.removeEventListener('mutated', refresh);
      window.removeEventListener('focus', refresh);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, enabled, pollMs]);

  return { data, loading, error, reload: () => load({ silent: true }) };
}
