import React from 'react';

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-20 bg-primary-700 flex flex-col items-center py-6 space-y-8 shadow-lg">
        <div className="text-white mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </div>
        {/* Navigation Icons (Add more as needed) */}
        <nav className="flex flex-col space-y-6 text-indigo-200">
          <div className="hover:text-white cursor-pointer flex flex-col items-center">
            <div className="p-2 bg-indigo-800 rounded-lg">🏠</div>
            <span className="text-[10px] mt-1">Home</span>
          </div>
          <div className="hover:text-white cursor-pointer flex flex-col items-center">
            <div className="p-2">🏗️</div>
            <span className="text-[10px] mt-1">Mfrs</span>
          </div>
        </nav>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-card border-b flex items-center justify-between px-8">
           <div className="text-gray-400">Search...</div>
           <div className="flex items-center space-x-4">
             <div className="w-8 h-8 rounded-full bg-gray-300"></div>
             <span className="font-medium text-sm">Ann Lee</span>
           </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
};