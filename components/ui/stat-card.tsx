import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: "increase" | "decrease" | "neutral"
  }
  icon: LucideIcon
  color?: "blue" | "green" | "purple" | "orange" | "red"
  className?: string
}

export function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color = "blue",
  className 
}: StatCardProps) {
  const colors = {
    blue: "bg-blue-500",
    green: "bg-green-500", 
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    red: "bg-red-500"
  }

  const changeColors = {
    increase: "text-green-600",
    decrease: "text-red-600", 
    neutral: "text-gray-600"
  }

  const changeIcons = {
    increase: "↗",
    decrease: "↘",
    neutral: "→"
  }

  return (
    <motion.div
      className={cn(
        "bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className={cn("flex items-center text-sm mt-1", changeColors[change.type])}>
              <span className="mr-1">{changeIcons[change.type]}</span>
              <span>{Math.abs(change.value)}%</span>
            </div>
          )}
        </div>
        <div className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center text-white",
          colors[color]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  )
}

interface StatGridProps {
  stats: StatCardProps[]
  className?: string
}

export function StatGrid({ stats, className }: StatGridProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <StatCard {...stat} />
        </motion.div>
      ))}
    </div>
  )
}
