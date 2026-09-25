import React, { useState } from 'react';
import { Bell, ShieldCheck, Activity } from 'lucide-react';

interface TopbarProps {
  userName?: string;
  userRole?: string;
}

const Topbar: React.FC<TopbarProps> = ({ userName = 'Officer', userRole = 'OFFICER' }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications] = useState([
    { id: 1, text: 'CRITICAL: Photo replacement anomaly at Checkpoint 3.', time: '5m ago', type: 'critical' },
    { id: 2, text: 'WARNING: Expired visa passport scanned.', time: '20m ago', type: 'warning' },
    { id: 3, text: 'INFO: Daily summary audit chain verified successfully.', time: '1h ago', type: 'info' }
  ]);

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 text-slate-300 z-10">
      {/* Left side: System Connection status */}
      <div className="flex items-center gap-3">
        <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
        <span className="text-xs font-semibold text-slate-400">Checkpoint Nodes:</span>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 flex items-center gap-1.5 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          SECURE ONLINE
        </span>
      </div>

      {/* Right side: Notifications & Account */}
      <div className="flex items-center gap-6">
        {/* Notifications Icon */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors relative cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500"></span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-950 border border-slate-800 rounded-lg shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-850 flex justify-between items-center">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Alert Center</span>
                <span className="text-[10px] text-slate-400">{notifications.length} Unread</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {notifications.map((notif) => (
                  <div key={notif.id} className="px-4 py-3 border-b border-slate-900 hover:bg-slate-900/40 transition-colors">
                    <p className={`text-xs font-medium ${
                      notif.type === 'critical' ? 'text-rose-400' : notif.type === 'warning' ? 'text-amber-400' : 'text-slate-300'
                    }`}>
                      {notif.text}
                    </p>
                    <span className="text-[10px] text-slate-500 block mt-1">{notif.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* System Identity Details */}
        <div className="flex items-center gap-2 text-right border-l border-slate-800 pl-6">
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5 justify-end">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              {userName}
            </div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{userRole} AUTHENTICATED</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
