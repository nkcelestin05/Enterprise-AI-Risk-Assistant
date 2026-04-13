export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch all needed data in parallel
    const [
      latencyMetrics,
      modelLogs,
      predictionMetrics,
      recentQueries,
      totalQueries,
      errorQueries,
      queriesLast24h,
    ] = await Promise.all([
      prisma.systemMetric.findMany({
        where: { metricName: 'query_latency', createdAt: { gte: last7d } },
        orderBy: { createdAt: 'asc' },
        select: { metricValue: true, metadata: true, createdAt: true },
      }),
      prisma.modelPerformanceLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.systemMetric.findMany({
        where: { metricName: 'ml_prediction', createdAt: { gte: last7d } },
        orderBy: { createdAt: 'asc' },
        select: { metricValue: true, metadata: true, createdAt: true },
      }),
      prisma.query.findMany({
        where: { createdAt: { gte: last7d } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true, latencyMs: true, status: true, routeType: true },
      }),
      prisma.query.count(),
      prisma.query.count({ where: { status: 'error' } }),
      prisma.query.count({ where: { createdAt: { gte: last24h } } }),
    ]);

    // === 1. Latency Percentiles ===
    const latencyValues = latencyMetrics
      .map((m: any) => m?.metricValue ?? 0)
      .filter((v: number) => v > 0)
      .sort((a: number, b: number) => a - b);

    const latencyPercentiles = {
      p50: Math.round(percentile(latencyValues, 50)),
      p95: Math.round(percentile(latencyValues, 95)),
      p99: Math.round(percentile(latencyValues, 99)),
      avg: latencyValues.length > 0 ? Math.round(latencyValues.reduce((a: number, b: number) => a + b, 0) / latencyValues.length) : 0,
      min: latencyValues.length > 0 ? Math.round(latencyValues[0]) : 0,
      max: latencyValues.length > 0 ? Math.round(latencyValues[latencyValues.length - 1]) : 0,
      count: latencyValues.length,
    };

    // Latency trend over time (bucketed by hour)
    const latencyTrend: { time: string; p50: number; p95: number; p99: number }[] = [];
    const latencyBuckets = new Map<string, number[]>();
    for (const m of latencyMetrics) {
      const hour = new Date(m.createdAt).toISOString().slice(0, 13) + ':00';
      if (!latencyBuckets.has(hour)) latencyBuckets.set(hour, []);
      latencyBuckets.get(hour)!.push(m.metricValue);
    }
    for (const [time, vals] of latencyBuckets) {
      const sorted = vals.sort((a, b) => a - b);
      latencyTrend.push({
        time,
        p50: Math.round(percentile(sorted, 50)),
        p95: Math.round(percentile(sorted, 95)),
        p99: Math.round(percentile(sorted, 99)),
      });
    }

    // === 2. Model Performance ===
    const latestModel = modelLogs[0] ?? null;
    const modelPerformance = latestModel ? {
      version: latestModel.modelVersion,
      accuracy: latestModel.accuracy,
      precision: latestModel.precisionVal,
      recall: latestModel.recallVal,
      f1Score: latestModel.f1Score,
      aucRoc: latestModel.aucRoc,
      totalSamples: latestModel.totalSamples,
      trainingTimeMs: latestModel.trainingTimeMs,
      featureImportance: safeParseJSON(latestModel.featureImportance),
      confusionMatrix: safeParseJSON(latestModel.metadata)?.confusionMatrix ?? null,
      trainedAt: latestModel.createdAt,
    } : null;

    const modelHistory = modelLogs.map((m: any) => ({
      version: m.modelVersion,
      accuracy: m.accuracy,
      f1Score: m.f1Score,
      aucRoc: m.aucRoc,
      createdAt: m.createdAt,
    }));

    // === 3. Throughput ===
    const throughputByHour: { time: string; count: number }[] = [];
    const qBuckets = new Map<string, number>();
    for (const q of recentQueries) {
      const hour = new Date(q.createdAt).toISOString().slice(0, 13) + ':00';
      qBuckets.set(hour, (qBuckets.get(hour) ?? 0) + 1);
    }
    for (const [time, count] of qBuckets) {
      throughputByHour.push({ time, count });
    }

    const throughput = {
      totalAllTime: totalQueries,
      last24h: queriesLast24h,
      avgPerHour: throughputByHour.length > 0
        ? Math.round((throughputByHour.reduce((a, b) => a + b.count, 0) / throughputByHour.length) * 100) / 100
        : 0,
      trend: throughputByHour,
    };

    // === 4. Prediction Distribution & Feature Drift ===
    const predValues = predictionMetrics.map((m: any) => m.metricValue);
    const predMeta = predictionMetrics.map((m: any) => safeParseJSON(m.metadata));

    const riskLevelCounts = { High: 0, Medium: 0, Low: 0 };
    const confidenceValues: number[] = [];
    const featureMeans: Record<string, number[]> = {
      creditScore: [], dti: [], income: [], loan: [], years: [],
    };

    for (const meta of predMeta) {
      if (!meta) continue;
      const rl = meta.riskLevel as keyof typeof riskLevelCounts;
      if (rl && riskLevelCounts[rl] !== undefined) riskLevelCounts[rl]++;
      if (typeof meta.confidence === 'number') confidenceValues.push(meta.confidence);
      if (meta.features) {
        for (const key of Object.keys(featureMeans)) {
          if (typeof meta.features[key] === 'number') {
            featureMeans[key].push(meta.features[key]);
          }
        }
      }
    }

    // Simple drift detection: compare first half vs second half means
    const featureDrift: { feature: string; driftScore: number; status: string; meanBefore: number; meanAfter: number }[] = [];
    for (const [key, vals] of Object.entries(featureMeans)) {
      if (vals.length < 4) {
        featureDrift.push({ feature: key, driftScore: 0, status: 'insufficient_data', meanBefore: 0, meanAfter: 0 });
        continue;
      }
      const mid = Math.floor(vals.length / 2);
      const firstHalf = vals.slice(0, mid);
      const secondHalf = vals.slice(mid);
      const mean1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const mean2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const denom = Math.abs(mean1) || 1;
      const driftScore = Math.round((Math.abs(mean2 - mean1) / denom) * 10000) / 10000;
      const status = driftScore > 0.2 ? 'drift_detected' : driftScore > 0.1 ? 'warning' : 'stable';
      featureDrift.push({ feature: key, driftScore, status, meanBefore: Math.round(mean1 * 100) / 100, meanAfter: Math.round(mean2 * 100) / 100 });
    }

    const predictionDistribution = {
      riskLevelCounts,
      totalPredictions: predValues.length,
      avgProbability: predValues.length > 0
        ? Math.round((predValues.reduce((a: number, b: number) => a + b, 0) / predValues.length) * 10000) / 10000
        : 0,
      avgConfidence: confidenceValues.length > 0
        ? Math.round((confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length) * 10000) / 10000
        : 0,
    };

    // === 5. Error Rate ===
    const totalErrors = errorQueries;
    const errorRate = totalQueries > 0 ? Math.round((totalErrors / totalQueries) * 10000) / 10000 : 0;

    return NextResponse.json({
      latencyPercentiles,
      latencyTrend,
      modelPerformance,
      modelHistory,
      throughput,
      predictionDistribution,
      featureDrift,
      errorRate: { totalErrors, totalQueries, rate: errorRate },
    });
  } catch (err: any) {
    console.error('Monitoring API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function safeParseJSON(str: string | null | undefined): any {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}
