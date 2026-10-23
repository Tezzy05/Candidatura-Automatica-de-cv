import { Download, FileUp, Settings, Sparkles, Upload, UserRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImportDialog, SettingsDialog } from '@/components/Dialogs'
import { History } from '@/components/History'
import { JobPanel } from '@/components/JobPanel'
import { ProfileEditor } from '@/components/ProfileEditor'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MODELS, type AiSettings } from '@/lib/ai-config'
import { emptyProfile, sampleJob, sampleProfile } from '@/lib/sample'
import { downloadJson, useStored } from '@/lib/storage'
import type { Job, Profile, Tailored } from '@/lib/types'

/** Nome provisório: o projeto ainda vai ganhar nome. Troque aqui. */
export const APP_NAME = 'CV sob medida'

type Tab = 'vaga' | 'perfil' | 'historico'

export default function App() {
  const [tab, setTab] = useState<Tab>('vaga')
  const [profile, setProfile] = useStored<Profile>('profile', emptyProfile())
  const [job, setJob] = useStored<Job>('job', { title: '', company: '', location: '', description: '' })
  const [history, setHistory] = useStored<Tailored[]>('history', [])
  const [settings, setSettings] = useStored<AiSettings>('settings', { apiKey: '', model: MODELS[0].id })
  const [result, setResult] = useState<Tailored | null>(null)
  // Muda quando o perfil é trocado de uma vez (exemplo, importação), para os campos recarregarem.
  const [profileRev, setProfileRev] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const replaceProfile = (p: Profile) => {
    setProfile(p)
    setProfileRev((r) => r + 1)
  }

  const onResult = (t: Tailored) => {
    setResult(t)
    setHistory((h) => [t, ...h].slice(0, 50))
  }

  const restoreBackup = async (file: File) => {
    try {
      const data = JSON.parse(await file.text())
      if (data.profile) replaceProfile({ ...emptyProfile(), ...data.profile })
      if (Array.isArray(data.history)) setHistory(data.history)
      toast.success('Backup restaurado')
    } catch {
      toast.error('Arquivo inválido')
    }
  }

  return (
    <TooltipProvider>
      <div className="min-h-svh">
        <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
            <span className="flex items-center gap-2 font-mono text-xs font-semibold tracking-[0.071em] uppercase">
              <span className="text-brand">▲</span> {APP_NAME}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">· um currículo para cada vaga</span>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
                {settings.apiKey ? <Sparkles className="text-brand" /> : <Settings />}
                <span className="hidden sm:inline">{settings.apiKey ? 'IA ativa' : 'Configurar IA'}</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-6">
            <TabsList variant="line" className="border-b-0">
              <TabsTrigger value="vaga">Nova vaga</TabsTrigger>
              <TabsTrigger value="perfil">Meu perfil</TabsTrigger>
              <TabsTrigger value="historico">Histórico {history.length > 0 && <span className="font-mono text-xs text-muted-foreground">{history.length}</span>}</TabsTrigger>
            </TabsList>

            <TabsContent value="vaga">
              <JobPanel
                profile={profile}
                job={job}
                onJobChange={setJob}
                result={result}
                onResult={onResult}
                settings={settings}
                onNeedKey={() => {
                  toast.info('Para usar a IA, coloque sua chave da API da Anthropic.')
                  setSettingsOpen(true)
                }}
                onGoToProfile={() => setTab('perfil')}
              />
              {!job.description && (
                <button className="mt-4 text-xs text-muted-foreground underline underline-offset-4" onClick={() => setJob(sampleJob)}>
                  Usar a vaga de exemplo
                </button>
              )}
            </TabsContent>

            <TabsContent value="perfil" className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-4">
                <UserRound className="size-4 text-muted-foreground" />
                <p className="mr-auto text-sm text-muted-foreground">
                  Seu perfil completo, com tudo o que você já fez. Cada vaga recebe um recorte dele. Salvo só neste navegador.
                </p>
                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                  <Sparkles /> Importar CV antigo
                </Button>
                <Button variant="outline" size="sm" onClick={() => replaceProfile(sampleProfile)}>
                  Carregar exemplo
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadJson('perfil-cv.json', { profile, history })}>
                  <Download /> Backup
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                  <Upload /> Restaurar
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) restoreBackup(f)
                    e.target.value = ''
                  }}
                />
              </div>
              <ProfileEditor key={profileRev} profile={profile} onChange={setProfile} />
            </TabsContent>

            <TabsContent value="historico">
              <History
                items={history}
                onOpen={(t) => {
                  setJob(t.job)
                  setResult(t)
                  setTab('vaga')
                }}
                onRemove={(id) => setHistory((h) => h.filter((t) => t.id !== id))}
              />
            </TabsContent>
          </Tabs>
        </main>

        <footer className="mx-auto flex max-w-6xl items-center gap-2 px-4 pb-10 text-xs text-muted-foreground">
          <FileUp className="size-3.5" /> Nada sai do seu navegador, exceto o que você manda para a IA quando usa "Gerar com IA".
        </footer>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} onSave={setSettings} />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        settings={settings}
        onImport={replaceProfile}
        onNeedKey={() => {
          setImportOpen(false)
          setSettingsOpen(true)
        }}
      />
      <Toaster position="bottom-right" />
    </TooltipProvider>
  )
}
