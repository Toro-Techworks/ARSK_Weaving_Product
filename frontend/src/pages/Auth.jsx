import React, { useState } from 'react';
import { useNavigate, Navigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User } from 'lucide-react';
import InputField from '../components/InputField';

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const isRegister = location.pathname === '/signup' || location.pathname === '/register';

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  const { login, user, setAuth } = useAuth();

  if (user) return <Navigate to="/" replace />;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success('Logged in successfully');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Login failed';
      toast.error(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      toast.error('Passwords do not match');
      return;
    }
    setRegisterLoading(true);
    try {
      const { data } = await api.post('/register', {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setAuth(data.token, data.user);
      toast.success('Account created successfully');
      navigate('/');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.email?.[0] ||
        'Registration failed';
      toast.error(msg);
    } finally {
      setRegisterLoading(false);
    }
  };

  const showRegister = () => navigate('/signup');
  const showLogin = () => navigate('/login');

  return (
    <div className="auth-page">
      <div className={`auth-wrapper ${isRegister ? 'panel-active' : ''}`} id="authWrapper">
        {/* Register form – left in DOM order, slides into view when panel-active */}
        <div className="auth-form-box register-form-box">
          <form onSubmit={handleRegisterSubmit} className="auth-form">
            <h1>Create Account</h1>
            <p className="form-subtitle">Start managing your production smarter</p>
            <InputField
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              icon={User}
            />
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
            <InputField
              label="Confirm Password"
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              placeholder="••••••••"
              required
              icon={Lock}
            />
            <button type="submit" disabled={registerLoading}>
              {registerLoading ? 'Creating account...' : 'Sign Up'}
            </button>
            <div className="mobile-switch">
              <p>Already have an account?</p>
              <button type="button" onClick={showLogin}>Sign In</button>
            </div>
          </form>
        </div>

        {/* Login form */}
        <div className="auth-form-box login-form-box">
          <form onSubmit={handleLoginSubmit} className="auth-form">
            <h1>Welcome to Toro Production</h1>
            <p className="form-subtitle">Login to monitor shifts, output and efficiency</p>
            <InputField
              label="Email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="you@example.com"
              required
              icon={Mail}
            />
            <InputField
              label="Password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
              required
              icon={Lock}
            />
            <div className="flex justify-end">
              <Link to="#">Forgot your password?</Link>
            </div>
            <button type="submit" disabled={loginLoading}>
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>
            <div className="mobile-switch">
              <p>Don&apos;t have an account?</p>
              <button type="button" onClick={showRegister}>Sign Up</button>
            </div>
          </form>
        </div>

        {/* Sliding panel overlay */}
        <div className="slide-panel-wrapper">
          <div className="slide-panel">
            <div className="panel-content panel-content-left">
              <h2>Welcome Back!</h2>
              <p>Stay connected by logging in with your credentials and continue your experience.</p>
              <button type="button" className="transparent-btn" onClick={showLogin}>
                Sign In
              </button>
            </div>
            <div className="panel-content panel-content-right">
              <h2>Hey There!</h2>
              <p>Begin your amazing journey by creating an account with us today.</p>
              <button type="button" className="transparent-btn" onClick={showRegister}>
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
