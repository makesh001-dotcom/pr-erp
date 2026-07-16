import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import logo from "../assets/logo.jpeg";

const role = localStorage.getItem("role");

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname.includes(path);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-50 print:bg-white">
      
      {/* SIDEBAR */}
      {/* SIDEBAR - Fixed height, independently scrollable */}
<aside className="w-64 bg-indigo-700 flex flex-col h-screen sticky top-0 print:hidden text-white">
  
  {/* Logo - Updated to flex-row and start-aligned */}
  <div className="py-6 px-6 flex items-center space-x-3 border-b border-indigo-600/50">
    <div className="p-2.5 bg-indigo-600 rounded-xl shadow-inner flex-shrink-0">
      <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
    </div>
    <span className="font-bold text-lg tracking-wide">PR AUTOMATION</span>
  </div>

  {/* Navigation - Padding updated for row elements */}
  <nav className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 space-y-2 scrollbar-thin scrollbar-thumb-indigo-500 scrollbar-track-transparent">
    
    {/* Main */}
    <SidebarIcon to="/dashboard" icon="📊" label="Dashboard" active={isActive('/dashboard')} />
    
    <Divider />
    
    {/* Transactions */}
    <SidebarIcon to="/purchases" icon="📥" label="Purchases" active={isActive('/purchases')} />
    <SidebarIcon to="/sales" icon="📤" label="Sales" active={isActive('/sales')} />
    <SidebarIcon to="/demo-tracking" icon="🔍" label="Demo Tracking" active={isActive('/demo-tracking')} />
    <SidebarIcon to="/quotation" icon="🧾" label="Quotations" active={isActive('/quotation')} />
    
    <Divider />
    
    {/* Master Data */}
    <SidebarIcon to="/suppliers" icon="🏢" label="Suppliers" active={isActive('/suppliers')} />
    <SidebarIcon to="/manufacturers" icon="🏭" label="Manufacturers" active={isActive('/manufacturers')} />
    
    <Divider />
    
    {/* Stock */}
    <SidebarIcon to="/inventory" icon="🏪" label="Inventory" active={isActive('/inventory')} />
    <SidebarIcon to="/AuditLogPage" icon="📝" label="Audit Logs" active={isActive('/AuditLogPage')} />
    
    <div className="pb-4" />
    
  </nav>

  {/* Logout - Transformed into a full-width clickable button */}
  <div className="p-4 border-t border-indigo-600">
    <button 
      onClick={handleLogout} 
      className="w-full flex items-center justify-center space-x-2 bg-indigo-600/50 hover:bg-indigo-600 px-4 py-2.5 rounded-xl transition text-sm font-medium text-indigo-100 hover:text-white"
    >
      <span>🚪</span>
      <span>Log Out</span>
    </button>
  </div>
  
</aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible">
        
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm print:hidden">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-700 capitalize">
              {location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 border-l pl-6">
              <div className="text-right">
                <p className="text-sm font-bold text-gray-800 leading-tight">USER</p>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  role === "admin" 
                    ? "bg-amber-100 text-amber-700 border-amber-200" 
                    : "bg-gray-100 text-gray-700 border-gray-200"
                }`}>
                  {role?.toUpperCase()} MODE
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm">
                PR
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
       <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 bg-gray-50 print:bg-white print:p-0 print:overflow-visible">
          <div className="w-full print:p-0">
            <Outlet />
          </div>
        </main>
        
      </div>
    </div>
  );
};

// Sidebar Icon Component
const SidebarIcon = ({ to, icon, label, active }) => {
  return (
    <Link
      to={to}
      className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium
        ${active 
          ? 'bg-white text-indigo-700 shadow-md' 
          : 'text-indigo-100 hover:bg-indigo-600 hover:text-white'
        }`}
    >
      <span className="text-xl flex-shrink-0 group-hover:scale-110 transition-transform">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
};

// Divider Component
const Divider = () => (
  <div className="flex justify-center">
    <div className="border-t border-indigo-500/50 w-8" />
  </div>
);

export default MainLayout;