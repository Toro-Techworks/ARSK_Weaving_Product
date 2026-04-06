import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { Card } from './Card';

function formatWeight(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3, minimumFractionDigits: 0 }).format(v);
}

function statusBadge(status, title) {
  const ok = status === 'PROCEED';
  return (
    <span
      title={title || undefined}
      className={`inline-flex items-center justify-center text-center font-semibold leading-tight ${
        ok
          ? 'rounded-lg bg-emerald-100 px-2 py-1.5 text-[10px] sm:text-xs text-emerald-800 max-w-[11rem]'
          : 'rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-800'
      }`}
    >
      {ok ? 'Ready for production' : 'INSUFFICIENT YARN'}
    </span>
  );
}

function overallBanner(overallStatus, errorMessage) {
  if (overallStatus === 'READY FOR PRODUCTION') {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
        READY FOR PRODUCTION
      </div>
    );
  }
  if (overallStatus === 'NOT READY') {
    return (
      <div
        className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
        role="alert"
      >
        <p className="font-semibold">Insufficient yarn</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
      No yarn requirements defined for this order. Add requirements to assess readiness.
    </div>
  );
}

/**
 * One API row per yarn_requirements record: Required + Received pair, rowspan only within the pair.
 * received_weight = FIFO allocation from the combo receipt pool (order by requirement id). line_status drives the badge.
 */
export function ProductionReadinessTable({ rows }) {
  const trs = useMemo(() => {
    const out = [];
    (rows ?? []).forEach((row) => {
      const lineStatus = row.line_status ?? row.combo_status;
      const short = lineStatus !== 'PROCEED';
      const statusTitle =
        short && (row.line_error_message || row.combo_error_message)
          ? row.line_error_message || row.combo_error_message
          : short
            ? `Insufficient for this line. Combo totals — required ${formatWeight(row.total_required_for_combo)}, received ${formatWeight(row.total_received_for_combo)}`
            : `Line OK. Combo — required ${formatWeight(row.total_required_for_combo)} · received ${formatWeight(row.total_received_for_combo)}`;

      const rowBgReq = short ? 'bg-red-50/45' : 'bg-gray-50/95';
      const rowBgRec = short ? 'bg-red-50/45' : 'bg-sky-50/50';
      const id = row.req_id ?? row.id;

      out.push(
        <tr key={`${id}-required`} className={`border-t border-gray-100 ${rowBgReq}`}>
          <td
            rowSpan={2}
            className="px-3 py-2 align-top text-gray-900 border-r border-gray-100 max-w-[14rem]"
          >
            <span className="line-clamp-3 break-words" title={row.yarn_requirement}>
              {row.yarn_requirement ?? '—'}
            </span>
          </td>
          <td rowSpan={2} className="px-3 py-2 align-top text-gray-900 border-r border-gray-100">
            {row.colour || '—'}
          </td>
          <td rowSpan={2} className="px-3 py-2 align-top text-gray-900 font-medium border-r border-gray-100">
            {row.count || '—'}
          </td>
          <td rowSpan={2} className="px-3 py-2 align-top text-gray-900 capitalize border-r border-gray-100">
            {row.content || '—'}
          </td>
          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">Required</td>
          <td className="px-3 py-2 text-right tabular-nums text-gray-900">
            {formatWeight(row.required_weight)}
          </td>
          <td rowSpan={2} className="px-3 py-2 align-middle border-l border-gray-100" title={statusTitle}>
            {statusBadge(lineStatus, statusTitle)}
          </td>
        </tr>,
      );

      out.push(
        <tr key={`${id}-received`} className={`border-t border-gray-100 ${rowBgRec}`}>
          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">Received</td>
          <td className="px-3 py-2 text-right tabular-nums text-gray-900">
            {formatWeight(row.received_weight)}
          </td>
        </tr>,
      );
    });
    return out;
  }, [rows]);

  if (!rows || rows.length === 0) {
    return <p className="text-sm text-gray-500 py-4">No yarn requirement lines to compare yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Yarn requirement</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Colour</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Content</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Weight</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody>{trs}</tbody>
      </table>
    </div>
  );
}

/** @deprecated use ProductionReadinessTable with flat `data` from API */
export function ProductionReadinessGroupedTable({ groups }) {
  const rows = [];
  (groups ?? []).forEach((g) => {
    const req = Array.isArray(g.required) ? g.required : Object.values(g.required ?? {});
    req.forEach((r) => {
      rows.push({
        req_id: r.id,
        yarn_requirement: r.yarn_requirement,
        colour: r.colour,
        count: g.count,
        content: g.content,
        required_weight: r.weight,
        received_weight: g.total_received,
        total_required_for_combo: g.total_required,
        total_received_for_combo: g.total_received,
        combo_status: g.status,
        combo_error_message: g.error_message,
        line_status: g.status,
        line_error_message: g.error_message,
      });
    });
  });
  return <ProductionReadinessTable rows={rows} />;
}

/**
 * Yarn receipt vs requirement sufficiency for a single yarn order.
 */
export function ProductionReadiness({ yarnOrderId, receipts, yarnRequirements }) {
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!yarnOrderId) {
      setPayload(null);
      setError(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get('/production-status', { params: { yarn_order_id: yarnOrderId } })
      .then(({ data }) => {
        if (!cancelled) setPayload(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setPayload(null);
          setError(err.response?.data?.message || 'Could not load production readiness');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [yarnOrderId, receipts, yarnRequirements]);

  if (!yarnOrderId) return null;

  const rows = payload?.data ?? [];
  const overall = payload?.overall_status ?? '';
  const overallError = payload?.error_message ?? null;

  return (
    <Card className="mt-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">Production Readiness</h3>
        <p className="text-sm text-gray-500 mt-1">
          One block per yarn requirement line (Required + Received). Receipts are matched by count, content, and colour.
          For duplicate combinations, received yarn is applied to lines in order (first line first); each line’s status
          reflects whether its requirement is met from what remains. The Received column shows the amount allocated to
          that line from the combo total.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-gray-500 py-6" role="status">
          Calculating…
        </p>
      )}

      {!loading && error && (
        <p className="text-sm text-red-600 py-4">{error}</p>
      )}

      {!loading && !error && payload && (
        <>
          <div className="mb-4">{overallBanner(overall, overallError)}</div>
          <ProductionReadinessTable rows={rows} />
        </>
      )}
    </Card>
  );
}
