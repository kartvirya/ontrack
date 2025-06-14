import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationSystem';

const UserProfile = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { getAuthHeaders, API_URL, user, logout, isAuthenticated } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/auth');
      return;
    }
  }, [isAuthenticated, navigate]);

  const fetchUserData = useCallback(async () => {
    if (!isAuthenticated()) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Fetch profile data
      const profileRes = await fetch(`${API_URL}/api/user/profile`, { 
        headers: getAuthHeaders() 
      });
      
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        // Extract the profile from the nested structure
        setProfile(profileData.user?.profile || {});
      } else {
        console.warn('Profile fetch failed:', profileRes.status);
        setProfile({});
      }

      // Fetch settings (optional)
      try {
        const settingsRes = await fetch(`${API_URL}/api/user/settings`, { 
          headers: getAuthHeaders() 
        });
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings(settingsData.settings || {});
        } else {
          setSettings({});
        }
      } catch (err) {
        console.warn('Settings fetch failed:', err);
        setSettings({});
      }

      // Fetch notifications (optional)
      try {
        const notificationsRes = await fetch(`${API_URL}/api/user/notifications?limit=20`, { 
          headers: getAuthHeaders() 
        });
        if (notificationsRes.ok) {
          const notificationsData = await notificationsRes.json();
          setNotifications(notificationsData.notifications || []);
        } else {
          setNotifications([]);
        }
      } catch (err) {
        console.warn('Notifications fetch failed:', err);
        setNotifications([]);
      }

      // Fetch stats (optional)
      try {
        const statsRes = await fetch(`${API_URL}/api/user/account/stats`, { 
          headers: getAuthHeaders() 
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats || {});
        } else {
          setStats({});
        }
      } catch (err) {
        console.warn('Stats fetch failed:', err);
        setStats({});
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load profile data. Please try refreshing the page.');
      addNotification({
        type: 'error',
        title: 'Profile Load Error',
        message: 'Failed to load your profile data.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  }, [API_URL, getAuthHeaders, isAuthenticated, addNotification]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleBackToChat = () => {
    navigate('/');
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  if (!isAuthenticated()) {
    return null; // Will redirect in useEffect
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Profile</h3>
            <p className="text-gray-600">Please wait while we fetch your data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-6">
              <button
                onClick={handleBackToChat}
                className="flex items-center gap-3 text-blue-600 hover:text-blue-700 transition-all duration-200 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl border border-blue-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Chat
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    My Profile
                  </h1>
                  <p className="text-sm text-gray-600">Manage your account and preferences</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-800">
                  {user?.username || 'User'}
                </div>
                <div className="text-xs text-gray-500">Account Settings</div>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium border border-red-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {(error || success) && (
          <div className="mb-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl mb-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
                <button onClick={clearMessages} className="text-red-500 hover:text-red-700 p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl mb-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{success}</span>
                </div>
                <button onClick={clearMessages} className="text-green-500 hover:text-green-700 p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stats Overview */}
        {stats && Object.keys(stats).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.conversations || 0}</div>
                  <div className="text-sm text-gray-600">Conversations</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.messages || 0}</div>
                  <div className="text-sm text-gray-600">Messages</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{stats.recent_activities || 0}</div>
                  <div className="text-sm text-gray-600">Activities</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{stats.account_age_days || 0}</div>
                  <div className="text-sm text-gray-600">Days Active</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              {[
                { id: 'profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
                { id: 'notifications', label: `Notifications${notifications.filter(n => !n.read_status).length > 0 ? ` (${notifications.filter(n => !n.read_status).length})` : ''}`, icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
                { id: 'security', label: 'Security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
                { id: 'account', label: 'Account', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-6 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    activeTab === tab.id 
                      ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/50' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'profile' && (
              <ProfileTab 
                profile={profile}
                setProfile={setProfile}
                setSuccess={setSuccess}
                setError={setError}
                getAuthHeaders={getAuthHeaders}
                API_URL={API_URL}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsTab 
                settings={settings}
                setSettings={setSettings}
                setSuccess={setSuccess}
                setError={setError}
                getAuthHeaders={getAuthHeaders}
                API_URL={API_URL}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsTab 
                notifications={notifications}
                setNotifications={setNotifications}
                setSuccess={setSuccess}
                setError={setError}
                getAuthHeaders={getAuthHeaders}
                API_URL={API_URL}
              />
            )}

            {activeTab === 'security' && (
              <SecurityTab 
                setSuccess={setSuccess}
                setError={setError}
                getAuthHeaders={getAuthHeaders}
                API_URL={API_URL}
              />
            )}

            {activeTab === 'account' && (
              <AccountTab 
                stats={stats}
                setSuccess={setSuccess}
                setError={setError}
                getAuthHeaders={getAuthHeaders}
                API_URL={API_URL}
                showDeleteConfirm={showDeleteConfirm}
                setShowDeleteConfirm={setShowDeleteConfirm}
                logout={logout}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Profile Tab Component
const ProfileTab = ({ profile, setProfile, setSuccess, setError, getAuthHeaders, API_URL }) => {
  const [formData, setFormData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    phone: profile?.phone || '',
    department: profile?.department || '',
    jobTitle: profile?.jobTitle || '',
    bio: profile?.bio || '',
    timezone: profile?.timezone || 'UTC',
    language: profile?.language || 'en',
    dateFormat: profile?.dateFormat || 'MM/DD/YYYY'
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        department: profile.department || '',
        jobTitle: profile.jobTitle || '',
        bio: profile.bio || '',
        timezone: profile.timezone || 'UTC',
        language: profile.language || 'en',
        dateFormat: profile.dateFormat || 'MM/DD/YYYY'
      });
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess('Profile updated successfully! 🎉');
        setProfile({ ...profile, ...formData });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      setError('Failed to update profile. Please check your connection.');
      console.error('Profile update error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    setUploading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch(`${API_URL}/api/user/profile/avatar`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess('Avatar uploaded successfully! 📸');
        setProfile({ ...profile, avatarUrl: data.avatar_url });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to upload avatar');
      }
    } catch (error) {
      setError('Failed to upload avatar. Please try again.');
      console.error('Avatar upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Profile Information</h3>
        <p className="text-gray-600">Update your personal information and preferences.</p>
      </div>
      
      {/* Avatar Section */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h4>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
              {profile?.avatarUrl ? (
                <img 
                  src={`${API_URL}${profile.avatarUrl}`} 
                  alt="Profile Avatar" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-12 h-12 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-2xl flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <div className="flex-1">
            <label className="block">
              <span className="sr-only">Choose avatar</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:transition-colors disabled:opacity-50"
              />
            </label>
            <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF up to 2MB. Recommended: 400x400px</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your first name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your last name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your phone number"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your department"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your job title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Asia/Shanghai">Shanghai (CST)</option>
                <option value="Australia/Sydney">Sydney (AEST)</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Bio Section */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">About You</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 h-32 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
              placeholder="Tell us about yourself, your role, and what you do..."
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500 characters</p>
          </div>
        </div>
        
        {/* Preferences */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({...formData, language: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
              <select
                value={formData.dateFormat}
                onChange={(e) => setFormData({...formData, dateFormat: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                <option value="DD-MM-YYYY">DD-MM-YYYY</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// Settings Tab Component
const SettingsTab = ({ settings, setSettings, setSuccess, setError, getAuthHeaders, API_URL }) => {
  const [formData, setFormData] = useState({
    theme: settings?.theme || 'light',
    chat_sound_enabled: settings?.chat_sound_enabled ?? true,
    email_notifications: settings?.email_notifications ?? true,
    push_notifications: settings?.push_notifications ?? true,
    auto_save_conversations: settings?.auto_save_conversations ?? true,
    conversation_retention_days: settings?.conversation_retention_days || 365,
    default_assistant_model: settings?.default_assistant_model || 'gpt-4-1106-preview',
    sidebar_collapsed: settings?.sidebar_collapsed ?? false,
    show_timestamps: settings?.show_timestamps ?? true,
    compact_mode: settings?.compact_mode ?? false
  });
  const [saving, setSaving] = useState(false);

  // Update form data when settings change
  useEffect(() => {
    if (settings) {
      setFormData({
        theme: settings.theme || 'light',
        chat_sound_enabled: settings.chat_sound_enabled ?? true,
        email_notifications: settings.email_notifications ?? true,
        push_notifications: settings.push_notifications ?? true,
        auto_save_conversations: settings.auto_save_conversations ?? true,
        conversation_retention_days: settings.conversation_retention_days || 365,
        default_assistant_model: settings.default_assistant_model || 'gpt-4-1106-preview',
        sidebar_collapsed: settings.sidebar_collapsed ?? false,
        show_timestamps: settings.show_timestamps ?? true,
        compact_mode: settings.compact_mode ?? false
      });
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/api/user/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess('Settings updated successfully! ⚙️');
        setSettings(formData);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update settings');
      }
    } catch (error) {
      setError('Failed to update settings. Please check your connection.');
      console.error('Settings update error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Preferences & Settings</h3>
        <p className="text-gray-600">Customize your experience and notification preferences.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Appearance */}
        <div className="bg-gray-50 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
            </svg>
            Appearance
          </h4>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
              <select
                value={formData.theme}
                onChange={(e) => setFormData({...formData, theme: e.target.value})}
                className="w-full md:w-64 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="light">Light Theme</option>
                <option value="dark">Dark Theme</option>
                <option value="auto">Auto (Follow System)</option>
              </select>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex-1">
                  <label htmlFor="compact_mode" className="text-sm font-medium text-gray-700">
                    Compact Mode
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Use smaller UI elements to fit more content</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="compact_mode"
                    checked={formData.compact_mode}
                    onChange={(e) => setFormData({...formData, compact_mode: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex-1">
                  <label htmlFor="show_timestamps" className="text-sm font-medium text-gray-700">
                    Show Message Timestamps
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Display when each message was sent</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="show_timestamps"
                    checked={formData.show_timestamps}
                    onChange={(e) => setFormData({...formData, show_timestamps: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex-1">
                  <label htmlFor="sidebar_collapsed" className="text-sm font-medium text-gray-700">
                    Start with Sidebar Collapsed
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Hide the chat history sidebar by default</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="sidebar_collapsed"
                    checked={formData.sidebar_collapsed}
                    onChange={(e) => setFormData({...formData, sidebar_collapsed: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Settings */}
        <div className="bg-gray-50 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat Settings
          </h4>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Assistant Model</label>
              <select
                value={formData.default_assistant_model}
                onChange={(e) => setFormData({...formData, default_assistant_model: e.target.value})}
                className="w-full md:w-80 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="gpt-4-1106-preview">GPT-4 Turbo (Recommended)</option>
                <option value="gpt-4">GPT-4 (Standard)</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Choose the AI model that best fits your needs</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex-1">
                  <label htmlFor="chat_sound_enabled" className="text-sm font-medium text-gray-700">
                    Chat Sounds
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Play notification sounds for new messages</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="chat_sound_enabled"
                    checked={formData.chat_sound_enabled}
                    onChange={(e) => setFormData({...formData, chat_sound_enabled: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex-1">
                  <label htmlFor="auto_save_conversations" className="text-sm font-medium text-gray-700">
                    Auto-save Conversations
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Automatically save your chat history</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="auto_save_conversations"
                    checked={formData.auto_save_conversations}
                    onChange={(e) => setFormData({...formData, auto_save_conversations: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conversation Retention (days)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={formData.conversation_retention_days}
                  onChange={(e) => setFormData({...formData, conversation_retention_days: parseInt(e.target.value) || 365})}
                  className="w-32 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <span className="text-sm text-gray-600">days</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Conversations older than this will be automatically deleted (1-3650 days)
              </p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-gray-50 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Notifications
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
              <div className="flex-1">
                <label htmlFor="email_notifications" className="text-sm font-medium text-gray-700">
                  Email Notifications
                </label>
                <p className="text-xs text-gray-500 mt-1">Receive important updates via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="email_notifications"
                  checked={formData.email_notifications}
                  onChange={(e) => setFormData({...formData, email_notifications: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
              <div className="flex-1">
                <label htmlFor="push_notifications" className="text-sm font-medium text-gray-700">
                  Push Notifications
                </label>
                <p className="text-xs text-gray-500 mt-1">Get instant notifications in your browser</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="push_notifications"
                  checked={formData.push_notifications}
                  onChange={(e) => setFormData({...formData, push_notifications: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// Notifications Tab Component
const NotificationsTab = ({ notifications, setNotifications, setSuccess, setError, getAuthHeaders, API_URL }) => {
  const [loading, setLoading] = useState(false);

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`${API_URL}/api/user/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setNotifications(notifications.map(n => 
          n.id === notificationId ? { ...n, read_status: 1 } : n
        ));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/user/notifications/read-all`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setNotifications(notifications.map(n => ({ ...n, read_status: 1 })));
        setSuccess('All notifications marked as read! 📬');
      } else {
        setError('Failed to mark notifications as read');
      }
    } catch (error) {
      setError('Failed to mark notifications as read');
      console.error('Error marking all notifications as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read_status).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Notifications</h3>
          <p className="text-gray-600">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up! No new notifications.'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={loading}
            className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors font-medium border border-blue-200 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Marking...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Mark all as read
              </>
            )}
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h4>
            <p className="text-gray-500">When you receive notifications, they'll appear here.</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-6 rounded-2xl border transition-all duration-200 ${
                notification.read_status 
                  ? 'bg-gray-50 border-gray-200' 
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{notification.title}</h4>
                    {!notification.read_status && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
                {!notification.read_status && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="text-xs text-blue-600 hover:text-blue-700 ml-4"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Security Tab Component
const SecurityTab = ({ setSuccess, setError, getAuthHeaders, API_URL }) => {
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordData.new_password.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/user/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        })
      });

      if (response.ok) {
        setSuccess('Password updated successfully');
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update password');
      }
    } catch (error) {
      setError('Failed to update password');
      console.error('Password update error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-6 text-black">Security Settings</h3>
      
      <div className="max-w-md">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={passwordData.current_password}
              onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordData.confirm_password}
              onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Account Tab Component
const AccountTab = ({ stats, setSuccess, setError, getAuthHeaders, API_URL, showDeleteConfirm, setShowDeleteConfirm, logout }) => {
  const [deletePassword, setDeletePassword] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    
    try {
      const response = await fetch(`${API_URL}/api/user/account/export`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `lisa-data-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        setSuccess('Data exported successfully');
      } else {
        setError('Failed to export data');
      }
    } catch (error) {
      setError('Failed to export data');
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setError('Password is required to delete account');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/user/account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ password: deletePassword })
      });

      if (response.ok) {
        setSuccess('Account deleted successfully');
        setTimeout(() => {
          logout();
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete account');
      }
    } catch (error) {
      setError('Failed to delete account');
      console.error('Delete account error:', error);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-6 text-black">Account Management</h3>
      
      <div className="space-y-8">
        {/* Data Export */}
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Export Your Data</h4>
          <p className="text-sm text-gray-600 mb-4">
            Download all your data including profile, conversations, and activity logs.
          </p>
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            {exporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>

        {/* Account Statistics */}
        {stats && (
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Account Statistics</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Conversations:</span>
                  <span className="ml-2 font-medium">{stats.conversations}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Messages:</span>
                  <span className="ml-2 font-medium">{stats.messages}</span>
                </div>
                <div>
                  <span className="text-gray-600">Recent Activities:</span>
                  <span className="ml-2 font-medium">{stats.recent_activities}</span>
                </div>
                <div>
                  <span className="text-gray-600">Account Age:</span>
                  <span className="ml-2 font-medium">{stats.account_age_days} days</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account */}
        <div className="border-t pt-8">
          <h4 className="font-medium text-red-600 mb-4">Danger Zone</h4>
          <p className="text-sm text-gray-600 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Delete Account
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 mb-4">
                Are you absolutely sure? This action cannot be undone.
              </p>
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="Enter your password to confirm"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Yes, Delete My Account
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 