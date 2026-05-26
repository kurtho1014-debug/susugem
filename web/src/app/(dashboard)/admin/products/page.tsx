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
import { Plus, Pencil, ImageIcon } from 'lucide-react'
import { ImageUploader } from '@/components/image-uploader'

type Product = {
  id: string
  name: string
  description: string | null
  price: number          // 售價（對客戶顯示）
  cost_price: number | null  // 成本價（業主內部）
  is_active: boolean
  notes: string | null
  images: string[]
  created_at: string
}

const emptyForm = {
  name: '', description: '', price: '', cost_price: '',
  notes: '', is_active: true, images: [] as string[],
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)

  const supabase = createClient()

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (data) setProducts(data)
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditing(product)
    setForm({
      name: product.name,
      description: product.description ?? '',
      price: String(product.price),
      cost_price: product.cost_price != null ? String(product.cost_price) : '',
      notes: product.notes ?? '',
      is_active: product.is_active,
      images: product.images ?? [],
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
    }

    const { error } = editing
      ? await supabase.from('products').update(payload).eq('id', editing.id)
      : await supabase.from('products').insert(payload)

    setSaving(false)
    if (!error) {
      setDialogOpen(false)
      fetchProducts()
    } else {
      alert('儲存失敗：' + error.message)
    }
  }

  // 利潤計算
  const margin = (p: Product) => {
    if (p.cost_price == null || p.cost_price === 0) return null
    return Math.round(((p.price - p.cost_price) / p.price) * 100)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">商品管理</h1>
          <p className="text-gray-500 text-sm mt-1">管理販售商品</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />新增商品
        </Button>
      </div>

      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>商品名稱</TableHead>
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
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-gray-400">載入中...</TableCell></TableRow>
            ) : products.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-gray-400">尚無商品</TableCell></TableRow>
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
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? '編輯商品' : '新增商品'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>商品名稱 *</Label>
              <Input placeholder="例：客製禮盒" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>

            {/* 售價 / 成本價並排 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  售價（NT$）
                  <span className="ml-1 text-xs text-gray-400 font-normal">客戶看到</span>
                </Label>
                <Input type="number" placeholder="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>
                  成本價（NT$）
                  <span className="ml-1 text-xs text-gray-400 font-normal">業主內部</span>
                </Label>
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
    </div>
  )
}
