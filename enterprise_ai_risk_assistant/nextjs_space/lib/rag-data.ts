// Financial policy documents for RAG knowledge base

export const FINANCIAL_POLICIES = [
  {
    title: 'Credit Score Requirements',
    section: 'credit_score',
    content: `Credit Score Requirements Policy:\n\nApplicants with a credit score below 600 are classified as HIGH RISK. These applications require mandatory manual review by a senior underwriter and may be subject to higher interest rates or collateral requirements.\n\nApplicants with credit scores between 600 and 700 are classified as MEDIUM RISK. These applications undergo standard verification procedures including employment verification, income documentation, and reference checks.\n\nApplicants with credit scores above 700 are classified as LOW RISK and may be eligible for expedited processing, preferential interest rates, and higher credit limits. Scores above 750 qualify for premium tier products.\n\nAll credit score evaluations must use FICO Score 8 or later versions. Thin-file applicants (fewer than 3 trade lines) require alternative data assessment regardless of their credit score.`,
  },
  {
    title: 'Debt-to-Income Limits',
    section: 'dti',
    content: `Debt-to-Income (DTI) Ratio Policy:\n\nThe maximum acceptable DTI ratio for standard loan products is 0.45 (45%). Applications with DTI above this threshold require enhanced due diligence and senior approval.\n\nApplications with DTI above 0.50 (50%) are automatically declined unless exceptional circumstances apply (e.g., substantial collateral, co-signer with excellent credit, or temporary income reduction with documented recovery plan).\n\nFor calculating DTI:\n- Include all recurring monthly debt obligations (mortgage/rent, car payments, student loans, minimum credit card payments, child support/alimony)\n- Use gross monthly income before taxes\n- For variable income earners, use the average of the last 24 months\n- Self-employment income requires 2 years of tax returns for verification\n\nFront-end DTI (housing costs only) should not exceed 0.28 (28%) for conventional products.`,
  },
  {
    title: 'Employment History Requirements',
    section: 'employment',
    content: `Employment History Policy:\n\nMinimum 2 years of continuous employment at current employer is required for standard loan products. Gaps in employment exceeding 3 months within the last 2 years require written explanation and supporting documentation.\n\nSelf-employed applicants must provide:\n- 3 years of personal and business tax returns\n- Current year profit and loss statement\n- Business license or registration documentation\n- Bank statements for the last 6 months\n\nRecent job changes (within 6 months) are acceptable if:\n- The new position is in the same field or industry\n- There is no reduction in income\n- The applicant has a strong overall employment history (5+ years)\n\nContract and gig economy workers are evaluated based on:\n- 2 years of consistent 1099 income\n- Average monthly earnings over the last 24 months\n- Number and stability of ongoing contracts`,
  },
  {
    title: 'Loan Amount Guidelines',
    section: 'loan_amount',
    content: `Loan Amount and Product Guidelines:\n\nPersonal loans: $5,000 to $50,000\n- Unsecured loans up to $25,000 based on creditworthiness\n- Loans above $25,000 may require collateral or co-signer\n\nAuto loans: $10,000 to $75,000\n- Maximum LTV (Loan-to-Value) ratio of 120% for new vehicles\n- Maximum LTV of 100% for used vehicles\n- Vehicle must be no older than 7 years at loan maturity\n\nHome equity loans: Up to 85% combined LTV\n- Minimum property ownership of 12 months\n- Current appraisal required for amounts above $50,000\n\nAll loan products require:\n- Minimum credit score of 580\n- Documented income sufficient to support payments\n- Valid government-issued identification\n- Proof of residence`,
  },
  {
    title: 'Risk Assessment Process',
    section: 'risk_process',
    content: `Risk Assessment and Decision Process:\n\nStep 1: Initial Screening\n- Automated credit check and fraud screening\n- PII verification and identity authentication\n- Sanctions and watchlist screening\n\nStep 2: Risk Scoring\n- ML-based risk model generates probability score\n- Features considered: credit score, DTI, income, loan amount, employment history\n- Risk levels: Low (0-40%), Medium (40-70%), High (70-100%)\n\nStep 3: Decision Routing\n- Low Risk (< 40%): Auto-approve with standard terms\n- Medium Risk (40-70%): Route to underwriter for additional verification\n- High Risk (> 70%): Senior review required, may decline or offer modified terms\n\nStep 4: Documentation\n- All decisions must be documented with rationale\n- Adverse actions require written notification within 30 days\n- Appeal process available for declined applications\n\nCompliance Notes:\n- All assessments must comply with Equal Credit Opportunity Act (ECOA)\n- Fair lending practices must be observed\n- Model decisions must be explainable and free from prohibited bias`,
  },
];
