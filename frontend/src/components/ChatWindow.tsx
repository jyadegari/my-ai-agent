import { useChat } from '@ai-sdk/react';
import { useRef, useEffect, useMemo } from 'react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import '../styles/chat.css';

interface Props {
  conversationId: string;
  initialMessages: UIMessage[];
  onFirstMessage?: (text: string) => void;
}

export default function ChatWindow({ conversationId, initialMessages, onFirstMessage }: Props) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat', body: { conversationId } }),
    [conversationId],
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: initialMessages,
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isResponding = status === 'submitted' || status === 'streaming';

  const handleSend = (text: string) => {
    if (messages.length === 0 && onFirstMessage) {
      onFirstMessage(text);
    }
    sendMessage({ text });
  };

  return (
    <div className="chat-window">
      <div className="message-list">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>Type a message below to get started.</p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {status === 'submitted' && (
          <div className="message assistant">
            <div className="bubble typing-indicator">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={handleSend} disabled={isResponding} />
    </div>
  );
}
