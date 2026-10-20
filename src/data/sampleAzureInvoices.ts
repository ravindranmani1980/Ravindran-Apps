import type { NormalizedCostRecord } from '../types/azure.ts';

export const SAMPLE_RAW_AZURE_CSV = `SubscriptionId,SubscriptionName,InvoiceNumber,Date,ConsumedService,ResourceGroup,ResourceLocation,CostInBillingCurrency,BillingCurrency,PricingModel
a8f10123-4b5c-4829-91a1-304b5c901e12,Prod-Core-US-East,INV-AZ-2026-03-8821,2026-03-15,Virtual Machines,rg-prod-core,East US,4120.50,USD,Reservation
a8f10123-4b5c-4829-91a1-304b5c901e12,Prod-Core-US-East,INV-AZ-2026-03-8821,2026-03-15,Azure Kubernetes Service,rg-prod-aks-cluster,East US,3840.00,USD,Reservation
a8f10123-4b5c-4829-91a1-304b5c901e12,Prod-Core-US-East,INV-AZ-2026-03-8821,2026-03-15,Azure SQL Managed Instance,rg-prod-databases,East US,2950.00,USD,Reservation
a8f10123-4b5c-4829-91a1-304b5c901e12,Prod-Core-US-East,INV-AZ-2026-03-8821,2026-03-15,Storage Accounts,rg-prod-storage,East US,890.40,USD,OnDemand
a8f10123-4b5c-4829-91a1-304b5c901e12,Prod-Core-US-East,INV-AZ-2026-03-8821,2026-03-15,Virtual Network,rg-prod-networking,East US,430.20,USD,OnDemand
b2c45910-67e1-45da-9081-124b89ff0123,AppServices-Web-Hub,INV-AZ-2026-03-9140,2026-03-15,App Service,rg-web-frontend,West US 2,2450.00,USD,Reservation
b2c45910-67e1-45da-9081-124b89ff0123,AppServices-Web-Hub,INV-AZ-2026-03-9140,2026-03-15,Azure SQL Database,rg-web-databases,West US 2,1850.00,USD,Reservation
b2c45910-67e1-45da-9081-124b89ff0123,AppServices-Web-Hub,INV-AZ-2026-03-9140,2026-03-15,Application Gateway,rg-web-network,West US 2,620.00,USD,OnDemand
b2c45910-67e1-45da-9081-124b89ff0123,AppServices-Web-Hub,INV-AZ-2026-03-9140,2026-03-15,Key Vault,rg-web-security,West US 2,145.80,USD,OnDemand
c9920144-88aa-419b-a621-8899aabbccdd,AI-Analytics-Foundry,INV-AZ-2026-03-7729,2026-03-15,Azure OpenAI Service,rg-ai-models-foundry,East US,5840.00,USD,OnDemand
c9920144-88aa-419b-a621-8899aabbccdd,AI-Analytics-Foundry,INV-AZ-2026-03-7729,2026-03-15,Azure Kubernetes Service,rg-ai-gpu-nodepool,East US,3200.00,USD,Reservation
c9920144-88aa-419b-a621-8899aabbccdd,AI-Analytics-Foundry,INV-AZ-2026-03-7729,2026-03-15,Azure Cosmos DB,rg-ai-vectordb,East US,1420.00,USD,OnDemand
c9920144-88aa-419b-a621-8899aabbccdd,AI-Analytics-Foundry,INV-AZ-2026-03-7729,2026-03-15,Storage Accounts,rg-ai-data-lake,East US,1120.00,USD,OnDemand
d1123455-ee99-47bb-bf32-001122334455,Shared-Corp-Security,INV-AZ-2026-03-6601,2026-03-15,Microsoft Defender,rg-corp-security,Central US,980.00,USD,OnDemand
d1123455-ee99-47bb-bf32-001122334455,Shared-Corp-Security,INV-AZ-2026-03-6601,2026-03-15,Virtual Machines,rg-corp-bastion,Central US,650.00,USD,Reservation
d1123455-ee99-47bb-bf32-001122334455,Shared-Corp-Security,INV-AZ-2026-03-6601,2026-03-15,Log Analytics,rg-corp-telemetry,Central US,480.00,USD,OnDemand`;

