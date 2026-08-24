'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient, STORAGE_BUCKETS, uploadFile } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Card, PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '@/components/ui'
import type { Payment } from '@/types/database'

const STATUS_LABELS: Record<string,string> = { pending:'معلق', completed:'مكتمل', failed:'فشل', cancelled:'ملغي' }
const STATUS_COLORS: Record<string,'yellow'|'green'|'red'|'gray'> = { pending:'yellow', completed:'green', failed:'red', cancelled:'gray' }

export default function FinancePage() {
  const { user, orgId, role } = useAuth()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const canPay = ['finance_manager','factory_manager','general_manager','super_admin'].includes(role||'')

  const load = useCallback(async () => {
    if (!orgId) return
    try {
      const { data } = await supabase.from('payments').select('*, payroll_item:payroll_items(*, worker:workers(*))').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100)
      setPayments(data || [])
    } catch { setError('حدث خطأ في تحميل بيانات المدفوعات') }
    finally { setLoading(false) }
  }, [orgId])

  useEffect(() => { load() }, [load])

  async function markPaid(payment: any) {
    if (!orgId || !user || !receiptFile) return
    setPayingId(payment.id); setError(null)
    try {
      const ext = receiptFile.name.split('.').pop()
      const path = `${orgId}/${payment.id}/${Date.now()}.${ext}`
      const storagePath = await uploadFile(STORAGE_BUCKETS.PAYMENT_RECEIPTS, path, receiptFile)
      await supabase.from('payment_receipts').insert({ payment_id: payment.id, organization_id: orgId, storage_path: storagePath, file_name: receiptFile.name, file_size: receiptFile.size, mime_type: receiptFile.type, uploaded_by: user.id, uploaded_at: new Date().toISOString() })
      const { count } = await supabase.from('payments').update({ status: 'completed', payment_date: new Date().toISOString(), processed_by: user.id }).eq('id', payment.id).eq('status', 'pending').select('id', { count: 'exact', head: true })
      if (count === 0) { setError('هذه الدفعة مكتملة مسبقاً — لا يمكن الدفع مرتين'); return }
      if (payment.payroll_item_id) { await supabase.from('payroll_items').update({ payment_status: 'Paid' }).eq('id', payment.payroll_item_id) }
      setSuccess('تم تسجيل الدفع بنجاح ✓'); setShowReceiptModal(false); setReceiptFile(null); setSelectedPayment(null); load()
      setTimeout(() => setSuccess(null), 4000)
    } catch (e: any) { setError(`خطأ في معالجة الدفع: ${e?.message || 'حاول مجدداً'}`) }
    finally { setPayingId(null) }
  }

  const filtered = payments.filter(p => !filterStatus || p.status === filterStatus)
  const totals = { pending: payments.filter(p=>p.status==='pending').reduce((s,p)=>s+p.amount,0), completed: payments.filter(p=>p.status==='completed').reduce((s,p)=>s+p.amount,0) }

  if (loading) return <div className="p-6"><LoadingSpinner /></div>

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <PageHeader title="💳 إدارة المدفوعات" subtitle="رفع إشعارات التحويل وتأكيد الدفع" />
      {success && <div className="bg-green-900/30 border border-green-700 text-green-300 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 animate-fade-in"><span>✅</span>{success}</div>}
      {error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-4 py-3 mb-4 flex items-center gap-2"><span>⚠️</span>{error}<button className="mr-auto" onClick={()=>setError(null)}>✕</button></div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[{label:'إجمالي المعلق',value:totals.pending.toLocaleString('ar-EG',{minimumFractionDigits:2}),color:'text-yellow-400'},{label:'إجمالي المدفوع',value:totals.completed.toLocaleString('ar-EG',{minimumFractionDigits:2}),color:'text-green-400'},{label:'عدد المعلق',value:payments.filter(p=>p.status==='pending').length,color:'text-yellow-400'},{label:'عدد المكتمل',value:payments.filter(p=>p.status==='completed').length,color:'text-green-400'}].map(s=>(
          <Card key={s.label} className="p-4 text-center"><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p><p className="text-gray-400 text-xs mt-1">{s.label}</p></Card>
        ))}
      </div>
      <div className="mb-4 flex gap-2 flex-wrap">
        {['','pending','completed','failed','cancelled'].map(s=>(
          <button key={s} onClick={()=>setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus===s?'bg-brand-blue-light text-white':'bg-brand-surface-2 text-gray-400 hover:text-white'}`}>
            {s?STATUS_LABELS[s]:'الكل'}{s?` (${payments.filter(p=>p.status===s).length})`:''}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? <EmptyState icon="💳" title="لا توجد مدفوعات" /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800 text-gray-400 text-xs">{['العامل','المبلغ','طريقة الدفع','تاريخ الإنشاء','الحالة','إجراء'].map(h=><th key={h} className="text-right px-4 py-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(p=>(
                  <tr key={p.id} className="border-b border-gray-800/50 hover:bg-brand-surface-2/50 transition-colors">
                    <td className="px-4 py-3"><p className="text-white font-medium">{p.payroll_item?.worker?.full_name || p.account_holder_name || 'غير محدد'}</p><p className="text-gray-500 text-xs">{p.bank_account || '—'}</p></td>
                    <td className="px-4 py-3 text-brand-gold-light font-bold">{p.amount?.toLocaleString('ar-EG',{minimumFractionDigits:2})}</td>
                    <td className="px-4 py-3 text-gray-300">{p.payment_method || 'تحويل بنكي'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString('ar-EG')}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS_COLORS[p.status]}>{STATUS_LABELS[p.status]}</Badge></td>
                    <td className="px-4 py-3">{canPay && p.status==='pending' ? <Button variant="primary" size="sm" onClick={()=>{setSelectedPayment(p);setReceiptFile(null);setError(null);setShowReceiptModal(true)}}>رفع إشعار الدفع</Button> : p.status==='completed' ? <span className="text-green-400 text-xs">✓ مكتمل</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Modal open={showReceiptModal} onClose={()=>{setShowReceiptModal(false);setReceiptFile(null)}} title="رفع إشعار التحويل"
        footer={<><Button variant="secondary" onClick={()=>{setShowReceiptModal(false);setReceiptFile(null)}}>إلغاء</Button><Button variant="primary" loading={!!payingId} disabled={!receiptFile} onClick={()=>selectedPayment&&markPaid(selectedPayment)}>تأكيد الدفع</Button></>}
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="bg-brand-surface-2 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-2">تفاصيل الدفعة</p>
              <p className="text-white font-bold">{selectedPayment.payroll_item?.worker?.full_name || selectedPayment.account_holder_name}</p>
              <p className="text-brand-gold-light font-bold text-lg mt-1">{selectedPayment.amount?.toLocaleString('ar-EG',{minimumFractionDigits:2})}</p>
              <p className="text-gray-400 text-xs mt-1">{selectedPayment.bank_account || 'بدون حساب'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">إشعار التحويل (صورة أو PDF) *</label>
              <div onClick={()=>fileRef.current?.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${receiptFile?'border-green-600 bg-green-900/10':'border-gray-700 hover:border-brand-blue-light'}`}>
                <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf" onChange={e=>setReceiptFile(e.target.files?.[0]||null)} />
                {receiptFile ? <div><p className="text-green-400 font-medium">✓ {receiptFile.name}</p><p className="text-gray-500 text-xs mt-1">{(receiptFile.size/1024).toFixed(1)} KB</p></div> : <div><p className="text-4xl mb-2">📎</p><p className="text-gray-400">اضغط لاختيار الملف</p></div>}
              </div>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 text-xs text-yellow-300">⚠️ بعد تأكيد الدفع لن يمكن التراجع عنه ولا يمكن الدفع مرتين.</div>
          </div>
        )}
      </Modal>
    </div>
  )
}
