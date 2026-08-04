'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { deletionRequestSchema, type DeletionRequestInput } from '../schema';
import { requestAccountDeletion, cancelAccountDeletionRequest, type DeletionRequestStatus } from '../actions';

/**
 * Deletion is request-and-approve, not self-service: this only ever
 * creates a request. An admin reviews it from /admin/account-deletions —
 * see the migration for why (retaining paid booking/payment history).
 */
export function DeleteAccountSection({ initialRequest }: { initialRequest: DeletionRequestStatus | null }) {
  const [request, setRequest] = useState(initialRequest);
  const [confirming, setConfirming] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<DeletionRequestInput>({
    resolver: zodResolver(deletionRequestSchema),
    defaultValues: { reason: '' },
  });

  const onSubmit = async (values: DeletionRequestInput) => {
    setServerError(null);
    const res = await requestAccountDeletion(values);
    if (!res.ok) { setServerError(res.error.message); return; }
    setRequest({ status: 'pending', requestedAt: new Date().toISOString(), reviewNotes: null });
    setConfirming(false);
  };

  const onCancel = async () => {
    setCancelling(true);
    setServerError(null);
    const res = await cancelAccountDeletionRequest();
    setCancelling(false);
    if (!res.ok) { setServerError(res.error.message); return; }
    setRequest(null);
  };

  if (request?.status === 'pending') {
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
        <p className="font-semibold">Deletion request pending</p>
        <p className="mt-1 text-muted-foreground">
          Submitted on {new Date(request.requestedAt).toLocaleDateString()}. An admin will review it — you&apos;ll keep full
          access until then. You can cancel any time before it&apos;s reviewed.
        </p>
        {serverError && <p className="mt-2 text-destructive" role="alert">{serverError}</p>}
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onCancel} disabled={cancelling}>
          {cancelling ? 'Cancelling…' : 'Cancel request'}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-destructive/30 p-4">
      <p className="text-sm font-semibold text-destructive">Delete my account</p>
      {request?.status === 'rejected' && (
        <p className="mt-1 text-sm text-muted-foreground">
          Your last request was declined{request.reviewNotes ? `: "${request.reviewNotes}"` : '.'} You can submit a new one below.
        </p>
      )}
      <p className="mt-1 text-sm text-muted-foreground">
        This sends a request to our team. Once approved, your login is permanently disabled and your personal
        details are removed. Booking and payment records are kept as required by law and our{' '}
        <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
      </p>

      {!confirming ? (
        <Button type="button" variant="outline" size="sm" className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => setConfirming(true)}>
          Request account deletion
        </Button>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-2" noValidate>
          <label htmlFor="deletion-reason" className="block text-xs font-medium text-muted-foreground">
            Reason (optional)
          </label>
          <textarea
            id="deletion-reason"
            rows={2}
            placeholder="Let us know why you're leaving — optional"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register('reason')}
          />
          <p className="text-xs font-medium text-destructive">This is a real request — an admin will act on it. Are you sure?</p>
          {serverError && <p className="text-sm text-destructive" role="alert">{serverError}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Yes, submit request'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}
