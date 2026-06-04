'use client'

import { useState, useEffect } from 'react'
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Search, Trash2 } from 'lucide-react'

type Member = {
  id: string
  name: string
  phone: string | null
  email: string | null
  line_id: string | null
  ig_id: string | null
  address: string | null
  is_registered: boolean
  notes: string | null
  created_at: string
}

const emptyForm = {
  name: '', phone: '', email: '', line_id: '', ig_id: '', address: '', notes: '', is_registered: false,
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')

  const supabase = createClient()

  const fetchMembers = async () => {
    setLoading(true)
    let query = supabase.from('members').select('*').order('created_at', { ascending: false })
    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
    }
    const { data } = await query
    if (data) setMembers(data)
    setLoading(false)
  }

  useEffect(() => { fetchMembers() }, [search])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (m: Member) => {
    setEditing(m)
    setForm({
      name: m.name,
      phone: m.phone ?? '',
      email: m.email ?? '',
      line_id: m.line_id ?? '',
      ig_id: m.ig_id ?? '',
      address: m.address ?? '',
      notes: m.notes ?? '',
      is_registered: m.is_registered,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (m: Member) => {
    if (!confirm(`確定要刪除會員「${m.name}」？此操作無法復原。`)) return
    const { error } = await supabase.from('members').delete().eq('id', m.id)
    if (error) alert('刪除失敗：' + error.message)
    else fetchMembers()
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      line_id: form.line_id || null,
      ig_id: form.ig_id || null,
      address: form.address || null,
      notes: form.notes || null,
      is_registered: form.is_registered,
    }
    const { error } = editing
      ? await supabase.from('members').update(payload).eq('id', editing.id)
      : await supabase.from('members').insert(payload)
    setSaving(false)
    if (!error) { setDialogOpen(false); fetchMembers() }
    else alert('儲存失敗：' + error.message)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">會員管理</h1>
          <p className="text-gray-500 text-sm mt-1">管理所有客戶會員</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />新增會員</Button>
      </div>

      {/* 搜尋 */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="搜尋姓名或電話..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>姓名</TableHead>
              <TableHead>電話</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>LINE</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>建立時間</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">載入中...</TableCell></TableRow>
            ) : members.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">尚無會員</TableCell></TableRow>
            ) : members.map(m => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell>{m.phone ?? '—'}</TableCell>
                <TableCell>{m.email ?? '—'}</TableCell>
                <TableCell>{m.line_id ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={m.is_registered ? 'default' : 'outline'}>
                    {m.is_registered ? '已建檔' : '未建檔'}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-400">{new Date(m.created_at).toLocaleDateString('zh-TW')}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(m)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? '編輯會員' : '新增會員'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>姓名 *</Label>
              <Input placeholder="客戶姓名" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>電話</Label>
                <Input placeholder="09xx-xxx-xxx" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>LINE ID</Label>
                <Input placeholder="LINE ID" value={form.line_id} onChange={e => setForm({ ...form, line_id: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>IG ID</Label>
              <Input placeholder="Instagram 帳號" value={form.ig_id} onChange={e => setForm({ ...form, ig_id: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>地址</Label>
              <Input placeholder="收貨地址" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>備註</Label>
              <Textarea placeholder="業主備註" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_registered" checked={form.is_registered} onChange={e => setForm({ ...form, is_registered: e.target.checked })} />
              <Label htmlFor="is_registered">正式建檔會員</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? '儲存中...' : '儲存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
