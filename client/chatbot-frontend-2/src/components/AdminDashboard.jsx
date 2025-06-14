import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Data states
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [vectorStores, setVectorStores] = useState([]);
  const [activities, setActivities] = useState([]);
  
  // Modal states
  const [showCreateAssistant, setShowCreateAssistant] = useState(false);
  const [showCreateVectorStore, setShowCreateVectorStore] = useState(false);
  const [showAssignAssistant, setShowAssignAssistant] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  const { user, logout, getAuthHeaders, API_URL, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Check if user is admin
  useEffect(() => {
    if (!isAdmin()) {
      setError('Admin access required. Redirecting to chat...');
      setTimeout(() => {
        navigate('/');
      }, 2000);
      return;
    }
  }, [isAdmin, navigate]);

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

  const assignAssistant = async (userId, assistantId) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ assistantId })
      });

      if (response.ok) {
        setSuccess('Assistant assigned successfully');
        setShowAssignAssistant(false);
        setSelectedUser(null);
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

  const removeAssistant = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this user\'s assistant?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/assistant`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setSuccess('Assistant removed successfully');
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to remove assistant');
      }
    } catch (error) {
      setError('Failed to remove assistant');
      console.error('Remove assistant error:', error);
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
        body: formData,
        headers: getAuthHeaders()
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

  const updateVectorStore = async (storeId, formData) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/vector-stores/${storeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess('Vector store updated successfully');
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update vector store');
      }
    } catch (error) {
      setError('Failed to update vector store');
      console.error('Update vector store error:', error);
    }
  };

  const deleteVectorStore = async (storeId) => {
    if (!window.confirm('Are you sure you want to delete this vector store? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/vector-stores/${storeId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setSuccess('Vector store deleted successfully');
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete vector store');
      }
    } catch (error) {
      setError('Failed to delete vector store');
      console.error('Delete vector store error:', error);
    }
  };

  const getVectorStoreFiles = async (storeId) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/vector-stores/${storeId}/files`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        return data.files;
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch vector store files');
        return [];
      }
    } catch (error) {
      setError('Failed to fetch vector store files');
      console.error('Get vector store files error:', error);
      return [];
    }
  };

  const addFilesToVectorStore = async (storeId, formData) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${API_URL}/api/admin/vector-stores/${storeId}/files`, {
        method: 'POST',
        body: formData,
        headers: getAuthHeaders()
      });

      const responseData = await response.json();

      if (response.ok) {
        setSuccess(`Files added to vector store successfully! ${responseData.message || ''}`);
        fetchData();
      } else {
        console.error('Upload error response:', responseData);
        setError(responseData.error || `Failed to add files to vector store (${response.status})`);
      }
    } catch (error) {
      console.error('Add files to vector store error:', error);
      setError(`Failed to add files to vector store: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const removeFileFromVectorStore = async (storeId, fileId) => {
    if (!window.confirm('Are you sure you want to remove this file from the vector store?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/vector-stores/${storeId}/files/${fileId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setSuccess('File removed from vector store successfully');
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to remove file from vector store');
      }
    } catch (error) {
      setError('Failed to remove file from vector store');
      console.error('Remove file from vector store error:', error);
    }
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-xl">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z', count: users.length },
    { id: 'assistants', label: 'Assistants', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', count: assistants.length },
    { id: 'vectorstores', label: 'Vector Stores', icon: 'M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z', count: vectorStores.length },
    { id: 'activities', label: 'Activities', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', count: activities.length }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">  
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
d                <img 
                  src="/Lisa Logo.png" 
                  alt="LISA" 
                  className="w-6 h-6 object-contain lisa-logo"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<span class="text-blue-600 font-bold text-sm">L</span>';
                  }}
                />
d              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                LISA
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium text-sm">{user.username?.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-gray-700 font-medium">{user.username}</span>
            </div>
              <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              Back to Chat
              </button>
              <button
              onClick={logout}
              className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            >
              Logout
              </button>
            </div>
              </div>
          </div>
          
      {/* Main Content */}
      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white shadow-lg h-screen sticky top-0">
          <div className="p-6">
            <nav className="space-y-2">
              {menuItems.map((item) => (
            <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    activeTab === item.id
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      activeTab === item.id ? 'bg-white/20' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {item.count}
                    </span>
                  )}
            </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6">
            {/* Messages */}
            {(error || success) && (
              <div className="mb-6">
                {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-lg flex justify-between items-center">
                    <span>{error}</span>
                  <button onClick={clearMessages} className="text-red-500 hover:text-red-700 text-xl">&times;</button>
                  </div>
                )}
                {success && (
                <div className="p-4 bg-green-50 border-l-4 border-green-400 text-green-700 rounded-lg flex justify-between items-center">
                    <span>{success}</span>
                  <button onClick={clearMessages} className="text-green-500 hover:text-green-700 text-xl">&times;</button>
                  </div>
                )}
              </div>
            )}

          {/* Tab Content */}
          {activeTab === 'dashboard' && <DashboardTab stats={stats} assistants={assistants} vectorStores={vectorStores} users={users} />}
          {activeTab === 'users' && <UsersTab users={users} assistants={assistants} updateUserStatus={updateUserStatus} deleteUser={deleteUser} assignAssistant={assignAssistant} removeAssistant={removeAssistant} setShowAssignAssistant={setShowAssignAssistant} setSelectedUser={setSelectedUser} setSuccess={setSuccess} setError={setError} fetchData={fetchData} />}
          {activeTab === 'assistants' && (
            <AssistantsTab 
              assistants={assistants}
              vectorStores={vectorStores}
              showCreateAssistant={showCreateAssistant}
              setShowCreateAssistant={setShowCreateAssistant}
              createAssistant={createAssistant}
              updateAssistant={updateAssistant}
              deleteAssistant={deleteAssistant}
            />
          )}
          {activeTab === 'vectorstores' && (
            <VectorStoresTab 
              vectorStores={vectorStores}
              assistants={assistants}
              showCreateVectorStore={showCreateVectorStore}
              setShowCreateVectorStore={setShowCreateVectorStore}
              createVectorStore={createVectorStore}
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
              updateVectorStore={updateVectorStore}
              deleteVectorStore={deleteVectorStore}
              getVectorStoreFiles={getVectorStoreFiles}
              addFilesToVectorStore={addFilesToVectorStore}
              removeFileFromVectorStore={removeFileFromVectorStore}
            />
          )}
          {activeTab === 'activities' && <ActivitiesTab activities={activities} />}
                      </div>
                      </div>

      {/* Modals */}
      {showAssignAssistant && selectedUser && (
        <AssignAssistantModal 
          user={selectedUser}
          assistants={assistants}
          onClose={() => {
            setShowAssignAssistant(false);
            setSelectedUser(null);
          }}
          onSubmit={(assistantId) => assignAssistant(selectedUser.id, assistantId)}
        />
      )}
                    </div>
  );
};

// Dashboard Tab Component
const DashboardTab = ({ stats, assistants, vectorStores, users }) => {
  const [systemHealth, setSystemHealth] = useState(null);
  const { getAuthHeaders, API_URL } = useAuth();

  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        const response = await fetch(`${API_URL}/api/admin/health`, {
          headers: getAuthHeaders()
        });
        if (response.ok) {
          const healthData = await response.json();
          setSystemHealth(healthData);
        }
      } catch (error) {
        console.error('Failed to fetch system health:', error);
      }
    };

    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [API_URL, getAuthHeaders]);

  const statsCards = [
    { title: 'Total Users', value: stats?.users?.total_users || 0, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z', color: 'blue' },
    { title: 'Active Users', value: stats?.users?.active_users || 0, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'green' },
    { title: 'AI Assistants', value: assistants.length, icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'purple' },
    { title: 'Vector Stores', value: vectorStores.length, icon: 'M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z', color: 'indigo' }
  ];

  const colorMap = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    indigo: 'from-indigo-500 to-indigo-600'
  };

  return (
    <div className="space-y-6">
      {/* System Health Status */}
      {systemHealth && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${systemHealth.database ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-700">Database</span>
                      </div>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${systemHealth.openai ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-700">OpenAI API</span>
                      </div>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${systemHealth.storage ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-700">File Storage</span>
                    </div>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${systemHealth.memory < 80 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="text-sm text-gray-700">Memory ({systemHealth.memory}%)</span>
                  </div>
                      </div>
                      </div>
      )}
                  
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center">
              <div className={`p-3 rounded-xl bg-gradient-to-r ${colorMap[card.color]} text-white`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                        </svg>
                      </div>
                      <div className="ml-4">
                <div className="text-3xl font-bold text-gray-900">{card.value}</div>
                <div className="text-sm text-gray-600">{card.title}</div>
                      </div>
                    </div>
                  </div>
        ))}
                </div>
                
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">System Overview</h3>
                  </div>
                  <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{users.filter(u => u.openai_assistant_id).length}</div>
              <div className="text-sm text-gray-600">Users with Assistants</div>
                              </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{assistants.filter(a => a.assistant_type === 'shared').length}</div>
              <div className="text-sm text-gray-600">Shared Assistants</div>
                            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{vectorStores.reduce((sum, vs) => sum + (vs.file_count || 0), 0)}</div>
              <div className="text-sm text-gray-600">Total Files Uploaded</div>
                          </div>
                      </div>
                      </div>
                  </div>
                </div>
  );
};

// Users Tab Component
const UsersTab = ({ users, assistants, updateUserStatus, deleteUser, assignAssistant, removeAssistant, setShowAssignAssistant, setSelectedUser, setSuccess, setError, fetchData }) => {
  const [showCreateUser, setShowCreateUser] = useState(false);
  const { getAuthHeaders, API_URL } = useAuth();

  const handleAssignAssistant = (user) => {
    setSelectedUser(user);
    setShowAssignAssistant(true);
  };

  const createUser = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        setSuccess('User created successfully');
        setShowCreateUser(false);
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create user');
      }
    } catch (error) {
      setError('Failed to create user');
      console.error('Create user error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
          <p className="text-sm text-gray-600 mt-1">Manage user accounts, permissions, and assistant assignments</p>
              </div>
        <button
          onClick={() => setShowCreateUser(true)}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors shadow-sm"
        >
          + Add User
        </button>
          </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <CreateUserModal 
          onClose={() => setShowCreateUser(false)}
          onSubmit={createUser}
        />
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
          <p className="text-sm text-gray-600 mt-1">Manage user accounts, permissions, and assistant assignments</p>
        </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assistant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => {
                const userAssistant = assistants.find(a => a.user_id === user.id || user.openai_assistant_id === a.assistant_id);
                
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                          {user.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          {user.role === 'admin' && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 mt-1">
                              Admin
                            </span>
                          )}
                    </div>
                  </div>
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
                      {userAssistant || user.openai_assistant_id ? (
                        <div className="flex flex-col">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {userAssistant?.assistant_name || 'Assigned'}
                        </span>
                          <span className="text-xs text-gray-500 mt-1">
                            {userAssistant?.model || 'Unknown Model'}
                          </span>
                      </div>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          No Assistant
                      </span>
                    )}
                </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                    {user.status === 'active' ? (
                      <button
                        onClick={() => updateUserStatus(user.id, 'suspended')}
                            className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => updateUserStatus(user.id, 'active')}
                            className="text-green-600 hover:text-green-800 font-medium"
                      >
                        Activate
                      </button>
                    )}
                    
                        {userAssistant || user.openai_assistant_id ? (
                          <button
                            onClick={() => removeAssistant(user.id)}
                            className="text-orange-600 hover:text-orange-800 font-medium"
                          >
                            Remove Assistant
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAssignAssistant(user)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Assign Assistant
                          </button>
                        )}
                    
                    <button
                      onClick={() => deleteUser(user.id)}
                          className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
                );
              })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

// Assistants Tab Component
const AssistantsTab = ({ assistants, vectorStores, showCreateAssistant, setShowCreateAssistant, createAssistant, updateAssistant, deleteAssistant }) => {
  const [editingAssistant, setEditingAssistant] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Assistants</h3>
          <p className="text-sm text-gray-600 mt-1">Manage AI assistants and their configurations</p>
        </div>
        <button
          onClick={() => setShowCreateAssistant(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-colors shadow-sm"
        >
          + Create Assistant
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
          <div key={assistant.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-lg">{assistant.assistant_name}</h4>
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    assistant.assistant_type === 'shared' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {assistant.assistant_type}
                  </span>
                  {assistant.user_count > 0 && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                      {assistant.user_count} users
                    </span>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingAssistant(assistant)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteAssistant(assistant.assistant_id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Model:</span>
                <span className="text-gray-900 font-medium">{assistant.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vector Store:</span>
                <span className="text-gray-900 font-medium">
                  {assistant.vector_store_name || (assistant.vector_store_id ? 'Connected' : 'None')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created:</span>
                <span className="text-gray-900 font-medium">{new Date(assistant.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            {assistant.instructions && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-gray-500 text-sm">Instructions:</span>
                <p className="text-xs text-gray-700 mt-1 bg-gray-50 p-3 rounded-lg max-h-20 overflow-y-auto">
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
const VectorStoresTab = ({ vectorStores, assistants, showCreateVectorStore, setShowCreateVectorStore, createVectorStore, selectedFiles, setSelectedFiles, updateVectorStore, deleteVectorStore, getVectorStoreFiles, addFilesToVectorStore, removeFileFromVectorStore }) => {
  const [editingStore, setEditingStore] = useState(null);
  const [viewingStoreFiles, setViewingStoreFiles] = useState(null);
  const [storeFiles, setStoreFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showAddFiles, setShowAddFiles] = useState(null);

  const handleViewFiles = async (store) => {
    setLoadingFiles(true);
    setViewingStoreFiles(store);
    const files = await getVectorStoreFiles(store.store_id);
    setStoreFiles(files);
    setLoadingFiles(false);
  };

  const handleAddFiles = (store) => {
    setShowAddFiles(store);
    setSelectedFiles([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Vector Stores</h3>
          <p className="text-sm text-gray-600 mt-1">Manage document stores and knowledge bases</p>
        </div>
        <button
          onClick={() => setShowCreateVectorStore(true)}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors shadow-sm"
        >
          + Create Vector Store
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
      
      {/* Edit Vector Store Modal */}
      {editingStore && (
        <EditVectorStoreModal 
          store={editingStore}
          onClose={() => setEditingStore(null)}
          onSubmit={(data) => {
            updateVectorStore(editingStore.store_id, data);
            setEditingStore(null);
          }}
        />
      )}

      {/* View Files Modal */}
      {viewingStoreFiles && (
        <ViewVectorStoreFilesModal 
          store={viewingStoreFiles}
          files={storeFiles}
          loading={loadingFiles}
          onClose={() => {
            setViewingStoreFiles(null);
            setStoreFiles([]);
          }}
          onRemoveFile={(fileId) => removeFileFromVectorStore(viewingStoreFiles.store_id, fileId)}
          onAddFiles={() => handleAddFiles(viewingStoreFiles)}
        />
      )}

      {/* Add Files Modal */}
      {showAddFiles && (
        <AddFilesToVectorStoreModal 
          store={showAddFiles}
          onClose={() => {
            setShowAddFiles(null);
            setSelectedFiles([]);
          }}
          onSubmit={(formData) => {
            addFilesToVectorStore(showAddFiles.store_id, formData);
            setShowAddFiles(null);
            setSelectedFiles([]);
          }}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
        />
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vectorStores.map((store) => {
          const connectedAssistants = assistants.filter(assistant => assistant.vector_store_id === store.store_id);
          
  return (
            <div key={store.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-semibold text-gray-900 text-lg">{store.store_name}</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                    {store.file_count || 0} files
                  </span>
                  {connectedAssistants.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                      {connectedAssistants.length} assistant{connectedAssistants.length !== 1 ? 's' : ''}
                    </span>
                  )}
      </div>
    </div>
              
              <div className="space-y-3 text-sm">
            <div className="flex justify-between">
                  <span className="text-gray-500">Created:</span>
                  <span className="text-gray-900 font-medium">{new Date(store.created_at).toLocaleDateString()}</span>
            </div>
                {connectedAssistants.length > 0 && (
                  <div>
                    <span className="text-gray-500">Connected Assistants:</span>
                    <div className="mt-2 space-y-1">
                      {connectedAssistants.map(assistant => (
                        <div key={assistant.assistant_id} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border">
                          {assistant.assistant_name}
            </div>
                      ))}
            </div>
            </div>
                )}
        </div>
        
              {store.description && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-gray-500 text-sm">Description:</span>
                  <p className="text-xs text-gray-700 mt-1 bg-gray-50 p-3 rounded-lg">
                    {store.description}
                  </p>
            </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                <button
                  onClick={() => handleViewFiles(store)}
                  className="text-xs px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  View Files
                </button>
                <button
                  onClick={() => handleAddFiles(store)}
                  className="text-xs px-3 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                >
                  Add Files
                </button>
                <button
                  onClick={() => setEditingStore(store)}
                  className="text-xs px-3 py-1 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteVectorStore(store.store_id)}
                  className="text-xs px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  disabled={connectedAssistants.length > 0}
                  title={connectedAssistants.length > 0 ? 'Cannot delete vector store with connected assistants' : 'Delete vector store'}
                >
                  Delete
                </button>
            </div>
            </div>
          );
        })}
            </div>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Create New Assistant</h3>
            <p className="text-sm text-gray-600 mt-1">Set up a new AI assistant for your users</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assistant Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter assistant name..."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
            <select
              value={formData.model}
              onChange={(e) => setFormData({...formData, model: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="gpt-4-1106-preview">GPT-4 Turbo (Recommended)</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vector Store (Optional)</label>
            <select
              value={formData.vectorStoreId}
              onChange={(e) => setFormData({...formData, vectorStoreId: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">No Vector Store</option>
              {vectorStores.map(store => (
                <option key={store.id} value={store.store_id}>
                  {store.store_name} ({store.file_count || 0} files)
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({...formData, instructions: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 h-32 text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              placeholder="Enter detailed instructions for the assistant..."
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-colors font-medium shadow-sm"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Edit Assistant</h3>
            <p className="text-sm text-gray-600 mt-1">Update assistant configuration</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assistant Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
            <select
              value={formData.model}
              onChange={(e) => setFormData({...formData, model: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="gpt-4-1106-preview">GPT-4 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vector Store</label>
            <select
              value={formData.vectorStoreId}
              onChange={(e) => setFormData({...formData, vectorStoreId: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">No Vector Store</option>
              {vectorStores.map(store => (
                <option key={store.id} value={store.store_id}>
                  {store.store_name} ({store.file_count || 0} files)
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({...formData, instructions: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 h-32 text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              placeholder="Enter assistant instructions..."
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-colors font-medium shadow-sm"
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Create New Vector Store</h3>
            <p className="text-sm text-gray-600 mt-1">Upload documents to create a knowledge base</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Store Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              placeholder="Enter vector store name..."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 h-24 text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-none"
              placeholder="Describe what this vector store contains..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Files</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
            <input
              type="file"
              multiple
              onChange={handleFileChange}
                className="hidden"
              accept=".txt,.pdf,.doc,.docx,.md"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-green-600 hover:text-green-500">Click to upload files</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, TXT, MD up to 50MB each</p>
                </div>
              </label>
            </div>
            
            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Selected files ({selectedFiles.length}):</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                      <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors font-medium shadow-sm"
            >
              Create Vector Store
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Vector Store Modal Component
const EditVectorStoreModal = ({ store, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: store.store_name,
    description: store.description || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Add New User</h3>
            <p className="text-sm text-gray-600 mt-1">Create a new user account</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              placeholder="Enter username..."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              placeholder="Enter email address..."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              placeholder="Enter password..."
              required
              minLength={6}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-colors font-medium shadow-sm"
            >
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Assign Assistant Modal Component
const AssignAssistantModal = ({ user, assistants, onClose, onSubmit }) => {
  const [selectedAssistantId, setSelectedAssistantId] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Assign Assistant to User</h3>
            <p className="text-sm text-gray-600 mt-1">Select an assistant for {user.username}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          onSubmit(selectedAssistantId);
        }} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Assistant</label>
            <select
              value={selectedAssistantId}
              onChange={(e) => setSelectedAssistantId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            >
              <option value="">Select an assistant</option>
              {assistants.map((assistant) => (
                <option key={assistant.assistant_id} value={assistant.assistant_id}>
                  {assistant.assistant_name} ({assistant.assistant_type})
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-colors font-medium shadow-sm"
            >
              Assign Assistant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Activities Tab Component
const ActivitiesTab = ({ activities }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">System Activities</h3>
          <p className="text-sm text-gray-600 mt-1">Monitor user actions and system events</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activities.map((activity, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{activity.username || 'System'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{activity.action}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{new Date(activity.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700 max-w-xs truncate">{activity.details}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Create User Modal Component
const CreateUserModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    status: 'active'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Create New User</h3>
            <p className="text-sm text-gray-600 mt-1">Add a new user to the system</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="Enter username..."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="Enter email address..."
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              placeholder="Enter password..."
              required
              minLength={6}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-colors font-medium shadow-sm"
            >
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// View Vector Store Files Modal Component
const ViewVectorStoreFilesModal = ({ store, files, loading, onClose, onRemoveFile, onAddFiles }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Files in {store.store_name}</h3>
            <p className="text-sm text-gray-600 mt-1">{files.length} files in this vector store</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 mt-4">No files in this vector store</p>
              <button
                onClick={onAddFiles}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Add Files
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-medium text-gray-900">Files</h4>
                <button
                  onClick={onAddFiles}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  + Add More Files
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.filename}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                              <span>{formatFileSize(file.bytes)}</span>
                              <span>{new Date(file.created_at).toLocaleDateString()}</span>
                              <span className={`px-2 py-1 rounded-full font-medium ${getStatusColor(file.status)}`}>
                                {file.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveFile(file.id)}
                        className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 hover:bg-red-50 rounded transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-700 bg-white hover:bg-gray-100 rounded-lg transition-colors font-medium border border-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Add Files to Vector Store Modal Component
const AddFilesToVectorStoreModal = ({ store, onClose, onSubmit, selectedFiles, setSelectedFiles }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setUploadError('');
    
    // Validate files
    const validFiles = [];
    const errors = [];
    
    files.forEach(file => {
      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        errors.push(`${file.name}: File size exceeds 50MB limit`);
        return;
      }
      
      // Check file type
      const allowedTypes = ['.txt', '.pdf', '.doc', '.docx', '.md'];
      const extension = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowedTypes.includes(extension)) {
        errors.push(`${file.name}: Invalid file type. Only .txt, .pdf, .doc, .docx, .md files are allowed`);
        return;
      }
      
      validFiles.push(file);
    });
    
    if (errors.length > 0) {
      setUploadError(errors.join('\n'));
    }
    
    setSelectedFiles(validFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      setUploadError('Please select at least one file');
      return;
    }
    
    setUploading(true);
    setUploadError('');
    
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      await onSubmit(formData);
      onClose(); // Close modal on success
    } catch (error) {
      setUploadError(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setUploadError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Add Files to {store.store_name}</h3>
            <p className="text-sm text-gray-600 mt-1">Upload additional files to this vector store</p>
          </div>
          <button 
            onClick={onClose} 
            disabled={uploading}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-lg disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Upload Error Display */}
          {uploadError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="whitespace-pre-line">{uploadError}</div>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Files</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept=".txt,.pdf,.doc,.docx,.md"
                id="add-files-upload"
                disabled={uploading}
              />
              <label htmlFor="add-files-upload" className={`cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-green-600 hover:text-green-500">Click to upload files</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, TXT, MD up to 50MB each</p>
                </div>
              </label>
            </div>
            
            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Selected files ({selectedFiles.length}):</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-700 truncate block">{file.name}</span>
                        <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        disabled={uploading}
                        className="ml-2 text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || selectedFiles.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Files ({selectedFiles.length})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard; 