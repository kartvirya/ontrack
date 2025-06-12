import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [vectorStores, setVectorStores] = useState([]);
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCreateAssistant, setShowCreateAssistant] = useState(false);
  const [showCreateVectorStore, setShowCreateVectorStore] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const { getAuthHeaders, API_URL, user, logout } = useAuth();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all admin data
      const [usersResponse, assistantsResponse, vectorStoresResponse, statsResponse, activitiesResponse] = await Promise.all([
        fetch(`${API_URL}/api/admin/users`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/admin/assistants`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/admin/vector-stores`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/admin/statistics`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/admin/activities`, { headers: getAuthHeaders() })
      ]);

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users);
      }

      if (assistantsResponse.ok) {
        const assistantsData = await assistantsResponse.json();
        setAssistants(assistantsData.assistants);
      }

      if (vectorStoresResponse.ok) {
        const vectorStoresData = await vectorStoresResponse.json();
        setVectorStores(vectorStoresData.vectorStores);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData.activities);
      }
    } catch (error) {
      setError('Failed to load admin data');
      console.error('Admin data fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [API_URL, getAuthHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateUserStatus = async (userId, status) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        setSuccess(`User status updated to ${status}`);
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update user status');
      }
    } catch (error) {
      setError('Failed to update user status');
      console.error('Update user status error:', error);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This will also delete their assistant and all data.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setSuccess('User deleted successfully');
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete user');
      }
    } catch (error) {
      setError('Failed to delete user');
      console.error('Delete user error:', error);
    }
  };

  const createAssistant = async (formData) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/assistants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess('Assistant created successfully');
        setShowCreateAssistant(false);
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create assistant');
      }
    } catch (error) {
      setError('Failed to create assistant');
      console.error('Create assistant error:', error);
    }
  };

  const updateAssistant = async (assistantId, formData) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/assistants/${assistantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess('Assistant updated successfully');
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update assistant');
      }
    } catch (error) {
      setError('Failed to update assistant');
      console.error('Update assistant error:', error);
    }
  };

  const deleteAssistant = async (assistantId) => {
    if (!window.confirm('Are you sure you want to delete this assistant?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/assistants/${assistantId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setSuccess('Assistant deleted successfully');
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete assistant');
      }
    } catch (error) {
      setError('Failed to delete assistant');
      console.error('Delete assistant error:', error);
    }
  };

  const createVectorStore = async (formData) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/vector-stores`, {
        method: 'POST',
        headers: formData,
        ...getAuthHeaders()
      });

      if (response.ok) {
        setSuccess('Vector store created successfully');
        setShowCreateVectorStore(false);
        setSelectedFiles([]);
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create vector store');
      }
    } catch (error) {
      setError('Failed to create vector store');
      console.error('Create vector store error:', error);
    }
  };

  const assignAssistantToUser = async (userId, assistantId) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/assign-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ assistantId })
      });

      if (response.ok) {
        setSuccess('Assistant assigned to user successfully');
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to assign assistant');
      }
    } catch (error) {
      setError('Failed to assign assistant');
      console.error('Assign assistant error:', error);
    }
  };

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
            Loading admin dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          {!sidebarCollapsed && (
            <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d={sidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
            </svg>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {/* Dashboard */}
            <li>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'dashboard' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                {!sidebarCollapsed && <span>Dashboard</span>}
              </button>
            </li>

            {/* Users */}
            <li>
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'users' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                {!sidebarCollapsed && <span>Users ({users.length})</span>}
              </button>
            </li>

            {/* Assistants */}
            <li>
              <button
                onClick={() => setActiveTab('assistants')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'assistants' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {!sidebarCollapsed && <span>Assistants ({assistants.length})</span>}
              </button>
            </li>

            {/* Vector Stores */}
            <li>
              <button
                onClick={() => setActiveTab('vectorstores')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'vectorstores' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
                {!sidebarCollapsed && <span>Vector Stores ({vectorStores.length})</span>}
              </button>
            </li>

            {/* Activity */}
            <li>
              <button
                onClick={() => setActiveTab('activity')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'activity' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {!sidebarCollapsed && <span>Activity</span>}
              </button>
            </li>

            {/* Statistics */}
            <li>
              <button
                onClick={() => setActiveTab('stats')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'stats' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {!sidebarCollapsed && <span>Statistics</span>}
              </button>
            </li>
          </ul>
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t p-4">
          <div className={`flex items-center gap-3 mb-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user.username?.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">{user.username}</div>
                <div className="text-xs text-gray-600">Administrator</div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <button
              onClick={handleBackToChat}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {!sidebarCollapsed && <span>Back to Chat</span>}
            </button>
            
            <button
              onClick={logout}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-700 hover:bg-red-50 transition-colors ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 capitalize">
                {activeTab === 'vectorstores' ? 'Vector Stores' : activeTab}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {activeTab === 'dashboard' && 'Overview of your admin panel'}
                {activeTab === 'users' && 'Manage users and their permissions'}
                {activeTab === 'assistants' && 'Manage AI assistants and configurations'}
                {activeTab === 'vectorstores' && 'Manage document stores and knowledge bases'}
                {activeTab === 'activity' && 'View system activity and logs'}
                {activeTab === 'stats' && 'View detailed analytics and statistics'}
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="p-6">
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

            {/* Dashboard Tab - Stats Overview */}
            {activeTab === 'dashboard' && stats && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <div className="text-2xl font-bold text-gray-900">{stats.users?.total_users || 0}</div>
                        <div className="text-sm text-gray-600">Total Users</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <div className="text-2xl font-bold text-gray-900">{stats.users?.active_users || 0}</div>
                        <div className="text-sm text-gray-600">Active Users</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <div className="text-2xl font-bold text-gray-900">{assistants.length}</div>
                        <div className="text-sm text-gray-600">Assistants</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <div className="text-2xl font-bold text-gray-900">{vectorStores.length}</div>
                        <div className="text-sm text-gray-600">Vector Stores</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Recent Activity Summary */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                  </div>
                  <div className="p-6">
                    {activities.length > 0 ? (
                      <div className="space-y-4">
                        {activities.slice(0, 5).map((activity, index) => (
                          <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{activity.action}</div>
                              <div className="text-xs text-gray-600">
                                {activity.user} • {new Date(activity.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No recent activity to display
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-white rounded-lg shadow">
                <UsersTab 
                  users={users} 
                  assistants={assistants}
                  updateUserStatus={updateUserStatus}
                  deleteUser={deleteUser}
                  assignAssistantToUser={assignAssistantToUser}
                />
              </div>
            )}

            {/* Assistants Tab */}
            {activeTab === 'assistants' && (
              <div className="bg-white rounded-lg shadow">
                <AssistantsTab 
                  assistants={assistants}
                  vectorStores={vectorStores}
                  users={users}
                  showCreateAssistant={showCreateAssistant}
                  setShowCreateAssistant={setShowCreateAssistant}
                  createAssistant={createAssistant}
                  updateAssistant={updateAssistant}
                  deleteAssistant={deleteAssistant}
                />
              </div>
            )}

            {/* Vector Stores Tab */}
            {activeTab === 'vectorstores' && (
              <div className="bg-white rounded-lg shadow">
                <VectorStoresTab 
                  vectorStores={vectorStores}
                  showCreateVectorStore={showCreateVectorStore}
                  setShowCreateVectorStore={setShowCreateVectorStore}
                  createVectorStore={createVectorStore}
                  selectedFiles={selectedFiles}
                  setSelectedFiles={setSelectedFiles}
                />
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="bg-white rounded-lg shadow">
                <ActivityTab activities={activities} />
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'stats' && stats && (
              <div className="bg-white rounded-lg shadow">
                <StatisticsTab stats={stats} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Users Tab Component
const UsersTab = ({ users, assistants, updateUserStatus, deleteUser, assignAssistantToUser }) => {
  return (
    <div className="p-6">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assistant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="font-medium text-gray-900">{user.username}</div>
                    <div className="text-sm text-gray-500">ID: {user.id}</div>
                    <div className="text-xs text-gray-400">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.status === 'active' ? 'bg-green-100 text-green-800' : 
                    user.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    {user.hasAgent ? (
                      <div>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          Active
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {user.openai_assistant_id?.substring(0, 15)}...
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        None
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2 flex-wrap">
                    {user.status === 'active' ? (
                      <button
                        onClick={() => updateUserStatus(user.id, 'suspended')}
                        className="text-xs bg-red-100 text-red-800 px-3 py-1 rounded-md hover:bg-red-200 transition-colors"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => updateUserStatus(user.id, 'active')}
                        className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-md hover:bg-green-200 transition-colors"
                      >
                        Activate
                      </button>
                    )}
                    
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          assignAssistantToUser(user.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-md border-none"
                    >
                      <option value="">Assign Assistant</option>
                      {assistants.map(assistant => (
                        <option key={assistant.id} value={assistant.assistant_id}>
                          {assistant.assistant_name}
                        </option>
                      ))}
                    </select>
                    
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="text-xs bg-gray-100 text-gray-800 px-3 py-1 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Assistants Tab Component
const AssistantsTab = ({ assistants, vectorStores, users, showCreateAssistant, setShowCreateAssistant, createAssistant, updateAssistant, deleteAssistant }) => {
  const [editingAssistant, setEditingAssistant] = useState(null);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setShowCreateAssistant(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Create New Assistant
        </button>
      </div>

      {/* Create Assistant Modal */}
      {showCreateAssistant && (
        <CreateAssistantModal 
          vectorStores={vectorStores}
          onClose={() => setShowCreateAssistant(false)}
          onSubmit={createAssistant}
        />
      )}

      {/* Edit Assistant Modal */}
      {editingAssistant && (
        <EditAssistantModal 
          assistant={editingAssistant}
          vectorStores={vectorStores}
          onClose={() => setEditingAssistant(null)}
          onSubmit={(data) => {
            updateAssistant(editingAssistant.assistant_id, data);
            setEditingAssistant(null);
          }}
        />
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assistants.map((assistant) => (
          <div key={assistant.id} className="bg-gray-50 rounded-lg p-6 border">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-medium text-gray-900">{assistant.assistant_name}</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingAssistant(assistant)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteAssistant(assistant.assistant_id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">ID:</span>
                <span className="ml-2 font-mono text-xs">{assistant.assistant_id}</span>
              </div>
              <div>
                <span className="text-gray-600">Model:</span>
                <span className="ml-2">{assistant.model}</span>
              </div>
              <div>
                <span className="text-gray-600">Vector Store:</span>
                <span className="ml-2">{assistant.vector_store_id ? 'Connected' : 'None'}</span>
              </div>
              <div>
                <span className="text-gray-600">Users:</span>
                <span className="ml-2">{users.filter(u => u.openai_assistant_id === assistant.assistant_id).length}</span>
              </div>
              <div>
                <span className="text-gray-600">Created:</span>
                <span className="ml-2">{new Date(assistant.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            {assistant.instructions && (
              <div className="mt-4">
                <span className="text-gray-600 text-sm">Instructions:</span>
                <p className="text-xs text-gray-700 mt-1 bg-white p-2 rounded border max-h-20 overflow-y-auto">
                  {assistant.instructions}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Vector Stores Tab Component
const VectorStoresTab = ({ vectorStores, showCreateVectorStore, setShowCreateVectorStore, createVectorStore, selectedFiles, setSelectedFiles }) => {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setShowCreateVectorStore(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
        >
          Create New Vector Store
        </button>
      </div>

      {/* Create Vector Store Modal */}
      {showCreateVectorStore && (
        <CreateVectorStoreModal 
          onClose={() => setShowCreateVectorStore(false)}
          onSubmit={createVectorStore}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
        />
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vectorStores.map((store) => (
          <div key={store.id} className="bg-gray-50 rounded-lg p-6 border">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-medium text-gray-900">{store.store_name}</h4>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                {store.file_count} files
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">ID:</span>
                <span className="ml-2 font-mono text-xs">{store.store_id}</span>
              </div>
              <div>
                <span className="text-gray-600">Created:</span>
                <span className="ml-2">{new Date(store.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            {store.description && (
              <div className="mt-4">
                <span className="text-gray-600 text-sm">Description:</span>
                <p className="text-xs text-gray-700 mt-1 bg-white p-2 rounded border">
                  {store.description}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Activity Tab Component
const ActivityTab = ({ activities }) => {
  return (
    <div className="p-6">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activities.map((activity, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {activity.username || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {activity.action}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {activity.details || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {activity.ip_address || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(activity.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Statistics Tab Component
const StatisticsTab = ({ stats }) => {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">User Statistics</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Users:</span>
              <span className="font-medium">{stats?.users?.total_users || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Users:</span>
              <span className="font-medium text-green-600">{stats?.users?.active_users || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Suspended Users:</span>
              <span className="font-medium text-red-600">{stats?.users?.suspended_users || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Users with Assistants:</span>
              <span className="font-medium text-blue-600">{stats?.users?.users_with_assistants || 0}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Conversation Statistics</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Conversations:</span>
              <span className="font-medium">{stats?.conversations?.total_conversations || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Users with Conversations:</span>
              <span className="font-medium text-green-600">{stats?.conversations?.users_with_conversations || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Messages/Conversation:</span>
              <span className="font-medium text-blue-600">
                {stats?.conversations?.avg_messages_per_conversation ? 
                  Math.round(stats.conversations.avg_messages_per_conversation * 10) / 10 : 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Message Statistics</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Messages:</span>
              <span className="font-medium">{stats?.messages?.total_messages || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">User Messages:</span>
              <span className="font-medium text-blue-600">{stats?.messages?.user_messages || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Assistant Messages:</span>
              <span className="font-medium text-purple-600">{stats?.messages?.assistant_messages || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <div className="mt-8">
          <h4 className="font-medium text-gray-900 mb-4">Recent Activity (Last 30 Days)</h4>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="space-y-2">
              {stats.recentActivity.slice(0, 10).map((activity, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">{activity.date}:</span>
                  <span className="font-medium">{activity.conversations_created} conversations</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Create Assistant Modal Component
const CreateAssistantModal = ({ vectorStores, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    instructions: '',
    model: 'gpt-4-1106-preview',
    vectorStoreId: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Create New Assistant</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assistant Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <select
              value={formData.model}
              onChange={(e) => setFormData({...formData, model: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="gpt-4-1106-preview">GPT-4 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vector Store (Optional)</label>
            <select
              value={formData.vectorStoreId}
              onChange={(e) => setFormData({...formData, vectorStoreId: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">No Vector Store</option>
              {vectorStores.map(store => (
                <option key={store.id} value={store.store_id}>
                  {store.store_name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({...formData, instructions: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 h-32"
              placeholder="Enter assistant instructions..."
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Assistant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Assistant Modal Component
const EditAssistantModal = ({ assistant, vectorStores, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: assistant.assistant_name,
    instructions: assistant.instructions || '',
    model: assistant.model,
    vectorStoreId: assistant.vector_store_id || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Edit Assistant</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assistant Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <select
              value={formData.model}
              onChange={(e) => setFormData({...formData, model: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="gpt-4-1106-preview">GPT-4 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vector Store</label>
            <select
              value={formData.vectorStoreId}
              onChange={(e) => setFormData({...formData, vectorStoreId: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">No Vector Store</option>
              {vectorStores.map(store => (
                <option key={store.id} value={store.store_id}>
                  {store.store_name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({...formData, instructions: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 h-32"
              placeholder="Enter assistant instructions..."
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Update Assistant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Create Vector Store Modal Component
const CreateVectorStoreModal = ({ onClose, onSubmit, selectedFiles, setSelectedFiles }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = new FormData();
    submitData.append('name', formData.name);
    submitData.append('description', formData.description);
    selectedFiles.forEach(file => {
      submitData.append('files', file);
    });
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Create New Vector Store</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 h-24"
              placeholder="Enter store description..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Files</label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              accept=".txt,.pdf,.doc,.docx,.md"
            />
            {selectedFiles.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">Selected files:</p>
                <ul className="text-xs text-gray-500">
                  {selectedFiles.map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Create Vector Store
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard; 