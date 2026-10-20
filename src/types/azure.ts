export interface RawInvoiceRow {
  [key: string]: string;
}

export type AzureServiceCategory =
  | 'Compute'
  | 'AI & Machine Learning'
  | 'Databases'
  | 'Storage'
  | 'Networking'
  | 'Security & Identity'
  | 'Analytics & IoT'
  | 'Reservations & Commitments'
  | 'Other Services';

export type ReservationComponentType =
  | 'Virtual Machines'
  | 'App Services'
  | 'AKS VMs (Kubernetes Node Pools)'
  | 'Azure SQL Database'
  | 'Azure SQL Managed Instance'
  | 'Other Reservations';

export interface NormalizedCostRecord {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
  invoiceId: string;
  billingPeriod: string; // e.g., "2026-03"
  billingPeriodLabel: string; // e.g., "Mar 2026"
  date: string;
  serviceName: string;
  serviceCategory: AzureServiceCategory;
  resourceGroup: string;
  resourceLocation: string;
  cost: number;
  currency: string;
  sourceFile: string;
  pricingModel: 'OnDemand' | 'Reservation' | 'SavingsPlan' | 'Spot';
  reservationDetails?: {
    reservationId?: string;
    reservationName?: string;
    componentType: ReservationComponentType;
    termYears?: 1 | 3;
    utilizationPercent?: number;
    estimatedSavings?: number;
    sku?: string;
  };
}

export interface ReservationSummary {
  componentType: ReservationComponentType;
  totalMonthlyCost: number;
  activeCount: number;
  averageUtilization: number;
  estimatedMonthlySavings: number;
  termBreakdown: {
    oneYearCount: number;
    threeYearCount: number;
  };
  topReservations: {
    name: string;
    subscriptionName: string;
    cost: number;
    utilization: number;
    savings: number;
    expiryDate: string;
    status: 'Optimal' | 'Underutilized' | 'Expiring Soon';
  }[];
}

export interface MonthlySubscriptionSummary {
  monthKey: string; // e.g. "2026-03"
  monthLabel: string; // e.g. "Mar 2026"
  totalCost: number;
  currency: string;
  onDemandCost: number;
  reservationCost: number;
  savingsPlanCost: number;
  bySubscription: Record<string, number>;
  byService: Record<string, number>;
  byCategory: Record<AzureServiceCategory, number>;
  byReservationComponent: Record<ReservationComponentType, number>;
  invoiceIds: string[];
  recordCount: number;
}

export interface SubscriptionOverview {
  id: string;
  name: string;
  color: string;
  totalSpend: number;
  monthlyAverage: number;
  activeMonthsCount: number;
  invoiceCount: number;
  reservationSpend: number;
  onDemandSpend: number;
  reservationCoveragePercent: number;
  topService: {
    name: string;
    cost: number;
    percent: number;
  };
  momDeltaAmount: number;
  momDeltaPercent: number;
}

export interface CostVarianceDriver {
  name: string;
  entityType: 'subscription' | 'service' | 'reservation';
  previousCost: number;
  currentCost: number;
  deltaCost: number;
  percentChange: number;
}

export interface CostAnomaly {
  id: string;
  subscriptionName: string;
  serviceName: string;
  severity: 'alert' | 'warning' | 'info';
  impactAmount: number;
  title: string;
  description: string;
}

export interface MonthlyVarianceReport {
  previousMonthKey: string;
  previousMonthLabel: string;
  currentMonthKey: string;
  currentMonthLabel: string;
  previousTotal: number;
  currentTotal: number;
  deltaTotal: number;
  percentTotalChange: number;
  topIncreaseDrivers: CostVarianceDriver[];
  topDecreaseDrivers: CostVarianceDriver[];
  anomalies: CostAnomaly[];
}

export interface YearOverYearComparison {
  currentYear: number;
  previousYear: number;
  currentYearSpend: number;
  previousYearSpend: number;
  yoyTotalDelta: number;
  yoyTotalPercentChange: number;
  monthlyPairs: {
    monthNum: number;
    monthName: string; // e.g. "Mar", "Feb", "Jan"
    currentMonthKey: string;
    previousMonthKey: string;
    currentSpend: number;
    previousSpend: number;
    delta: number;
    percentChange: number;
  }[];
  serviceYoY: {
    serviceName: string;
    currentSpend: number;
    previousSpend: number;
    delta: number;
    percentChange: number;
  }[];
}

export interface FinOpsRecommendation {
  id: string;
  title: string;
  category: 'Reservations & Savings Plans' | 'Idle & Orphaned Resources' | 'Right-Sizing' | 'Tier Optimization' | 'Subscription Architecture';
  estimatedMonthlySavings: number;
  difficulty: 'Quick Win' | 'Medium Effort' | 'Architectural';
  affectedSubscription: string;
  description: string;
  recommendedAction: string;
  reservationTarget?: ReservationComponentType;
}

export interface ConsolidatedStats {
  totalSpend: number;
  currency: string;
  subscriptionCount: number;
  invoiceCount: number;
  monthsCount: number;
  latestMonthSpend: number;
  previousMonthSpend: number;
  momSpendChangePercent: number;
  averageMonthlySpend: number;
  totalReservationSpend: number;
  totalEstimatedSavings: number;
  overallReservationCoveragePercent: number;
  topSpendingSubscription: {
    name: string;
    spend: number;
    percent: number;
  };
}

export interface ColumnMapping {
  subscriptionId?: string;
  subscriptionName?: string;
  invoiceId?: string;
  date?: string;
  billingPeriod?: string;
  cost?: string;
  currency?: string;
  serviceName?: string;
  resourceGroup?: string;
  resourceLocation?: string;
  pricingModel?: string;
  reservationId?: string;
  reservationName?: string;
  consumedService?: string;
  meterCategory?: string;
}
