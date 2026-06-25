import { useState, useCallback } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'
import useToastStore from '../store/toastStore'
import { updateTask } from '../lib/workspaceApi'
import { useParams } from 'react-router-dom'

const STATUSES = ['todo', 'in_progress', 'done', 'cancelled']

const GROUP_OPTIONS = [
  { value: 'none', label: '그룹 없음' },
  { value: 'assignee', label: '담당자' },
  { value: 'priority', label: '우선순위' },
]
const PRIORITY_LABELS = { urgent: '⚡ 긴급', high: '↑ 높음', medium: '→ 보통', low: '↓ 낮음', null: '우선순위 없음' }

export default function KanbanBoard({ tasks, onTaskClick, onTaskUpdate }) {
  const { slug, projectId } = useParams()
  const toast = useToastStore((s) => s.add)
  const [activeDragId, setActiveDragId] = useState(null)
  const [droppedId, setDroppedId] = useState(null)
  const [groupBy, setGroupBy] = useState('none')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s && t.depth === 0)
    return acc
  }, {})

  const handleDragStart = ({ active }) => setActiveDragId(active.id)

  const handleDragEnd = useCallback(async ({ active, over }) => {
    setActiveDragId(null)
    if (!over) return
    const task = tasks.find((t) => t.id === active.id)
    if (!task) return

    const targetStatus = STATUSES.includes(over.id) ? over.id : tasks.find((t) => t.id === over.id)?.status
    if (!targetStatus || task.status === targetStatus) return

    onTaskUpdate?.({ ...task, status: targetStatus })
    try {
      const updated = await updateTask(slug, projectId, task.id, { status: targetStatus })
      onTaskUpdate?.(updated)
      setDroppedId(updated.id)
      setTimeout(() => setDroppedId(null), 600)
    } catch {
      onTaskUpdate?.(task)
      toast('상태 변경 실패', 'error')
    }
  }, [tasks, slug, projectId, onTaskUpdate, toast])

  const activeTask = activeDragId ? tasks.find((t) => t.id === activeDragId) : null

  // Build group keys based on groupBy selection
  const getGroups = () => {
    if (groupBy === 'none') return null
    const keySet = new Set()
    tasks.forEach(t => {
      if (t.depth !== 0) return
      const key = groupBy === 'assignee'
        ? (t.assignee ? (t.assignee.full_name || t.assignee.username || '담당자 없음') : '담당자 없음')
        : (t.priority ? (PRIORITY_LABELS[t.priority] ?? t.priority) : PRIORITY_LABELS['null'])
      keySet.add(key)
    })
    return [...keySet]
  }

  const groups = getGroups()

  const getTasksByStatusForGroup = (groupKey) => {
    return STATUSES.reduce((acc, s) => {
      acc[s] = tasks.filter(t => {
        if (t.status !== s || t.depth !== 0) return false
        if (groupBy === 'assignee') {
          const key = t.assignee ? (t.assignee.full_name || t.assignee.username || '담당자 없음') : '담당자 없음'
          return key === groupKey
        }
        const key = t.priority ? (PRIORITY_LABELS[t.priority] ?? t.priority) : PRIORITY_LABELS['null']
        return key === groupKey
      })
      return acc
    }, {})
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Group selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>그룹 기준:</span>
        {GROUP_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setGroupBy(opt.value)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, border: '1px solid', background: groupBy === opt.value ? 'var(--accent-muted)' : 'var(--bg-elevated)', borderColor: groupBy === opt.value ? 'var(--border-focus)' : 'var(--border)', color: groupBy === opt.value ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer' }}>
            {opt.label}
          </button>
        ))}
      </div>

      {groups === null ? (
        /* No grouping — original layout */
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', alignItems: 'flex-start' }}>
          {STATUSES.map((s) => (
            <KanbanColumn key={s} status={s} tasks={tasksByStatus[s]} onCardClick={onTaskClick} droppedId={droppedId} />
          ))}
        </div>
      ) : (
        /* Swimlane layout */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, overflowX: 'auto', paddingBottom: 16 }}>
          {groups.map(groupKey => {
            const grouped = getTasksByStatusForGroup(groupKey)
            return (
              <div key={groupKey}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, padding: '4px 8px', background: 'var(--bg-elevated)', borderRadius: 6, display: 'inline-block', border: '1px solid var(--border)' }}>
                  {groupKey}
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  {STATUSES.map(s => (
                    <KanbanColumn key={s} status={s} tasks={grouped[s]} onCardClick={onTaskClick} droppedId={droppedId} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <DragOverlay>
        {activeTask && <KanbanCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  )
}
