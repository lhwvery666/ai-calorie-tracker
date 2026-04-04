"use client"

import { ChevronLeft, ChevronRight, Settings, LogOut, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
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
  return (
    <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md dark:bg-zinc-900/90 border-b border-gray-100 dark:border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex flex-col">
          <span className="text-sm text-gray-500 dark:text-gray-400">欢迎回来，</span>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            Hi, {userName ?? "朋友"}! 👋
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:ring-2 hover:ring-emerald-500/20">
              <Avatar className="h-10 w-10">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Arch" alt="用户头像" />
                <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">AR</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              个人资料
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              设置
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400">
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Date Slider */}
      <div className="px-4 pb-4">
        <Card className="flex items-center justify-between p-3 shadow-sm border-gray-100 dark:border-zinc-800">
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col items-center">
            <span className="font-medium text-gray-900 dark:text-white">周一, 3月 30日</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">
              查看历史记录
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </Card>
      </div>
    </div>
  )
}
