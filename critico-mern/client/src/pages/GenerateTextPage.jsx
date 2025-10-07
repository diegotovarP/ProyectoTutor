import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../api/client';
import './GenerateTextPage.css';

const GenerateTextPage = () => {
  const { courseId, topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedText, setGeneratedText] = useState('');

  const [config, setConfig] = useState({
    tema: '',
    publico: '',
    nivel: 'intermedio',
    proposito: 'aplicar',
    ventanaInicio: '2020',
    ventanaFin: '2025',
    idioma: 'español'
  });

  const nivelesOptions = ['básico', 'intermedio', 'avanzado'];
  const propositoOptions = ['conocer', 'comprender', 'aplicar', 'analizar', 'evaluar', 'crear'];
  const idiomaOptions = ['español', 'inglés', 'francés', 'alemán', 'portugués'];

  useEffect(() => {
    const fetchTopic = async () => {
      try {
        const { data: topics } = await client.get(`/topics/course/${courseId}`);
        const foundTopic = topics.find((t) => t.id === topicId);
        if (foundTopic) {
          setTopic(foundTopic);
          setConfig((prev) => ({ ...prev, tema: foundTopic.title }));
        }
      } catch (err) {
        setError('No se pudo cargar el tema');
      }
    };
    fetchTopic();
  }, [courseId, topicId]);

  const handleChange = (evt) => {
    const { name, value } = evt.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerateText = async () => {
    setLoading(true);
    setError(null);
    setGeneratedText('');

    try {
      const { data } = await client.post(`/texts/generate/${topicId}`, {
        tema: config.tema,
        publico: config.publico,
        nivel: config.nivel,
        proposito: config.proposito,
        ventanaInicio: config.ventanaInicio,
        ventanaFin: config.ventanaFin,
        idioma: config.idioma
      });

      if (data.success && data.text) {

        navigate(`/app/courses/${courseId}/topics/${topicId}/texts`, {
          state: {
            newTextGenerated: true,
            textId: data.text.id
          }
        });
      } else {
        throw new Error('No se recibió el texto generado');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.detail || err.message || 'Error al generar el texto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="generate-text-page fade-in">
      <button type="button" className="link-back" onClick={() => navigate(`/app/courses/${courseId}`)}>
        ← Volver al curso
      </button>

      <header className="page-header">
        <div>
          <h1>Generar texto con IA</h1>
          <p>Tema: <strong>{topic?.title || 'Cargando...'}</strong></p>
        </div>
      </header>

      <div className="generate-container">
        <section className="config-section">
          <h2>Configuración del texto</h2>
          <form className="config-form" onSubmit={(e) => e.preventDefault()}>
            <div className="field">
              <label htmlFor="tema">Tema específico</label>
              <input
                id="tema"
                name="tema"
                value={config.tema}
                onChange={handleChange}
                placeholder="Ej: Pruebas de calidad en software"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="publico">Público objetivo</label>
              <input
                id="publico"
                name="publico"
                value={config.publico}
                onChange={handleChange}
                placeholder="Ej: estudiantes de ingeniería"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="nivel">Nivel educativo</label>
              <select id="nivel" name="nivel" value={config.nivel} onChange={handleChange}>
                {nivelesOptions.map((nivel) => (
                  <option key={nivel} value={nivel}>
                    {nivel.charAt(0).toUpperCase() + nivel.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="proposito">Propósito de aprendizaje</label>
              <select id="proposito" name="proposito" value={config.proposito} onChange={handleChange}>
                {propositoOptions.map((prop) => (
                  <option key={prop} value={prop}>
                    {prop.charAt(0).toUpperCase() + prop.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <div className="field">
                <label htmlFor="ventanaInicio">Ventana temporal (inicio)</label>
                <input
                  id="ventanaInicio"
                  name="ventanaInicio"
                  type="number"
                  min="1990"
                  max="2030"
                  value={config.ventanaInicio}
                  onChange={handleChange}
                />
              </div>
              <div className="field">
                <label htmlFor="ventanaFin">Ventana temporal (fin)</label>
                <input
                  id="ventanaFin"
                  name="ventanaFin"
                  type="number"
                  min="1990"
                  max="2030"
                  value={config.ventanaFin}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="idioma">Idioma</label>
              <select id="idioma" name="idioma" value={config.idioma} onChange={handleChange}>
                {idiomaOptions.map((idioma) => (
                  <option key={idioma} value={idioma}>
                    {idioma.charAt(0).toUpperCase() + idioma.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="button-primary"
              onClick={handleGenerateText}
              disabled={loading || !config.tema || !config.publico}
            >
              {loading ? 'Generando...' : '🤖 Generar texto con IA'}
            </button>
          </form>
        </section>

        {error && <p className="error-text">{error}</p>}

        {generatedText && (
          <section className="result-section">
            <div className="result-header">
              <h2>✅ Texto generado y guardado exitosamente</h2>
              <button
                type="button"
                className="button-success"
                onClick={() => navigate(`/app/courses/${courseId}`)}
              >
                🔙 Volver al curso
              </button>
            </div>
            <div className="generated-content">
              {generatedText.split('\n').map((paragraph, idx) => {
                if (paragraph.trim() === '') return null;

                if (paragraph.match(/^(Objetivo:|Ejemplos claros|Glosario|#)/)) {
                  return <h3 key={idx}>{paragraph.replace(/^#+ /, '')}</h3>;
                }

                if (paragraph.match(/^\d+\./)) {
                  return <li key={idx}>{paragraph}</li>;
                }

                return <p key={idx}>{paragraph}</p>;
              })}
            </div>
          </section>
        )}

        {loading && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Generando contenido educativo con IA...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateTextPage;
