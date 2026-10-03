import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpLeft, Boxes, Building2, Check, ChevronDown, CircleHelp, Clock3, Layers3, MapPin, Package, Palette, Search, ShieldCheck, SlidersHorizontal, Truck, Users, Wallet, X, ChartNoAxesCombined, Store, PackageCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import SmoothButton from '@/components/smooth-ui/smooth-button'
import { branches, shipments, stockItems, type Shipment } from './data'

type Route = { path: string; query: URLSearchParams }
const routeNow = (): Route => {
  const [path, query = ''] = (window.location.hash.slice(1) || '/').split('?')
  return { path, query: new URLSearchParams(query) }
}
function go(path: string) { window.location.hash = path }
// Persist only prototype presentation preferences, never stock or money changes.
function useReviewState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try { const stored = sessionStorage.getItem(`ui-review:${key}`); return stored ? JSON.parse(stored) : initial }
    catch { return initial }
  })
  useEffect(() => { try { sessionStorage.setItem(`ui-review:${key}`, JSON.stringify(value)) } catch { /* Private browsing may disable storage. */ } }, [key, value])
  return [value, setValue] as const
}
const branchName = (id: string | null | undefined) => branches.find(b => b.id === id)?.name || 'خارج الفرع'
const money = (amount: number) => new Intl.NumberFormat('en-EG', { maximumFractionDigits: 2 }).format(amount)
const dateLabel = (value: string) => Number.isNaN(Date.parse(value)) ? value : new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
const normalize = (text: string) => text.trim().toLocaleLowerCase('ar').replace(/[٠-٩]/g, n => String('٠١٢٣٤٥٦٧٨٩'.indexOf(n)))
const matches = (value: string, term: string) => normalize(value).includes(normalize(term))
const assignedBranches = branches.slice(0, 2)

