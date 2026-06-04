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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil, ImageIcon, Trash2, Settings2 } from 'lucide-react'
import { ImageUploader } from '@/components/image-uploader'

type Supplier = { id: string; name: string }
type Category = { id: string; name: string }

type Product = {
  id: string
  name: string
  description: string | null
  price: number
  cost_price: number | null
  is_active: boolean
  notes: string | null
  images: string[]
  supplier_id: string | null
  category_id: string | null
  suppliers?: { name: string } | null
  product_categories?: { name: string } | null
  created_at: string
}

const emptyForm = {
  name: '', description: '', price: '', cost_price: '',
  notes: '', is_active: true, images: [] as string[],
  supplier_id: '', category_id: '',
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // 商品 dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
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
    const [{ data: prods }, { data: sups }, { data: cats }] = await Promise.all([
      supabase.from('products')
        .select('*, suppliers(name), product_categories(name)')
        .order('created_at', { ascending: false }),
      supabase.from('suppliers').select('id, name').order('name'),
      supabase.from('product_categories').select('id, name').order('name'),
    ])
    if (prods) setProducts(prods as Product[])
    if (sups) setSuppliers(sups)
    if (cats) setCategories(cats)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  // ── 商品 CRUD ────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      name: p.name,
      description: p.description ?? '',
      price: String(p.price),
      cost_price: p.cost_price != null ? String(p.cost_price) : '',
      notes: p.notes ?? '',
      is_active: p.is_active,
      images: p.images ?? [],
      supplier_id: p.supplier_id ?? '',
      category_id: p.category_id ?? '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      price: parseFloat(form.price) || 0,
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      notes: form.notes || null,
      is_active: form.is_active,
      images: form.images,
      supplier_id: form.supplier_id || null,
      category_id: form.category_id || null,
    }
    const { error } = editing
      ? await supabase.from('products').update(payload).eq('id', editing.id)
      : await supabase.from('products').insert(payload)
    setSaving(false)
    if (!error) { setDialogOpen(false); fetchAll() }
    else alert('儲存失敗：' + error.message)
  }

  const handleDelete = async (p: Product) => {
    if (!confirm(`確定要刪除商品「${p.name}」？`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (error) alert('刪除失敗：' + error.message)
    else fetchAll()
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
    if (!error) { setEditingSupplier(null); setSupplierName(''); fetchAll() }
    else alert('儲存失敗：' + error.message)
  }

  const deleteSupplier = async (id: string) => {
    if (!confirm('確定刪除此供應商？')) return
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (!error) fetchAll()
    else alert('刪除失敗：' + error.message)
  }

  // ── 類別 CRUD ─────────────────────────────────────────────────────────────────

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
      ? await supabase.from('product_categories').update({ name: categoryName.trim() }).eq('id', editingCategory.id)
      : await supabase.from('product_categories').insert({ name: categoryName.trim() })
    setCategorySaving(false)
    if (!error) { setEditingCategory(null); setCategoryName(''); fetchAll() }
    else alert('儲存失敗：' + error.message)
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('確定刪除此類別？')) return
    const { error } = await supabase.from('product_categories').delete().eq('id', id)
    if (!error) fetchAll()
    else alert('刪除失敗：' + error.message)
  }

  // ── 利潤計算 ─────────────────────────────────────────────────────────────────

  const margin = (p: Product) => {
    if (p.cost_price == null || p.cost_price === 0) return null
    return Math.round(((p.price - p.cost_price) / p.price) * 100)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">商品管理</h1>
          <p className="text-gray-500 text-sm mt-1">管理販售商品、供應商與類別</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openSupplierDialog}>
            <Settings2 className="h-4 w-4 mr-1.5" />供應商
          </Button>
          <Button variant="outline" onClick={openCategoryDialog}>
            <Settings2 className="h-4 w-4 mr-1.5" />類別
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />新增商品
          </Button>
        </div>
      </div>

      {/* 商品列表 */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>商品名稱</TableHead>
              <TableHead>類別</TableHead>
              <TableHead>供應商</TableHead>
              <TableHead>售價</TableHead>
              <TableHead>成本價</TableHead>
              <TableHead>毛利率</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>建立時間</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-10 text-gray-400">載入中...</TableCell></TableRow>
            ) : products.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-10 text-gray-400">尚無商品</TableCell></TableRow>
            ) : products.map(p => {
              const m = margin(p)
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.images?.[0]
                      ? <img src={p.images[0]} alt="" className="w-10 h-10 object-cover rounded-md border" />
                      : <div className="w-10 h-10 bg-gray-100 rounded-md border flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-300" /></div>
                    }
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-gray-500">
                    {p.product_categories?.name ?? <span className="text-gray-300">—</span>}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {p.suppliers?.name ?? <span className="text-gray-300">—</span>}
                  </TableCell>
                  <TableCell className="font-medium">NT$ {p.price.toLocaleString()}</TableCell>
                  <TableCell className="text-gray-500">
                    {p.cost_price != null ? `NT$ ${p.cost_price.toLocaleString()}` : <span className="text-gray-300">—</span>}
                  </TableCell>
                  <TableCell>
                    {m != null ? (
                      <span className={`text-sm font-medium ${m >= 30 ? 'text-green-600' : m >= 10 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {m}%
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? 'default' : 'secondary'}>
                      {p.is_active ? '上架' : '下架'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-400">{new Date(p.created_at).toLocaleDateString('zh-TW')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p)}>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── 商品 Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? '編輯商品' : '新增商品'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>商品名稱 *</Label>
              <Input placeholder="例：客製禮盒" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>

            {/* 供應商 / 類別 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>供應商</Label>
                <Select
                  value={form.supplier_id}
                  onValueChange={v => setForm({ ...form, supplier_id: v ?? '' })}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {form.supplier_id
                        ? suppliers.find(s => s.id === form.supplier_id)?.name ?? '選擇供應商'
                        : '不指定'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">不指定</SelectItem>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>類別</Label>
                <Select
                  value={form.category_id}
                  onValueChange={v => setForm({ ...form, category_id: v ?? '' })}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {form.category_id
                        ? categories.find(c => c.id === form.category_id)?.name ?? '選擇類別'
                        : '不指定'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">不指定</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 售價 / 成本價 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>售價（NT$）<span className="ml-1 text-xs text-gray-400 font-normal">客戶看到</span></Label>
                <Input type="number" placeholder="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>成本價（NT$）<span className="ml-1 text-xs text-gray-400 font-normal">業主內部</span></Label>
                <Input type="number" placeholder="選填" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} />
              </div>
            </div>

            {/* 即時毛利預覽 */}
            {form.price && form.cost_price && parseFloat(form.price) > 0 && (
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm flex justify-between">
                <span className="text-gray-500">毛利</span>
                <span className="font-medium">
                  NT$ {(parseFloat(form.price) - parseFloat(form.cost_price)).toLocaleString()}
                  <span className="text-gray-400 ml-2">
                    ({Math.round(((parseFloat(form.price) - parseFloat(form.cost_price)) / parseFloat(form.price)) * 100)}%)
                  </span>
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label>商品說明</Label>
              <Textarea placeholder="商品描述（客戶可見）" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>備註</Label>
              <Textarea placeholder="內部備註" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              <Label htmlFor="is_active">上架</Label>
            </div>
            <div className="space-y-2">
              <Label>圖片</Label>
              <ImageUploader
                images={form.images}
                onChange={imgs => setForm({ ...form, images: imgs })}
                folder="products"
              />
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

      {/* ── 供應商管理 Dialog ── */}
      <Dialog open={supplierDialogOpen} onOpenChange={open => {
        setSupplierDialogOpen(open)
        if (!open) { setEditingSupplier(null); setSupplierName('') }
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>供應商管理</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
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

      {/* ── 類別管理 Dialog ── */}
      <Dialog open={categoryDialogOpen} onOpenChange={open => {
        setCategoryDialogOpen(open)
        if (!open) { setEditingCategory(null); setCategoryName('') }
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>類別管理</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
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
