import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const ChatHistory = ({ onLoadConversation, onNewChat, onClose }) => {
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, getAuthHeaders, API_URL } = useAuth();

  // Load conversation history when component mounts or user changes
  const loadConversationHistory = useCallback(async () => {
    if (!isAuthenticated()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/chat/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });

      if (response.ok) {
        const data = await response.json();
        const conversationsData = data.conversations || [];
        setConversations(conversationsData);
        setFilteredConversations(conversationsData);
      } else {
        console.error('Failed to load conversation history');
        setConversations([]);
        setFilteredConversations([]);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
      setConversations([]);
      setFilteredConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, API_URL, getAuthHeaders]);

  useEffect(() => {
    if (isAuthenticated()) {
      loadConversationHistory();
    }
  }, [isAuthenticated, loadConversationHistory]);

  const handleLoadConversation = async (threadId, e) => {
    // Prevent event bubbling if this was triggered by delete button
    if (e && e.target.closest('button[data-delete]')) {
      return;
    }
    
    if (!isAuthenticated() || !threadId) return;
    
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
        
        // Backend returns { conversation: { messages: [...] } }
        // We need to extract the messages array
        const messages = data.conversation?.messages || data.messages;
        
        if (messages && Array.isArray(messages)) {
          // Transform messages from database format to frontend format
          const transformedMessages = messages.map(msg => {
            const transformedMsg = {
              role: msg.role,
              content: msg.content,
              assistantType: msg.assistant_type
            };
            
            // Convert train_part_data back to trainPart if it exists
            if (msg.train_part_data) {
              try {
                transformedMsg.trainPart = typeof msg.train_part_data === 'string' 
                  ? JSON.parse(msg.train_part_data) 
                  : msg.train_part_data;
              } catch (e) {
                console.error('Error parsing train_part_data:', e);
              }
            }
            
            return transformedMsg;
          });
          
          onLoadConversation(transformedMessages, threadId);
          onClose(); // Close sidebar after loading
        } else {
          console.error('Invalid conversation data structure:', data);
        }
      } else {
        console.error('Failed to load conversation, status:', response.status);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleDeleteConversation = async (threadId, e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!window.confirm('Delete this conversation?')) {
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
        setConversations(prev => prev.filter(conv => conv.thread_id !== threadId));
        setFilteredConversations(prev => prev.filter(conv => conv.thread_id !== threadId));
      } else {
        console.error('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) return 'Today';
      if (diffDays === 2) return 'Yesterday';
      if (diffDays <= 7) return `${diffDays - 1}d ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Unknown';
    }
  };

  const truncateTitle = (title, maxLength = 30) => {
    if (!title || typeof title !== 'string') return 'Untitled';
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  // Handle search functionality
  const handleSearch = useCallback((e) => {
    const query = e.target.value;
    if (!query || !query.trim()) {
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

  if (!isAuthenticated()) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Sign in to view chat history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Clean Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-4.126-.98L3 21l1.98-5.874A8.955 8.955 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
          </svg>
          <div>
            <h2 className="font-semibold text-gray-900">Chat History</h2>
            <p className="text-xs text-gray-500">{conversations.length} conversations</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Start New Chat</span>
        </button>
      </div>

      {/* Simple Search */}
      <div className="px-4 pb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-6 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        )}

        {!isLoading && filteredConversations.length === 0 && (
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-4.126-.98L3 21l1.98-5.874A8.955 8.955 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No conversations yet</p>
            <p className="text-gray-400 text-xs mt-1">Start chatting to see your history</p>
          </div>
        )}

        {!isLoading && filteredConversations.map((conversation) => {
          // Add null checks for conversation properties
          const threadId = conversation?.thread_id;
          const title = conversation?.title || 'Untitled Conversation';
          const updatedAt = conversation?.updated_at;
          const messageCount = conversation?.message_count || 0;

          if (!threadId) return null; // Skip invalid conversations

          const handleConversationClick = (e) => {
            handleLoadConversation(threadId, e);
          };

          return (
            <div
              key={threadId}
              className="mx-3 mb-1 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-200"
              onClick={handleConversationClick}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {truncateTitle(title)}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatDate(updatedAt)}</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                      {messageCount} msg{messageCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <button
                  data-delete="true"
                  onClick={(e) => handleDeleteConversation(threadId, e)}
                  className="opacity-0 group-hover:opacity-100 ml-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clean Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-center text-xs text-gray-500">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Your conversations are private & secure
        </div>
      </div>
    </div>
  );
};

export default ChatHistory; 