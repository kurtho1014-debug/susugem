'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Trash2, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type AuthUser = {
  id: string
  email: string | undefined
  created_at: string
  last_sign_in_at: string | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' })
  const [formError, setFormError] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const supabase = createClient()

  // 取得目前登入的 user id（避免自己刪自己）
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null)
    })
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    if (data.users) setUsers(data.users)
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const openCreate = () => {
    setForm({ email: '', password: '', confirmPassword: '' })
    setFormError('')
    setDialogOpen(true)
  }

  const handleCreate = async () => {
    setFormError('')
    if (!form.email.trim() || !form.password) {
      setFormError('請填寫 Email 和密碼')
      return
    }
    if (form.password.length < 6) {
      setFormError('密碼至少 6 個字元')
      return
    }
    if (form.password !== form.confirmPassword) {
      setFormError('兩次密碼不一致')
      return
    }
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email.trim(), password: form.password }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.error) {
      setFormError(data.error)
    } else {
      setDialogOpen(false)
      fetchUsers()
    }
  }

  const handleDelete = async (user: AuthUser) => {
    if (user.id === currentUserId) {
      alert('不能刪除自己的帳號')
      return
    }
    if (!confirm(`確定要刪除帳號 ${user.email}？此操作無法復原。`)) return
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id }),
    })
    const data = await res.json()
    if (data.error) alert('刪除失敗：' + data.error)
    else fetchUsers()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">管理員帳號</h1>
          <p className="text-gray-500 text-sm mt-1">可登入後台的帳號列表</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />新增帳號
        </Button>
      </div>

      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>建立時間</TableHead>
              <TableHead>最後登入</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gray-400">載入中...</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gray-400">尚無帳號</TableCell>
              </TableRow>
            ) : users.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0" />
                    {u.email ?? '—'}
                  </div>
                </TableCell>
                <TableCell>
                  {u.id === currentUserId
                    ? <Badge variant="default">目前登入</Badge>
                    : <Badge variant="outline">一般</Badge>
                  }
                </TableCell>
                <TableCell className="text-gray-400 text-sm">
                  {new Date(u.created_at).toLocaleDateString('zh-TW')}
                </TableCell>
                <TableCell className="text-gray-400 text-sm">
                  {u.last_sign_in_at
                    ? new Date(u.last_sign_in_at).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '從未登入'}
                </TableCell>
                <TableCell>
                  {u.id !== currentUserId && (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(u)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 新增帳號 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>新增管理員帳號</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>密碼 *</Label>
              <Input
                type="password"
                placeholder="至少 6 個字元"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>確認密碼 *</Label>
              <Input
                type="password"
                placeholder="再輸入一次密碼"
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            {formError && (
              <p className="text-sm text-red-500">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? '建立中...' : '建立帳號'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
