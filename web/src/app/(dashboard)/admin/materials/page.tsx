'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil, ImageIcon, Trash2, Settings2 } from 'lucide-react'
import { ImageUploader } from '@/components/image-uploader'

type Supplier = { id: string; name: string }
type Category = { id: string; name: string }
type Material = {
  id: string
  name: string
  unit: string
  unit_price: number
  stock_quantity: number
  supplier_id: string | null
  category_id: string | null
  notes: string | null
  images: string[]
  suppliers?: { name: string } | null
  material_categories?: { name: string } | null
}

const emptyForm = {
  name: '', unit: '個', unit_price: '', stock_quantity: '0',
  supplier_id: '', category_id: '', notes: '', images: [] as string[],
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // 包材 dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Material | null>(null)
  const [form, setForm] = useState(emptyForm)

  // 供應商管理 dialog
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [supplierName, setSupplierName] = useState('')
  const [supplierSaving, setSupplierSaving] = useState(false)

  // 類別管理 dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categorySaving, setCategorySaving] = useState(false)

  const supabase = createClient()

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: mats }, { data: sups }, { data: cats }] = await Promise.all([
      supabase.from('materials')
        .select('*, suppliers(name), material_categories(name)')
        .order('created_at', { ascending: false }),
      supabase.from('suppliers').select('id, name').order('name'),
      supabase.from('material_categories').select('id, name').order('name'),
    ])
    if (mats) setMaterials(mats as Material[])
    if (sups) setSuppliers(sups)
    if (cats) setCategories(cats)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  // ── 包材 CRUD ────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (m: Material) => {
    setEditing(m)
    setForm({
      name: m.name,
      unit: m.unit,
      unit_price: String(m.unit_price),
      stock_quantity: String(m.stock_quantity),
      supplier_id: m.supplier_id ?? '',
      category_id: m.category_id ?? '',
      notes: m.notes ?? '',
      images: m.images ?? [],
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      unit: form.unit,
      unit_price: parseFloat(form.unit_price) || 0,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      supplier_id: form.supplier_id || null,
      category_id: form.category_id || null,
      notes: form.notes || null,
      images: form.images,
    }
    const { error } = editing
      ? await supabase.from('materials').update(payload).eq('id', editing.id)
      : await supabase.from('materials').insert(payload)
    setSaving(false)
    if (!error) { setDialogOpen(false); fetchAll() }
    else alert('儲存失敗：' + error.message)
  }

  // ── 供應商 CRUD ───────────────────────────────────────────────────────────────

  const openSupplierDialog = () => {
    setEditingSupplier(null)
    setSupplierName('')
    setSupplierDialogOpen(true)
  }

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s)
    setSupplierName(s.name)
  }

  const saveSupplier = async () => {
    if (!supplierName.trim()) return
    setSupplierSaving(true)
    const { error } = editingSupplier
      ? await supabase.from('suppliers').update({ name: supplierName.trim() }).eq('id', editingSupplier.id)
      : await supabase.from('suppliers').insert({ name: supplierName.trim() })
    setSupplierSaving(false)
    if (!error) {
      setEditingSupplier(null)
      setSupplierName('')
      fetchAll()
    } else alert('儲存失敗：' + error.message)
  }

  const deleteSupplier = async (id: string) => {
    if (!confirm('確定刪除此供應商？')) return
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (!error) fetchAll()
    else alert('刪除失敗：' + error.message)
  }

  // ── 類別 CRUD ────────────────────────────────────────────────────────────────

  const openCategoryDialog = () => {
    setEditingCategory(null)
    setCategoryName('')
    setCategoryDialogOpen(true)
  }

  const openEditCategory = (c: Category) => {
    setEditingCategory(c)
    setCategoryName(c.name)
  }

  const saveCategory = async () => {
    if (!categoryName.trim()) return
    setCategorySaving(true)
    const { error } = editingCategory
      ? await supabase.from('material_categories').update({ name: categoryName.trim() }).eq('id', editingCategory.id)
      : await supabase.from('material_categories').insert({ name: categoryName.trim() })
    setCategorySaving(false)
    if (!error) {
      setEditingCategory(null)
      setCategoryName('')
      fetchAll()
    } else alert('儲存失敗：' + error.message)
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('確定刪除此類別？')) return
    const { error } = await supabase.from('material_categories').delete().eq('id', id)
    if (!error) fetchAll()
    else alert('刪除失敗：' + error.message)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">包材管理</h1>
          <p className="text-gray-500 text-sm mt-1">管理包材、供應商與類別</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openSupplierDialog}>
            <Settings2 className="h-4 w-4 mr-1.5" />供應商
          </Button>
          <Button variant="outline" onClick={openCategoryDialog}>
            <Settings2 className="h-4 w-4 mr-1.5" />類別
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />新增包材
          </Button>
        </div>
      </div>

      {/* 包材列表 */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>包材名稱</TableHead>
              <TableHead>類別</TableHead>
              <TableHead>供應商</TableHead>
              <TableHead>單位</TableHead>
              <TableHead>單價</TableHead>
              <TableHead>庫存</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-gray-400">載入中...</TableCell></TableRow>
            ) : materials.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-gray-400">尚無包材</TableCell></TableRow>
            ) : materials.map(m => (
              <TableRow key={m.id}>
                <TableCell>
                  {m.images?.[0]
                    ? <img src={m.images[0]} alt="" className="w-10 h-10 object-cover rounded-md border" />
                    : <div className="w-10 h-10 bg-gray-100 rounded-md border flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-300" /></div>
                  }
                </TableCell>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell className="text-gray-500">{m.material_categories?.name ?? <span className="text-gray-300">—</span>}</TableCell>
                <TableCell className="text-gray-500">{m.suppliers?.name ?? <span className="text-gray-300">—</span>}</TableCell>
                <TableCell>{m.unit}</TableCell>
                <TableCell>NT$ {m.unit_price.toLocaleString()}</TableCell>
                <TableCell>{m.stock_quantity.toLocaleString()}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── 包材 Dialog ─────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? '編輯包材' : '新增包材'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>包材名稱 *</Label>
              <Input placeholder="例：牛皮紙袋" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>供應商</Label>
                <Select value={form.supplier_id}
                  onValueChange={v => setForm({ ...form, supplier_id: v ?? '' })}>
                  <SelectTrigger>
                    <SelectValue>
                      {form.supplier_id
                        ? suppliers.find(s => s.id === form.supplier_id)?.name ?? '選擇供應商'
                        : '不指定'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">不指定</SelectItem>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>類別</Label>
                <Select value={form.category_id}
                  onValueChange={v => setForm({ ...form, category_id: v ?? '' })}>
                  <SelectTrigger>
                    <SelectValue>
                      {form.category_id
                        ? categories.find(c => c.id === form.category_id)?.name ?? '選擇類別'
                        : '不指定'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">不指定</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>單位</Label>
                <Input placeholder="個" value={form.unit}
                  onChange={e => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>單價</Label>
                <Input type="number" placeholder="0" value={form.unit_price}
                  onChange={e => setForm({ ...form, unit_price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>庫存</Label>
                <Input type="number" placeholder="0" value={form.stock_quantity}
                  onChange={e => setForm({ ...form, stock_quantity: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>備註</Label>
              <Textarea placeholder="備註" rows={2} value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>圖片</Label>
              <ImageUploader images={form.images}
                onChange={imgs => setForm({ ...form, images: imgs })}
                folder="materials" />
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

      {/* ── 供應商管理 Dialog ────────────────────────────── */}
      <Dialog open={supplierDialogOpen} onOpenChange={open => {
        setSupplierDialogOpen(open)
        if (!open) { setEditingSupplier(null); setSupplierName('') }
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>供應商管理</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {/* 列表 */}
            {suppliers.length > 0 && (
              <div className="border rounded-lg divide-y">
                {suppliers.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2">
                    {editingSupplier?.id === s.id ? (
                      <Input
                        className="h-7 text-sm flex-1 mr-2"
                        value={supplierName}
                        onChange={e => setSupplierName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveSupplier()}
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm flex-1">{s.name}</span>
                    )}
                    <div className="flex gap-1 shrink-0">
                      {editingSupplier?.id === s.id ? (
                        <>
                          <Button size="sm" className="h-7 text-xs" onClick={saveSupplier}
                            disabled={supplierSaving || !supplierName.trim()}>
                            {supplierSaving ? '...' : '存'}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7"
                            onClick={() => { setEditingSupplier(null); setSupplierName('') }}>
                            取消
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => openEditSupplier(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => deleteSupplier(s.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 新增 */}
            {!editingSupplier && (
              <div className="flex gap-2">
                <Input
                  placeholder="新供應商名稱"
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveSupplier()}
                />
                <Button onClick={saveSupplier} disabled={supplierSaving || !supplierName.trim()}>
                  {supplierSaving ? '...' : '新增'}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>關閉</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 類別管理 Dialog ──────────────────────────────── */}
      <Dialog open={categoryDialogOpen} onOpenChange={open => {
        setCategoryDialogOpen(open)
        if (!open) { setEditingCategory(null); setCategoryName('') }
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>類別管理</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {/* 列表 */}
            {categories.length > 0 && (
              <div className="border rounded-lg divide-y">
                {categories.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2">
                    {editingCategory?.id === c.id ? (
                      <Input
                        className="h-7 text-sm flex-1 mr-2"
                        value={categoryName}
                        onChange={e => setCategoryName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveCategory()}
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm flex-1">{c.name}</span>
                    )}
                    <div className="flex gap-1 shrink-0">
                      {editingCategory?.id === c.id ? (
                        <>
                          <Button size="sm" className="h-7 text-xs" onClick={saveCategory}
                            disabled={categorySaving || !categoryName.trim()}>
                            {categorySaving ? '...' : '存'}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7"
                            onClick={() => { setEditingCategory(null); setCategoryName('') }}>
                            取消
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => openEditCategory(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => deleteCategory(c.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 新增 */}
            {!editingCategory && (
              <div className="flex gap-2">
                <Input
                  placeholder="新類別名稱"
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveCategory()}
                />
                <Button onClick={saveCategory} disabled={categorySaving || !categoryName.trim()}>
                  {categorySaving ? '...' : '新增'}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>關閉</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
