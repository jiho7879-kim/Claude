import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import BurnupChart from '../components/BurnupChart'
import LeadTimeChart from '../components/LeadTimeChart'
import { getAnalytics } from '../lib/workspaceApi'
import useToastStore from '../store/toastStore'

const STATUS_LABEL = { todo: '할 일', in_progress: '진행 중', done: '완료', cancelled: '취소' }
const STATUS_COLOR = { todo: 'var(--text-muted)', in_progress: '#f59e0b', done: 'var(--accent)', cancelled: '#ef4444' }
const PRIORITY_LABEL = { urgent: '긴급', high: '높음', medium: '보통', low: '낮음' }
const PRIORITY_COLOR = { urgent: '#ef4444', high: '#f59e0b', medium: 'var(--accent)', low: 'var(--text-muted)' }

function StatCard({ label, value, color = '' }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)', padding: '16px 20px', flex: 1, minWidth: 100,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || 'var(--text)' }}>
        {value ?? 0}
      </div>
    </div>
  )
}

function ChartCard({ title, children, empty }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '20px 20px 12px' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>{title}</div>
      {empty
        ? <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>데이터 없음</div>
        : children}
    </div>
  )
}

export default function AnalyticsPage() {
  const { slug, projectId } = useParams()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToastStore(s => s.add)

  useEffect(() => {
    getAnalytics(slug, projectId)
      .then(setData)
      .catch(() => toast('Analytics 불러오기 실패', 'error'))
      .finally(() => setLoading(false))
  }, [slug, projectId])

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>불러오는 중…</div>
  if (!data)   return null

  const { summary, burnup, velocity, lead_time, throughput } = data
  const { by_status = {}, by_priority = {} } = summary

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>📊 Analytics</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>프로젝트 진행 현황을 한눈에 파악하세요</p>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard label="전체" value={summary.total} />
        {Object.entries(STATUS_LABEL).map(([k, label]) => (
          <StatCard key={k} label={label} value={by_status[k] ?? 0} color={STATUS_COLOR[k]} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {Object.entries(PRIORITY_LABEL).map(([k, label]) => (
          <StatCard key={k} label={label} value={by_priority[k] ?? 0} color={PRIORITY_COLOR[k]} />
        ))}
      </div>

      <ChartCard title="번업 차트 (30일)" empty={!burnup?.length}>
        <BurnupChart data={burnup} />
      </ChartCard>

      <ChartCard title="주간 완료 속도 (8주)" empty={!velocity?.length}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={velocity} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="week"
              tickFormatter={v => v.slice(5)}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={false} tickLine={false}
            />
            <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              formatter={(v) => [v, '완료']}
              labelFormatter={l => `주 시작: ${l}`}
              contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
            />
            <Bar dataKey="done" name="완료" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="일별 처리량 (30일)" empty={!throughput?.length}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={throughput} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={v => v.slice(5)}
              interval={4}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={false} tickLine={false}
            />
            <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              formatter={(v) => [v, '완료']}
              contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
            />
            <Bar dataKey="done" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="리드 타임 분포 (생성→완료)" empty={!lead_time?.length}>
        <LeadTimeChart data={lead_time} />
      </ChartCard>

    </div>
  )
}
