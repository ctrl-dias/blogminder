import React, { useState, useEffect, useRef } from 'react';
import { 
  PenTool, 
  Sparkles, 
  ChevronRight, 
  RotateCcw, 
  Copy, 
  Check, 
  Download, 
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  Settings,
  Share2
} from 'lucide-react';

export default function App() {
  // --- State ---
  const [step, setStep] = useState('topic'); // topic, titles, writing, result
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('especialista'); // Novo estado para o Tom de Voz
  const [titles, setTitles] = useState([]);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [article, setArticle] = useState(null); // { content: htmlString, imageUrl: string }
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState(''); // Managed by system
  const [copied, setCopied] = useState(false);

  // --- API Helpers ---

  const callGemini = async (prompt) => {
    const key = "AIzaSyBD8frmhK5gLClCdNAX4E7ryq2rzbMaFwY"; // System provides key
    if (!key) {
      // Fallback for demo if no key provided by environment (should not happen in prod)
      console.warn("API Key not found in environment.");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  };

  const generateImage = async (imagePrompt) => {
    const key = "";
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: imagePrompt }],
            parameters: { sampleCount: 1 }
          }),
        }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const base64Info = data.predictions?.[0]?.bytesBase64Encoded;
      return base64Info ? `data:image/png;base64,${base64Info}` : null;
    } catch (e) {
      console.error("Image gen failed", e);
      return null;
    }
  };

  // --- Actions ---

  const generateTitles = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setLoadingMessage('Analisando intenção de busca e criando ganchos virais...');
    setError('');

    try {
      const prompt = `
        Atue como um estrategista de conteúdo sênior.
        O usuário quer escrever sobre: "${topic}".
        Público-alvo: Leitores brasileiros modernos.
        Tom de voz desejado: ${tone}.

        Gere exatamente 5 títulos altamente magnéticos, otimizados para SEO e taxa de clique (CTR).
        Use gatilhos mentais (curiosidade, urgência, benefício, lista).
        
        Retorne APENAS um array JSON puro com strings.
        Exemplo: ["Título 1", "Título 2"]
      `;

      const resultText = await callGemini(prompt);
      
      // Clean up markdown code blocks if present
      const cleanJson = resultText.replace(/```json|```/g, '').trim();
      const parsedTitles = JSON.parse(cleanJson);
      
      if (Array.isArray(parsedTitles)) {
        setTitles(parsedTitles);
        setStep('titles');
      } else {
        throw new Error("Formato de resposta inválido.");
      }
    } catch (err) {
      setError('Não foi possível gerar títulos. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateArticle = async (title) => {
    setSelectedTitle(title);
    setStep('writing');
    setLoading(true);
    setError('');

    try {
      // 1. Generate Article Content
      setLoadingMessage('Aplicando técnicas de SEO, estruturando FAQs e redigindo conteúdo premium...');
      
      const articlePrompt = `
        Você é um Redator Sênior e Especialista em SEO com 10 anos de experiência.
        Sua tarefa é escrever um artigo de blog de alta conversão sobre: "${title}".
        
        Configurações:
        - Tom de voz: ${tone} (Mantenha consistência total).
        - Idioma: Português do Brasil (Natural, fluido, sem "traduçês").
        - Tamanho: Mínimo 800 palavras.

        Estrutura Obrigatória do HTML (Retorne APENAS o HTML dentro do <body>, sem tags <html> ou <body>):
        
        1. **Meta Description**: Crie um parágrafo curto em itálico no topo, focado em SEO, dentro de uma div com fundo cinza claro (style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-style: italic; color: #555; border-left: 4px solid #6366f1;").
        
        2. **Introdução com Gancho**: Comece com uma pergunta, estatística ou afirmação polêmica para prender o leitor.
        
        3. **Key Takeaways (Destaques)**: Crie uma caixa de destaque logo após a introdução (use <ul> com estilo bonito) resumindo o que o leitor vai aprender.
        
        4. **Corpo do Texto (Deep Dive)**:
           - Use <h2> para tópicos principais e <h3> para subtópicos.
           - Use <strong>negrito</strong> para enfatizar palavras-chave e frases de impacto (não use em excesso).
           - Use parágrafos curtos para facilitar a leitura (scannability).
           - Inclua exemplos práticos ou analogias.

        5. **Seção de FAQ (Perguntas Frequentes)**: Adicione 3 perguntas comuns sobre o tema com respostas diretas (ótimo para Snippets do Google).

        6. **Conclusão e CTA**: Encerre com um resumo motivador e uma pergunta para engajar nos comentários.

        IMPORTANTE: Não coloque o título H1 novamente no início. O conteúdo deve ser rico, acionável e evitar clichês de IA como "Neste cenário digital...". Seja específico e humano.
      `;

      const content = await callGemini(articlePrompt);
      const cleanContent = content.replace(/```html|```/g, '');

      // 2. Generate Image
      setLoadingMessage('Criando uma imagem de capa exclusiva...');
      const imagePrompt = `High quality, modern, blog header image for an article titled "${title}". Style: Minimalist, professional, vibrant colors, 4k. No text.`;
      const imageUrl = await generateImage(imagePrompt);

      setArticle({
        content: cleanContent,
        imageUrl: imageUrl
      });
      setStep('result');

    } catch (err) {
      setError('Erro ao escrever o artigo. A IA pode estar sobrecarregada.');
      console.error(err);
      setStep('titles'); // Go back
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('topic');
    setTopic('');
    setTone('especialista');
    setTitles([]);
    setArticle(null);
    setCopied(false);
  };

  const copyToClipboard = () => {
    if (!article) return;
    const fullHtml = `<h1>${selectedTitle}</h1>\n<img src="${article.imageUrl}" alt="${selectedTitle}" />\n${article.content}`;
    
    // Create a temporary textarea to copy HTML source code
    const el = document.createElement('textarea');
    el.value = fullHtml;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Components ---

  const Badge = ({ children }) => (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
      {children}
    </span>
  );

  const Button = ({ onClick, disabled, children, variant = 'primary', className = '' }) => {
    const baseStyle = "px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95";
    const variants = {
      primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200",
      secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200",
      outline: "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50"
    };
    return (
      <button 
        onClick={onClick} 
        disabled={disabled} 
        className={`${baseStyle} ${variants[variant]} ${className}`}
      >
        {children}
      </button>
    );
  };

  const renderProgressBar = () => {
    const steps = ['topic', 'titles', 'writing', 'result'];
    const currentIndex = steps.indexOf(step === 'writing' ? 'result' : step);
    const progress = ((currentIndex + 1) / steps.length) * 100;

    return (
      <div className="fixed top-0 left-0 w-full h-1.5 bg-gray-100 z-50">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-gray-800 selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      {renderProgressBar()}
      
      {/* Header Minimalista */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-40 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2" role="button" onClick={reset}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
            <PenTool size={18} />
          </div>
          <span className="font-bold text-lg tracking-tight text-gray-900">BlogMinder<span className="text-indigo-600">.ai</span></span>
        </div>
        {step !== 'topic' && (
          <button onClick={reset} className="text-sm font-medium text-gray-500 hover:text-indigo-600 flex items-center gap-1 transition-colors">
            <RotateCcw size={14} /> Novo Artigo
          </button>
        )}
      </header>

      <main className="container mx-auto px-4 pt-32 max-w-4xl">
        
        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
                <Sparkles size={24} className="animate-pulse" />
              </div>
            </div>
            <h3 className="mt-8 text-xl font-bold text-gray-900">{step === 'writing' ? 'Redigindo seu artigo...' : 'Gerando ideias...'}</h3>
            <p className="mt-2 text-gray-500 animate-pulse text-center max-w-md">{loadingMessage}</p>
          </div>
        )}

        {/* STEP 1: TOPIC INPUT */}
        {step === 'topic' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4 max-w-2xl">
              <Badge>Versão 2.0 Pro Writer</Badge>
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Crie artigos de blog <span className="text-indigo-600">inteligentes</span> <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">com estrutura de SEO avançada.</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-xl mx-auto">
                Digite um tema, escolha o tom de voz e nossa IA criará um conteúdo estruturado, com ganchos, FAQs e destaques.
              </p>
            </div>

            <div className="w-full max-w-xl relative group flex flex-col gap-4">
              {/* Tone Selector */}
              <div className="flex justify-center space-x-2 flex-wrap gap-2">
                 {['especialista', 'descontraído', 'persuasivo', 'tutorial'].map((t) => (
                   <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-all ${
                      tone === t 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                   >
                     {t}
                   </button>
                 ))}
              </div>

              <div className="relative w-full">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex bg-white rounded-xl shadow-sm p-2 border border-gray-200">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && generateTitles()}
                    placeholder="Sobre o que vamos escrever? (ex: Marketing Digital para Iniciantes)"
                    className="flex-1 p-4 bg-transparent outline-none text-lg text-gray-800 placeholder-gray-400"
                    autoFocus
                  />
                  <Button onClick={generateTitles} disabled={!topic.trim()}>
                    Gerar
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400 mt-8">
              <div className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1 text-green-500"/> Estrutura SEO Pro</div>
              <div className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1 text-green-500"/> FAQs Automáticos</div>
              <div className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1 text-green-500"/> Meta Description</div>
            </div>
            
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm max-w-md mx-auto animate-in slide-in-from-top-2">
                {error}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: TITLE SELECTION */}
        {step === 'titles' && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">Escolha o melhor ângulo</h2>
              <p className="text-gray-500">Nossa IA criou 5 variações otimizadas para o tom "{tone}".</p>
            </div>

            <div className="grid gap-4">
              {titles.map((title, idx) => (
                <button
                  key={idx}
                  onClick={() => generateArticle(title)}
                  className="group relative bg-white p-6 rounded-2xl border border-gray-200 hover:border-indigo-500 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                        {title}
                      </h3>
                      <div className="mt-2 flex items-center space-x-2 text-xs text-gray-400">
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">Alta Conversão</span>
                        <span>•</span>
                        <span>SEO Otimizado</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="text-center">
              <button 
                onClick={() => setStep('topic')} 
                className="text-gray-400 hover:text-gray-600 text-sm font-medium"
              >
                Voltar e mudar tema
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 (Writing) handled by Loading Overlay */}

        {/* STEP 4: RESULT */}
        {step === 'result' && article && (
          <div className="animate-in fade-in duration-700 space-y-8">
            {/* Action Bar */}
            <div className="sticky top-20 z-30 bg-white/90 backdrop-blur border border-gray-200 shadow-sm rounded-xl p-3 flex flex-wrap gap-3 items-center justify-between mb-8">
               <div className="flex items-center gap-2">
                 <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-sm font-medium text-gray-600">Artigo Finalizado</span>
               </div>
               <div className="flex items-center gap-2">
                 <Button variant="secondary" onClick={() => setStep('titles')} className="!py-2 !px-4 !text-sm">
                   Voltar
                 </Button>
                 <Button variant="primary" onClick={copyToClipboard} className={`!py-2 !px-4 !text-sm ${copied ? '!bg-green-600' : ''}`}>
                   {copied ? <Check size={16} className="mr-2"/> : <Copy size={16} className="mr-2"/>}
                   {copied ? 'Copiado!' : 'Copiar HTML'}
                 </Button>
               </div>
            </div>

            {/* Article Preview */}
            <article className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Cover Image */}
              <div className="relative h-64 md:h-96 w-full bg-gray-100">
                {article.imageUrl ? (
                  <img 
                    src={article.imageUrl} 
                    alt={selectedTitle} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-gray-300">
                     <ImageIcon size={48} />
                   </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                  <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight shadow-sm">
                    {selectedTitle}
                  </h1>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 md:p-12 lg:p-16 max-w-none prose prose-indigo prose-lg mx-auto">
                 {/* Render HTML Safely */}
                 <div dangerouslySetInnerHTML={{ __html: article.content }} />
              </div>
            </article>

            {/* Footer Actions */}
            <div className="flex justify-center pb-12">
               <Button variant="outline" onClick={reset}>
                 <Sparkles size={18} className="mr-2" />
                 Criar Outro Artigo
               </Button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}