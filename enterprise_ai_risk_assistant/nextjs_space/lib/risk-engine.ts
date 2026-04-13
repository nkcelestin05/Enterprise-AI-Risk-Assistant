// Risk Scoring Engine - Real ML-based risk assessment using Gradient Boosted Trees
// Uses a trained GBM model for inference instead of hardcoded formulas

import { getOrTrainModel, predictWithModel, type PredictionResult } from './ml-model';

export interface RiskFeatures {
  creditScore: number;
  debtToIncome: number;
  annualIncome: number;
  loanAmount: number;
  yearsAtJob: number;
}

export interface RiskResult {
  riskProbability: number;
  riskLevel: 'High' | 'Medium' | 'Low';
  recommendation: string;
  featureContributions: { feature: string; impact: string; value: number; contribution?: number }[];
  explanation: string;
  modelVersion: string;
  confidence: number;
}

export function calculateRiskScore(features: RiskFeatures): RiskResult {
  const cs = features?.creditScore ?? 650;
  const dti = features?.debtToIncome ?? 0.3;
  const income = features?.annualIncome ?? 60000;
  const loan = features?.loanAmount ?? 20000;
  const years = features?.yearsAtJob ?? 3;

  // Get trained model and run inference
  const model = getOrTrainModel();
  const prediction: PredictionResult = predictWithModel(model, {
    creditScore: cs,
    debtToIncome: dti,
    annualIncome: income,
    loanAmount: loan,
    yearsAtJob: years,
  });

  const recommendation =
    prediction.riskLevel === 'High'
      ? 'Manual Review Required — High risk profile detected by ML model'
      : prediction.riskLevel === 'Medium'
      ? 'Additional Verification Needed — Model indicates moderate risk factors'
      : 'Auto-Approve — ML model predicts low risk with high confidence';

  const explanation = buildExplanation(prediction, { cs, dti, income, loan, years });

  return {
    riskProbability: prediction.probability,
    riskLevel: prediction.riskLevel,
    recommendation,
    featureContributions: prediction.featureContributions.map(fc => ({
      feature: fc.feature,
      impact: fc.impact,
      value: fc.value,
      contribution: fc.contribution,
    })),
    explanation,
    modelVersion: prediction.modelVersion,
    confidence: prediction.confidence,
  };
}

function buildExplanation(
  prediction: PredictionResult,
  raw: { cs: number; dti: number; income: number; loan: number; years: number }
): string {
  const topFactors = prediction.featureContributions
    .filter(fc => fc.impact !== 'Neutral')
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3);

  const factorDescriptions = topFactors.map(f => {
    const direction = f.impact === 'Negative' ? 'increases risk' : 'decreases risk';
    return `${f.feature} (${direction}, contribution: ${(f.contribution * 100).toFixed(1)}%)`;
  });

  return `ML Model Assessment (${prediction.modelVersion}): Risk probability ${(prediction.probability * 100).toFixed(2)}% with ${(prediction.confidence * 100).toFixed(1)}% confidence. ` +
    `Profile: Credit score ${raw.cs}, DTI ${(raw.dti * 100).toFixed(1)}%, income $${raw.income.toLocaleString()}, loan $${raw.loan.toLocaleString()}, ${raw.years}yr employment. ` +
    `Top factors: ${factorDescriptions.join('; ')}.`;
}

export function parseUserFeatures(text: string): Partial<RiskFeatures> {
  const features: Partial<RiskFeatures> = {};
  const lower = (text ?? '').toLowerCase();

  const csMatch = lower.match(/credit\s*score[:\s]*(\d{3})/i);
  if (csMatch) features.creditScore = parseInt(csMatch[1]);

  const dtiMatch = lower.match(/(?:dti|debt[\s-]*to[\s-]*income)[:\s]*(\d*\.?\d+)/i);
  if (dtiMatch) {
    const val = parseFloat(dtiMatch[1]);
    features.debtToIncome = val > 1 ? val / 100 : val;
  }

  const incomeMatch = lower.match(/(?:annual\s*)?income[:\s]*\$?([\d,]+)/i);
  if (incomeMatch) features.annualIncome = parseInt(incomeMatch[1].replace(/,/g, ''));

  const loanMatch = lower.match(/loan[:\s]*\$?([\d,]+)/i);
  if (loanMatch) features.loanAmount = parseInt(loanMatch[1].replace(/,/g, ''));

  const yearsMatch = lower.match(/(\d+)\s*years?\s*(?:at|of|in)?\s*(?:job|work|employ)/i);
  if (yearsMatch) features.yearsAtJob = parseInt(yearsMatch[1]);

  return features;
}
