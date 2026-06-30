import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export default function LeadTimeChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="days"
          tickFormatter={v => `${v}일`}
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          formatter={(v) => [v, '태스크 수']}
          labelFormatter={l => `${l}일 소요`}
          contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
        />
        <Bar dataKey="count" name="태스크" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
