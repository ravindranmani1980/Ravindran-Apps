import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCSV,
  detectColumnMapping,
  categorizeAzureService,
  detectReservationComponent,
  normalizeInvoiceRows,
  aggregateMonthlyData,
  computeMonthOverMonthVariance,
  computeYearOverYearComparison,
  filterRecordsByDateRange,
} from './azureInvoiceParser.ts';
import { sanitizeCellValue } from './fileValidation.ts';

test('CSV Parser handles standard and quoted commas with CRLF', () => {
  const csv = 'Header1,Header2,"Header, 3"\r\nval1,val2,"val, 3"\r\nval4,val5,val6';
  const { headers, rows } = parseCSV(csv);
  assert.equal(headers.length, 3);
  assert.equal(headers[2], 'Header, 3');
  assert.equal(rows.length, 2);
  assert.equal(rows[0][2], 'val, 3');
});

test('CSV Parser handles escaped quotes within quoted fields', () => {
  const csv = 'Name,Description\n"Azure VM","High performance ""D-Series"" node"';
  const { headers, rows } = parseCSV(csv);
  assert.equal(headers.length, 2);
  assert.equal(rows[0][1], 'High performance "D-Series" node');
});

test('detectColumnMapping recognizes Azure standard export headers', () => {
  const azureHeaders = [
    'SubscriptionId',
    'SubscriptionName',
    'InvoiceNumber',
    'Date',
    'ConsumedService',
    'ResourceGroup',
    'ResourceLocation',
    'CostInBillingCurrency',
    'BillingCurrency',
    'PricingModel',
  ];
  const mapping = detectColumnMapping(azureHeaders);
  assert.equal(mapping.subscriptionId, 'SubscriptionId');
  assert.equal(mapping.subscriptionName, 'SubscriptionName');
  assert.equal(mapping.invoiceId, 'InvoiceNumber');
  assert.equal(mapping.cost, 'CostInBillingCurrency');
  assert.equal(mapping.serviceName, 'ConsumedService');
  assert.equal(mapping.pricingModel, 'PricingModel');
});

test('categorizeAzureService classifies core Azure cloud services', () => {
  assert.equal(categorizeAzureService('Azure OpenAI Service'), 'AI & Machine Learning');
  assert.equal(categorizeAzureService('Azure SQL Database'), 'Databases');
  assert.equal(categorizeAzureService('Storage Accounts'), 'Storage');
  assert.equal(categorizeAzureService('Virtual Network'), 'Networking');
  assert.equal(categorizeAzureService('Virtual Machines'), 'Compute');
  assert.equal(categorizeAzureService('Microsoft Defender'), 'Security & Identity');
});

test('detectReservationComponent identifies specific requested reservation workloads', () => {
  assert.equal(detectReservationComponent('Virtual Machines'), 'Virtual Machines');
  assert.equal(detectReservationComponent('App Service'), 'App Services');
  assert.equal(detectReservationComponent('Azure Kubernetes Service'), 'AKS VMs (Kubernetes Node Pools)');
  assert.equal(detectReservationComponent('Azure SQL Database'), 'Azure SQL Database');
  assert.equal(detectReservationComponent('Azure SQL Managed Instance'), 'Azure SQL Managed Instance');
});

test('sanitizeCellValue neutralizes spreadsheet formula injection', () => {
  assert.equal(sanitizeCellValue('=cmd|/C calc!A0'), "'=cmd|/C calc!A0");
  assert.equal(sanitizeCellValue('+12345'), "'+12345");
  assert.equal(sanitizeCellValue('@SUM(1,2)'), "'@SUM(1,2)");
  assert.equal(sanitizeCellValue('-danger'), "'-danger");
  assert.equal(sanitizeCellValue('Safe Product Name'), 'Safe Product Name');
});

test('normalizeInvoiceRows and aggregateMonthlyData calculate multi-subscription totals', () => {
  const headers = ['SubscriptionId', 'SubscriptionName', 'InvoiceNumber', 'Date', 'ConsumedService', 'CostInBillingCurrency', 'PricingModel'];
  const rows = [
    ['sub-1', 'Prod Sub', 'INV-01', '2026-03-01', 'Virtual Machines', '1000', 'Reservation'],
    ['sub-1', 'Prod Sub', 'INV-01', '2026-03-01', 'Storage Accounts', '200', 'OnDemand'],
    ['sub-2', 'Dev Sub', 'INV-02', '2026-03-01', 'Azure SQL Managed Instance', '800', 'Reservation'],
  ];

  const records = normalizeInvoiceRows(headers, rows, 'test.csv');
  assert.equal(records.length, 3);
  assert.equal(records[0].pricingModel, 'Reservation');
  assert.equal(records[0].cost, 1000);

  const { monthlySummaries, subscriptions, overallStats } = aggregateMonthlyData(records);
  assert.equal(monthlySummaries.length, 1);
  assert.equal(monthlySummaries[0].totalCost, 2000);
  assert.equal(subscriptions.length, 2);
  assert.equal(overallStats.totalSpend, 2000);
  assert.equal(overallStats.totalReservationSpend, 1800);
  assert.equal(overallStats.subscriptionCount, 2);
});

