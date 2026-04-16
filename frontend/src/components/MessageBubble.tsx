import type { UIMessage } from 'ai';

interface Props {
  message: UIMessage;
}

/**
 * Renders a single chat message.
 *
 * In AI SDK v5, message.content does not exist.
 * message.parts is the single source of truth — it holds text blocks,
 * tool invocations, files, reasoning traces, etc.
 *
 * For now we only handle 'text' parts.
 * Phase 4 adds a 'tool-invocation' case here.
 */
export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`}>
      <div className="bubble">
        {message.parts.map((part, index) => {
          switch (part.type) {
            case 'text':
              return (
                <span
                  key={index}
                  // part.state is 'streaming' while tokens arrive, 'done' when complete
                  data-state={part.state}
                >
                  {part.text}
                </span>
              );
            // Phase 4: add 'tool-invocation' case here
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}