import { useState } from 'react';
import { Search, Package } from 'lucide-react';
import {
  PageHeading,
  ResponsiveList,
  StatusBadge,
  StatePanel,
  Timeline,
  Input,
  Button,
} from '@shahn/ui';
import { ApiStatus } from './status.js';
import { examples, events } from './demo-data.js';
import { DemoForm } from './demo-form.js';
export function DemoList() {
  const [term, setTerm] = useState('');
  const filtered = examples.filter((item) => `${item.id} ${item.name}`.includes(term.trim()));
  return (
    <>
      <PageHeading
        eyebrow="مثال تطوير"
        title="قائمة العرض"
        description="أمثلة ثابتة للمظهر، وليست مخزونًا أو إجماليات شركة."
      />
      <section className="data-panel">
        <div className="panel-heading">
          <h2>بيانات توضيحية</h2>
          <StatusBadge>تطوير فقط</StatusBadge>
        </div>
        <div className="demo-search">
          <Search size={18} />
          <label className="search-field">
            <span>بحث في أمثلة العرض</span>
            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="عنوان المثال أو رقمه"
            />
          </label>
          <Button variant="ghost" onClick={() => setTerm('')}>
            مسح البحث
          </Button>
        </div>
        {filtered.length ? (
          <ResponsiveList
            items={filtered}
            rowKey={(item) => item.id}
            columns={[
              {
                label: 'المثال',
                render: (item) => (
                  <>
                    <strong>{item.name}</strong>
                    <small>
                      <bdi>{item.id}</bdi>
                    </small>
                  </>
                ),
              },
              { label: 'التفاصيل', render: (item) => item.description },
              { label: 'الحالة', render: (item) => <StatusBadge>{item.state}</StatusBadge> },
              { label: 'المكان التوضيحي', render: (item) => item.location },
            ]}
            card={(item) => (
              <>
                <div className="card-row">
                  <bdi>{item.id}</bdi>
                  <StatusBadge>{item.state}</StatusBadge>
                </div>
                <h3>{item.name}</h3>
                <p className="muted">{item.description}</p>
                <div className="card-row muted">{item.location}</div>
              </>
            )}
          />
        ) : (
          <StatePanel
            state="empty"
            title="لا توجد أمثلة تطابق البحث"
            action={
              <Button variant="outline" onClick={() => setTerm('')}>
                إعادة عرض الأمثلة
              </Button>
            }
          >
            جرّب عنوانًا آخر.
          </StatePanel>
        )}
        <div className="panel-footer">كل الصفوف بيانات تطوير ثابتة، ولا توجد عمليات عليها.</div>
      </section>
    </>
  );
}
export function DemoFormPage() {
  return (
    <>
      <PageHeading
        eyebrow="مثال تطوير"
        title="نموذج توضيحي"
        description="تجربة نموذج مركّز؛ لا يقوم بتسجيل شحنة أو حركة مالية."
      />
      <DemoForm />
    </>
  );
}
export function DemoTimeline() {
  return (
    <>
      <PageHeading
        eyebrow="مثال تطوير"
        title="الخط الزمني"
        description="أحداث توضيحية ثابتة لتقييم القراءة على الكمبيوتر والهاتف."
      />
      <div className="current-location">
        <div className="location-icon">
          <Package size={24} />
        </div>
        <div>
          <span>الحالة الحالية للمثال</span>
          <h2>مراجعة العرض</h2>
          <p>لا توجد شحنة فعلية أو عهدة أو موعد وصول.</p>
        </div>
      </div>
      <div className="detail-grid">
        <Timeline title="رحلة المثال" entries={events} />
        <section className="info-panel">
          <div className="section-title">
            <h2>عن هذا المثال</h2>
          </div>
          <p className="muted">
            توقيت الأحداث معروض وفق Africa/Cairo. بيانات المظهر منفصلة عن حالة قاعدة البيانات
            الفعلية.
          </p>
          <ApiStatus />
        </section>
      </div>
    </>
  );
}
