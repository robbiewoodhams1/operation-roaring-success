import appConfig from '@/app.config.json'

/**
 * Editable app settings, sourced from `app.config.json` at the platform root.
 *
 * This is bundled into the client, so it must only ever hold values that are
 * safe to make public. Secrets belong in `lib/env.ts`.
 */
export type SupportContact = {
  businessName: string
  phone: string
  email: string
}

export type AppConfig = {
  app: {
    name: string
    version: string
    title: string
    description: string
    loginTagline: string
  }
  support: {
    residential: SupportContact
    business: SupportContact
  }
  accountNumber: {
    /** Leading letters on generated account numbers, e.g. `DFB` in `DFB20001`. */
    prefix: string
    /** First number used when no account numbers exist yet. */
    startNumber: number
  }
  ui: {
    /** Rows per page in list views. */
    pageSize: number
  }
}

export const config: AppConfig = appConfig

export const { app: APP, support: SUPPORT, accountNumber: ACCOUNT_NUMBER, ui: UI } = config

/** Support details for a customer type, falling back to business. */
export function supportFor(customerType: string | null | undefined): SupportContact {
  return customerType === 'residential' ? SUPPORT.residential : SUPPORT.business
}
