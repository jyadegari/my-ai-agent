import type { UIMessage } from 'ai';
import SearchResultCard from './SearchResultCard';

interface Props {
  message: UIMessage;
}

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface WebSearchOutput {
  query: string;
  results: WebSearchResult[];
}

/**
 * Renders a single chat message.
 *
 * In AI SDK v5/v6, message.parts is the source of truth.
 * Tool parts use the typed naming convention `tool-<toolName>` and have
 * states: input-streaming → input-available → output-available (or output-error).
 */
export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`}>
      <div className="bubble">
        {message.parts.map((part, index) => {
          // Plain text from the assistant or user
          if (part.type === 'text') {
            return (
              <span key={index} data-state={part.state}>
                {part.text}
              </span>
            );
          }

          // Web search tool call — render different UI depending on lifecycle state
          if (part.type === 'tool-web_search') {
            const toolPart = part as typeof part & {
              state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
              input?: { query?: string };
              output?: WebSearchOutput;
              errorText?: string;
            };

            switch (toolPart.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <div key={index} className="tool-call">
                    <span className="tool-spinner" />
                    <span>Searching: <em>{toolPart.input?.query ?? '…'}</em></span>
                  </div>
                );
              case 'output-available':
                return (
                  <div key={index} className="tool-results">
                    <div className="tool-results-header">
                      Search results for <em>{toolPart.output?.query}</em>
                    </div>
                    <div className="tool-results-list">
                      {toolPart.output?.results?.map((r) => (
                        <SearchResultCard
                          key={r.url}
                          title={r.title}
                          url={r.url}
                          snippet={r.snippet}
                        />
                      ))}
                    </div>
                  </div>
                );
              case 'output-error':
                return (
                  <div key={index} className="tool-error">
                    Search failed: {toolPart.errorText}
                  </div>
                );
              default:
                return null;
            }
          }

          return null;
        })}
      </div>
    </div>
  );
}
