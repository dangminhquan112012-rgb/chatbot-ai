
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, AppState, ChatSession, Language } from './types';
import { getGeminiResponse, generateImage } from './services/geminiService';
import { SendIcon, ImageIcon, BotIcon, UserIcon, TrashIcon, PlusIcon, MenuIcon } from './components/Icons';

const LOCAL_STORAGE_KEY = 'cyber_chatbot_sessions_v2';

const translations = {
  en: {
    newMission: "NEW MISSION",
    missionLogs: "MISSION LOGS",
    systemIntegrity: "SYSTEM INTEGRITY: NOMINAL",
    resetSystem: "RESET SYSTEM",
    inputPlaceholder: "Command input... (Shift+Enter for newline)",
    renderImage: "Render Image",
    secureLink: "Secure Neural Link Established | Encrypted Session",
    rendering: "RENDERING VISUAL ASSET...",
    welcomeMsg: "System Initialized. 🚀 Hello! I am Cyber Chatbot AI. Start a new mission or ask me anything!",
    newMissionPrompt: "System Initialized. New mission parameters required. 🎮",
    wipeConfirm: "Wipe all system logs? This cannot be undone.",
    atLeastOne: "At least one mission must remain active.",
    errorConn: "CRITICAL ERROR: Connection to mainframe failed.",
    gpuActive: "GPU: ACTIVATED",
    linkStable: "LINK: STABLE",
    terminate: "Terminate",
    systemStatus: "Online",
    power: "Power",
    latency: "Latency"
  },
  vi: {
    newMission: "NHIỆM VỤ MỚI",
    missionLogs: "NHẬT KÝ NHIỆM VỤ",
    systemIntegrity: "HỆ THỐNG: ỔN ĐỊNH",
    resetSystem: "KHỞI ĐỘNG LẠI",
    inputPlaceholder: "Nhập lệnh... (Shift+Enter để xuống dòng)",
    renderImage: "Tạo hình ảnh",
    secureLink: "Đã thiết lập liên kết thần kinh an toàn | Phiên mã hóa",
    rendering: "ĐANG KẾT XUẤT HÌNH ẢNH...",
    welcomeMsg: "Hệ thống đã sẵn sàng. 🚀 Xin chào! Tôi là Cyber Chatbot AI. Hãy bắt đầu nhiệm vụ mới hoặc hỏi tôi bất cứ điều gì!",
    newMissionPrompt: "Hệ thống đã khởi tạo. Vui lòng nhập thông số nhiệm vụ mới. 🎮",
    wipeConfirm: "Xóa toàn bộ nhật ký hệ thống? Hành động này không thể hoàn tác.",
    atLeastOne: "Phải giữ lại ít nhất một nhiệm vụ.",
    errorConn: "LỖI NGHIÊM TRỌNG: Kết nối với máy chủ thất bại.",
    gpuActive: "GPU: ĐANG CHẠY",
    linkStable: "KẾT NỐI: ỔN ĐỊNH",
    terminate: "Hủy bỏ",
    systemStatus: "Trực tuyến",
    power: "Năng lượng",
    latency: "Độ trễ"
  }
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          isLoading: false,
          isGeneratingImage: false,
          isSidebarOpen: window.innerWidth > 768
        };
      } catch (e) {
        console.error("Failed to load sessions", e);
      }
    }
    
    const initialSessionId = uuidv4();
    return {
      sessions: [{
        id: initialSessionId,
        title: 'New Mission',
        messages: [{
          id: 'welcome',
          role: 'assistant',
          content: translations.en.welcomeMsg,
          timestamp: new Date().toISOString()
        }],
        createdAt: new Date().toISOString()
      }],
      activeSessionId: initialSessionId,
      isLoading: false,
      isGeneratingImage: false,
      isSidebarOpen: window.innerWidth > 768,
      language: 'en'
    };
  });

  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const t = translations[state.language];

  const activeSession = useMemo(() => 
    state.sessions.find(s => s.id === state.activeSessionId) || state.sessions[0]
  , [state.sessions, state.activeSessionId]);

  useEffect(() => {
    const { isLoading, isGeneratingImage, isSidebarOpen, ...toSave } = state;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(toSave));
  }, [state.sessions, state.activeSessionId, state.language]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession.messages, state.isLoading, state.isGeneratingImage]);

  const toggleLanguage = () => {
    setState(prev => ({
      ...prev,
      language: prev.language === 'en' ? 'vi' : 'en'
    }));
  };

  const createNewSession = () => {
    const newId = uuidv4();
    const newSession: ChatSession = {
      id: newId,
      title: state.language === 'en' ? 'New Mission' : 'Nhiệm vụ mới',
      messages: [{
        id: uuidv4(),
        role: 'assistant',
        content: t.newMissionPrompt,
        timestamp: new Date().toISOString()
      }],
      createdAt: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      sessions: [newSession, ...prev.sessions],
      activeSessionId: newId,
      isSidebarOpen: window.innerWidth < 768 ? false : prev.isSidebarOpen
    }));
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (state.sessions.length <= 1) {
      alert(t.atLeastOne);
      return;
    }
    const newSessions = state.sessions.filter(s => s.id !== id);
    const newActiveId = id === state.activeSessionId ? newSessions[0].id : state.activeSessionId;
    setState(prev => ({
      ...prev,
      sessions: newSessions,
      activeSessionId: newActiveId
    }));
  };

  const deleteMessage = (msgId: string) => {
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => 
        s.id === prev.activeSessionId 
          ? { ...s, messages: s.messages.filter(m => m.id !== msgId) } 
          : s
      )
    }));
  };

  const handleSend = async (type: 'text' | 'image' = 'text') => {
    if (!input.trim() && type === 'text') return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setState(prev => {
      const currentSession = prev.sessions.find(s => s.id === prev.activeSessionId)!;
      const isFirstUserMessage = currentSession.messages.filter(m => m.role === 'user').length === 0;
      const newTitle = isFirstUserMessage ? (input.slice(0, 20) + (input.length > 20 ? '...' : '')) : currentSession.title;

      return {
        ...prev,
        sessions: prev.sessions.map(s => 
          s.id === prev.activeSessionId 
            ? { ...s, messages: [...s.messages, userMessage], title: newTitle } 
            : s
        ),
        isLoading: type === 'text',
        isGeneratingImage: type === 'image'
      };
    });

    const currentInput = input;
    setInput('');

    try {
      if (type === 'image') {
        const imageUrl = await generateImage(currentInput || "Futuristic Cyberpunk scene");
        const botMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: state.language === 'en' ? `Visual asset rendered for: "${currentInput}"` : `Đã kết xuất hình ảnh cho: "${currentInput}"`,
          imageUrl,
          timestamp: new Date().toISOString()
        };
        setState(prev => ({
          ...prev,
          sessions: prev.sessions.map(s => 
            s.id === prev.activeSessionId 
              ? { ...s, messages: [...s.messages, botMessage] } 
              : s
          ),
          isGeneratingImage: false
        }));
      } else {
        const history = activeSession.messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));
        
        // Add language context to history implicitly through system instruction via service update (not possible directly here, but we can prepend it if needed)
        // For now, the service uses a system instruction. We'll pass the language preference.
        const responseText = await getGeminiResponse(`${currentInput} (Please respond in ${state.language === 'en' ? 'English' : 'Vietnamese'})`, history);
        const botMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: responseText || (state.language === 'en' ? "System error." : "Lỗi hệ thống."),
          timestamp: new Date().toISOString()
        };
        setState(prev => ({
          ...prev,
          sessions: prev.sessions.map(s => 
            s.id === prev.activeSessionId 
              ? { ...s, messages: [...s.messages, botMessage] } 
              : s
          ),
          isLoading: false
        }));
      }
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: t.errorConn,
        timestamp: new Date().toISOString()
      };
      setState(prev => ({
        ...prev,
        sessions: prev.sessions.map(s => 
          s.id === prev.activeSessionId 
            ? { ...s, messages: [...s.messages, errorMessage] } 
            : s
        ),
        isLoading: false,
        isGeneratingImage: false
      }));
    }
  };

  return (
    <div className="flex h-screen bg-cyber-gradient text-slate-100 selection:bg-cyan-500/30 overflow-hidden">
      
      {/* Sidebar */}
      <aside className={`
        fixed md:relative z-30 h-full bg-slate-950/90 md:bg-slate-950/40 border-r border-cyan-500/20 backdrop-blur-xl 
        transition-all duration-300 ease-in-out
        ${state.isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:w-0'}
      `}>
        <div className="flex flex-col h-full w-72">
          <div className="p-6 border-b border-cyan-500/20">
            <button 
              onClick={createNewSession}
              className="w-full py-3 px-4 rounded-lg bg-cyan-500/10 border border-cyan-500/50 flex items-center justify-center gap-2 hover:bg-cyan-500/20 transition-all shadow-neon-cyan font-orbitron text-xs tracking-widest text-cyan-400 group"
            >
              <PlusIcon />
              <span className="group-hover:scale-105 transition-transform uppercase">{t.newMission}</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            <h3 className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">{t.missionLogs}</h3>
            {state.sessions.map(session => (
              <div
                key={session.id}
                onClick={() => {
                  setState(prev => ({ ...prev, activeSessionId: session.id }));
                  if (window.innerWidth < 768) setState(prev => ({ ...prev, isSidebarOpen: false }));
                }}
                className={`
                  group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border
                  ${session.id === state.activeSessionId 
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)]' 
                    : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800/50 hover:border-slate-700'}
                `}
              >
                <div className="shrink-0 opacity-70">
                  <BotIcon />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">{session.title}</p>
                  <p className="text-[10px] opacity-50 font-mono italic">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button 
                  onClick={(e) => deleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-pink-500 transition-all"
                  title={t.terminate}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t border-cyan-500/10">
            <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
               <p className="text-[9px] text-slate-500 font-mono text-center uppercase tracking-tighter">{t.systemIntegrity}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-cyan-500/20 bg-slate-950/50 backdrop-blur-md z-10 shadow-lg">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setState(prev => ({ ...prev, isSidebarOpen: !prev.isSidebarOpen }))}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors md:mr-2"
            >
              <MenuIcon />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center shadow-neon-cyan animate-pulse-cyan">
                <BotIcon />
              </div>
              <h1 className="font-orbitron text-sm md:text-lg font-bold tracking-wider text-cyan-400 truncate max-w-[150px] md:max-w-none">
                {activeSession.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            {/* Language Toggle */}
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 transition-all font-orbitron text-[10px] tracking-widest text-cyan-400 shadow-neon-cyan"
            >
              <span className={state.language === 'en' ? 'text-cyan-400' : 'text-slate-500'}>EN</span>
              <span className="text-slate-600">|</span>
              <span className={state.language === 'vi' ? 'text-cyan-400' : 'text-slate-500'}>VN</span>
            </button>

            <div className="hidden lg:flex flex-col items-end text-[10px] font-orbitron">
              <span className="text-pink-500 uppercase">{t.gpuActive}</span>
              <span className="text-cyan-500 uppercase">{t.linkStable}</span>
            </div>
            
            <button 
              onClick={() => {
                if(confirm(t.wipeConfirm)) {
                  localStorage.removeItem(LOCAL_STORAGE_KEY);
                  window.location.reload();
                }
              }}
              className="p-2 border border-pink-500/50 text-pink-500 rounded hover:bg-pink-500/10 transition-all flex items-center gap-2 shadow-neon-pink"
              title={t.resetSystem}
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 relative custom-scrollbar">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 blur-[120px] rounded-full -z-10"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/5 blur-[120px] rounded-full -z-10"></div>

          {activeSession.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 md:gap-4 max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded shrink-0 flex items-center justify-center ${
                  msg.role === 'user' ? 'bg-pink-500/20 text-pink-500 border border-pink-500/30 shadow-neon-pink' : 'bg-cyan-500/20 text-cyan-500 border border-cyan-500/30 shadow-neon-cyan'
                }`}>
                  {msg.role === 'user' ? <UserIcon /> : <BotIcon />}
                </div>
                
                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-4 rounded-xl backdrop-blur-sm border relative group/msg ${
                    msg.role === 'user' 
                      ? 'bg-pink-500/10 border-pink-500/30 rounded-tr-none' 
                      : 'bg-slate-800/40 border-cyan-500/30 rounded-tl-none'
                  }`}>
                    <button 
                      onClick={() => deleteMessage(msg.id)}
                      className="absolute -top-2 -right-2 bg-slate-900 border border-slate-700 p-1 rounded-full opacity-0 group-hover/msg:opacity-100 hover:text-pink-500 transition-all shadow-lg"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>

                    <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    {msg.imageUrl && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-cyan-500/30 shadow-2xl">
                        <img src={msg.imageUrl} alt="Generated Asset" className="w-full h-auto object-cover max-h-[400px]" />
                      </div>
                    )}
                  </div>
                  <span className="mt-1 text-[10px] text-slate-500 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {state.isLoading && (
            <div className="flex justify-start animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="flex gap-4 items-center">
                <div className="w-8 h-8 rounded bg-cyan-500/20 text-cyan-500 border border-cyan-500/30 flex items-center justify-center animate-pulse">
                  <BotIcon />
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          {state.isGeneratingImage && (
            <div className="flex justify-start animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded bg-pink-500/20 text-pink-500 border border-pink-500/30 flex items-center justify-center animate-spin">
                  <ImageIcon />
                </div>
                <div className="p-4 rounded-xl bg-slate-800/40 border border-pink-500/30 rounded-tl-none">
                  <p className="text-xs font-orbitron animate-pulse text-pink-400">{t.rendering}</p>
                  <div className="w-48 h-1 bg-slate-700 mt-2 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-500 animate-[loading_2s_infinite]"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </main>

        {/* Input Area */}
        <footer className="p-4 md:p-6 bg-slate-950/80 border-t border-cyan-500/20 backdrop-blur-lg">
          <div className="max-w-4xl mx-auto flex items-end gap-2 md:gap-4">
            <div className="flex-1 relative group">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend('text');
                  }
                }}
                placeholder={t.inputPlaceholder}
                className="w-full bg-slate-900 border border-cyan-500/30 rounded-lg py-3 px-4 pr-12 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all resize-none shadow-inner text-sm md:text-base text-slate-200"
              />
              <button
                onClick={() => handleSend('text')}
                disabled={state.isLoading || state.isGeneratingImage}
                className="absolute right-3 bottom-3 text-cyan-400 hover:text-cyan-200 disabled:opacity-20 transition-colors"
              >
                <SendIcon />
              </button>
            </div>

            <div className="flex gap-2">
               <button
                onClick={() => handleSend('image')}
                disabled={state.isLoading || state.isGeneratingImage}
                title={t.renderImage}
                className="p-3 bg-pink-500/20 border border-pink-500/30 rounded-lg text-pink-400 hover:bg-pink-500/30 transition-all shadow-neon-pink disabled:opacity-20"
              >
                <ImageIcon />
              </button>
            </div>
          </div>
          <p className="text-[9px] text-center mt-3 text-slate-500 uppercase tracking-[0.2em] font-mono">
            {t.secureLink}
          </p>
        </footer>
      </div>
      
      <style>{`
        @keyframes loading {
          0% { width: 0%; transform: translateX(0%); }
          50% { width: 70%; transform: translateX(20%); }
          100% { width: 100%; transform: translateX(0%); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 211, 238, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 211, 238, 0.5);
        }
      `}</style>
    </div>
  );
};

export default App;
