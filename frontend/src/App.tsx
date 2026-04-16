import ChatWindow from './components/ChatWindow';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Chat Agent</h1>
        <p className="app-subtitle">Phase 1 — Mock responses</p>
      </header>
      <main className="app-main">
        <ChatWindow />
      </main>
    </div>
  );
}

export default App;
