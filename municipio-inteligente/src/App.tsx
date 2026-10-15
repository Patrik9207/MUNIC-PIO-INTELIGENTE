import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertCircle,
  ArrowDownToLine,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  FileChartColumnIncreasing,
  FileText,
  Landmark,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'
import { buildDiagnosis, calculateIndicators, runCrossChecks } from './domain/analysis'
import { METRICS_BY_DOCUMENT } from './domain/catalog'
import { DEMO_DOCUMENTS } from './domain/demo'
import { parseBrazilianNumber } from './domain/numbers'
import { formatCurrency, formatPercent } from './utils/format'
import { DOCUMENT_TYPES } from './types'
import type { DocumentRecord, DocumentType, GovernmentUnit, MetricKey } from './types'
import './App.css'

type Page = 'overview' | 'documents' | 'diagnosis'

const documentTypeOptions = Object.entries(DOCUMENT_TYPES) as Array<[DocumentType, string]>
const FinancialChart = lazy(() => import('./components/FinancialChart'))

function App() {
  const [page, setPage] = useState<Page>('overview')
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [municipality, setMunicipality] = useState('')
  const [state, setState] = useState('')
  const [exercise, setExercise] = useState('')
  const [unit, setUnit] = useState<GovernmentUnit>('unknown')
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const indicators = useMemo(() => calculateIndicators(documents, unit), [documents, unit])
  const checks = useMemo(() => runCrossChecks(documents), [documents])
  const diagnosis = useMemo(() => buildDiagnosis(documents, unit), [documents, unit])
  const demoMode = documents.length > 0 && documents.every((document) => document.isDemo)
  const duplicateTypes = useMemo(() => {
    const types = documents.flatMap((document) => document.type ? [document.type] : [])
    return new Set(types.filter((type, index) => types.indexOf(type) !== index))
  }, [documents])

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    if (demoMode && !window.confirm('Carregar PDFs vai substituir o conjunto fictício. Deseja continuar?')) return

    const selected = Array.from(files)
    const pdfFiles = selected.filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
    const rejected = selected.length - pdfFiles.length
    if (pdfFiles.length === 0) {
      setMessage('Selecione arquivos PDF para iniciar a análise.')
      return
    }

    setMessage(rejected > 0 ? `${rejected} arquivo(s) ignorado(s): somente PDFs são aceitos.` : '')
    setIsProcessing(true)
    try {
      const { extractPdf } = await import('./domain/pdf')
      const results = await Promise.all(pdfFiles.map(async (file): Promise<DocumentRecord> => {
        try {
          const extracted = await extractPdf(file)
          const noText = extracted.text.trim().length === 0
          return {
            id: crypto.randomUUID(),
            name: file.name,
            type: extracted.type,
            status: noText ? 'no-text' : 'review',
            fields: extracted.fields,
            pageCount: extracted.pageCount,
            error: noText ? 'O PDF não contém texto selecionável. Confira os dados manualmente nos campos abaixo.' : undefined,
          }
        } catch (error) {
          return {
            id: crypto.randomUUID(),
            name: file.name,
            type: null,
            status: 'error',
            fields: {},
            error: error instanceof Error ? error.message : 'Falha desconhecida durante a leitura do PDF.',
          }
        }
      }))

      setDocuments((current) => [...current.filter((document) => !document.isDemo), ...results])
      if (results.some((document) => document.status === 'error' || document.status === 'no-text')) {
        setMessage('Um ou mais arquivos precisam de conferência. PDFs digitalizados não têm texto selecionável; informe os valores manualmente.')
      } else if (rejected === 0) {
        setMessage('Leitura concluída. Revise os valores extraídos antes de gerar o diagnóstico.')
      }
      setPage('documents')
    } catch (error) {
      setMessage(`Não foi possível iniciar a leitura dos PDFs: ${error instanceof Error ? error.message : 'erro desconhecido.'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  function updateDocument(id: string, update: Partial<DocumentRecord>) {
    setDocuments((current) => current.map((document) => document.id === id ? { ...document, ...update } : document))
  }

  function updateField(id: string, key: MetricKey, value: string) {
    const parsed = value.trim() ? parseBrazilianNumber(value) : undefined
    setDocuments((current) => current.map((document) => {
      if (document.id !== id) return document
      return { ...document, fields: { ...document.fields, [key]: parsed } }
    }))
  }

  function startNewAnalysis() {
    if (documents.length > 0 && !window.confirm('Iniciar uma nova análise e remover os documentos atuais desta sessão?')) return
    setDocuments([])
    setMunicipality('')
    setState('')
    setExercise('')
    setUnit('unknown')
    setMessage('Nova análise iniciada. Os documentos não são enviados nem salvos em servidor.')
    setPage('overview')
  }

  function loadDemo() {
    if (documents.length > 0) {
      setMessage('Para manter os dados separados, inicie uma nova análise antes de carregar a demonstração.')
      return
    }
    setDocuments(DEMO_DOCUMENTS.map((document) => ({ ...document, fields: { ...document.fields } })))
    setMunicipality('Município Exemplo (fictício)')
    setState('MG')
    setExercise('2025')
    setUnit('executive')
    setMessage('Conjunto de demonstração fictício carregado. Ele não representa dados de um município real.')
    setPage('overview')
  }

  async function exportReport() {
    try {
      const { exportReportPdf } = await import('./domain/report')
      exportReportPdf(documents, { municipality, state, exercise, unit })
      setMessage('Relatório PDF gerado. Confira as limitações e os dados pendentes antes de utilizá-lo.')
    } catch (error) {
      setMessage(`Não foi possível gerar o relatório: ${error instanceof Error ? error.message : 'erro desconhecido.'}`)
    }
  }

  const revenueChart = documents.find((document) => document.type === 'bo')
  const revenueChartData = revenueChart?.fields.budgetRevenueUpdated !== undefined && revenueChart.fields.budgetRevenueActual !== undefined
    ? [
        { name: 'Prevista atualizada', value: revenueChart.fields.budgetRevenueUpdated },
        { name: 'Realizada', value: revenueChart.fields.budgetRevenueActual },
      ]
    : []
  const expenseChartData = revenueChart?.fields.expensesCommitted !== undefined
    ? [
        { name: 'Empenhada', value: revenueChart.fields.expensesCommitted },
        ...(revenueChart.fields.expensesLiquidated !== undefined ? [{ name: 'Liquidada', value: revenueChart.fields.expensesLiquidated }] : []),
        ...(revenueChart.fields.expensesPaid !== undefined ? [{ name: 'Paga', value: revenueChart.fields.expensesPaid }] : []),
      ]
    : []
  const personnelChart = indicators.personnelRatio !== undefined
    ? [
        { name: 'Despesa com pessoal', value: documents.find((document) => document.type === 'pessoal')?.fields.personnelValue ?? 0 },
        { name: 'RCL', value: documents.find((document) => document.type === 'rcl')?.fields.rclValue ?? documents.find((document) => document.type === 'pessoal')?.fields.personnelRclBase ?? 0 },
      ]
    : []

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#inicio" onClick={() => setPage('overview')}>
          <span className="brand-mark"><Landmark size={21} aria-hidden="true" /></span>
          <span><strong>Município</strong><small>INTELIGENTE</small></span>
        </a>
        <div className="sidebar-caption">ÁREA DE TRABALHO</div>
        <nav className="main-nav" aria-label="Navegação principal">
          <button className={page === 'overview' ? 'nav-item active' : 'nav-item'} onClick={() => setPage('overview')}>
            <BarChart3 size={18} aria-hidden="true" /> Visão geral
          </button>
          <button className={page === 'documents' ? 'nav-item active' : 'nav-item'} onClick={() => setPage('documents')}>
            <FileText size={18} aria-hidden="true" /> Demonstrativos
            {documents.length > 0 && <span className="nav-count">{documents.length}</span>}
          </button>
          <button className={page === 'diagnosis' ? 'nav-item active' : 'nav-item'} onClick={() => setPage('diagnosis')}>
            <FileChartColumnIncreasing size={18} aria-hidden="true" /> Diagnóstico
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note"><ShieldCheck size={17} aria-hidden="true" /><span>Processamento local<br />sem envio de documentos</span></div>
          <span className="version-label">Análise preliminar • v0.1</span>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">ANÁLISE CONTÁBIL E FINANCEIRA MUNICIPAL</p>
            <h1>{page === 'overview' ? 'Visão geral' : page === 'documents' ? 'Demonstrativos' : 'Diagnóstico financeiro'}</h1>
          </div>
          <div className="topbar-actions">
            <button className="button button-secondary" onClick={startNewAnalysis}><RotateCcw size={16} aria-hidden="true" /> Nova análise</button>
            <button className="button button-primary" onClick={exportReport} disabled={documents.length === 0}>
              <ArrowDownToLine size={16} aria-hidden="true" /> Exportar relatório
            </button>
          </div>
        </header>

        <section className="context-panel" aria-label="Identificação da análise">
          <label>Município<input value={municipality} onChange={(event) => setMunicipality(event.target.value)} placeholder="Nome do município" /></label>
          <label>UF<input value={state} onChange={(event) => setState(event.target.value.toUpperCase().slice(0, 2))} placeholder="UF" maxLength={2} /></label>
          <label>Exercício<input value={exercise} onChange={(event) => setExercise(event.target.value)} placeholder="Ex.: 2025" inputMode="numeric" /></label>
          <label>Poder analisado
            <select value={unit} onChange={(event) => setUnit(event.target.value as GovernmentUnit)}>
              <option value="unknown">Não informado</option>
              <option value="executive">Executivo</option>
              <option value="legislative">Legislativo</option>
            </select>
          </label>
        </section>

        {message && <div className="notice" role="status"><CircleHelp size={17} aria-hidden="true" /><span>{message}</span><button aria-label="Fechar aviso" onClick={() => setMessage('')}>×</button></div>}
        {demoMode && <div className="demo-banner"><AlertCircle size={17} aria-hidden="true" /><span>Modo demonstração — todos os valores exibidos são fictícios.</span></div>}
        {duplicateTypes.size > 0 && <div className="notice notice-warning"><AlertCircle size={17} aria-hidden="true" /><span>Há categorias com mais de um arquivo. Os cálculos utilizam o primeiro documento de cada categoria; não misture períodos.</span></div>}
        {isProcessing && <div className="processing-banner"><span className="spinner" /> Extraindo texto dos PDFs no navegador…</div>}

        {page === 'overview' && (
          <Overview
            documents={documents}
            indicators={indicators}
            revenueChartData={revenueChartData}
            expenseChartData={expenseChartData}
            personnelChart={personnelChart}
            openDocuments={() => setPage('documents')}
            upload={() => fileInput.current?.click()}
            loadDemo={loadDemo}
          />
        )}

        {page === 'documents' && (
          <DocumentsPage
            documents={documents}
            onUpload={() => fileInput.current?.click()}
            onRemove={(id) => setDocuments((current) => current.filter((document) => document.id !== id))}
            onTypeChange={(id, type) => updateDocument(id, { type })}
            onFieldChange={updateField}
            loadDemo={loadDemo}
            isProcessing={isProcessing}
          />
        )}

        {page === 'diagnosis' && (
          <DiagnosisPage
            diagnosis={diagnosis}
            checks={checks}
            indicators={indicators}
            hasDocuments={documents.length > 0}
            onAddDocuments={() => setPage('documents')}
          />
        )}

        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={(event) => {
            void handleFiles(event.currentTarget.files)
            event.currentTarget.value = ''
          }}
        />
        <footer className="page-footer">
          <span>Município Inteligente · Ferramenta de apoio gerencial</span>
          <span>Resultados sujeitos à conferência profissional</span>
        </footer>
      </main>
    </div>
  )
}

interface OverviewProps {
  documents: DocumentRecord[]
  indicators: ReturnType<typeof calculateIndicators>
  revenueChartData: Array<{ name: string; value: number }>
  expenseChartData: Array<{ name: string; value: number }>
  personnelChart: Array<{ name: string; value: number }>
  openDocuments: () => void
  upload: () => void
  loadDemo: () => void
}

function Overview({
  documents,
  indicators,
  revenueChartData,
  expenseChartData,
  personnelChart,
  openDocuments,
  upload,
  loadDemo,
}: OverviewProps) {
  if (documents.length === 0) {
    return (
      <section className="welcome-panel">
        <div className="welcome-icon"><Building2 size={24} aria-hidden="true" /></div>
        <p className="eyebrow">BEM-VINDO AO MUNICÍPIO INTELIGENTE</p>
        <h2>Comece uma nova análise fiscal</h2>
        <p className="welcome-copy">Carregue demonstrativos municipais em PDF para extrair dados, calcular indicadores e conferir saldos. Os arquivos são processados no próprio navegador.</p>
        <div className="welcome-actions">
          <button className="button button-primary" onClick={upload}><Upload size={17} aria-hidden="true" /> Adicionar demonstrativos</button>
          <button className="button button-secondary" onClick={loadDemo}>Testar com dados fictícios</button>
        </div>
        <div className="welcome-tip"><CircleHelp size={16} aria-hidden="true" /><span>Comece pelo demonstrativo da Receita Corrente Líquida e pelo de Despesa com Pessoal.</span></div>
        <div className="empty-metrics">
          <div><strong>01</strong><span>Carregue PDFs</span></div><ChevronRight size={16} aria-hidden="true" />
          <div><strong>02</strong><span>Revise os valores</span></div><ChevronRight size={16} aria-hidden="true" />
          <div><strong>03</strong><span>Gere o diagnóstico</span></div>
        </div>
      </section>
    )
  }

  return (
    <div className="page-content">
      <div className="section-heading">
        <div><h2>Resumo da análise</h2><p>Indicadores calculados a partir dos documentos carregados.</p></div>
        <button className="button button-secondary" onClick={openDocuments}>Ver demonstrativos <ChevronRight size={16} aria-hidden="true" /></button>
      </div>
      <div className="metric-grid">
        <MetricCard label="Resultado orçamentário" value={formatCurrency(indicators.budgetResult)} icon={<Landmark size={18} />} helper="Receita realizada − despesa empenhada" />
        <MetricCard label="Liquidez corrente" value={indicators.currentRatio?.toFixed(2) ?? '—'} icon={<BarChart3 size={18} />} helper="Ativo circulante ÷ passivo circulante" />
        <MetricCard label="Despesa com pessoal / RCL" value={formatPercent(indicators.personnelRatio)} icon={<FileChartColumnIncreasing size={18} />} helper="Percentual calculado sobre a RCL" />
        <MetricCard label="Restos a pagar" value={formatCurrency(indicators.rpTotal)} icon={<FileText size={18} />} helper="Saldo final processado e não processado" />
      </div>
      <section className="panel document-summary">
        <div className="panel-heading"><div><h3>Documentos desta análise</h3><p>{documents.length} arquivo(s) carregado(s)</p></div><button className="text-button" onClick={openDocuments}>Conferir lista <ChevronRight size={15} /></button></div>
        <div className="document-chips">
          {documents.map((document) => <span className={`document-chip ${document.status === 'error' || document.status === 'no-text' ? 'chip-attention' : ''}`} key={document.id}>
            {document.status === 'error' || document.status === 'no-text' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
            {document.type ? DOCUMENT_TYPES[document.type] : 'Categoria pendente'}
          </span>)}
        </div>
      </section>
      <div className="chart-grid">
        <Suspense fallback={<div className="chart-empty">Carregando gráfico…</div>}>
          <FinancialChart title="Receita prevista x realizada" subtitle="Balanço Orçamentário" data={revenueChartData} />
        </Suspense>
        <Suspense fallback={<div className="chart-empty">Carregando gráfico…</div>}>
          <FinancialChart title="Execução da despesa" subtitle="Empenhada, liquidada e paga" data={expenseChartData} />
        </Suspense>
        <Suspense fallback={<div className="chart-empty">Carregando gráfico…</div>}>
          <FinancialChart title="Despesa com pessoal x RCL" subtitle="Valores comparáveis" data={personnelChart} />
        </Suspense>
        <section className="panel insight-panel">
          <div className="panel-heading"><div><h3>Leitura preliminar</h3><p>Regras determinísticas · sem IA generativa</p></div><ShieldCheck size={18} /></div>
          {indicators.fiscalLimits.status === 'pending'
            ? <p>Informe o poder analisado (Executivo ou Legislativo) e confira os dados da RCL para avaliar os parâmetros fiscais.</p>
            : <p>Despesa com pessoal: <strong>{formatPercent(indicators.personnelRatio)}</strong>. Os limites e a interpretação devem ser validados conforme o período e o órgão analisado.</p>}
          <button className="text-button" onClick={openDocuments}>Revisar dados extraídos <ChevronRight size={15} /></button>
        </section>
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon, helper }: { label: string; value: string; icon: ReactNode; helper: string }) {
  return <section className="metric-card"><div className="metric-card-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><strong>{value}</strong><small>{helper}</small></section>
}

interface DocumentsPageProps {
  documents: DocumentRecord[]
  onUpload: () => void
  onRemove: (id: string) => void
  onTypeChange: (id: string, type: DocumentType | null) => void
  onFieldChange: (id: string, key: MetricKey, value: string) => void
  loadDemo: () => void
  isProcessing: boolean
}

function DocumentsPage({ documents, onUpload, onRemove, onTypeChange, onFieldChange, loadDemo, isProcessing }: DocumentsPageProps) {
  return (
    <div className="page-content">
      <div className="section-heading">
        <div><h2>Documentos analisados</h2><p>Selecione arquivos PDF. Revise a categoria e confira cada valor extraído antes de prosseguir.</p></div>
        <button className="button button-primary" onClick={onUpload} disabled={isProcessing}><Plus size={17} aria-hidden="true" /> Adicionar PDFs</button>
      </div>
      {documents.length === 0 ? (
        <section className="empty-document-panel">
          <div className="welcome-icon"><Upload size={22} aria-hidden="true" /></div>
          <h3>Nenhum demonstrativo adicionado</h3>
          <p>Carregue PDFs com texto selecionável ou use a demonstração identificada como fictícia.</p>
          <div className="welcome-actions"><button className="button button-primary" onClick={onUpload}><Upload size={16} /> Selecionar arquivos</button><button className="button button-secondary" onClick={loadDemo}>Usar demonstração fictícia</button></div>
        </section>
      ) : (
        <div className="document-list">
          {documents.map((document) => {
            const fields = document.type ? METRICS_BY_DOCUMENT[document.type] : []
            return <article className="document-card" key={document.id}>
              <div className="document-card-header">
                <span className={`file-icon ${document.status === 'error' || document.status === 'no-text' ? 'file-icon-warning' : ''}`}><FileText size={20} aria-hidden="true" /></span>
                <div className="document-file-info">
                  <strong title={document.name}>{document.name}</strong>
                  <span>{document.pageCount !== undefined ? `${document.pageCount} página(s) · ` : ''}{document.isDemo ? 'Dado fictício' : statusLabel(document.status)}</span>
                </div>
                <label className="category-select">Categoria
                  <select value={document.type ?? ''} onChange={(event) => onTypeChange(document.id, (event.target.value || null) as DocumentType | null)}>
                    <option value="">Selecionar categoria</option>
                    {documentTypeOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                </label>
                {!document.isDemo && <button className="icon-button danger-icon" title="Remover arquivo" aria-label={`Remover ${document.name}`} onClick={() => onRemove(document.id)}><Trash2 size={17} /></button>}
              </div>
              {document.error && <p className="document-error"><AlertCircle size={15} aria-hidden="true" />{document.error}</p>}
              {document.type && <details className="field-editor" open={document.status === 'no-text' || document.status === 'error'}>
                <summary>Revisar e editar valores extraídos <span>{Object.keys(document.fields).length} campo(s)</span></summary>
                <div className="field-grid">
                  {fields.map((field) => <label key={field.key}>{field.label}
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Não identificado"
                      value={document.fields[field.key] ?? ''}
                      onChange={(event) => onFieldChange(document.id, field.key, event.target.value)}
                    />
                  </label>)}
                </div>
                <p className="field-help">Revise os valores com o documento original. Use vírgula ou ponto como separador decimal; campos vazios não entram nos cálculos.</p>
              </details>}
            </article>
          })}
        </div>
      )}
      <section className="note-panel"><ShieldCheck size={18} aria-hidden="true" /><p>Os PDFs são lidos no navegador e não são enviados a uma API. A extração automática é preliminar. Se um PDF for digitalizado, confira e preencha manualmente os valores; OCR não está habilitado nesta versão.</p></section>
    </div>
  )
}

function statusLabel(status: DocumentRecord['status']): string {
  if (status === 'processing') return 'Lendo documento'
  if (status === 'review') return 'Leitura concluída · requer conferência'
  if (status === 'no-text') return 'Sem texto selecionável'
  if (status === 'error') return 'Falha na leitura'
  return 'Dado fictício'
}

interface DiagnosisPageProps {
  diagnosis: ReturnType<typeof buildDiagnosis>
  checks: ReturnType<typeof runCrossChecks>
  indicators: ReturnType<typeof calculateIndicators>
  hasDocuments: boolean
  onAddDocuments: () => void
}

function DiagnosisPage({ diagnosis, checks, indicators, hasDocuments, onAddDocuments }: DiagnosisPageProps) {
  if (!hasDocuments) {
    return <section className="welcome-panel compact-empty"><div className="welcome-icon"><FileChartColumnIncreasing size={22} /></div><h2>O diagnóstico será exibido aqui</h2><p>Adicione demonstrativos e confira os valores extraídos para gerar uma análise baseada somente nos dados disponíveis.</p><button className="button button-primary" onClick={onAddDocuments}><Upload size={16} /> Adicionar demonstrativos</button></section>
  }
  return (
    <div className="page-content">
      <div className="diagnosis-intro"><div><p className="eyebrow">ANÁLISE AUTOMÁTICA BASEADA EM REGRAS</p><h2>Diagnóstico financeiro</h2><p>Não foi utilizada IA generativa. As conclusões abaixo dependem da qualidade e da revisão dos dados extraídos.</p></div><span className="rule-badge"><ShieldCheck size={15} /> Regras determinísticas</span></div>
      <div className="diagnosis-grid">
        <DiagnosisSection title="Resumo geral" items={diagnosis.summary} icon={<BarChart3 size={18} />} />
        <DiagnosisSection title="Principais pontos de atenção" items={diagnosis.attention} icon={<AlertCircle size={18} />} variant="attention" />
        <DiagnosisSection title="Análise fiscal" items={diagnosis.fiscal} icon={<Landmark size={18} />} />
        <DiagnosisSection title="Recomendações gerenciais" items={diagnosis.recommendations} icon={<CheckCircle2 size={18} />} />
      </div>
      <section className="panel checks-panel">
        <div className="panel-heading"><div><h3>Conferência cruzada</h3><p>Verificações aritméticas e comparações entre demonstrativos disponíveis.</p></div><span className="check-count">{checks.length} verificações</span></div>
        <div className="check-table-wrap"><table className="check-table"><thead><tr><th>Verificação</th><th>Status</th><th>Valores e orientação</th></tr></thead><tbody>
          {checks.map((check) => <tr key={check.id}>
            <td><strong>{check.label}</strong></td>
            <td><span className={`status-pill ${check.status === 'Compatível' ? 'status-good' : check.status === 'Dados insuficientes' ? 'status-muted' : 'status-warning'}`}>{check.status}</span></td>
            <td><span>{check.values}</span><small>{check.message}{check.difference !== undefined ? ` Diferença: ${formatCurrency(check.difference)}.` : ''}</small></td>
          </tr>)}
        </tbody></table></div>
      </section>
      <section className="panel fiscal-summary">
        <div className="panel-heading"><div><h3>Parâmetros fiscais considerados</h3><p>Lei Complementar nº 101/2000 · referência depende do Poder selecionado</p></div><Landmark size={18} /></div>
        {indicators.fiscalLimits.maximum === undefined
          ? <p>Selecione Executivo ou Legislativo e confirme o órgão e o período no demonstrativo. Sem essa informação, não há comparação legal automática.</p>
          : <p>Máximo: <strong>{formatPercent(indicators.fiscalLimits.maximum)}</strong> · Prudencial: <strong>{formatPercent(indicators.fiscalLimits.prudential)}</strong> · Alerta: <strong>{formatPercent(indicators.fiscalLimits.alert)}</strong>. A comparação é indicativa e não declara conformidade legal.</p>}
      </section>
    </div>
  )
}

function DiagnosisSection({ title, items, icon, variant }: { title: string; items: string[]; icon: ReactNode; variant?: 'attention' }) {
  return <section className={`diagnosis-card ${variant === 'attention' ? 'diagnosis-attention' : ''}`}><div className="diagnosis-card-title"><span>{icon}</span><h3>{title}</h3></div><ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul></section>
}

export default App
