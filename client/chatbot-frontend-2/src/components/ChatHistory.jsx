import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import SearchComponent from './SearchComponent';

const ChatHistory = ({ onLoadConversation, onNewChat, currentThreadId, isOpen, onToggle }) => {
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, getAuthHeaders, API_URL } = useAuth();

  // Load conversation history when component mounts or user changes
  const loadConversationHistory = useCallback(async () => {
    if (!isAuthenticated()) return;
    
    setIsLoading(true);
    console.log('Loading conversation history...');
    try {
      const response = await fetch(`${API_URL}/api/chat/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });

      console.log('History response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Loaded conversations:', data);
        setConversations(data.conversations || []);
        setFilteredConversations(data.conversations || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to load conversation history:', errorData);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, API_URL, getAuthHeaders]);

  useEffect(() => {
    if (isAuthenticated()) {
      loadConversationHistory();
    }
  }, [isAuthenticated, loadConversationHistory]);

  const handleLoadConversation = async (threadId) => {
    if (!isAuthenticated()) return;
    
    try {
      const response = await fetch(`${API_URL}/api/chat/history/${threadId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });

      if (response.ok) {
        const data = await response.json();
        onLoadConversation(data.messages, threadId);
      } else {
        console.error('Failed to load conversation');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleDeleteConversation = async (threadId, e) => {
    e.stopPropagation(); // Prevent triggering load conversation
    
    if (!window.confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/chat/history/${threadId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });

      if (response.ok) {
        // Remove from local state
        setConversations(prev => prev.filter(conv => conv.thread_id !== threadId));
        setFilteredConversations(prev => prev.filter(conv => conv.thread_id !== threadId));
        
        // If this was the current conversation, start a new one
        if (currentThreadId === threadId) {
          onNewChat();
        }
      } else {
        console.error('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const truncateTitle = (title, maxLength = 25) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  // Handle search functionality
  const handleSearch = useCallback(({ query }) => {
    if (!query.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const filtered = conversations.filter(conv =>
      conv.title?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredConversations(filtered);
  }, [conversations]);

  // Update filtered conversations when conversations change
  useEffect(() => {
    setFilteredConversations(conversations);
  }, [conversations]);

  const exportChatHistory = async () => {
    try {
      const dataStr = JSON.stringify(conversations, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `ontrack-chat-history-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Error exporting chat history:', error);
    }
  };

  if (!isAuthenticated()) {
    return null; // Don't show chat history for non-authenticated users
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        w-80 lg:w-72 xl:w-80
        flex flex-col
      `}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-4.126-.98L3 21l1.98-5.874A8.955 8.955 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-lg">Chat History</h2>
              <p className="text-blue-100 text-xs">{conversations.length} conversations</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b border-gray-100">
          <button
            onClick={() => {
              onNewChat();
              onToggle();
            }}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Start New Chat
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100">
          <SearchComponent
            onSearch={handleSearch}
            placeholder="Search conversations..."
            className="w-full"
          />
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="p-6 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-gray-500 text-sm">Loading conversations...</p>
            </div>
          )}

          {!isLoading && filteredConversations.length === 0 && (
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-4.126-.98L3 21l1.98-5.874A8.955 8.955 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">
                No conversations found
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Start chatting to see your history here
              </p>
            </div>
          )}

          {!isLoading && filteredConversations.map((conversation) => (
            <div
              key={conversation.thread_id}
              className={`mx-3 mb-2 p-3 rounded-xl cursor-pointer transition-all duration-200 group hover:shadow-md ${
                currentThreadId === conversation.thread_id 
                  ? 'bg-blue-50 border-2 border-blue-200 shadow-sm' 
                  : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
              }`}
              onClick={() => {
                handleLoadConversation(conversation.thread_id);
                onToggle();
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${
                      currentThreadId === conversation.thread_id ? 'bg-blue-500' : 'bg-gray-300'
                    }`}></div>
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {truncateTitle(conversation.title || 'Untitled Conversation')}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatDate(conversation.updated_at)}</span>
                    <span className="bg-gray-200 px-2 py-1 rounded-full">
                      {conversation.message_count} msg{conversation.message_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(conversation.thread_id, e)}
                  className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  title="Delete conversation"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="space-y-3">
            <button
              onClick={exportChatHistory}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export History
            </button>
            <div className="flex items-center justify-center text-xs text-gray-500">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Your conversations are private & secure
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatHistory; 