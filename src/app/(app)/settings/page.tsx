'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button, Input, Card } from '@/components/ui';
import { useUIStore } from '@/store';
import { api } from '@/lib/api-client';

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { addToast } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      setProfile({
        name: session?.user?.name || '',
        email: session?.user?.email || '',
      });
    }
  }, [status, session]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.user.updateProfile(profile);

      if (response.error) {
        addToast({ type: 'error', message: response.error });
      } else {
        addToast({ type: 'success', message: 'Profile updated successfully' });
      }
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Profile Settings</h2>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <Input
              label="Name"
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Your name"
            />

            <Input
              label="Email"
              type="email"
              value={profile.email}
              disabled
              helperText="Email cannot be changed"
            />

            <div className="flex gap-3">
              <Button type="submit" isLoading={isLoading}>
                Save Changes
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
                Cancel
              </Button>
            </div>
          </form>

          <hr className="my-8 border-gray-200 dark:border-gray-700" />

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Danger Zone
            </h3>
            <Button variant="danger" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
