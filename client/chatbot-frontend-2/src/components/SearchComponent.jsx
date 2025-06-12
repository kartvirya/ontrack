import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

const SearchComponent = ({ 
  onSearch, 
  placeholder = "Search conversations...", 
  showFilters = false,
  className = "" 
}) => {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: 'all',
    messageType: 'all',
    sortBy: 'recent'
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const inputRef = useRef(null);
  const { API_URL, getAuthHeaders } = useAuth();

  // Focus input when component mounts
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const performSearch = useCallback(() => {
    if (onSearch) {
      onSearch({
        query: query.trim(),
        filters
      });
    }
  }, [onSearch, query, filters]);

  const fetchSuggestions = useCallback(async () => {
    if (!query.trim() || query.length < 2) return;

    try {
      const response = await fetch(
        `${API_URL}/api/chat/search/suggestions?q=${encodeURIComponent(query)}`,
        {
          headers: getAuthHeaders()
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  }, [query, API_URL, getAuthHeaders]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch();
        fetchSuggestions();
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filters, performSearch, fetchSuggestions]);

  const handleSubmit = (e) => {
    e.preventDefault();
    performSearch();
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    if (onSearch) {
      onSearch({
        query: suggestion,
        filters
      });
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    if (onSearch) {
      onSearch({
        query: '',
        filters
      });
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Search Bar */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
            className="w-full pl-10 pr-12 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          
          <div className="absolute inset-y-0 right-0 flex items-center">
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-1 text-gray-400 hover:text-gray-600 mr-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            {showFilters && (
              <button
                type="button"
                onClick={toggleExpanded}
                className={`p-1 mr-2 rounded ${isExpanded ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Search Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center">
                  <svg className="w-3 h-3 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {suggestion}
                </div>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Advanced Filters */}
      {showFilters && isExpanded && (
        <div className="mt-3 p-4 bg-gray-50 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>

            {/* Message Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Message Type
              </label>
              <select
                value={filters.messageType}
                onChange={(e) => handleFilterChange('messageType', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1"
              >
                <option value="all">All Messages</option>
                <option value="user">My Messages</option>
                <option value="assistant">Assistant Replies</option>
                <option value="images">With Images</option>
                <option value="schematics">With Schematics</option>
              </select>
            </div>

            {/* Sort By Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1"
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="relevance">Most Relevant</option>
                <option value="length">Message Length</option>
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="mt-3 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                setFilters({
                  dateRange: 'all',
                  messageType: 'all',
                  sortBy: 'recent'
                });
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Reset Filters
            </button>
            
            <div className="text-xs text-gray-500">
              {Object.values(filters).filter(v => v !== 'all' && v !== 'recent').length} filters active
            </div>
          </div>
        </div>
      )}

      {/* Search Shortcuts Help */}
      <div className="mt-2 text-xs text-gray-500">
        <span>Press </span>
        <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Ctrl+K</kbd>
        <span> to focus search</span>
      </div>
    </div>
  );
};

export default SearchComponent; 