"use client"

import Navigation from "@/components/Navigation"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <Navigation currentPath="/home" />
    </div>
  )
} 