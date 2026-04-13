export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [totalQueries, totalUsers, securityEvents, recentQueries, routeDistribution, riskDistribution, avgLatency] =
      await Promise.all([
        prisma.query.count(),
        prisma.user.count(),
        prisma.securityLog.count(),
        prisma.query.findMany({
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { email: true, name: true } }, riskAssessment: true },
        }),
        prisma.query.groupBy({ by: ['routeType'], _count: true }),
        prisma.riskAssessment.groupBy({ by: ['riskLevel'], _count: true }),
        prisma.query.aggregate({ _avg: { latencyMs: true } }),
      ]);

    const securityLogs = await prisma.securityLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      totalQueries,
      totalUsers,
      securityEvents,
      avgLatency: avgLatency?._avg?.latencyMs ?? 0,
      recentQueries: (recentQueries ?? []).map((q: any) => ({
        id: q?.id,
        queryText: q?.queryText?.substring(0, 100) ?? '',
        routeType: q?.routeType ?? 'unknown',
        status: q?.status ?? 'unknown',
        latencyMs: q?.latencyMs ?? 0,
        createdAt: q?.createdAt,
        userName: q?.user?.name ?? q?.user?.email ?? 'Unknown',
        riskLevel: q?.riskAssessment?.riskLevel ?? null,
      })),
      routeDistribution: (routeDistribution ?? []).map((r: any) => ({
        route: r?.routeType ?? 'unknown',
        count: r?._count ?? 0,
      })),
      riskDistribution: (riskDistribution ?? []).map((r: any) => ({
        level: r?.riskLevel ?? 'unknown',
        count: r?._count ?? 0,
      })),
      securityLogs: (securityLogs ?? []).map((l: any) => ({
        id: l?.id,
        eventType: l?.eventType ?? '',
        severity: l?.severity ?? '',
        details: l?.details ?? '',
        createdAt: l?.createdAt,
      })),
    });
  } catch (err: any) {
    console.error('Admin stats error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
