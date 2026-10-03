import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Boxes, ClipboardList, Clock3, Package, Palette, ShieldCheck } from 'lucide-react';
import {
  UtilityHeader,
  PageContainer,
  BackButton,
  PageHeading,
  ModuleCard,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@shahn/ui';
import { ApiStatus } from './status.js';
export const demosEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMOS === 'true';
export function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'lime' | 'warm'>(() => {
    try {
      return sessionStorage.getItem('p01:theme') === 'warm' ? 'warm' : 'lime';
    } catch {
      return 'lime';
    }
  });
  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
    try {
      sessionStorage.setItem('p01:theme', theme);
    } catch {
      /* Optional presentation preference. */
    }
  }, [theme]);
  useEffect(() => {
    const heading = document.querySelector<HTMLHeadingElement>('h1');
    heading?.focus();
    document.title = `شحن · ${heading?.textContent ?? 'مساحة العمل'}`;
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        انتقل للمحتوى
      </a>
      {demosEnabled && (
        <div className="preview-strip">
          <span>
            <span className="preview-dot" />
            معاينة التطوير <bdi>P01</bdi>
            <span className="preview-detail">· بيانات توضيحية</span>
          </span>
          <Dialog>
            <DialogTrigger asChild>
              <button className="review-trigger">
                <Palette size={14} />
                مراجعة المظهر
              </button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="review-dialog">
              <DialogTitle>مقارنة المظهر</DialogTitle>
              <DialogDescription>
                اللوحتان من المرجع المعتمد. الأبيض والليموني اختيار افتراضي قابل للتغيير، ولم يُعتمد
                لون نهائي.
              </DialogDescription>
              <div className="theme-choices">
                <button
                  className={theme === 'lime' ? 'selected' : ''}
                  aria-pressed={theme === 'lime'}
                  onClick={() => setTheme('lime')}
                >
                  <span className="theme-swatch lime-swatch" />
                  <strong>أبيض ولمسة ليموني</strong>
                </button>
                <button
                  className={theme === 'warm' ? 'selected' : ''}
                  aria-pressed={theme === 'warm'}
                  onClick={() => setTheme('warm')}
                >
                  <span className="theme-swatch warm-swatch" />
                  <strong>درجات دافئة</strong>
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
      <UtilityHeader
        home={
          <Link to="/" className="wordmark" aria-label="شحن — الرئيسية">
            <span>
              <Package size={25} />
            </span>
            <strong>
              شحن<span>مساحة العمل</span>
            </strong>
          </Link>
        }
        context={
          <span>
            {demosEnabled ? 'بيئة التطوير' : 'البنية الأساسية'}
            <small>لا توجد بيانات شركة أو جلسة مستخدم</small>
          </span>
        }
      />
      <PageContainer home={location.pathname === '/'}>
        {location.pathname !== '/' && <BackButton onClick={() => navigate('/')} />}
        <Outlet />
      </PageContainer>
      <footer className="page-footer">
        <span>شحن · البنية الأساسية</span>
        <span>
          <ShieldCheck size={14} />
          P01 · بدون عمليات تجارية
        </span>
      </footer>
    </div>
  );
}
export function Home() {
  const cards = [
    {
      path: 'list',
      title: 'قائمة العرض',
      description: 'صفوف على الكمبيوتر وبطاقات واضحة على الهاتف',
      icon: Boxes,
    },
    {
      path: 'form',
      title: 'نموذج توضيحي',
      description: 'حقول مطلوبة ومبلغ دقيق وحالات الانتظار والخطأ',
      icon: ClipboardList,
    },
    {
      path: 'timeline',
      title: 'الخط الزمني',
      description: 'مراجعة ترتيب المعلومات وتوقيت القاهرة',
      icon: Clock3,
    },
  ];
  return (
    <div className="home-page">
      <div className="home-intro">
        <p className="eyebrow">
          <span className="tiny-mark" />
          مساحة العمل
        </p>
        <h1 tabIndex={-1}>
          أهلًا بيك<span className="welcome-dot">.</span>
        </h1>
        <p>البنية الأساسية جاهزة للمراجعة. حالة الخدمات أدناه تأتي من API الفعلي.</p>
      </div>
      <div className="home-status">
        <ApiStatus />
      </div>
      {demosEnabled && (
        <>
          <div className="section-caption">
            <span>أمثلة العرض</span>
            <span className="muted">تطوير فقط · لا تمثل بيانات الشركة</span>
          </div>
          <div className="module-grid">
            {cards.map(({ path, title, description, icon: Icon }) => (
              <Link key={path} to={`/demo/${path}`} className="module-card">
                <ModuleCard
                  title={title}
                  description={description}
                  icon={<Icon size={26} strokeWidth={1.6} />}
                >
                  افتح المثال
                </ModuleCard>
              </Link>
            ))}
          </div>
          <p className="home-bottom">
            <ShieldCheck size={17} />
            لا توجد أرصدة أو تسجيل شحنات أو اتصال تجريبي بتوصل.
          </p>
        </>
      )}
    </div>
  );
}
export function MissingPage() {
  return (
    <>
      <PageHeading
        eyebrow="البنية الأساسية"
        title="الصفحة غير متاحة"
        description="لا توجد وحدة تجارية متاحة في هذه المرحلة."
      />
      <Link to="/" className="back-link">
        العودة للرئيسية
      </Link>
    </>
  );
}
