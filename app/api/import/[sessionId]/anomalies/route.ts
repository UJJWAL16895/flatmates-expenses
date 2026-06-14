import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAnomaliesBySession } from '@/lib/db/import';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;
    const anomalies = await getAnomaliesBySession(sessionId);

    // Group by type for easier UI display
    const grouped: Record<string, typeof anomalies> = {};
    for (const a of anomalies) {
      if (!grouped[a.anomaly_type]) {
        grouped[a.anomaly_type] = [];
      }
      grouped[a.anomaly_type].push(a);
    }

    return NextResponse.json({
      success: true,
      data: {
        anomalies,
        grouped,
        total: anomalies.length,
        pending: anomalies.filter((a) => a.resolution === 'pending').length,
        resolved: anomalies.filter((a) => a.resolution !== 'pending').length,
      },
    });
  } catch (error) {
    console.error('GET /api/import/[sessionId]/anomalies error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
