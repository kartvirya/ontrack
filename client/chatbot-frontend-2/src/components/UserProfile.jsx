import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

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
  
  const { getAuthHeaders, API_URL, user, logout } = useAuth();
  const navigate = useNavigate();

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [profileRes, settingsRes, notificationsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/user/profile`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/user/settings`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/user/notifications?limit=20`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/user/account/stats`, { headers: getAuthHeaders() })
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData.profile);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData.settings);
      }

      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json();
        setNotifications(notificationsData.notifications);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }
    } catch (error) {
      setError('Failed to load user data');
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }, [API_URL, getAuthHeaders]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-lg">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToChat}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Chat
              </button>
              <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-800">
                  {user.username}
                </div>
                <div className="text-xs text-gray-600">User Account</div>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
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
              <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-4 flex justify-between items-center">
                <span>{error}</span>
                <button onClick={clearMessages} className="text-red-500 hover:text-red-700">×</button>
              </div>
            )}
            {success && (
              <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg mb-4 flex justify-between items-center">
                <span>{success}</span>
                <button onClick={clearMessages} className="text-green-500 hover:text-green-700">×</button>
              </div>
            )}
          </div>
        )}

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-blue-600">{stats.conversations}</div>
              <div className="text-sm text-gray-600">Conversations</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-green-600">{stats.messages}</div>
              <div className="text-sm text-gray-600">Messages</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-purple-600">{stats.recent_activities}</div>
              <div className="text-sm text-gray-600">Recent Activities</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-orange-600">{stats.account_age_days}</div>
              <div className="text-sm text-gray-600">Days Active</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {[
                { id: 'profile', label: 'Profile' },
                { id: 'settings', label: 'Settings' },
                { id: 'notifications', label: `Notifications (${notifications.filter(n => !n.read_status).length})` },
                { id: 'security', label: 'Security' },
                { id: 'account', label: 'Account' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-6 text-sm font-medium ${
                    activeTab === tab.id 
                      ? 'border-b-2 border-blue-500 text-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
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
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: profile?.phone || '',
    department: profile?.department || '',
    job_title: profile?.job_title || '',
    bio: profile?.bio || '',
    timezone: profile?.timezone || 'UTC',
    language: profile?.language || 'en',
    date_format: profile?.date_format || 'MM/DD/YYYY'
  });
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
        setSuccess('Profile updated successfully');
        setProfile({ ...profile, ...formData });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      setError('Failed to update profile');
      console.error('Profile update error:', error);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
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
        setSuccess('Avatar uploaded successfully');
        setProfile({ ...profile, avatar_url: data.avatar_url });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to upload avatar');
      }
    } catch (error) {
      setError('Failed to upload avatar');
      console.error('Avatar upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-6">Profile Information</h3>
      
      {/* Avatar Section */}
      <div className="mb-8 flex items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img 
                src={`${API_URL}${profile.avatar_url}`} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
        <div>
          <label className="block">
            <span className="sr-only">Choose avatar</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </label>
          <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 2MB</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({...formData, last_name: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
            <input
              type="text"
              value={formData.job_title}
              onChange={(e) => setFormData({...formData, job_title: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({...formData, timezone: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({...formData, bio: e.target.value})}
            className="w-full border border-gray-300 rounded-md px-3 py-2 h-24"
            placeholder="Tell us about yourself..."
          />
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Save Profile
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
        setSuccess('Settings updated successfully');
        setSettings(formData);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update settings');
      }
    } catch (error) {
      setError('Failed to update settings');
      console.error('Settings update error:', error);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-6">Preferences & Settings</h3>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Appearance */}
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Appearance</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
              <select
                value={formData.theme}
                onChange={(e) => setFormData({...formData, theme: e.target.value})}
                className="w-full md:w-48 border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="compact_mode"
                checked={formData.compact_mode}
                onChange={(e) => setFormData({...formData, compact_mode: e.target.checked})}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="compact_mode" className="ml-2 text-sm text-gray-700">
                Compact mode (smaller UI elements)
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_timestamps"
                checked={formData.show_timestamps}
                onChange={(e) => setFormData({...formData, show_timestamps: e.target.checked})}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="show_timestamps" className="ml-2 text-sm text-gray-700">
                Show message timestamps
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="sidebar_collapsed"
                checked={formData.sidebar_collapsed}
                onChange={(e) => setFormData({...formData, sidebar_collapsed: e.target.checked})}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="sidebar_collapsed" className="ml-2 text-sm text-gray-700">
                Start with sidebar collapsed
              </label>
            </div>
          </div>
        </div>

        {/* Chat Settings */}
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Chat Settings</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Assistant Model</label>
              <select
                value={formData.default_assistant_model}
                onChange={(e) => setFormData({...formData, default_assistant_model: e.target.value})}
                className="w-full md:w-64 border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="gpt-4-1106-preview">GPT-4 Turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="chat_sound_enabled"
                checked={formData.chat_sound_enabled}
                onChange={(e) => setFormData({...formData, chat_sound_enabled: e.target.checked})}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="chat_sound_enabled" className="ml-2 text-sm text-gray-700">
                Enable chat sounds
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="auto_save_conversations"
                checked={formData.auto_save_conversations}
                onChange={(e) => setFormData({...formData, auto_save_conversations: e.target.checked})}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="auto_save_conversations" className="ml-2 text-sm text-gray-700">
                Auto-save conversations
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conversation retention (days)
              </label>
              <input
                type="number"
                min="1"
                max="3650"
                value={formData.conversation_retention_days}
                onChange={(e) => setFormData({...formData, conversation_retention_days: parseInt(e.target.value)})}
                className="w-32 border border-gray-300 rounded-md px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Conversations older than this will be automatically deleted
              </p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Notifications</h4>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="email_notifications"
                checked={formData.email_notifications}
                onChange={(e) => setFormData({...formData, email_notifications: e.target.checked})}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="email_notifications" className="ml-2 text-sm text-gray-700">
                Email notifications
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="push_notifications"
                checked={formData.push_notifications}
                onChange={(e) => setFormData({...formData, push_notifications: e.target.checked})}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="push_notifications" className="ml-2 text-sm text-gray-700">
                Push notifications
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};

// Notifications Tab Component
const NotificationsTab = ({ notifications, setNotifications, setSuccess, setError, getAuthHeaders, API_URL }) => {
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
    try {
      const response = await fetch(`${API_URL}/api/user/notifications/read-all`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setNotifications(notifications.map(n => ({ ...n, read_status: 1 })));
        setSuccess('All notifications marked as read');
      }
    } catch (error) {
      setError('Failed to mark notifications as read');
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Notifications</h3>
        {notifications.some(n => !n.read_status) && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Mark all as read
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No notifications yet
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${
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
      <h3 className="text-lg font-semibold mb-6">Security Settings</h3>
      
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
              className="w-full border border-gray-300 rounded-md px-3 py-2"
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
              className="w-full border border-gray-300 rounded-md px-3 py-2"
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
              className="w-full border border-gray-300 rounded-md px-3 py-2"
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
        a.download = `ontrack-data-export-${Date.now()}.json`;
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
      <h3 className="text-lg font-semibold mb-6">Account Management</h3>
      
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
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