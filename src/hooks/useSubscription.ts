import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { subscriptionApi } from '../lib/api'
import type { InitiatePaymentRequest, VerifyPaymentRequest } from '../types'

export const useSubscriptionPlans = () =>
  useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionApi.plans,
    staleTime: 5 * 60_000,
  })

export const useCurrentSubscription = () =>
  useQuery({
    queryKey: ['current-subscription'],
    queryFn: subscriptionApi.current,
    staleTime: 60_000,
    retry: 1,
  })

export const useInitiatePayment = () =>
  useMutation({
    mutationFn: (payload: InitiatePaymentRequest) => subscriptionApi.initiatePayment(payload),
  })

export const useVerifyPayment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: VerifyPaymentRequest) => subscriptionApi.verifyPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-subscription'] })
      queryClient.invalidateQueries({ queryKey: ['storage-info'] })
    },
  })
}
