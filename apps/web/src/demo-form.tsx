import { useEffect, useRef, useState } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { demoFieldErrors, type DemoValues } from '@shahn/contracts';
import { parseEgpDecimal, type Money } from '@shahn/domain';
import {
  FormGroup,
  Input,
  SmoothButton,
  AmountDisplay,
  StatePanel,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  Button,
} from '@shahn/ui';
export type { DemoValues } from '@shahn/contracts';
export async function rejectDemoReview(_values: DemoValues): Promise<never> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  throw new Error('DEVELOPMENT_DEMONSTRATION_NO_SAVE');
}
export function DemoForm({
  review = rejectDemoReview,
}: {
  review?: (values: DemoValues) => Promise<never>;
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<DemoValues>({
    defaultValues: { label: '', amount: '', notes: '' },
    shouldFocusError: true,
    resolver: (values) => {
      const problems = demoFieldErrors(values);
      if (!problems.amount) {
        try {
          parseEgpDecimal(values.amount);
        } catch {
          problems.amount = 'أدخل مبلغًا صحيحًا ضمن حدود EGP';
        }
      }
      const errors: FieldErrors<DemoValues> = {};
      for (const field of ['label', 'amount', 'notes'] as const) {
        if (problems[field]) errors[field] = { type: 'validation', message: problems[field] };
      }
      return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
    },
  });
  const [confirmation, setConfirmation] = useState<DemoValues | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (failed) errorRef.current?.focus();
  }, [failed]);
  const amount = watch('amount');
  let money: Money | null = null;
  try {
    money = parseEgpDecimal(amount);
  } catch {
    /* Display only a valid exact amount. */
  }
  const run = async () => {
    if (!confirmation || pending) return;
    const values = confirmation;
    setConfirmation(null);
    setFailed(false);
    setPending(true);
    try {
      await review(values);
    } finally {
      setPending(false);
      setFailed(true);
    }
  };
  return (
    <>
      <StatePanel state="ready" title="نموذج تطوير فقط">
        هذه تجربة للتحقق والتأكيد وحالة الانتظار والخطأ. لا تحفظ شحنة أو مبلغًا.
      </StatePanel>
      <form
        noValidate
        onSubmit={handleSubmit((values) => {
          setFailed(false);
          setConfirmation(values);
        })}
        aria-busy={pending}
      >
        <FormGroup
          title="بيانات المثال"
          description="أدخل عنوانًا ومبلغًا لتجربة السلوك. الحقول المطلوبة موضحة بالنص."
        >
          <label className="form-field">
            <span>
              عنوان المثال <small>(مطلوب)</small>
            </span>
            <Input
              readOnly={pending}
              aria-invalid={!!errors.label}
              aria-describedby={errors.label ? 'label-error' : undefined}
              {...register('label', {
                validate: (value) => value.trim().length > 0 || 'اكتب عنوان المثال',
                maxLength: { value: 180, message: 'العنوان أطول من 180 حرفًا' },
              })}
            />
            {errors.label && (
              <span id="label-error" className="field-error" role="alert">
                {errors.label.message}
              </span>
            )}
          </label>
          <label className="form-field">
            <span>
              المبلغ بالجنيه المصري <small>(مطلوب)</small>
            </span>
            <Input
              dir="ltr"
              inputMode="decimal"
              readOnly={pending}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? 'amount-error' : 'amount-hint'}
              {...register('amount', {
                validate: (value) => {
                  try {
                    const result = parseEgpDecimal(value);
                    return BigInt(result.amountMinor) >= 0n || 'أدخل مبلغًا غير سالب';
                  } catch {
                    return 'أدخل مبلغًا صحيحًا، مثل 50.5، بمنزلتين عشريتين كحد أقصى';
                  }
                },
              })}
            />
            <span id="amount-hint" className="muted">
              مثال: 50.5 يظهر بدقة 50.50 ج.م
            </span>
            {errors.amount && (
              <span id="amount-error" className="field-error" role="alert">
                {errors.amount.message}
              </span>
            )}
          </label>
          <label className="form-field span-all">
            <span>
              ملاحظات المثال <small>(اختياري)</small>
            </span>
            <textarea
              rows={3}
              readOnly={pending}
              {...register('notes', {
                maxLength: { value: 1000, message: 'الملاحظات أطول من 1000 حرف' },
              })}
            />
            {errors.notes && (
              <span role="alert" className="field-error">
                {errors.notes.message}
              </span>
            )}
          </label>
        </FormGroup>
        <div className="form-summary">
          <span>المبلغ التوضيحي · ليس رصيدًا</span>
          {money ? (
            <AmountDisplay money={money} />
          ) : (
            <span className="muted">أدخل مبلغًا صحيحًا</span>
          )}
        </div>
        {pending && (
          <StatePanel state="pending" title="جارٍ تنفيذ تجربة العرض…">
            الإرسال معطل حتى انتهاء هذه التجربة.
          </StatePanel>
        )}
        {failed && (
          <div ref={errorRef} tabIndex={-1} className="retained-error">
            <StatePanel state="error" title="انتهت التجربة بخطأ مقصود؛ لم يُحفظ شيء">
              بياناتك ما زالت موجودة. يمكنك تعديلها وإعادة تجربة العرض.
            </StatePanel>
          </div>
        )}
        <div className="form-actions">
          <SmoothButton ref={submitRef} type="submit" loading={pending} disabled={pending}>
            راجع المثال
          </SmoothButton>
          <span className="muted">لا توجد عملية تسجيل أو اتصال بتوصل</span>
        </div>
      </form>
      <Dialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
      >
        <DialogContent
          dir="rtl"
          className="review-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            submitRef.current?.focus();
          }}
        >
          <DialogTitle>تأكيد تجربة العرض</DialogTitle>
          <DialogDescription>ستظهر حالة انتظار ثم خطأ مقصود دون حفظ أي سجل.</DialogDescription>
          <p>{confirmation?.label}</p>
          {confirmation && <AmountDisplay money={parseEgpDecimal(confirmation.amount)} />}
          <div className="dialog-actions">
            <Button
              onClick={() => {
                void run().catch(() => {
                  /* Demonstration failure is shown in the retained error panel. */
                });
              }}
            >
              ابدأ التجربة
            </Button>
            <DialogClose asChild>
              <Button variant="outline">رجوع</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
