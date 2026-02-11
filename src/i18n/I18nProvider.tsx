import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AppLocale, TranslationKey, TranslationVars } from './translations'
import { translate } from './translations'

export type TranslateFn = (key: TranslationKey, vars?: TranslationVars) => string

interface I18nContextValue {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  t: TranslateFn
}

const I18nContext = createContext<I18nContextValue | null>(null)

interface I18nProviderProps {
  children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocale] = useState<AppLocale>('en')

  const t = useCallback<TranslateFn>((key, vars) => translate(locale, key, vars), [locale])

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext)
  if (!value) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return value
}
