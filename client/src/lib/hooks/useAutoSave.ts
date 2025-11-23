import { useEffect, useRef } from 'react';
import { useAgentsStore } from '@/lib/store/agentsStore';

export function useAutoSave() {
  const { unsavedChanges, saveGraph, isSaving } = useAgentsStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!unsavedChanges || isSaving) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save after 2 seconds of inactivity
    timeoutRef.current = setTimeout(() => {
      saveGraph().catch((err) => {
        console.error('Auto-save failed:', err);
      });
    }, 2000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [unsavedChanges, isSaving, saveGraph]);
}
