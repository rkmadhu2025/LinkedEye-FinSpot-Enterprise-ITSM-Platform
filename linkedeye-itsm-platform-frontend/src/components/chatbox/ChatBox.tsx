/**
 * ChatBox Component
 *
 * A floating chatbox for user support and AI assistance.
 */

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Minimize2, User, Bot, RefreshCw } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  suggestions?: string[];
  actions?: Array<{
    label: string;
    action: string;
    url?: string;
    icon?: string;
  }>;
}

interface ChatBoxProps {
  enableAI?: boolean;
  greeting?: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  enableAI = false,
  greeting = "Hello! How can I help you today?"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: greeting,
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    }).format(date);
  };

  const handleSend = async (directMessage?: string) => {
    const messageToSend = directMessage || inputValue;
    if (!messageToSend.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageToSend,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = messageToSend;
    setInputValue('');

    if (enableAI) {
      setIsTyping(true);
      try {
        const response = await fetch('/api/v1/chat/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            message: messageText,
            context: {}
          })
        });

        if (response.ok) {
          const data = await response.json();
          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: data.message,
            sender: 'bot',
            timestamp: new Date(),
            suggestions: data.suggestions,
            actions: data.actions
          };
          setMessages(prev => [...prev, botMessage]);
        } else {
          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: getBotResponse(messageText),
            sender: 'bot',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, botMessage]);
        }
      } catch (error) {
        console.error('Chat API error:', error);
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: getBotResponse(messageText),
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } finally {
        setIsTyping(false);
      }
    } else {
      // Non-AI mode: use local fallback response
      setIsTyping(true);
      // Simulate a brief delay for better UX
      setTimeout(() => {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: getBotResponse(messageText),
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      }, 500);
    }
  };

  const getBotResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    if (input.includes('incident')) {
      return "I can help you create or manage incidents. Would you like to create a new incident or view existing ones?";
    } else if (input.includes('asset')) {
      return "I can assist with asset management. You can view, create, or search for assets in the system.";
    } else if (input.includes('help')) {
      return "I'm your IT Service Management assistant. I can help you with creating incidents, managing assets, viewing network topology, and generating reports. What would you like to do?";
    } else {
      return "Thank you for your message. Our team will assist you shortly. For immediate help, try asking about incidents, assets, or type 'help'.";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleActionClick = (action: { action: string; url?: string; label: string }) => {
    if (action.action === 'navigate' && action.url) {
      window.location.href = action.url;
    } else {
      handleSend(action.label);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const handleClear = () => {
    setMessages([
      {
        id: '1',
        content: greeting,
        sender: 'bot',
        timestamp: new Date()
      }
    ]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-primary-600 to-primary-800 text-white p-4 rounded-full shadow-2xl hover:shadow-primary-500/50 hover:scale-110 transition-all duration-300 z-50 group"
        aria-label="Open chat"
      >
        <MessageCircle size={24} className="group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 bg-danger-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
          1
        </span>
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 z-50 transition-all duration-300 ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gradient-to-r from-primary-900/90 to-primary-800/90 backdrop-blur-md rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Bot size={20} className="text-white" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-success-500 rounded-full border-2 border-gray-900"></span>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">IT Support Assistant</h3>
            <p className="text-gray-400 text-xs">Online</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            aria-label="Clear chat"
            title="Clear chat"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            aria-label="Minimize"
          >
            <Minimize2 size={16} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            aria-label="Close chat"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <React.Fragment>
          <div className="h-[calc(100%-140px)] overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.sender === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-br from-gray-600 to-gray-700'
                      : 'bg-gradient-to-br from-primary-500 to-primary-700'
                  }`}
                >
                  {message.sender === 'user' ? (
                    <User size={16} className="text-white" />
                  ) : (
                    <Bot size={16} className="text-white" />
                  )}
                </div>

                <div
                  className={`max-w-[70%] ${
                    message.sender === 'user' ? 'items-end' : 'items-start'
                  } flex flex-col gap-1`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      message.sender === 'user'
                        ? 'bg-primary-600 text-white rounded-br-none'
                        : 'bg-gray-800 text-gray-100 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <span className="text-xs text-gray-500 px-2">
                    {formatTime(message.timestamp)}
                  </span>

                  {message.sender === 'bot' && (
                    <div className="flex flex-col gap-2 mt-1">
                      {message.actions && message.actions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {message.actions.map((action, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleActionClick(action)}
                              className="text-xs bg-white text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1 font-medium shadow-sm"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {message.suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="text-xs text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full hover:bg-blue-900/30 transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary-500 to-primary-700">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-700 bg-gray-900 rounded-b-2xl">
            <div className="flex items-end gap-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 max-h-32 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className={`p-2.5 rounded-xl transition-all duration-200 ${
                  inputValue.trim()
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/50 text-white'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
                aria-label="Send message"
              >
                <Send size={20} />
              </button>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setInputValue('I need help with incidents')}
                className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                Incidents
              </button>
              <button
                onClick={() => setInputValue('Show me my assets')}
                className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                Assets
              </button>
              <button
                onClick={() => setInputValue('help')}
                className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                Help
              </button>
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
};

export default ChatBox;
