import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, KeyRound, User, AlertCircle } from 'lucide-react';
import { authService } from '../services/api';

interface LoginProps {
  onLoginSuccess: (user: { name: string; role: string; email: string }) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('username', email); // FastAPI OAuth2 expects 'username'
      formData.append('password', password);

      const data = await authService.login(formData);
      
      // Save details to localStorage
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user_role', data.role);
      localStorage.setItem('user_name', data.name);
      localStorage.setItem('user_email', data.email);

      onLoginSuccess({
        name: data.name,
        role: data.role,
        email: data.email
      });

      navigate('/dashboard');
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Unable to connect to the screening server. Please verify that FastAPI is running on port 8000.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Visual background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 z-10 glass-panel-heavy">
        {/* Shield Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/5 animate-pulse">
            <Shield className="w-9 h-9 text-indigo-500 fill-indigo-500/10" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-wide text-center">SSB SCREENING HUB</h2>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">Identity & Document Forensics Portal</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Officer Email</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-5 h-5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@ssb.gov.in"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Security Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3 w-5 h-5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-indigo-600/35 hover:shadow-indigo-500/40 focus:outline-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'ACCESS COMMAND CENTER'}
          </button>
        </form>

        {/* Demo Credentials Box */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mb-3">SIH Evaluation Quick Access</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => fillCredentials('admin@ssb.gov.in', 'admin123')}
              className="py-1.5 px-2 bg-slate-950 border border-slate-800 rounded text-[10px] font-bold text-slate-400 hover:text-white hover:border-indigo-500 transition-colors cursor-pointer"
            >
              ADMIN
            </button>
            <button
              onClick={() => fillCredentials('officer@ssb.gov.in', 'officer123')}
              className="py-1.5 px-2 bg-slate-950 border border-slate-800 rounded text-[10px] font-bold text-slate-400 hover:text-white hover:border-indigo-500 transition-colors cursor-pointer"
            >
              OFFICER
            </button>
            <button
              onClick={() => fillCredentials('analyst@ssb.gov.in', 'analyst123')}
              className="py-1.5 px-2 bg-slate-950 border border-slate-800 rounded text-[10px] font-bold text-slate-400 hover:text-white hover:border-indigo-500 transition-colors cursor-pointer"
            >
              ANALYST
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
