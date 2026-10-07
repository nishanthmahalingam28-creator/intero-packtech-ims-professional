import { Loader2 } from 'lucide-react';

export default function Spinner({ size = 'md' }) {
  const s = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-9 w-9' }[size];
  return <Loader2 className={`${s} animate-spin text-teal-600`} />;
}
