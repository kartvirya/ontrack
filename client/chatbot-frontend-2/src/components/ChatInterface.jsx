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

  const { user, isAuthenticated, isAdmin, logout, getAuthHeaders, API_URL } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const inputRef = useRef(null);

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
      message: 'Conversation loaded successfully',
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
        // Remove description from the displayed message
        const assistantMessage = {
          role: 'assistant',
          content: `Here's the ${data.trainPart.displayName}`, // Remove description
          trainPart: data.trainPart,
          assistantType: data.assistantType
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Regular message without train part
        const assistantMessage = {
          role: 'assistant',
          content: data.message,
          assistantType: data.assistantType
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Detailed error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthClick = () => {
    navigate('/auth');
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
                  e.target.src = "/fallback-image.jpg"; // Provide a fallback image path
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
        <div>{finalContent}</div>
      </div>
    );
  };

  // Change from "bg-gray-50" to "bg-gray-100" to match darker gray 
  const chatBackgroundClass = "bg-gray-100";

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts 
        onToggleSidebar={toggleSidebar}
        onNewChat={handleNewChat}
        onFocusInput={focusInput}
      />

      {/* Chat History Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
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
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => toggleSidebar()}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              title="Toggle History"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">OnTrack Assistant</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            {isAuthenticated() ? (
              <>
                <span className="text-sm text-gray-600">
                  Welcome, {user?.username}!
                </span>
                <button
                  onClick={() => navigate('/profile')}
                  className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                  title="Profile"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
                {isAdmin() && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                    title="Admin Panel"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={logout}
                  className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                  title="Logout"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={handleAuthClick}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        <div className="flex-grow overflow-auto">
          <div>
            {messages.length === 0 && (
              <div className="py-10 px-4 text-center text-gray-400">
                <p>How can I help you today?</p>
                {!isAuthenticated() && (
                  <p className="text-sm mt-2">
                    <button
                      onClick={handleAuthClick}
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      Create an account
                    </button>
                    {' '}to get your personal AI assistant with enhanced capabilities and chat history.
                  </p>
                )}
                {isAuthenticated() && (
                  <p className="text-sm mt-2 text-gray-500">
                    Click the menu button <svg className="w-4 h-4 inline mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg> to access your chat history.
                  </p>
                )}
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`py-6 px-4 text-black ${
                  message.role === 'user' 
                    ? 'bg-white' 
                    : 'bg-gray-50'
                }`}
              >
                <div className="container mx-auto max-w-3xl">
                  {renderMessageContent(message)}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="py-6 px-4 bg-gray-50 text-black">
                <div className="container mx-auto max-w-3xl">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t p-4">
          <div className="container mx-auto max-w-3xl">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-grow p-3 border rounded-lg text-black"
                disabled={isLoading}
                ref={inputRef}
              />
              <LoadingButton
                type="submit"
                loading={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                disabled={!input.trim()}
              >
                Send
              </LoadingButton>
            </form>
          </div>
        </div>
      </div>

      {/* Image popup modal */}
      {imagePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setImagePopup(null)}>
          <div className="max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{imagePopup.name}</h3>
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
                alt={imagePopup.name}
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
