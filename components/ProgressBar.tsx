interface ProgressBarProps {
  current: number
  total: number
  overBudget?: boolean
}

export default function ProgressBar({ current, total, overBudget }: ProgressBarProps) {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0
  const isWarning = percentage > 80 && !overBudget
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div
        className={`h-2.5 rounded-full transition-all ${
          overBudget
            ? 'bg-red-600'
            : isWarning
            ? 'bg-yellow-500'
            : 'bg-green-600'
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