test('computeMonthOverMonthVariance calculates delta and growth drivers', () => {
  const summaries = [
    {
      monthKey: '2026-02',
      monthLabel: 'Feb 2026',
      totalCost: 10000,
      currency: 'USD',
      onDemandCost: 6000,
      reservationCost: 4000,
      savingsPlanCost: 0,
      bySubscription: { 'Prod': 6000, 'Dev': 4000 },
      byService: { 'Compute': 5000, 'Databases': 5000 },
      byCategory: {
        'Compute': 5000,
        'AI & Machine Learning': 0,
        'Databases': 5000,
        'Storage': 0,
        'Networking': 0,
        'Security & Identity': 0,
        'Analytics & IoT': 0,
        'Reservations & Commitments': 0,
        'Other Services': 0,
      },
      byReservationComponent: {
        'Virtual Machines': 4000,
        'App Services': 0,
        'AKS VMs (Kubernetes Node Pools)': 0,
        'Azure SQL Database': 0,
        'Azure SQL Managed Instance': 0,
        'Other Reservations': 0,
      },
      invoiceIds: ['INV-1'],
      recordCount: 10,
    },
    {
      monthKey: '2026-03',
      monthLabel: 'Mar 2026',
      totalCost: 12500,
      currency: 'USD',
      onDemandCost: 8500,
      reservationCost: 4000,
      savingsPlanCost: 0,
      bySubscription: { 'Prod': 8500, 'Dev': 4000 },
      byService: { 'Compute': 7500, 'Databases': 5000 },
      byCategory: {
        'Compute': 7500,
        'AI & Machine Learning': 0,
        'Databases': 5000,
        'Storage': 0,
        'Networking': 0,
        'Security & Identity': 0,
        'Analytics & IoT': 0,
        'Reservations & Commitments': 0,
        'Other Services': 0,
      },
      byReservationComponent: {
        'Virtual Machines': 4000,
        'App Services': 0,
        'AKS VMs (Kubernetes Node Pools)': 0,
        'Azure SQL Database': 0,
        'Azure SQL Managed Instance': 0,
        'Other Reservations': 0,
      },
      invoiceIds: ['INV-2'],
      recordCount: 12,
    },
  ];

  const variance = computeMonthOverMonthVariance(summaries);
  assert.ok(variance !== null);
  assert.equal(variance.deltaTotal, 2500);
  assert.equal(variance.percentTotalChange, 25);
  assert.equal(variance.topIncreaseDrivers[0].name, 'Prod');
  assert.equal(variance.topIncreaseDrivers[0].deltaCost, 2500);
});

test('filterRecordsByDateRange isolates records within month boundaries', () => {
  const records = [
    { billingPeriod: '2025-01', cost: 100 },
    { billingPeriod: '2025-06', cost: 200 },
    { billingPeriod: '2026-03', cost: 300 },
  ] as any;

  const filtered = filterRecordsByDateRange(records, '2025-04', '2025-12');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].billingPeriod, '2025-06');
});

test('computeYearOverYearComparison accurately calculates YoY delta across matched months', () => {
  const summaries = [
    {
      monthKey: '2025-01',
      monthLabel: 'Jan 2025',
      totalCost: 10000,
      currency: 'USD',
      onDemandCost: 6000,
      reservationCost: 4000,
      savingsPlanCost: 0,
      bySubscription: {},
      byService: { 'Virtual Machines': 6000, 'Storage': 4000 },
      byCategory: {} as any,
      byReservationComponent: {} as any,
      invoiceIds: [],
      recordCount: 5,
    },
    {
      monthKey: '2026-01',
      monthLabel: 'Jan 2026',
      totalCost: 12000,
      currency: 'USD',
      onDemandCost: 7000,
      reservationCost: 5000,
      savingsPlanCost: 0,
      bySubscription: {},
      byService: { 'Virtual Machines': 7500, 'Storage': 4500 },
      byCategory: {} as any,
      byReservationComponent: {} as any,
      invoiceIds: [],
      recordCount: 6,
    },
  ];

  const records = [
    { billingPeriod: '2025-01', serviceName: 'Virtual Machines', cost: 6000 },
    { billingPeriod: '2025-01', serviceName: 'Storage', cost: 4000 },
    { billingPeriod: '2026-01', serviceName: 'Virtual Machines', cost: 7500 },
    { billingPeriod: '2026-01', serviceName: 'Storage', cost: 4500 },
  ] as any;

  const yoy = computeYearOverYearComparison(summaries, records);
  assert.ok(yoy !== null);
  assert.equal(yoy.currentYear, 2026);
  assert.equal(yoy.previousYear, 2025);
  assert.equal(yoy.yoyTotalDelta, 2000);
  assert.equal(yoy.yoyTotalPercentChange, 20);
  assert.equal(yoy.monthlyPairs[0].monthName, 'Jan');
  assert.equal(yoy.serviceYoY[0].serviceName, 'Virtual Machines');
  assert.equal(yoy.serviceYoY[0].delta, 1500);
});
