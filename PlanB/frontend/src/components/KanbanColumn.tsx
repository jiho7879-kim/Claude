import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import KanbanCard from './KanbanCard'

const STATUS_COLORS = {
  todo: '#64748b', in_progress: '#6366f1', done: '#10b981', cancelled: '#374151',
}
const STATUS_LABELS = {
  todo: 'Todo', in_progress: 'In Progress', done: 'Done', cancelled: 'Cancelled',
}
const WIP_LIMITS = {
  in_progress: 5,
}

function SortableCard({ task, onCardClick, droppedId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners}>
      <KanbanCard task={task} onClick={onCardClick} isDragging={isDragging} isDropped={task.id === droppedId} />
    </div>
  )
}

export default function KanbanColumn({ status, tasks, onCardClick, droppedId }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const color = STATUS_COLORS[status]
  const wip = WIP_LIMITS[status]
  const isOverWip = wip && tasks.length > wip
  const isAtWip = wip && tasks.length === wip

  return (
    <div style={{ width: 264, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Column header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 2px' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
          {STATUS_LABELS[status]}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: isOverWip ? '#ef4444' : isAtWip ? '#f59e0b' : 'var(--text-muted)',
          background: isOverWip ? 'rgba(239,68,68,0.12)' : 'var(--bg-elevated)',
          padding: '1px 8px', borderRadius: 99,
          border: `1px solid ${isOverWip ? '#ef4444' : isAtWip ? '#f59e0b' : 'var(--border)'}`,
          transition: 'all 0.2s',
        }}>
          {tasks.length}{wip ? `/${wip}` : ''}
          {isOverWip && ' 🔴'}
        </span>
      </div>

      {/* WIP warning */}
      {isOverWip && (
        <div style={{ fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '4px 10px', textAlign: 'center' }}>
          WIP 한도 초과 — 먼저 완료하세요
        </div>
      )}

      {/* Drop zone */}
      <div ref={setNodeRef} style={{
        flex: 1, minHeight: 80, padding: 6, borderRadius: 12,
        background: isOver ? 'var(--accent-muted)' : 'var(--bg-surface)',
        border: `1px dashed ${isOver ? 'var(--accent)' : 'var(--border)'}`,
        transition: 'border-color 0.2s, background 0.2s',
      }}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableCard key={task.id} task={task} onCardClick={onCardClick} droppedId={droppedId} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 60, fontSize: 12, color: 'var(--text-muted)' }}>
            드래그하여 이동
          </div>
        )}
      </div>
    </div>
  )
}
