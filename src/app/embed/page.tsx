"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket, Sparkles, Crown, Users, TrendingUp } from "lucide-react";

export default function EmbedPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    inactiveFound: 0,
    notFollowingBack: 0,
    spamAccounts: 0,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-md mx-auto">
        {/* App Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Rocket className="w-5 h-5 text-purple-600" />
            <h1 className="text-xl font-bold text-gray-900">Unfollow App</h1>
          </div>
          <p className="text-sm text-gray-600">by alec.eth ✓</p>
        </div>

        {/* Hero Section */}
        <Card className="bg-white shadow-lg mb-6">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Sweep Who Doesn't Follow You Back
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Automatically find and unfollow inactive accounts, spam, and users who don't follow back
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.inactiveFound}</div>
                <div className="text-xs text-gray-600">Inactive Found</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.notFollowingBack}</div>
                <div className="text-xs text-gray-600">Not Following Back</div>
              </div>
            </div>

            <Button 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => window.open('https://redounfollowv0.vercel.app', '_blank')}
            >
              Try Unfollow App 🚀
            </Button>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="space-y-4 mb-6">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Smart Analysis</h3>
                  <p className="text-sm text-gray-600">Find accounts inactive for 60+ days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Mutual Follow Check</h3>
                  <p className="text-sm text-gray-600">Identify who doesn't follow you back</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Batch Unfollow</h3>
                  <p className="text-sm text-gray-600">Unfollow multiple users at once</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Social Proof */}
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-2">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-900">Trusted by Farcaster Community</span>
              </div>
              <p className="text-xs text-gray-600">
                Join thousands of users who've cleaned up their following lists
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center mt-6">
          <Button 
            className="bg-black hover:bg-gray-800 text-white px-8"
            onClick={() => window.open('https://redounfollowv0.vercel.app', '_blank')}
          >
            Start Cleaning Now 🧹
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Free • No registration required
          </p>
        </div>
      </div>
    </div>
  );
} 