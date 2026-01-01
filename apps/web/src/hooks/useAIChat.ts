import { useState, useRef, useCallback } from 'react';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    sources?: Source[];
}

interface Source {
    id: string;
    type: 'scripture' | 'precept' | 'lexicon' | 'other';
    reference?: string;
    url?: string;
    snippet?: string;
}

interface ChatContext {
    translation: string;
    book_id: number;
    chapter: number;
    verse_start?: number;
    verse_end?: number;
}

interface UseAIChatOptions {
    context?: ChatContext;
    inductiveMode?: boolean;
    onError?: (error: Error) => void;
}

export function useAIChat(options: UseAIChatOptions = {}) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [followUps, setFollowUps] = useState<string[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    /**
     * Send a message and get a response
     */
    const sendMessage = useCallback(async (content: string, streaming = true) => {
        if (!content.trim()) return;

        setIsLoading(true);
        setError(null);

        // Add user message immediately
        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content
        };
        setMessages(prev => [...prev, userMessage]);

        try {
            abortControllerRef.current = new AbortController();

            if (streaming) {
                setIsStreaming(true);

                // Create placeholder for assistant message
                const assistantId = crypto.randomUUID();
                setMessages(prev => [...prev, {
                    id: assistantId,
                    role: 'assistant',
                    content: ''
                }]);

                const response = await fetch('/api/ai-study/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'text/event-stream'
                    },
                    body: JSON.stringify({
                        message: content,
                        conversation_id: conversationId,
                        context: options.context,
                        inductive_mode: options.inductiveMode
                    }),
                    signal: abortControllerRef.current.signal
                });

                if (!response.ok) {
                    throw new Error(`Chat failed: ${response.status}`);
                }

                // Get conversation ID from header
                const newConvId = response.headers.get('X-Conversation-Id');
                if (newConvId) {
                    setConversationId(newConvId);
                }

                // Stream the response
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();

                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.slice(6));
                                    if (data.response) {
                                        setMessages(prev => prev.map(msg =>
                                            msg.id === assistantId
                                                ? { ...msg, content: msg.content + data.response }
                                                : msg
                                        ));
                                    }
                                } catch {
                                    // Ignore parse errors for SSE
                                }
                            }
                        }
                    }
                }

                setIsStreaming(false);
            } else {
                // Non-streaming request
                const response = await fetch('/api/ai-study/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: content,
                        conversation_id: conversationId,
                        context: options.context,
                        inductive_mode: options.inductiveMode
                    }),
                    signal: abortControllerRef.current.signal
                });

                if (!response.ok) {
                    throw new Error(`Chat failed: ${response.status}`);
                }

                const data = await response.json();

                setConversationId(data.conversation_id);
                setMessages(prev => [...prev, {
                    id: data.message_id,
                    role: 'assistant',
                    content: data.content,
                    sources: data.sources
                }]);
                setFollowUps(data.follow_ups || []);
            }
        } catch (e) {
            if (e instanceof Error && e.name !== 'AbortError') {
                setError(e);
                options.onError?.(e);
            }
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
        }
    }, [conversationId, options]);

    /**
     * Regenerate the last assistant response
     */
    const regenerate = useCallback(async () => {
        if (!conversationId) return;

        setIsLoading(true);
        setError(null);

        // Remove last assistant message
        setMessages(prev => {
            const lastAssistantIdx = prev.map(m => m.role).lastIndexOf('assistant');
            if (lastAssistantIdx >= 0) {
                return prev.slice(0, lastAssistantIdx);
            }
            return prev;
        });

        try {
            const response = await fetch('/api/ai-study/regenerate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation_id: conversationId })
            });

            if (!response.ok) {
                throw new Error(`Regenerate failed: ${response.status}`);
            }

            const data = await response.json();
            setMessages(prev => [...prev, {
                id: data.message_id,
                role: 'assistant',
                content: data.content,
                sources: data.sources
            }]);
        } catch (e) {
            if (e instanceof Error) {
                setError(e);
                options.onError?.(e);
            }
        } finally {
            setIsLoading(false);
        }
    }, [conversationId, options]);

    /**
     * Load an existing conversation
     */
    const loadConversation = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/ai-study/conversations/${id}`);
            if (!response.ok) {
                throw new Error(`Failed to load conversation: ${response.status}`);
            }

            const data = await response.json();
            setConversationId(id);
            setMessages(data.messages.map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                sources: m.sources
            })));
        } catch (e) {
            if (e instanceof Error) {
                setError(e);
                options.onError?.(e);
            }
        } finally {
            setIsLoading(false);
        }
    }, [options]);

    /**
     * Start a new conversation
     */
    const newConversation = useCallback(() => {
        setConversationId(null);
        setMessages([]);
        setFollowUps([]);
        setError(null);
    }, []);

    /**
     * Stop streaming
     */
    const stopStreaming = useCallback(() => {
        abortControllerRef.current?.abort();
        setIsStreaming(false);
    }, []);

    /**
     * Copy message content to clipboard
     */
    const copyMessage = useCallback(async (messageId: string) => {
        const message = messages.find(m => m.id === messageId);
        if (message) {
            await navigator.clipboard.writeText(message.content);
        }
    }, [messages]);

    return {
        messages,
        conversationId,
        isLoading,
        isStreaming,
        followUps,
        error,
        sendMessage,
        regenerate,
        loadConversation,
        newConversation,
        stopStreaming,
        copyMessage
    };
}
