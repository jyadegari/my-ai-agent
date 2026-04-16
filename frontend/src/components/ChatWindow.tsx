import { useChat } from '@ai-sdk/react';
import { useRef, useEffect } from 'react';
import { DefaultChatTransport } from 'ai';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import '../styles/chat.css';

// Sends messages to POST /api/chat on the Cloudflare Worker.
// Vite proxies /api → http://localhost:8787 during development.
const transport = new DefaultChatTransport({ api: '/api/chat' });

export default function ChatWindow() {
  const { messages, sendMessage, status } = useChat({
    transport,
  });

  // Auto-scroll to the latest message
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Disable input while waiting for first token or while streaming
  const isResponding = status === 'submitted' || status === 'streaming';

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

        {/* Three-dot typing indicator while waiting for the first streamed token */}
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

      <ChatInput
        onSend={(text) => sendMessage({ text })}
        disabled={isResponding}
      />
    </div>
  );
}
