'use client';

import { useEffect } from 'react';

export default function PWASetup() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const existingLink = document.querySelector('link[rel="manifest"]');
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/manifest.json';
        document.head.appendChild(link);
      }
    }
  }, []);

  return null;
}

