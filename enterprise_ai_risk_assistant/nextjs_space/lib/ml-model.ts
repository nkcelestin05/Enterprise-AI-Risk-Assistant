// Gradient Boosted Decision Trees - Pure TypeScript Implementation
// Real ML model that learns decision boundaries from training data

import { generateSyntheticData, normalizeFeatures, FEATURE_NAMES, type TrainingSample } from './synthetic-data';

// ===== Decision Stump (Weak Learner) =====
interface DecisionStump {
  featureIndex: number;
  threshold: number;
  leftValue: number;  // prediction if feature <= threshold
  rightValue: number; // prediction if feature > threshold
}

function sigmoid(x: number): number {
  if (x > 20) return 1;
  if (x < -20) return 0;
  return 1 / (1 + Math.exp(-x));
}

// Find optimal split for a single feature
function findBestSplit(
  featureValues: number[],
  residuals: number[],
  weights: number[]
): { threshold: number; leftValue: number; rightValue: number; loss: number } {
  const n = featureValues.length;
  const indices = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => featureValues[a] - featureValues[b]
  );

  let bestLoss = Infinity;
  let bestThreshold = 0;
  let bestLeftValue = 0;
  let bestRightValue = 0;

  // Try 20 quantile-based thresholds for efficiency
  const nThresholds = 20;
  for (let t = 1; t <= nThresholds; t++) {
    const splitIdx = Math.floor((t / (nThresholds + 1)) * n);
    const threshold = featureValues[indices[splitIdx]];

    let leftSum = 0, leftWeight = 0, leftCount = 0;
    let rightSum = 0, rightWeight = 0, rightCount = 0;

    for (let i = 0; i < n; i++) {
      const w = weights[i];
      if (featureValues[i] <= threshold) {
        leftSum += residuals[i] * w;
        leftWeight += w;
        leftCount++;
      } else {
        rightSum += residuals[i] * w;
        rightWeight += w;
        rightCount++;
      }
    }

    if (leftCount === 0 || rightCount === 0) continue;

    const leftValue = leftSum / (leftWeight + 1e-10);
    const rightValue = rightSum / (rightWeight + 1e-10);

    // Compute weighted squared residual loss
    let loss = 0;
    for (let i = 0; i < n; i++) {
      const pred = featureValues[i] <= threshold ? leftValue : rightValue;
      loss += weights[i] * (residuals[i] - pred) ** 2;
    }

    if (loss < bestLoss) {
      bestLoss = loss;
      bestThreshold = threshold;
      bestLeftValue = leftValue;
      bestRightValue = rightValue;
    }
  }

  return { threshold: bestThreshold, leftValue: bestLeftValue, rightValue: bestRightValue, loss: bestLoss };
}

// Train a single decision stump on residuals
function trainStump(X: number[][], residuals: number[], weights: number[]): DecisionStump {
  const nFeatures = X[0].length;
  let bestStump: DecisionStump = { featureIndex: 0, threshold: 0.5, leftValue: 0, rightValue: 0 };
  let bestLoss = Infinity;

  for (let f = 0; f < nFeatures; f++) {
    const featureValues = X.map(row => row[f]);
    const split = findBestSplit(featureValues, residuals, weights);

    if (split.loss < bestLoss) {
      bestLoss = split.loss;
      bestStump = {
        featureIndex: f,
        threshold: split.threshold,
        leftValue: split.leftValue,
        rightValue: split.rightValue,
      };
    }
  }

  return bestStump;
}

// ===== Gradient Boosting Classifier =====
export interface GBModelParams {
  nEstimators: number;
  learningRate: number;
  maxDepth: number; // currently using stumps (depth=1)
  subsampleRate: number;
}

export interface TrainedModel {
  version: string;
  params: GBModelParams;
  initialPrediction: number;
  trees: DecisionStump[];
  featureImportance: number[];
  trainingMetrics: ModelMetrics;
  trainedAt: number;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  aucRoc: number;
  totalSamples: number;
  trainingTimeMs: number;
  confusionMatrix: { tp: number; fp: number; tn: number; fn: number };
}

export interface PredictionResult {
  probability: number;
  riskLevel: 'High' | 'Medium' | 'Low';
  confidence: number;
  featureContributions: { feature: string; impact: string; value: number; contribution: number }[];
  modelVersion: string;
}

const DEFAULT_PARAMS: GBModelParams = {
  nEstimators: 50,
  learningRate: 0.1,
  maxDepth: 1,
  subsampleRate: 0.8,
};

