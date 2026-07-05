import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion as Motion } from 'framer-motion'
import { PlusCircle } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage, portalApi } from '../lib/api'
import { toIsoInstantFromDate } from '../lib/format'
import type { PortalResponseDTO } from '../types'
import { buttonPress, fadeUp } from '../components/ui/motion'

const PortalCreatePage: React.FC = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState({ projectName: '', clientName: '', expiryDays: '14', projectAmount: '', currency: 'USD', paymentDueDate: '' })

  const createMutation = useMutation({
    mutationFn: () => portalApi.create({
      projectName: form.projectName.trim(),
      clientName: form.clientName.trim() || undefined,
      expiryDays: form.expiryDays ? Number(form.expiryDays) : undefined,
      projectAmount: form.projectAmount ? Number(form.projectAmount) : undefined,
      currency: form.currency || 'USD',
      paymentDueDate: toIsoInstantFromDate(form.paymentDueDate),
    }),
    onSuccess: (portal: PortalResponseDTO) => {
      if (!portal?.id) {
        toast.error('Portal created but response was invalid', {
          description: 'Please refresh your dashboard to locate it.',
        })
        return
      }
      queryClient.setQueryData(['portal', portal.id], portal)
      void queryClient.invalidateQueries({ queryKey: ['dashboard-workspace'] })
      toast.success('Portal created', {
        description: `"${portal.projectName}" is ready to share with your client.`,
      })
      navigate(`/portals/${portal.id}`)
    },
    onError: (error) => {
      toast.error('Could not create portal', {
        description: getApiErrorMessage(error, 'Please try again.'),
        duration: 6000,
      })
    },
  })

  const isSubmitting = createMutation.isLoading
  const canSubmit = form.projectName.trim().length > 0 && !isSubmitting

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Motion.div variants={fadeUp} initial="initial" animate="animate">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand">Portal creation</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-text-900 md:text-5xl">Create a secure client portal</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-text-600">Matches backend `CreatePortalRequest`: projectName, clientName, expiryDays, projectAmount, currency, and ISO paymentDueDate.</p>
      </Motion.div>

      <Motion.form variants={fadeUp} initial="initial" animate="animate" onSubmit={event => {
        event.preventDefault()
        if (!canSubmit) return
        createMutation.mutate()
      }} className="card space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="projectName" className="label">Project name</label>
            <input id="projectName" className="input" value={form.projectName} onChange={event => setForm(prev => ({ ...prev, projectName: event.target.value }))} placeholder="Brand film v1 review" maxLength={255} required disabled={isSubmitting} />
          </div>
          <div>
            <label htmlFor="clientName" className="label">Client name</label>
            <input id="clientName" className="input" value={form.clientName} onChange={event => setForm(prev => ({ ...prev, clientName: event.target.value }))} placeholder="Acme Studios" maxLength={255} disabled={isSubmitting} />
          </div>
          <div>
            <label htmlFor="expiryDays" className="label">Expiry days</label>
            <input id="expiryDays" className="input" type="number" min={1} max={365} value={form.expiryDays} onChange={event => setForm(prev => ({ ...prev, expiryDays: event.target.value }))} disabled={isSubmitting} />
          </div>
          <div>
            <label htmlFor="projectAmount" className="label">Project amount</label>
            <input id="projectAmount" className="input" type="number" min={0} step="0.01" value={form.projectAmount} onChange={event => setForm(prev => ({ ...prev, projectAmount: event.target.value }))} placeholder="2500" disabled={isSubmitting} />
          </div>
          <div>
            <label htmlFor="currency" className="label">Currency</label>
            <select id="currency" className="input" value={form.currency} onChange={event => setForm(prev => ({ ...prev, currency: event.target.value }))} disabled={isSubmitting}>
              <option value="USD">USD</option>
              <option value="INR">INR</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="paymentDueDate" className="label">Payment due date</label>
            <input id="paymentDueDate" className="input" type="date" value={form.paymentDueDate} onChange={event => setForm(prev => ({ ...prev, paymentDueDate: event.target.value }))} disabled={isSubmitting} />
          </div>
        </div>

        {createMutation.isError && <div className="alert-error">{getApiErrorMessage(createMutation.error, 'Could not create portal')}</div>}

        <Motion.button {...buttonPress} type="submit" disabled={!canSubmit} className="btn-primary">
          <PlusCircle className="size-4" />
          {isSubmitting ? 'Creating…' : 'Create portal'}
        </Motion.button>
      </Motion.form>
    </div>
  )
}

export default PortalCreatePage
