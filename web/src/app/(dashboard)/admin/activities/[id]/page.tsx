'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ArrowLeft, ExternalLink, Plus, Trash2, Pencil, ChevronDown, Package, Truck, Settings2, ShoppingCart } from 'lucide-react'
import { ImageUploader } from '@/components/image-uploader'

// ── Types ─────────────────────────────────────────────────────────────────────

type Activity = {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'active' | 'ended'
  start_date: string | null
  end_date: string | null
  notes: string | null
  images: string[]
  steps: Step[]
}

type ActivityProduct = {
  id: string
  product_id: string
  custom_price: number | null
  stock_limit: number | null
  sort_order: number
  products: { name: string; price: number }
}

type CustomField = {
  id: string
  label: string
  field_type: 'text' | 'select' | 'number' | 'boolean' | 'textarea'
  is_required: boolean
  options: string[]
  sort_order: number
  step_index: number
}

type Product = { id: string; name: string; price: number }

type ActivityMaterial = {
  id: string
  material_id: string
  expected_quantity: number
  purchased_quantity: number
  remaining_quantity: number
  notes: string | null
  materials: { name: string; unit: string; stock_quantity: number }
}

type Material = { id: string; name: string; unit: string; stock_quantity: number }

type ActivityDeliveryMethod = {
  id: string
  delivery_method_id: string
  custom_fee: number | null
  delivery_methods: { name: string; default_fee: number }
}

type DeliveryMethod = { id: string; name: string; default_fee: number }

type Step = { label: string }

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_STEPS: Step[] = [
  { label: '選擇商品' },
  { label: '填寫資料' },
  { label: '確認送出' },
]

// step role helpers
const stepRole = (i: number, total: number) => {
  if (i === 0) return { tag: '商品', color: 'bg-blue-100 text-blue-700' }
  if (i === total - 1) return { tag: '確認', color: 'bg-gray-100 text-gray-600' }
  if (i === total - 2) return { tag: '聯絡', color: 'bg-purple-100 text-purple-700' }
  return { tag: '自訂欄位', color: 'bg-orange-100 text-orange-700' }
}

const statusLabel: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft:  { label: '草稿',   variant: 'outline' },
  active: { label: '進行中', variant: 'default' },
  ended:  { label: '已結束', variant: 'secondary' },
}

