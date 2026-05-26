'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, Minus, Plus, ChevronRight, ChevronLeft } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = { label: string }

type Activity = {
  id: string; name: string; description: string | null
  status: string; start_date: string | null; end_date: string | null; images: string[]
  steps: Step[]
}
type ActivityProduct = {
  id: string; product_id: string; custom_price: number; stock_limit: number | null
  sort_order: number; products: { name: string; description: string | null; images: string[] }
}
type CustomField = {
  id: string; label: string
  field_type: 'text' | 'select' | 'number' | 'boolean' | 'textarea'
  is_required: boolean; options: string[]; sort_order: number; step_index: number
}
type DeliveryMethod = {
  id: string; delivery_method_id: string; name: string; fee: number
}
type ActivityMaterial = {
  id: string; expected_quantity: number; notes: string | null
  materials: { name: string; unit: string; images: string[] }
}

// ── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
                ${done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs whitespace-nowrap ${active ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 h-0.5 mb-4 mx-1 ${i < current ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

const DEFAULT_STEPS: Step[] = [
  { label: '選擇商品' }, { label: '填寫資料' }, { label: '確認送出' },
]

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ActivityPurchasePage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [activity, setActivity] = useState<Activity | null>(null)
  const [activityProducts, setActivityProducts] = useState<ActivityProduct[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([])
  const [activityMaterials, setActivityMaterials] = useState<ActivityMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Step
  const [step, setStep] = useState(0)

  // Step 1 — 商品
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  // Step 2 — 資料
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [deliveryMethodId, setDeliveryMethodId] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [orderId, setOrderId] = useState('')

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const [
        { data: act },
        { data: aps },
        { data: cfs },
        { data: dms },
        { data: ams },
      ] = await Promise.all([
        supabase.from('activities').select('*').eq('id', id).eq('status', 'active').maybeSingle(),
        supabase.from('activity_products').select('*, products(name, description, images)').eq('activity_id', id).order('sort_order'),
        supabase.from('activity_custom_fields').select('*').eq('activity_id', id).order('sort_order'),
        supabase.from('activity_delivery_methods').select('id, delivery_method_id, custom_fee, delivery_methods(name, default_fee)').eq('activity_id', id).order('created_at'),
        supabase.from('activity_materials').select('id, expected_quantity, notes, materials(name, unit, images)').eq('activity_id', id).gt('expected_quantity', 0).order('created_at'),
      ])
      if (!act) { setNotFound(true); setLoading(false); return }
      setActivity(act)
      setActivityProducts((aps ?? []) as ActivityProduct[])
      setCustomFields((cfs ?? []) as CustomField[])
      const flatDms: DeliveryMethod[] = ((dms ?? []) as any[]).map((row: any) => ({
        id: row.id, delivery_method_id: row.delivery_method_id,
        name: row.delivery_methods?.name ?? '',
        fee: row.custom_fee != null ? row.custom_fee : (row.delivery_methods?.default_fee ?? 0),
      }))
      setDeliveryMethods(flatDms)
      setActivityMaterials((ams ?? []) as unknown as ActivityMaterial[])
      setLoading(false)
    }
    fetch()
  }, [id])

  // ── Computed ──────────────────────────────────────────────────────────────────

  const steps: Step[] = (activity?.steps?.length ?? 0) >= 3 ? activity!.steps : DEFAULT_STEPS
  const totalSteps = steps.length
  // step roles: 0=products, 1..n-3=custom, n-2=contact, n-1=confirm
  const contactStepIdx = totalSteps - 2
  const confirmStepIdx = totalSteps - 1

  const hasItems = activityProducts.some(ap => (quantities[ap.product_id] ?? 0) > 0)
  const subtotal = activityProducts.reduce((s, ap) => s + (quantities[ap.product_id] ?? 0) * ap.custom_price, 0)
  const selectedDelivery = deliveryMethods.find(d => d.id === deliveryMethodId)
  const deliveryFee = selectedDelivery?.fee ?? 0
  const total = subtotal + deliveryFee

  // Fields for a given step index (0=products step, 1..n-3=custom middle steps)
  const fieldsForStep = (si: number) => customFields.filter(cf => (cf.step_index ?? 0) === si)

  // Required fields validation for current step
  const requiredMissing = (si: number) =>
    fieldsForStep(si).filter(cf => cf.is_required && !fieldValues[cf.id]?.trim()).map(cf => cf.label)

  const step0Valid = hasItems && requiredMissing(0).length === 0
  // Middle steps: all required custom fields filled
  const middleStepValid = (si: number) => requiredMissing(si).length === 0
  const contactValid = !!(customerName.trim() && customerPhone.trim() && deliveryMethodId)

  // Google 快速填入
  const handleGoogleFill = async () => {
    setGoogleLoading(true)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) { alert('Google 登入失敗：' + error.message); setGoogleLoading(false) }
  }

  // 登入後取 session 帶入欄位
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user
        if (!customerName && u.user_metadata?.full_name) setCustomerName(u.user_metadata.full_name)
        if (!customerEmail && u.email) setCustomerEmail(u.email)
      }
    })
  }, [])

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!contactValid) return
    setSubmitting(true)
    try {
      const { data: orderData, error: orderErr } = await supabase.from('orders').insert({
        activity_id: id,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || null,
        customer_address: customerAddress.trim() || null,
        delivery_method_id: selectedDelivery?.delivery_method_id,
        delivery_fee: deliveryFee,
        subtotal, total,
        order_status: 'pending',
        payment_status: 'unpaid',
      }).select().single()
      if (orderErr || !orderData) throw orderErr ?? new Error('訂單建立失敗')

      const items = activityProducts.filter(ap => (quantities[ap.product_id] ?? 0) > 0).map(ap => ({
        order_id: orderData.id, product_id: ap.product_id,
        product_name: ap.products.name,
        quantity: quantities[ap.product_id],
        unit_price: ap.custom_price,
        subtotal: quantities[ap.product_id] * ap.custom_price,
      }))
      if (items.length > 0) await supabase.from('order_items').insert(items)

      const cfValues = customFields.filter(cf => fieldValues[cf.id]?.trim()).map(cf => ({
        order_id: orderData.id,
        activity_custom_field_id: cf.id,
        value: fieldValues[cf.id].trim(),
      }))
      if (cfValues.length > 0) await supabase.from('order_custom_field_values').insert(cfValues)

      setOrderId(orderData.id)
      setSubmitted(true)
    } catch (err: any) {
      alert('送出失敗，請稍後再試：' + (err?.message ?? err))
    } finally {
      setSubmitting(false)
    }
  }

  const setQty = (productId: string, delta: number, max?: number | null) => {
    setQuantities(prev => {
      const cur = prev[productId] ?? 0
      const next = Math.max(0, cur + delta)
      return { ...prev, [productId]: max != null ? Math.min(next, max) : next }
    })
  }

  // ── Loading / Not found ───────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400">載入中...</p>
    </div>
  )
  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-700 mb-2">活動不存在或已結束</p>
        <p className="text-gray-400">請確認連結是否正確</p>
      </div>
    </div>
  )

  // ── Success ───────────────────────────────────────────────────────────────────

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-sm w-full text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold">訂單已送出！</h2>
        <p className="text-gray-500 text-sm">感謝您的訂購，業主確認後將與您聯絡。</p>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">訂單編號</p>
          <p className="font-mono text-xs text-gray-600 break-all">{orderId}</p>
        </div>
        <div className="text-sm text-gray-500 space-y-1">
          <p><span className="text-gray-400">姓名：</span>{customerName}</p>
          <p><span className="text-gray-400">電話：</span>{customerPhone}</p>
          <p><span className="text-gray-400">合計：</span>NT$ {total.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )

  // ── Main ──────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-lg mx-auto px-4 py-5">
          {activity!.images?.length > 0 && (
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {activity!.images.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" className="h-28 w-auto rounded-xl border object-cover shrink-0" />
              ))}
            </div>
          )}
          <h1 className="text-xl font-bold">{activity!.name}</h1>
          {(activity!.start_date || activity!.end_date) && (
            <p className="text-gray-400 text-xs mt-1">
              {activity!.start_date?.slice(0, 10)} ～ {activity!.end_date?.slice(0, 10)}
            </p>
          )}
          {activity!.description && (
            <p className="text-gray-600 text-sm mt-1">{activity!.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <StepIndicator steps={steps.map(s => s.label)} current={step} />

        {/* ══ STEP 0：商品 ════════════════════════════════════ */}
        {step === 0 && (
          <div className="space-y-4">
            {/* 包材說明 */}
            {activityMaterials.length > 0 && (
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs font-medium text-gray-500 mb-2">包裝材料</p>
                <div className="flex flex-wrap gap-3">
                  {activityMaterials.map(am => (
                    <div key={am.id} className="flex items-center gap-1.5 text-sm">
                      {am.materials.images?.[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={am.materials.images[0]} alt="" className="w-7 h-7 object-cover rounded border" />
                      )}
                      <span className="font-medium">{am.materials.name}</span>
                      <span className="text-gray-400">× {am.expected_quantity} {am.materials.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 商品列表 */}
            <div className="bg-white rounded-xl border divide-y">
              {activityProducts.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">此活動尚未設定商品</p>
              ) : activityProducts.map(ap => (
                <div key={ap.id} className="flex items-start gap-3 p-4">
                  {ap.products.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ap.products.images[0]} alt={ap.products.name}
                      className="w-16 h-16 object-cover rounded-lg border shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{ap.products.name}</p>
                    {ap.products.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{ap.products.description}</p>
                    )}
                    <p className="text-blue-600 font-semibold text-sm mt-1">
                      NT$ {ap.custom_price.toLocaleString()}
                    </p>
                    {ap.stock_limit != null && (
                      <p className="text-xs text-gray-400">剩餘 {ap.stock_limit} 件</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setQty(ap.product_id, -1)}
                      className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"
                      disabled={(quantities[ap.product_id] ?? 0) === 0}>
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">
                      {quantities[ap.product_id] ?? 0}
                    </span>
                    <button onClick={() => setQty(ap.product_id, +1, ap.stock_limit)}
                      className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"
                      disabled={ap.stock_limit != null && (quantities[ap.product_id] ?? 0) >= ap.stock_limit}>
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 自訂欄位（step_index === 0 的才在這裡）*/}
            {fieldsForStep(0).length > 0 && (
              <div className="bg-white rounded-xl border p-4 space-y-4">
                <p className="text-sm font-semibold">其他資訊</p>
                {fieldsForStep(0).map(cf => (
                  <div key={cf.id} className="space-y-1.5">
                    <Label className="text-sm">
                      {cf.label}
                      {cf.is_required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {cf.field_type === 'text' && (
                      <Input value={fieldValues[cf.id] ?? ''} onChange={e => setFieldValues({ ...fieldValues, [cf.id]: e.target.value })} />
                    )}
                    {cf.field_type === 'textarea' && (
                      <Textarea rows={3} value={fieldValues[cf.id] ?? ''} onChange={e => setFieldValues({ ...fieldValues, [cf.id]: e.target.value })} />
                    )}
                    {cf.field_type === 'number' && (
                      <Input type="number" value={fieldValues[cf.id] ?? ''} onChange={e => setFieldValues({ ...fieldValues, [cf.id]: e.target.value })} />
                    )}
                    {cf.field_type === 'select' && (
                      <Select value={fieldValues[cf.id] ?? ''} onValueChange={v => v && setFieldValues({ ...fieldValues, [cf.id]: v })}>
                        <SelectTrigger><SelectValue placeholder="請選擇" /></SelectTrigger>
                        <SelectContent>
                          {cf.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    {cf.field_type === 'boolean' && (
                      <div className="flex gap-4">
                        {['是', '否'].map(opt => (
                          <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name={`cf_${cf.id}`} value={opt}
                              checked={fieldValues[cf.id] === opt}
                              onChange={() => setFieldValues({ ...fieldValues, [cf.id]: opt })} />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 小計預覽 */}
            {hasItems && (
              <div className="bg-white rounded-xl border px-4 py-3 flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  已選 {activityProducts.filter(ap => (quantities[ap.product_id] ?? 0) > 0).map(ap => `${ap.products.name} ×${quantities[ap.product_id]}`).join('、')}
                </span>
                <span className="font-semibold text-sm">NT$ {subtotal.toLocaleString()}</span>
              </div>
            )}

            <div className="space-y-2">
              {!hasItems && <p className="text-center text-sm text-gray-400">請先選擇至少一樣商品</p>}
              {requiredMissing(0).length > 0 && hasItems && (
                <p className="text-center text-sm text-red-400">請填寫：{requiredMissing(0).join('、')}</p>
              )}
              <Button className="w-full h-11" disabled={!step0Valid} onClick={() => setStep(1)}>
                下一步：{steps[1]?.label} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ══ 中間自訂步驟 1..n-3 ════════════════════════════ */}
        {step >= 1 && step < contactStepIdx && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-4 space-y-4">
              <p className="text-sm font-semibold">{steps[step]?.label}</p>
              {fieldsForStep(step).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">此步驟尚無自訂欄位</p>
              ) : fieldsForStep(step).map(cf => (
                <div key={cf.id} className="space-y-1.5">
                  <Label className="text-sm">
                    {cf.label}{cf.is_required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {cf.field_type === 'text' && <Input value={fieldValues[cf.id] ?? ''} onChange={e => setFieldValues({ ...fieldValues, [cf.id]: e.target.value })} />}
                  {cf.field_type === 'textarea' && <Textarea rows={3} value={fieldValues[cf.id] ?? ''} onChange={e => setFieldValues({ ...fieldValues, [cf.id]: e.target.value })} />}
                  {cf.field_type === 'number' && <Input type="number" value={fieldValues[cf.id] ?? ''} onChange={e => setFieldValues({ ...fieldValues, [cf.id]: e.target.value })} />}
                  {cf.field_type === 'select' && (
                    <Select value={fieldValues[cf.id] ?? ''} onValueChange={v => v && setFieldValues({ ...fieldValues, [cf.id]: v })}>
                      <SelectTrigger><SelectValue placeholder="請選擇" /></SelectTrigger>
                      <SelectContent>{cf.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  {cf.field_type === 'boolean' && (
                    <div className="flex gap-4">
                      {['是', '否'].map(opt => (
                        <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name={`cf_${cf.id}`} value={opt} checked={fieldValues[cf.id] === opt} onChange={() => setFieldValues({ ...fieldValues, [cf.id]: opt })} />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {requiredMissing(step).length > 0 && (
              <p className="text-center text-sm text-red-400">請填寫：{requiredMissing(step).join('、')}</p>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> 上一步
              </Button>
              <Button className="flex-1 h-11" disabled={!middleStepValid(step)} onClick={() => setStep(step + 1)}>
                下一步：{steps[step + 1]?.label} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ══ 聯絡步驟 n-2 ═══════════════════════════════════ */}
        {step === contactStepIdx && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">聯絡資料</p>
                <button
                  onClick={handleGoogleFill}
                  disabled={googleLoading}
                  className="flex items-center gap-2 text-xs border rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {googleLoading ? '請稍候...' : '使用 Google 快速填入'}
                </button>
              </div>
              <div className="space-y-1.5">
                <Label>姓名 <span className="text-red-500">*</span></Label>
                <Input placeholder="您的姓名" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>電話 <span className="text-red-500">*</span></Label>
                <Input type="tel" placeholder="09xx-xxx-xxx" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="（選填）example@gmail.com" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>收件地址</Label>
                <Input placeholder="（選填）" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
              </div>
            </div>

            <div className="bg-white rounded-xl border p-4 space-y-3">
              <p className="text-sm font-semibold">物流方式 <span className="text-red-500">*</span></p>
              {deliveryMethods.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">此活動尚未設定物流方式</p>
              ) : deliveryMethods.map(dm => (
                <label key={dm.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors
                    ${deliveryMethodId === dm.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="delivery" value={dm.id}
                      checked={deliveryMethodId === dm.id}
                      onChange={() => setDeliveryMethodId(dm.id)} />
                    <span className="text-sm font-medium">{dm.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {dm.fee === 0 ? '免運' : `+NT$ ${dm.fee}`}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> 上一步
              </Button>
              <Button className="flex-1 h-11" disabled={!contactValid} onClick={() => setStep(confirmStepIdx)}>
                下一步：{steps[confirmStepIdx]?.label} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ══ 確認步驟 n-1：確認送出 ══════════════════════════ */}
        {step === confirmStepIdx && (
          <div className="space-y-4">
            {/* 商品明細 */}
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <p className="text-sm font-semibold">商品明細</p>
              {activityProducts.filter(ap => (quantities[ap.product_id] ?? 0) > 0).map(ap => (
                <div key={ap.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    {ap.products.images?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ap.products.images[0]} alt="" className="w-8 h-8 object-cover rounded border" />
                    )}
                    <span>{ap.products.name} × {quantities[ap.product_id]}</span>
                  </div>
                  <span className="font-medium">NT$ {(quantities[ap.product_id] * ap.custom_price).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>運費（{selectedDelivery?.name}）</span>
                  <span>{deliveryFee === 0 ? '免運' : `NT$ ${deliveryFee}`}</span>
                </div>
                <div className="flex justify-between font-bold text-base">
                  <span>合計</span>
                  <span>NT$ {total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 聯絡資料 */}
            <div className="bg-white rounded-xl border p-4 space-y-2 text-sm">
              <p className="font-semibold mb-1">聯絡資料</p>
              <div className="flex justify-between"><span className="text-gray-400">姓名</span><span>{customerName}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">電話</span><span>{customerPhone}</span></div>
              {customerEmail && <div className="flex justify-between"><span className="text-gray-400">Email</span><span>{customerEmail}</span></div>}
              {customerAddress && <div className="flex justify-between"><span className="text-gray-400">地址</span><span className="text-right max-w-48">{customerAddress}</span></div>}
            </div>

            {/* 自訂欄位回顯 */}
            {customFields.filter(cf => fieldValues[cf.id]).length > 0 && (
              <div className="bg-white rounded-xl border p-4 space-y-2 text-sm">
                <p className="font-semibold mb-1">其他資訊</p>
                {customFields.filter(cf => fieldValues[cf.id]).map(cf => (
                  <div key={cf.id} className="flex justify-between gap-2">
                    <span className="text-gray-400 shrink-0">{cf.label}</span>
                    <span className="text-right">{fieldValues[cf.id]}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setStep(contactStepIdx)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> 上一步
              </Button>
              <Button className="flex-1 h-12 text-base" onClick={handleSubmit} disabled={submitting}>
                {submitting ? '送出中...' : '確認送出 ✓'}
              </Button>
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  )
}
