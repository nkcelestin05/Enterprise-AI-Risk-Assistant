export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;
    const queries = await prisma.query.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { riskAssessment: true, ragResult: true },
    });
    return NextResponse.json({
      queries: (queries ?? []).map((q: any) => ({
        id: q?.id,
        queryText: q?.queryText ?? '',
        routeType: q?.routeType ?? 'unknown',
        status: q?.status ?? 'unknown',
        latencyMs: q?.latencyMs ?? 0,
        createdAt: q?.createdAt,
        riskAssessment: q?.riskAssessment ? {
          riskProbability: q.riskAssessment?.riskProbability ?? 0,
          riskLevel: q.riskAssessment?.riskLevel ?? 'N/A',
          recommendation: q.riskAssessment?.recommendation ?? '',
        } : null,
        ragResult: q?.ragResult ? {
          retrievedChunks: q.ragResult?.retrievedChunks ?? '[]',
          answer: (q.ragResult?.answer ?? '').substring(0, 200),
        } : null,
      })),
    });
  } catch (err: any) {
    console.error('History error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
