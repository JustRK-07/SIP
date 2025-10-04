"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AiOutlineLoading3Quarters, AiOutlineUser, AiOutlineMail, AiOutlineLock } from "react-icons/ai";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const GOBI_API_URL = process.env.NEXT_PUBLIC_GOBI_MAIN_API_URL || 'http://localhost:3000';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  lastLoginAt: string;
  tenant?: {
    id: string;
    name: string;
    domain: string;
  };
}

export default function Profile() {
  const router = useRouter();
  const { accessToken, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${GOBI_API_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.data);
        setProfileForm({
          firstName: data.data.firstName || "",
          lastName: data.data.lastName || "",
          username: data.data.username || "",
        });
      } else {
        toast.error("Failed to load profile");
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`${GOBI_API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileForm),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Profile updated successfully");
        fetchProfile(); // Refresh profile
      } else {
        const data = await response.json();
        toast.error(data.error?.message || "Failed to update profile");
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);

    // Validation
    if (passwordForm.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      setIsChangingPassword(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      setIsChangingPassword(false);
      return;
    }

    try {
      const response = await fetch(`${GOBI_API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (response.ok) {
        toast.success("Password changed successfully. Please login again.");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setTimeout(() => {
          logout();
          router.push("/auth");
        }, 2000);
      } else {
        const data = await response.json();
        toast.error(data.error?.message || "Failed to change password");
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error("Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AiOutlineLoading3Quarters className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Profile - Ytel</title>
        <meta name="description" content="User Profile" />
      </Head>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Profile Settings</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Manage your account settings and preferences
            </p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="info">Account Info</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={profileForm.firstName}
                          onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                          className="bg-slate-50 dark:bg-slate-900"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={profileForm.lastName}
                          onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                          className="bg-slate-50 dark:bg-slate-900"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <AiOutlineUser className="h-5 w-5 text-slate-400" />
                        </div>
                        <Input
                          id="username"
                          value={profileForm.username}
                          onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                          className="pl-10 bg-slate-50 dark:bg-slate-900"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <AiOutlineMail className="h-5 w-5 text-slate-400" />
                        </div>
                        <Input
                          id="email"
                          value={profile?.email || ""}
                          disabled
                          className="pl-10 bg-slate-100 dark:bg-slate-800 cursor-not-allowed"
                        />
                      </div>
                      <p className="text-xs text-slate-500">Email cannot be changed</p>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        type="submit"
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isSaving ? (
                          <AiOutlineLoading3Quarters className="h-5 w-5 animate-spin" />
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="password">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <AiOutlineLock className="h-5 w-5 text-slate-400" />
                        </div>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          className="pl-10 bg-slate-50 dark:bg-slate-900"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <AiOutlineLock className="h-5 w-5 text-slate-400" />
                        </div>
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          className="pl-10 bg-slate-50 dark:bg-slate-900"
                          placeholder="Minimum 8 characters"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <AiOutlineLock className="h-5 w-5 text-slate-400" />
                        </div>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          className="pl-10 bg-slate-50 dark:bg-slate-900"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        type="submit"
                        disabled={isChangingPassword}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isChangingPassword ? (
                          <AiOutlineLoading3Quarters className="h-5 w-5 animate-spin" />
                        ) : (
                          "Change Password"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="info">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    View your account details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-500">User ID</Label>
                      <p className="text-sm font-mono mt-1">{profile?.id}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Email</Label>
                      <p className="text-sm mt-1">{profile?.email}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Account Created</Label>
                      <p className="text-sm mt-1">
                        {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Last Login</Label>
                      <p className="text-sm mt-1">
                        {profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {profile?.tenant && (
                    <div className="pt-4 border-t">
                      <Label className="text-slate-500">Organization</Label>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-medium">{profile.tenant.name}</p>
                        <p className="text-sm text-slate-500">{profile.tenant.domain}</p>
                        <p className="text-xs font-mono text-slate-400">ID: {profile.tenant.id}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
