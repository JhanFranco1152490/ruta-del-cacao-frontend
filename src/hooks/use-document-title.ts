'use client';

import { useEffect } from 'react';

import { pageTitle } from '@/lib/page-title';

export function useDocumentTitle(section?: string, producer?: string) {
  useEffect(() => {
    document.title = pageTitle(section, producer);
  }, [section, producer]);
}
