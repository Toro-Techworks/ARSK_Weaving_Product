import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../api/client';
import { Card } from './Card';

function formatWeight(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3, minimumFractionDigits: 0 }).format(v);
}

function formatBalance(required, received) {
  const req = Number(required);
  const rec = Number(received);
  if (Number.isNaN(req) || Number.isNaN(rec)) return '—';
  const bal = rec - req;
  if (bal < 0) return `-${formatWeight(Math.abs(bal))}`;
  return formatWeight(bal);
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
      <div
        className="flex items-start gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-3.5 py-2.5 text-sm font-medium text-emerald-900"
        role="status"
      >
        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" aria-hidden />
        <span>READY FOR PRODUCTION</span>
      </div>
    );
  }
  if (overallStatus === 'NOT READY') {
    return (
      <div
        className="flex items-start gap-2.5 rounded-xl border border-red-200/80 bg-red-50/90 px-3.5 py-2.5 text-sm text-red-900"
        role="alert"
      >
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" aria-hidden />
        <div>
          <p className="font-semibold leading-snug">Insufficient yarn</p>
          {errorMessage ? (
            <p className="mt-0.5 text-xs text-red-800/90 font-normal">{errorMessage}</p>
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <div
      className="flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3.5 py-2.5 text-sm font-medium text-amber-900"
      role="status"
    >
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" aria-hidden />
      <span>No yarn requirements defined for this order. Add requirements to assess readiness.</span>
    </div>
  );
}

const TH_MAIN =
  'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide align-middle whitespace-nowrap';
const TH_WEIGHT_GROUP =
  'px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center border-l border-gray-200';
const TH_SUB = 'px-4 py-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider text-right whitespace-nowrap';
const TD_TEXT = 'px-4 py-2.5 align-middle text-sm text-gray-900';
const TD_NUM = 'px-4 py-2.5 align-middle text-right tabular-nums text-sm';

/**
 * One API row per yarn_requirements record: Required + Received pair, rowspan only within the pair.
 * received_weight = FIFO allocation from the combo receipt pool (order by requirement id). line_status drives the badge.
 */
export function ProductionReadinessTable({ rows }) {
  const bodyRows = useMemo(() => {
    return (rows ?? []).map((row) => {
      const lineStatus = row.line_status ?? row.combo_status;
      const short = lineStatus !== 'PROCEED';
      const statusTitle =
        short && (row.line_error_message || row.combo_error_message)
          ? row.line_error_message || row.combo_error_message
          : short
            ? `Insufficient for this line. Combo totals — required ${formatWeight(row.total_required_for_combo)}, received ${formatWeight(row.total_received_for_combo)}`
            : `Line OK. Combo — required ${formatWeight(row.total_required_for_combo)} · received ${formatWeight(row.total_received_for_combo)}`;

      const id = row.req_id ?? row.id;
      const receivedSufficient = lineStatus === 'PROCEED';

      return (
        <tr
          key={id}
          className={`border-t border-gray-100 transition-colors ${
            short ? 'bg-red-50/35' : 'bg-white hover:bg-slate-50/60'
          }`}
        >
          <td className={`${TD_TEXT} border-r border-gray-100/80`}>{row.colour || '—'}</td>
          <td className={`${TD_TEXT} font-medium border-r border-gray-100/80`}>{row.count || '—'}</td>
          <td className={`${TD_TEXT} capitalize border-r border-gray-100/80`}>{row.content || '—'}</td>
          <td className={`${TD_NUM} font-semibold text-gray-900 border-l border-gray-100/80`}>
            {formatWeight(row.required_weight)}
          </td>
          <td
            className={`${TD_NUM} font-medium ${
              receivedSufficient ? 'text-emerald-600' : 'text-red-600'
            } border-r border-gray-100/80`}
          >
            {formatWeight(row.total_received_for_combo)}
          </td>
          <td className={`${TD_NUM} font-semibold`}>
            <span
              className={
                Number(row.total_received_for_combo) - Number(row.required_weight) > 0
                  ? 'text-emerald-700'
                  : 'text-red-700'
              }
            >
              {formatBalance(row.required_weight, row.total_received_for_combo)}
            </span>
          </td>
          <td className={`${TD_TEXT} border-l border-gray-100/80`} title={statusTitle}>
            {statusBadge(lineStatus, statusTitle)}
          </td>
        </tr>
      );
    });
  }, [rows]);

  if (!rows || rows.length === 0) {
    return <p className="text-sm text-gray-500 py-4">No yarn requirement lines to compare yet.</p>;
  }

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/95 border-b border-gray-200">
                <th rowSpan={2} className={`${TH_MAIN} text-left`}>
                  Colour
                </th>
                <th rowSpan={2} className={`${TH_MAIN} text-left`}>
                  Count
                </th>
                <th rowSpan={2} className={`${TH_MAIN} text-left border-r border-gray-200`}>
                  Content
                </th>
                <th colSpan={2} className={TH_WEIGHT_GROUP}>
                  Weight
                </th>
                <th rowSpan={2} className={`${TH_MAIN} text-right`}>
                  Balance
                </th>
                <th rowSpan={2} className={`${TH_MAIN} text-left border-l border-gray-200`}>
                  Status
                </th>
              </tr>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                <th className={`${TH_SUB} border-l border-gray-200`}>Required</th>
                <th className={`${TH_SUB} border-r border-gray-200`}>Received</th>
              </tr>
            </thead>
            <tbody>{bodyRows}</tbody>
          </table>
        </div>
      </div>
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
      <div className="mb-3">
        <h3 className="text-base font-semibold text-gray-900 tracking-tight">Production Readiness</h3>
        <p className="text-xs text-gray-500 mt-0.5">Yarn received vs requirements for this order</p>
      </div>

      {loading && (
        <p className="text-sm text-gray-500 py-5" role="status">
          Calculating…
        </p>
      )}

      {!loading && error && (
        <p className="text-sm text-red-600 py-4">{error}</p>
      )}

      {!loading && !error && payload && (
        <div className="space-y-3">
          {overallBanner(overall, overallError)}
          <ProductionReadinessTable rows={rows} />
        </div>
      )}
    </Card>
  );
}