function Status({ shipment }: { shipment: Shipment }) {
  const tone = shipment.state === 'damaged' ? 'warning' : shipment.state === 'delivered' ? 'success' : shipment.branchId ? 'neutral' : 'moving'
  return <Badge variant="outline" className={`status ${tone}`}><span className="status-dot" />{shipment.stateLabel}</Badge>
}
function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1 tabIndex={-1}>{title}</h1><p className="page-description">{description}</p></div>{action}</div>
}
function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return <label className="select-field"><span>{label}</span><div><select value={value} onChange={e => onChange(e.target.value)}>{children}</select><ChevronDown size={15} aria-hidden /></div></label>
}
function ShipmentRows({ items, showBranch = true }: { items: Shipment[]; showBranch?: boolean }) {
  return <>
    <div className="table-wrap"><table className="shipment-table"><thead><tr><th>الشحنة / البراند</th><th>المستلم</th><th>الحالة</th>{showBranch && <th>المكان / العهدة الحالية</th>}<th>آخر تحديث</th><th><span className="sr-only">التفاصيل</span></th></tr></thead>
      <tbody>{items.map(s => <tr key={s.id}><td><a className="shipment-link" href={`#/shipment/${s.id}`}><bdi>{s.id}</bdi><ArrowUpLeft size={14} /></a><small>{s.brand}</small></td><td><span>{s.customer}</span><small>{s.governorate} · {s.area}</small></td><td><Status shipment={s} /></td>{showBranch && <td><span>{s.branchId ? branchName(s.branchId) : s.custodian}</span><small>{s.branchId ? 'داخل الفرع' : 'خارج مخزون الفرع'}</small></td>}<td className="timestamp">{dateLabel(s.updatedAt)}</td><td><a href={`#/shipment/${s.id}`} className="row-open" aria-label={`تفاصيل الشحنة ${s.id}`}><ArrowLeft size={17} /></a></td></tr>)}</tbody></table></div>
    <div className="shipment-cards">{items.map(s => <a className="shipment-card" key={s.id} href={`#/shipment/${s.id}`}><div className="card-row"><span className="shipment-link"><bdi>{s.id}</bdi><ArrowUpLeft size={14}/></span><Status shipment={s}/></div><div className="card-row"><strong>{s.customer}</strong><span className="muted">{s.brand}</span></div><div className="card-row muted"><span><MapPin size={14}/>{s.branchId ? branchName(s.branchId) : s.custodian}</span><span>{s.pieces} {s.pieces === 1 ? 'قطعة' : 'قطع'}</span></div></a>)}</div>
  </>
}
function EmptyState({ reset }: { reset?: () => void }) {
  return <div className="empty-state"><div className="empty-icon"><Search size={25}/></div><h3>مفيش نتائج بالاختيارات دي</h3><p>جرّب رقم شحنة أو اسم مختلف، أو وسّع الفلاتر.</p>{reset && <Button variant="outline" onClick={reset}>مسح الفلاتر</Button>}</div>
}
function Home() {
  const [term, setTerm] = useState('')
  const submit = (e: FormEvent) => { e.preventDefault(); go(`/tracking${term.trim() ? `?q=${encodeURIComponent(term.trim())}` : ''}`) }
  const cards = [
    { title: 'المخزون', description: 'الشحنات والمنتجات الموجودة في فروعك', icon: Boxes, href: '/inventory', tag: 'افتح المخزون' },
    { title: 'تتبع الشحنات', description: 'اعرف مكان أي شحنة ورحلتها بالكامل', icon: MapPin, href: '/tracking', tag: 'ابحث عن شحنة' },
    { title: 'البراندات', description: 'حسابات البراندات وإعدادات التعامل', icon: Store },
    { title: 'المالية', description: 'التوريدات والتحصيل وحركة الخزائن', icon: Wallet },
    { title: 'الفريق', description: 'الموظفون والمستحقات والخصومات', icon: Users },
    { title: 'التقارير', description: 'متابعة الإيرادات والمصروفات والنتائج', icon: ChartNoAxesCombined },
  ]
  return <div className="home-page">
    <div className="home-intro"><p className="eyebrow"><span className="tiny-mark"/> مساحة العمل</p><h1 tabIndex={-1}>أهلًا يا أحمد<span className="welcome-dot">.</span></h1><p>اختار القسم اللي محتاجه، أو ابحث عن شحنة.</p></div>
    <form className="hero-search" onSubmit={submit}><Search size={20} aria-hidden/><Input aria-label="ابحث عن شحنة في الشركة" placeholder="رقم الشحنة، اسم المستلم، أو البراند…" value={term} onChange={e => setTerm(e.target.value)}/><SmoothButton type="submit" variant="default" size="lg" className="primary-action">تتبع شحنة<ArrowLeft size={17}/></SmoothButton></form>
    <div className="section-caption"><span>أقسام الشغل</span><span className="muted">المخزون والتتبع متاحين للتجربة</span></div>
    <div className="module-grid">{cards.map(({ title, description, icon: Icon, href, tag }) => href ? <a className="module-card" href={`#${href}`} key={title}><div className="module-top"><span className="module-icon"><Icon size={26} strokeWidth={1.6}/></span><ArrowUpLeft size={19} className="module-arrow"/></div><h2>{title}</h2><p>{description}</p><span className="module-foot">{tag}<ArrowLeft size={15}/></span></a> : <div className="module-card future-module" key={title} aria-disabled="true"><div className="module-top"><span className="module-icon"><Icon size={26} strokeWidth={1.6}/></span><span className="future-label">التصميم لاحقًا</span></div><h2>{title}</h2><p>{description}</p></div>)}</div>
    <div className="home-bottom"><ShieldCheck size={17}/><span>المعاينة بتعرض المخزون والتتبع. باقي الأقسام لسه في التصميم.</span></div>
  </div>
}
function Inventory() {
  const [view, setView] = useReviewState<'parcels' | 'products'>('inventory-view', 'parcels')
  const [term, setTerm] = useReviewState('inventory-search', '')
  const [branch, setBranch] = useReviewState('inventory-branch', 'all')
  const [brand, setBrand] = useReviewState('inventory-brand', 'all')
  const [custody, setCustody] = useReviewState('inventory-custody', 'branch')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const assignedIds = assignedBranches.map(b => b.id)
  const authorized = shipments.filter(s => s.state !== 'delivered' && (s.branchId ? assignedIds.includes(s.branchId) : assignedIds.includes(s.originBranchId)))
  const scoped = authorized.filter(s => branch === 'all' || (s.branchId ?? s.originBranchId) === branch)
  const visibleShipments = scoped.filter(s => (custody === 'all' || (custody === 'branch' ? !!s.branchId : !s.branchId)) && (brand === 'all' || s.brand === brand) && matches(`${s.id} ${s.brand} ${s.customer} ${s.phone}`, term))
  const visibleStock = stockItems.filter(s => assignedIds.includes(s.branchId) && (branch === 'all' || s.branchId === branch) && (brand === 'all' || s.brand === brand) && matches(`${s.name} ${s.brand} ${s.variant}`, term))
  const reset = () => { setTerm(''); setBranch('all'); setBrand('all'); setCustody('branch') }
  return <>
    <SectionHeading eyebrow="متابعة يومية" title="المخزون" description="اعرف الموجود في الفرع، واللي خرج في عهدة مندوب." action={<Button variant="outline" onClick={() => go('/tracking')}><Search size={16}/>تتبع شحنة في الشركة</Button>}/>
    <div className="scope-note"><Building2 size={16}/><span>الفروع المتاحة ليك: {assignedBranches.map(b => b.name).join('، ')}</span></div>
    <div className="inventory-overview"><div><span>شحنات داخل فروعك</span><strong>{scoped.filter(s => s.branchId).length}<small>شحنة</small></strong></div><div><span>خارج مخزون الفرع</span><strong>{scoped.filter(s => !s.branchId).length}<small>شحنة</small></strong></div><div className="overview-note"><PackageCheck size={23}/><p>الأرقام تتغير بعد تسجيل<br/><strong>الاستلام الفعلي.</strong></p></div></div>
    <section className="data-panel">
      <div className="panel-heading"><div className="view-switch" role="group" aria-label="نوع المخزون"><button className={view === 'parcels' ? 'active' : ''} aria-pressed={view === 'parcels'} onClick={() => {setView('parcels');setTerm('')}}><Package size={17}/>الشحنات</button><button className={view === 'products' ? 'active' : ''} aria-pressed={view === 'products'} onClick={() => {setView('products');setTerm('')}}><Layers3 size={17}/>منتجات البراندات</button></div><Button variant="ghost" className="mobile-filter-toggle" aria-expanded={filtersExpanded} aria-controls="inventory-filters" onClick={() => setFiltersExpanded(v => !v)}><SlidersHorizontal size={16}/>الفلاتر</Button><span className="panel-hint"><SlidersHorizontal size={15}/>بحث وفلاتر</span></div>
      <div id="inventory-filters" className={`filters ${filtersExpanded ? "filters-open" : ""}`}><label className="search-field"><span>بحث</span><div><Search size={17}/><Input aria-label={view === 'parcels' ? 'بحث في الشحنات' : 'بحث في المنتجات'} value={term} placeholder={view === 'parcels' ? 'رقم الشحنة أو اسم المستلم…' : 'اسم المنتج أو البراند…'} onChange={e => setTerm(e.target.value)}/></div></label><SelectField label="الفرع" value={branch} onChange={setBranch}><option value="all">كل فروعك</option>{assignedBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</SelectField><SelectField label="البراند" value={brand} onChange={setBrand}><option value="all">كل البراندات</option>{[...new Set([...shipments, ...stockItems].map(s => s.brand))].map(b => <option key={b}>{b}</option>)}</SelectField>{view === 'parcels' && <SelectField label="موقع العهدة" value={custody} onChange={setCustody}><option value="branch">داخل الفروع</option><option value="driver">خارج مخزون الفرع</option><option value="all">كل العهد</option></SelectField>}</div>
      <div className="results-caption"><span aria-live="polite">{view === 'parcels' ? visibleShipments.length : visibleStock.length} {view === 'parcels' ? (visibleShipments.length === 1 ? 'شحنة' : 'شحنات') : (visibleStock.length === 1 ? 'منتج' : 'منتجات')}</span><button onClick={reset}>مسح الفلاتر<X size={13}/></button></div>
      {view === 'parcels' ? visibleShipments.length ? <ShipmentRows items={visibleShipments}/> : <EmptyState reset={reset}/> : visibleStock.length ? <div className="stock-grid">{visibleStock.map(s => <article className="stock-card" key={s.id}><div className="stock-top"><div className="product-icon"><Layers3 size={24}/></div><span>{s.brand}</span><Badge variant="outline">{branchName(s.branchId)}</Badge></div><h3>{s.name}</h3><p>{s.variant}</p><div className="stock-numbers"><div className="available"><strong>{s.available}</strong><span>متاح</span></div><div><strong>{s.reserved}</strong><span>محجوز</span></div><div><strong>{s.damaged}</strong><span>تالف</span></div></div><small>الموجود فعليًا: {s.onHand} قطعة</small></article>)}</div> : <EmptyState reset={reset}/>}
      <div className="panel-footer"><span className="live-dot"/><span>بيانات تجريبية ثابتة للمراجعة</span><span>المخزون المتاح يستبعد المحجوز والتالف.</span></div>
    </section>
  </>
}
function Tracking({ initialTerm }: { initialTerm: string }) {
  const [term, setTerm] = useState(initialTerm)
  const results = shipments.filter(s => matches(`${s.id} ${s.brand} ${s.customer} ${s.phone}`, term))
  return <><SectionHeading eyebrow="صورة كاملة للشحنة" title="تتبع الشحنات" description="ابحث في كل شحنات الشركة، وشوف الرحلة من أول الاستلام."/>
    <div className="tracking-search"><Search size={22}/><Input aria-label="بحث في كل شحنات الشركة" value={term} onChange={e => setTerm(e.target.value)} placeholder="رقم الشحنة، اسم المستلم، الموبايل، أو البراند…"/>{term && <Button variant="ghost" size="icon" aria-label="مسح البحث" onClick={() => setTerm('')}><X size={18}/></Button>}</div>
    <p className="scope-note"><ShieldCheck size={16}/>البحث بيشمل كل الفروع، وصلاحية تعديل العمليات تفضل حسب الفرع والشاشة.</p>
    <section className="data-panel"><div className="panel-heading"><h2>{term ? 'نتائج البحث' : 'شحنات من كل الفروع'}</h2><span className="muted" aria-live="polite">{results.length} شحنة</span></div>{results.length ? <ShipmentRows items={results}/> : <EmptyState reset={() => setTerm('')}/>}</section>
  </>
}
function ShipmentDetail({ id }: { id: string }) {
  const shipment = shipments.find(s => s.id === id)
  if (!shipment) return <><SectionHeading eyebrow="تتبع الشحنات" title="الشحنة مش موجودة" description="راجع الرقم أو ارجع لصفحة البحث."/><Button onClick={() => go('/tracking')}>رجوع للبحث</Button></>
  const s = shipment
  return <>
    <div className="detail-heading"><div><p className="eyebrow">تفاصيل الشحنة</p><h1 tabIndex={-1}>شحنة <bdi>{s.id}</bdi></h1><p>{s.brand}<span>·</span>{s.serviceLabel}</p></div><Status shipment={s}/></div>
    <div className="current-location"><div className="location-icon">{s.state === 'delivered' ? <PackageCheck size={24}/> : s.branchId ? <Building2 size={24}/> : <Truck size={24}/>}</div><div><span>المكان / العهدة الحالية</span><h2>{s.branchId ? branchName(s.branchId) : s.custodian}</h2><p>{s.nextAction}</p></div><span className="current-label">آخر حالة مسجلة</span></div>
    <div className="detail-grid"><section className="timeline-panel"><div className="section-title"><h2>رحلة الشحنة</h2><span><Clock3 size={14}/>{s.timeline.length} تحديثات</span></div><ol className="timeline">{s.timeline.map((event, index) => <li key={event.id} className={event.status === 'current' ? 'current' : ''}><div className="timeline-marker">{event.status === 'current' ? <Package size={17}/> : <Check size={15}/>}</div><div className="timeline-content"><div><h3>{event.title}</h3>{event.status === 'current' && <span className="now-badge">حاليًا</span>}</div><p>{event.description}</p><div className="timeline-meta"><span><MapPin size={13}/>{event.location}</span><time dateTime={Number.isNaN(Date.parse(event.at)) ? undefined : event.at}>{dateLabel(event.at)}</time></div>{index < s.timeline.length - 1 && <div className="timeline-space"/>}</div></li>)}</ol><div className="history-note"><ShieldCheck size={15}/><span>الرحلة بتعرض الأحداث المسجلة والاستلام المؤكد.</span></div></section>
      <aside className="shipment-info"><section className="info-panel"><div className="section-title"><h2>بيانات المستلم</h2><Users size={18}/></div><h3>{s.customer}</h3><p className="phone"><bdi>{s.phone}</bdi></p><div className="address-block"><MapPin size={16}/><p>{s.address}<span>{s.governorate} · {s.area}</span></p></div></section><section className="info-panel"><div className="section-title"><h2>معلومات الشحنة</h2><Package size={18}/></div><dl className="shipment-facts"><div><dt>البراند</dt><dd>{s.brand}</dd></div><div><dt>نوع الخدمة</dt><dd>{s.serviceLabel}</dd></div><div><dt>عدد القطع</dt><dd>{s.pieces} {s.pieces === 1 ? 'قطعة' : 'قطع'}</dd></div><div><dt>فرع التسجيل</dt><dd>{branchName(s.originBranchId)}</dd></div>{s.transferId && <div><dt>رقم النقلة</dt><dd><bdi>{s.transferId}</bdi></dd></div>}</dl><div className="delivery-amount"><span>{s.recipientPaymentLabel}</span><strong><bdi>{money(s.recipientDue)}</bdi><small>ج.م</small></strong></div><p className="amount-note">{s.recipientPaymentStatus === 'reported' ? 'المبلغ المبلّغ عنه منفصل عن توريد المندوب وتسوية حساب البراند.' : s.recipientPaymentStatus === 'none' ? 'مفيش مبلغ مطلوب من المستلم؛ قيمة الطلب والشحن مدفوعة للبراند.' : 'حسب بيانات الشحنة؛ يتأكد الدفع عند تسجيل التسليم.'}</p></section></aside>
    </div>
  </>
}

export default function App() {
  const [route, setRoute] = useState(routeNow)
  const [theme, setTheme] = useReviewState<'lime' | 'warm'>('theme', 'lime')
  const firstRoute = useRef(true)
  const navigationCount = useRef(0)
  useEffect(() => { const update = () => { navigationCount.current += 1; setRoute(routeNow()) }; window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update) }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  useEffect(() => {
    window.scrollTo(0, 0)
    if (!firstRoute.current) document.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
    firstRoute.current = false
  }, [route.path])
  const isHome = route.path === '/'
  const isDetail = route.path.startsWith('/shipment/')
  const page = isHome ? <Home/> : route.path === '/inventory' ? <Inventory/> : route.path === '/tracking' ? <Tracking key={route.query.toString()} initialTerm={route.query.get('q') || ''}/> : isDetail ? <ShipmentDetail id={route.path.split('/')[2]}/> : <Home/>
  const back = () => { if (isDetail && navigationCount.current > 0) window.history.back(); else if (isDetail) go('/tracking'); else go('/') }
  return <div className="app">
    <a href="#main-content" className="skip-link" onClick={e => { e.preventDefault(); document.getElementById('main-content')?.focus() }}>انتقل للمحتوى</a>
    <div className="preview-strip"><span><span className="preview-dot"/>معاينة التصميم <bdi>01</bdi><span className="preview-detail">· بيانات تجريبية</span></span><Dialog><DialogTrigger asChild><button className="review-trigger"><Palette size={14}/>مراجعة المظهر</button></DialogTrigger><DialogContent dir="rtl" className="review-dialog"><DialogHeader><DialogTitle>نراجع الشكل سوا</DialogTitle><DialogDescription>اختار اتجاه الألوان وجرب نفس الصفحات. الاختيار هنا للمعاينة، والاعتماد بعد ملاحظاتك.</DialogDescription></DialogHeader><div className="theme-choices"><button aria-pressed={theme === 'lime'} className={theme === 'lime' ? 'selected' : ''} onClick={() => setTheme('lime')}><span className="theme-swatch lime-swatch"/><strong>أبيض ولمسة ليموني</strong><small>مستوحى من صورة التتبع</small>{theme === 'lime' && <Check size={17}/>}</button><button aria-pressed={theme === 'warm'} className={theme === 'warm' ? 'selected' : ''} onClick={() => setTheme('warm')}><span className="theme-swatch warm-swatch"/><strong>درجات دافئة</strong><small>قريب من مرجع ERP-V2</small>{theme === 'warm' && <Check size={17}/>}</button></div><div className="review-points"><h3>ركز في التجربة على</h3><p>وضوح الخط والمسافات · سهولة الرجوع والبحث · حجم المعلومات في الشاشة · استخدام الموبايل.</p></div></DialogContent></Dialog></div>
    <header className="utility-header"><div className="utility-inner"><a href="#/" className="wordmark" aria-label="شحن — الرئيسية"><span><Package size={25} strokeWidth={1.6}/></span><strong>شحن<span>إدارة شركة الشحن</span></strong></a><div className="company-context"><Building2 size={17}/><span>شركة المسار للشحن<small>القاهرة والجيزة · مساحة أحمد</small></span></div><div className="avatar" aria-label="أحمد، مستخدم تجريبي">أ</div></div></header>
    <main id="main-content" tabIndex={-1} className={`main-content ${isHome ? 'home-width' : ''}`}>
      {!isHome && <button className="back-link" onClick={back}><ArrowRight size={17}/>{isDetail ? 'رجوع للقائمة' : 'الرئيسية'}</button>}
      {page}
    </main>
    <footer className="page-footer"><span>شحن<span className="footer-dot">·</span>شركة المسار للشحن</span><span><CircleHelp size={14}/>نموذج للمراجعة — بدون عمليات فعلية</span></footer>
  </div>
}
