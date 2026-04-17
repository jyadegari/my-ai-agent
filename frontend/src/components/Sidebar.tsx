interface Conversation {
  id: string;
  title: string;
  createdAt: number;
}

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
}

export default function Sidebar({ conversations, activeId, onNew, onSelect }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={onNew}>
          + New Chat
        </button>
      </div>
      <nav className="conversation-list">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            className={`conversation-item${conv.id === activeId ? ' active' : ''}`}
            onClick={() => onSelect(conv.id)}
          >
            <span className="conversation-title">{conv.title}</span>
          </button>
        ))}
        {conversations.length === 0 && (
          <p className="sidebar-empty">No conversations yet</p>
        )}
      </nav>
    </aside>
  );
}
