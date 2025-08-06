import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { 
      userId, 
      analysisConfig, 
      paymentMethod = 'farcaster',
      amount = 5.00,
      currency = 'USD',
      recipientFid = 4044 // Your FID for receiving payments
    } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID (FID) is required' },
        { status: 400 }
      )
    }

    console.log(`💰 Creating payment for user ${userId}`)
    console.log(`📊 Analysis config:`, analysisConfig)
    console.log(`💳 Payment method: ${paymentMethod}`)

    // Create payment record
    const payment = await db.createPayment({
      userId,
      amount,
      currency,
      status: 'pending',
      paymentMethod,
      analysisJobId: '' // Will be updated after job creation
    })

    // Create analysis job
    const analysisJob = await db.createAnalysisJob({
      userId,
      status: 'pending',
      paymentId: payment.id,
      paymentAmount: amount,
      paymentCurrency: currency,
      analysisConfig: {
        filters: analysisConfig.filters || {
          nonMutual: true,
          noInteractionWithYou: true,
          youNoInteraction: true,
          nuclear: false
        },
        limit: analysisConfig.limit || 1000,
        threshold: analysisConfig.threshold || 60
      }
    })

    // Update payment with job ID
    await db.updatePayment(payment.id, { analysisJobId: analysisJob.id })

    console.log(`✅ Created payment ${payment.id} and analysis job ${analysisJob.id}`)

    // Return payment details for frontend to handle
    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        status: 'pending',
        amount,
        currency,
        recipientFid
      },
      analysisJob: {
        id: analysisJob.id,
        status: 'pending'
      },
      paymentDetails: {
        token: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
        amount: '5000000', // 5 USDC in wei (6 decimals)
        recipientFid
      }
    })

  } catch (error) {
    console.error('❌ Payment creation failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create payment',
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
        filters: job.config.filters,
        limit: job.config.limit || 1000,
        threshold: job.config.threshold || 30
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