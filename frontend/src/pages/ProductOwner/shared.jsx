import React from 'react';

export function StatCard({ label, value, hint, tone = 'default' }) {
  const tones = {
    default: 'bg-white border-slate-200',
    success: 'bg-emerald-50/80 border-emerald-200',
    warn: 'bg-amber-50/80 border-amber-200',
    danger: 'bg-rose-50/80 border-rose-200',
    info: 'bg-blue-50/80 border-blue-200',
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tones[tone] || tones.default}`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">{value}</p>
      {hint ? <p className="text-[11px] text-slate-500 mt-1">{hint}</p> : null}
    </div>
  );
}

export function RoleBadge({ role }) {
  const r = String(role || '').toLowerCase();
  const cls =
    r === 'super_admin'
      ? 'bg-violet-100 text-violet-800'
      : r === 'admin'
        ? 'bg-blue-100 text-blue-800'
        : 'bg-slate-100 text-slate-700';
  const label = r ? r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';
  return <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-md ${cls}`}>{label}</span>;
}

export function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  const cls =
    s === 'active'
      ? 'bg-emerald-100 text-emerald-800'
      : s === 'inactive' || s === 'disabled'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-200 text-slate-700';
  return <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${cls}`}>{s || '—'}</span>;
}

export function Panel({ title, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {title ? (
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
