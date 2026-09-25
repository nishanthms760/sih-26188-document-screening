import React from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: string;
  userName?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, userRole = 'OFFICER', userName = 'Officer' }) => {
  return (
    <div className="flex bg-gray-950 min-h-screen text-slate-100 overflow-x-hidden">
      {/* Persistent Sidebar */}
      <Sidebar userRole={userRole} userName={userName} />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar Control Header */}
        <Topbar userName={userName} userRole={userRole} />
        
        {/* Page Inner Content Container */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
