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
    // Simulate analysis processing (replace with actual analysis logic)
    await new Promise(resolve => setTimeout(resolve, 5000)) // 5 second delay

    // Mock results (replace with actual analysis from your cleanup API)
    const mockResults = {
      totalFollowing: 150,
      totalFollowers: 120,
      usersToUnfollow: 23,
      filterCounts: {
        nonMutual: 15,
        noInteractionWithYou: 8,
        youNoInteraction: 0,
        nuclear: 0
      },
      users: [
        {
          fid: 12345,
          username: 'user1',
          displayName: 'User One',
          pfpUrl: '',
          reasons: ['Non-mutual follow'],
          shouldUnfollow: true
        },
        {
          fid: 67890,
          username: 'user2',
          displayName: 'User Two',
          pfpUrl: '',
          reasons: ['No recent interactions'],
          shouldUnfollow: true
        }
      ]
    }

    // Update job with results
    await db.updateAnalysisJob(jobId, {
      status: 'completed',
      completedAt: new Date(),
      results: mockResults
    })

    // Create notification
    await db.createNotification({
      userId: job.userId,
      type: 'analysis_complete',
      title: '🧹 Your Analysis is Ready!',
      body: `Found ${mockResults.usersToUnfollow} accounts ready for review.`,
      targetUrl: `/analysis-results/${jobId}`,
      read: false
    })

    console.log(`✅ Analysis completed for job ${jobId}`)

  } catch (error) {
    console.error(`❌ Analysis failed for job ${jobId}:`, error)
    await db.updateAnalysisJob(jobId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
} 