'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Search, ChevronDown, Pencil, X } from 'lucide-react'

type Member = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
}

type Order = {
  id: string
  customer_name: string
  customer_phone: string | null
  customer_address: string | null
  order_status: string
  payment_status: string
  payment_method: string | null
  delivery_fee: number
  tracking_number: string | null
  subtotal: number
  total: number
  notes: string | null
  extra_expense: number | null
  extra_expense_note: string | null
  created_at: string
  activities?: { name: string } | null
  delivery_methods?: { name: string } | null
  shipped_at: string | null
  paid_at: string | null
  order_items?: {
    id: string
    product_id: string | null
    product_name: string
    quantity: number
    unit_price: number
    subtotal: number
    wrist_size: string | null
  }[]
}

type ItemForm = {
  id: string | null
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  wrist_size: string
}

type OrderMaterial = {
  id: string
  material_id: string
  quantity: number
  notes: string | null
  materials: { name: string; unit: string }
}

type Material = { id: string; name: string; unit: string }

type Product = { id: string; name: string; price: number }
type DeliveryMethod = { id: string; name: string; default_fee: number }

type FreeItem = { product_id: string; product_name: string; quantity: number; unit_price: number; wrist_size: string }
type FreeMaterial = { material_id: string; material_name: string; unit: string; quantity: number; notes: string }

type CreateActivityProduct = {
  id: string; product_id: string; custom_price: number; stock_limit: number | null
  products: { name: string }
}

type CreateDeliveryMethod = {
  id: string; delivery_method_id: string; custom_fee: number | null
  delivery_methods: { name: string; default_fee: number }
}

const orderStatusOptions = [
  { value: 'consulting', label: '溝通中',  variant: 'outline' },
  { value: 'pending',    label: '待處理',  variant: 'outline' },
  { value: 'confirmed',  label: '已確認',  variant: 'secondary' },
  { value: 'processing', label: '製作中',  variant: 'default' },
  { value: 'completed',  label: '已完成',  variant: 'default' },
  { value: 'cancelled',  label: '已取消',  variant: 'destructive' },
] as const

const paymentMethodOptions = [
  { value: 'transfer',  label: '銀行轉帳' },
  { value: 'line_pay',  label: 'LINE Pay' },
  { value: 'cod',       label: '貨到付款' },
  { value: 'shopee',    label: '蝦皮付款' },
  { value: 'website',   label: '官網付款' },
] as const

const paymentStatusOptions = [
  { value: 'unpaid',   label: '未付款', variant: 'destructive' },
  { value: 'paid',     label: '已付款', variant: 'default' },
  { value: 'refunded', label: '已退款', variant: 'secondary' },
] as const

function getOrderStatusStyle(status: string) {
  return orderStatusOptions.find(o => o.value === status) ?? orderStatusOptions[0]
}

