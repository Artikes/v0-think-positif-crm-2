import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Star,
  FileText,
  Settings,
  LogOut,
  Sun,
  Moon,
  Building2,
  Tags,
  Menu,
  X,
  CheckSquare,
  Calendar,
  UsersRound,
  Ticket,
  TicketCheck
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { profile, signOut, isAdmin, isSuperAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const adminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/tasks', icon: CheckSquare, label: 'Tâches' },
    { to: '/schedule', icon: Calendar, label: 'Planning' },
    { to: '/clients', icon: Building2, label: 'CRM Clients' },
    { to: '/trainers', icon: GraduationCap, label: 'Formateurs' },
    { to: '/talents', icon: Star, label: 'Jeunes Potentiels' },
    { to: '/expertise', icon: Tags, label: 'Expertises' },
    { to: '/documents', icon: FileText, label: 'Documents' },
    { to: '/team', icon: UsersRound, label: 'Équipe' },
    { to: '/tickets', icon: Ticket, label: 'Mes Tickets' },
    { to: '/users', icon: Users, label: 'Utilisateurs' },
    { to: '/settings', icon: Settings, label: 'Paramètres' },
  ];

  // Superadmin-only links
  const superAdminLinks = [
    { to: '/ticket-admin', icon: TicketCheck, label: 'Gestion Tickets' },
  ];

  const employeeLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/tasks', icon: CheckSquare, label: 'Tâches' },
    { to: '/schedule', icon: Calendar, label: 'Planning' },
    { to: '/clients', icon: Building2, label: 'CRM Clients' },
    { to: '/trainers', icon: GraduationCap, label: 'Formateurs' },
    { to: '/talents', icon: Star, label: 'Jeunes Potentiels' },
    { to: '/documents', icon: FileText, label: 'Documents' },
    { to: '/team', icon: UsersRound, label: 'Équipe' },
    { to: '/tickets', icon: Ticket, label: 'Mes Tickets' },
  ];

  // Combine links based on role
  let links = isAdmin() ? adminLinks : employeeLinks;
  if (isSuperAdmin()) {
    links = [...links, ...superAdminLinks];
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 z-50 h-screen w-64 border-r bg-card/95 backdrop-blur-xl
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        data-testid="sidebar"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <h1 className="font-heading text-xl font-bold tracking-tight flex items-center gap-2">
            <img 
              src={theme === 'dark' 
                ? "/logo-white.png"
                : "/logo-black.png"
              }
              alt="ThinkPositif" 
              className="h-8 w-auto"
            />
          </h1>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onClose}
              data-testid="sidebar-close-btn"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }
                  `}
                  data-testid={`nav-${link.to.replace('/', '')}`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t p-4 space-y-3">
            {/* User info */}
            <div className="flex items-center gap-3 px-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.name || 'Utilisateur'}</p>
                <p className="text-xs text-muted-foreground capitalize">{profile?.role || 'employee'}</p>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="flex-shrink-0"
                data-testid="theme-toggle-btn"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                className="flex-1 justify-start gap-2 text-muted-foreground hover:text-destructive"
                onClick={handleSignOut}
                data-testid="logout-btn"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
