import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  UserPlus, 
  Sliders, 
  Info, 
  Users,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';

const SettingsPage: React.FC = () => {
  const [faceVerifyThreshold, setFaceVerifyThreshold] = useState(97);
  const [facePossibleThreshold, setFacePossibleThreshold] = useState(80);
  const [checkpointName, setCheckpointName] = useState('SSB Checkpoint ICP Raniganj (Indo-Nepal)');
  const [checkpointId, setCheckpointId] = useState('ICP-RN-004');
  
  // User creation form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('OFFICER');
  
  const [userRole, setUserRole] = useState('OFFICER');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('user_role') || 'OFFICER';
    setUserRole(role);
  }, []);

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    try {
      await api.post('/api/auth/users', {
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole
      });
      setSuccessMsg(`Personnel registered: ${newName} (${newRole})`);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to register new personnel.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
          <Settings className="w-[26px] h-[26px] text-indigo-400" /> CONTROL PANEL SETTINGS
        </h2>
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Configure biometrics thresholds, risk engine coefficients, and manage accounts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Pipeline Thresholds */}
        <div className="lg:col-span-2 space-y-6">
          {/* Biometrics Thresholds */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-[18px] h-[18px] text-indigo-400" /> Biometrics Verification Coefficients
            </h4>

            {/* Slider 1: Verified */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-400">Cosine Similarity verified Threshold</span>
                <span className="text-emerald-400 font-black font-mono">{faceVerifyThreshold}%</span>
              </div>
              <input 
                type="range" 
                min="90" 
                max="100" 
                value={faceVerifyThreshold} 
                onChange={(e) => setFaceVerifyThreshold(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[10px] text-slate-500 leading-relaxed">Scores above this percentage will automatically be flagged as green VERIFIED traveler credentials.</p>
            </div>

            {/* Slider 2: Possible Match */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-400">Cosine Similarity Possible Match Threshold</span>
                <span className="text-amber-400 font-black font-mono">{facePossibleThreshold}%</span>
              </div>
              <input 
                type="range" 
                min="70" 
                max="89" 
                value={facePossibleThreshold} 
                onChange={(e) => setFacePossibleThreshold(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[10px] text-slate-500 leading-relaxed">Scores between {facePossibleThreshold}% and {faceVerifyThreshold}% trigger POSSIBLE MATCH review alerts.</p>
            </div>
          </div>

          {/* Checkpoint parameters */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Info className="w-[18px] h-[18px] text-indigo-400" /> Checkpoint Metadata Nodes
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Checkpoint node Name</label>
                <input 
                  type="text" 
                  value={checkpointName} 
                  onChange={(e) => setCheckpointName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Checkpoint Node Code ID</label>
                <input 
                  type="text" 
                  value={checkpointId} 
                  onChange={(e) => setCheckpointId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-white font-semibold font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: User Account Management (ADMIN only) */}
        <div className="lg:col-span-1">
          {userRole === 'ADMIN' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-[18px] h-[18px] text-indigo-400" /> Register Border Personnel
              </h4>

              {successMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-[18px] h-[18px] shrink-0" />
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleRegisterUser} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Inspector R. K. Vashishth"
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SSB Email Address</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. inspector@ssb.gov.in"
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Command Role Authority</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="OFFICER">OFFICER (Create checks)</option>
                    <option value="ANALYST">ANALYST (Read logs & analytics)</option>
                    <option value="ADMIN">ADMIN (Full node controller)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-bold uppercase tracking-wider cursor-pointer mt-2"
                >
                  {loading ? 'Registering...' : 'Add Personnel'}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4">
              <Users className="w-10 h-10 text-slate-700 mx-auto" />
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Access Restrained</h4>
                <p className="text-[10px] text-slate-500 leading-normal mt-2">
                  User accounts registry management is exclusive to administrator roles. Contact your regional SSB coordinator node for credentials extensions.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
