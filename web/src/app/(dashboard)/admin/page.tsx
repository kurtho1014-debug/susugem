import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ShoppingCart, Users, ClipboardList } from 'lucide-react'

const stats = [
  {
    title: '本月訂單',
    value: '—',
    icon: ShoppingCart,
    description: '進行中的訂單數'
  },
  {
    title: '商品數量',
    value: '—',
    icon: Package,
    description: '目前上架商品'
  },
  {
    title: '會員數',
    value: '—',
    icon: Users,
    description: '累計會員人數'
  },
  {
    title: '進行中活動',
    value: '—',
    icon: ClipboardList,
    description: '目前開放中的活動'
  },
]

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">歡迎回來，業主</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
