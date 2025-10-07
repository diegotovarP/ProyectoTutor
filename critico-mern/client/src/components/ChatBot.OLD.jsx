import { useState } from 'react';
import './ChatBot.css';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { type: 'bot', text: '👋 ¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;

    const userMessage = { type: 'user', text: inputMessage };
    setMessages(prev => [...prev, userMessage]);

    setTimeout(() => {
      const botResponses = [
        '🤖 Gracias por tu mensaje. Estoy en desarrollo, pero pronto podré ayudarte mejor.',
        '📚 Interesante pregunta. Por ahora estoy en modo simulado, pero pronto tendré respuestas más útiles.',
        '💡 Entiendo tu consulta. Estoy aprendiendo para poder ayudarte de la mejor manera.',
        '✨ ¡Genial! Pronto podré darte información más detallada sobre el sistema.',
        '🎓 Estoy aquí para ayudarte. Aunque por ahora mis respuestas son limitadas, pronto mejoraré.'
      ];
      
      const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];
      const botMessage = { type: 'bot', text: randomResponse };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);

    setInputMessage('');
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        className={`chatbot-toggle ${isOpen ? 'active' : ''}`}
        onClick={toggleChat}
        aria-label="Abrir chat"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Modal del chat */}
      {isOpen && (
        <div className="chatbot-modal">
          <div className="chatbot-header">
            <div className="chatbot-title">
              <span className="chatbot-icon">🤖</span>
              <div>
                <h3>Asistente Virtual</h3>
                <span className="chatbot-status">● En línea (simulado)</span>
              </div>
            </div>
            <button className="chatbot-close" onClick={toggleChat}>
              ✕
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message message-${msg.type}`}>
                <div className="message-content">
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <form className="chatbot-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="chatbot-input"
            />
            <button type="submit" className="chatbot-send-btn">
              📤
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatBot;
