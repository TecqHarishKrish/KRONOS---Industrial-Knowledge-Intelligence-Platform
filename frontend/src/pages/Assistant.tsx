import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Loader, 
  ShieldAlert, 
  Calendar
} from 'lucide-react';
import api from '../services/api';

interface Citation {
  document_id: number;
  filename: string;
  version: number;
  text: string;
}

interface TimelineItem {
  id: number;
  date: string;
  title: string;
  description: string;
  type: string;
}

interface GraphNodeItem {
  id: number;
  name: string;
  node_type: string;
}

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timeline?: TimelineItem[];
  graph_nodes?: GraphNodeItem[];
  confidence_score?: number;
  created_at: string;
}

interface Conversation {
  id: number;
  title: string;
  created_at: string;
}

const Assistant: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('New Operation Query');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const location = useLocation();

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (location.state && (location.state as any).prefilledQuestion) {
      setInputValue((location.state as any).prefilledQuestion);
      // Clear location state from history
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (currentConvId) {
      fetchMessages(currentConvId);
    }
  }, [currentConvId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/chat/conversations');
      setConversations(response.data);
      if (response.data.length > 0 && !currentConvId) {
        setCurrentConvId(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    }
  };

  const fetchMessages = async (convId: number) => {
    try {
      const response = await api.get(`/chat/conversations/${convId}`);
      const data = response.data;
      // Convert JSON strings to objects
      const formattedMessages = data.messages.map((m: any) => ({
        ...m,
        citations: m.citations_json ? JSON.parse(m.citations_json) : [],
        timeline: m.timeline_json ? JSON.parse(m.timeline_json) : [],
        graph_nodes: m.graph_nodes_json ? JSON.parse(m.graph_nodes_json) : [],
      }));
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Failed to load chat message log:', error);
    }
  };

  const handleStartConversation = async () => {
    try {
      const response = await api.post('/chat/conversations', { title: newTitle });
      setConversations((prev) => [response.data, ...prev]);
      setCurrentConvId(response.data.id);
      setNewTitle('New Operation Query');
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !currentConvId) return;

    const userText = inputValue;
    setInputValue('');
    setLoading(true);

    // Append user message immediately
    const tempUserMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: userText,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await api.post(`/chat/conversations/${currentConvId}/messages`, {
        content: userText
      });
      
      const newMsg = response.data;
      const formattedMsg: Message = {
        ...newMsg,
        citations: newMsg.citations_json ? JSON.parse(newMsg.citations_json) : [],
        timeline: newMsg.timeline_json ? JSON.parse(newMsg.timeline_json) : [],
        graph_nodes: newMsg.graph_nodes_json ? JSON.parse(newMsg.graph_nodes_json) : [],
      };
      
      setMessages((prev) => [...prev, formattedMsg]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[75vh] overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-lg">
      
      {/* Conversations List Left Panel */}
      <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between select-none">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <button 
            onClick={handleStartConversation}
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus size={16} />
            New Operation Query
          </button>
        </div>
        
        {/* Chats list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setCurrentConvId(conv.id)}
              className={`flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors truncate ${
                currentConvId === conv.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:text-zinc-950 dark:hover:text-zinc-50'
              }`}
            >
              <MessageSquare size={14} className="shrink-0" />
              <span className="truncate">{conv.title}</span>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-center text-zinc-500 text-xs py-10">No queries started yet.</p>
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col justify-between h-full bg-white dark:bg-zinc-900 overflow-hidden">
        {/* Chat Header */}
        <div className="h-14 px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
            {conversations.find((c) => c.id === currentConvId)?.title || 'Operation Workspace'}
          </h3>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            
            return (
              <div 
                key={msg.id} 
                className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {/* Avatar */}
                {!isUser && (
                  <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shrink-0 text-sm">
                    AI
                  </div>
                )}

                {/* Message Box */}
                <div className={`max-w-[80%] rounded-xl p-4 border ${
                  isUser 
                    ? 'bg-blue-600 border-blue-500 text-white rounded-tr-none' 
                    : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 rounded-tl-none'
                }`}>
                  
                  {/* Message Content */}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                  {/* Assistant extra metrics (Citations, Timelines, Confidence) */}
                  {!isUser && (
                    <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-850 space-y-4">
                      
                      {/* Confidence Indicator */}
                      {msg.confidence_score !== undefined && (
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Confidence</span>
                          <div className="w-32 bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                msg.confidence_score > 0.7 
                                  ? 'bg-emerald-500' 
                                  : msg.confidence_score > 0.4
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${msg.confidence_score * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold">{msg.confidence_score.toFixed(2)}</span>
                        </div>
                      )}

                      {/* Warnings Alert Box */}
                      {/* Note: In our model, warnings are written inline or we scan if there are conflicts */}
                      {msg.content.includes("⚠️ CONFLICT WARNINGS") && (
                        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-lg p-3 flex gap-2 text-rose-800 dark:text-rose-400 text-xs">
                          <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Compliance/Operational Conflict Detected!</span>
                            <p className="mt-1 leading-relaxed">
                              This response contains references to documents that have conflicting operating pressure values or use superseded procedures. Check details below.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Citations list */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider block mb-2">Sources Referenced</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.citations.map((cit, idx) => (
                              <div key={idx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-2.5 text-xs flex flex-col justify-between">
                                <span className="font-bold truncate" title={cit.filename}>{cit.filename}</span>
                                <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-400">
                                  <span>Version v{cit.version}</span>
                                  <span className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.2 rounded">Source {idx+1}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Timeline Events link / display */}
                      {msg.timeline && msg.timeline.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider block mb-2 flex items-center gap-1">
                            <Calendar size={12} />
                            Chronological Operations
                          </span>
                          <div className="space-y-2 border-l border-zinc-200 dark:border-zinc-800 pl-3.5 py-1">
                            {msg.timeline.map((item, idx) => (
                              <div key={idx} className="relative text-xs leading-relaxed">
                                <div className="absolute -left-[19.5px] top-1.5 h-2 w-2 rounded-full bg-blue-500"></div>
                                <span className="font-semibold text-[10px] text-zinc-400">{item.date}</span>
                                <h4 className="font-bold text-zinc-900 dark:text-zinc-200 text-xs mt-0.5">{item.title}</h4>
                                <p className="text-[10px] text-zinc-400">{item.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="h-8 w-8 rounded-lg bg-zinc-700 flex items-center justify-center text-white font-bold shrink-0 text-sm">
                    ME
                  </div>
                )}
              </div>
            );
          })}
          
          {loading && (
            <div className="flex gap-4 justify-start">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shrink-0 text-sm">
                AI
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 rounded-tl-none flex items-center gap-2 text-zinc-500 text-sm">
                <Loader size={16} className="animate-spin" />
                <span>Multi-agent logic processing...</span>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-950 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              placeholder="Ask a question (e.g., 'Is there any conflict in the Pump-7 SOPs?' or 'What is the active procedure?')"
              disabled={loading || !currentConvId}
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim() || !currentConvId}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg p-2.5 font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Assistant;
