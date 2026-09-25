import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  AlertTriangle, 
  BarChart3, 
  ShieldAlert, 
  Settings, 
  LogOut, 
  Shield 
} from 'lucide-react';
import { authService } from '../services/api';

interface SidebarProps {
  userRole?: string;
  userName?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ userRole = 'OFFICER', userName = 'Officer' }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'OFFICER', 'ANALYST'] },
    { to: '/screening', label: 'New Screening', icon: PlusCircle, roles: ['ADMIN', 'OFFICER'] },
    { to: '/history', label: 'Screening History', icon: History, roles: ['ADMIN', 'OFFICER', 'ANALYST'] },
    { to: '/cases', label: 'High-Risk Cases', icon: AlertTriangle, roles: ['ADMIN', 'OFFICER', 'ANALYST'] },
    { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['ADMIN', 'ANALYST'] },
    { to: '/audit', label: 'Audit Trail', icon: ShieldAlert, roles: ['ADMIN', 'ANALYST'] },
    { to: '/settings', label: 'Settings', icon: Settings, roles: ['ADMIN'] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col justify-between text-slate-300">
      <div>
        {/* Brand/SSB Logo */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <Shield className="w-8 h-8 text-indigo-500 fill-indigo-500/20" />
          <div>
            <h1 className="text-sm font-bold text-white tracking-wider">SSB SCREENING</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase">Intelligence Unit</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                      : 'hover:bg-slate-800 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-800 space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-sm">
            {userName.substring(0, 2).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-semibold text-white truncate">{userName}</h4>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">{userRole}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
