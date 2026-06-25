import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export default function BurnupChart({ data = [] }) {
  const ticks = data
    .filter((_, i) => i % 5 === 0 || i === data.length - 1)
    .map(d => d.date)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          ticks={ticks}
          tickFormatter={v => v.slice(5)}
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
          contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: 'var(--text-muted)', marginBottom: 4 }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 8 }} />
        <Line type="monotone" dataKey="total" name="전체" stroke="var(--text-muted)" strokeWidth={1.5} dot={false} />
        <Line type="monotone" dataKey="done"  name="완료"  stroke="var(--accent)"     strokeWidth={2}   dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
