import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useI18nStore } from "@/lib/store/i18nStore";
import type { Language } from "@/lib/i18n";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { language, setLanguage } = useI18nStore();

  const languageOptions: { value: Language; label: string }[] = [
    { value: "pt-BR", label: t("settings.portuguese") },
    { value: "en-US", label: t("settings.english") },
  ];

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold" data-testid="title-settings">
          {t("settings.title")}
        </h1>
        <p className="text-muted-foreground" data-testid="subtitle-settings">
          {t("settings.subtitle")}
        </p>
      </div>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.language")}</CardTitle>
          <CardDescription>{t("settings.selectLanguage")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-3">
              {languageOptions.map((option) => (
                <label key={option.value} className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-muted transition-colors" data-testid={`language-option-${option.value}`}>
                  <input
                    type="radio"
                    name="language"
                    value={option.value}
                    checked={language === option.value}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="w-4 h-4"
                    data-testid={`radio-language-${option.value}`}
                  />
                  <span className="font-medium">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Sistema de Orquestração IA © 2024
            </p>
            <p className="text-sm text-muted-foreground">
              Version 1.0.0
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
