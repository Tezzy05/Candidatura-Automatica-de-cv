import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { Check, Minus, TriangleAlert } from 'lucide-react'
import { useEffect } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { MatchResult } from '@/lib/types'
import { cn } from '@/lib/utils'

const LEVEL_TEXT: Record<MatchResult['level'], string> = {
  alta: 'Aderência alta. Candidate-se.',
  boa: 'Boa aderência. Vale se candidatar.',
  média: 'Aderência média. Candidate-se se os pontos que faltam forem aprendíveis rápido.',
  baixa: 'Aderência baixa para o seu perfil atual.',
}

function Ring({ value }: { value: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  const mv = useMotionValue(0)
  const offset = useTransform(mv, (v) => c - (v / 100) * c)
  const label = useTransform(mv, (v) => `${Math.round(v)}`)
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [mv, value])

  return (
    <div className="relative size-32 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="8" className="stroke-border" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          style={{ strokeDashoffset: offset }}
          className="stroke-brand"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="flex items-baseline font-semibold tracking-tight tabular-nums">
          <motion.span className="text-4xl">{label}</motion.span>
          <span className="text-lg text-muted-foreground">%</span>
        </span>
        <span className="eyebrow">aderência</span>
      </div>
    </div>
  )
}

export function ScoreCard({ match }: { match: MatchResult }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <Ring value={match.score} />
        <div className="w-full space-y-3">
          <p className="text-sm font-medium">{LEVEL_TEXT[match.level]}</p>
          {match.breakdown.map((b) => (
            <div key={b.label} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span>
                  {b.label} <span className="text-muted-foreground">· peso {b.weight}%</span>
                </span>
                <span className="font-mono tabular-nums">{b.score}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-foreground"
                  initial={{ width: 0 }}
                  animate={{ width: `${b.score}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{b.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {match.keywords.length > 0 && (
        <div className="mt-5 border-t pt-4">
          <p className="eyebrow mb-2">Palavras-chave da vaga</p>
          <div className="flex flex-wrap gap-1.5">
            {match.matched.map((k) => (
              <Tooltip key={k.key}>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs',
                      k.levelGap ? 'border-warn/30 bg-warn/10 text-warn' : 'border-ok/25 bg-ok/10 text-ok',
                    )}
                  >
                    {k.levelGap ? <TriangleAlert className="size-3" /> : <Check className="size-3" />}
                    {k.label}
                    {!k.required && <span className="opacity-60">· dif.</span>}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {k.levelGap ? `Seu perfil diz: ${k.ownLabel}` : `Encontrado em: ${k.evidence.join(', ')}`}
                </TooltipContent>
              </Tooltip>
            ))}
            {match.missing.map((k) => (
              <span
                key={k.key}
                className="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-0.5 text-xs text-muted-foreground"
              >
                <Minus className="size-3" />
                {k.label}
                {!k.required && <span className="opacity-60">· dif.</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
