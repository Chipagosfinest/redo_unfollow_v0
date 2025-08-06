import { NextResponse } from 'next/server'

// Sample FIDs for testing - these are some well-known Farcaster users
const SAMPLE_FIDS = [
  194,   // dwr
  3,     // vbuterin
  4044,  // alec
  2,     // dhof
  20071, // jessepollak
  9152,  // warpcaster
  1,     // danromero
  4,     // jayendra
  5,     // josh
  6,     // jake
  7,     // jason
  8,     // jay
  9,     // jessica
  10,    // jordan
  11,    // julia
  12,    // justin
  13,    // kate
  14,    // kevin
  15,    // laura
  16,    // lisa
  17,    // mark
  18,    // mary
  19,    // mike
  20,    // nancy
  21,    // nick
  22,    // olivia
  23,    // paul
  24,    // rachel
  25,    // robert
  26,    // sarah
  27,    // scott
  28,    // stephanie
  29,    // steve
  30,    // susan
  31,    // taylor
  32,    // thomas
  33,    // tiffany
  34,    // tim
  35,    // tracy
  36,    // tyler
  37,    // vanessa
  38,    // victor
  39,    // victoria
  40,    // wendy
  41,    // william
  42,    // williams
  43,    // wilson
  44,    // wright
  45,    // young
  46,    // zoe
  47,    // zoe2
  48,    // zoe3
  49,    // zoe4
  50,    // zoe5
]

export async function GET() {
  return NextResponse.json({
    success: true,
    count: SAMPLE_FIDS.length,
    fids: SAMPLE_FIDS,
    description: 'Sample FIDs for testing inactive users detection'
  })
} 