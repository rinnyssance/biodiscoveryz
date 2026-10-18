import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

/**
 * A labelled bar chart with a written summary. The chart itself is hidden from
 * screen readers; the summary and a visually hidden data list carry the same facts.
 */
export function BarChartCard({
  title,
  subtitle,
  data,
  summary,
  yLabel = 'Patients',
  layout = 'columns',
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  data: BarDatum[];
  summary: ReactNode;
  yLabel?: string;
  layout?: 'columns' | 'rows';
  footer?: ReactNode;
}) {
  const rows = layout === 'rows';
  const height = rows ? Math.max(120, data.length * 56) : 240;
  return (
    <figure className="card" style={{ margin: 0 }}>
      <h2>{title}</h2>
      {subtitle ? <p className="card__sub">{subtitle}</p> : null}
      <div className="chart" style={{ height }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout={rows ? 'vertical' : 'horizontal'} margin={{ top: 20, right: rows ? 40 : 8, bottom: 4, left: rows ? 8 : -12 }}>
            <CartesianGrid stroke="#eef2f7" vertical={rows} horizontal={!rows} />
            {rows ? (
              <>
                <XAxis type="number" allowDecimals={false} tick={{ fill: '#556072', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={110} tick={{ fill: '#101c3c', fontSize: 13 }} axisLine={false} tickLine={false} />
              </>
            ) : (
              <>
                <XAxis dataKey="label" tick={{ fill: '#3b4660', fontSize: 13 }} axisLine={{ stroke: '#c9d2e3' }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#556072', fontSize: 12 }} axisLine={false} tickLine={false} />
              </>
            )}
            <Tooltip cursor={{ fill: '#f2f5fa' }} formatter={(v: number) => [v.toLocaleString(), yLabel]} />
            <Bar dataKey="value" radius={rows ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={64} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.label} fill={d.color ?? '#16a6a1'} />
              ))}
              <LabelList dataKey="value" position={rows ? 'right' : 'top'} fill="#101c3c" fontSize={13} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        {data.map((d) => (
          <li key={d.label}>
            {d.label}: {d.value.toLocaleString()} {yLabel.toLowerCase()}
          </li>
        ))}
      </ul>
      <figcaption className="chart-summary">{summary}</figcaption>
      {footer}
    </figure>
  );
}
