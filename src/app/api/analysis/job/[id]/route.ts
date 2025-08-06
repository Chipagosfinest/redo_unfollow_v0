import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Fetching analysis job: ${id}`)

    const job = await db.getAnalysisJob(id)
    if (!job) {
      return NextResponse.json(
        { error: 'Analysis job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        paymentAmount: job.paymentAmount,
        paymentCurrency: job.paymentCurrency,
        analysisConfig: job.analysisConfig,
        results: job.results,
        error: job.error
      }
    })

  } catch (error) {
    console.error('❌ Failed to fetch analysis job:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch analysis job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 