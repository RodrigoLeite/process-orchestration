import { useI18nStore } from '../store/i18nStore';
import { getTranslation } from '../i18n';

export function useTranslation() {
  const language = useI18nStore((state) => state.language);

  const t = (path: string, defaultValue = ''): string => {
    return getTranslation(language, path, defaultValue);
  };

  return { t, language };
}
