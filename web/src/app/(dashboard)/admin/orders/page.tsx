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
  created_at: string
  activities?: { name: string } | null
  delivery_methods?: { name: string } | null
  order_items?: {
    id: string
    product_name: string
    quantity: number
    unit_price: number
    subtotal: number
  }[]
}

const orderStatusOptions = [
  { value: 'pending',    label: '待處理', variant: 'outline' },
  { value: 'confirmed',  label: '已確認', variant: 'secondary' },
  { value: 'processing', label: '製作中', variant: 'default' },
  { value: 'completed',  label: '已完成', variant: 'default' },
  { value: 'cancelled',  label: '已取消', variant: 'destructive' },
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

  // 篩選
  const [filterActivity, setFilterActivity] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const supabase = createClient()

  const fetchOrders = async () => {
    setLoading(true)
    let query = supabase
      .from('orders')
      .select(`
        *,
        activities(name),
        delivery_methods(name),
        order_items(id, product_name, quantity, unit_price, subtotal)
      `)
      .order('created_at', { ascending: false })

    if (filterActivity !== 'all') query = query.eq('activity_id', filterActivity)
    if (filterStatus !== 'all') query = query.eq('order_status', filterStatus)

    const { data, error } = await query
    if (!error && data) setOrders(data as Order[])
    setLoading(false)
  }

  const fetchActivities = async () => {
    const { data } = await supabase.from('activities').select('id, name').order('created_at', { ascending: false })
    if (data) setActivities(data)
  }

  useEffect(() => {
    fetchActivities()
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [filterActivity, filterStatus])

  // 更新訂單
  const updateOrder = async (field: Partial<Order>) => {
    if (!selectedOrder) return
    setSaving(true)
    const { error } = await supabase
      .from('orders')
      .update(field)
      .eq('id', selectedOrder.id)

    if (!error) {
      setSelectedOrder({ ...selectedOrder, ...field })
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
      </div>

      {/* 篩選 */}
      <div className="flex gap-4">
        <div className="w-48">
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
        <div className="w-40">
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v ?? 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="所有狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有狀態</SelectItem>
              {orderStatusOptions.map(o => (
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
              <TableHead>總金額</TableHead>
              <TableHead>建立時間</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-gray-400">載入中...</TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-gray-400">尚無訂單</TableCell>
              </TableRow>
            ) : (
              orders.map(order => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedOrder(order)}
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
                  <TableCell>NT$ {order.total.toLocaleString()}</TableCell>
                  <TableCell className="text-gray-400">
                    {new Date(order.created_at).toLocaleDateString('zh-TW')}
                  </TableCell>
                </TableRow>
              ))
            )}
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
                <p className="text-sm font-semibold text-gray-500 mb-2">客戶資訊</p>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-400">姓名：</span>{selectedOrder.customer_name}</p>
                  <p><span className="text-gray-400">電話：</span>{selectedOrder.customer_phone ?? '—'}</p>
                  <p><span className="text-gray-400">地址：</span>{selectedOrder.customer_address ?? '—'}</p>
                  <p><span className="text-gray-400">物流：</span>{selectedOrder.delivery_methods?.name ?? '—'}</p>
                </div>
              </div>

              {/* 訂購商品 */}
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-2">訂購商品</p>
                {selectedOrder.order_items?.length ? (
                  <div className="space-y-1">
                    {selectedOrder.order_items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.product_name} x{item.quantity}</span>
                        <span>NT$ {item.subtotal.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm pt-2 border-t font-medium">
                      <span>運費</span>
                      <span>NT$ {selectedOrder.delivery_fee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span>合計</span>
                      <span>NT$ {selectedOrder.total.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">無商品資訊</p>
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

              {/* 物流單號 */}
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
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
