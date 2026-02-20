// =============================================================================
//  Chatbot.tsx — AI-Powered Alumni Hub Chat Assistant
//  Connects to the Node.js backend (/api/chat/message), which in turn
//  calls the Python AI agent (llama3.2:1b via Ollama) on port 8000.
//
//  Features:
//  - Real AI responses via LLM
//  - Career roadmap generation trigger
//  - Roadmap display in a formatted message
//  - Chat history persistence
//  - Role-based suggestions
// =============================================================================

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, MapPin, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { gsap } from '@/hooks/useGSAP';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isRoadmap?: boolean;
}

// Roadmap generation steps
type RoadmapStep = 'idle' | 'awaiting_github' | 'awaiting_skills' | 'awaiting_goal' | 'generating';

interface RoadmapData {
  github_summary: string;
  linkedin_skills: string;
  career_goal: string;
}

// ─────────────────────────────────────────────────────────────────────────────

const Chatbot = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your **Alumni Hub AI Assistant** 🤖\n\nI can help you with:\n• Events & Jobs\n• Alumni Connections\n• Mentorship info\n• Career Roadmap generation\n\nHow can I help you today?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [roadmapStep, setRoadmapStep] = useState<RoadmapStep>('idle');
  const [roadmapData, setRoadmapData] = useState<Partial<RoadmapData>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Role-based quick suggestions ──────────────────────────────────────────
  const getSuggestions = () => {
    if (roadmapStep !== 'idle') return [];           // Hide during roadmap flow
    if (!user) return ['How do I register?', 'What is Alumni Hub?'];
    switch (user.role) {
      case 'student':
        return ['Upcoming events', 'Job openings', 'Generate roadmap', 'Find mentor'];
      case 'alumni':
        return ['Post a job', 'Mentorship info', 'Donation options'];
      case 'admin':
        return ['Pending approvals', 'User management', 'Analytics'];
      default:
        return ['Help', 'Contact support'];
    }
  };

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── GSAP open animation ───────────────────────────────────────────────────
  useEffect(() => {
    if (panelRef.current && isOpen) {
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power3.out' }
      );
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // ── Load chat history on open ─────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && messages.length === 1 && user) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/chat/history?limit=20', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.chatHistory.length > 0) {
        const hist: Message[] = [];
        data.chatHistory.forEach((c: any) => {
          hist.push({ id: `h-u-${c._id}`, text: c.message, sender: 'user', timestamp: new Date(c.createdAt) });
          hist.push({ id: `h-b-${c._id}`, text: c.response, sender: 'bot', timestamp: new Date(c.createdAt) });
        });
        setMessages(prev => [...prev, ...hist]);
      }
    } catch {
      // Silent — history is optional
    }
  };

  // ── Add a bot message helper ───────────────────────────────────────────────
  const addBotMessage = (text: string, isRoadmap = false) => {
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), text, sender: 'bot', timestamp: new Date(), isRoadmap },
    ]);
  };

  // ── Roadmap multi-step flow ───────────────────────────────────────────────
  const handleRoadmapFlow = async (userText: string) => {
    switch (roadmapStep) {

      case 'awaiting_github':
        setRoadmapData(prev => ({ ...prev, github_summary: userText }));
        setRoadmapStep('awaiting_skills');
        addBotMessage("✅ Got it!\n\n**Step 2/3** — What are your LinkedIn skills?\n_(e.g. Python, SQL, REST APIs, Git)_");
        break;

      case 'awaiting_skills':
        setRoadmapData(prev => ({ ...prev, linkedin_skills: userText }));
        setRoadmapStep('awaiting_goal');
        addBotMessage("✅ Great!\n\n**Step 3/3** — What is your career goal?\n_(e.g. Backend Engineer at a product startup)_");
        break;

      case 'awaiting_goal': {
        const finalData = { ...roadmapData, career_goal: userText } as RoadmapData;
        setRoadmapData(finalData);
        setRoadmapStep('generating');
        addBotMessage("🔄 Generating your personalised 6-week roadmap... This may take 30–60 seconds, please wait! ⏳");
        setIsTyping(true);

        try {
          const token = localStorage.getItem('token');
          const res = await fetch('/api/chat/roadmap', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              session_id: (user as any)?.id || (user as any)?._id || 'guest',
              github_summary: finalData.github_summary,
              linkedin_skills: finalData.linkedin_skills,
              career_goal: finalData.career_goal,
            }),
          });

          const data = await res.json();
          setIsTyping(false);

          if (data.success) {
            addBotMessage(`🗺️ **Your Personalised 6-Week Career Roadmap**\n\n${data.roadmap}`, true);
          } else {
            addBotMessage("⚠️ Sorry, I couldn't generate the roadmap right now. Please try again in a moment.");
          }
        } catch {
          setIsTyping(false);
          addBotMessage("⚠️ Connection error. Make sure the AI service is running on port 8000.");
        }

        setRoadmapStep('idle');
        setRoadmapData({});
        break;
      }

      default:
        break;
    }
  };

  // ── Send message to AI backend ────────────────────────────────────────────
  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userText = inputValue.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      text: userText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    // ── Roadmap multi-step handler ──────────────────────────────────────────
    if (roadmapStep !== 'idle') {
      await handleRoadmapFlow(userText);
      return;
    }

    // ── Roadmap trigger keywords ───────────────────────────────────────────
    const lower = userText.toLowerCase();
    if (lower.includes('roadmap') || lower.includes('career plan') || lower.includes('generate roadmap')) {
      setRoadmapStep('awaiting_github');
      addBotMessage(
        "🚀 **Career Roadmap Generator**\n\nI'll build a personalised 6-week roadmap for you!\n\n**Step 1/3** — Describe your GitHub profile:\n_(e.g. Built 3 Flask APIs, familiar with Git and basic SQL)_"
      );
      return;
    }

    // ── Normal AI chat ────────────────────────────────────────────────────
    setIsTyping(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userText }),
      });

      const data = await res.json();
      setIsTyping(false);

      if (data.success) {
        addBotMessage(data.response);
      } else {
        addBotMessage("Sorry, I had trouble responding. Please try again.");
      }
    } catch {
      setIsTyping(false);
      addBotMessage("⚠️ Could not reach the server. Please check your connection.");
    }
  };

  const handleSuggestionClick = (s: string) => {
    setInputValue(s);
    inputRef.current?.focus();
  };

  const clearChat = () => {
    setMessages([{
      id: '1',
      text: "Chat cleared! How can I help you?",
      sender: 'bot',
      timestamp: new Date(),
    }]);
    setRoadmapStep('idle');
    setRoadmapData({});
    const token = localStorage.getItem('token');
    fetch('/api/chat/history', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => { });
  };

  // ── Render text with basic markdown formatting ────────────────────────────
  const renderText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating Button ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full 
          bg-primary text-primary-foreground shadow-xl shadow-primary/30
          flex items-center justify-center transition-all duration-300
          hover:scale-110 hover:shadow-2xl hover:shadow-primary/40
          ${isOpen ? 'rotate-90' : ''}`}
        aria-label="Toggle AI Chat Assistant"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* ── Chat Panel ── */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] 
            glass-solid rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          style={{ maxHeight: '560px' }}
        >
          {/* Header */}
          <div className="bg-primary p-4 text-primary-foreground flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Alumni Hub AI Assistant</h3>
                  <p className="text-xs opacity-80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block animate-pulse" />
                    Powered by llama3.2
                  </p>
                </div>
              </div>
              <button
                onClick={clearChat}
                className="opacity-70 hover:opacity-100 transition-opacity p-1 rounded"
                title="Clear chat"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 0 }}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                    }`}
                >
                  {message.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[78%] p-3 rounded-2xl text-sm leading-relaxed ${message.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : message.isRoadmap
                      ? 'bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 text-foreground rounded-tl-sm font-mono text-xs whitespace-pre-wrap'
                      : 'bg-muted text-foreground rounded-tl-sm'
                    }`}
                >
                  {message.isRoadmap ? (
                    <>
                      <div className="flex items-center gap-1 mb-2 font-bold text-primary not-italic not-mono text-sm">
                        <MapPin size={14} />
                        6-Week Career Roadmap
                      </div>
                      <div className="whitespace-pre-wrap text-xs">{message.text.replace(/^🗺️ \*\*Your Personalised 6-Week Career Roadmap\*\*\n\n/, '')}</div>
                    </>
                  ) : (
                    <p dangerouslySetInnerHTML={{ __html: renderText(message.text) }} />
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
                  <Bot size={16} />
                </div>
                <div className="bg-muted p-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-xs text-muted-foreground ml-1">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion chips */}
          {getSuggestions().length > 0 && (
            <div className="px-4 pb-2 flex gap-2 flex-wrap flex-shrink-0">
              {getSuggestions().map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(s)}
                  className="text-xs bg-muted hover:bg-primary hover:text-primary-foreground 
                    px-3 py-1.5 rounded-full transition-colors duration-200 whitespace-nowrap"
                >
                  {s === 'Generate roadmap' ? '🗺️ ' : ''}{s}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="p-4 border-t border-border flex-shrink-0">
            {roadmapStep !== 'idle' && roadmapStep !== 'generating' && (
              <p className="text-xs text-muted-foreground mb-2">
                {roadmapStep === 'awaiting_github' && '📝 Enter your GitHub profile summary'}
                {roadmapStep === 'awaiting_skills' && '🛠️ Enter your LinkedIn skills'}
                {roadmapStep === 'awaiting_goal' && '🎯 Enter your career goal'}
              </p>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isTyping && handleSend()}
                placeholder={
                  roadmapStep === 'awaiting_github' ? 'Describe your GitHub...' :
                    roadmapStep === 'awaiting_skills' ? 'e.g. Python, SQL, Git...' :
                      roadmapStep === 'awaiting_goal' ? 'e.g. Backend Engineer...' :
                        'Type a message...'
                }
                disabled={isTyping || roadmapStep === 'generating'}
                className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none 
                  focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping || roadmapStep === 'generating'}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground 
                  flex items-center justify-center disabled:opacity-50 
                  disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
