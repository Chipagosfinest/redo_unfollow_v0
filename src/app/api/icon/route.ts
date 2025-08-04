import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const iconPath = join(process.cwd(), 'public', 'icon.svg');
    const iconContent = readFileSync(iconPath, 'utf-8');
    
    return new NextResponse(iconContent, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('Error serving icon:', error);
    return new NextResponse('Icon not found', { status: 404 });
  }
} 