import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import logo from "../assets/logo.jpeg";

import { useAuth } from "../context/AuthContext";
import { navigation } from "../constant/navigation";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasPermission } = useAuth();
  const { theme } = useTheme();

  const isActive = (path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const handleLogout = async () => {
    try {
      if (logout) await logout();
      localStorage.clear();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const visibleNavigation = navigation.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  const sections = [...new Set(visibleNavigation.map(item => item.section || 'General'))];

  return (
    <div className="flex min-h-screen bg-background print:bg-card">
      
      {/* SIDEBAR - Uses semantic --sidebar variables */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0 print:hidden shadow-xl z-20 border-r border-sidebar-border">
        
        {/* Branding Header */}
        <div className="py-5 px-6 flex items-center space-x-3 border-b border-sidebar-border flex-shrink-0">
          <div className="p-2 bg-sidebar-accent rounded-xl shadow-inner flex-shrink-0">
            <img src={logo} alt="Logo" className="w-8 h-8 object-contain rounded-md" />
          </div>
          <span className="font-bold text-base tracking-wide uppercase text-sidebar-foreground">PR Automation</span>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-thin">
          {sections.map((section, index) => {
            const sectionItems = visibleNavigation.filter(item => (item.section || 'General') === section);
            if (sectionItems.length === 0) return null;

            return (
              <div key={section} className="space-y-1">
                {/* Section Title Header */}
                <h3 className="px-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-2">
                  {section}
                </h3>
                
                <div className="space-y-1">
                  {sectionItems.map((item) => (
                    <SidebarLink
                      key={item.path}
                      to={item.path}
                      icon={item.icon}
                      label={item.label}
                      active={isActive(item.path)}
                    />
                  ))}
                </div>

                {index < sections.length - 1 && <Divider />}
              </div>
            );
          })}
        </div>

        {/* System User / Logout Action Footer */}
        <div className="p-4 border-t border-sidebar-border flex-shrink-0 bg-sidebar-accent/50">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center space-x-2 bg-sidebar-accent hover:bg-sidebar-accent/80 px-4 py-2.5 rounded-xl transition-all text-sm font-medium text-sidebar-foreground shadow-sm"
          >
            <span className="text-base">🚪</span>
            <span>Log Out</span>
          </button>
        </div>
        
      </aside>

      {/* MAIN LAYOUT CANVAS */}
      <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible">
        
        {/* Global Action Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-8 shadow-sm print:hidden flex-shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-foreground capitalize">
              {location.pathname.replace('/', '').replace(/-/g, ' ') || 'Dashboard'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 border-l pl-6 border-border">
              <div className="text-right">
                <p className="text-sm font-bold text-foreground leading-tight">
                  {user?.name || 'USER'}
                </p>
                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wider ${
                  user?.role?.toLowerCase() === "admin"
                    ? "bg-warning-soft text-warning border-warning/30" 
                    : "bg-muted text-muted-foreground border-border"
                }`}>
                  {user?.role?.toUpperCase() || 'GUEST'} MODE 
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold border-2 border-border shadow-md flex-shrink-0">
                {user?.name ? user.name.substring(0,2).toUpperCase() : 'PR'}
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Core Main Render Frame */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 bg-background print:bg-card print:p-0 print:overflow-visible">
          <div className="w-full max-w-7xl mx-auto print:p-0">
            <Outlet />
          </div>
        </main>
        
      </div>
    </div>
  );
};

// SidebarLink with semantic colors
const SidebarLink = ({ to, icon, label, active }) => {
  return (
    <Link
      to={to}
      className={`w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl transition-all duration-150 group text-sm font-medium
        ${active 
          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm font-semibold' 
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        }`}
    >
      <span className={`text-lg flex-shrink-0 transition-transform duration-150 ${!active && 'group-hover:scale-110'}`}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
};

const Divider = () => (
  <div className="pt-4 pb-2">
    <div className="border-t border-sidebar-border w-full" />
  </div>
);

export default MainLayout;