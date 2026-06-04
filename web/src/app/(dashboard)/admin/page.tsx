'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ShoppingCart, Users, ClipboardList, TrendingUp } from 'lucide-react'

type MonthlyFinance = {
  orderCount: number
  productRevenue: number
  deliveryRevenue: number
  totalRevenue: number
  productCost: number
  productCostCoverage: number  // 0~1，有 cost_price 的訂單比例
  materialCost: number
  netProfit: number
}

type Stats = {
  orderCount: number
  productCount: number
  memberCount: number
  activeActivityCount: number
}

function fmt(n: number) {
  return `NT$ ${Math.round(n).toLocaleString()}`
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [finance, setFinance] = useState<MonthlyFinance | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [
        { count: orderCount },
        { count: productCount },
        { count: memberCount },
        { count: activeActivityCount },
        { data: monthlyOrders },
      ] = await Promise.all([
        supabase.from('orders')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfMonth)
          .neq('order_status', 'cancelled'),
        supabase.from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        supabase.from('members')
          .select('*', { count: 'exact', head: true }),
        supabase.from('activities')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase.from('orders')
          .select(`
            id, subtotal, total, delivery_fee,
            order_items ( quantity, unit_price, subtotal, products ( cost_price ) ),
            order_materials ( quantity, materials ( unit_price ) )
          `)
          .gte('created_at', startOfMonth)
          .neq('order_status', 'cancelled'),
      ])

      setStats({
        orderCount: orderCount ?? 0,
        productCount: productCount ?? 0,
        memberCount: memberCount ?? 0,
        activeActivityCount: activeActivityCount ?? 0,
      })

      if (monthlyOrders) {
        let productRevenue = 0
        let deliveryRevenue = 0
        let productCost = 0
        let coveredItems = 0
        let totalItems = 0
        let materialCost = 0

        for (const order of monthlyOrders) {
          productRevenue += order.subtotal ?? 0
          deliveryRevenue += order.delivery_fee ?? 0

          for (const item of (order.order_items as any[]) ?? []) {
            totalItems++
            const cp = item.products?.cost_price
            if (cp != null) {
              productCost += item.quantity * cp
              coveredItems++
            }
          }

          for (const om of (order.order_materials as any[]) ?? []) {
            const up = om.materials?.unit_price ?? 0
            materialCost += om.quantity * up
          }
        }

        const totalRevenue = productRevenue + deliveryRevenue
        setFinance({
          orderCount: monthlyOrders.length,
          productRevenue,
          deliveryRevenue,
          totalRevenue,
          productCost,
          productCostCoverage: totalItems > 0 ? coveredItems / totalItems : 1,
          materialCost,
          netProfit: totalRevenue - productCost - materialCost,
        })
      }

      setLoading(false)
    }

    load()
  }, [])

  const statCards = [
    { title: '本月訂單', value: stats ? `${stats.orderCount} 筆` : '—', icon: ShoppingCart, description: '不含已取消' },
    { title: '商品數量', value: stats ? `${stats.productCount} 件` : '—', icon: Package, description: '目前上架商品' },
    { title: '會員數', value: stats ? `${stats.memberCount} 人` : '—', icon: Users, description: '累計會員人數' },
    { title: '進行中活動', value: stats ? `${stats.activeActivityCount} 個` : '—', icon: ClipboardList, description: '目前開放中的活動' },
  ]

  const isProfit = (finance?.netProfit ?? 0) >= 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">歡迎回來，業主</p>
      </div>

      {/* 數量統計 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '—' : stat.value}</div>
              <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 本月財務摘要 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">
            本月財務摘要
            <span className="ml-2 text-xs text-gray-400 font-normal">
              {new Date().getFullYear()} 年 {new Date().getMonth() + 1} 月・不含已取消訂單
            </span>
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          {loading || !finance ? (
            <p className="text-sm text-gray-400 py-4 text-center">載入中...</p>
          ) : (
            <div className="space-y-4">
              {/* 收入 / 成本 並排 */}
              <div className="grid grid-cols-2 gap-6">
                {/* 收入 */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">收入</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">商品收入</span>
                      <span className="font-medium">{fmt(finance.productRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">運費收入</span>
                      <span className="font-medium">{fmt(finance.deliveryRevenue)}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t font-semibold">
                      <span>總收入</span>
                      <span>{fmt(finance.totalRevenue)}</span>
                    </div>
                  </div>
                </div>

                {/* 成本 */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">成本</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        商品成本
                        {finance.productCostCoverage < 1 && (
                          <span className="text-orange-400 text-xs ml-1">
                            (部分未填)
                          </span>
                        )}
                      </span>
                      <span className="font-medium">{fmt(finance.productCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">包材成本</span>
                      <span className="font-medium">{fmt(finance.materialCost)}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t font-semibold">
                      <span>總成本</span>
                      <span>{fmt(finance.productCost + finance.materialCost)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 淨利 */}
              <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${isProfit ? 'bg-green-50' : 'bg-red-50'}`}>
                <span className={`font-semibold text-sm ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
                  本月淨利
                </span>
                <span className={`text-xl font-bold ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
                  {fmt(finance.netProfit)}
                </span>
              </div>

              {finance.productCostCoverage < 1 && (
                <p className="text-xs text-orange-500">
                  ⚠ 部分商品未設定成本價，商品成本為低估值，建議至商品管理補齊。
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
