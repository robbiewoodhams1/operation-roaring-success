'use client'

import { createContext, useContext } from 'react'
import { config as defaults, type AppConfig, type SupportContact } from '@/lib/config'

/**
 * Resolved settings for client components. Defaults to the JSON values so a
 * component rendered outside the provider still has something sensible.
 */
const ConfigContext = createContext<AppConfig>(defaults)

export function ConfigProvider({
  config,
  children,
}: {
  config: AppConfig
  children: React.ReactNode
}) {
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
}

export function useConfig(): AppConfig {
  return useContext(ConfigContext)
}

/** Support details for a customer type, falling back to business. */
export function useSupportFor(customerType: string | null | undefined): SupportContact {
  const { support } = useConfig()
  return customerType === 'residential' ? support.residential : support.business
}
