'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAction } from '@/lib/actions/auth';
import type { Profile } from '@/lib/types';
import {
  Gem,
  LayoutDashboard,
  Plus,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
  Shield,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  user: { id: string; email: string };
  profile: Profile;
}

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/transactions/new',
    label: 'New Transaction',
    icon: Plus,
    highlight: true,
  },
  {
    href: '/customers',
    label: 'Customers',
    icon: Users,
  },
];

export function AppShell({ children, user, profile }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fallback in case the user was created before the database trigger was applied
  const safeProfile = profile || { full_name: user.email.split('@')[0], role: 'staff' };

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 glass border-b border-surface-300/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/dashboard"
              className="flex items-center gap-3 shrink-0"
            >
              <div className="w-9 h-9 rounded-lg gold-gradient flex items-center justify-center shadow-md shadow-gold-500/20">
                <Gem className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-surface-950 hidden sm:block">
                Bohol Jewelry
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' &&
                    pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                      ${
                        item.highlight && !isActive
                          ? 'gold-gradient text-white shadow-md shadow-gold-500/20 hover:brightness-110'
                          : isActive
                          ? 'bg-surface-200/60 text-gold-400'
                          : 'text-surface-600 hover:text-surface-800 hover:bg-surface-200/40'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* User / Logout */}
            <div className="flex items-center gap-3">
              {/* User info */}
              <div className="hidden sm:flex items-center gap-2 text-sm text-surface-600">
                <div className="w-8 h-8 rounded-full bg-surface-300/50 flex items-center justify-center">
                  {safeProfile.role === 'admin' ? (
                    <Shield className="w-4 h-4 text-gold-500" />
                  ) : (
                    <User className="w-4 h-4 text-surface-600" />
                  )}
                </div>
                <div className="hidden lg:block">
                  <p className="text-xs font-medium text-surface-800 leading-tight">
                    {safeProfile.full_name}
                  </p>
                  <p className="text-xs text-surface-500 capitalize leading-tight">
                    {safeProfile.role}
                  </p>
                </div>
              </div>

              {/* Logout */}
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-surface-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-surface-600 hover:bg-surface-200/50 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-surface-300/20 animate-fade-in">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' &&
                    pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all
                      ${
                        item.highlight && !isActive
                          ? 'gold-gradient text-white shadow-md shadow-gold-500/20'
                          : isActive
                          ? 'bg-surface-200/60 text-gold-400'
                          : 'text-surface-700 hover:bg-surface-200/40'
                      }
                    `}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                );
              })}

              {/* Mobile user info & logout */}
              <div className="pt-3 mt-3 border-t border-surface-300/20">
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="w-9 h-9 rounded-full bg-surface-300/50 flex items-center justify-center">
                    {safeProfile.role === 'admin' ? (
                      <Shield className="w-4 h-4 text-gold-500" />
                    ) : (
                      <User className="w-4 h-4 text-surface-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-800">
                      {safeProfile.full_name}
                    </p>
                    <p className="text-xs text-surface-500 capitalize">
                      {safeProfile.role} · {user.email}
                    </p>
                  </div>
                </div>

                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-rose-400 hover:bg-rose-500/10 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
