import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '../i18n';

interface I18nStore {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useI18nStore = create<I18nStore>()(
  persist(
    (set) => ({
      language: 'pt-BR',
      setLanguage: (lang: Language) => set({ language: lang }),
    }),
    {
      name: 'i18n-storage',
    }
  )
);
