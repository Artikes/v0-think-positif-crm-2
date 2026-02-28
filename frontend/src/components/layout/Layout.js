import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Button } from '../ui/button';
import { Menu } from 'lucide-react';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            data-testid="mobile-menu-btn"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-heading text-lg font-bold flex items-center gap-2">
            <img 
              src="https://customer-assets.emergentagent.com/job_talent-management-12/artifacts/f8rng3ex_ThinkPositifWhite%404x.png" 
              alt="ThinkPositif" 
              className="h-6 w-auto"
            />
          </h1>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-3.5rem)] lg:min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
