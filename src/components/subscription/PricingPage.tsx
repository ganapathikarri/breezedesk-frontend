import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion as Motion } from 'framer-motion'
import { Check, CreditCard, ShieldCheck, Sparkles } from 'lucide-react'
import { getApiErrorMessage, subscriptionApi } from '../../lib/api'
import { useSubscriptionPlans, useCurrentSubscription } from '../../hooks/useSubscription'
import type { PaymentMethod, RazorpayOrderResponse, RazorpayPaymentResponse } from '../../types'
import { buttonPress, fadeUp, staggerContainer, staggerItem } from '../ui/motion'
import PlanBadge from '../common/PlanBadge'
import { toast } from 'sonner'

const featureLabel: Record<string, string> = {
  maxProjects: 'Project limit',
  timestampComments: 'Timestamp comments',
  clientApprovals: 'Client approvals',
  brandingRemoval: 'Remove BreezeDesk branding',
  screenRecordingBlock: 'Screen recording block',
  prioritySupport: 'Priority support',
}

export const PricingPage: React.FC = () => {
  const queryClient = useQueryClient()
  const plansQuery = useSubscriptionPlans()
  const currentQuery = useCurrentSubscription()

  const verifyMutation = useMutation({
    mutationFn: ({ response, paymentMethod }: { response: RazorpayPaymentResponse; paymentMethod: PaymentMethod }) => subscriptionApi.verifyPayment({
      razorpayOrderId: response.razorpay_order_id,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature,
      paymentMethod,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['current-subscription'] })
      await queryClient.invalidateQueries({ queryKey: ['storage-info'] })
      toast.success('Payment successful', { description: 'Your subscription is now active.' })
    },
    onError: (error) => {
      toast.error('Payment verification failed', {
        description: getApiErrorMessage(error, 'Please contact support if you were charged.'),
        duration: 8000,
      })
    },
  })

  const initiateMutation = useMutation({
    mutationFn: ({ planId, paymentMethod }: { planId: number; paymentMethod: PaymentMethod }) => subscriptionApi.initiatePayment({ planId, paymentMethod }),
    onSuccess: (order: RazorpayOrderResponse, variables) => {
      if (!window.Razorpay) {
        throw new Error('Razorpay checkout script is not loaded. Add it to index.html before testing payments.')
      }
      const checkout = new window.Razorpay({
        key: order.razorpayKey,
        amount: order.amount,
        currency: order.currency,
        order_id: order.razorpayOrderId,
        name: 'BreezeDesk',
        description: `${order.planName} subscription`,
        prefill: { email: order.email, name: order.displayName },
        method: { [variables.paymentMethod]: true },
        handler: response => verifyMutation.mutate({ response, paymentMethod: variables.paymentMethod }),
      })
      checkout.open()
    },
    onError: (error) => {
      toast.error('Could not start payment', {
        description: getApiErrorMessage(error, 'Please try again.'),
      })
    },
  })

  const currentTier = currentQuery.data?.currentTier

  return (
    <div className="space-y-8">
      <Motion.header variants={fadeUp} initial="initial" animate="animate" className="card overflow-hidden bg-gradient-to-br from-brand/10 via-sky-400/10 to-violet-500/10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-brand">
              <Sparkles className="size-3.5" /> Creator-grade SaaS plans
            </div>
            <h1 className="text-4xl font-black tracking-tight text-text-900 md:text-6xl">Scale your review desk.</h1>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-text-600">Plans are loaded from `GET /api/v1/subscriptions/plans`; payment initiation and verification use the corrected Razorpay endpoints.</p>
          </div>
          {currentTier && <PlanBadge tier={currentTier} size="md" />}
        </div>
      </Motion.header>

      {(initiateMutation.isError || verifyMutation.isError) && (
        <div className="alert-error">{getApiErrorMessage(initiateMutation.error || verifyMutation.error, 'Payment flow failed')}</div>
      )}
      {verifyMutation.isSuccess && <div className="alert-success">Subscription activated successfully.</div>}

      {plansQuery.isLoading && <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="card h-96 animate-pulse" />)}</div>}
      {plansQuery.isError && <div className="alert-error">{getApiErrorMessage(plansQuery.error, 'Could not load plans')}</div>}

      <Motion.section variants={staggerContainer} initial="initial" animate="animate" className="grid gap-4 lg:grid-cols-3">
        {(plansQuery.data ?? []).map(plan => {
          const isCurrent = currentTier === plan.name
          const isFree = plan.monthlyPrice === 0
          return (
            <Motion.article key={plan.id} variants={staggerItem} whileHover={{ y: -4 }} className={`card flex flex-col ${isCurrent ? 'ring-2 ring-brand' : ''}`}>
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <PlanBadge tier={plan.name} size="md" />
                  <p className="mt-4 text-4xl font-black text-text-900">₹{plan.monthlyPrice}<span className="text-base font-semibold text-text-600">/mo</span></p>
                  <p className="mt-1 text-sm font-medium text-text-600">{plan.storageGb}GB secure storage</p>
                </div>
                {isCurrent && <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">Current</span>}
              </div>

              <ul className="flex-1 space-y-3">
                {Object.entries(plan.features).map(([key, value]) => (
                  <li key={key} className="flex items-start gap-2 text-sm font-medium text-text-600">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                    <span>{featureLabel[key] ?? key}: {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 space-y-2">
                <Motion.button {...buttonPress} type="button" disabled={isCurrent || isFree || initiateMutation.isLoading} onClick={() => initiateMutation.mutate({ planId: plan.id, paymentMethod: 'card' })} className="btn-primary w-full">
                  <CreditCard className="size-4" />{isCurrent ? 'Current plan' : isFree ? 'Free tier' : 'Pay by card'}
                </Motion.button>
                {!isCurrent && !isFree && (
                  <button type="button" disabled={initiateMutation.isLoading} onClick={() => initiateMutation.mutate({ planId: plan.id, paymentMethod: 'upi' })} className="btn-secondary w-full">Pay by UPI</button>
                )}
              </div>
            </Motion.article>
          )
        })}
      </Motion.section>

      <div className="card flex flex-wrap items-center gap-3 text-sm font-semibold text-text-600">
        <ShieldCheck className="size-5 text-brand" /> Payments are verified server-side with Razorpay signature validation before activating storage limits.
      </div>
    </div>
  )
}
