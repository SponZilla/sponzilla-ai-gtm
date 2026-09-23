import type { OpportunityV1 } from '../src/v1/opportunity';

/**
 * Example handoff payload for Gymshark — mirrors what MI can produce today
 * plus the v1 renames (suggestedAngle, nextActionHint, qualificationStatus, industry).
 *
 * ICP / buyerPersonas / decisionMakers are empty/null (PLANNED — not invented).
 */
export const gymsharkOpportunityV1Example: OpportunityV1 = {
  contractVersion: 'v1',
  id: 'opp_gymshark_example_001',
  origin: 'MARKET_INTELLIGENCE',
  company: {
    contractId: 'company_gymshark',
    name: 'Gymshark',
    websiteUrl: 'https://gymshark.com',
    location: 'New York, NY',
    industry: 'Fitness & Retail',
  },
  signals: [
    {
      id: 'sig_001',
      type: 'store_opening',
      title: 'New retail location activity',
      summary:
        'Public coverage indicates Gymshark expanding physical retail presence.',
      evidenceIds: ['ev_001'],
      sourceUrl: 'https://example-news.com/gymshark-store',
      sourceTitle: 'Gymshark opens new store',
      detectedAt: '2026-09-23T10:00:00.000Z',
    },
  ],
  evidence: [
    {
      id: 'ev_001',
      claim: 'Gymshark announced a new store opening',
      fact: 'Gymshark publicly communicated a new retail location.',
      aiInference:
        'Physical expansion often pairs with local experiential marketing demand.',
      suggestedAngle: 'Local launch activation + campus ambassador bundle',
      sourceId: 'src_001',
      source: {
        title: 'Gymshark opens new store',
        url: 'https://example-news.com/gymshark-store',
        type: 'news',
        publishedAt: '2026-09-01',
        verified: true,
      },
      confidenceScore: 0.82,
    },
  ],
  audience: 'Urban Fitness Enthusiasts & Local Gym Community Members',
  marketingNeed:
    'Gymshark requires experiential marketing activations to amplify recent commercial growth.',
  aiInference: {
    summary:
      "Grounded Opportunity: Capitalize on Gymshark's verified store_opening activity.",
    groundedReasoning:
      'Inference derived from 1 verified signal across 1 verified source.',
    assumptions: [
      "Assumes Gymshark's marketing budget remains aligned with recent public activity.",
    ],
    unsupportedClaimsWarning: null,
  },
  confidence: 'MEDIUM',
  confidenceReason:
    'Confidence score calculated from 1 verified live HTTP sources and 1 detected signals.',
  recommendation:
    'Initiate GTM partnership outreach with field marketing directors.',
  nextActionHint:
    'Send tailored GTM proposal deck citing verified signals from Gymshark opens new store.',
  qualificationStatus: 'QUALIFIED',
  icpAssessment: null,
  buyerPersonas: [],
  decisionMakers: [],
  producedAt: '2026-09-23T10:05:00.000Z',
};
