import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, ReactNode } from 'react'
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
const reportTypes = Object.keys(DOCUMENT_TYPES) as DocumentType[]
const FinancialChart = lazy(() => import('./components/FinancialChart'))

function App() {
  const [page, setPage] = useState<Page>('overview')
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [municipality, setMunicipality] = useState('')
  const [state, setState] = useState('')
  const [exercise, setExercise] = useState('')
  const [period, setPeriod] = useState('')
  const [unit, setUnit] = useState<GovernmentUnit>('unknown')
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingReports, setProcessingReports] = useState<DocumentType[]>([])
  const [ocrProgress, setOcrProgress] = useState<{ fileName: string; page: number; progress: number } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const reportInputs = useRef<Partial<Record<DocumentType, HTMLInputElement | null>>>({})
  const previewUrls = useRef(new Set<string>())

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url))
    previewUrls.current.clear()
  }, [])

  const indicators = useMemo(() => calculateIndicators(documents, unit), [documents, unit])
  const checks = useMemo(() => runCrossChecks(documents), [documents])
  const diagnosis = useMemo(() => buildDiagnosis(documents, unit), [documents, unit])
  const demoMode = documents.length > 0 && documents.every((document) => document.isDemo)
  const duplicateTypes = useMemo(() => {
    const types = documents.flatMap((document) => document.type ? [document.type] : [])
    return new Set(types.filter((type, index) => types.indexOf(type) !== index))
  }, [documents])

  async function handleFiles(files: FileList | null, reportType?: DocumentType) {
    if (!files?.length) return
    if (demoMode && !window.confirm('Carregar PDFs vai substituir o conjunto fictício. Deseja continuar?')) return

    const selected = Array.from(files)
    const pdfFiles = selected.filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
    const rejected = selected.length - pdfFiles.length + (reportType ? Math.max(0, pdfFiles.length - 1) : 0)
    const selectedPdfs = reportType ? pdfFiles.slice(0, 1) : pdfFiles
    if (selectedPdfs.length === 0) {
      setMessage('Selecione arquivos PDF para iniciar a análise.')
      return
    }

    setMessage(rejected > 0 ? `${rejected} arquivo(s) ignorado(s): somente PDFs são aceitos.` : '')
    setIsProcessing(true)
    if (reportType) setProcessingReports((current) => [...new Set([...current, reportType])])
    try {
      const { extractPdf } = await import('./domain/pdf')
      const results: DocumentRecord[] = []
      for (const file of selectedPdfs) {
        const previewUrl = URL.createObjectURL(file)
        previewUrls.current.add(previewUrl)
        try {
          if (file.size > 30 * 1024 * 1024) {
            throw new Error('O arquivo excede o limite de 30 MB.')
          }
          const extracted = await extractPdf(file, (page, progress) => {
            setOcrProgress({ fileName: file.name, page, progress })
          })
          const noText = extracted.text.trim().length === 0
          results.push({
            id: crypto.randomUUID(),
            name: file.name,
            fileSize: file.size,
            previewUrl,
            type: reportType ?? extracted.type,
            status: noText ? 'no-text' : 'review',
            fields: extracted.fields,
            pageCount: extracted.pageCount,
            pageReadings: extracted.pages.map(({ pageNumber, method, confidence, rotation }) => ({ pageNumber, method, confidence, rotation })),
            fieldSources: extracted.fieldSources,
            error: [
              noText ? 'Não foi possível reconhecer texto no documento.' : '',
              ...extracted.warnings,
            ].filter(Boolean).join(' ') || undefined,
          })
        } catch (error) {
          results.push({
            id: crypto.randomUUID(),
            name: file.name,
            fileSize: file.size,
            previewUrl,
            type: reportType ?? null,
            status: 'error',
            fields: {},
            error: error instanceof Error ? error.message : 'Falha desconhecida durante a leitura do PDF.',
          })
        }
      }

      setDocuments((current) => {
        const retained = current.filter((document) => !document.isDemo && (!reportType || document.type !== reportType))
        current
          .filter((document) => reportType && document.type === reportType)
          .forEach((document) => {
            if (document.previewUrl) {
              URL.revokeObjectURL(document.previewUrl)
              previewUrls.current.delete(document.previewUrl)
            }
          })
        return [...retained, ...results]
      })
      if (results.some((document) => document.status === 'error' || document.status === 'no-text')) {
        setMessage('Um ou mais arquivos precisam de conferência. Se a leitura ou o OCR não recuperar os dados, preencha os campos manualmente.')
      } else if (rejected === 0) {
        setMessage('Leitura concluída. Revise os valores extraídos antes de gerar o diagnóstico.')
      }
      setPage('documents')
    } catch (error) {
      setMessage(`Não foi possível iniciar a leitura dos PDFs: ${error instanceof Error ? error.message : 'erro desconhecido.'}`)
    } finally {
      setIsProcessing(false)
      setOcrProgress(null)
      if (reportType) setProcessingReports((current) => current.filter((type) => type !== reportType))
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

  function uploadReport(type: DocumentType) {
    reportInputs.current[type]?.click()
  }

  function removeDocument(id: string) {
    const document = documents.find((item) => item.id === id)
    if (document?.previewUrl) {
      URL.revokeObjectURL(document.previewUrl)
      previewUrls.current.delete(document.previewUrl)
    }
    setDocuments((current) => current.filter((item) => item.id !== id))
  }

  function startNewAnalysis() {
    if (documents.length > 0 && !window.confirm('Iniciar uma nova análise e remover os documentos atuais desta sessão?')) return
    documents.forEach((document) => {
      if (document.previewUrl) {
        URL.revokeObjectURL(document.previewUrl)
        previewUrls.current.delete(document.previewUrl)
      }
    })
    setDocuments([])
    setMunicipality('')
    setState('')
    setExercise('')
    setPeriod('')
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
      exportReportPdf(documents, { municipality, state, exercise, period, unit })
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
          <label>Período<input value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="Ex.: 6º bimestre / anual" /></label>
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
        {isProcessing && <div className="processing-banner"><span className="spinner" /> {ocrProgress ? `OCR local: ${ocrProgress.fileName} · página ${ocrProgress.page} · ${Math.round(ocrProgress.progress * 100)}%` : 'Extraindo texto dos PDFs no navegador…'}</div>}

        {page === 'overview' && (
          <Overview
            documents={documents}
            indicators={indicators}
            revenueChartData={revenueChartData}
            expenseChartData={expenseChartData}
            personnelChart={personnelChart}
            openDocuments={() => setPage('documents')}
            upload={() => setPage('documents')}
            loadDemo={loadDemo}
          />
        )}

        {page === 'documents' && (
          <DocumentsPage
            documents={documents}
            onUpload={() => fileInput.current?.click()}
            onUploadReport={uploadReport}
            onDropReport={(type, files) => void handleFiles(files, type)}
            onOpenPreview={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
            onRemove={removeDocument}
            onTypeChange={(id, type) => updateDocument(id, { type })}
            onFieldChange={updateField}
            loadDemo={loadDemo}
            isProcessing={isProcessing}
            processingReports={processingReports}
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
        {reportTypes.map((type) => (
          <input
            key={type}
            ref={(element) => { reportInputs.current[type] = element }}
            className="visually-hidden"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              void handleFiles(event.currentTarget.files, type)
              event.currentTarget.value = ''
            }}
          />
        ))}
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
        <p className="eyebrow">ANÁLISE CONTÁBIL E FINANCEIRA MUNICIPAL</p>
        <h2>Município Inteligente</h2>
        <p className="welcome-subtitle">Informação clara para apoiar a gestão pública municipal.</p>
        <p className="welcome-copy">Transforme demonstrativos contábeis e fiscais em informações claras para apoiar a análise das contas públicas e a tomada de decisões. Envie seus arquivos PDF, confira os dados extraídos, analise indicadores e identifique possíveis inconsistências em um único ambiente.</p>
        <div className="welcome-features">
          <h3>O que você pode fazer?</h3>
          <ul>
            <li>Analisar demonstrativos contábeis, orçamentários, financeiros e fiscais.</li>
            <li>Calcular indicadores e comparar informações.</li>
            <li>Identificar divergências que merecem atenção.</li>
            <li>Gerar diagnósticos e relatórios com base nos dados conferidos.</li>
          </ul>
        </div>
        <p className="welcome-start">Comece agora: importe os demonstrativos do município e inicie sua análise.</p>
        <div className="welcome-actions">
          <button className="button button-primary" onClick={upload}><Upload size={17} aria-hidden="true" /> Importar demonstrativos</button>
          <button className="button button-secondary" onClick={loadDemo}>Testar com dados fictícios</button>
        </div>
        <p className="welcome-tagline">Município Inteligente — mais clareza, controle e eficiência na análise das contas públicas.</p>
        <div className="welcome-tip"><CircleHelp size={16} aria-hidden="true" /><span>Os documentos são processados no navegador; confira os dados extraídos antes de gerar o diagnóstico.</span></div>
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
  onUploadReport: (type: DocumentType) => void
  onDropReport: (type: DocumentType, files: FileList) => void
  onOpenPreview: (url: string) => void
  onRemove: (id: string) => void
  onTypeChange: (id: string, type: DocumentType | null) => void
  onFieldChange: (id: string, key: MetricKey, value: string) => void
  loadDemo: () => void
  isProcessing: boolean
  processingReports: DocumentType[]
}

function DocumentsPage({ documents, onUpload, onUploadReport, onDropReport, onOpenPreview, onRemove, onTypeChange, onFieldChange, loadDemo, isProcessing, processingReports }: DocumentsPageProps) {
  return (
    <div className="page-content">
      <div className="section-heading">
        <div><h2>Demonstrativos por relatório</h2><p>Escolha um PDF para cada tipo de relatório. Você também pode arrastar e soltar o arquivo na respectiva área.</p></div>
        <button className="button button-secondary" onClick={onUpload} disabled={isProcessing}><Plus size={17} aria-hidden="true" /> Importar vários PDFs</button>
      </div>
      <div className="report-upload-grid">
        {reportTypes.map((type) => {
          const document = documents.find((item) => item.type === type)
          return (
            <article
              key={type}
              className={`report-upload-card${document ? ' report-upload-card-filled' : ''}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event: DragEvent<HTMLElement>) => {
                event.preventDefault()
                if (isProcessing) return
                onDropReport(type, event.dataTransfer.files)
              }}
            >
              <div className="report-upload-heading">
                <span className="report-upload-icon"><FileText size={17} aria-hidden="true" /></span>
                <div>
                  <strong>{DOCUMENT_TYPES[type]}</strong>
                  <span>{processingReports.includes(type) ? 'Processando PDF…' : document ? statusLabel(document.status) : 'Nenhum arquivo anexado'}</span>
                </div>
              </div>
              <div className="report-drop-area">
                <span className="report-file-name" title={document?.name}>{document?.name ?? 'Arraste o PDF para esta área'}</span>
                {document?.fileSize !== undefined && <small>{formatFileSize(document.fileSize)}</small>}
                <div className="report-upload-actions">
                  <button className="button button-secondary" onClick={() => onUploadReport(type)} disabled={isProcessing}>
                    <Upload size={14} aria-hidden="true" /> {document ? 'Substituir' : 'Selecionar PDF'}
                  </button>
                  {document && !document.isDemo && (
                    <button className="icon-button danger-icon" title="Remover arquivo" aria-label={`Remover ${document.name}`} onClick={() => onRemove(document.id)}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  )}
                  {document?.previewUrl && <button className="button button-secondary" onClick={() => onOpenPreview(document.previewUrl!)}>Prévia</button>}
                </div>
              </div>
              {document?.error && <p className="report-upload-error">{document.error}</p>}
            </article>
          )
        })}
      </div>
      <div className="section-heading report-extra-heading">
        <div><h2>Documentos extras</h2><p>Para arquivos complementares ou relatórios não listados acima.</p></div>
        <button className="button button-primary" onClick={onUpload} disabled={isProcessing}><Plus size={17} aria-hidden="true" /> Selecionar PDFs</button>
      </div>
      {documents.length > 0 ? (
        <div className="document-list">
          {documents.map((document) => {
            const fields = document.type ? METRICS_BY_DOCUMENT[document.type] : []
            return <article className="document-card" key={document.id}>
              <div className="document-card-header">
                <span className={`file-icon ${document.status === 'error' || document.status === 'no-text' ? 'file-icon-warning' : ''}`}><FileText size={20} aria-hidden="true" /></span>
                <div className="document-file-info">
                  <strong title={document.name}>{document.name}</strong>
                  <span>{document.pageCount !== undefined ? `${document.pageCount} página(s) · ` : ''}{document.fileSize !== undefined ? `${formatFileSize(document.fileSize)} · ` : ''}{document.isDemo ? 'Dado fictício' : statusLabel(document.status)}</span>
                  {document.pageReadings && (
                    <small className="page-reading-summary">{pageReadingSummary(document.pageReadings)}</small>
                  )}
                  {document.previewUrl && <button className="text-button" onClick={() => onOpenPreview(document.previewUrl!)}>Abrir prévia</button>}
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
                  {fields.map((field) => {
                    const source = document.fieldSources?.[field.key]
                    return <label key={field.key}>{field.label}
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Não identificado"
                        value={document.fields[field.key] ?? ''}
                        onChange={(event) => onFieldChange(document.id, field.key, event.target.value)}
                      />
                      {source && <small className="field-source">Página {source.pageNumber}: “{source.originalDescription}” · lido: {source.originalValue}{source.confidence !== null ? ` · confiança OCR ${Math.round(source.confidence * 100)}%` : ''}</small>}
                    </label>
                  })}
                </div>
                <p className="field-help">Revise os valores com o documento original. Use vírgula ou ponto como separador decimal; campos vazios não entram nos cálculos.</p>
              </details>}
            </article>
          })}
        </div>
      ) : <section className="empty-document-panel compact-empty-document"><p>Os dados extraídos e os campos para conferência aparecerão aqui depois que você carregar um PDF.</p><button className="button button-secondary" onClick={loadDemo}>Usar demonstração fictícia</button></section>}
      <section className="note-panel"><ShieldCheck size={18} aria-hidden="true" /><p>Os PDFs são processados no navegador e não são enviados a uma API. Páginas sem texto selecionável usam OCR local em português; na primeira utilização, o navegador baixa o modelo do Tesseract. A extração é preliminar: confira os valores com o original, inclusive quando a confiança do OCR for exibida.</p></section>
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function pageReadingSummary(readings: NonNullable<DocumentRecord['pageReadings']>): string {
  const ocrPages = readings.filter((page) => page.method === 'ocr')
  const emptyPages = readings.filter((page) => page.method === 'empty').length
  const parts = [`${readings.length - ocrPages.length - emptyPages} página(s) com texto`]
  if (ocrPages.length) {
    const confidence = ocrPages.flatMap((page) => page.confidence === null ? [] : [page.confidence])
    const average = confidence.length ? ` · confiança média ${Math.round(confidence.reduce((sum, value) => sum + value, 0) / confidence.length * 100)}%` : ''
    parts.push(`${ocrPages.length} por OCR${average}`)
  }
  if (emptyPages) parts.push(`${emptyPages} sem texto reconhecido`)
  return parts.join(' · ')
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
