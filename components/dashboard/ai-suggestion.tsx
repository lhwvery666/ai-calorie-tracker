"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Sparkles, Loader2, MessageCircle, Trash2, Send, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface MealItem {
  foodName: string
  calories: number
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface AISuggestionProps {
  targetKcal: number
  consumedKcal: number
  meals: MealItem[]
}

// ── SSE stream helper (module-level, no re-creation on render) ─────────────────

async function readSuggestionStream(
  payload: {
    targetKcal: number
    consumedKcal: number
    meals: MealItem[]
    messages: ChatMessage[]
  },
  onDelta: (fullContent: string) => void,
  signal: AbortSignal
): Promise<string> {
  const res = await fetch("/api/suggestion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  })

  if (!res.body) throw new Error("No response body")

  // Handle non-streaming fallback (e.g., error plain-text response)
  const contentType = res.headers.get("content-type") ?? ""
  if (!contentType.includes("event-stream")) {
    const text = await res.text()
    onDelta(text)
    return text
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let fullContent = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    // Decode chunk and accumulate in buffer to handle partial SSE lines
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    // Keep the last (potentially incomplete) line in the buffer
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const data = line.slice(6).trim()
      if (data === "[DONE]") return fullContent
      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>
        }
        const delta = parsed.choices?.[0]?.delta?.content ?? ""
        if (delta) {
          fullContent += delta
          onDelta(fullContent)
        }
      } catch {
        // Malformed SSE chunk — skip silently
      }
    }
  }

  return fullContent
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AISuggestion({ targetKcal, consumedKcal, meals }: AISuggestionProps) {
  // Initial greeting shown at the top of the card
  const [greeting, setGreeting] = useState("")
  const [isGreetingLoading, setGreetingLoading] = useState(true)

  // Chat state
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [streamingText, setStreamingText] = useState("") // in-flight AI text
  const [isStreaming, setStreaming] = useState(false)
  const [input, setInput] = useState("")

  const abortRef = useRef<AbortController | null>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Stream initial greeting on mount / data change ────────────────────────
  useEffect(() => {
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setGreetingLoading(true)
    setGreeting("")

    readSuggestionStream(
      { targetKcal, consumedKcal, meals, messages: [] },
      (content) => setGreeting(content),
      ctrl.signal
    )
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setGreeting("今天吃得不错，继续保持均衡饮食！")
        }
      })
      .finally(() => setGreetingLoading(false))

    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKcal, consumedKcal])

  // Auto-scroll chat to bottom as new tokens arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages, streamingText])

  // ── Send a follow-up question ─────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput("")

    // Build full history: greeting → past rounds → new user message
    const historyForAPI: ChatMessage[] = [
      { role: "assistant", content: greeting },
      ...chatMessages,
      { role: "user", content: text },
    ]

    // Immediately show the user bubble
    setChatMessages((prev) => [...prev, { role: "user", content: text }])
    setStreaming(true)
    setStreamingText("")

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const fullReply = await readSuggestionStream(
        { targetKcal, consumedKcal, meals, messages: historyForAPI },
        (content) => setStreamingText(content),
        ctrl.signal
      )

      setChatMessages((prev) => {
        const next = [...prev, { role: "assistant" as const, content: fullReply }]
        // Keep at most 3 conversation rounds (6 messages) to prevent card bloat
        return next.slice(-6)
      })
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: "出了点小问题，再问我一次吧～" },
        ])
      }
    } finally {
      setStreaming(false)
      setStreamingText("")
    }
  }, [input, isStreaming, greeting, chatMessages, targetKcal, consumedKcal, meals])

  const handleClear = () => {
    abortRef.current?.abort()
    setChatMessages([])
    setStreamingText("")
    setStreaming(false)
    setInput("")
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Card className="mx-4 mt-4 border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-emerald-800 dark:text-emerald-300">
          <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          今日 AI 建议
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-3 space-y-3">

        {/* ── Initial greeting (streamed on mount) ── */}
        <div className="min-h-[40px] flex items-start">
          {isGreetingLoading && !greeting ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <span>AI 营养师正在分析中…</span>
            </div>
          ) : (
            <p className="text-sm text-emerald-700 dark:text-emerald-300/80 leading-relaxed">
              {greeting}
              {/* Blinking cursor while tokens are still arriving */}
              {isGreetingLoading && (
                <span className="ml-0.5 inline-block w-0.5 h-3.5 bg-emerald-500 animate-pulse align-middle" />
              )}
            </p>
          )}
        </div>

        {/* ── Chat toggle + clear row ── */}
        {!isGreetingLoading && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setShowChat((v) => {
                  if (!v) setTimeout(() => inputRef.current?.focus(), 150)
                  return !v
                })
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              {showChat ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  收起追问
                </>
              ) : (
                <>
                  <MessageCircle className="h-3.5 w-3.5" />
                  追问 AI 营养师
                </>
              )}
            </button>

            {showChat && (chatMessages.length > 0 || isStreaming) && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 text-xs text-gray-400 dark:text-zinc-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                清空
              </button>
            )}
          </div>
        )}

        {/* ── Expandable chat panel ── */}
        {showChat && (
          <div className="border-t border-emerald-200 dark:border-emerald-800 pt-3 space-y-3">

            {/* Message bubbles */}
            {(chatMessages.length > 0 || isStreaming) && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5 scrollbar-thin">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[86%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                        msg.role === "user"
                          ? "bg-emerald-500 text-white rounded-br-sm"
                          : "bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border border-emerald-100 dark:border-zinc-700 rounded-bl-sm"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {/* In-flight streaming bubble */}
                {isStreaming && (
                  <div className="flex justify-start">
                    <div className="max-w-[86%] rounded-2xl rounded-bl-sm px-3 py-2 text-xs leading-relaxed bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border border-emerald-100 dark:border-zinc-700">
                      {streamingText ? (
                        <>
                          {streamingText}
                          {/* Typewriter cursor */}
                          <span className="ml-0.5 inline-block w-0.5 h-3 bg-emerald-500 animate-pulse align-middle" />
                        </>
                      ) : (
                        <span className="flex items-center gap-1.5 text-emerald-500">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          思考中…
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Scroll anchor */}
                <div ref={chatBottomRef} />
              </div>
            )}

            {/* Input row */}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="问问 AI 营养师…"
                disabled={isStreaming}
                className="flex-1 text-xs rounded-full border border-emerald-200 dark:border-emerald-800 bg-white/80 dark:bg-zinc-800/80 px-4 py-2 outline-none focus:border-emerald-400 dark:focus:border-emerald-600 focus:ring-2 focus:ring-emerald-400/20 placeholder-emerald-300 dark:placeholder-emerald-700 text-gray-700 dark:text-gray-300 transition-all disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:bg-emerald-300 dark:disabled:bg-emerald-800 text-white transition-all shrink-0"
              >
                {isStreaming ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  )
}
