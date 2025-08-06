import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { paymentId, transactionHash } = await request.json()

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    console.log(`💰 Completing payment ${paymentId} with transaction ${transactionHash}`)

    // Update payment status
    const updatedPayment = await db.updatePayment(paymentId, {
      status: 'completed',
      completedAt: new Date()
    })

    if (!updatedPayment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Get the associated analysis job
    const analysisJob = await db.getAnalysisJob(updatedPayment.analysisJobId)
    if (!analysisJob) {
      return NextResponse.json(
        { error: 'Analysis job not found' },
        { status: 404 }
      )
    }

    // Start background analysis
    setTimeout(async () => {
      try {
        await processAnalysisJob(analysisJob.id)
      } catch (error) {
        console.error(`❌ Background analysis failed for job ${analysisJob.id}:`, error)
        await db.updateAnalysisJob(analysisJob.id, { 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }, 1000)

    return NextResponse.json({
      success: true,
      payment: {
        id: updatedPayment.id,
        status: 'completed',
        transactionHash
      },
      analysisJob: {
        id: analysisJob.id,
        status: 'processing'
      }
    })

  } catch (error) {
    console.error('❌ Payment completion failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to complete payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Background analysis processing
async function processAnalysisJob(jobId: string) {
  console.log(`🔄 Starting background analysis for job ${jobId}`)
  
  const job = await db.getAnalysisJob(jobId)
  if (!job) {
    throw new Error('Analysis job not found')
  }

  // Update job status to processing
  await db.updateAnalysisJob(jobId, { status: 'processing' })

  try {
    // Perform actual analysis using the cleanup API
    const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/neynar/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fid: job.userId,
        filters: job.analysisConfig.filters,
        limit: job.analysisConfig.limit || 1000,
        threshold: job.analysisConfig.threshold || 30
      })
    })

    if (!analysisResponse.ok) {
      throw new Error(`Analysis API failed: ${analysisResponse.status}`)
    }

    const analysisData = await analysisResponse.json()
    
    if (!analysisData.success) {
      throw new Error(analysisData.error || 'Analysis failed')
    }

    // Update job with real results
    await db.updateAnalysisJob(jobId, {
      status: 'completed',
      completedAt: new Date(),
      results: analysisData
    })

    // Create notification
    await db.createNotification({
      userId: job.userId,
      type: 'analysis_complete',
      title: '🧹 Your Analysis is Ready!',
      body: `Found ${analysisData.users.length} accounts ready for review.`,
      targetUrl: `/analysis-results/${jobId}`,
      read: false
    })

    console.log(`✅ Analysis completed for job ${jobId}`)

  } catch (error) {
    console.error(`❌ Analysis failed for job ${jobId}:`, error)
    
    // Update job with error
    await db.updateAnalysisJob(jobId, {
      status: 'failed',
      completedAt: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    // Create error notification
    await db.createNotification({
      userId: job.userId,
      type: 'analysis_failed',
      title: '❌ Analysis Failed',
      body: 'Your analysis encountered an error. Please try again.',
      targetUrl: `/paid-analysis`,
      read: false
    })
  }
} 