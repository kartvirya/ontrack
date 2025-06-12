import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const KeyboardShortcuts = ({ onToggleSidebar, onNewChat, onFocusInput }) => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check if user is typing in an input field
      const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
      
      // Ctrl/Cmd + K - Focus search/input
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        if (onFocusInput) {
          onFocusInput();
        }
        return;
      }

      // Don't trigger shortcuts if user is typing
      if (isInputFocused) return;

      // Escape - Close modals/sidebars
      if (event.key === 'Escape') {
        if (onToggleSidebar) {
          onToggleSidebar(false);
        }
        return;
      }

      // Ctrl/Cmd + N - New chat
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        if (onNewChat) {
          onNewChat();
        }
        return;
      }

      // Ctrl/Cmd + H - Toggle chat history
      if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
        event.preventDefault();
        if (isAuthenticated() && onToggleSidebar) {
          onToggleSidebar();
        }
        return;
      }

      // Ctrl/Cmd + P - Go to profile
      if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        if (isAuthenticated()) {
          navigate('/profile');
        }
        return;
      }

      // Ctrl/Cmd + A - Go to admin (if admin)
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        if (isAuthenticated() && isAdmin()) {
          navigate('/admin');
        }
        return;
      }

      // Ctrl/Cmd + / - Show help/shortcuts
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        showShortcutsHelp();
        return;
      }

      // Home - Go to chat
      if (event.key === 'Home') {
        event.preventDefault();
        navigate('/');
        return;
      }
    };

    const showShortcutsHelp = () => {
      const shortcuts = [
        { key: 'Ctrl/Cmd + K', description: 'Focus input field' },
        { key: 'Ctrl/Cmd + N', description: 'Start new chat' },
        { key: 'Ctrl/Cmd + H', description: 'Toggle chat history' },
        { key: 'Ctrl/Cmd + P', description: 'Go to profile' },
        { key: 'Ctrl/Cmd + A', description: 'Go to admin (admin only)' },
        { key: 'Ctrl/Cmd + /', description: 'Show this help' },
        { key: 'Home', description: 'Go to chat' },
        { key: 'Escape', description: 'Close modals/sidebars' }
      ];

      const helpText = shortcuts
        .map(s => `${s.key}: ${s.description}`)
        .join('\n');

      alert(`Keyboard Shortcuts:\n\n${helpText}`);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, isAuthenticated, isAdmin, onToggleSidebar, onNewChat, onFocusInput]);

  return null; // This component doesn't render anything
};

export default KeyboardShortcuts; 