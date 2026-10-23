import { AnimatePresence, motion } from 'motion/react'
import { Copy, Download, Loader2, Sparkles, TriangleAlert, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { AiSettings } from '@/lib/ai-config'
import { tailorLocal } from '@/lib/tailor'
import type { Job, Profile, Tailored } from '@/lib/types'
import { pdfFileName, resumeToText } from '@/lib/export'
import { ResumePaper } from './ResumePaper'
import { ScoreCard } from './ScoreCard'

const RULES = [
  ['Formato', '1 coluna, 1 página, PDF. Sem foto, sem tabela, sem barrinhas.'],
  ['Topo', 'Nome, cidade, telefone, e-mail e LinkedIn. Sem CPF nem idade.'],
  ['Título', 'O nome exato da vaga, logo abaixo do seu nome.'],
  ['Resumo', 'Três linhas: quem você é, o que domina e o que entrega.'],
  ['Palavras-chave', 'Os termos da vaga, escritos como a vaga escreve.'],
  ['Experiência', 'Verbo + ação + número. Nada de "fazia relatórios".'],
  ['Sem experiência?', 'Projetos, voluntariado e empresa júnior contam.'],
]

interface Props {
  profile: Profile
  job: Job
  onJobChange: (j: Job) => void
  result: Tailored | null
  onResult: (t: Tailored) => void
  settings: AiSettings
  onNeedKey: () => void
  onGoToProfile: () => void
}

export function JobPanel({ profile, job, onJobChange, result, onResult, settings, onNeedKey, onGoToProfile }: Props) {
  const [busy, setBusy] = useState(false)
  const [overflow, setOverflow] = useState(false)
  const set = (k: keyof Job) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onJobChange({ ...job, [k]: e.target.value })

  const profileEmpty = !profile.name && profile.skills.length === 0 && profile.experiences.length === 0
  const ready = job.title.trim() && job.description.trim().length > 30

  const generate = async (withAI: boolean) => {
    if (profileEmpty) {
      toast.info('Preencha seu perfil primeiro (ou carregue o exemplo).')
      return onGoToProfile()
    }
    if (withAI && !settings.apiKey) return onNeedKey()
    const local = tailorLocal(profile, job)
    if (!withAI) return onResult(local)
    setBusy(true)
    const ai = await import('@/lib/ai')
    try {
      onResult(await ai.tailorWithAI(settings, profile, job, local))
    } catch (err) {
      toast.error(ai.friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const printPdf = () => {
    if (!result) return
    const previous = document.title
    document.title = pdfFileName(result.resume)
    window.print()
    document.title = previous
  }

  const copyText = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(resumeToText(result.resume))
      toast.success('Texto copiado')
    } catch {
      toast.error('Não consegui copiar. Seu navegador bloqueou a área de transferência.')
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <section className="space-y-4 rounded-lg border bg-card p-5">
          <h2 className="eyebrow text-foreground">A vaga</h2>
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs">Título da vaga</Label>
            <Input id="title" value={job.title} onChange={set('title')} placeholder="Analista de Dados Júnior" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-xs">Empresa</Label>
              <Input id="company" value={job.company} onChange={set('company')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-xs">Local</Label>
              <Input id="location" value={job.location} onChange={set('location')} placeholder="São Paulo · Híbrido" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc" className="text-xs">Descrição completa</Label>
            <Textarea
              id="desc"
              rows={12}
              value={job.description}
              onChange={set('description')}
              className="max-h-[45vh] font-mono text-xs"
              placeholder="Cole aqui o texto da vaga inteiro: requisitos, diferenciais, atividades..."
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" size="lg" disabled={!ready || busy} onClick={() => generate(false)}>
              <Wand2 /> Analisar e gerar
            </Button>
            <Button className="flex-1" size="lg" variant="outline" disabled={!ready || busy} onClick={() => generate(true)}>
              {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {busy ? 'Escrevendo...' : 'Gerar com IA'}
            </Button>
          </div>
          {!ready && <p className="text-xs text-muted-foreground">Preencha o título e cole a descrição da vaga.</p>}
        </section>
      </div>

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.section key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-lg border border-dashed p-6">
            <p className="eyebrow">O que o sistema faz por você</p>
            <ol className="mt-4 space-y-3">
              {RULES.map(([t, d], i) => (
                <li key={t} className="flex gap-3 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand font-mono text-[11px] text-white">{i + 1}</span>
                  <span>
                    <strong className="font-medium">{t}.</strong> <span className="text-muted-foreground">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm text-muted-foreground">
              E calcula quanto do seu perfil atende a vaga, sem inventar nada: o que você não tem vira dica, não linha no currículo.
            </p>
          </motion.section>
        ) : (
          <motion.div
            key={result.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0 space-y-4"
          >
            <ScoreCard match={result.match} />

            {result.aiNote && (
              <div className="rounded-lg border bg-card p-4 text-sm">
                <p className="eyebrow mb-1">Avaliação da IA</p>
                <p>{result.aiNote}</p>
              </div>
            )}

            {result.warnings && result.warnings.length > 0 && (
              <div className="rounded-lg border border-warn/30 bg-warn/5 p-4 text-sm">
                <p className="mb-2 flex items-center gap-1.5 font-medium text-warn">
                  <TriangleAlert className="size-4" /> Confira antes de enviar
                </p>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {result.warnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              </div>
            )}

            {result.tips.length > 0 && (
              <div className="rounded-lg border bg-card p-4 text-sm">
                <p className="eyebrow mb-2">Para subir sua aderência</p>
                <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                  {result.tips.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <p className="eyebrow">
                Currículo · {result.engine === 'ia' ? 'escrito com IA' : 'motor local'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyText}>
                  <Copy /> Copiar texto
                </Button>
                <Button size="sm" onClick={printPdf}>
                  <Download /> Baixar PDF
                </Button>
              </div>
            </div>
            {overflow && (
              <p className="flex items-center gap-1.5 text-xs text-warn">
                <TriangleAlert className="size-3.5" /> Passou de 1 página. Encurte conquistas antigas ou projetos no perfil.
              </p>
            )}
            <ResumePaper resume={result.resume} onOverflow={setOverflow} />
            <p className="text-xs text-muted-foreground">
              No diálogo de impressão, escolha <strong>Salvar como PDF</strong>. O arquivo sai como {pdfFileName(result.resume)}.pdf, com texto
              selecionável (o robô de triagem lê).
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
