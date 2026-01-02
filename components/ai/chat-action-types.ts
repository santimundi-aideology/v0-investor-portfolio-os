export type ChatAction =
  | { type: "navigate"; label?: string; href: string }
  | { type: "toast"; label?: string; message: string }

export type ChatChart =
  | {
      type: "bar"
      title?: string
      xKey: string
      bars: { key: string; label?: string }[]
      data: Record<string, string | number>[]
    }

export type ChatActionBlock = {
  actions?: ChatAction[]
  charts?: ChatChart[]
}