export function getInitialDemoRecords(): NormalizedCostRecord[] {
  const months = [
    { key: '2025-01', label: 'Jan 2025', factor: 0.78 },
    { key: '2025-02', label: 'Feb 2025', factor: 0.80 },
    { key: '2025-03', label: 'Mar 2025', factor: 0.82 },
    { key: '2025-04', label: 'Apr 2025', factor: 0.81 },
    { key: '2025-05', label: 'May 2025', factor: 0.84 },
    { key: '2025-06', label: 'Jun 2025', factor: 0.85 },
    { key: '2025-07', label: 'Jul 2025', factor: 0.86 },
    { key: '2025-08', label: 'Aug 2025', factor: 0.87 },
    { key: '2025-09', label: 'Sep 2025', factor: 0.86 },
    { key: '2025-10', label: 'Oct 2025', factor: 0.89 },
    { key: '2025-11', label: 'Nov 2025', factor: 0.91 },
    { key: '2025-12', label: 'Dec 2025', factor: 0.95 },
    { key: '2026-01', label: 'Jan 2026', factor: 0.94 },
    { key: '2026-02', label: 'Feb 2026', factor: 0.98 },
    { key: '2026-03', label: 'Mar 2026', factor: 1.05 },
  ];

  const subscriptions = [
    {
      id: 'a8f10123-4b5c-4829-91a1-304b5c901e12',
      name: 'Prod-Core-US-East',
      invPrefix: 'INV-AZ-PROD',
      items: [
        {
          service: 'Virtual Machines',
          cat: 'Compute' as const,
          rg: 'rg-prod-core',
          loc: 'East US',
          baseCost: 4120.50,
          model: 'Reservation' as const,
          component: 'Virtual Machines' as const,
          savingsRatio: 0.42,
        },
        {
          service: 'Azure Kubernetes Service',
          cat: 'Compute' as const,
          rg: 'rg-prod-aks-cluster',
          loc: 'East US',
          baseCost: 3840.00,
          model: 'Reservation' as const,
          component: 'AKS VMs (Kubernetes Node Pools)' as const,
          savingsRatio: 0.40,
        },
        {
          service: 'Azure SQL Managed Instance',
          cat: 'Databases' as const,
          rg: 'rg-prod-databases',
          loc: 'East US',
          baseCost: 2950.00,
          model: 'Reservation' as const,
          component: 'Azure SQL Managed Instance' as const,
          savingsRatio: 0.48,
        },
        {
          service: 'Storage Accounts',
          cat: 'Storage' as const,
          rg: 'rg-prod-storage',
          loc: 'East US',
          baseCost: 890.40,
          model: 'OnDemand' as const,
        },
        {
          service: 'Virtual Network',
          cat: 'Networking' as const,
          rg: 'rg-prod-networking',
          loc: 'East US',
          baseCost: 430.20,
          model: 'OnDemand' as const,
        },
      ],
    },
    {
      id: 'b2c45910-67e1-45da-9081-124b89ff0123',
      name: 'AppServices-Web-Hub',
      invPrefix: 'INV-AZ-WEB',
      items: [
        {
          service: 'App Service',
          cat: 'Compute' as const,
          rg: 'rg-web-frontend',
          loc: 'West US 2',
          baseCost: 2450.00,
          model: 'Reservation' as const,
          component: 'App Services' as const,
          savingsRatio: 0.38,
        },
        {
          service: 'Azure SQL Database',
          cat: 'Databases' as const,
          rg: 'rg-web-databases',
          loc: 'West US 2',
          baseCost: 1850.00,
          model: 'Reservation' as const,
          component: 'Azure SQL Database' as const,
          savingsRatio: 0.45,
        },
        {
          service: 'Application Gateway',
          cat: 'Networking' as const,
          rg: 'rg-web-network',
          loc: 'West US 2',
          baseCost: 620.00,
          model: 'OnDemand' as const,
        },
        {
          service: 'Key Vault',
          cat: 'Security & Identity' as const,
          rg: 'rg-web-security',
          loc: 'West US 2',
          baseCost: 145.80,
          model: 'OnDemand' as const,
        },
      ],
    },
    {
      id: 'c9920144-88aa-419b-a621-8899aabbccdd',
      name: 'AI-Analytics-Foundry',
      invPrefix: 'INV-AZ-AI',
      items: [
        {
          service: 'Azure OpenAI Service',
          cat: 'AI & Machine Learning' as const,
          rg: 'rg-ai-models-foundry',
          loc: 'East US',
          baseCost: 5840.00,
          model: 'OnDemand' as const,
          growthMultiplier: 1.25, // AI spend growing quickly
        },
        {
          service: 'Azure Kubernetes Service',
          cat: 'Compute' as const,
          rg: 'rg-ai-gpu-nodepool',
          loc: 'East US',
          baseCost: 3200.00,
          model: 'Reservation' as const,
          component: 'AKS VMs (Kubernetes Node Pools)' as const,
          savingsRatio: 0.40,
        },
        {
          service: 'Azure Cosmos DB',
          cat: 'Databases' as const,
          rg: 'rg-ai-vectordb',
          loc: 'East US',
          baseCost: 1420.00,
          model: 'OnDemand' as const,
        },
        {
          service: 'Storage Accounts',
          cat: 'Storage' as const,
          rg: 'rg-ai-data-lake',
          loc: 'East US',
          baseCost: 1120.00,
          model: 'OnDemand' as const,
        },
      ],
    },
    {
      id: 'd1123455-ee99-47bb-bf32-001122334455',
      name: 'Shared-Corp-Security',
      invPrefix: 'INV-AZ-SEC',
      items: [
        {
          service: 'Microsoft Defender',
          cat: 'Security & Identity' as const,
          rg: 'rg-corp-security',
          loc: 'Central US',
          baseCost: 980.00,
          model: 'OnDemand' as const,
        },
        {
          service: 'Virtual Machines',
          cat: 'Compute' as const,
          rg: 'rg-corp-bastion',
          loc: 'Central US',
          baseCost: 650.00,
          model: 'Reservation' as const,
          component: 'Virtual Machines' as const,
          savingsRatio: 0.42,
        },
        {
          service: 'Log Analytics',
          cat: 'Analytics & IoT' as const,
          rg: 'rg-corp-telemetry',
          loc: 'Central US',
          baseCost: 480.00,
          model: 'OnDemand' as const,
        },
      ],
    },
  ];

  const records: NormalizedCostRecord[] = [];

  months.forEach((m, mIdx) => {
    subscriptions.forEach(sub => {
      const invNum = `${sub.invPrefix}-${m.key.replace('-', '')}`;

      sub.items.forEach((item, itemIdx) => {
        let cost = item.baseCost * m.factor;
        if ('growthMultiplier' in item && item.growthMultiplier) {
          cost = item.baseCost * Math.pow(item.growthMultiplier, mIdx / 2 - 1);
        }
        cost = Math.round(cost * 100) / 100;

        let resDetails = undefined;
        if (item.model === 'Reservation' && 'component' in item && item.component) {
          const savings = Math.round(cost * (item.savingsRatio || 0.4) * 100) / 100;
          resDetails = {
            componentType: item.component,
            termYears: (item.component.includes('Managed Instance') ? 3 : 1) as 1 | 3,
            utilizationPercent: 88 + (mIdx % 5),
            estimatedSavings: savings,
            sku: `${item.component} Standard`,
          };
        }

        records.push({
          id: `${sub.id}-${m.key}-${itemIdx}`,
          subscriptionId: sub.id,
          subscriptionName: sub.name,
          invoiceId: invNum,
          billingPeriod: m.key,
          billingPeriodLabel: m.label,
          date: `${m.key}-15`,
          serviceName: item.service,
          serviceCategory: item.cat,
          resourceGroup: item.rg,
          resourceLocation: item.loc,
          cost,
          currency: 'USD',
          sourceFile: `azure-invoice-${m.key}.csv`,
          pricingModel: item.model,
          reservationDetails: resDetails,
        });
      });
    });
  });

  return records;
}
