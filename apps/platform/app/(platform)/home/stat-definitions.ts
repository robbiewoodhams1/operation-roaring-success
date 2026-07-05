export type StatKey =
  | 'deals_today'
  | 'gp_today'
  | 'closes_today'
  | 'deals_mtd'
  | 'gp_mtd'
  | 'prov_total'
  | 'prov_live'
  | 'prov_live_today'
  | 'prov_pending'
  | 'prov_cancelled'
  | 'prov_delayed'
  | 'active_customers'
  | 'customers_total'
  | 'bb_ordered_today'
  | 'whc_ordered_today'
  | 'mpf_ordered_today'
  | 'nfon_ordered_today'
  | 'routers_ordered_today'

export type StatCategory = 'sales' | 'provisioning' | 'customers'

export const STAT_DEFINITIONS: Record<StatKey, { label: string; category: StatCategory }> = {
  deals_today: { label: 'Deals today', category: 'sales' },
  closes_today: { label: 'Closes today', category: 'sales' },
  gp_today: { label: 'GP today', category: 'sales' },
  deals_mtd: { label: 'Deals this month', category: 'sales' },
  gp_mtd: { label: 'GP this month', category: 'sales' },
  prov_total: { label: 'Total provisioning', category: 'provisioning' },
  prov_live: { label: 'Live (all time)', category: 'provisioning' },
  prov_live_today: { label: 'Went live today', category: 'provisioning' },
  prov_pending: { label: 'Not started', category: 'provisioning' },
  prov_cancelled: { label: 'Cancelled today', category: 'provisioning' },
  prov_delayed: { label: 'Delayed today', category: 'provisioning' },
  active_customers: { label: 'Active customers', category: 'customers' },
  customers_total: { label: 'Total customers', category: 'customers' },
  bb_ordered_today: { label: 'BB applied today', category: 'provisioning' },
  whc_ordered_today: { label: 'WHC applied today', category: 'provisioning' },
  mpf_ordered_today: { label: 'MPF applied today', category: 'provisioning' },
  nfon_ordered_today: { label: 'NFON applied today', category: 'provisioning' },
  routers_ordered_today: { label: 'Routers ordered today', category: 'provisioning' },
}

export const DEFAULT_STATS: StatKey[] = ['deals_today', 'gp_today']
