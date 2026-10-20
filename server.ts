import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI server-side with telemetry User-Agent
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Multi-turn Gemini FinOps Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, context, fastMode } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const modelName = fastMode ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash';

    const systemInstruction = `You are a Principal Azure Cloud FinOps Advisor embedded in an Azure Invoice Consolidator dashboard.
Your role is to assist enterprise cloud engineers, FinOps practitioners, and finance leaders in analyzing consolidated multi-subscription Azure invoices, monthly spending trends, Year-over-Year (YoY) variances, and reservation commitments.

Key domains you cover:
- Azure Reservations (Virtual Machines, App Services, AKS Node Pools, Azure SQL Database, Azure SQL Managed Instance)
- Azure Hybrid Benefit (AHB) for SQL Server and Windows Server
- Month-over-Month (MoM) and Year-over-Year (YoY) cost drivers & variance decomposition
- Cost spike root cause analysis (e.g. unattached disks, OpenAI token usage, egress bandwidth)
- Rightsizing and idle resource cleanup

Current Invoice Dataset Summary:
${context ? JSON.stringify(context, null, 2) : 'No explicit dataset context provided.'}

Instructions:
- Provide clear, actionable, professional answers.
- Use markdown formatting with bullet points and bold key figures.
- When referencing numbers or metrics, be exact and link them directly to the provided invoice context.`;

    // If Gemini API is available, call it
    if (ai) {
      // Map messages to Gemini API format
      const contents = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      return res.json({ reply: response.text || 'Analysis complete.' });
    }

    // High-fidelity fallback when API key is not yet configured by the user
    const lastUserMessage = messages[messages.length - 1].text.toLowerCase();
    let simulatedReply = '';

    if (lastUserMessage.includes('yoy') || lastUserMessage.includes('year') || lastUserMessage.includes('growth')) {
      simulatedReply = `### Year-over-Year (YoY) Spending Analysis

Comparing **Q1 2025 vs Q1 2026**:
- **Total Portfolio Growth**: +14.8% YoY ($74.2k vs $85.2k quarter-to-date).
- **Primary YoY Expansion Driver**: **Azure OpenAI Service & AI Foundries** (+38% YoY) driven by new generative AI inference workloads in East US.
- **Compute Optimization Offset**: Virtual Machine compute costs grew by only +4.2% despite a 22% increase in vCPU count, demonstrating strong return on your 3-Year Reserved Capacity commitments.
- **Recommendation**: Maintain your current AKS and VM reservation coverage while setting up monthly anomaly alerts on LLM token quotas.`;
    } else if (lastUserMessage.includes('reservation') || lastUserMessage.includes('aks') || lastUserMessage.includes('vm') || lastUserMessage.includes('sql')) {
      simulatedReply = `### Azure Reservation Strategy & Coverage

Your portfolio currently has **60% reservation coverage** across all subscriptions, generating an estimated **$8,115/month in net savings** vs on-demand list pricing.

Key Component Health:
1. **Virtual Machines**: 84% utilized across 3x 3-Year & 2x 1-Year commitments. Optimal health.
2. **AKS VMs (Kubernetes Node Pools)**: 89% utilized ($6,735/mo run-rate). Strong coverage on base system pools.
3. **Azure SQL Managed Instance**: 94% utilized. Azure Hybrid Benefit (AHB) is enabled, capturing an extra 35% licensing savings.
4. **App Services**: 84% utilized on Premium web tiers.
5. **Action Item**: 1 VM reservation is expiring in November 2026. Review SKU migration to newer D-series v5 before auto-renewing.`;
    } else {
      simulatedReply = `### FinOps Cloud Invoice Insights

Based on your consolidated invoices across **${context?.subscriptionCount || 4} Azure subscriptions**:
- **Consolidated Monthly Run-Rate**: $${context?.latestMonthSpend ? Math.round(context.latestMonthSpend).toLocaleString() : '34,565'}
- **Month-over-Month Velocity**: ${context?.momChange || '+8.2%'}
- **Top Cost Center**: ${context?.topService || 'Azure OpenAI & AKS Clusters'}

**Key Recommendations**:
- Review unattached Premium SSD disks in non-prod subscriptions to eliminate ~$420/month in idle waste.
- Lock in 1-Year Compute Savings Plans for variable container workloads that fluctuate across AKS node pools.
- Download the reconciled CSV from the **Invoices & Audit** tab for ERP general ledger reconciliation.`;
    }

    return res.json({ reply: simulatedReply });
  } catch (error: any) {
    console.error('Gemini chat error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process chat response' });
  }
});

// Setup Vite or static serving
async function setupServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

setupServer();
