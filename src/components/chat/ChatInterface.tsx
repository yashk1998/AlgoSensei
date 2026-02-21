/**
 * @dev Main chat interface with image upload, visual quick-starts, and hint system
 * Features: multimodal messaging, SVG/Mermaid rendering, progressive hints,
 * visual learning mode templates, drag-drop image support
 */

'use client';

import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowUpIcon, Code2, Lightbulb, MessageSquare, Sparkles,
  Bot, User, ImagePlus, X, Eye, HelpCircle,
  TreePine, GitBranch, Layers, BarChart3
} from 'lucide-react';
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';
import { ImageAttachment } from '@/components/chat/ImageUpload';
import dynamic from 'next/dynamic';

const MarkdownRenderer = dynamic(
  () => import('@/components/ui/markdown-renderer').then(m => m.MarkdownRenderer),
  { ssr: false }
);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MessageContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

interface Message {
  id: string;
  content: string | MessageContentPart[];
  role: 'user' | 'assistant';
  stage?: string;
  createdAt: Date;
  isLoading?: boolean;
  images?: string[]; // base64 image URLs for display
}

interface Chat {
  _id: string;
  title: string;
  messages: Message[];
  userEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatInterfaceProps {
  sidebarCollapsed: boolean;
}

/* ------------------------------------------------------------------ */
/*  Visual Quick-Start Templates                                       */
/* ------------------------------------------------------------------ */

const QUICK_STARTS = [
  {
    icon: TreePine,
    label: 'Visualize a Tree',
    prompt: 'Explain Binary Search Trees with step-by-step SVG visualizations. Show me how insertion works with an example.',
    color: 'text-green-600 bg-green-50 border-green-200',
  },
  {
    icon: GitBranch,
    label: 'Graph Traversal',
    prompt: 'Teach me BFS vs DFS with SVG visualizations of the traversal order on a sample graph. Show each step.',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    icon: Layers,
    label: 'Sorting Visualized',
    prompt: 'Walk me through Merge Sort with SVG visualizations showing the array at each split and merge step.',
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  {
    icon: BarChart3,
    label: 'DP Table Builder',
    prompt: 'Teach me the Longest Common Subsequence problem. Build the DP table step-by-step with SVG visualizations.',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
];

/* ------------------------------------------------------------------ */
/*  Utility: file → base64                                             */
/* ------------------------------------------------------------------ */

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const LOADING_STAGES = [
  'Understanding your question...',
  'Thinking about the best approach...',
  'Building visual explanations...',
  'Crafting SVG diagrams...',
  'Almost ready...',
];

const ChatInterface: React.FC<ChatInterfaceProps> = ({ sidebarCollapsed }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isFetchingChat, setIsFetchingChat] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [imageAttachments, setImageAttachments] = useState<ImageAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatId = searchParams.get('chatId');

  /* ----- Loading stage rotation ----- */
  useEffect(() => {
    if (isThinking) {
      let currentIndex = 0;
      const interval = setInterval(() => {
        setLoadingStage(LOADING_STAGES[currentIndex]);
        currentIndex = (currentIndex + 1) % LOADING_STAGES.length;
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isThinking]);

  /* ----- Scroll to bottom on new messages ----- */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ----- File processing ----- */
  const processFiles = useCallback(async (files: File[] | FileList) => {
    const valid = Array.from(files).filter(
      f => ACCEPTED_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE
    );
    const newAttachments: ImageAttachment[] = await Promise.all(
      valid.map(async (file) => ({
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        base64: await fileToBase64(file),
        name: file.name,
        size: file.size,
      }))
    );
    if (newAttachments.length > 0) {
      setImageAttachments(prev => [...prev, ...newAttachments]);
    }
  }, []);

  /* ----- Chat fetching ----- */
  const fetchChat = useCallback(async (id: string) => {
    setIsFetchingChat(true);
    try {
      const response = await fetch(`/api/chats/${id}`, { cache: 'no-store' });
      if (response.ok) {
        const chat = await response.json();
        setCurrentChat(chat);
        setMessages(chat.messages || []);
      } else {
        if (response.status === 404) router.push('/dashboard');
      }
    } catch {
      router.push('/dashboard');
    } finally {
      setIsFetchingChat(false);
    }
  }, [router]);

  useEffect(() => {
    if (chatId) {
      fetchChat(chatId);
    } else {
      setMessages([]);
      setCurrentChat(null);
    }
  }, [chatId, fetchChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /* ----- Paste image support ----- */
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        processFiles(imageFiles);
      }
    }

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [processFiles]);

  /* ----- Drag & drop ----- */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const createNewChat = async () => {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' })
      });
      if (response.ok) {
        const newChat = await response.json();
        router.push(`/dashboard?chatId=${newChat._id}`);
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  /* ----- Get text content from a message for display ----- */
  const getMessageText = (msg: Message): string => {
    if (typeof msg.content === 'string') return msg.content;
    const textParts = msg.content.filter(p => p.type === 'text');
    return textParts.map(p => p.text || '').join('\n');
  };

  /* ----- Get images from a message for display ----- */
  const getMessageImages = (msg: Message): string[] => {
    if (msg.images) return msg.images;
    if (Array.isArray(msg.content)) {
      return msg.content
        .filter(p => p.type === 'image_url')
        .map(p => p.image_url?.url || '')
        .filter(Boolean);
    }
    return [];
  };

  /* ----- Submit message ----- */
  const handleSubmit = async (e: React.FormEvent, overrideInput?: string) => {
    e.preventDefault();
    const text = overrideInput || input.trim();
    if ((!text && imageAttachments.length === 0) || !chatId) return;

    // Build multimodal content if images are attached
    const hasImages = imageAttachments.length > 0;
    let messageContent: string | MessageContentPart[];
    const displayImages: string[] = [];

    if (hasImages) {
      const parts: MessageContentPart[] = [];
      if (text) {
        parts.push({ type: 'text', text });
      }
      for (const img of imageAttachments) {
        parts.push({
          type: 'image_url',
          image_url: { url: img.base64 },
        });
        displayImages.push(img.base64);
      }
      messageContent = parts;
    } else {
      messageContent = text;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      role: 'user',
      createdAt: new Date(),
      images: displayImages.length > 0 ? displayImages : undefined,
    };

    setInput('');
    setImageAttachments([]);
    setMessages(prev => [...prev, newMessage]);

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: '',
      role: 'assistant',
      createdAt: new Date(),
      isLoading: true,
    };

    try {
      // Update chat title on first message
      if (messages.length === 0) {
        const title = generateChatTitle(text);
        const titleResponse = await fetch(`/api/chats/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title })
        });
        if (titleResponse.ok) {
          window.dispatchEvent(new CustomEvent('chatUpdated'));
        }
      }

      // Save user message
      const saveResponse = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            ...newMessage,
            // Store text-only version for persistence (images are large)
            content: text,
            images: displayImages.length > 0 ? displayImages.slice(0, 1) : undefined,
          }
        })
      });

      if (!saveResponse.ok) throw new Error('Failed to save message');

      setIsThinking(true);
      setMessages(prev => [...prev, aiMessage]);

      // Build messages for AI including multimodal content
      const aiMessages = messages.concat(newMessage).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: aiMessages })
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponseText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          aiResponseText += chunk;

          setMessages(prev => prev.map(msg =>
            msg.id === aiMessage.id
              ? { ...msg, content: aiResponseText, isLoading: false }
              : msg
          ));
        }
      }

      // Save AI response
      await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: { ...aiMessage, content: aiResponseText, isLoading: false }
        })
      });

      setIsThinking(false);
    } catch (error) {
      console.error('Failed to process message:', error);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.id === aiMessage.id) return prev.slice(0, -1);
        return prev;
      });
      setIsThinking(false);
    }
  };

  /* ----- Quick-start handler ----- */
  const handleQuickStart = async (prompt: string) => {
    if (!chatId) {
      // Create a new chat first, then send
      try {
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Chat' })
        });
        if (response.ok) {
          const newChat = await response.json();
          router.push(`/dashboard?chatId=${newChat._id}`);
          // We'll set input so user can send once the chat loads
          setInput(prompt);
        }
      } catch (error) {
        console.error('Failed to create chat:', error);
      }
      return;
    }
    // If already in a chat, submit directly
    setInput(prompt);
    // Submit on next tick after state updates
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const generateChatTitle = (message: string): string => {
    const withoutCode = message.replace(/```[\s\S]*?```/g, '').replace(/`.*?`/g, '');
    const cleanText = withoutCode.replace(/\s+/g, ' ').trim();
    const firstSentence = cleanText.split(/[.!?]/, 1)[0].trim();
    if (firstSentence.length <= 50) return firstSentence;
    return firstSentence.substring(0, 50) + '...';
  };

  /* ----- Empty state / welcome header ----- */
  const header = (
    <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
        AlgoSensei
      </h1>

      <p className="text-gray-500 text-center mb-8">
        Learn DSA visually through Socratic dialogue, SVG diagrams, and step-by-step walkthroughs
      </p>

      {/* How it works */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="flex items-start space-x-3 p-3 rounded-lg border bg-white">
          <div className="bg-indigo-100 p-2 rounded-lg shrink-0">
            <MessageSquare size={18} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-900">Ask or Upload</h2>
            <p className="text-xs text-gray-500">Describe a problem, paste code, or upload a screenshot</p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-3 rounded-lg border bg-white">
          <div className="bg-purple-100 p-2 rounded-lg shrink-0">
            <Eye size={18} className="text-purple-600" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-900">See It Visually</h2>
            <p className="text-xs text-gray-500">Get SVG diagrams of arrays, trees, graphs, and DP tables</p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-3 rounded-lg border bg-white">
          <div className="bg-indigo-100 p-2 rounded-lg shrink-0">
            <HelpCircle size={18} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-900">Progressive Hints</h2>
            <p className="text-xs text-gray-500">Get guided hints instead of answers — learn to think, not memorize</p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-3 rounded-lg border bg-white">
          <div className="bg-purple-100 p-2 rounded-lg shrink-0">
            <Sparkles size={18} className="text-purple-600" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-900">Pattern Recognition</h2>
            <p className="text-xs text-gray-500">Connect problems to DSA patterns for deeper understanding</p>
          </div>
        </div>
      </div>

      {/* Visual Quick-Starts */}
      <div className="w-full mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Start with a visual walkthrough</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QUICK_STARTS.map((qs) => (
            <button
              key={qs.label}
              onClick={() => handleQuickStart(qs.prompt)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-3 text-xs font-medium transition-all hover:shadow-md",
                qs.color
              )}
            >
              <qs.icon size={20} />
              {qs.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={createNewChat}
        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2"
      >
        <MessageSquare size={16} />
        Start New Chat
      </button>
    </div>
  );

  /* ----- Render ----- */
  return (
    <main
      className={cn(
        "mx-auto flex h-screen w-full max-w-[60rem] flex-col items-stretch",
        dragOver && "ring-2 ring-indigo-400 ring-inset bg-indigo-50/30"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-indigo-50/60">
          <div className="rounded-xl border-2 border-dashed border-indigo-400 bg-white px-8 py-6 text-center shadow-lg">
            <ImagePlus size={32} className="mx-auto mb-2 text-indigo-500" />
            <p className="text-sm font-medium text-indigo-700">Drop image to attach</p>
            <p className="text-xs text-indigo-400">Problem screenshots, diagrams, whiteboard notes</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {!chatId && messages.length === 0 ? header : (
          <div className="flex flex-col space-y-4 p-4">
            {isFetchingChat ? (
              <div className="flex flex-col items-center justify-center h-full py-8">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
                  <p className="text-gray-600">Loading chat...</p>
                </div>
              </div>
            ) : (
              <>
                {messages.length === 0 && chatId && (
                  <div className="flex flex-col items-center justify-center text-center py-8">
                    <h2 className="text-xl font-semibold mb-2 bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                      New Chat Started
                    </h2>
                    <p className="text-gray-600 mb-4">
                      Ask a DSA question, upload a problem screenshot, or try a visual walkthrough
                    </p>
                    {/* Quick starts inside chat too */}
                    <div className="grid grid-cols-2 gap-2 max-w-md">
                      {QUICK_STARTS.map((qs) => (
                        <button
                          key={qs.label}
                          onClick={() => handleQuickStart(qs.prompt)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all hover:shadow-md",
                            qs.color
                          )}
                        >
                          <qs.icon size={16} />
                          {qs.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message) => {
                  const text = getMessageText(message);
                  const images = getMessageImages(message);

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex w-full",
                        message.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "flex items-start max-w-[85%] space-x-2",
                        message.role === 'user' ? "flex-row-reverse" : "flex-row"
                      )}>
                        {message.role === 'assistant' ? (
                          <Bot className="w-6 h-6 mt-1 text-indigo-500 shrink-0" />
                        ) : (
                          <User className="w-6 h-6 mt-1 text-gray-500 shrink-0" />
                        )}
                        <div
                          className={cn(
                            "rounded-lg px-4 py-2",
                            message.role === 'user'
                              ? "bg-indigo-500 text-white"
                              : "bg-gray-100 text-gray-900"
                          )}
                        >
                          {/* User-attached images */}
                          {images.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {images.map((src, idx) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  key={idx}
                                  src={src}
                                  alt={`Attachment ${idx + 1}`}
                                  className="max-h-48 rounded-md border border-white/20 object-contain"
                                />
                              ))}
                            </div>
                          )}

                          {/* Message text */}
                          {message.role === 'assistant' ? (
                            <MarkdownRenderer content={text} />
                          ) : (
                            text && <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
                          )}

                          {/* Loading indicator */}
                          {message.isLoading && (
                            <div className="flex items-center mt-2">
                              <div className="animate-pulse mr-2">
                                <Sparkles size={14} className="text-indigo-400" />
                              </div>
                              <span className="text-sm text-gray-500 animate-fade-in-out">
                                {loadingStage}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      {chatId && (
        <div className="mx-6 mb-6">
          {/* Image attachment previews */}
          {imageAttachments.length > 0 && (
            <div className="flex gap-2 mb-2 px-1">
              {imageAttachments.map((img) => (
                <div key={img.id} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.base64}
                    alt={img.name}
                    className="h-16 w-16 rounded-lg border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImageAttachments(prev => prev.filter(a => a.id !== img.id))}
                    className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="relative flex items-center rounded-xl border bg-white px-3 py-1.5 pr-20 text-sm focus-within:ring-1 focus-within:ring-indigo-300"
          >
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) processFiles(e.target.files);
                e.target.value = '';
              }}
            />

            {/* Image upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isThinking}
              className="mr-2 rounded-full p-1.5 text-gray-400 transition-colors hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
              title="Attach image (screenshot, diagram, whiteboard)"
            >
              <ImagePlus size={18} />
            </button>

            <AutoResizeTextarea
              value={input}
              onChange={setInput}
              onKeyDown={handleKeyDown}
              placeholder={imageAttachments.length > 0 ? "Describe what's in the image..." : "Ask a DSA question, or upload a problem screenshot..."}
              className="flex-1 bg-transparent py-1.5 focus:outline-none"
            />

            {/* Hint button */}
            <button
              type="button"
              onClick={(e) => {
                setInput('Give me a hint');
                setTimeout(() => handleSubmit(e as unknown as React.FormEvent, 'Give me a hint'), 50);
              }}
              disabled={isThinking || messages.length === 0}
              className="absolute bottom-2 right-10 rounded-full p-1 text-gray-400 hover:text-amber-500 disabled:opacity-30 transition-colors"
              title="Ask for a progressive hint"
            >
              <Lightbulb size={18} />
            </button>

            {/* Send button */}
            <button
              type="submit"
              disabled={isThinking || (!input.trim() && imageAttachments.length === 0)}
              className="absolute bottom-2 right-2 rounded-full p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition-colors"
            >
              <ArrowUpIcon size={18} />
            </button>
          </form>

          <div className="text-xs text-muted-foreground text-center pt-2">
            Drop images to analyze problems visually. AI generates SVG diagrams and Mermaid flowcharts.
          </div>
        </div>
      )}
    </main>
  );
};

export default ChatInterface;
