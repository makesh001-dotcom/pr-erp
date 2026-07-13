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
<aside className="w-20 bg-indigo-700 flex flex-col h-screen sticky top-0 print:hidden">
  
  {/* Logo - Fixed at top */}
  <div className="py-6 flex justify-center">
    <div className="text-white p-3 bg-indigo-600 rounded-xl shadow-inner">
      <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
    </div>
  </div>

  {/* Navigation - Scrollable */}
  <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-6 scrollbar-thin scrollbar-thumb-indigo-500 scrollbar-track-transparent">
    
    {/* Main */}
    <SidebarIcon to="/dashboard" icon="📊" label="Dash" active={isActive('/dashboard')} />
    {/*<SidebarIcon to="/analytics" icon="📈" label="Analytics" active={isActive('/analytics')} />*/}
    
    <Divider />
    
    {/* Transactions */}
    <SidebarIcon to="/purchases" icon="📥" label="Purchases" active={isActive('/purchases')} />
    <SidebarIcon to="/sales" icon="📤" label="Sales" active={isActive('/sales')} />
    <SidebarIcon to="/demo-tracking" icon="🔍" label="Demo" active={isActive('/demo-tracking')} />
    <SidebarIcon to="/quotation" icon="🧾" label="Quotation" active={isActive('/quotation')} />
    
    <Divider />
    
    {/* Master Data */}
    <SidebarIcon to="/suppliers" icon="🏢" label="Suppliers" active={isActive('/suppliers')} />
    {/*<SidebarIcon to="/models" icon="📋" label="Models" active={isActive('/models')} />*/}
    <SidebarIcon to="/manufacturers" icon="🏭" label="Mfrs" active={isActive('/manufacturers')} />
    
    <Divider />
    
    {/* Stock */}
    <SidebarIcon to="/inventory" icon="🏪" label="Inventory" active={isActive('/inventory')} />
    <SidebarIcon to="/AuditLogPage" icon="📝" label="AuditLogPage" active={isActive('/AuditLogPage')} />
    
    {/* Extra padding at bottom for scroll comfort */}
    <div className="pb-4" />
    
  </nav>

  {/* Logout - Fixed at bottom */}
  <div className="py-4 border-t border-indigo-600 flex justify-center">
    <button 
      onClick={handleLogout} 
      className="text-indigo-200 hover:text-white transition text-xs font-medium"
    >
       Logout
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
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8 bg-gray-50 print:bg-white print:p-0 print:overflow-visible">
          <div className="max-w-7xl mx-auto print:max-w-full print:p-0">
            <Outlet />
          </div>
        </main>
        
      </div>
    </div>
  );
};

// Sidebar Icon Component
const SidebarIcon = ({ to, icon, label, active }) => (
  <Link to={to} className="group relative flex flex-col items-center w-full">
    <div className={`p-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-white text-indigo-700 shadow-lg scale-110' 
        : 'text-indigo-100 hover:bg-indigo-600 hover:text-white'
    }`}>
      <span className="text-2xl">{icon}</span>
    </div>
    <span className="text-[10px] mt-1 font-medium text-indigo-300 opacity-100">
      {label}
    </span>
    {active && (
      <div className="absolute right-0 top-1/4 h-1/2 w-1 bg-white rounded-l-full" />
    )}
  </Link>
);

// Divider Component
const Divider = () => (
  <div className="flex justify-center">
    <div className="border-t border-indigo-500/50 w-8" />
  </div>
);

export default MainLayout;