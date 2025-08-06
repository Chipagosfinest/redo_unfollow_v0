import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { fid: string } }
) {
  try {
    const { fid } = params
    const userId = parseInt(fid)

    if (!userId || isNaN(userId)) {
      return NextResponse.json(
        { error: 'Valid FID is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Fetching analysis jobs for user: ${userId}`)

    const jobs = await db.getAnalysisJobsByUser(userId)

    return NextResponse.json({
      success: true,
      jobs: jobs.map(job => ({
        id: job.id,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        paymentAmount: job.paymentAmount,
        paymentCurrency: job.paymentCurrency,
        analysisConfig: job.analysisConfig,
        results: job.results,
        error: job.error
      }))
    })

  } catch (error) {
    console.error('❌ Failed to fetch analysis jobs:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch analysis jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 