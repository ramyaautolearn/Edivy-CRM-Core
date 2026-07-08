import React from 'react';

// ============================================
// PAGE LAYOUT
// ============================================

export function PageLayout({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-h-screen bg-[#f8fafc] ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  badge,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="bg-white border-b border-[#e2e8f0] px-8 py-6">
      <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-[#0f172a] tracking-tight">{title}</h1>
              {badge}
            </div>
            {subtitle && (
              <p className="text-sm text-[#64748b] mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export function PageContent({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-8 py-6 max-w-7xl mx-auto ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// CARDS
// ============================================

export function Card({
  children,
  className = '',
  padding = 'md',
}: {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={`bg-white rounded-xl border border-[#e2e8f0] shadow-sm ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  actions,
  icon,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-[#eff6ff] flex items-center justify-center text-[#3b82f6]">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-sm font-semibold text-[#0f172a]">{title}</h3>
          {subtitle && (
            <p className="text-xs text-[#64748b] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions}
    </div>
  );
}

// ============================================
// BUTTONS
// ============================================

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  className = '',
  disabled = false,
  onClick,
  type = 'button',
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  const variants = {
    primary: 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] border-transparent',
    secondary: 'bg-white text-[#334155] border-[#e2e8f0] hover:bg-[#f8fafc] hover:border-[#cbd5e1]',
    ghost: 'bg-transparent text-[#64748b] border-transparent hover:bg-[#f1f5f9] hover:text-[#334155]',
    danger: 'bg-white text-[#dc2626] border-[#fecaca] hover:bg-[#fef2f2] hover:border-[#f87171]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm rounded-lg gap-2',
    lg: 'px-5 py-2.5 text-sm rounded-lg gap-2',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center font-medium border
        transition-all duration-200 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
}

// ============================================
// BADGES
// ============================================

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}) {
  const variants = {
    default: 'bg-[#f1f5f9] text-[#475569] border-[#e2e8f0]',
    primary: 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]',
    success: 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]',
    warning: 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]',
    error: 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]',
    neutral: 'bg-[#0f172a] text-white border-transparent',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px] rounded-md',
    md: 'px-2.5 py-1 text-xs rounded-lg',
  };

  return (
    <span className={`inline-flex items-center font-medium border ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}

// ============================================
// METRICS / STATS
// ============================================

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendDirection,
  accentColor = 'blue',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  accentColor?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan';
}) {
  const colors = {
    blue: { bg: 'bg-[#eff6ff]', text: 'text-[#2563eb]', icon: 'text-[#3b82f6]' },
    green: { bg: 'bg-[#f0fdf4]', text: 'text-[#16a34a]', icon: 'text-[#22c55e]' },
    amber: { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', icon: 'text-[#f59e0b]' },
    red: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', icon: 'text-[#ef4444]' },
    purple: { bg: 'bg-[#faf5ff]', text: 'text-[#9333ea]', icon: 'text-[#a855f7]' },
    cyan: { bg: 'bg-[#ecfeff]', text: 'text-[#0891b2]', icon: 'text-[#06b6d4]' },
  };

  const color = colors[accentColor];

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-semibold text-[#0f172a] mt-2 tracking-tight">{value}</p>
          {(subtitle || trend) && (
            <div className="flex items-center gap-2 mt-2">
              {trend && (
                <span className={`text-xs font-medium ${trendDirection === 'up' ? 'text-[#22c55e]' : trendDirection === 'down' ? 'text-[#ef4444]' : 'text-[#64748b]'}`}>
                  {trend}
                </span>
              )}
              {subtitle && (
                <span className="text-xs text-[#94a3b8]">{subtitle}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-lg ${color.bg} ${color.icon} flex items-center justify-center`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================
// TABLES
// ============================================

export function Table({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
      {children}
    </thead>
  );
}

export function TableBody({
  children,
}: {
  children: React.ReactNode;
}) {
  return <tbody className="divide-y divide-[#f1f5f9]">{children}</tbody>;
}

export function TableRow({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={`group ${onClick ? 'cursor-pointer hover:bg-[#f8fafc]' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  align = 'left',
  className = '',
}: {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <td className={`px-4 py-3 ${alignClasses[align]} ${className}`}>
      {children}
    </td>
  );
}

export function TableHeaderCell({
  children,
  align = 'left',
  className = '',
}: {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <th className={`px-4 py-3 text-xs font-medium text-[#64748b] uppercase tracking-wider ${alignClasses[align]} ${className}`}>
      {children}
    </th>
  );
}

// ============================================
// EMPTY STATES
// ============================================

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#94a3b8] mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-[#334155]">{title}</h3>
      {description && (
        <p className="text-sm text-[#94a3b8] mt-1 max-w-sm">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}

// ============================================
// LOADING STATES
// ============================================

export function LoadingSpinner({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <svg
      className={`animate-spin ${sizes[size]} text-[#3b82f6] ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
    </svg>
  );
}

export function LoadingState({
  message = 'Loading...',
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-[#64748b] mt-4">{message}</p>
    </div>
  );
}

// ============================================
// PROGRESS BAR
// ============================================

export function ProgressBar({
  value,
  max = 100,
  color = 'blue',
  size = 'md',
  showLabel = false,
  className = '',
}: {
  value: number;
  max?: number;
  color?: 'blue' | 'green' | 'amber' | 'red';
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colors = {
    blue: 'bg-[#3b82f6]',
    green: 'bg-[#22c55e]',
    amber: 'bg-[#f59e0b]',
    red: 'bg-[#ef4444]',
  };

  const sizes = {
    sm: 'h-1',
    md: 'h-2',
  };

  return (
    <div className={className}>
      <div className={`w-full bg-[#e2e8f0] rounded-full overflow-hidden ${sizes[size]}`}>
        <div
          className={`${colors[color]} ${sizes[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-[#64748b]">{value}</span>
          <span className="text-xs text-[#94a3b8]">{max}</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// DIVIDER
// ============================================

export function Divider({
  className = '',
}: {
  className?: string;
}) {
  return <div className={`h-px bg-[#e2e8f0] ${className}`} />;
}

// ============================================
// SECTION HEADER
// ============================================

export function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-sm font-semibold text-[#0f172a]">{title}</h2>
        {subtitle && (
          <p className="text-xs text-[#64748b] mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions}
    </div>
  );
}

// ============================================
// ALERT CARDS
// ============================================

export function AlertCard({
  title,
  description,
  icon,
  variant = 'warning',
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: 'warning' | 'error' | 'success' | 'info';
  action?: React.ReactNode;
}) {
  const variants = {
    warning: {
      bg: 'bg-[#fffbeb]',
      border: 'border-[#fde68a]',
      title: 'text-[#92400e]',
      text: 'text-[#b45309]',
      icon: 'text-[#f59e0b]',
    },
    error: {
      bg: 'bg-[#fef2f2]',
      border: 'border-[#fecaca]',
      title: 'text-[#991b1b]',
      text: 'text-[#b91c1c]',
      icon: 'text-[#ef4444]',
    },
    success: {
      bg: 'bg-[#f0fdf4]',
      border: 'border-[#bbf7d0]',
      title: 'text-[#166534]',
      text: 'text-[#15803d]',
      icon: 'text-[#22c55e]',
    },
    info: {
      bg: 'bg-[#eff6ff]',
      border: 'border-[#bfdbfe]',
      title: 'text-[#1e40af]',
      text: 'text-[#1d4ed8]',
      icon: 'text-[#3b82f6]',
    },
  };

  const style = variants[variant];

  return (
    <div className={`rounded-xl border p-4 ${style.bg} ${style.border}`}>
      <div className="flex gap-3">
        {icon && (
          <div className={`shrink-0 ${style.icon}`}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium ${style.title}`}>{title}</h4>
          {description && (
            <p className={`text-sm mt-1 ${style.text}`}>{description}</p>
          )}
          {action && (
            <div className="mt-3">
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
