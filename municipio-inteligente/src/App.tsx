import { lazy, Suspense, useMemo, useState } from 'react'
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
  RotateCcw,
  ShieldCheck,
  Trash2,
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

const reportTypes = Object.keys(DOCUMENT_TYPES) as DocumentType[]
const FinancialChart = lazy(() => import('./components/FinancialChart'))

function App() {
  const [page, setPage] = useState<Page>('overview')
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [manualInputValues, setManualInputValues] = useState<Record<string, Partial<Record<MetricKey, string>>>>({})
  const [municipality, setMunicipality] = useState('')
  const [state, setState] = useState('')
  const [exercise, setExercise] = useState('')
  const [period, setPeriod] = useState('')
  const [unit, setUnit] = useState<GovernmentUnit>('unknown')
  const [message, setMessage] = useState('')

  const indicators = useMemo(() => calculateIndicators(documents, unit), [documents, unit])
  const checks = useMemo(() => runCrossChecks(documents), [documents])
  const diagnosis = useMemo(() => buildDiagnosis(documents, unit), [documents, unit])
  const demoMode = documents.length > 0 && documents.every((document) => document.isDemo)

  function addManualDocument(type: DocumentType) {
    if (demoMode) {
      if (!window.confirm('Adicionar dados manuais vai substituir o conjunto fictício. Deseja continuar?')) return
      setDocuments([{
        id: crypto.randomUUID(),
        name: `Entrada manual — ${DOCUMENT_TYPES[type]}`,
        type,
        status: 'review',
        isManual: true,
        fields: {},
      }])
      setManualInputValues({})
      setMessage('A demonstração fictícia foi substituída. Informe manualmente os valores consultados no demonstrativo oficial.')
      return
    }
    if (documents.some((document) => document.type === type)) {
      setMessage(`${DOCUMENT_TYPES[type]} já foi incluído nesta análise. Edite os campos existentes.`)
      return
    }
    setDocuments((current) => [...current, {
      id: crypto.randomUUID(),
      name: `Entrada manual — ${DOCUMENT_TYPES[type]}`,
      type,
      status: 'review',
      isManual: true,
      fields: {},
    }])
    setMessage(`${DOCUMENT_TYPES[type]} adicionado. Informe manualmente os valores consultados no demonstrativo oficial.`)
  }

  function updateField(id: string, key: MetricKey, value: string) {
    setManualInputValues((current) => ({
      ...current,
      [id]: { ...current[id], [key]: value },
    }))
    const parsed = value.trim() ? parseBrazilianNumber(value) : undefined
    setDocuments((current) => current.map((document) => {
      if (document.id !== id) return document
      return { ...document, fields: { ...document.fields, [key]: parsed } }
    }))
  }

  function removeDocument(id: string) {
    setDocuments((current) => current.filter((item) => item.id !== id))
    setManualInputValues((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  function startNewAnalysis() {
    if (documents.length > 0 && !window.confirm('Iniciar uma nova análise e remover os demonstrativos e valores atuais desta sessão?')) return
    setDocuments([])
    setManualInputValues({})
    setMunicipality('')
    setState('')
    setExercise('')
    setPeriod('')
    setUnit('unknown')
    setMessage('Nova análise iniciada. Informe manualmente os valores dos demonstrativos; nenhum arquivo PDF é enviado ou processado.')
    setPage('overview')
  }

  function loadDemo() {
    if (documents.length > 0) {
      setMessage('Para manter os dados separados, inicie uma nova análise antes de carregar a demonstração.')
      return
    }
    setDocuments(DEMO_DOCUMENTS.map((document) => ({ ...document, fields: { ...document.fields } })))
    setManualInputValues({})
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
          <div className="privacy-note"><ShieldCheck size={17} aria-hidden="true" /><span>Preenchimento manual<br />sem upload de PDFs</span></div>
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
        {page === 'overview' && (
          <Overview
            documents={documents}
            indicators={indicators}
            revenueChartData={revenueChartData}
            expenseChartData={expenseChartData}
            personnelChart={personnelChart}
            openDocuments={() => setPage('documents')}
            loadDemo={loadDemo}
          />
        )}

        {page === 'documents' && (
          <DocumentsPage
            documents={documents}
            manualInputValues={manualInputValues}
            onAddReport={addManualDocument}
            onRemove={removeDocument}
            onFieldChange={updateField}
            loadDemo={loadDemo}
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
  loadDemo: () => void
}

function Overview({
  documents,
  indicators,
  revenueChartData,
  expenseChartData,
  personnelChart,
  openDocuments,
  loadDemo,
}: OverviewProps) {
  if (documents.length === 0) {
    return (
      <section className="welcome-panel">
        <div className="welcome-icon"><Building2 size={24} aria-hidden="true" /></div>
        <p className="eyebrow">ANÁLISE CONTÁBIL E FINANCEIRA MUNICIPAL</p>
        <h2>Município Inteligente</h2>
        <p className="welcome-subtitle">Informação clara para apoiar a gestão pública municipal.</p>
        <p className="welcome-copy">Informe manualmente os valores consultados nos demonstrativos contábeis e fiscais oficiais. O sistema calcula indicadores, aponta possíveis inconsistências e organiza as informações para apoiar a gestão municipal.</p>
        <div className="welcome-features">
          <h3>O que você pode fazer?</h3>
          <ul>
            <li>Analisar demonstrativos contábeis, orçamentários, financeiros e fiscais.</li>
            <li>Calcular indicadores e comparar informações.</li>
            <li>Identificar divergências que merecem atenção.</li>
            <li>Gerar diagnósticos e relatórios com base nos dados conferidos.</li>
          </ul>
        </div>
        <p className="welcome-start">Comece agora: escolha os demonstrativos e digite os valores diretamente no sistema.</p>
        <div className="welcome-actions">
          <button className="button button-primary" onClick={openDocuments}><FileText size={17} aria-hidden="true" /> Inserir dados manualmente</button>
          <button className="button button-secondary" onClick={loadDemo}>Testar com dados fictícios</button>
        </div>
        <p className="welcome-tagline">Município Inteligente — mais clareza, controle e eficiência na análise das contas públicas.</p>
        <div className="welcome-tip"><CircleHelp size={16} aria-hidden="true" /><span>Importante: este sistema não recebe nem lê PDFs. Consulte os demonstrativos oficiais e transcreva os valores nos campos. Confira cada valor antes de gerar o diagnóstico.</span></div>
      </section>
    )
  }

  return (
    <div className="page-content">
      <div className="section-heading">
        <div><h2>Resumo da análise</h2><p>Indicadores calculados com base nos valores informados manualmente.</p></div>
        <button className="button button-secondary" onClick={openDocuments}>Ver demonstrativos <ChevronRight size={16} aria-hidden="true" /></button>
      </div>
      <div className="metric-grid">
        <MetricCard label="Resultado orçamentário" value={formatCurrency(indicators.budgetResult)} icon={<Landmark size={18} />} helper="Receita realizada − despesa empenhada" />
        <MetricCard label="Liquidez corrente" value={indicators.currentRatio?.toFixed(2) ?? '—'} icon={<BarChart3 size={18} />} helper="Ativo circulante ÷ passivo circulante" />
        <MetricCard label="Despesa com pessoal / RCL" value={formatPercent(indicators.personnelRatio)} icon={<FileChartColumnIncreasing size={18} />} helper="Percentual calculado sobre a RCL" />
        <MetricCard label="Restos a pagar" value={formatCurrency(indicators.rpTotal)} icon={<FileText size={18} />} helper="Saldo final processado e não processado" />
      </div>
      <section className="panel document-summary">
        <div className="panel-heading"><div><h3>Demonstrativos desta análise</h3><p>{documents.length} demonstrativo(s) informado(s)</p></div><button className="text-button" onClick={openDocuments}>Conferir valores <ChevronRight size={15} /></button></div>
        <div className="document-chips">
          {documents.map((document) => <span className="document-chip" key={document.id}>
            <CheckCircle2 size={14} />
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
          <button className="text-button" onClick={openDocuments}>Revisar valores informados <ChevronRight size={15} /></button>
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
  manualInputValues: Record<string, Partial<Record<MetricKey, string>>>
  onAddReport: (type: DocumentType) => void
  onRemove: (id: string) => void
  onFieldChange: (id: string, key: MetricKey, value: string) => void
  loadDemo: () => void
}

function DocumentsPage({ documents, manualInputValues, onAddReport, onRemove, onFieldChange, loadDemo }: DocumentsPageProps) {
  return (
    <div className="page-content">
      <div className="section-heading">
        <div><h2>Inserção manual dos demonstrativos</h2><p>Selecione os tipos de demonstrativo e informe os valores consultando os documentos oficiais. O sistema não permite upload nem leitura de PDFs.</p></div>
      </div>
      <div className="manual-entry-grid">
        {reportTypes.map((type) => {
          const document = documents.find((item) => item.type === type)
          return (
            <article key={type} className={`manual-entry-card${document ? ' manual-entry-card-filled' : ''}`}>
              <span className="manual-entry-icon"><FileText size={17} aria-hidden="true" /></span>
              <div className="manual-entry-copy">
                <strong>{DOCUMENT_TYPES[type]}</strong>
                <span>{document ? 'Adicionado para preenchimento' : 'Ainda não informado'}</span>
              </div>
              <button className="button button-secondary" onClick={() => onAddReport(type)} disabled={Boolean(document)}>
                {document ? 'Adicionado' : 'Adicionar campos'}
              </button>
            </article>
          )
        })}
      </div>
      <section className="note-panel manual-entry-notice"><CircleHelp size={18} aria-hidden="true" /><p><strong>Preenchimento manual:</strong> nenhum PDF é enviado, anexado ou lido pelo sistema. Consulte o documento oficial por fora do aplicativo e digite os valores correspondentes. Use vírgula ou ponto como separador decimal; campos vazios ficam fora dos cálculos.</p></section>
      {documents.length > 0 ? (
        <div className="document-list">
          {documents.map((document) => {
            const fields = document.type ? METRICS_BY_DOCUMENT[document.type] : []
            return <article className="document-card" key={document.id}>
              <div className="document-card-header">
                <span className="file-icon"><FileText size={20} aria-hidden="true" /></span>
                <div className="document-file-info">
                  <strong title={document.name}>{document.name}</strong>
                  <span>{document.isDemo ? 'Dados fictícios' : document.isManual ? 'Preenchimento manual' : 'Dados informados'}</span>
                </div>
                {!document.isDemo && <button className="icon-button danger-icon" title="Remover arquivo" aria-label={`Remover ${document.name}`} onClick={() => onRemove(document.id)}><Trash2 size={17} /></button>}
              </div>
              {document.type && <details className="field-editor" open>
                <summary>Informe os valores do demonstrativo <span>{Object.values(document.fields).filter((value) => value !== undefined).length} campo(s) preenchido(s)</span></summary>
                <div className="field-grid">
                  {fields.map((field) => {
                    return <label key={field.key}>{field.label}
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Digite o valor"
                        value={manualInputValues[document.id]?.[field.key] ?? document.fields[field.key] ?? ''}
                        onChange={(event) => onFieldChange(document.id, field.key, event.target.value)}
                      />
                    </label>
                  })}
                </div>
                <p className="field-help">Transcreva os valores do documento oficial. Confira os números e o período; campos vazios não entram nos cálculos.</p>
              </details>}
            </article>
          })}
        </div>) : <section className="empty-document-panel compact-empty-document"><p>Escolha um ou mais tipos acima para abrir os campos de entrada manual. Os cálculos serão feitos somente com os valores digitados.</p><button className="button button-secondary" onClick={loadDemo}>Usar demonstração fictícia</button></section>}
    </div>
  )
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
    return <section className="welcome-panel compact-empty"><div className="welcome-icon"><FileChartColumnIncreasing size={22} /></div><h2>O diagnóstico será exibido aqui</h2><p>Adicione os demonstrativos e informe manualmente os valores para gerar uma análise baseada somente nos dados digitados.</p><button className="button button-primary" onClick={onAddDocuments}><FileText size={16} /> Inserir dados manualmente</button></section>
  }
  return (
    <div className="page-content">
      <div className="diagnosis-intro"><div><p className="eyebrow">ANÁLISE AUTOMÁTICA BASEADA EM REGRAS</p><h2>Diagnóstico financeiro</h2><p>Não foi utilizada IA generativa. As conclusões dependem da precisão dos valores informados manualmente.</p></div><span className="rule-badge"><ShieldCheck size={15} /> Regras determinísticas</span></div>
      <div className="diagnosis-grid">
        <DiagnosisSection title="Resumo geral" items={diagnosis.summary} icon={<BarChart3 size={18} />} />
        <DiagnosisSection title="Principais pontos de atenção" items={diagnosis.attention} icon={<AlertCircle size={18} />} variant="attention" />
        <DiagnosisSection title="Análise fiscal" items={diagnosis.fiscal} icon={<Landmark size={18} />} />
        <DiagnosisSection title="Recomendações gerenciais" items={diagnosis.recommendations} icon={<CheckCircle2 size={18} />} />
      </div>

      <section className="panel executive-summary-panel">
        <div className="panel-heading"><div><h3>Resumo executivo de gestão</h3><p>Indicadores-chave com leitura técnica e comparativa</p></div><FileChartColumnIncreasing size={18} /></div>
        <div className="executive-summary-grid">
          <div className="executive-summary-card executive-summary-positive">
            <span className="executive-summary-label">Resultado orçamentário</span>
            <strong>{formatCurrency(indicators.budgetResult)}</strong>
            <small>{(indicators.budgetResult ?? 0) >= 0 ? 'Superávit orçamentário' : 'Déficit orçamentário'}</small>
          </div>
          <div className="executive-summary-card executive-summary-neutral">
            <span className="executive-summary-label">Liquidez corrente</span>
            <strong>{indicators.currentRatio !== undefined ? indicators.currentRatio.toFixed(2) : '—'}</strong>
            <small>{indicators.currentRatio !== undefined ? (indicators.currentRatio >= 1 ? 'Sustentação operacional adequada' : 'Atenção à liquidez') : 'Dados insuficientes'}</small>
          </div>
          <div className="executive-summary-card executive-summary-warning">
            <span className="executive-summary-label">Despesa com pessoal / RCL</span>
            <strong>{formatPercent(indicators.personnelRatio)}</strong>
            <small>{indicators.fiscalLimits.maximum !== undefined ? (indicators.personnelRatio !== undefined && indicators.personnelRatio <= indicators.fiscalLimits.maximum ? 'Dentro do limite referencial' : 'Acima do limite referencial') : 'Limite fiscal pendente'}</small>
          </div>
          <div className="executive-summary-card executive-summary-info">
            <span className="executive-summary-label">Endividamento</span>
            <strong>{formatPercent(indicators.debtToAssets)}</strong>
            <small>{indicators.debtToAssets !== undefined ? (indicators.debtToAssets <= 60 ? 'Nível aceitável de estrutura de capital' : 'Estrutura mais endividada') : 'Dados insuficientes'}</small>
          </div>
        </div>
      </section>
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
      <section className="panel fiscal-summary">
        <div className="panel-heading"><div><h3>Relatório de gestão</h3><p>Indicadores calculados com base nas regras contábeis e na Lei de Responsabilidade Fiscal</p></div><FileText size={18} /></div>
        <div className="check-table-wrap">
          <table className="check-table">
            <thead>
              <tr>
                <th>Indicador</th>
                <th>Fórmula / regra aplicada</th>
                <th>Resultado</th>
                <th>Base normativa</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Resultado orçamentário</td>
                <td>Receita realizada − despesa empenhada</td>
                <td>{formatCurrency(indicators.budgetResult)}</td>
                <td>Lei nº 4.320/1964 e LRF</td>
              </tr>
              <tr>
                <td>Liquidez corrente</td>
                <td>Ativo circulante ÷ passivo circulante</td>
                <td>{indicators.currentRatio !== undefined ? indicators.currentRatio.toFixed(2) : 'Dados insuficientes'}</td>
                <td>Normas contábeis e esteira fiscal</td>
              </tr>
              <tr>
                <td>Endividamento</td>
                <td>(Passivo circulante + passivo não circulante) ÷ ativo total × 100</td>
                <td>{formatPercent(indicators.debtToAssets)}</td>
                <td>Estrutura contábil e análise de risco</td>
              </tr>
              <tr>
                <td>Despesa com pessoal sobre a RCL</td>
                <td>(Despesa total com pessoal ÷ RCL ajustada) × 100</td>
                <td>{formatPercent(indicators.personnelRatio)}</td>
                <td>Lei Complementar nº 101/2000 (LRF)</td>
              </tr>
              <tr>
                <td>Resultado patrimonial</td>
                <td>VPA − VPD</td>
                <td>{formatCurrency(indicators.dvpResult)}</td>
                <td>Demonstração das Variações Patrimoniais</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="field-help">Este bloco funciona como resumo executivo para a aba Diagnóstico, com indicadores calculados, fórmulas e referência técnica. A análise não substitui a revisão profissional e a comparação com os demonstrativos originais.</p>
      </section>
    </div>
  )
}

function DiagnosisSection({ title, items, icon, variant }: { title: string; items: string[]; icon: ReactNode; variant?: 'attention' }) {
  return <section className={`diagnosis-card ${variant === 'attention' ? 'diagnosis-attention' : ''}`}><div className="diagnosis-card-title"><span>{icon}</span><h3>{title}</h3></div><ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul></section>
}

export default App
