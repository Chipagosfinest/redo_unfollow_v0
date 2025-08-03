"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Activity, TrendingUp, Sparkles } from "lucide-react";

export default function EmbedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-purple-600 mr-3" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Farcaster UnfollowX
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Clean up your Farcaster following list automatically
          </p>
        </div>

        {/* App Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* App Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                App Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold">Name</h3>
                <p className="text-gray-600">Farcaster UnfollowX</p>
              </div>
              <div>
                <h3 className="font-semibold">Description</h3>
                <p className="text-gray-600">Clean up your Farcaster following list by identifying inactive users and mutual follows</p>
              </div>
              <div>
                <h3 className="font-semibold">Category</h3>
                <Badge variant="secondary">Utility</Badge>
              </div>
              <div>
                <h3 className="font-semibold">Tags</h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant="outline">unfollow</Badge>
                  <Badge variant="outline">automation</Badge>
                  <Badge variant="outline">farcaster</Badge>
                  <Badge variant="outline">tool</Badge>
                  <Badge variant="outline">cleanup</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm">Auto-detect inactive users (60+ days)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm">Find non-mutual follows</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm">Batch unfollow with one click</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm">Zero manual input required</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm">Native Farcaster integration</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* URLs */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>App URLs</CardTitle>
            <CardDescription>All the links you need for Farcaster app registration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Main App</h3>
              <p className="text-sm text-gray-600 break-all">
                https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Manifest</h3>
              <p className="text-sm text-gray-600 break-all">
                https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app/farcaster-manifest.json
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Feed Integration</h3>
              <p className="text-sm text-gray-600 break-all">
                https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app/feed
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Tool Integration</h3>
              <p className="text-sm text-gray-600 break-all">
                https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app/tool
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Cast Embed</h3>
              <p className="text-sm text-gray-600 break-all">
                https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app/embed/cast
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Profile Embed</h3>
              <p className="text-sm text-gray-600 break-all">
                https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app/embed/profile
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Assets */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>App Assets</CardTitle>
            <CardDescription>Images and icons for your app</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Icon</h3>
              <p className="text-sm text-gray-600 break-all">
                https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app/icon.svg
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Thumbnail</h3>
              <p className="text-sm text-gray-600 break-all">
                https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app/thumbnail.png
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Splash Screen</h3>
              <p className="text-sm text-gray-600 break-all">
                https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app/splash.png
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button 
            onClick={() => window.open('https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app', '_blank')}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Open App
          </Button>
          <Button 
            onClick={() => window.open('https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app/farcaster-manifest.json', '_blank')}
            variant="outline"
          >
            View Manifest
          </Button>
        </div>
      </div>
    </div>
  );
} 