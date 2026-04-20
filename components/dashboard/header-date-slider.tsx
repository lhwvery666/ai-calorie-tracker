"use client"

import { Settings, LogOut, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HeaderDateSliderProps {
  userName?: string | null
}

export function HeaderDateSlider({ userName }: HeaderDateSliderProps) {
  const router = useRouter()

  const handleComingSoon = () => {
    toast("This feature is coming soon — stay tuned!")
  }

  const handleLogout = () => {
    localStorage.clear()
    router.push("/login")
  }

  return (
    <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md dark:bg-zinc-900/90 border-b border-gray-100 dark:border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex flex-col">
          <span className="text-sm text-gray-500 dark:text-gray-400">Welcome back,</span>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            Hi, {userName ?? "there"}! 👋
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:ring-2 hover:ring-emerald-500/20">
              <Avatar className="h-10 w-10">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Arch" alt="User avatar" />
                <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">AR</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="cursor-pointer" onClick={handleComingSoon}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={handleComingSoon}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
