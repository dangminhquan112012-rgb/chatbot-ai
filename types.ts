
export type MessageRole = 'user' | 'assistant' | 'system';
export type Language = 'en' | 'vi';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  imageUrl?: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

export interface AppState {
  sessions: ChatSession[];
  activeSessionId: string;
  isLoading: boolean;
  isGeneratingImage: boolean;
  isSidebarOpen: boolean;
  language: Language;
}
