import { AlertTriangle } from 'lucide-react';

export default function ErrorState({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      <AlertTriangle className="h-4 w-4 shrink-0" /> {message}
    </div>
  );
}
