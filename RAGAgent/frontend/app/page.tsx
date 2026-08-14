'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Database,
  FileText,
  MessageSquareText,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';

type DocumentItem = {
  id: string;
  name: string;
  type: string;
  status: string;
  chunks: number;
  uploaded_at: string;
};

type SourceItem = {
  document_name: string;
  section: string;
  relevance: number;
  text: string;
  page_number: number;
};

type ChatResponse = {
  answer: string;
  sources: SourceItem[];
  retrieval: {
    question: string;
    status: string;
    chunks_found: number;
  };
  pipeline: string[];
};

type WorkflowStep = {
  title: string;
  description: string;
};

const suggestedQuestions = [
  'How long do I have to return a product?',
  'My headphones stopped working after 20 days. Can I get a replacement?',
  'How long does delivery take?',
  'Do you offer free delivery to Ghana?',
];

const API_BASE = 'http://localhost:8000';

export default function HomePage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; sources?: SourceItem[]; pipeline?: string[]; retrieval?: any }>>([]);
  const [loading, setLoading] = useState(false);
  const [showRAG, setShowRAG] = useState(true);
  const [demoMode, setDemoMode] = useState(true);
  const [workflow, setWorkflow] = useState<WorkflowStep[]>([]);

  useEffect(() => {
    void fetchDocuments();
    void fetchWorkflow();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/documents`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (error) {
      setDocuments([
        { id: 'demo-1', name: 'Returns Policy.pdf', type: 'PDF', status: 'Processed', chunks: 24, uploaded_at: 'Today' },
        { id: 'demo-2', name: 'Warranty Policy.pdf', type: 'PDF', status: 'Processed', chunks: 31, uploaded_at: 'Today' },
        { id: 'demo-3', name: 'Shipping Policy.pdf', type: 'PDF', status: 'Processed', chunks: 18, uploaded_at: 'Today' },
      ]);
    }
  };

  const fetchWorkflow = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/how-it-works`);
      const data = await res.json();
      setWorkflow(data.steps || []);
    } catch (error) {
      setWorkflow([]);
    }
  };

  const submitQuestion = async (value?: string) => {
    const nextQuestion = (value ?? question).trim();
    if (!nextQuestion || loading) return;

    setQuestion('');
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', text: nextQuestion }]);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: nextQuestion }),
      });
      const data: ChatResponse = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.answer,
          sources: data.sources,
          pipeline: data.pipeline,
          retrieval: data.retrieval,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: "I couldn't reach the NovaShop knowledge base right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/documents/upload`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (data.documents) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Upload failed');
    } finally {
      event.target.value = '';
    }
  };

  const resetDemo = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/demo/reset`, { method: 'POST' });
      const data = await res.json();
      setDocuments(data.documents || []);
      setMessages([]);
    } catch (error) {
      console.error('Reset failed');
    }
  };

  const pipelineSteps = useMemo(
    () => [
      'Question received',
      'Searching knowledge base',
      '5 relevant chunks found',
      'Top 3 chunks selected',
      'Context sent to AI',
      'Response generated',
    ],
    []
  );

  return (
    <main className="min-h-screen p-6 text-slate-800">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[28px] border border-slate-200/70 bg-white/80 p-5 shadow-soft backdrop-blur-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">NovaShop</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">NovaShop AI Customer Support</h1>
              <p className="mt-1 text-sm text-slate-500">Ask questions about NovaShop's products, policies and services.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
                <Sparkles size={14} /> Demo Mode
              </span>
              <button
                onClick={() => setShowRAG((value) => !value)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700"
              >
                {showRAG ? 'Hide' : 'Show'} how RAG works
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-slate-200/70 bg-white/80 p-5 shadow-soft backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Knowledge Base</h2>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-600 px-3 py-2 text-sm font-medium text-white">
                <Upload size={16} />
                Upload
                <input type="file" accept=".pdf" onChange={uploadDocument} className="hidden" />
              </label>
            </div>

            <div className="space-y-3">
              {documents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No documents loaded yet.</div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id || doc.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        {doc.name}
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        {doc.status}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <div>
                        <span className="block text-[10px] uppercase tracking-wide">Type</span>
                        <span>{doc.type}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-wide">Chunks</span>
                        <span>{doc.chunks}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">Uploaded: {doc.uploaded_at}</p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-50 to-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Database size={16} className="text-brand-600" />
                Knowledge base summary
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-white/80 p-3">
                  <div className="text-2xl font-bold text-slate-900">{documents.reduce((sum, doc) => sum + doc.chunks, 0)}</div>
                  <div className="text-xs text-slate-500">Total chunks</div>
                </div>
                <div className="rounded-xl bg-white/80 p-3">
                  <div className="text-2xl font-bold text-slate-900">{documents.length}</div>
                  <div className="text-xs text-slate-500">Documents</div>
                </div>
              </div>
            </div>
          </aside>

          <section className="rounded-[28px] border border-slate-200/70 bg-white/80 p-5 shadow-soft backdrop-blur-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-brand-600">
                  <Bot size={18} />
                  <span className="text-xs font-semibold uppercase tracking-[0.22em]">AI assistant</span>
                </div>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">NovaShop AI Customer Support</h2>
              </div>
              <button
                onClick={resetDemo}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
              >
                <RefreshCcw size={16} />
                Reset demo
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {suggestedQuestions.map((item) => (
                <button
                  key={item}
                  onClick={() => submitQuestion(item)}
                  className="rounded-full border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700 transition hover:bg-brand-100"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              {messages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                  Ask a question to see how the system searches the NovaShop knowledge base and grounds the answer with retrieved sources.
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div key={`${msg.role}-${index}`} className={`rounded-2xl p-4 ${msg.role === 'user' ? 'bg-brand-600 text-white ml-12' : 'bg-white text-slate-700 mr-12 border border-slate-200'}`}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
                      {msg.role === 'user' ? 'Customer' : 'AI Assistant'}
                    </div>
                    <p className="mt-2 whitespace-pre-line leading-relaxed">{msg.text}</p>

                    {msg.role === 'assistant' && msg.pipeline && showRAG && (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          <Search size={14} />
                          Retrieval process
                        </div>
                        <div className="space-y-2">
                          {msg.pipeline.map((step, idx) => (
                            <div key={`${step}-${idx}`} className="flex items-center gap-2 text-sm text-slate-700">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">{idx + 1}</span>
                              {step}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <button className="flex w-full items-center justify-between text-left">
                          <span className="text-sm font-semibold text-slate-800">Sources used to answer this question</span>
                          <ChevronDown size={16} className="text-slate-500" />
                        </button>
                        <div className="mt-3 space-y-3">
                          {msg.sources.map((source, idx) => (
                            <div key={`${source.document_name}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                  <FileText size={14} className="text-brand-600" />
                                  {source.document_name}
                                </div>
                                <span className="rounded-full bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-700">
                                  Relevance: {Math.round(source.relevance * 100)}%
                                </span>
                              </div>
                              <p className="mt-2 text-xs uppercase tracking-[0.15em] text-slate-500">Section: {source.section}</p>
                              <p className="mt-2 text-sm leading-relaxed text-slate-600">"{source.text}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}

              {loading && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-500" />
                    Searching knowledge base...
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void submitQuestion();
                  }
                }}
                className="min-h-[96px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none ring-0 placeholder:text-slate-400 focus:border-brand-500"
                placeholder="Ask a question about returns, shipping, repairs, warranty, or products..."
              />
              <button
                onClick={() => void submitQuestion()}
                disabled={loading || !question.trim()}
                className="inline-flex h-[96px] w-[90px] items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Send size={18} />
              </button>
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[28px] border border-slate-200/70 bg-white/80 p-5 shadow-soft backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2 text-brand-600">
              <BrainCircuit size={18} />
              <h3 className="text-lg font-semibold text-slate-900">How it works</h3>
            </div>

            {workflow.length > 0 ? (
              <div className="space-y-3">
                {workflow.map((step) => (
                  <div key={step.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-bold uppercase tracking-[0.12em] text-brand-700">{step.title}</div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-bold uppercase tracking-[0.12em] text-brand-700">Business Documents</div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">NovaShop stores its policies and product details in internal documents that the AI can reference.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-bold uppercase tracking-[0.12em] text-brand-700">Chunking</div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">Large documents are split into meaningful chunks so the system can find the most relevant information quickly.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-bold uppercase tracking-[0.12em] text-brand-700">Embeddings</div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">The system converts text into numerical representations so it can match meaning, not just exact words.</p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-slate-200/70 bg-white/80 p-5 shadow-soft backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2 text-brand-600">
              <Wand2 size={18} />
              <h3 className="text-lg font-semibold text-slate-900">RAG visibility mode</h3>
            </div>

            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-brand-700">Pipeline status</span>
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-700">Live</span>
              </div>
              <div className="space-y-2">
                {pipelineSteps.map((step, idx) => (
                  <div key={step} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">✓</span>
                    {step}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <MessageSquareText size={16} className="text-brand-600" />
                Example questions
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>• How long do I have to return a product?</li>
                <li>• My headphones stopped working after 20 days.</li>
                <li>• What if the product arrived damaged?</li>
                <li>• Do you offer free delivery to Ghana?</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
