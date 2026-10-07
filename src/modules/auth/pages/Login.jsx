import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Eye, EyeOff, Package } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { friendlyError } from '../../../utils/errors';
import { isEmail, required } from '../../../utils/validators';
import Spinner from '../../../components/ui/Spinner';

export default function Login() {
  const { profile, loading, authError, login, clearAuthError } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => () => clearAuthError(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Already signed in -> go to the dashboard (or the page they originally wanted).
  if (!loading && profile) return <Navigate to={location.state?.from?.pathname || '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!required(email)) next.email = 'Email is required.';
    else if (!isEmail(email)) next.email = 'Enter a valid email address.';
    if (!required(password)) next.password = 'Password is required.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await login(email, password); // on success the context loads the role and we redirect above
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const message = formError || authError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md animate-pop">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm">
            <Package className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Intero Packtech</h1>
          <p className="text-sm text-slate-500">Inventory Management System</p>
        </div>

        <form onSubmit={submit} noValidate className="card space-y-5 p-6 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold">Sign in</h2>
            <p className="text-sm text-slate-500">Use the email and password given by your administrator.</p>
          </div>

          {message && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {message}
            </div>
          )}

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="username" className={`input ${errors.email ? 'input-error' : ''}`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" className={`input pr-10 ${errors.password ? 'input-error' : ''}`} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting && <Spinner size="sm" />} {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
