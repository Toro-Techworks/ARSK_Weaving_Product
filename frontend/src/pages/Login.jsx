import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandPanel from '../components/BrandPanel';
import InputField from '../components/InputField';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Logged in successfully');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <BrandPanel />
      <div className="w-full lg:w-3/5 min-h-screen bg-[#F3F4F6] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Toro Production</h1>
          <p className="mt-2 text-gray-600">Login to monitor shifts, output and efficiency</p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <InputField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              icon={Mail}
            />
            <InputField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              icon={Lock}
            />
            <div className="flex justify-end">
              <Link to="#" className="text-sm text-[#312E81] hover:text-[#1E1B4B] font-medium">
                Forgot your password?
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#312E81] px-4 py-3 text-white font-medium shadow-md hover:bg-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#312E81] focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
          <p className="mt-8 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-[#312E81] hover:text-[#1E1B4B]">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