const fieldTypeLabel: Record<string, string> = {
  text: '文字', select: '選擇', number: '數字', boolean: '是/否', textarea: '長文字',
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [activity, setActivity] = useState<Activity | null>(null)
  const [activityProducts, setActivityProducts] = useState<ActivityProduct[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [activityMaterials, setActivityMaterials] = useState<ActivityMaterial[]>([])
  const [allMaterials, setAllMaterials] = useState<Material[]>([])
  const [activityDeliveryMethods, setActivityDeliveryMethods] = useState<ActivityDeliveryMethod[]>([])
  const [allDeliveryMethods, setAllDeliveryMethods] = useState<DeliveryMethod[]>([])
  const [steps, setSteps] = useState<Step[]>(DEFAULT_STEPS)
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null)
  const [editingStepLabel, setEditingStepLabel] = useState('')
  const [stepsSaving, setStepsSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Edit activity dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '', status: 'draft' as Activity['status'], start_date: '', end_date: '', notes: '', images: [] as string[] })
  const [editSaving, setEditSaving] = useState(false)

  // Add / edit product dialog
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ActivityProduct | null>(null)
  const [productForm, setProductForm] = useState({ product_id: '', custom_price: '', stock_limit: '' })
  const [productSaving, setProductSaving] = useState(false)

  // Add / edit material dialog
  const [addMaterialDialogOpen, setAddMaterialDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<ActivityMaterial | null>(null)
  const [materialForm, setMaterialForm] = useState({ material_id: '', expected_quantity: '', notes: '' })
  const [materialSaving, setMaterialSaving] = useState(false)

  // Add / edit delivery method dialog
  const [addDeliveryDialogOpen, setAddDeliveryDialogOpen] = useState(false)
  const [editingDelivery, setEditingDelivery] = useState<ActivityDeliveryMethod | null>(null)
  const [deliveryForm, setDeliveryForm] = useState({ delivery_method_id: '', custom_fee: '' })
  const [deliverySaving, setDeliverySaving] = useState(false)

  // Add / edit custom field dialog
  const [addFieldDialogOpen, setAddFieldDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [fieldForm, setFieldForm] = useState({
    label: '', field_type: 'text' as CustomField['field_type'],
    is_required: false, options_text: '', step_index: 0,
  })
  const [fieldSaving, setFieldSaving] = useState(false)

  // Collapsible steps
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set([0]))
  const toggleStep = (i: number) => setOpenSteps(prev => {
    const next = new Set(prev)
    if (next.has(i)) next.delete(i); else next.add(i)
    return next
  })

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchAll = async () => {
    setLoading(true)
    const [
      { data: act },
      { data: aps },
      { data: cfs },
      { data: prods },
      { data: ams },
      { data: mats },
      { data: adms },
      { data: dms },
    ] = await Promise.all([
      supabase.from('activities').select('*').eq('id', id).single(),
      supabase.from('activity_products')
        .select('*, products(name, price)')
        .eq('activity_id', id)
        .order('sort_order'),
      supabase.from('activity_custom_fields')
        .select('*')
        .eq('activity_id', id)
        .order('sort_order'),
      supabase.from('products').select('id, name, price').eq('is_active', true).order('name'),
      supabase.from('activity_materials')
        .select('*, materials(name, unit, stock_quantity)')
        .eq('activity_id', id)
        .order('created_at'),
      supabase.from('materials').select('id, name, unit, stock_quantity').order('name'),
      supabase.from('activity_delivery_methods')
        .select('*, delivery_methods(name, default_fee)')
        .eq('activity_id', id)
        .order('created_at'),
      supabase.from('delivery_methods').select('id, name, default_fee').eq('is_active', true).order('default_fee'),
    ])
    if (act) {
      setActivity(act)
      setSteps(act.steps?.length >= 3 ? act.steps : DEFAULT_STEPS)
    }
    if (aps) setActivityProducts(aps as ActivityProduct[])
    if (cfs) setCustomFields(cfs as CustomField[])
    if (prods) setAllProducts(prods)
    if (ams) setActivityMaterials(ams as ActivityMaterial[])
    if (mats) setAllMaterials(mats)
    if (adms) setActivityDeliveryMethods(adms as unknown as ActivityDeliveryMethod[])
    if (dms) setAllDeliveryMethods(dms)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [id])

  // ── Edit Activity ─────────────────────────────────────────────────────────────

  const openEdit = () => {
    if (!activity) return
    setEditForm({
      name: activity.name,
      description: activity.description ?? '',
      status: activity.status,
      start_date: activity.start_date?.slice(0, 10) ?? '',
      end_date: activity.end_date?.slice(0, 10) ?? '',
      notes: activity.notes ?? '',
      images: activity.images ?? [],
    })
    setEditDialogOpen(true)
  }

  const saveActivity = async () => {
    if (!editForm.name.trim()) return
    setEditSaving(true)
    const { error } = await supabase.from('activities').update({
      name: editForm.name.trim(),
      description: editForm.description || null,
      status: editForm.status,
      start_date: editForm.start_date || null,
      end_date: editForm.end_date || null,
      notes: editForm.notes || null,
      images: editForm.images,
    }).eq('id', id)
    setEditSaving(false)
    if (!error) { setEditDialogOpen(false); fetchAll() }
    else alert('儲存失敗：' + error.message)
  }

  // ── Activity Products ─────────────────────────────────────────────────────────

  const openAddProduct = () => {
    setEditingProduct(null)
    setProductForm({ product_id: '', custom_price: '', stock_limit: '' })
    setAddProductDialogOpen(true)
  }

  const openEditProduct = (ap: ActivityProduct) => {
    setEditingProduct(ap)
    setProductForm({
      product_id: ap.product_id,
      custom_price: ap.custom_price != null ? String(ap.custom_price) : '',
      stock_limit: ap.stock_limit != null ? String(ap.stock_limit) : '',
    })
    setAddProductDialogOpen(true)
  }

  const saveProduct = async () => {
    setProductSaving(true)
    if (editingProduct) {
      const { error } = await supabase.from('activity_products').update({
        custom_price: productForm.custom_price ? parseFloat(productForm.custom_price) : editingProduct.products.price,
        stock_limit: productForm.stock_limit ? parseInt(productForm.stock_limit) : null,
      }).eq('id', editingProduct.id)
      setProductSaving(false)
      if (!error) { setAddProductDialogOpen(false); fetchAll() }
      else alert('儲存失敗：' + error.message)
    } else {
      if (!productForm.product_id) { setProductSaving(false); return }
      const selectedProduct = allProducts.find(p => p.id === productForm.product_id)
      const { error } = await supabase.from('activity_products').insert({
        activity_id: id,
        product_id: productForm.product_id,
        custom_price: productForm.custom_price ? parseFloat(productForm.custom_price) : selectedProduct?.price ?? 0,
        stock_limit: productForm.stock_limit ? parseInt(productForm.stock_limit) : null,
        sort_order: activityProducts.length + 1,
      })
      setProductSaving(false)
      if (!error) {
        setAddProductDialogOpen(false)
        setProductForm({ product_id: '', custom_price: '', stock_limit: '' })
        fetchAll()
      } else alert('新增失敗：' + error.message)
    }
  }

  const removeProduct = async (apId: string) => {
    if (!confirm('確定要移除這個商品？')) return
    await supabase.from('activity_products').delete().eq('id', apId)
    fetchAll()
  }

  // ── Activity Materials ────────────────────────────────────────────────────────

  const openAddMaterial = () => {
    setEditingMaterial(null)
    setMaterialForm({ material_id: '', expected_quantity: '', notes: '' })
    setAddMaterialDialogOpen(true)
  }

  const openEditMaterial = (am: ActivityMaterial) => {
    setEditingMaterial(am)
    setMaterialForm({
      material_id: am.material_id,
      expected_quantity: String(am.expected_quantity),
      notes: am.notes ?? '',
    })
    setAddMaterialDialogOpen(true)
  }

  const saveMaterial = async () => {
    setMaterialSaving(true)
    if (editingMaterial) {
      const { error } = await supabase.from('activity_materials').update({
        expected_quantity: parseInt(materialForm.expected_quantity) || 0,
        notes: materialForm.notes || null,
      }).eq('id', editingMaterial.id)
      setMaterialSaving(false)
      if (!error) { setAddMaterialDialogOpen(false); fetchAll() }
      else alert('儲存失敗：' + error.message)
    } else {
      if (!materialForm.material_id) { setMaterialSaving(false); return }
      const { error } = await supabase.from('activity_materials').insert({
        activity_id: id,
        material_id: materialForm.material_id,
        expected_quantity: parseInt(materialForm.expected_quantity) || 0,
        notes: materialForm.notes || null,
      })
      setMaterialSaving(false)
      if (!error) {
        setAddMaterialDialogOpen(false)
        setMaterialForm({ material_id: '', expected_quantity: '', notes: '' })
        fetchAll()
      } else alert('新增失敗：' + error.message)
    }
  }

  const removeMaterial = async (amId: string) => {
    if (!confirm('確定要移除這個包材？')) return
    await supabase.from('activity_materials').delete().eq('id', amId)
    fetchAll()
  }

  // ── Activity Delivery Methods ─────────────────────────────────────────────────

  const openAddDelivery = () => {
    setEditingDelivery(null)
    setDeliveryForm({ delivery_method_id: '', custom_fee: '' })
    setAddDeliveryDialogOpen(true)
  }

  const openEditDelivery = (adm: ActivityDeliveryMethod) => {
    setEditingDelivery(adm)
    setDeliveryForm({
      delivery_method_id: adm.delivery_method_id,
      custom_fee: adm.custom_fee != null ? String(adm.custom_fee) : '',
    })
    setAddDeliveryDialogOpen(true)
  }

  const saveDeliveryMethod = async () => {
    setDeliverySaving(true)
    if (editingDelivery) {
      const { error } = await supabase.from('activity_delivery_methods').update({
        custom_fee: deliveryForm.custom_fee !== '' ? parseFloat(deliveryForm.custom_fee) : null,
      }).eq('id', editingDelivery.id)
      setDeliverySaving(false)
      if (!error) { setAddDeliveryDialogOpen(false); fetchAll() }
      else alert('儲存失敗：' + error.message)
    } else {
      if (!deliveryForm.delivery_method_id) { setDeliverySaving(false); return }
      const { error } = await supabase.from('activity_delivery_methods').insert({
        activity_id: id,
        delivery_method_id: deliveryForm.delivery_method_id,
        custom_fee: deliveryForm.custom_fee !== '' ? parseFloat(deliveryForm.custom_fee) : null,
      })
      setDeliverySaving(false)
      if (!error) {
        setAddDeliveryDialogOpen(false)
        setDeliveryForm({ delivery_method_id: '', custom_fee: '' })
        fetchAll()
      } else alert('新增失敗：' + error.message)
    }
  }

  const removeDeliveryMethod = async (admId: string) => {
    if (!confirm('確定要移除這個物流方式？')) return
    await supabase.from('activity_delivery_methods').delete().eq('id', admId)
    fetchAll()
  }

  // ── Custom Fields ─────────────────────────────────────────────────────────────

  const openAddField = (defaultStepIndex = 0) => {
    setEditingField(null)
    setFieldForm({ label: '', field_type: 'text', is_required: false, options_text: '', step_index: defaultStepIndex })
    setAddFieldDialogOpen(true)
  }

  const openEditField = (cf: CustomField) => {
    setEditingField(cf)
    setFieldForm({
      label: cf.label,
      field_type: cf.field_type,
      is_required: cf.is_required,
      options_text: cf.options?.join('\n') ?? '',
      step_index: cf.step_index ?? 0,
    })
    setAddFieldDialogOpen(true)
  }

  const saveField = async () => {
    if (!fieldForm.label.trim()) return
    setFieldSaving(true)
    const options = fieldForm.field_type === 'select'
      ? fieldForm.options_text.split('\n').map(s => s.trim()).filter(Boolean)
      : []
    if (editingField) {
      const { error } = await supabase.from('activity_custom_fields').update({
        label: fieldForm.label.trim(),
        field_type: fieldForm.field_type,
        is_required: fieldForm.is_required,
        options,
        step_index: fieldForm.step_index,
      }).eq('id', editingField.id)
      setFieldSaving(false)
      if (!error) { setAddFieldDialogOpen(false); fetchAll() }
      else alert('儲存失敗：' + error.message)
    } else {
      const { error } = await supabase.from('activity_custom_fields').insert({
        activity_id: id,
        label: fieldForm.label.trim(),
        field_type: fieldForm.field_type,
        is_required: fieldForm.is_required,
        options,
        sort_order: customFields.length + 1,
        step_index: fieldForm.step_index,
      })
      setFieldSaving(false)
      if (!error) {
        setAddFieldDialogOpen(false)
        setFieldForm({ label: '', field_type: 'text', is_required: false, options_text: '', step_index: 0 })
        fetchAll()
      } else alert('新增失敗：' + error.message)
    }
  }

  const removeField = async (cfId: string) => {
    if (!confirm('確定要刪除這個欄位？')) return
    await supabase.from('activity_custom_fields').delete().eq('id', cfId)
    fetchAll()
  }

  // ── Steps ─────────────────────────────────────────────────────────────────────

  const saveSteps = async (newSteps: Step[]) => {
    setStepsSaving(true)
    const { error } = await supabase.from('activities').update({ steps: newSteps }).eq('id', id)
    setStepsSaving(false)
    if (error) alert('儲存失敗：' + error.message)
    else setSteps(newSteps)
  }

  const commitStepLabel = async () => {
    if (editingStepIndex === null) return
    if (!editingStepLabel.trim()) { setEditingStepIndex(null); return }
    const newSteps = steps.map((s, i) =>
      i === editingStepIndex ? { label: editingStepLabel.trim() } : s
    )
    setEditingStepIndex(null)
    await saveSteps(newSteps)
  }

  // 在 contact 步驟前插入一個新的自訂步驟
  const addCustomStep = async () => {
    const insertAt = steps.length - 2 // before contact
    const newSteps = [
      ...steps.slice(0, insertAt),
      { label: '新步驟' },
      ...steps.slice(insertAt),
    ]
    await saveSteps(newSteps)
    // 自動進入編輯模式
    setEditingStepIndex(insertAt)
    setEditingStepLabel('新步驟')
  }

  // 刪除一個自訂步驟（只能刪中間步驟）
  const deleteCustomStep = async (i: number) => {
    if (!confirm('確定刪除此步驟？該步驟的自訂欄位將移到第一步。')) return
    // 把該步驟的 custom fields 移回 step_index 0
    const fieldsInStep = customFields.filter(cf => cf.step_index === i)
    for (const cf of fieldsInStep) {
      await supabase.from('activity_custom_fields').update({ step_index: 0 }).eq('id', cf.id)
    }
    // 把後面步驟的 step_index 往前移
    const fieldsAfter = customFields.filter(cf => cf.step_index > i)
    for (const cf of fieldsAfter) {
      await supabase.from('activity_custom_fields').update({ step_index: cf.step_index - 1 }).eq('id', cf.id)
    }
    const newSteps = steps.filter((_, idx) => idx !== i)
    await saveSteps(newSteps)
    fetchAll()
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">載入中...</div>
  if (!activity) return <div className="flex items-center justify-center h-64 text-gray-400">活動不存在</div>

  // Products already in activity (for filtering)
  const existingProductIds = new Set(activityProducts.map(ap => ap.product_id))
  const availableProducts = allProducts.filter(p => !existingProductIds.has(p.id))

  // Materials already in activity (for filtering)
  const existingMaterialIds = new Set(activityMaterials.map(am => am.material_id))
  const availableMaterials = allMaterials.filter(m => !existingMaterialIds.has(m.id))

  // Delivery methods already in activity (for filtering)
  const existingDeliveryIds = new Set(activityDeliveryMethods.map(adm => adm.delivery_method_id))
  const availableDeliveryMethods = allDeliveryMethods.filter(dm => !existingDeliveryIds.has(dm.id))

  // Step role helpers
  const totalSteps = steps.length
  const isProductsStep = (i: number) => i === 0
  const isContactStep  = (i: number) => i === totalSteps - 2
  const isConfirmStep  = (i: number) => i === totalSteps - 1
  const isMidStep      = (i: number) => i > 0 && i < totalSteps - 2

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/activities')} className="mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{activity.name}</h1>
              <Badge variant={statusLabel[activity.status].variant}>
                {statusLabel[activity.status].label}
              </Badge>
            </div>
            <p className="text-gray-400 text-sm mt-0.5">
              {activity.start_date?.slice(0, 10) ?? '—'} ～ {activity.end_date?.slice(0, 10) ?? '—'}
            </p>
            {activity.description && (
              <p className="text-gray-500 text-sm mt-1">{activity.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <a href={`/activity/${id}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1.5" />前台購買頁
            </Button>
          </a>
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Pencil className="h-4 w-4 mr-1.5" />編輯活動
          </Button>
        </div>
      </div>

      {/* ── 活動圖片 ────────────────────────────────────── */}
      {activity.images?.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {activity.images.map((url, i) => (
            <img key={i} src={url} alt="" className="h-24 w-auto rounded-lg border object-cover" />
          ))}
        </div>
      )}

      {/* ── 步驟設定（含所有內容）──────────────────────── */}
      <div className="border rounded-lg bg-white">

        {/* 區塊標題 */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h2 className="font-semibold">步驟設定</h2>
            <p className="text-xs text-gray-400 mt-0.5">點開每個步驟，設定對應的商品、欄位與物流</p>
          </div>
          <div className="flex items-center gap-2">
            {stepsSaving && <span className="text-xs text-gray-400">儲存中...</span>}
            <Button size="sm" variant="outline" onClick={addCustomStep}>
              <Plus className="h-4 w-4 mr-1" />加入步驟
            </Button>
          </div>
        </div>

        {/* Step indicator 預覽 */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-0 overflow-x-auto">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center shrink-0">
              <button
                onClick={() => toggleStep(i)}
                className={`flex flex-col items-center gap-1 group/dot transition-opacity ${openSteps.has(i) ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors
                  ${openSteps.has(i) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {i + 1}
                </div>
                <span className={`text-xs whitespace-nowrap ${openSteps.has(i) ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div className="w-8 h-0.5 bg-gray-200 mx-1 mb-4" />
              )}
            </div>
          ))}
        </div>

        {/* 各步驟 Collapsible 面板 */}
        <div className="px-4 pb-4 space-y-2 mt-2">
          {steps.map((s, i) => {
            const role = stepRole(i, steps.length)
            const isFixed  = i === 0 || i === steps.length - 1 || i === steps.length - 2
            const isOpen   = openSteps.has(i)
            const isEditing = editingStepIndex === i
            const stepFields = customFields.filter(cf => (cf.step_index ?? 0) === i)

            // Step icon
            const StepIcon = isProductsStep(i) ? ShoppingCart
                           : isContactStep(i)  ? Truck
                           : isConfirmStep(i)  ? Settings2
                           : Package

            return (
              <div key={i} className={`rounded-lg border transition-shadow ${isOpen ? 'shadow-sm' : ''}`}>

                {/* ── 步驟列 header ── */}
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none group rounded-lg transition-colors
                    ${isOpen ? 'bg-blue-50 rounded-b-none border-b' : 'hover:bg-gray-50'}`}
                  onClick={() => !isEditing && toggleStep(i)}
                >
                  {/* 數字圓圈 */}
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0
                    ${isOpen ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {i + 1}
                  </span>

                  {/* 名稱（可 inline 編輯） */}
                  {isEditing ? (
                    <Input
                      autoFocus
                      className="h-7 text-sm flex-1"
                      value={editingStepLabel}
                      onChange={e => setEditingStepLabel(e.target.value)}
                      onBlur={commitStepLabel}
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitStepLabel()
                        if (e.key === 'Escape') setEditingStepIndex(null)
                      }}
                    />
                  ) : (
                    <span className={`flex-1 text-sm font-medium ${isOpen ? 'text-blue-700' : ''}`}>{s.label}</span>
                  )}

                  {/* 角色 badge */}
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${role.color}`}>{role.tag}</span>

                  {/* 內容摘要（收起時顯示） */}
                  {!isOpen && !isEditing && (
                    <span className="text-xs text-gray-400 hidden sm:block">
                      {isProductsStep(i) && `${activityProducts.length} 商品・${activityMaterials.length} 包材`}
                      {isMidStep(i)      && `${stepFields.length} 欄位`}
                      {isContactStep(i)  && `${activityDeliveryMethods.length} 物流`}
                    </span>
                  )}

                  {/* 改名 */}
                  {!isEditing && (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={e => { e.stopPropagation(); setEditingStepIndex(i); setEditingStepLabel(s.label) }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                  {/* 刪除（只有中間步驟） */}
                  {!isFixed && !isEditing && (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={e => { e.stopPropagation(); deleteCustomStep(i) }}>
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </Button>
                  )}

                  {/* Expand arrow */}
                  <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
                </div>

                {/* ── 步驟內容（展開） ── */}
                {isOpen && (
                  <div className="divide-y">

                    {/* ── 商品步驟 ── */}
                    {isProductsStep(i) && (
                      <>
                        {/* 商品 */}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <ShoppingCart className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-semibold text-gray-700">商品</span>
                            </div>
                            <Button size="sm" variant="outline" onClick={openAddProduct} disabled={availableProducts.length === 0}>
                              <Plus className="h-3.5 w-3.5 mr-1" />加入商品
                            </Button>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>商品名稱</TableHead>
                                <TableHead>原價</TableHead>
                                <TableHead>活動價</TableHead>
                                <TableHead>庫存上限</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {activityProducts.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-6 text-gray-400 text-sm">
                                    尚未加入商品
                                  </TableCell>
                                </TableRow>
                              ) : activityProducts.map(ap => (
                                <TableRow key={ap.id}>
                                  <TableCell className="font-medium">{ap.products.name}</TableCell>
                                  <TableCell className="text-gray-400">NT$ {ap.products.price.toLocaleString()}</TableCell>
                                  <TableCell>
                                    {ap.custom_price != null
                                      ? <span className="font-medium text-blue-600">NT$ {ap.custom_price.toLocaleString()}</span>
                                      : <span className="text-gray-400">同原價</span>}
                                  </TableCell>
                                  <TableCell>{ap.stock_limit ?? <span className="text-gray-400">不限</span>}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button variant="ghost" size="sm" onClick={() => openEditProduct(ap)}><Pencil className="h-4 w-4" /></Button>
                                      <Button variant="ghost" size="sm" onClick={() => removeProduct(ap.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* 包材 */}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-semibold text-gray-700">包材</span>
                              <span className="text-xs text-gray-400">（活動所需包裝材料）</span>
                            </div>
                            <Button size="sm" variant="outline" onClick={openAddMaterial} disabled={availableMaterials.length === 0}>
                              <Plus className="h-3.5 w-3.5 mr-1" />加入包材
                            </Button>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>包材名稱</TableHead>
                                <TableHead>單位</TableHead>
                                <TableHead>現有庫存</TableHead>
                                <TableHead>預計用量</TableHead>
                                <TableHead>差額</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {activityMaterials.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center py-6 text-gray-400 text-sm">
                                    尚未指定包材
                                  </TableCell>
                                </TableRow>
                              ) : activityMaterials.map(am => {
                                const diff = am.materials.stock_quantity - am.expected_quantity
                                return (
                                  <TableRow key={am.id}>
                                    <TableCell className="font-medium">{am.materials.name}</TableCell>
                                    <TableCell className="text-gray-500">{am.materials.unit}</TableCell>
                                    <TableCell>{am.materials.stock_quantity.toLocaleString()}</TableCell>
                                    <TableCell className="font-medium">{am.expected_quantity.toLocaleString()}</TableCell>
                                    <TableCell>
                                      <span className={`text-sm font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {diff >= 0 ? `+${diff}` : diff}
                                      </span>
                                      {diff < 0 && <span className="ml-1 text-xs text-red-400">需補貨</span>}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => openEditMaterial(am)}><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="sm" onClick={() => removeMaterial(am.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>

                        {/* 商品步驟的自訂欄位 */}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Settings2 className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-semibold text-gray-700">此步驟的自訂欄位</span>
                              <span className="text-xs text-gray-400">（顯示在商品頁下方）</span>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => openAddField(0)}>
                              <Plus className="h-3.5 w-3.5 mr-1" />新增欄位
                            </Button>
                          </div>
                          {stepFields.length === 0 ? (
                            <p className="text-sm text-gray-400 py-3 text-center">尚無自訂欄位</p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>欄位名稱</TableHead>
                                  <TableHead>類型</TableHead>
                                  <TableHead>必填</TableHead>
                                  <TableHead>選項</TableHead>
                                  <TableHead></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {stepFields.map(cf => (
                                  <TableRow key={cf.id}>
                                    <TableCell className="font-medium">{cf.label}</TableCell>
                                    <TableCell>{fieldTypeLabel[cf.field_type]}</TableCell>
                                    <TableCell>
                                      {cf.is_required
                                        ? <Badge variant="destructive" className="text-xs">必填</Badge>
                                        : <span className="text-gray-400 text-xs">選填</span>}
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                      {cf.options?.length > 0 ? cf.options.join('、') : '—'}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => openEditField(cf)}><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="sm" onClick={() => removeField(cf.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </>
                    )}

                    {/* ── 中間自訂步驟 ── */}
                    {isMidStep(i) && (
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-semibold text-gray-700">自訂欄位</span>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => openAddField(i)}>
                            <Plus className="h-3.5 w-3.5 mr-1" />新增欄位
                          </Button>
                        </div>
                        {stepFields.length === 0 ? (
                          <p className="text-sm text-gray-400 py-3 text-center">此步驟尚無自訂欄位，點右上角新增</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>欄位名稱</TableHead>
                                <TableHead>類型</TableHead>
                                <TableHead>必填</TableHead>
                                <TableHead>選項</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {stepFields.map(cf => (
                                <TableRow key={cf.id}>
                                  <TableCell className="font-medium">{cf.label}</TableCell>
                                  <TableCell>{fieldTypeLabel[cf.field_type]}</TableCell>
                                  <TableCell>
                                    {cf.is_required
                                      ? <Badge variant="destructive" className="text-xs">必填</Badge>
                                      : <span className="text-gray-400 text-xs">選填</span>}
                                  </TableCell>
                                  <TableCell className="text-gray-500 text-sm">
                                    {cf.options?.length > 0 ? cf.options.join('、') : '—'}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button variant="ghost" size="sm" onClick={() => openEditField(cf)}><Pencil className="h-4 w-4" /></Button>
                                      <Button variant="ghost" size="sm" onClick={() => removeField(cf.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    )}

                    {/* ── 聯絡步驟：物流方式 ── */}
                    {isContactStep(i) && (
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-semibold text-gray-700">物流方式</span>
                            <span className="text-xs text-gray-400">（客戶在聯絡資料頁選擇）</span>
                          </div>
                          <Button size="sm" variant="outline" onClick={openAddDelivery} disabled={availableDeliveryMethods.length === 0}>
                            <Plus className="h-3.5 w-3.5 mr-1" />加入物流
                          </Button>
                        </div>
                        {activityDeliveryMethods.length === 0 ? (
                          <p className="text-sm text-red-400 py-3 text-center">尚未設定物流方式，前台客戶將無法結帳</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>物流名稱</TableHead>
                                <TableHead>預設運費</TableHead>
                                <TableHead>此活動運費</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {activityDeliveryMethods.map(adm => {
                                const effectiveFee = adm.custom_fee ?? adm.delivery_methods.default_fee
                                return (
                                  <TableRow key={adm.id}>
                                    <TableCell className="font-medium">{adm.delivery_methods.name}</TableCell>
                                    <TableCell className="text-gray-400">
                                      {adm.delivery_methods.default_fee === 0 ? '免運' : `NT$ ${adm.delivery_methods.default_fee}`}
                                    </TableCell>
                                    <TableCell>
                                      {adm.custom_fee != null
                                        ? <span className="font-medium text-blue-600">{adm.custom_fee === 0 ? '免運' : `NT$ ${adm.custom_fee}`}</span>
                                        : <span className="text-gray-400 text-sm">同預設</span>}
                                      <span className="ml-2 text-xs text-gray-500">
                                        → 實收 {effectiveFee === 0 ? '免運' : `NT$ ${effectiveFee}`}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => openEditDelivery(adm)}><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="sm" onClick={() => removeDeliveryMethod(adm.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    )}

                    {/* ── 確認步驟 ── */}
                    {isConfirmStep(i) && (
                      <div className="p-4">
                        <p className="text-sm text-gray-400 text-center py-2">
                          確認步驟自動顯示訂單摘要（商品、聯絡資料、金額），無額外設定項目。
                        </p>
                      </div>
                    )}

                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-xs text-gray-400 px-4 pb-3">
          <span className="font-medium">商品</span>・<span className="font-medium">聯絡</span>・<span className="font-medium">確認</span> 為固定步驟，可改名但不可刪除。
        </p>
      </div>

      {/* ── 編輯活動 Dialog ──────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>編輯活動</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>活動名稱 *</Label>
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>狀態</Label>
              <Select value={editForm.status} onValueChange={v => v && setEditForm({ ...editForm, status: v as Activity['status'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="active">進行中</SelectItem>
                  <SelectItem value="ended">已結束</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>開始日期</Label>
                <Input type="date" value={editForm.start_date} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>結束日期</Label>
                <Input type="date" value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>說明</Label>
              <Textarea rows={3} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>備註</Label>
              <Textarea rows={2} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>圖片</Label>
              <ImageUploader
                images={editForm.images}
                onChange={imgs => setEditForm({ ...editForm, images: imgs })}
                folder="activities"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
            <Button onClick={saveActivity} disabled={editSaving || !editForm.name.trim()}>
              {editSaving ? '儲存中...' : '儲存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 加入／編輯商品 Dialog ────────────────────────── */}
      <Dialog open={addProductDialogOpen} onOpenChange={setAddProductDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingProduct ? '編輯商品設定' : '加入商品'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editingProduct ? (
              <div className="text-sm font-medium text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                {editingProduct.products.name}
                <span className="text-gray-400 ml-2">原價 NT$ {editingProduct.products.price.toLocaleString()}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>選擇商品 *</Label>
                <Select value={productForm.product_id} onValueChange={v => {
                  if (!v) return
                  const p = allProducts.find(x => x.id === v)
                  setProductForm({ ...productForm, product_id: v, custom_price: p?.price != null ? String(p.price) : '' })
                }}>
                  <SelectTrigger><SelectValue placeholder="選擇商品" /></SelectTrigger>
                  <SelectContent>
                    {availableProducts.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}（NT$ {p.price.toLocaleString()}）</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>活動價（NT$）</Label>
                <Input type="number" placeholder="預設同原價" value={productForm.custom_price}
                  onChange={e => setProductForm({ ...productForm, custom_price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>庫存上限</Label>
                <Input type="number" placeholder="不限" value={productForm.stock_limit}
                  onChange={e => setProductForm({ ...productForm, stock_limit: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProductDialogOpen(false)}>取消</Button>
            <Button onClick={saveProduct} disabled={productSaving || (!editingProduct && !productForm.product_id)}>
              {productSaving ? '儲存中...' : editingProduct ? '儲存' : '加入'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 新增／編輯自訂欄位 Dialog ───────────────────── */}
      <Dialog open={addFieldDialogOpen} onOpenChange={setAddFieldDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingField ? '編輯自訂欄位' : '新增自訂欄位'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>欄位名稱 *</Label>
              <Input placeholder="例：包裝顏色" value={fieldForm.label}
                onChange={e => setFieldForm({ ...fieldForm, label: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>欄位類型</Label>
              <Select value={fieldForm.field_type} onValueChange={v => v && setFieldForm({ ...fieldForm, field_type: v as CustomField['field_type'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">文字</SelectItem>
                  <SelectItem value="textarea">長文字</SelectItem>
                  <SelectItem value="select">選擇（下拉）</SelectItem>
                  <SelectItem value="number">數字</SelectItem>
                  <SelectItem value="boolean">是/否</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {fieldForm.field_type === 'select' && (
              <div className="space-y-2">
                <Label>選項（每行一個）</Label>
                <Textarea
                  placeholder={"紅\n藍\n白"}
                  rows={4}
                  value={fieldForm.options_text}
                  onChange={e => setFieldForm({ ...fieldForm, options_text: e.target.value })}
                />
              </div>
            )}
            {/* 步驟選擇：只顯示商品步驟 + 中間自訂步驟（不含聯絡/確認） */}
            <div className="space-y-2">
              <Label>出現在步驟</Label>
              <Select
                value={String(fieldForm.step_index)}
                onValueChange={v => v != null && setFieldForm({ ...fieldForm, step_index: parseInt(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {steps.slice(0, steps.length - 2).map((s, i) => (
                    <SelectItem key={i} value={String(i)}>
                      步驟 {i + 1}・{s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_required" checked={fieldForm.is_required}
                onChange={e => setFieldForm({ ...fieldForm, is_required: e.target.checked })} />
              <Label htmlFor="is_required">必填</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFieldDialogOpen(false)}>取消</Button>
            <Button onClick={saveField} disabled={fieldSaving || !fieldForm.label.trim()}>
              {fieldSaving ? '儲存中...' : editingField ? '儲存' : '新增'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 加入／編輯物流 Dialog ────────────────────────── */}
      <Dialog open={addDeliveryDialogOpen} onOpenChange={setAddDeliveryDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingDelivery ? '編輯物流運費' : '加入物流方式'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editingDelivery ? (
              <div className="text-sm font-medium text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                {editingDelivery.delivery_methods.name}
                <span className="text-gray-400 ml-2">
                  預設 {editingDelivery.delivery_methods.default_fee === 0 ? '免運' : `NT$ ${editingDelivery.delivery_methods.default_fee}`}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>物流方式 *</Label>
                <Select value={deliveryForm.delivery_method_id} onValueChange={v => {
                  if (!v) return
                  const dm = allDeliveryMethods.find(x => x.id === v)
                  setDeliveryForm({ delivery_method_id: v, custom_fee: dm ? String(dm.default_fee) : '' })
                }}>
                  <SelectTrigger><SelectValue placeholder="選擇物流方式" /></SelectTrigger>
                  <SelectContent>
                    {availableDeliveryMethods.map(dm => (
                      <SelectItem key={dm.id} value={dm.id}>
                        {dm.name}（預設 {dm.default_fee === 0 ? '免運' : `NT$ ${dm.default_fee}`}）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>
                此活動運費（NT$）
                <span className="ml-1 text-xs text-gray-400 font-normal">留空則沿用預設</span>
              </Label>
              <Input
                type="number"
                min={0}
                placeholder="留空沿用預設"
                value={deliveryForm.custom_fee}
                onChange={e => setDeliveryForm({ ...deliveryForm, custom_fee: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDeliveryDialogOpen(false)}>取消</Button>
            <Button onClick={saveDeliveryMethod} disabled={deliverySaving || (!editingDelivery && !deliveryForm.delivery_method_id)}>
              {deliverySaving ? '儲存中...' : editingDelivery ? '儲存' : '加入'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 加入／編輯包材 Dialog ────────────────────────── */}
      <Dialog open={addMaterialDialogOpen} onOpenChange={setAddMaterialDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? '編輯包材設定' : '加入包材'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editingMaterial ? (
              <div className="text-sm font-medium text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                {editingMaterial.materials.name}
                <span className="text-gray-400 ml-2">
                  庫存 {editingMaterial.materials.stock_quantity.toLocaleString()} {editingMaterial.materials.unit}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>選擇包材 *</Label>
                <Select value={materialForm.material_id} onValueChange={v => v && setMaterialForm({ ...materialForm, material_id: v })}>
                  <SelectTrigger><SelectValue placeholder="選擇包材" /></SelectTrigger>
                  <SelectContent>
                    {availableMaterials.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}（庫存 {m.stock_quantity.toLocaleString()} {m.unit}）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>預計用量</Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={materialForm.expected_quantity}
                onChange={e => setMaterialForm({ ...materialForm, expected_quantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>備註</Label>
              <Input
                placeholder="選填"
                value={materialForm.notes}
                onChange={e => setMaterialForm({ ...materialForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMaterialDialogOpen(false)}>取消</Button>
            <Button onClick={saveMaterial} disabled={materialSaving || (!editingMaterial && !materialForm.material_id)}>
              {materialSaving ? '儲存中...' : editingMaterial ? '儲存' : '加入'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
