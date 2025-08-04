'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, User, Edit3, Camera, X } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileUploadProps {
  onProfileUpdate: (profile: { pfp: string; bio: string }) => void;
  currentPfp?: string;
  currentBio?: string;
}

export default function ProfileUpload({ onProfileUpdate, currentPfp, currentBio }: ProfileUploadProps) {
  const [pfp, setPfp] = useState(currentPfp || '');
  const [bio, setBio] = useState(currentBio || '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePfpUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      // For demo purposes, we'll use a placeholder URL
      // In production, you'd upload to a service like Cloudinary
      const demoUrl = `https://via.placeholder.com/400x400/8B5CF6/FFFFFF?text=${encodeURIComponent(file.name)}`;
      
      setPfp(demoUrl);
      toast.success('Profile picture uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (!pfp.trim() && !bio.trim()) {
      toast.error('Please add a profile picture or bio');
      return;
    }

    onProfileUpdate({ pfp, bio });
    toast.success('Profile updated successfully!');
  };

  const handleRemovePfp = () => {
    setPfp('');
    toast.success('Profile picture removed');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="bg-white/10 backdrop-blur-sm border-purple-200/20 shadow-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Update Your Profile</CardTitle>
          <p className="text-purple-200">Customize your Farcaster profile</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Profile Picture Upload */}
          <div className="space-y-4">
            <Label className="text-white font-semibold">Profile Picture</Label>
            
            <div className="flex items-center space-x-4">
              {pfp ? (
                <div className="relative">
                  <img 
                    src={pfp} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-full border-2 border-purple-300 object-cover"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                    onClick={handleRemovePfp}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-purple-300 flex items-center justify-center bg-purple-50/10">
                  <Camera className="w-8 h-8 text-purple-300" />
                </div>
              )}
              
              <div className="flex-1">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {isUploading ? 'Uploading...' : 'Upload Picture'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePfpUpload}
                  className="hidden"
                  id="profile-picture-upload"
                  name="profile-picture-upload"
                />
              </div>
            </div>
          </div>

          {/* Bio Input */}
          <div className="space-y-4">
            <Label className="text-white font-semibold">Bio</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="bg-white/10 border-purple-200/20 text-white placeholder:text-purple-300 resize-none"
              rows={4}
              id="profile-bio"
              name="profile-bio"
            />
            <p className="text-xs text-purple-300">
              {bio.length}/280 characters
            </p>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12 text-lg font-semibold"
          >
            <Edit3 className="w-5 h-5 mr-2" />
            Save Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 