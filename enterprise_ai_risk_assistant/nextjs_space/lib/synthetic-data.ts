// Synthetic Financial Data Generator
// Generates realistic correlated financial profiles for model training

export interface TrainingSample {
  features: number[]; // [creditScore, dti, annualIncome, loanAmount, yearsAtJob]
  label: number; // 0 = low risk, 1 = high risk
}

// Seeded pseudo-random number generator for reproducibility
class SeededRNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed;
  }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    return (this.state >>> 0) / 0xffffffff;
  }
  // Box-Muller transform for normal distribution
  normal(mean: number, std: number): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
    return mean + std * z;
  }
}

export function generateSyntheticData(nSamples: number = 2000, seed: number = 42): TrainingSample[] {
  const rng = new SeededRNG(seed);
  const samples: TrainingSample[] = [];

  for (let i = 0; i < nSamples; i++) {
    // Generate correlated features
    const baseQuality = rng.normal(0.5, 0.25); // Latent "financial health" factor

    // Credit score: correlated with base quality
    const creditScore = Math.round(
      Math.max(300, Math.min(850, 300 + 550 * (baseQuality + rng.normal(0, 0.15))))
    );

    // DTI: inversely correlated with quality
    const dti = Math.max(0.05, Math.min(0.75,
      0.5 - 0.3 * baseQuality + rng.normal(0, 0.08)
    ));

    // Annual income: positively correlated
    const annualIncome = Math.round(
      Math.max(20000, Math.min(250000,
        30000 + 120000 * (baseQuality + rng.normal(0, 0.2))
      ))
    );

    // Loan amount: somewhat independent but higher for higher incomes
    const loanAmount = Math.round(
      Math.max(5000, Math.min(50000,
        5000 + 30000 * rng.next() + annualIncome * 0.05 * rng.next()
      ))
    );

    // Years at job: loosely correlated with quality
    const yearsAtJob = Math.round(
      Math.max(0, Math.min(40,
        baseQuality * 15 + rng.normal(3, 4)
      ))
    );

    // Generate label based on realistic risk logic with noise
    const loanToIncome = loanAmount / Math.max(annualIncome, 1);
    const riskSignal =
      (creditScore < 600 ? 0.4 : creditScore < 680 ? 0.15 : -0.2) +
      (dti > 0.45 ? 0.35 : dti > 0.35 ? 0.1 : -0.15) +
      (annualIncome < 40000 ? 0.2 : annualIncome < 70000 ? 0.05 : -0.1) +
      (loanToIncome > 0.5 ? 0.2 : loanToIncome > 0.3 ? 0.05 : -0.05) +
      (yearsAtJob < 2 ? 0.15 : yearsAtJob < 5 ? 0 : -0.1) +
      rng.normal(0, 0.12); // noise

    const riskProb = 1 / (1 + Math.exp(-3 * riskSignal));
    const label = rng.next() < riskProb ? 1 : 0;

    // Normalize features to [0, 1]
    const features = [
      (creditScore - 300) / 550,     // credit score normalized
      dti / 0.75,                     // dti normalized
      (annualIncome - 20000) / 230000, // income normalized
      (loanAmount - 5000) / 45000,    // loan normalized
      yearsAtJob / 40,                // years normalized
    ];

    samples.push({ features, label });
  }

  return samples;
}

// Denormalize features for display
export function denormalizeFeatures(normalized: number[]): {
  creditScore: number;
  debtToIncome: number;
  annualIncome: number;
  loanAmount: number;
  yearsAtJob: number;
} {
  return {
    creditScore: Math.round(normalized[0] * 550 + 300),
    debtToIncome: Math.round(normalized[1] * 0.75 * 1000) / 1000,
    annualIncome: Math.round(normalized[2] * 230000 + 20000),
    loanAmount: Math.round(normalized[3] * 45000 + 5000),
    yearsAtJob: Math.round(normalized[4] * 40),
  };
}

// Normalize raw features for model input
export function normalizeFeatures(raw: {
  creditScore: number;
  debtToIncome: number;
  annualIncome: number;
  loanAmount: number;
  yearsAtJob: number;
}): number[] {
  return [
    Math.max(0, Math.min(1, (raw.creditScore - 300) / 550)),
    Math.max(0, Math.min(1, raw.debtToIncome / 0.75)),
    Math.max(0, Math.min(1, (raw.annualIncome - 20000) / 230000)),
    Math.max(0, Math.min(1, (raw.loanAmount - 5000) / 45000)),
    Math.max(0, Math.min(1, raw.yearsAtJob / 40)),
  ];
}

export const FEATURE_NAMES = ['Credit Score', 'Debt-to-Income', 'Annual Income', 'Loan Amount', 'Years at Job'];
