import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { DemoForm, type DemoValues } from '../../apps/web/src/demo-form.js';
describe('Demonstration form connected behavior', () => {
  it('validates, confirms exact amount, disables while pending, retains values and focuses error', async () => {
    let rejectReview: (error: Error) => void = () => {
      throw new Error('not started');
    };
    let observed: DemoValues | undefined;
    const review = (values: DemoValues) => {
      observed = values;
      return new Promise<never>((_resolve, reject) => {
        rejectReview = reject;
      });
    };
    const user = userEvent.setup();
    render(<DemoForm review={review} />);
    await user.click(screen.getByRole('button', { name: 'راجع المثال' }));
    expect(await screen.findByText(/اكتب عنوان المثال/)).toBeVisible();
    expect(screen.getByLabelText(/عنوان المثال/)).toHaveFocus();
    await user.type(screen.getByLabelText(/عنوان المثال/), 'مثال عربي طويل للمراجعة');
    await user.type(screen.getByLabelText(/المبلغ بالجنيه/), '50.5');
    await user.type(screen.getByLabelText(/ملاحظات المثال/), 'احتفظ بهذه الملاحظات');
    expect(screen.getByText('50.50')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'راجع المثال' }));
    expect(await screen.findByRole('dialog')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'ابدأ التجربة' }));
    expect(await screen.findByRole('button', { name: 'راجع المثال' })).toBeDisabled();
    expect(screen.getByText('جارٍ تنفيذ تجربة العرض…')).toBeVisible();
    expect(observed).toEqual({
      label: 'مثال عربي طويل للمراجعة',
      amount: '50.5',
      notes: 'احتفظ بهذه الملاحظات',
    });
    rejectReview(new Error('controlled demonstration rejection'));
    expect(await screen.findByText('انتهت التجربة بخطأ مقصود؛ لم يُحفظ شيء')).toBeVisible();
    expect(screen.getByLabelText(/عنوان المثال/)).toHaveValue(observed?.label);
    expect(screen.getByLabelText(/المبلغ بالجنيه/)).toHaveValue('50.5');
    expect(screen.getByLabelText(/ملاحظات المثال/)).toHaveValue(observed?.notes);
    await waitFor(() => expect(document.activeElement?.className).toBe('retained-error'));
    expect(screen.getByRole('button', { name: 'راجع المثال' })).toBeEnabled();
  });
  it('rejects whitespace title, extra precision and overflow before confirmation', async () => {
    const user = userEvent.setup();
    render(<DemoForm />);
    await user.type(screen.getByLabelText(/عنوان المثال/), '   ');
    await user.type(screen.getByLabelText(/المبلغ بالجنيه/), '50.555');
    await user.click(screen.getByRole('button', { name: 'راجع المثال' }));
    expect(await screen.findByText(/اكتب عنوان المثال/)).toBeVisible();
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.clear(screen.getByLabelText(/المبلغ بالجنيه/));
    await user.type(screen.getByLabelText(/المبلغ بالجنيه/), '92233720368547758.08');
    await user.click(screen.getByRole('button', { name: 'راجع المثال' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
