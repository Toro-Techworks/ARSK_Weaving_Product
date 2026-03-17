import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PANEL_BG = '#3c3a8f';

export default function Auth() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Logged in successfully');
      navigate('/');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.username?.[0] ||
        'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[45%_55%] lg:grid-cols-[40%_60%]">
      {/* Left: Branding panel — hidden on mobile, visible from md up */}
      <div
        className="hidden md:flex order-2 md:order-1 min-h-screen items-center justify-center p-6 md:p-10 transition-all duration-300"
        style={{ backgroundColor: PANEL_BG }}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="text-center text-white max-w-md"
        >
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Hey There!
          </h2>
          <p className="mt-2 md:mt-3 text-white/90 text-sm md:text-base">
            Begin your journey with ARSK Weaving.
          </p>
        </motion.div>
      </div>

      {/* Right: Login panel — full screen on mobile, content on background */}
      <div className="order-1 md:order-2 min-h-screen flex items-center justify-center p-6 sm:p-8 md:p-10 bg-gray-100/90">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-[480px] sm:max-w-[520px] md:max-w-[560px]"
        >
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
            ARSK Weaving
          </h1>
          <p className="mt-1.5 text-sm text-gray-600">
            Sign in to continue to your dashboard
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <User className="w-5 h-5" />
                </span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full rounded-lg border-0 bg-white/90 pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-brand/30 focus:outline-none transition-all duration-200 shadow-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-lg border-0 bg-white/90 px-4 py-3 pr-11 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-brand/30 focus:outline-none transition-all duration-200 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none rounded p-0.5 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <div className="mt-1.5 flex justify-end">
                <Link
                  to="#"
                  className="text-sm text-brand hover:text-brand-dark font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mt-6"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
