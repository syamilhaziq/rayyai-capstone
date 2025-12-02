import { useMemo, useState, useEffect } from 'react'
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { API_BASE_URL } from '../services/api'

const segments = ["1D","1W","1M","1Y"]

export default function DailySpendingChart({ selectedDate = new Date(), viewMode = 'monthly' }) {
  const [seg, setSeg] = useState("1D")
  const [expenseData, setExpenseData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')

        let startDate, endDate

        if (viewMode === 'yearly') {
          // For yearly view, fetch the entire selected year
          startDate = new Date(selectedDate.getFullYear(), 0, 1)
          const isCurrentYear = selectedDate.getFullYear() === new Date().getFullYear()
          endDate = isCurrentYear ? new Date() : new Date(selectedDate.getFullYear(), 11, 31)
        } else {
          // For monthly view, use the segment selection
          const isCurrentMonth = selectedDate.getMonth() === new Date().getMonth() &&
                                selectedDate.getFullYear() === new Date().getFullYear()
          const endOfMonth = isCurrentMonth
            ? new Date()
            : new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)

          startDate = new Date(endOfMonth)

          // Calculate date range based on segment, but constrained to selected month
          if (seg === "1D") {
            startDate.setDate(endOfMonth.getDate() - 1)
          } else if (seg === "1W") {
            startDate.setDate(endOfMonth.getDate() - 7)
          } else if (seg === "1M") {
            startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
          } else if (seg === "1Y") {
            startDate.setFullYear(endOfMonth.getFullYear() - 1)
          }

          endDate = endOfMonth
        }

        const startDateStr = startDate.toISOString().split('T')[0]
        const endDateStr = endDate.toISOString().split('T')[0]

        console.log(`Fetching expenses for ${seg}: ${startDateStr} to ${endDateStr}`)

        const response = await fetch(
          `${API_BASE_URL}/transactions/expense?start_date=${startDateStr}&end_date=${endDateStr}&limit=500`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (response.ok) {
          const expenses = await response.json()
          console.log(`Received ${expenses.length} expenses for ${seg}`)

          // Group expenses by appropriate time period
          const groupedByDate = expenses.reduce((acc, expense) => {
            const dateObj = new Date(expense.date_spent)
            let dateKey

            // For yearly view or 1Y segment, group by month; otherwise group by day
            if (viewMode === 'yearly' || seg === '1Y') {
              dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
            } else {
              dateKey = dateObj.toISOString().split('T')[0]
            }

            if (!acc[dateKey]) {
              acc[dateKey] = {
                dateKey,
                dateObj: dateObj,
                needs: 0,
                wants: 0
              }
            }
            if (expense.expense_type === 'needs') {
              acc[dateKey].needs += expense.amount
            } else {
              acc[dateKey].wants += expense.amount
            }
            return acc
          }, {})

          // Sort by date and format for display based on timeframe
          const chartData = Object.values(groupedByDate)
            .sort((a, b) => a.dateObj - b.dateObj)
            .map(item => {
              // For different timeframes, use appropriate date format
              let dateStr = ''
              if (viewMode === 'yearly' || seg === '1Y') {
                // Show month/year for yearly view
                dateStr = item.dateObj.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
              } else if (seg === '1M') {
                // Show day/month for monthly view
                dateStr = item.dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              } else {
                // Show full dd/mm/yyyy for weekly view
                dateStr = item.dateObj.toLocaleDateString('en-GB')
              }

              return {
                date: dateStr,
                needs: Math.round(item.needs * 100) / 100,
                wants: Math.round(item.wants * 100) / 100
              }
            })

          setExpenseData(chartData)
        }
      } catch (error) {
        console.error('Error fetching expenses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchExpenses()
  }, [seg, selectedDate, viewMode])

  const data = useMemo(() => {
    return expenseData.length > 0 ? expenseData : [{ date: "No data", needs: 0, wants: 0 }]
  }, [expenseData])

  return (
    <div className="rounded-xl p-6 text-[#04362c]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-6xl md:text-5xl font-semibold text-[#04362c] mb-2">Spending Breakdown</h3>
          <p className="text-[#04362c]/80 text-xl">Needs vs Wants</p>
        </div>
        <div className="bg-background/15 rounded-full p-1 flex items-center gap-2 backdrop-blur">
          {segments.map(s => (
            <button key={s} onClick={()=>setSeg(s)}
              className={(seg===s?"bg-white text-[#04362c] shadow ":"text-[#04362c]/90 hover:bg-primary-foreground/10 ")+"text-2xl px-4 py-1 rounded-full transition"}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[28rem]"> {/* taller for wide screens */}
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#04362c]/80 text-xl">Loading...</p>
          </div>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="needsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9eb8b9" stopOpacity={0.35}/>
                <stop offset="95%" stopColor="#9eb8b9" stopOpacity={0.08}/>
              </linearGradient>
              <linearGradient id="wantsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#586c75" stopOpacity={0.45}/>
                <stop offset="95%" stopColor="#586c75" stopOpacity={0.08}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(88,108,117,.9)', fontSize: 18 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(88,108,117,.9)', fontSize: 18 }} />
            <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,.95)', border: 'none' }} />
            <Area type="monotone" dataKey="needs" stroke="#6f948d" strokeWidth={4} fill="url(#needsGradient)" activeDot={{ r: 6, fill: '#6f948d' }} />
            <Area type="monotone" dataKey="wants" stroke="#0DAD8D" strokeWidth={4} fill="url(#wantsGradient)" activeDot={{ r: 6, fill: '#0DAD8D' }} />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>

      <div className="flex items-center gap-6 mt-4">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#6f948d]"></div><span className="text-xl">Needs</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#0DAD8D]"></div><span className="text-xl">Wants</span></div>
      </div>
    </div>
  )
}
