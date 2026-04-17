import { useState, useEffect } from 'react';
import type { UIMessage } from 'ai';
import ChatWindow from './components/ChatWindow';
import Sidebar from './components/Sidebar';
import './App.css';

interface Conversation {
  id: string;
  title: string;
  createdAt: number;
}

const STORAGE_KEY = 'chat-conversations';

function loadConversations(): Conversation[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveConversations(convs: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
}

function App() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string | null>(() => loadConversations()[0]?.id ?? null);
  // null = not yet loaded; [] = loaded but empty; [...] = loaded with history
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);

  // Load history from Durable Object whenever active conversation changes
  useEffect(() => {
    if (!activeId) return;
    setInitialMessages(null); // reset so ChatWindow doesn't mount with stale data
    fetch(`/api/chat/${activeId}`)
      .then((r) => r.json())
      .then((d: { messages: UIMessage[] }) => setInitialMessages(d.messages ?? []))
      .catch(() => setInitialMessages([]));
  }, [activeId]);

  const newConversation = () => {
    const id = crypto.randomUUID();
    const conv: Conversation = { id, title: 'New Chat', createdAt: Date.now() };
    const updated = [conv, ...conversations];
    setConversations(updated);
    saveConversations(updated);
    setActiveId(id);
  };

  const updateTitle = (id: string, title: string) => {
    const updated = conversations.map((c) => (c.id === id ? { ...c, title } : c));
    setConversations(updated);
    saveConversations(updated);
  };

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onNew={newConversation}
        onSelect={setActiveId}
      />
      <div className="app-content">
        <header className="app-header">
          <h1>AI Chat Agent</h1>
        </header>
        <main className="app-main">
          {activeId && initialMessages !== null ? (
            <ChatWindow
              key={activeId}
              conversationId={activeId}
              initialMessages={initialMessages}
              onFirstMessage={(text) => updateTitle(activeId, text.slice(0, 40))}
            />
          ) : (
            <div className="no-conversation">
              {activeId ? (
                <p>Loading…</p>
              ) : (
                <>
                  <p>No conversation selected.</p>
                  <button onClick={newConversation}>Start a new chat</button>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
