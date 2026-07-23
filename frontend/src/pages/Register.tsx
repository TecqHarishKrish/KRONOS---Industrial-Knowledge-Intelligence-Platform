import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Cpu, AlertCircle, Loader, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Technician');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post('/auth/register', {
        username,
        password,
        role,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Registration failed. Username may be taken.'
      );
    } finally {
      setLoading(false);
    }
  };

  const roles = ['Admin', 'Engineer', 'Technician', 'Manager'];

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="bg-blue-600 p-3 rounded-xl text-white">
            <Cpu size={28} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Create Account
          </h2>
          <p className="text-sm text-zinc-400">
            Join the KRONOS operation system
          </p>
        </div>

        {error && (
          <div className="mb-6 flex gap-3 rounded-lg border border-red-900/30 bg-red-950/20 p-4 text-sm text-red-400">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 flex gap-3 rounded-lg border border-emerald-900/30 bg-emerald-950/20 p-4 text-sm text-emerald-400">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>Registration successful! Redirecting to login...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              placeholder="operator"
              disabled={loading || success}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              placeholder="••••••••"
              disabled={loading || success}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Access Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              disabled={loading || success}
            >
              {roles.map((r) => (
                <option key={r} value={r} className="bg-zinc-900">
                  {r}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="flex items-center justify-center w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader size={18} className="animate-spin" /> : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:underline">
            Sign In instead
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
