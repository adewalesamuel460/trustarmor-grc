'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { User, Shield, Key, CheckCircle2, XCircle, Calendar, Building2, AlertCircle, Eye, EyeOff, Loader2, Lock } from 'lucide-react';

interface ProfileData {
  id: string;
  email: string;
  mfa_enabled: boolean;
  created_at: string;
  is_admin: boolean;
  admin_role: string | null;
  workspaces: Array<{ id: string; name: string; organization_id: string }>;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/users/me');
        setProfile(data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }

    setPwLoading(true);
    try {
      await api.put('/users/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPwSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const roleColors: Record<string, string> = {
    super_admin: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    support: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    content_manager: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="text-gray-400 mt-1 text-sm">Manage your account details and security settings.</p>
      </div>

      {/* Account Info Card */}
      <div className="bg-gray-900/60 border border-white/8 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <User className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-white">Account Information</h2>
        </div>

        <div className="p-6 space-y-5">
          {/* Avatar + Email */}
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-2xl font-bold text-indigo-300 flex-shrink-0">
              {profile?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="space-y-1">
              <p className="text-white font-semibold text-lg">{profile?.email}</p>
              {profile?.is_admin && (
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${roleColors[profile.admin_role || ''] || roleColors.support}`}>
                  <Shield className="w-3 h-3" />
                  Platform Admin — {profile.admin_role?.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* MFA Status */}
            <div className="bg-black/20 rounded-xl border border-white/5 p-4 space-y-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">MFA Status</p>
              <div className="flex items-center gap-2">
                {profile?.mfa_enabled ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">Enabled</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-400">Disabled</span>
                  </>
                )}
              </div>
            </div>

            {/* Member Since */}
            <div className="bg-black/20 rounded-xl border border-white/5 p-4 space-y-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Member Since</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-gray-200">
                  {profile?.created_at ? formatDate(profile.created_at) : '—'}
                </span>
              </div>
            </div>

            {/* Workspaces */}
            <div className="bg-black/20 rounded-xl border border-white/5 p-4 space-y-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Workspaces</p>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-semibold text-gray-200">{profile?.workspaces?.length ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Workspace List */}
          {profile?.workspaces && profile.workspaces.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Your Workspaces</p>
              <div className="space-y-1.5">
                {profile.workspaces.map((ws) => (
                  <div key={ws.id} className="flex items-center gap-3 bg-black/20 border border-white/5 rounded-xl px-4 py-3">
                    <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-300 font-medium">{ws.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-gray-900/60 border border-white/8 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Change Password</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Must be at least 8 characters.</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="p-6 space-y-5">
          {/* Current Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 bg-black/30 border border-white/8 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
              >
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Min 8 characters"
                className="w-full pl-10 pr-10 py-3 bg-black/30 border border-white/8 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition"
              />
              <button
                type="button"
                onClick={() => setShowNewPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
              >
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repeat new password"
                className={`w-full pl-10 pr-4 py-3 bg-black/30 border rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition ${
                  confirmPassword && newPassword !== confirmPassword
                    ? 'border-red-500/50 focus:ring-red-500/20 focus:border-red-500/50'
                    : 'border-white/8 focus:border-indigo-500/50 focus:ring-indigo-500/20'
                }`}
              />
            </div>
          </div>

          {/* Feedback */}
          {pwError && (
            <div className="flex items-center gap-2.5 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="flex items-center gap-2.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {pwSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={pwLoading}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition"
          >
            {pwLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Key className="w-4 h-4" />
                Update Password
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
