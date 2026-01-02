'use client';

import { useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';

interface EventParams {
  event_category?: string;
  event_label?: string;
  value?: number;
  [key: string]: any;
}

export function useAnalytics() {
  const { user, companyId } = useAuth();
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  const trackEvent = useCallback(
    (eventName: string, params?: EventParams) => {
      if (typeof window === 'undefined' || !window.gtag || !GA_MEASUREMENT_ID) {
        return;
      }

      const eventParams: EventParams = {
        ...params,
        user_id: user?.uid || 'anonymous',
        company_id: companyId || 'none',
        timestamp: new Date().toISOString(),
      };

      window.gtag('event', eventName, eventParams);
    },
    [user?.uid, companyId]
  );

  const trackPageView = useCallback(
    (pagePath: string, pageTitle?: string) => {
      if (typeof window === 'undefined' || !window.gtag || !GA_MEASUREMENT_ID) {
        return;
      }

      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: pagePath,
        page_title: pageTitle,
        user_id: user?.uid || 'anonymous',
        company_id: companyId || 'none',
      });
    },
    [user?.uid, companyId]
  );

  const trackConversion = useCallback(
    (conversionId: string, value?: number, currency = 'BRL') => {
      if (typeof window === 'undefined' || !window.gtag || !GA_MEASUREMENT_ID) {
        return;
      }

      window.gtag('event', 'conversion', {
        send_to: conversionId,
        value: value,
        currency: currency,
        user_id: user?.uid || 'anonymous',
        company_id: companyId || 'none',
      });
    },
    [user?.uid, companyId]
  );

  return {
    trackEvent,
    trackPageView,
    trackConversion,
  };
}









