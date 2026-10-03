import type { ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  Check,
  Clock3,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { egpDecimal, type Money } from '@shahn/domain';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from './dialog.js';
import { Button } from './button.js';

export function UtilityHeader({ home, context }: { home: ReactNode; context: ReactNode }) {
  return (
    <header className="utility-header">
      <div className="utility-inner">
        {home}
        <div className="company-context">{context}</div>
      </div>
    </header>
  );
}
export function PageContainer({ children, home = false }: { children: ReactNode; home?: boolean }) {
  return (
    <main id="main-content" tabIndex={-1} className={`main-content ${home ? 'home-width' : ''}`}>
      {children}
    </main>
  );
}
export function BackButton({
  onClick,
  label = 'الرئيسية',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button className="back-link" onClick={onClick}>
      <ArrowRight size={17} />
      {label}
    </button>
  );
}
export function PageHeading({
  title,
  description,
  eyebrow,
}: {
  title: string;
  description: string;
  eyebrow: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 tabIndex={-1}>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
    </div>
  );
}
export function ModuleCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="module-top">
        <span className="module-icon">{icon}</span>
        <ArrowUpLeft size={19} className="module-arrow" />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <span className="module-foot">
        {children}
        <ArrowLeft size={15} />
      </span>
    </>
  );
}
export function StatePanel({
  state,
  title,
  children,
  action,
}: {
  state: 'pending' | 'empty' | 'error' | 'ready';
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      className={`state-panel state-${state}`}
      role={state === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      aria-busy={state === 'pending'}
    >
      <div>
        <strong>{title}</strong>
        {children && <p>{children}</p>}
      </div>
      {action}
    </section>
  );
}
export function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="status">
      <span className="status-dot" aria-hidden="true" />
      {children}
    </span>
  );
}
export function FormGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="form-group">
      <legend>{title}</legend>
      <p className="muted">{description}</p>
      <div className="form-fields">{children}</div>
    </fieldset>
  );
}
export function AmountDisplay({ money }: { money: Money }) {
  return (
    <strong className="exact-amount">
      <bdi dir="ltr">{egpDecimal(money)}</bdi>
      <small>ج.م</small>
    </strong>
  );
}
export function ConfirmationDialog({
  trigger,
  title,
  description,
  children,
  onConfirm,
  confirmLabel = 'تأكيد تجربة العرض',
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  onConfirm: () => void;
  confirmLabel?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent dir="rtl" className="review-dialog">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        {children}
        <div className="dialog-actions">
          <DialogClose asChild>
            <Button onClick={onConfirm}>{confirmLabel}</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="outline">رجوع</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export interface ListColumn<T> {
  label: string;
  render: (item: T) => ReactNode;
}
export function ResponsiveList<T>({
  items,
  columns,
  rowKey,
  card,
}: {
  items: T[];
  columns: ListColumn<T>[];
  rowKey: (item: T) => string;
  card: (item: T) => ReactNode;
}) {
  return (
    <>
      <div className="table-wrap">
        <table className="shipment-table">
          <caption className="sr-only">أمثلة تطوير فقط</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.label} scope="col">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={rowKey(item)}>
                {columns.map((c) => (
                  <td key={c.label}>{c.render(item)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="shipment-cards">
        {items.map((item) => (
          <article className="shipment-card" key={rowKey(item)}>
            {card(item)}
          </article>
        ))}
      </div>
    </>
  );
}
export interface TimelineEntry {
  id: string;
  title: string;
  description: string;
  at: string;
  location: string;
  current?: boolean;
}
export function Timeline({ title, entries }: { title: string; entries: TimelineEntry[] }) {
  return (
    <section className="timeline-panel">
      <div className="section-title">
        <h2>{title}</h2>
        <span>
          <Clock3 size={14} />
          مثال توضيحي
        </span>
      </div>
      <ol className="timeline">
        {entries.map((event, index) => (
          <li key={event.id} className={event.current ? 'current' : ''}>
            <div className="timeline-marker">
              {event.current ? <Package size={17} /> : <Check size={15} />}
            </div>
            <div className="timeline-content">
              <div>
                <h3>{event.title}</h3>
                {event.current && <span className="now-badge">حاليًا</span>}
              </div>
              <p>{event.description}</p>
              <div className="timeline-meta">
                <span>{event.location}</span>
                <time dateTime={event.at}>
                  {new Intl.DateTimeFormat('ar-EG', {
                    timeZone: 'Africa/Cairo',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  }).format(new Date(event.at))}
                </time>
              </div>
              {index < entries.length - 1 && <div className="timeline-space" />}
            </div>
          </li>
        ))}
      </ol>
      <div className="history-note">
        <ShieldCheck size={15} />
        أحداث ثابتة للعرض، لا تمثل شحنة أو عملية تجارية.
      </div>
    </section>
  );
}
