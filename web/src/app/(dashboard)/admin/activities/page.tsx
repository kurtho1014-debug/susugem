'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, ExternalLink } from 'lucide-react'

type Activity = {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'active' | 'ended'
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
}

const statusLabel: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft:  { label: '草稿',   variant: 'outline' },
  active: { label: '進行中', variant: 'default' },
  ended:  { label: '已結束', variant: 'secondary' },
}

const emptyForm = { name: '', description: '', status: 'draft' as Activity['status'], start_date: '', end_date: '', notes: '' }

export default function ActivitiesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [form, setForm] = useState(emptyForm)

  const fetchActivities = async () => {
    setLoading(true)
    const { data } = await supabase.from('activities').select('*').order('created_at', { ascending: false })
    if (data) setActivities(data)
    setLoading(false)
  }

  useEffect(() => { fetchActivities() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (activity: Activity) => {
    setEditing(activity)
    setForm({
      name: activity.name,
      description: activity.description ?? '',
      status: activity.status,
      start_date: activity.start_date?.slice(0, 10) ?? '',
      end_date: activity.end_date?.slice(0, 10) ?? '',
      notes: activity.notes ?? '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      notes: form.notes || null,
    }

    const { error } = editing
      ? await supabase.from('activities').update(payload).eq('id', editing.id)
      : await supabase.from('activities').insert({ ...payload, status: 'draft' })

    setSaving(false)
    if (!error) {
      setDialogOpen(false)
      fetchActivities()
    } else {
      alert('儲存失敗：' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">活動管理</h1>
          <p className="text-gray-500 text-sm mt-1">建立並管理接單活動</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />建立活動
        </Button>
      </div>

      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>活動名稱</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>開始日期</TableHead>
              <TableHead>結束日期</TableHead>
              <TableHead>建立時間</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-gray-400">載入中...</TableCell>
              </TableRow>
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-gray-400">
                  還沒有活動，按右上角「建立活動」開始
                </TableCell>
              </TableRow>
            ) : activities.map(activity => (
              <TableRow
                key={activity.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => router.push(`/admin/activities/${activity.id}`)}
              >
                <TableCell className="font-medium">{activity.name}</TableCell>
                <TableCell>
                  <Badge variant={statusLabel[activity.status].variant}>
                    {statusLabel[activity.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-500">{activity.start_date?.slice(0, 10) ?? '—'}</TableCell>
                <TableCell className="text-gray-500">{activity.end_date?.slice(0, 10) ?? '—'}</TableCell>
                <TableCell className="text-gray-400">
                  {new Date(activity.created_at).toLocaleDateString('zh-TW')}
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2 justify-end">
                    <a
                      href={`/activity/${activity.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
                    >
                      前台 <ExternalLink className="h-3 w-3" />
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(activity)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 建立 / 編輯 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? '編輯活動' : '建立新活動'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>活動名稱 *</Label>
              <Input
                placeholder="例：五月清倉特賣"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {/* 編輯時才顯示狀態選擇 */}
            {editing && (
              <div className="space-y-2">
                <Label>狀態</Label>
                <Select value={form.status} onValueChange={v => v && setForm({ ...form, status: v as Activity['status'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="active">進行中</SelectItem>
                    <SelectItem value="ended">已結束</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>開始日期</Label>
                <Input type="date" value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>結束日期</Label>
                <Input type="date" value={form.end_date}
                  onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>說明</Label>
              <Textarea placeholder="活動說明（可空白）" rows={3} value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>備註</Label>
              <Textarea placeholder="業主自用備註" rows={2} value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? '儲存中...' : editing ? '儲存' : '建立'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