function getPaymentStatusStyle(status: string) {
  return paymentStatusOptions.find(o => o.value === status) ?? paymentStatusOptions[0]
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [activities, setActivities] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingOrder, setEditingOrder] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '' })

  // 編輯商品
  const [editingItems, setEditingItems] = useState(false)
  const [itemForms, setItemForms] = useState<ItemForm[]>([])
  const [itemsSaving, setItemsSaving] = useState(false)
  const [addItemSearch, setAddItemSearch] = useState('')
  const [addItemResults, setAddItemResults] = useState<Product[]>([])
  const [addItemOpen, setAddItemOpen] = useState(false)

  // 包材
  const [orderMaterials, setOrderMaterials] = useState<OrderMaterial[]>([])
  const [allMaterials, setAllMaterials] = useState<Material[]>([])
  const [materialForm, setMaterialForm] = useState({ material_id: '', quantity: '1', notes: '' })
  const [addingMaterial, setAddingMaterial] = useState(false)
  const [materialSaving, setMaterialSaving] = useState(false)

  // 新增訂單
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createActivityId, setCreateActivityId] = useState('')
  const [createProducts, setCreateProducts] = useState<CreateActivityProduct[]>([])
  const [createDeliveryMethods, setCreateDeliveryMethods] = useState<CreateDeliveryMethod[]>([])
  const [createQuantities, setCreateQuantities] = useState<Record<string, number>>({})
  const [createDeliveryId, setCreateDeliveryId] = useState('')
  const [createCustomer, setCreateCustomer] = useState({ name: '', phone: '', email: '', address: '', notes: '' })
  const [createPaymentMethod, setCreatePaymentMethod] = useState('')
  const [createExpense, setCreateExpense] = useState({ amount: '', note: '' })
  const [createSaving, setCreateSaving] = useState(false)

  // 會員搜尋
  const [memberResults, setMemberResults] = useState<Member[]>([])
  const [memberActiveField, setMemberActiveField] = useState<'name' | 'phone' | null>(null)

  // 活動模式運費（可手動覆蓋）
  const [createDeliveryFee, setCreateDeliveryFee] = useState('0')

  // 自由模式
  const [createMode, setCreateMode] = useState<'activity' | 'free'>('free')
  const [allDeliveryMethods, setAllDeliveryMethods] = useState<DeliveryMethod[]>([])
  const [freeDeliveryId, setFreeDeliveryId] = useState('')
  const [freeDeliveryFee, setFreeDeliveryFee] = useState('0')
  const [freeItems, setFreeItems] = useState<FreeItem[]>([])
  const [freeProductSearch, setFreeProductSearch] = useState('')
  const [freeProductResults, setFreeProductResults] = useState<Product[]>([])
  const [freeProductSearchOpen, setFreeProductSearchOpen] = useState(false)
  const [freeMaterials, setFreeMaterials] = useState<FreeMaterial[]>([])
  const [freeMaterialSearch, setFreeMaterialSearch] = useState('')
  const [freeMaterialResults, setFreeMaterialResults] = useState<Material[]>([])
  const [freeMaterialSearchOpen, setFreeMaterialSearchOpen] = useState(false)

  // 篩選
  const [searchName, setSearchName] = useState('')
  const [filterActivity, setFilterActivity] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all')

  const supabase = createClient()

  const fetchOrders = async () => {
    setLoading(true)
    let query = supabase
      .from('orders')
      .select(`
        *,
        activities(name),
        delivery_methods(name),
        order_items(id, product_id, product_name, quantity, unit_price, subtotal, wrist_size)
      `)
      .order('created_at', { ascending: false })

    if (filterActivity !== 'all') query = query.eq('activity_id', filterActivity)
    if (filterStatus !== 'all') query = query.eq('order_status', filterStatus)
    if (filterPaymentStatus !== 'all') query = query.eq('payment_status', filterPaymentStatus)

    const { data, error } = await query
    if (!error && data) setOrders(data as Order[])
    setLoading(false)
  }

  const fetchActivities = async () => {
    const { data } = await supabase.from('activities').select('id, name').order('created_at', { ascending: false })
    if (data) setActivities(data)
  }

  const fetchAllMaterials = async () => {
    const { data } = await supabase.from('materials').select('id, name, unit').order('name')
    if (data) setAllMaterials(data)
  }

  const fetchAllDeliveryMethods = async () => {
    const { data } = await supabase.from('delivery_methods').select('id, name, default_fee').eq('is_active', true).order('name')
    if (data) setAllDeliveryMethods(data)
  }

  const fetchOrderMaterials = async (orderId: string) => {
    const { data } = await supabase
      .from('order_materials')
      .select('id, material_id, quantity, notes, materials(name, unit)')
      .eq('order_id', orderId)
      .order('created_at')
    if (data) setOrderMaterials(data as unknown as OrderMaterial[])
  }

  const openOrder = (order: Order) => {
    setSelectedOrder(order)
    setEditingOrder(false)
    setEditingItems(false)
    setAddingMaterial(false)
    setMaterialForm({ material_id: '', quantity: '1', notes: '' })
    fetchOrderMaterials(order.id)
  }

  const startEditItems = () => {
    if (!selectedOrder) return
    setItemForms(
      (selectedOrder.order_items ?? []).map(i => ({
        id: i.id,
        product_id: i.product_id ?? null,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        wrist_size: i.wrist_size ?? '',
      }))
    )
    setAddItemSearch('')
    setAddItemResults([])
    setAddItemOpen(false)
    setEditingItems(true)
  }

  const searchAddItems = async (q: string) => {
    if (!q.trim()) { setAddItemResults([]); return }
    const { data } = await supabase.from('products').select('id, name, price').ilike('name', `%${q}%`).eq('is_active', true).limit(8)
    if (data) setAddItemResults(data)
  }

  const addItemToForms = (p: Product) => {
    setItemForms(prev => {
      const existing = prev.find(i => i.product_id === p.id)
      if (existing) return prev.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { id: null, product_id: p.id, product_name: p.name, quantity: 1, unit_price: p.price, wrist_size: '' }]
    })
    setAddItemSearch('')
    setAddItemResults([])
    setAddItemOpen(false)
  }

  const saveItems = async () => {
    if (!selectedOrder) return
    setItemsSaving(true)

    const originalIds = new Set((selectedOrder.order_items ?? []).map(i => i.id))
    const currentIds = new Set(itemForms.filter(i => i.id).map(i => i.id!))
    const toDelete = [...originalIds].filter(id => !currentIds.has(id))

    await Promise.all([
      toDelete.length > 0
        ? supabase.from('order_items').delete().in('id', toDelete)
        : Promise.resolve(),
      ...itemForms.filter(i => i.id).map(i =>
        supabase.from('order_items').update({
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.quantity * i.unit_price,
          wrist_size: i.wrist_size || null,
        }).eq('id', i.id!)
      ),
    ])

    const newItems = itemForms.filter(i => !i.id)
    if (newItems.length > 0) {
      await supabase.from('order_items').insert(newItems.map(i => ({
        order_id: selectedOrder.id,
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.quantity * i.unit_price,
        wrist_size: i.wrist_size || null,
      })))
    }

    const subtotal = itemForms.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const total = subtotal + selectedOrder.delivery_fee
    await supabase.from('orders').update({ subtotal, total }).eq('id', selectedOrder.id)

    setSelectedOrder({
      ...selectedOrder,
      subtotal,
      total,
      order_items: itemForms.map(i => ({
        id: i.id ?? '',
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.quantity * i.unit_price,
        wrist_size: i.wrist_size || null,
      })),
    })
    setItemsSaving(false)
    setEditingItems(false)
    fetchOrders()
  }

  const startEditOrder = () => {
    if (!selectedOrder) return
    setEditForm({
      name: selectedOrder.customer_name,
      phone: selectedOrder.customer_phone ?? '',
      address: selectedOrder.customer_address ?? '',
    })
    setEditingOrder(true)
  }

  const saveEditOrder = async () => {
    if (!selectedOrder) return
    setSaving(true)
    const { error } = await supabase.from('orders').update({
      customer_name: editForm.name.trim(),
      customer_phone: editForm.phone.trim() || null,
      customer_address: editForm.address.trim() || null,
    }).eq('id', selectedOrder.id)
    setSaving(false)
    if (error) { alert('儲存失敗：' + error.message); return }
    setSelectedOrder({
      ...selectedOrder,
      customer_name: editForm.name.trim(),
      customer_phone: editForm.phone.trim() || null,
      customer_address: editForm.address.trim() || null,
    })
    setEditingOrder(false)
    fetchOrders()
  }

  const addOrderMaterial = async () => {
    if (!selectedOrder || !materialForm.material_id) return
    setMaterialSaving(true)
    const { error } = await supabase.from('order_materials').insert({
      order_id: selectedOrder.id,
      material_id: materialForm.material_id,
      quantity: parseInt(materialForm.quantity) || 1,
      notes: materialForm.notes || null,
    })
    setMaterialSaving(false)
    if (error) { alert('新增失敗：' + error.message); return }
    setAddingMaterial(false)
    setMaterialForm({ material_id: '', quantity: '1', notes: '' })
    fetchOrderMaterials(selectedOrder.id)
  }

  const removeOrderMaterial = async (id: string) => {
    if (!confirm('確定移除此包材？')) return
    await supabase.from('order_materials').delete().eq('id', id)
    if (selectedOrder) fetchOrderMaterials(selectedOrder.id)
  }

  useEffect(() => {
    fetchActivities()
    fetchAllMaterials()
    fetchAllDeliveryMethods()
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [filterActivity, filterStatus, filterPaymentStatus])

  const searchProducts = async (q: string) => {
    if (!q.trim()) { setFreeProductResults([]); return }
    const { data } = await supabase.from('products').select('id, name, price').ilike('name', `%${q}%`).eq('is_active', true).limit(8)
    if (data) setFreeProductResults(data)
  }

  const toggleProductDropdown = async () => {
    if (freeProductSearchOpen) {
      setFreeProductSearchOpen(false)
      return
    }
    if (freeProductSearch.trim()) {
      setFreeProductSearchOpen(true)
      return
    }
    const { data } = await supabase.from('products').select('id, name, price').eq('is_active', true).order('name').limit(50)
    if (data) setFreeProductResults(data)
    setFreeProductSearchOpen(true)
  }

  const addFreeItem = (p: Product) => {
    setFreeItems(prev => {
      const existing = prev.find(i => i.product_id === p.id)
      if (existing) return prev.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product_id: p.id, product_name: p.name, quantity: 1, unit_price: p.price, wrist_size: '' }]
    })
    setFreeProductSearch('')
    setFreeProductResults([])
    setFreeProductSearchOpen(false)
  }

  const searchFreeMaterials = async (q: string) => {
    if (!q.trim()) { setFreeMaterialResults([]); return }
    const { data } = await supabase.from('materials').select('id, name, unit').ilike('name', `%${q}%`).limit(8)
    if (data) setFreeMaterialResults(data)
  }

  const addFreeMaterial = (m: Material) => {
    setFreeMaterials(prev => {
      const existing = prev.find(i => i.material_id === m.id)
      if (existing) return prev.map(i => i.material_id === m.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { material_id: m.id, material_name: m.name, unit: m.unit, quantity: 1, notes: '' }]
    })
    setFreeMaterialSearch('')
    setFreeMaterialResults([])
    setFreeMaterialSearchOpen(false)
  }

  const searchMembers = async (q: string) => {
    if (!q.trim()) { setMemberResults([]); return }
    const { data } = await supabase
      .from('members')
      .select('id, name, phone, email, address')
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(8)
    if (data) setMemberResults(data)
  }

  const importMember = (m: Member) => {
    setCreateCustomer(prev => ({
      ...prev,
      name: m.name,
      phone: m.phone ?? prev.phone,
      email: m.email ?? prev.email,
      address: m.address ?? prev.address,
    }))
    setMemberResults([])
    setMemberActiveField(null)
  }

  // 新增訂單
  const openCreate = () => {
    setCreateDialogOpen(true)
    setCreateActivityId('')
    setCreateProducts([])
    setCreateDeliveryMethods([])
    setCreateQuantities({})
    setCreateDeliveryId('')
    setCreateCustomer({ name: '', phone: '', email: '', address: '', notes: '' })
    setCreatePaymentMethod('')
    setCreateExpense({ amount: '', note: '' })
    setMemberResults([])
    setMemberActiveField(null)
    setCreateDeliveryFee('0')
    setCreateMode('free')
    setFreeItems([])
    setFreeMaterials([])
    setFreeDeliveryId('')
    setFreeDeliveryFee('0')
    setFreeProductSearch('')
    setFreeProductResults([])
    setFreeMaterialSearch('')
    setFreeMaterialResults([])
  }

  const fetchActivityData = async (activityId: string) => {
    const [{ data: prods }, { data: dms }] = await Promise.all([
      supabase.from('activity_products')
        .select('id, product_id, custom_price, stock_limit, products(name)')
        .eq('activity_id', activityId).order('sort_order'),
      supabase.from('activity_delivery_methods')
        .select('id, delivery_method_id, custom_fee, delivery_methods(name, default_fee)')
        .eq('activity_id', activityId),
    ])
    if (prods) setCreateProducts(prods as unknown as CreateActivityProduct[])
    if (dms) setCreateDeliveryMethods(dms as unknown as CreateDeliveryMethod[])
    setCreateQuantities({})
    setCreateDeliveryId('')
  }

  const handleCreateOrder = async () => {
    if (!createCustomer.name.trim() || !createCustomer.phone.trim() || !createDeliveryId || !createActivityId) return
    const selectedDm = createDeliveryMethods.find(d => d.id === createDeliveryId)
    const deliveryFee = parseFloat(createDeliveryFee) || 0
    const subtotal = createProducts.reduce((s, ap) => s + (createQuantities[ap.product_id] ?? 0) * ap.custom_price, 0)
    const total = subtotal + deliveryFee
    setCreateSaving(true)
    const { data: orderData, error: orderErr } = await supabase.from('orders').insert({
      activity_id: createActivityId,
      customer_name: createCustomer.name.trim(),
      customer_phone: createCustomer.phone.trim(),
      customer_email: createCustomer.email.trim() || null,
      customer_address: createCustomer.address.trim() || null,
      delivery_method_id: selectedDm?.delivery_method_id,
      delivery_fee: deliveryFee,
      subtotal, total,
      notes: createCustomer.notes.trim() || null,
      extra_expense: parseFloat(createExpense.amount) || null,
      extra_expense_note: createExpense.note.trim() || null,
      payment_method: createPaymentMethod || null,
      order_status: 'pending',
      payment_status: 'unpaid',
    }).select().single()
    if (orderErr || !orderData) {
      alert('建立失敗：' + (orderErr?.message ?? '未知錯誤'))
      setCreateSaving(false)
      return
    }
    const items = createProducts.filter(ap => (createQuantities[ap.product_id] ?? 0) > 0).map(ap => ({
      order_id: orderData.id,
      product_id: ap.product_id,
      product_name: ap.products.name,
      quantity: createQuantities[ap.product_id],
      unit_price: ap.custom_price,
      subtotal: createQuantities[ap.product_id] * ap.custom_price,
    }))
    if (items.length > 0) await supabase.from('order_items').insert(items)
    setCreateSaving(false)
    setCreateDialogOpen(false)
    fetchOrders()
  }

  const handleCreateFreeOrder = async () => {
    if (!createCustomer.name.trim() || !createCustomer.phone.trim()) return
    const dm = allDeliveryMethods.find(d => d.id === freeDeliveryId)
    const deliveryFee = parseFloat(freeDeliveryFee) || 0
    const subtotal = freeItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const total = subtotal + deliveryFee
    setCreateSaving(true)
    const { data: orderData, error: orderErr } = await supabase.from('orders').insert({
      activity_id: null,
      customer_name: createCustomer.name.trim(),
      customer_phone: createCustomer.phone.trim(),
      customer_email: createCustomer.email.trim() || null,
      customer_address: createCustomer.address.trim() || null,
      delivery_method_id: dm?.id ?? null,
      delivery_fee: deliveryFee,
      subtotal, total,
      notes: createCustomer.notes.trim() || null,
      extra_expense: parseFloat(createExpense.amount) || null,
      extra_expense_note: createExpense.note.trim() || null,
      payment_method: createPaymentMethod || null,
      order_status: 'pending',
      payment_status: 'unpaid',
    }).select().single()
    if (orderErr || !orderData) {
      alert('建立失敗：' + (orderErr?.message ?? '未知錯誤'))
      setCreateSaving(false)
      return
    }
    if (freeItems.length > 0) {
      await supabase.from('order_items').insert(freeItems.map(i => ({
        order_id: orderData.id,
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.quantity * i.unit_price,
        wrist_size: i.wrist_size || null,
      })))
    }
    if (freeMaterials.length > 0) {
      await supabase.from('order_materials').insert(freeMaterials.map(m => ({
        order_id: orderData.id,
        material_id: m.material_id,
        quantity: m.quantity,
        notes: m.notes || null,
      })))
    }
    setCreateSaving(false)
    setCreateDialogOpen(false)
    fetchOrders()
  }

  const deleteOrder = async () => {
    if (!selectedOrder) return
    if (!confirm(`確定要刪除「${selectedOrder.customer_name}」的訂單？此操作無法復原。`)) return
    const { error } = await supabase.from('orders').delete().eq('id', selectedOrder.id)
    if (error) { alert('刪除失敗：' + error.message); return }
    setSelectedOrder(null)
    fetchOrders()
  }

  // 更新訂單（付款狀態改為 paid 時自動填今日為付款日期）
  const updateOrder = async (field: Partial<Order>) => {
    if (!selectedOrder) return
    setSaving(true)
    const payload = { ...field }
    if (field.payment_status === 'paid' && !selectedOrder.paid_at) {
      payload.paid_at = new Date().toISOString().slice(0, 10)
    }
    const { error } = await supabase
      .from('orders')
      .update(payload)
      .eq('id', selectedOrder.id)

    if (!error) {
      setSelectedOrder({ ...selectedOrder, ...payload })
      fetchOrders()
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">訂單管理</h1>
          <p className="text-gray-500 text-sm mt-1">查看與管理所有訂單</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />新增訂單</Button>
      </div>

      {/* 篩選 */}
      <div className="flex flex-wrap gap-3">
        {/* 客戶姓名搜尋 */}
        <div className="relative w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="搜尋客戶姓名..."
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
          />
          {searchName && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setSearchName('')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 活動篩選 */}
        <div className="w-44">
          <Select value={filterActivity} onValueChange={v => setFilterActivity(v ?? 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="所有活動" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有活動</SelectItem>
              {activities.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 訂單狀態 */}
        <div className="w-36">
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v ?? 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="訂單狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有訂單狀態</SelectItem>
              {orderStatusOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 付款狀態 */}
        <div className="w-36">
          <Select value={filterPaymentStatus} onValueChange={v => setFilterPaymentStatus(v ?? 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="付款狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有付款狀態</SelectItem>
              {paymentStatusOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 訂單列表 */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>客戶姓名</TableHead>
              <TableHead>活動</TableHead>
              <TableHead>訂單狀態</TableHead>
              <TableHead>付款狀態</TableHead>
              <TableHead>運費</TableHead>
              <TableHead>總金額</TableHead>
              <TableHead>建立時間</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              const filtered = searchName.trim()
                ? orders.filter(o => o.customer_name.includes(searchName.trim()))
                : orders
              return loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-gray-400">載入中...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-gray-400">沒有符合的訂單</TableCell>
                </TableRow>
              ) : filtered.map(order => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => openOrder(order)}
                >
                  <TableCell className="font-medium">{order.customer_name}</TableCell>
                  <TableCell className="text-gray-500">{order.activities?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={getOrderStatusStyle(order.order_status).variant as any}>
                      {getOrderStatusStyle(order.order_status).label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPaymentStatusStyle(order.payment_status).variant as any}>
                      {getPaymentStatusStyle(order.payment_status).label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {order.delivery_fee > 0 ? `NT$ ${order.delivery_fee.toLocaleString()}` : '免運'}
                  </TableCell>
                  <TableCell>NT$ {order.total.toLocaleString()}</TableCell>
                  <TableCell className="text-gray-400">
                    {new Date(order.created_at).toLocaleDateString('zh-TW')}
                  </TableCell>
                </TableRow>
              ))
            })()}
          </TableBody>
        </Table>
      </div>

      {/* 訂單詳情 Dialog */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>訂單詳情</DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              {/* 客戶資訊 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-500">客戶資訊</p>
                  {!editingOrder ? (
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={startEditOrder}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />編輯
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 px-3" disabled={saving} onClick={saveEditOrder}>
                        {saving ? '儲存中...' : '儲存'}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditingOrder(false)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {editingOrder ? (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">姓名</Label>
                      <Input className="h-8 text-sm" value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">電話</Label>
                      <Input className="h-8 text-sm" value={editForm.phone}
                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">地址</Label>
                      <Input className="h-8 text-sm" value={editForm.address}
                        onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-400">姓名：</span>{selectedOrder.customer_name}</p>
                    <p><span className="text-gray-400">電話：</span>{selectedOrder.customer_phone ?? '—'}</p>
                    <p><span className="text-gray-400">地址：</span>{selectedOrder.customer_address ?? '—'}</p>
                    <p><span className="text-gray-400">物流：</span>{selectedOrder.delivery_methods?.name ?? '—'}</p>
                  </div>
                )}
              </div>

              {/* 訂購商品 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-500">訂購商品</p>
                  {!editingItems ? (
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={startEditItems}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />編輯
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 px-3" disabled={itemsSaving} onClick={saveItems}>
                        {itemsSaving ? '儲存中...' : '儲存'}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditingItems(false)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {editingItems ? (
                  <div className="space-y-2">
                    {itemForms.length > 0 && (
                      <div className="border rounded-lg divide-y">
                        {itemForms.map((item, idx) => (
                          <div key={idx} className="px-3 py-2 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="flex-1 text-sm font-medium truncate">{item.product_name}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-xs text-gray-400">NT$</span>
                                <Input
                                  type="number" min={0} className="w-20 h-7 text-sm text-right"
                                  value={item.unit_price}
                                  onChange={e => setItemForms(prev => prev.map((i, j) => j === idx ? { ...i, unit_price: parseFloat(e.target.value) || 0 } : i))}
                                />
                                <span className="text-xs text-gray-400">×</span>
                                <button type="button" className="w-6 h-6 rounded-full border flex items-center justify-center text-sm hover:bg-gray-100 disabled:opacity-30"
                                  disabled={item.quantity <= 1}
                                  onClick={() => setItemForms(prev => prev.map((i, j) => j === idx ? { ...i, quantity: i.quantity - 1 } : i))}>−</button>
                                <span className="w-5 text-center text-sm">{item.quantity}</span>
                                <button type="button" className="w-6 h-6 rounded-full border flex items-center justify-center text-sm hover:bg-gray-100"
                                  onClick={() => setItemForms(prev => prev.map((i, j) => j === idx ? { ...i, quantity: i.quantity + 1 } : i))}>+</button>
                              </div>
                              <button type="button" onClick={() => setItemForms(prev => prev.filter((_, j) => j !== idx))}>
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </button>
                            </div>
                            <Input
                              className="h-7 text-xs"
                              placeholder="手圍尺寸（例：16cm）"
                              value={item.wrist_size}
                              onChange={e => setItemForms(prev => prev.map((i, j) => j === idx ? { ...i, wrist_size: e.target.value } : i))}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 新增商品 */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input
                        className="pl-9"
                        placeholder="搜尋商品新增..."
                        value={addItemSearch}
                        onChange={e => {
                          setAddItemSearch(e.target.value)
                          setAddItemOpen(true)
                          searchAddItems(e.target.value)
                        }}
                        onBlur={() => setTimeout(() => setAddItemOpen(false), 150)}
                      />
                      {addItemOpen && addItemResults.length > 0 && (
                        <div className="absolute z-50 top-full mt-1 w-full bg-white border rounded-lg shadow-md max-h-40 overflow-y-auto">
                          {addItemResults.map(p => (
                            <button key={p.id} type="button"
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0"
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => addItemToForms(p)}>
                              <span className="font-medium">{p.name}</span>
                              <span className="text-gray-400 ml-2">NT$ {p.price.toLocaleString()}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 金額預覽 */}
                    <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm space-y-1">
                      {(() => {
                        const sub = itemForms.reduce((s, i) => s + i.quantity * i.unit_price, 0)
                        const fee = selectedOrder.delivery_fee
                        return (<>
                          <div className="flex justify-between text-gray-500">
                            <span>商品小計</span><span>NT$ {sub.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>運費</span><span>{fee > 0 ? `NT$ ${fee.toLocaleString()}` : '免運'}</span>
                          </div>
                          <div className="flex justify-between font-semibold border-t pt-1">
                            <span>合計</span><span>NT$ {(sub + fee).toLocaleString()}</span>
                          </div>
                        </>)
                      })()}
                    </div>
                  </div>
                ) : (
                  selectedOrder.order_items?.length ? (
                    <div className="space-y-1">
                      {selectedOrder.order_items.map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>
                            {item.product_name} x{item.quantity}
                            {item.wrist_size && <span className="text-gray-400 ml-1 text-xs">（{item.wrist_size}）</span>}
                          </span>
                          <span>NT$ {item.subtotal.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm pt-2 border-t font-medium">
                        <span>運費</span>
                        <span>{selectedOrder.delivery_fee > 0 ? `NT$ ${selectedOrder.delivery_fee.toLocaleString()}` : '免運'}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span>合計</span>
                        <span>NT$ {selectedOrder.total.toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">無商品資訊</p>
                  )
                )}
              </div>

              {/* 訂單狀態 */}
              <div className="space-y-2">
                <Label>訂單狀態</Label>
                <Select
                  value={selectedOrder.order_status}
                  onValueChange={(value) => value && updateOrder({ order_status: value as any })}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {orderStatusOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 付款狀態 */}
              <div className="space-y-2">
                <Label>付款狀態</Label>
                <Select
                  value={selectedOrder.payment_status}
                  onValueChange={(value) => value && updateOrder({ payment_status: value as any })}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentStatusOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 付款方式 + 付款日期 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>付款方式</Label>
                  <Select
                    value={selectedOrder.payment_method ?? ''}
                    onValueChange={v => updateOrder({ payment_method: v || null })}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選擇付款方式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">未設定</SelectItem>
                      {paymentMethodOptions.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>付款日期</Label>
                  <div className="flex gap-1">
                    <Input
                      type="date"
                      className="flex-1"
                      value={selectedOrder.paid_at ?? ''}
                      onChange={e => updateOrder({ paid_at: e.target.value || null })}
                      disabled={saving}
                    />
                    {selectedOrder.paid_at && (
                      <Button variant="ghost" size="sm" className="px-2 shrink-0" disabled={saving}
                        onClick={() => updateOrder({ paid_at: null })}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* 物流單號 + 出貨日期 */}
              <div className="space-y-2">
                <Label>物流單號</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="輸入物流單號"
                    defaultValue={selectedOrder.tracking_number ?? ''}
                    id="tracking"
                  />
                  <Button
                    variant="outline"
                    disabled={saving}
                    onClick={() => {
                      const val = (document.getElementById('tracking') as HTMLInputElement).value
                      updateOrder({ tracking_number: val || null })
                    }}
                  >
                    儲存
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>出貨日期</Label>
                <div className="flex gap-1">
                  <Input
                    type="date"
                    className="flex-1"
                    value={selectedOrder.shipped_at ?? ''}
                    onChange={e => updateOrder({ shipped_at: e.target.value || null })}
                    disabled={saving}
                  />
                  {selectedOrder.shipped_at && (
                    <Button variant="ghost" size="sm" className="px-2 shrink-0" disabled={saving}
                      onClick={() => updateOrder({ shipped_at: null })}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* 業主支出 */}
              <div className="space-y-2">
                <Label>業主支出</Label>
                <div className="flex gap-2">
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">NT$</span>
                    <Input
                      type="number" min={0} className="pl-9"
                      placeholder="0"
                      defaultValue={selectedOrder.extra_expense ?? ''}
                      id="extra_expense"
                    />
                  </div>
                  <Input
                    className="flex-1"
                    placeholder="說明（例：貼運費 60）"
                    defaultValue={selectedOrder.extra_expense_note ?? ''}
                    id="extra_expense_note"
                  />
                  <Button
                    variant="outline"
                    disabled={saving}
                    onClick={() => {
                      const amt = (document.getElementById('extra_expense') as HTMLInputElement).value
                      const note = (document.getElementById('extra_expense_note') as HTMLInputElement).value
                      updateOrder({
                        extra_expense: parseFloat(amt) || null,
                        extra_expense_note: note.trim() || null,
                      })
                    }}
                  >
                    儲存
                  </Button>
                </div>
              </div>

              {/* 備註 */}
              <div className="space-y-2">
                <Label>備註</Label>
                <Textarea
                  defaultValue={selectedOrder.notes ?? ''}
                  id="notes"
                  rows={3}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => {
                    const val = (document.getElementById('notes') as HTMLTextAreaElement).value
                    updateOrder({ notes: val || null })
                  }}
                >
                  儲存備註
                </Button>
              </div>

              {/* 包材 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>使用包材</Label>
                  <Button size="sm" variant="outline" onClick={() => setAddingMaterial(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />加入包材
                  </Button>
                </div>

                {/* 新增包材表單 */}
                {addingMaterial && (
                  <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
                    <div className="space-y-1">
                      <Label className="text-xs">選擇包材</Label>
                      <Select
                        value={materialForm.material_id}
                        onValueChange={v => v && setMaterialForm({ ...materialForm, material_id: v })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="選擇包材">
                            {materialForm.material_id
                              ? (() => { const m = allMaterials.find(m => m.id === materialForm.material_id); return m ? `${m.name}（${m.unit}）` : '選擇包材' })()
                              : '選擇包材'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {allMaterials.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}（{m.unit}）</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <div className="space-y-1 w-24">
                        <Label className="text-xs">數量</Label>
                        <Input
                          type="number"
                          min={1}
                          className="h-8 text-sm"
                          value={materialForm.quantity}
                          onChange={e => setMaterialForm({ ...materialForm, quantity: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1 flex-1">
                        <Label className="text-xs">備註（選填）</Label>
                        <Input
                          className="h-8 text-sm"
                          placeholder="例：特殊尺寸"
                          value={materialForm.notes}
                          onChange={e => setMaterialForm({ ...materialForm, notes: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setAddingMaterial(false)}>取消</Button>
                      <Button
                        size="sm"
                        disabled={materialSaving || !materialForm.material_id}
                        onClick={addOrderMaterial}
                      >
                        {materialSaving ? '新增中...' : '確認新增'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 已加入的包材列表 */}
                {orderMaterials.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2 text-center">尚未加入包材</p>
                ) : (
                  <div className="border rounded-lg divide-y">
                    {orderMaterials.map(om => (
                      <div key={om.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium">{om.materials.name}</span>
                          <span className="text-gray-400 ml-2">× {om.quantity} {om.materials.unit}</span>
                          {om.notes && <span className="text-gray-400 ml-2 text-xs">（{om.notes}）</span>}
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeOrderMaterial(om.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 刪除訂單 */}
              <div className="pt-2 border-t">
                <Button variant="destructive" size="sm" className="w-full" onClick={deleteOrder}>
                  <Trash2 className="h-4 w-4 mr-2" />刪除此訂單
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── 新增訂單 Dialog ────────────────────────────── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} disablePointerDismissal>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增訂單</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">

            {/* 模式切換 */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              <button type="button"
                className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${createMode === 'free' ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setCreateMode('free')}>
                自由模式
              </button>
              <button type="button"
                className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${createMode === 'activity' ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setCreateMode('activity')}>
                活動模式
              </button>
            </div>

            {/* 客戶資料（共用） */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-500">客戶資料</p>
              <div className="grid grid-cols-2 gap-3">
                {/* 姓名 combobox */}
                <div className="space-y-1.5">
                  <Label>姓名 *</Label>
                  <div className="relative">
                    <Input
                      placeholder="輸入或搜尋會員"
                      value={createCustomer.name}
                      onChange={e => {
                        setCreateCustomer({ ...createCustomer, name: e.target.value })
                        setMemberActiveField('name')
                        searchMembers(e.target.value)
                      }}
                      onFocus={() => { if (createCustomer.name) { setMemberActiveField('name'); searchMembers(createCustomer.name) } }}
                      onBlur={() => setTimeout(() => setMemberActiveField(null), 150)}
                    />
                    {memberActiveField === 'name' && memberResults.length > 0 && (
                      <div className="absolute z-50 top-full mt-1 left-0 w-72 bg-white border rounded-lg shadow-md max-h-48 overflow-y-auto">
                        {memberResults.map(m => (
                          <button key={m.id} type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => importMember(m)}>
                            <span className="font-medium">{m.name}</span>
                            {m.phone && <span className="text-gray-400 ml-2">{m.phone}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* 電話 combobox */}
                <div className="space-y-1.5">
                  <Label>電話 *</Label>
                  <div className="relative">
                    <Input
                      placeholder="09xx-xxx-xxx"
                      value={createCustomer.phone}
                      onChange={e => {
                        setCreateCustomer({ ...createCustomer, phone: e.target.value })
                        setMemberActiveField('phone')
                        searchMembers(e.target.value)
                      }}
                      onFocus={() => { if (createCustomer.phone) { setMemberActiveField('phone'); searchMembers(createCustomer.phone) } }}
                      onBlur={() => setTimeout(() => setMemberActiveField(null), 150)}
                    />
                    {memberActiveField === 'phone' && memberResults.length > 0 && (
                      <div className="absolute z-50 top-full mt-1 left-0 w-72 bg-white border rounded-lg shadow-md max-h-48 overflow-y-auto">
                        {memberResults.map(m => (
                          <button key={m.id} type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => importMember(m)}>
                            <span className="font-medium">{m.name}</span>
                            {m.phone && <span className="text-gray-400 ml-2">{m.phone}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="選填" value={createCustomer.email}
                  onChange={e => setCreateCustomer({ ...createCustomer, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>地址</Label>
                <Input placeholder="選填" value={createCustomer.address}
                  onChange={e => setCreateCustomer({ ...createCustomer, address: e.target.value })} />
              </div>
            </div>

            {/* ── 活動模式 ── */}
            {createMode === 'activity' && (<>
              <div className="space-y-2">
                <Label>活動 *</Label>
                <Select value={createActivityId} onValueChange={v => {
                  if (!v) return
                  setCreateActivityId(v)
                  fetchActivityData(v)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇活動">
                      {createActivityId
                        ? activities.find(a => a.id === createActivityId)?.name ?? '選擇活動'
                        : '選擇活動'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {activities.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {createProducts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-500">商品</p>
                  <div className="border rounded-lg divide-y">
                    {createProducts.map(ap => (
                      <div key={ap.id} className="flex items-center justify-between px-3 py-2.5">
                        <div>
                          <span className="text-sm font-medium">{ap.products.name}</span>
                          <span className="text-xs text-gray-400 ml-2">NT$ {ap.custom_price.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="w-6 h-6 rounded-full border flex items-center justify-center text-sm hover:bg-gray-100 disabled:opacity-30"
                            disabled={(createQuantities[ap.product_id] ?? 0) === 0}
                            onClick={() => setCreateQuantities(prev => ({ ...prev, [ap.product_id]: Math.max(0, (prev[ap.product_id] ?? 0) - 1) }))}>
                            −
                          </button>
                          <span className="w-6 text-center text-sm">{createQuantities[ap.product_id] ?? 0}</span>
                          <button className="w-6 h-6 rounded-full border flex items-center justify-center text-sm hover:bg-gray-100 disabled:opacity-30"
                            disabled={ap.stock_limit != null && (createQuantities[ap.product_id] ?? 0) >= ap.stock_limit}
                            onClick={() => setCreateQuantities(prev => ({ ...prev, [ap.product_id]: Math.min((prev[ap.product_id] ?? 0) + 1, ap.stock_limit ?? Infinity) }))}>
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {createDeliveryMethods.length > 0 && (
                <div className="space-y-2">
                  <Label>物流方式 *</Label>
                  <div className="space-y-1.5">
                    {createDeliveryMethods.map(dm => {
                      const defaultFee = dm.custom_fee ?? dm.delivery_methods.default_fee
                      const isSelected = createDeliveryId === dm.id
                      return (
                        <label key={dm.id}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors
                            ${isSelected ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-2">
                            <input type="radio" name="createDelivery" value={dm.id}
                              checked={isSelected}
                              onChange={() => {
                                setCreateDeliveryId(dm.id)
                                setCreateDeliveryFee(String(defaultFee))
                              }} />
                            <span className="text-sm">{dm.delivery_methods.name}</span>
                          </div>
                          {isSelected ? (
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <span className="text-xs text-gray-400">NT$</span>
                              <Input
                                type="number" min={0} className="w-20 h-7 text-sm text-right"
                                value={createDeliveryFee}
                                onChange={e => setCreateDeliveryFee(e.target.value)}
                                onMouseDown={e => e.stopPropagation()}
                              />
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">{defaultFee === 0 ? '免運' : `NT$ ${defaultFee}`}</span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {createActivityId && (
                <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1 text-sm">
                  {(() => {
                    const subtotal = createProducts.reduce((s, ap) => s + (createQuantities[ap.product_id] ?? 0) * ap.custom_price, 0)
                    const fee = parseFloat(createDeliveryFee) || 0
                    return (<>
                      <div className="flex justify-between text-gray-500">
                        <span>商品小計</span><span>NT$ {subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>運費</span><span>{fee === 0 ? '免運' : `NT$ ${fee}`}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t">
                        <span>合計</span><span>NT$ {(subtotal + fee).toLocaleString()}</span>
                      </div>
                    </>)
                  })()}
                </div>
              )}
            </>)}

            {/* ── 自由模式 ── */}
            {createMode === 'free' && (<>

              {/* 商品搜尋 */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-500">商品</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-9 pr-9"
                    placeholder="搜尋商品名稱..."
                    value={freeProductSearch}
                    onChange={e => {
                      setFreeProductSearch(e.target.value)
                      setFreeProductSearchOpen(true)
                      searchProducts(e.target.value)
                    }}
                    onFocus={() => freeProductSearch && setFreeProductSearchOpen(true)}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={toggleProductDropdown}
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${freeProductSearchOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {freeProductSearchOpen && freeProductResults.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-white border rounded-lg shadow-md max-h-48 overflow-y-auto">
                      {freeProductResults.map(p => (
                        <button key={p.id} type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0"
                          onClick={() => addFreeItem(p)}>
                          <span className="font-medium">{p.name}</span>
                          <span className="text-gray-400 ml-2">NT$ {p.price.toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {freeItems.length > 0 && (
                  <div className="border rounded-lg divide-y">
                    {freeItems.map(item => (
                      <div key={item.product_id} className="px-3 py-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="flex-1 text-sm font-medium">{item.product_name}</span>
                          <Input
                            type="number" min={1} className="w-20 h-7 text-sm text-center"
                            value={item.unit_price}
                            onChange={e => setFreeItems(prev => prev.map(i => i.product_id === item.product_id ? { ...i, unit_price: parseFloat(e.target.value) || 0 } : i))}
                          />
                          <span className="text-xs text-gray-400">×</span>
                          <div className="flex items-center gap-1">
                            <button type="button" className="w-6 h-6 rounded-full border flex items-center justify-center text-sm hover:bg-gray-100 disabled:opacity-30"
                              disabled={item.quantity <= 1}
                              onClick={() => setFreeItems(prev => prev.map(i => i.product_id === item.product_id ? { ...i, quantity: i.quantity - 1 } : i))}>
                              −
                            </button>
                            <span className="w-6 text-center text-sm">{item.quantity}</span>
                            <button type="button" className="w-6 h-6 rounded-full border flex items-center justify-center text-sm hover:bg-gray-100"
                              onClick={() => setFreeItems(prev => prev.map(i => i.product_id === item.product_id ? { ...i, quantity: i.quantity + 1 } : i))}>
                              +
                            </button>
                          </div>
                          <button type="button" onClick={() => setFreeItems(prev => prev.filter(i => i.product_id !== item.product_id))}>
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </button>
                        </div>
                        <Input
                          className="h-7 text-xs"
                          placeholder="手圍尺寸（例：16cm）"
                          value={item.wrist_size}
                          onChange={e => setFreeItems(prev => prev.map(i => i.product_id === item.product_id ? { ...i, wrist_size: e.target.value } : i))}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 包材搜尋 */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-500">包材</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-9"
                    placeholder="搜尋包材名稱..."
                    value={freeMaterialSearch}
                    onChange={e => {
                      setFreeMaterialSearch(e.target.value)
                      setFreeMaterialSearchOpen(true)
                      searchFreeMaterials(e.target.value)
                    }}
                    onFocus={() => freeMaterialSearch && setFreeMaterialSearchOpen(true)}
                  />
                  {freeMaterialSearchOpen && freeMaterialResults.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-white border rounded-lg shadow-md max-h-48 overflow-y-auto">
                      {freeMaterialResults.map(m => (
                        <button key={m.id} type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0"
                          onClick={() => addFreeMaterial(m)}>
                          <span className="font-medium">{m.name}</span>
                          <span className="text-gray-400 ml-2 text-xs">{m.unit}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {freeMaterials.length > 0 && (
                  <div className="border rounded-lg divide-y">
                    {freeMaterials.map(mat => (
                      <div key={mat.material_id} className="flex items-center gap-2 px-3 py-2">
                        <span className="flex-1 text-sm font-medium">{mat.material_name}</span>
                        <span className="text-xs text-gray-400">{mat.unit}</span>
                        <div className="flex items-center gap-1">
                          <button type="button" className="w-6 h-6 rounded-full border flex items-center justify-center text-sm hover:bg-gray-100 disabled:opacity-30"
                            disabled={mat.quantity <= 1}
                            onClick={() => setFreeMaterials(prev => prev.map(m => m.material_id === mat.material_id ? { ...m, quantity: m.quantity - 1 } : m))}>
                            −
                          </button>
                          <span className="w-6 text-center text-sm">{mat.quantity}</span>
                          <button type="button" className="w-6 h-6 rounded-full border flex items-center justify-center text-sm hover:bg-gray-100"
                            onClick={() => setFreeMaterials(prev => prev.map(m => m.material_id === mat.material_id ? { ...m, quantity: m.quantity + 1 } : m))}>
                            +
                          </button>
                        </div>
                        <Input
                          className="w-24 h-7 text-xs"
                          placeholder="備註"
                          value={mat.notes}
                          onChange={e => setFreeMaterials(prev => prev.map(m => m.material_id === mat.material_id ? { ...m, notes: e.target.value } : m))}
                        />
                        <button type="button" onClick={() => setFreeMaterials(prev => prev.filter(m => m.material_id !== mat.material_id))}>
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 物流方式 */}
              <div className="space-y-2">
                <Label>物流方式</Label>
                <div className="space-y-1.5">
                  {allDeliveryMethods.map(dm => (
                    <label key={dm.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors
                        ${freeDeliveryId === dm.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-2">
                        <input type="radio" name="freeDelivery" value={dm.id}
                          checked={freeDeliveryId === dm.id}
                          onChange={() => {
                            setFreeDeliveryId(dm.id)
                            setFreeDeliveryFee(String(dm.default_fee))
                          }} />
                        <span className="text-sm">{dm.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {freeDeliveryId === dm.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400">NT$</span>
                            <Input
                              type="number" min={0} className="w-20 h-7 text-sm text-right"
                              value={freeDeliveryFee}
                              onChange={e => setFreeDeliveryFee(e.target.value)}
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">{dm.default_fee === 0 ? '免運' : `NT$ ${dm.default_fee}`}</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 金額小計 */}
              <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1 text-sm">
                {(() => {
                  const subtotal = freeItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
                  const fee = parseFloat(freeDeliveryFee) || 0
                  return (<>
                    <div className="flex justify-between text-gray-500">
                      <span>商品小計</span><span>NT$ {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>運費</span><span>{fee === 0 ? '免運' : `NT$ ${fee}`}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t">
                      <span>合計</span><span>NT$ {(subtotal + fee).toLocaleString()}</span>
                    </div>
                  </>)
                })()}
              </div>
            </>)}

            {/* 付款方式（共用） */}
            <div className="space-y-2">
              <Label>付款方式</Label>
              <Select value={createPaymentMethod} onValueChange={v => setCreatePaymentMethod(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇付款方式（選填）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">未設定</SelectItem>
                  {paymentMethodOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 業主支出（共用） */}
            <div className="space-y-2">
              <Label>業主支出</Label>
              <div className="flex gap-2">
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">NT$</span>
                  <Input
                    type="number" min={0} className="pl-9"
                    placeholder="0"
                    value={createExpense.amount}
                    onChange={e => setCreateExpense({ ...createExpense, amount: e.target.value })}
                  />
                </div>
                <Input
                  className="flex-1"
                  placeholder="說明（例：貼運費 60）"
                  value={createExpense.note}
                  onChange={e => setCreateExpense({ ...createExpense, note: e.target.value })}
                />
              </div>
            </div>

            {/* 備註（共用） */}
            <div className="space-y-1.5">
              <Label>備註</Label>
              <Textarea placeholder="選填" rows={2} value={createCustomer.notes}
                onChange={e => setCreateCustomer({ ...createCustomer, notes: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setCreateDialogOpen(false)}>取消</Button>
            {createMode === 'activity' ? (
              <Button className="flex-1"
                disabled={createSaving || !createCustomer.name.trim() || !createCustomer.phone.trim() || !createDeliveryId || !createActivityId}
                onClick={handleCreateOrder}>
                {createSaving ? '建立中...' : '建立訂單'}
              </Button>
            ) : (
              <Button className="flex-1"
                disabled={createSaving || !createCustomer.name.trim() || !createCustomer.phone.trim()}
                onClick={handleCreateFreeOrder}>
                {createSaving ? '建立中...' : '建立訂單'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
