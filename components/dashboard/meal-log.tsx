"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronDown, Coffee, Sun, Moon, Cookie, Utensils, Trash2 } from "lucide-react"
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
  image: string | null   // null = no photo uploaded
}

// Small rounded image preview — shows the uploaded photo or a styled placeholder icon
function FoodImagePreview({ src, alt }: { src: string | null; alt: string }) {
  const [errored, setErrored] = useState(false)

  if (src && !errored) {
    return (
      <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="48px"
          className="object-cover"
          onError={() => setErrored(true)}
        />
      </div>
    )
  }

  // Default placeholder — grey box with a fork-knife icon
  return (
    <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
      <Utensils className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
    </div>
  )
}

interface MealSectionProps {
  icon: React.ReactNode
  title: string
  time: string
  totalCalories: number
  entries: MealEntry[]
  defaultOpen?: boolean
  onDelete: (id: string) => void
  deletingId: string | null
}

function MealSection({
  icon,
  title,
  time,
  totalCalories,
  entries,
  defaultOpen = false,
  onDelete,
  deletingId,
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
                {totalCalories} kcal
              </span>
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
                  <FoodImagePreview src={entry.image} alt={entry.name} />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900 dark:text-white">{entry.name}</span>
                    {entry.weight && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        {entry.weight}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white shrink-0">
                    {entry.calories} kcal
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}
                    disabled={deletingId === entry.id}
                    className={cn(
                      "shrink-0 p-1 rounded-lg transition-all duration-200",
                      "text-gray-300 dark:text-zinc-600",
                      "hover:text-rose-500 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-950/30",
                      "md:opacity-30 md:hover:opacity-100",
                      deletingId === entry.id && "opacity-50 cursor-not-allowed"
                    )}
                    aria-label={`Delete ${entry.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-t border-gray-100 dark:border-zinc-800 p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No entries yet
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
  // Pass the real URL through; null triggers the placeholder icon in FoodImagePreview
  image:    m.imageUrl ?? null,
})

// Format an ISO date string → "HH:MM"
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour:   "2-digit",
    minute: "2-digit",
    hour12: false,
  })

interface MealLogProps {
  meals: MealRecord[]
}

export function MealLog({ meals }: MealLogProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/meals/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      startTransition(() => router.refresh())
    } catch {
      // silent — icon just returns to normal
    } finally {
      setDeletingId(null)
    }
  }

  // Group helper — maps one or more mealType values to a section
  const group = (...types: string[]) => meals.filter((m) => types.includes(m.mealType))

  const sections = [
    { key: "早餐", label: "Breakfast", icon: <Coffee className="h-5 w-5" />, records: group("早餐"),           defaultTime: "07:30"    },
    { key: "午餐", label: "Lunch",     icon: <Sun    className="h-5 w-5" />, records: group("午餐"),           defaultTime: "12:30"    },
    { key: "晚餐", label: "Dinner",    icon: <Moon   className="h-5 w-5" />, records: group("晚餐"),           defaultTime: "19:00"    },
    { key: "零食", label: "Snacks",    icon: <Cookie className="h-5 w-5" />, records: group("零食", "下午茶"), defaultTime: "Anytime"  },
  ]

  return (
    <div className="px-4 md:px-0 mt-6 pb-32">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Today&apos;s Meals</h2>

      {/* Global empty state hint — only shown when there are no meals at all */}
      {meals.length === 0 && (
        <div className="text-center py-8 mb-4">
          <p className="text-base text-gray-400 dark:text-zinc-500">No meals logged today</p>
          <p className="text-sm text-gray-400 dark:text-zinc-600 mt-1">
            Tap the camera button below to snap &amp; log a meal 📷
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sections.map((s) => (
          <MealSection
            key={s.key}
            icon={s.icon}
            title={s.label}
            time={s.records.length > 0 ? formatTime(s.records[0].createdAt) : s.defaultTime}
            totalCalories={s.records.reduce((sum, m) => sum + m.calories, 0)}
            entries={s.records.map(toEntry)}
            defaultOpen={s.records.length > 0}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        ))}
      </div>
    </div>
  )
}