// ===== Training =====
export function trainModel(params: GBModelParams = DEFAULT_PARAMS): TrainedModel {
  const startTime = Date.now();
  const data = generateSyntheticData(2000, 42);

  // Split into train/test (80/20)
  const splitIdx = Math.floor(data.length * 0.8);
  const trainData = data.slice(0, splitIdx);
  const testData = data.slice(splitIdx);

  const X_train = trainData.map(s => s.features);
  const y_train = trainData.map(s => s.label);
  const X_test = testData.map(s => s.features);
  const y_test = testData.map(s => s.label);

  const n = X_train.length;
  const nFeatures = X_train[0].length;

  // Initialize with log-odds of positive class
  const posCount = y_train.filter(v => v === 1).length;
  const initialPrediction = Math.log((posCount + 1) / (n - posCount + 1));

  const predictions = new Array(n).fill(initialPrediction);
  const trees: DecisionStump[] = [];
  const featureSplitCounts = new Array(nFeatures).fill(0);

  // Seeded RNG for subsampling
  let rngState = 123;
  const seededRandom = () => {
    rngState = (rngState * 1664525 + 1013904223) & 0xffffffff;
    return (rngState >>> 0) / 0xffffffff;
  };

  for (let iter = 0; iter < params.nEstimators; iter++) {
    // Compute residuals (negative gradient of log-loss)
    const residuals = y_train.map((yi, j) => yi - sigmoid(predictions[j]));

    // Subsample
    const weights = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      weights[i] = seededRandom() < params.subsampleRate ? 1 : 0;
    }

    // Train stump on residuals
    const stump = trainStump(X_train, residuals, weights);
    trees.push(stump);
    featureSplitCounts[stump.featureIndex]++;

    // Update predictions
    for (let j = 0; j < n; j++) {
      const pred = X_train[j][stump.featureIndex] <= stump.threshold
        ? stump.leftValue
        : stump.rightValue;
      predictions[j] += params.learningRate * pred;
    }
  }

  // Calculate feature importance (based on split frequency + improvement)
  const totalSplits = featureSplitCounts.reduce((a, b) => a + b, 0) || 1;
  const featureImportance = featureSplitCounts.map(c => Math.round((c / totalSplits) * 10000) / 10000);

  // Evaluate on test set
  const trainingMetrics = evaluateModel(
    { initialPrediction, trees, params } as any,
    X_test,
    y_test
  );
  trainingMetrics.trainingTimeMs = Date.now() - startTime;
  trainingMetrics.totalSamples = data.length;

  const version = `gbm-v1.0-${params.nEstimators}t-${params.learningRate}lr`;

  return {
    version,
    params,
    initialPrediction,
    trees,
    featureImportance,
    trainingMetrics,
    trainedAt: Date.now(),
  };
}

// ===== Prediction =====
export function predictWithModel(model: TrainedModel, rawFeatures: {
  creditScore: number;
  debtToIncome: number;
  annualIncome: number;
  loanAmount: number;
  yearsAtJob: number;
}): PredictionResult {
  const normalized = normalizeFeatures(rawFeatures);

  // Base prediction
  let logOdds = model.initialPrediction;

  // Accumulate tree predictions + per-feature contributions
  const featureAccum = new Array(5).fill(0);

  for (const tree of model.trees) {
    const goLeft = normalized[tree.featureIndex] <= tree.threshold;
    const treePred = goLeft ? tree.leftValue : tree.rightValue;
    logOdds += model.params.learningRate * treePred;
    featureAccum[tree.featureIndex] += model.params.learningRate * treePred;
  }

  const probability = sigmoid(logOdds);
  const riskLevel: 'High' | 'Medium' | 'Low' =
    probability > 0.65 ? 'High' : probability > 0.35 ? 'Medium' : 'Low';

  // Confidence: how far from 0.5 decision boundary
  const confidence = Math.min(1, Math.abs(probability - 0.5) * 2 + 0.5);

  const rawValues = [rawFeatures.creditScore, rawFeatures.debtToIncome, rawFeatures.annualIncome, rawFeatures.loanAmount, rawFeatures.yearsAtJob];

  const featureContributions = FEATURE_NAMES.map((name, i) => ({
    feature: name,
    impact: featureAccum[i] > 0.01 ? 'Negative' : featureAccum[i] < -0.01 ? 'Positive' : 'Neutral',
    value: rawValues[i],
    contribution: Math.round(featureAccum[i] * 10000) / 10000,
  }));

  return {
    probability: Math.round(probability * 10000) / 10000,
    riskLevel,
    confidence: Math.round(confidence * 10000) / 10000,
    featureContributions,
    modelVersion: model.version,
  };
}

