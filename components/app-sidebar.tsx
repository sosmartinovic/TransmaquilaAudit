'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Database, Download, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/load-register', label: 'Load Register', icon: Database },
  { href: '/report', label: 'Report', icon: Download },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 flex flex-col" style={{ backgroundColor: '#1e3a5f' }}>
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
          <Truck className="w-6 h-6 text-orange-400" />
        </div>
        <div>
          <h1 className="text-white font-display font-bold text-lg tracking-tight leading-tight">
            Transmaquila
          </h1>
          <p className="text-blue-200/60 text-xs font-medium">Audit Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 mt-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-blue-100/70 hover:bg-white/8 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-blue-200/40 text-xs">
          Cross-border freight auditing
        </p>
      </div>
    </aside>
  );
}
