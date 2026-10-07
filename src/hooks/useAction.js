import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { friendlyError } from '../utils/errors';

// Runs an async action with a loading flag + success/error toasts.
// Returns true when the action succeeded (so a modal can close itself).
export default function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const run = async (fn, successMessage) => {
    setBusy(true);
    try {
      await fn();
      if (successMessage) toast.success(successMessage);
      return true;
    } catch (err) {
      toast.error(friendlyError(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, run };
}
