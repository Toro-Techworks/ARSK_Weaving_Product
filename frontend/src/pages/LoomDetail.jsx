import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { loomStatusTablePillClassName, normalizeLoomStatus, isLoomInactiveStatus } from '../utils/loomStatus';
import { LoomInactiveInfoTip } from '../components/LoomInactiveInfoTip';

function TimelineItem({ item }) {
  const open = !item.inactive_end_date;
  return (
    <li className="relative pl-6 pb-5 border-l-2 border-amber-200 last:pb-0">
      <span
        className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white ${
          open ? 'bg-amber-500' : 'bg-slate-300'
        }`}
      />
      <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-gray-900">{item.inactive_reason || 'Status change'}</span>
          {open ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
              Ongoing
            </span>
          ) : null}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {item.inactive_since_display || '—'}
          {item.inactive_end_date ? ` → ${item.inactive_until_display || 'closed'}` : ' → present'}
        </p>
        {item.remarks ? <p className="text-xs text-gray-600 mt-1">{item.remarks}</p> : null}
        <p className="text-[11px] text-gray-400 mt-1">
          Downtime: {item.downtime_days != null ? `${item.downtime_days} days` : '—'}
          {item.changed_by_name ? ` · ${item.changed_by_name}` : ''}
        </p>
      </div>
    </li>
  );
}

export function LoomDetailPage() {
  const { loomId } = useParams();
  const [loading, setLoading] = useState(true);
  const [loom, setLoom] = useState(null);
  const [inactivity, setInactivity] = useState(null);

  useEffect(() => {
    if (!loomId) return;
    setLoading(true);
    api
      .get(`/looms/${loomId}`)
      .then(({ data }) => {
        setLoom(data.data);
        setInactivity(data.inactivity || null);
      })
      .catch(() => toast.error('Failed to load loom'))
      .finally(() => setLoading(false));
  }, [loomId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!loom) {
    return (
      <div className="space-y-4">
        <p className="text-gray-600">Loom not found.</p>
        <Link to="/loom-production/looms">
          <Button variant="secondary">Back to looms</Button>
        </Link>
      </div>
    );
  }

  const timeline = inactivity?.timeline || [];
  const openPeriod = loom.current_inactive_period;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Loom {loom.loom_number ?? loom.id}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{loom.location || 'No location set'}</p>
        </div>
        <Link to="/loom-production/looms">
          <Button variant="secondary">Back to looms</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current status</p>
          <div className="mt-2 flex items-center gap-1">
            <span
              className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-md border ${loomStatusTablePillClassName(
                loom.status,
              )}`}
            >
              {normalizeLoomStatus(loom.status)}
            </span>
            {isLoomInactiveStatus(loom.status) ? <LoomInactiveInfoTip period={openPeriod} /> : null}
          </div>
        </Card>
        <Card className="border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Latest inactive reason</p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {inactivity?.latest_inactive_reason || loom.inactive_reason || '—'}
          </p>
        </Card>
        <Card className="border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total inactive days</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
            {inactivity?.total_inactive_days ?? 0}
          </p>
        </Card>
      </div>

      <Card className="border-gray-100">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Inactivity timeline</h3>
        {timeline.length === 0 ? (
          <p className="text-sm text-gray-500">No inactive periods recorded for this loom.</p>
        ) : (
          <ol className="mt-1">{timeline.map((item) => (
            <TimelineItem key={item.id} item={item} />
          ))}</ol>
        )}
      </Card>
    </div>
  );
}

export default LoomDetailPage;
