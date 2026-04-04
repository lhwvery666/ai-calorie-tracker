"use client"

import { useState } from "react"
import { Plus, Pencil, ChevronDown, Coffee, Sun, Moon, Cookie } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

// Serialized Meal as passed from the Server Component (Date → ISO string)
export interface MealRecord {
  id: string
  foodName: string
  calories: number
  protein: number | null
  carbs: number | null
  fat: number | null
  portionSize: string | null
  mealType: string
  imageUrl: string | null
  createdAt: string
}

// Internal display shape used by MealSection
interface MealEntry {
  id: string
  name: string
  weight: string
  calories: number
  image: string
}

interface MealSectionProps {
  icon: React.ReactNode
  title: string
  time: string
  totalCalories: number
  entries: MealEntry[]
  defaultOpen?: boolean
}

function MealSection({
  icon,
  title,
  time,
  totalCalories,
  entries,
  defaultOpen = false,
}: MealSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                {icon}
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-gray-900 dark:text-white">{title}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{time}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {totalCalories} 千卡
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
                onClick={(e) => e.stopPropagation()}
              >
                <Plus className="h-5 w-5" />
              </Button>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-gray-400 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {entries.length > 0 ? (
            <div className="border-t border-gray-100 dark:border-zinc-800">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <img
                    src={entry.image}
                    alt={entry.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900 dark:text-white">{entry.name}</span>
                    {entry.weight && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        {entry.weight}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {entry.calories} 千卡
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-t border-gray-100 dark:border-zinc-800 p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              暂无记录，点击 + 添加食物
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// Map a MealRecord to the display-only MealEntry shape
const toEntry = (m: MealRecord): MealEntry => ({
  id:       m.id,
  name:     m.foodName,
  weight:   m.portionSize ?? "",
  calories: m.calories,
  // Use the stored image if available; fall back to a food placeholder
  image:    m.imageUrl ?? "/placeholder.jpg",
})

// Format an ISO date string → "HH:MM"
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("zh-CN", {
    hour:   "2-digit",
    minute: "2-digit",
    hour12: false,
  })

interface MealLogProps {
  meals: MealRecord[]
}

export function MealLog({ meals }: MealLogProps) {
  // Group helper — maps one or more mealType values to a section
  const group = (...types: string[]) => meals.filter((m) => types.includes(m.mealType))

  const sections = [
    { key: "早餐", icon: <Coffee className="h-5 w-5" />, records: group("早餐"),           defaultTime: "07:30" },
    { key: "午餐", icon: <Sun    className="h-5 w-5" />, records: group("午餐"),           defaultTime: "12:30" },
    { key: "晚餐", icon: <Moon   className="h-5 w-5" />, records: group("晚餐"),           defaultTime: "19:00" },
    { key: "零食", icon: <Cookie className="h-5 w-5" />, records: group("零食", "下午茶"), defaultTime: "随时"  },
  ]

  return (
    <div className="px-4 mt-6 pb-32">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">饮食记录</h2>

      {/* Global empty state hint — only shown when there are no meals at all */}
      {meals.length === 0 && (
        <div className="text-center py-8 mb-4">
          <p className="text-base text-gray-400 dark:text-zinc-500">今日暂无饮食记录</p>
          <p className="text-sm text-gray-400 dark:text-zinc-600 mt-1">
            点击下方相机按钮，拍照识别食物 📷
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sections.map((s) => (
          <MealSection
            key={s.key}
            icon={s.icon}
            title={s.key}
            // Show the time of the most-recent entry if available
            time={s.records.length > 0 ? formatTime(s.records[0].createdAt) : s.defaultTime}
            totalCalories={s.records.reduce((sum, m) => sum + m.calories, 0)}
            entries={s.records.map(toEntry)}
            // Auto-expand sections that have data
            defaultOpen={s.records.length > 0}
          />
        ))}
      </div>
    </div>
  )
}
