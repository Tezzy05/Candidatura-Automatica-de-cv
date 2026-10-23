import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Tailored } from '@/lib/types'
import { cn } from '@/lib/utils'

const tone = (score: number) => (score >= 80 ? 'text-ok' : score >= 60 ? 'text-foreground' : score >= 40 ? 'text-warn' : 'text-destructive')

export function History({ items, onOpen, onRemove }: { items: Tailored[]; onOpen: (t: Tailored) => void; onRemove: (id: string) => void }) {
  if (!items.length)
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        Cada currículo gerado fica guardado aqui. Um currículo por vaga.
      </div>
    )

  return (
    <ul className="divide-y rounded-lg border bg-card">
      {items.map((t) => (
        <li key={t.id} className="flex items-center gap-4 p-4">
          <button className="flex min-w-0 flex-1 items-center gap-4 text-left" onClick={() => onOpen(t)}>
            <span className={cn('w-12 shrink-0 font-mono text-xl font-semibold tabular-nums', tone(t.match.score))}>{t.match.score}%</span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{t.job.title}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {[t.job.company, new Date(t.createdAt).toLocaleDateString('pt-BR'), t.engine === 'ia' ? 'com IA' : 'motor local'].filter(Boolean).join(' · ')}
              </span>
            </span>
          </button>
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={() => onRemove(t.id)} aria-label="Apagar">
            <Trash2 />
          </Button>
        </li>
      ))}
    </ul>
  )
}
