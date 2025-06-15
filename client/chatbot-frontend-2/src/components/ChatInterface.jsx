import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TableFormatter from './TableFormatter';
import ChatHistory from './ChatHistory';
import KeyboardShortcuts from './KeyboardShortcuts';
import { LoadingButton } from './LoadingSpinner';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationSystem';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [imagePopup, setImagePopup] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { user, isAuthenticated, isAdmin, logout, getAuthHeaders, API_URL } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clear chat state when user logs out
  useEffect(() => {
    if (!isAuthenticated()) {
      setMessages([]);
      setThreadId(null);
      setShowSidebar(false);
    }
  }, [isAuthenticated]);

  // Save conversation to backend when messages change
  const saveConversation = useCallback(async () => {
    if (!isAuthenticated() || !threadId || messages.length === 0) return;

    try {
      // Generate a title from the first user message
      const firstUserMessage = messages.find(msg => msg.role === 'user');
      const title = firstUserMessage ? 
        firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '') :
        'Untitled Conversation';

      console.log('Saving conversation:', { threadId, title, messageCount: messages.length });

      const response = await fetch(`${API_URL}/api/chat/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          threadId,
          title,
          messages
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to save conversation:', errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Conversation saved successfully:', result);
    } catch (error) {
      console.error('Error saving conversation:', error);
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save conversation. Your messages may not be preserved.',
        duration: 5000
      });
    }
  }, [isAuthenticated, threadId, messages, API_URL, getAuthHeaders, addNotification]);

  useEffect(() => {
    if (isAuthenticated() && threadId && messages.length > 0) {
      saveConversation();
    }
  }, [messages, threadId, isAuthenticated, saveConversation]);

  const handleLoadConversation = (loadedMessages, loadedThreadId) => {
    setMessages(loadedMessages);
    setThreadId(loadedThreadId);
    addNotification({
      type: 'success',
      message: 'Chat loaded successfully! 💬',
      duration: 3000
    });
  };

  const handleNewChat = () => {
    setMessages([]);
    setThreadId(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const toggleSidebar = (forceState = null) => {
    if (forceState !== null) {
      setShowSidebar(forceState);
    } else {
      setShowSidebar(!showSidebar);
    }
  };

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders() // Include auth headers if user is logged in
      };

      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          message: input,
          threadId: threadId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setThreadId(data.threadId);

      // Check if the response is a train part image
      if (data.isTrainPart && data.trainPart) {
        // Create message with train part information
        const assistantMessage = {
          role: 'assistant',
          content: `Here's the ${data.trainPart.displayName}`,
          trainPart: data.trainPart,
          assistantType: data.assistantType,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Regular message without train part
        const assistantMessage = {
          role: 'assistant',
          content: data.message,
          assistantType: data.assistantType,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Detailed error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthClick = () => {
    navigate('/auth');
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout(navigate);
      addNotification({
        type: 'success',
        title: 'Logged Out',
        message: 'You have been successfully logged out',
        duration: 4000
      });
    } catch (error) {
      console.error('Logout error:', error);
      addNotification({
        type: 'error',
        title: 'Logout Error',
        message: 'There was an issue logging out, but you have been signed out locally',
        duration: 5000
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Function to render message content with clickable images and formatted tables
  const renderMessageContent = (message) => {
    // Handle train part images from our backend
    if (message.trainPart && message.trainPart.imageUrl) {
      return (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span>{message.content}</span>
            {message.assistantType === 'personal' && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Personal Assistant
              </span>
            )}
          </div>
          <div className="mt-4 border rounded-lg overflow-hidden bg-white">
            <div className="p-2 bg-gray-100 border-b">
              <h3 className="font-medium text-gray-800">
                {message.trainPart.displayName || message.trainPart.name}
              </h3>
            </div>
            <div className="relative">
              <img 
                src={message.trainPart.imageUrl} 
                alt={message.trainPart.displayName || message.trainPart.name}
                className="max-w-full w-full cursor-pointer hover:opacity-90 transition-opacity"
                style={{ maxHeight: '300px', objectFit: 'contain' }}
                onClick={() => setImagePopup({
                  url: message.trainPart.imageUrl,
                  title: message.trainPart.displayName || message.trainPart.name
                })}
                onError={(e) => {
                  console.error('Image failed to load:', e);
                  e.target.src = "/fallback-image.svg";
                }}
              />
              <div className="absolute bottom-2 right-2 bg-blue-500 text-white p-1 rounded-lg text-xs">
                Click to enlarge
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Handle normal content with potential tables
    const content = message.content;
    
    // Check if the content might contain markdown tables
    if (content.includes('|') && content.includes('\n')) {
      return (
        <div>
          <div className="flex items-center gap-2 mb-2">
            {message.assistantType === 'personal' && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Personal Assistant
              </span>
            )}
          </div>
          <TableFormatter content={content} />
        </div>
      );
    }
    
    // Otherwise, use the existing image rendering
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    let match;
    let lastIndex = 0;
    const parts = [];

    // Find all image tags in the content
    while ((match = imgRegex.exec(content)) !== null) {
      // Add the text before the image
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      // Extract the src from the image tag
      const imgSrc = match[1];

      // Add a clickable image
      parts.push(
        <img 
          key={match.index}
          src={imgSrc} 
          alt="Chat content"
          className="max-w-full my-2 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setImagePopup({ url: imgSrc, title: "Image" })}
          style={{ maxHeight: '300px' }}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Add any remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    // If no images were found, return the original content with assistant type indicator
    const finalContent = parts.length > 0 ? parts : content;
    
    return (
      <div>
        {message.assistantType === 'personal' && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Personal Assistant
            </span>
          </div>
        )}
        <div className="whitespace-pre-wrap">{finalContent}</div>
      </div>
    );
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts 
        onToggleSidebar={toggleSidebar}
        onNewChat={handleNewChat}
        onFocusInput={focusInput}
      />

      {/* Chat History Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-lg">
      <ChatHistory 
        onLoadConversation={handleLoadConversation}
        onNewChat={handleNewChat}
            onClose={() => toggleSidebar(false)}
          />
        </div>
      )}

        {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-slate-100 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
                <button
              onClick={() => toggleSidebar()}
              className={`p-2 rounded-xl transition-all duration-200 ${
                isAuthenticated() 
                  ? 'hover:bg-blue-50 text-blue-600 border border-blue-200 shadow-sm' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
            <div className="flex items-center space-x-3">
              <div className="h-12 relative">
                <img 
                  src="/Lisa Logo.png" 
                  alt="LISA" 
                  className="h-full object-contain lisa-logo"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<span class="text-blue-600 font-bold text-sm">L</span>';
                  }}
                />
              </div>
              </div>
            </div>
            
          <div className="flex items-center space-x-3">
              {isAuthenticated() ? (
              <>
                <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-700 font-medium">
                    {user?.username}
                  </span>
                </div>
                        <button
                  onClick={() => navigate('/profile')}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Profile"
                        >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                        </button>
                {isAdmin() && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Admin Panel"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                )}
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoggingOut ? (
                      <>
                        <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        Logging out...
                      </>
                    ) : (
                      'Logout'
                    )}
                  </button>
              </>
              ) : (
                  <button
                onClick={handleAuthClick}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 text-sm font-medium shadow-lg"
                  >
                    Sign In
                  </button>
              )}
            </div>
          </div>
          
        {/* Messages Area */}
        <div className="flex-1 overflow-auto bg-slate-100">
          <div className="max-w-4xl mx-auto">
              {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-20 px-6">
                <div className="text-center space-y-6">
                  {/* Welcome Icon */}
                  <div className=" flex items-center justify-center h-24 relative">
                    <img 
                      src="/Lisa Logo.png" 
                      alt="LISA" 
                      className="h-full lisa-logo"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '<span class="text-blue-600 font-bold text-2xl">L</span>';
                      }}
                    />
                  </div>
                  
                  {/* Welcome Message */}
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold text-gray-800">
                      Welcome to LISA! 👋
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl">
                      Your AI assistant for train maintenance, technical support, and questions about train components, systems, and procedures.
                    </p>
                  </div>

d

                  {/* Auth Section */}
                  {!isAuthenticated() ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-8 max-w-md mx-auto">
                      <div className="text-center space-y-3">
                        <h3 className="font-semibold text-blue-900">Get More Features</h3>
                        <p className="text-sm text-blue-700">
                          Sign in to access your personal AI assistant with enhanced capabilities and chat history.
                        </p>
                        <button
                          onClick={handleAuthClick}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Create Account / Sign In
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 mt-8 max-w-md mx-auto">
                      <div className="text-center space-y-2">
                        <h3 className="font-semibold text-green-900">
                          Welcome back, {user?.username}! 🎉
                        </h3>
                        <p className="text-sm text-green-700">
                          Your conversations are automatically saved and you have access to enhanced features.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Suggested Questions */}
                  <div className="mt-8 space-y-3">
                    <p className="text-sm text-gray-500">Try asking me about:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[
                        "SD60M locomotive maintenance",
                        "IETMS system troubleshooting", 
                        "Train component inspection",
                        "Safety procedures"
                      ].map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => setInput(suggestion)}
                          className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                </div>
              )}

            {/* Messages */}
              {messages.map((message, index) => (
                <div
                  key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-6 px-4`}
              >
                <div className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white ml-3' 
                      : 'text-gray-600 mr-3'
                  }`}>
                    {message.role === 'user' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden lisa-logo-container">
                        <img 
                          src="/Lisa Logo.png" 
                          alt="LISA" 
                          className="w-5 h-5 object-contain lisa-logo"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '<span class="text-blue-600 font-bold text-xs">L</span>';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}>
                    <div className="space-y-2">
                      {/* Message Content */}
                      <div className={`${message.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
                    {renderMessageContent(message)}
                      </div>
                      
                      {/* Timestamp */}
                      <div className={`text-xs ${
                        message.role === 'user' 
                          ? 'text-blue-100' 
                          : 'text-gray-400'
                      } text-right`}>
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              ))}

            {/* Loading Animation */}
              {isLoading && (
              <div className="flex justify-start mb-6 px-4">
                <div className="flex items-start space-x-3 max-w-[80%]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full lisa-logo-container flex items-center justify-center overflow-hidden">
                    <img 
                      src="/Lisa Logo.png" 
                      alt="LISA" 
                      className="w-5 h-5 object-contain lisa-logo"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '<span class="text-blue-600 font-bold text-xs">L</span>';
                      }}
                    />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
          </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-slate-200/95 backdrop-blur-sm p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full p-4 pr-12 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                  disabled={isLoading}
                  ref={inputRef}
                />
                {input.trim() && (
                  <button
                    type="button"
                    onClick={() => setInput('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
                <LoadingButton
                  type="submit"
                  loading={isLoading}
                className="px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg font-medium"
                  disabled={!input.trim()}
                >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                </LoadingButton>
              </form>
          </div>
        </div>
      </div>

      {/* Image popup modal */}
      {imagePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setImagePopup(null)}>
          <div className="max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{imagePopup.title}</h3>
              <button 
                onClick={() => setImagePopup(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <img 
                src={imagePopup.url} 
                alt={imagePopup.title} 
                className="max-w-full max-h-[70vh] object-contain mx-auto" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
