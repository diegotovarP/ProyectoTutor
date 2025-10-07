import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';
import './StudentChatbot.css';

const StudentChatbot = ({ currentText = null, currentCourse = null }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: '¡Hola! 👋 Soy tu tutor personal de aprendizaje. ¿En qué puedo ayudarte hoy?\n\n📚 Puedo:\n• Explicar conceptos complejos\n• Ayudarte a responder preguntas\n• Darte ejemplos y ejercicios\n• Motivarte y dar seguimiento a tu progreso\n• Responder dudas sobre la lectura actual',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionContext, setSessionContext] = useState({
    textContext: null,
    courseContext: null,
    conversationHistory: []
  });
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (currentText) {
      setSessionContext(prev => {
        const shouldNotify = isOpen && prev.textContext?.title !== currentText.title && prev.textContext?.title;
        
        const newContext = {
          ...prev,
          textContext: {
            title: currentText.title,
            content: currentText.content,
            difficulty: currentText.difficulty,
            topic: currentText.topic
          }
        };
        
        if (shouldNotify) {
          setTimeout(() => {
            addBotMessage(`📖 Perfecto, veo que estás leyendo sobre "${currentText.title}". ¿Tienes alguna duda sobre este tema?`);
          }, 500);
        }
        
        return newContext;
      });
    }
  }, [currentText, isOpen]);

  useEffect(() => {
    if (currentCourse) {
      setSessionContext(prev => ({
        ...prev,
        courseContext: {
          title: currentCourse.title,
          description: currentCourse.description
        }
      }));
    }
  }, [currentCourse]);

  const addBotMessage = (text) => {
    setMessages(prev => [...prev, {
      type: 'bot',
      text,
      timestamp: new Date()
    }]);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, {
      type: 'user',
      text,
      timestamp: new Date()
    }]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMsg = inputMessage.trim();
    addUserMessage(userMsg);
    setInputMessage('');
    setIsTyping(true);

    try {

      const context = {
        message: userMsg,
        studentName: user.firstName,
        studentId: user._id, 
        currentText: sessionContext.textContext,
        currentCourse: sessionContext.courseContext,
        conversationHistory: sessionContext.conversationHistory.slice(-5) 
      };

      console.log('📤 Enviando mensaje al tutor:', {
        message: userMsg,
        studentId: user._id,
        hasTextContext: !!sessionContext.textContext,
        hasCourseContext: !!sessionContext.courseContext,
        historyLength: sessionContext.conversationHistory.length,
        endpoint: '/chatbot/tutor'
      });

      const endpoint = '/chatbot/tutor'; 
      console.log('🎯 Usando endpoint de producción con CORA:', endpoint);
      
      const { data } = await client.post(endpoint, context);
      console.log('🎉 Respuesta completa del servidor:', data);

      console.log('📥 Respuesta recibida del tutor:', {
        success: data.success,
        responseLength: data.response?.length
      });

      if (!data.response) {
        throw new Error('No se recibió respuesta del tutor');
      }

      addBotMessage(data.response);

      setSessionContext(prev => ({
        ...prev,
        conversationHistory: [
          ...prev.conversationHistory,
          { user: userMsg, bot: data.response }
        ]
      }));

    } catch (error) {
      console.error('❌ Error al comunicarse con el chatbot:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Error desconocido';
      addBotMessage(`Lo siento, tuve un problema: ${errorMsg} 😔 Por favor, intenta de nuevo.`);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = (action) => {
    let message = '';
    switch (action) {
      case 'explain':
        message = currentText 
          ? `¿Me puedes explicar el concepto principal de "${currentText.title}"?`
          : '¿Puedes explicarme el concepto que estamos viendo?';
        break;
      case 'example':
        message = '¿Me puedes dar un ejemplo práctico?';
        break;
      case 'summary':
        message = currentText
          ? `¿Me puedes hacer un resumen de "${currentText.title}"?`
          : '¿Me puedes hacer un resumen del tema actual?';
        break;
      case 'help-question':
        message = 'Necesito ayuda para responder las preguntas del texto';
        break;
      case 'progress':
        message = '¿Cómo voy con mi progreso en mis cursos? Dame un análisis y consejos para mejorar';
        break;
    }
    setInputMessage(message);
  };

  const handleClearChat = () => {
    if (window.confirm('¿Estás seguro de que quieres limpiar el chat?')) {
      setMessages([
        {
          type: 'bot',
          text: '¡Hola de nuevo! 👋 ¿En qué más puedo ayudarte?',
          timestamp: new Date()
        }
      ]);
      setSessionContext(prev => ({
        ...prev,
        conversationHistory: []
      }));
    }
  };

  return (
    <>
      {/* Botón flotante para abrir/cerrar chat */}
      <button
        className={`chatbot-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Tutor Personal"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Panel del chatbot */}
      {isOpen && (
        <div className="chatbot-panel">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-content">
              <div className="chatbot-avatar">🤖</div>
              <div className="chatbot-info">
                <h3>Tutor Personal</h3>
                <span className="chatbot-status">
                  <span className="status-dot"></span>
                  En línea
                </span>
              </div>
            </div>
            <button 
              className="chatbot-clear-btn" 
              onClick={handleClearChat}
              title="Limpiar conversación"
            >
              🗑️
            </button>
          </div>

          {/* Context Info */}
          {currentText && (
            <div className="chatbot-context">
              📖 Leyendo: <strong>{currentText.title}</strong>
            </div>
          )}

          {/* Messages Area */}
          <div className="chatbot-messages" ref={chatContainerRef}>
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.type}`}>
                {msg.type === 'bot' && (
                  <div className="message-avatar">🤖</div>
                )}
                <div className="message-content">
                  <div className="message-text">{msg.text}</div>
                  <div className="message-time">
                    {msg.timestamp.toLocaleTimeString('es-ES', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
                {msg.type === 'user' && (
                  <div className="message-avatar user-avatar">
                    {user?.firstName?.charAt(0) || '👤'}
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="message bot">
                <div className="message-avatar">🤖</div>
                <div className="message-content typing">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="chatbot-quick-actions">
            <button 
              className="quick-action-btn" 
              onClick={() => handleQuickAction('explain')}
              disabled={isTyping}
            >
              🧠 Explicar
            </button>
            <button 
              className="quick-action-btn" 
              onClick={() => handleQuickAction('example')}
              disabled={isTyping}
            >
              💡 Ejemplo
            </button>
            <button 
              className="quick-action-btn" 
              onClick={() => handleQuickAction('summary')}
              disabled={isTyping}
            >
              📝 Resumir
            </button>
            <button 
              className="quick-action-btn" 
              onClick={() => handleQuickAction('help-question')}
              disabled={isTyping}
            >
              🎯 Ayuda
            </button>
            <button 
              className="quick-action-btn" 
              onClick={() => handleQuickAction('progress')}
              disabled={isTyping}
            >
              🚀 Progreso
            </button>
          </div>

          {/* Input Area */}
          <div className="chatbot-input">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu pregunta..."
              rows={2}
              disabled={isTyping}
            />
            <button 
              className="chatbot-send-btn"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
            >
              {isTyping ? '⏳' : '📤'}
            </button>
          </div>

          {/* Footer Info */}
          <div className="chatbot-footer">
            💡 Tip: Puedes preguntarme sobre cualquier concepto del curso
          </div>
        </div>
      )}
    </>
  );
};

export default StudentChatbot;
