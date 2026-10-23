import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AI_ENABLED, MODELS, type AiSettings } from '@/lib/ai-config'
import { importProfileText } from '@/lib/importer'
import type { Profile } from '@/lib/types'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange, settings, onSave }: DialogProps & { settings: AiSettings; onSave: (s: AiSettings) => void }) {
  const [draft, setDraft] = useState(settings)
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft(settings)
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inteligência artificial (opcional)</DialogTitle>
          <DialogDescription>
            Sem chave, o sistema funciona com o motor local. Com uma chave da API da Anthropic, o Claude reescreve o currículo com
            mais naturalidade e importa seu CV antigo. A chave fica salva só neste navegador e vai direto para a Anthropic.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="key" className="text-xs">Chave da API</Label>
            <Input id="key" type="password" autoComplete="off" placeholder="sk-ant-..." value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value.trim() })} />
            <p className="text-xs text-muted-foreground">
              Crie em{' '}
              <a className="underline" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
                console.anthropic.com
              </a>
              . Cada currículo gerado custa alguns centavos.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model" className="text-xs">Modelo</Label>
            <select id="model" className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm" value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })}>
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          {settings.apiKey && (
            <Button variant="ghost" onClick={() => { onSave({ ...draft, apiKey: '' }); onOpenChange(false) }}>
              Remover chave
            </Button>
          )}
          <Button onClick={() => { onSave(draft); onOpenChange(false); toast.success('Configurações salvas') }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ImportDialog({ open, onOpenChange, settings, onImport, onNeedKey }: DialogProps & { settings: AiSettings; onImport: (p: Profile) => void; onNeedKey: () => void }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const done = (p: Profile, found?: string[]) => {
    onImport(p)
    toast.success(found?.length ? `Encontrei: ${found.join(', ')}. Revise os campos.` : 'Perfil importado. Revise e complete o que faltar.')
    setText('')
    onOpenChange(false)
  }

  const runLocal = () => {
    const { profile, found } = importProfileText(text)
    if (found.length < 2) return toast.error('Não reconheci quase nada nesse texto. Confira se colou o currículo inteiro.')
    done(profile, found)
  }

  const runAI = async () => {
    if (!settings.apiKey) return onNeedKey()
    setBusy(true)
    const ai = await import('@/lib/ai')
    try {
      done(await ai.importProfileWithAI(settings, text))
    } catch (err) {
      toast.error(ai.friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar currículo antigo</DialogTitle>
          <DialogDescription>
            Cole o texto do seu currículo atual (Word ou PDF: selecione tudo e copie) ou do PDF do seu perfil do LinkedIn. O sistema separa
            contato, experiências, formação e competências; depois você revisa os campos. CPF, idade e estado civil são descartados. O
            perfil atual será substituído.
          </DialogDescription>
        </DialogHeader>
        <Textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder="Cole aqui..." className="max-h-[50vh] font-mono text-xs" />
        <DialogFooter>
          {AI_ENABLED && (
            <Button variant="outline" onClick={runAI} disabled={busy || text.trim().length < 40}>
              {busy && <Loader2 className="animate-spin" />}
              {busy ? 'Organizando...' : 'Importar com IA'}
            </Button>
          )}
          <Button onClick={runLocal} disabled={busy || text.trim().length < 40}>
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