// ===== Evaluation =====
function evaluateModel(
  model: { initialPrediction: number; trees: DecisionStump[]; params: GBModelParams },
  X_test: number[][],
  y_test: number[]
): ModelMetrics {
  const predictions = X_test.map(x => {
    let logOdds = model.initialPrediction;
    for (const tree of model.trees) {
      const pred = x[tree.featureIndex] <= tree.threshold ? tree.leftValue : tree.rightValue;
      logOdds += model.params.learningRate * pred;
    }
    return sigmoid(logOdds);
  });

  const threshold = 0.5;
  let tp = 0, fp = 0, tn = 0, fn = 0;

  for (let i = 0; i < y_test.length; i++) {
    const predicted = predictions[i] >= threshold ? 1 : 0;
    if (y_test[i] === 1 && predicted === 1) tp++;
    else if (y_test[i] === 0 && predicted === 1) fp++;
    else if (y_test[i] === 0 && predicted === 0) tn++;
    else fn++;
  }

  const accuracy = (tp + tn) / (tp + fp + tn + fn);
  const precision = tp / (tp + fp || 1);
  const recall = tp / (tp + fn || 1);
  const f1Score = 2 * (precision * recall) / (precision + recall || 1);

  // AUC-ROC approximation using trapezoidal rule
  const aucRoc = computeAUC(predictions, y_test);

  return {
    accuracy: Math.round(accuracy * 10000) / 10000,
    precision: Math.round(precision * 10000) / 10000,
    recall: Math.round(recall * 10000) / 10000,
    f1Score: Math.round(f1Score * 10000) / 10000,
    aucRoc: Math.round(aucRoc * 10000) / 10000,
    totalSamples: y_test.length,
    trainingTimeMs: 0,
    confusionMatrix: { tp, fp, tn, fn },
  };
}

function computeAUC(predictions: number[], labels: number[]): number {
  const pairs = predictions.map((p, i) => ({ score: p, label: labels[i] }));
  pairs.sort((a, b) => b.score - a.score);

  let tpCount = 0;
  let fpCount = 0;
  const totalPos = labels.filter(l => l === 1).length;
  const totalNeg = labels.length - totalPos;

  if (totalPos === 0 || totalNeg === 0) return 0.5;

  const points: { fpr: number; tpr: number }[] = [{ fpr: 0, tpr: 0 }];

  for (const pair of pairs) {
    if (pair.label === 1) tpCount++;
    else fpCount++;
    points.push({ fpr: fpCount / totalNeg, tpr: tpCount / totalPos });
  }

  // Trapezoidal integration
  let auc = 0;
  for (let i = 1; i < points.length; i++) {
    auc += (points[i].fpr - points[i - 1].fpr) * (points[i].tpr + points[i - 1].tpr) / 2;
  }

  return auc;
}

// ===== Cached Model Singleton =====
let cachedModel: TrainedModel | null = null;
let metricsLogged = false;

export function getOrTrainModel(): TrainedModel {
  if (!cachedModel) {
    cachedModel = trainModel();
    // Log training metrics to DB asynchronously (fire-and-forget)
    if (!metricsLogged) {
      metricsLogged = true;
      logModelMetricsToDB(cachedModel).catch((err) =>
        console.error('Failed to log model metrics:', err)
      );
    }
  }
  return cachedModel;
}

async function logModelMetricsToDB(model: TrainedModel): Promise<void> {
  try {
    const { prisma } = await import('@/lib/prisma');
    await prisma.modelPerformanceLog.create({
      data: {
        modelVersion: model.version,
        accuracy: model.trainingMetrics.accuracy,
        precisionVal: model.trainingMetrics.precision,
        recallVal: model.trainingMetrics.recall,
        f1Score: model.trainingMetrics.f1Score,
        aucRoc: model.trainingMetrics.aucRoc,
        totalSamples: model.trainingMetrics.totalSamples,
        trainingTimeMs: model.trainingMetrics.trainingTimeMs,
        featureImportance: JSON.stringify(
          FEATURE_NAMES.map((name, i) => ({ feature: name, importance: model.featureImportance[i] }))
        ),
        metadata: JSON.stringify({
          params: model.params,
          confusionMatrix: model.trainingMetrics.confusionMatrix,
          trainedAt: model.trainedAt,
        }),
      },
    });
  } catch (err) {
    console.error('ModelPerformanceLog write error:', err);
  }
}

export function getModelMetrics(): ModelMetrics | null {
  return cachedModel?.trainingMetrics ?? null;
}

export function getFeatureImportance(): { feature: string; importance: number }[] {
  const model = getOrTrainModel();
  return FEATURE_NAMES.map((name, i) => ({
    feature: name,
    importance: model.featureImportance[i],
  }));
}
