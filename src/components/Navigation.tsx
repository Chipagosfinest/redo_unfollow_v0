"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Users, 
  UserMinus, 
  BarChart3, 
  Settings, 
  Sparkles,
  Trash2,
  RefreshCw,
  Target,
  Shield
} from "lucide-react"

interface NavigationProps {
  currentPath?: string
}

export default function Navigation({ currentPath = "/" }: NavigationProps) {
  const apps = [
    {
      name: "Farcaster Cleanup",
      description: "Clean up your following list with smart filters",
      path: "/farcaster-cleanup",
      icon: Trash2,
      color: "bg-purple-500",
      isNew: true
    },
    {
      name: "Analytics Dashboard",
      description: "Detailed insights about your Farcaster network",
      path: "/analytics",
      icon: BarChart3,
      color: "bg-indigo-500",
      isNew: true
    },
    {
      name: "Whitelist Manager",
      description: "Protect users from being unfollowed",
      path: "/whitelist",
      icon: Shield,
      color: "bg-emerald-500",
      isNew: true
    },
    {
      name: "Settings",
      description: "Configure your cleanup preferences",
      path: "/settings",
      icon: Settings,
      color: "bg-slate-500"
    },
    {
      name: "Original Unfollow Tool",
      description: "Original unfollow functionality",
      path: "/",
      icon: UserMinus,
      color: "bg-blue-500"
    },
    {
      name: "Simple Unfollow",
      description: "Simple unfollow interface",
      path: "/simple-unfollow",
      icon: Users,
      color: "bg-green-500"
    },
    {
      name: "Aggressive Inactive",
      description: "Aggressive inactive user detection",
      path: "/aggressive-inactive",
      icon: Target,
      color: "bg-red-500"
    },
    {
      name: "Random Inactive",
      description: "Random inactive user selection",
      path: "/random-inactive",
      icon: RefreshCw,
      color: "bg-orange-500"
    },
    {
      name: "Debug Inactive",
      description: "Debug inactive relationships",
      path: "/debug-inactive",
      icon: Settings,
      color: "bg-gray-500"
    }
  ]

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🧹 Farcaster Tools
        </h1>
        <p className="text-gray-600">
          Choose your Farcaster management tool
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps.map((app) => {
          const IconComponent = app.icon
          const isActive = currentPath === app.path
          
          return (
            <Link key={app.path} href={app.path}>
              <Card className={`h-full transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer ${
                isActive ? 'ring-2 ring-blue-500' : ''
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${app.color} text-white`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{app.name}</h3>
                        {app.isNew && (
                          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm">{app.description}</p>
                      {isActive && (
                        <div className="mt-3 text-blue-600 text-sm font-medium">
                          ← Currently active
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="mt-12 text-center">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <h3 className="text-lg font-semibold">Try the New Farcaster Cleanup Mini App!</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Our newest tool provides a comprehensive cleanup experience with smart filters, 
              mutual follow detection, and bulk unfollow capabilities.
            </p>
            <Link href="/farcaster-cleanup">
              <Button className="w-full">
                <Trash2 className="mr-2 h-4 w-4" />
                Launch Farcaster Cleanup
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 