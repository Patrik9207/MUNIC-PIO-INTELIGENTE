import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CircleHelp } from 'lucide-react'
import { formatCurrency } from '../utils/format'

interface FinancialChartProps {
  title: string
  subtitle: string
  data: Array<{ name: string; value: number }>
}

export default function FinancialChart({ title, subtitle, data }: FinancialChartProps) {
  return (
    <section className="panel chart-panel">
      <div className="panel-heading">
        <div><h3>{title}</h3><p>{subtitle}</p></div>
      </div>
      {data.length > 0 ? (
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#e9edf1" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#697787', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(value: number) => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}
                tick={{ fill: '#697787', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="value" name="Valor" fill="#287bb8" radius={[3, 3, 0, 0]} maxBarSize={56} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#526171' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-empty"><CircleHelp size={19} aria-hidden="true" /><span>Dados insuficientes para exibir este gráfico.</span></div>
      )}
    </section>
  )
}
