import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { uid } from '@/lib/text'
import type { Education, Experience, Gender, Profile, Project, ProjectKind } from '@/lib/types'

const KINDS: ProjectKind[] = ['Projeto', 'Voluntariado', 'Empresa júnior', 'Freelance', 'Curso']

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Lista editada como texto, um item por linha. Guarda o texto cru para não engolir a linha em branco enquanto você digita. */
function LinesField({ value, onChange, rows = 4, placeholder }: { value: string[]; onChange: (v: string[]) => void; rows?: number; placeholder?: string }) {
  const [text, setText] = useState(value.join('\n'))
  return (
    <Textarea
      rows={rows}
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value)
        onChange(e.target.value.split('\n').map((l) => l.trim()).filter(Boolean))
      }}
    />
  )
}

function Block({ title, hint, action, children }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="eyebrow text-foreground">{title}</h3>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function ItemCard({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="relative space-y-3 rounded-md border border-dashed p-4">
      <Button variant="ghost" size="icon-sm" className="absolute top-2 right-2 text-muted-foreground" onClick={onRemove} aria-label="Remover">
        <Trash2 />
      </Button>
      {children}
    </div>
  )
}

export function ProfileEditor({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => onChange({ ...profile, [k]: v })
  const text = (k: 'name' | 'location' | 'phone' | 'email' | 'linkedin' | 'headline') => ({
    value: profile[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value),
  })

  const patchList = <T extends { id: string }>(k: 'experiences' | 'projects' | 'education', id: string, patch: Partial<T>) =>
    set(k, (profile[k] as unknown as T[]).map((x) => (x.id === id ? { ...x, ...patch } : x)) as never)
  const removeFrom = (k: 'experiences' | 'projects' | 'education', id: string) =>
    set(k, (profile[k] as Array<{ id: string }>).filter((x) => x.id !== id) as never)

  return (
    <div className="space-y-4">
      <Block title="Topo" hint="Só o que o recrutador usa para te chamar. Nada de CPF, idade ou endereço completo.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome"><Input {...text('name')} placeholder="Seu Nome" /></Field>
          <Field label="Cidade e estado"><Input {...text('location')} placeholder="São Paulo, SP" /></Field>
          <Field label="Telefone"><Input {...text('phone')} placeholder="(11) 90000-0000" /></Field>
          <Field label="E-mail"><Input {...text('email')} type="email" placeholder="seunome@email.com" /></Field>
          <Field label="LinkedIn"><Input {...text('linkedin')} placeholder="linkedin.com/in/seunome" /></Field>
          <Field label="Outros links" hint="Portfólio, GitHub. Um por linha.">
            <LinesField rows={2} value={profile.links} onChange={(v) => set('links', v)} />
          </Field>
        </div>
      </Block>

      <Block title="Quem você é" hint="Matéria-prima do resumo de 3 linhas. O sistema adapta para cada vaga.">
        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <Field label="Cargo atual ou desejado"><Input {...text('headline')} placeholder="Analista de dados" /></Field>
          <Field label="Nas frases, usar" hint="Para o resumo concordar com você.">
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              value={profile.gender}
              onChange={(e) => set('gender', e.target.value as Gender)}
            >
              <option value="masculino">formado em...</option>
              <option value="feminino">formada em...</option>
              <option value="neutro">com formação em...</option>
            </select>
          </Field>
        </div>
        <Field label="Sobre você" hint="A primeira frase entra no resumo. Diga o que você entrega.">
          <Textarea rows={3} value={profile.about} onChange={(e) => set('about', e.target.value)} placeholder="Entrego painéis e automações que cortam retrabalho." />
        </Field>
      </Block>

      <Block title="Competências" hint="Ferramentas, técnicas e comportamentais. Uma por linha. Escreva o nível quando importar: Excel avançado.">
        <LinesField rows={6} value={profile.skills} onChange={(v) => set('skills', v)} placeholder={'SQL\nPower BI\nPython\nExcel avançado'} />
      </Block>

      <Block
        title="Experiência"
        hint="Da mais recente para a mais antiga. Uma conquista por linha: verbo + ação + número."
        action={
          <Button variant="outline" size="sm" onClick={() => set('experiences', [{ id: uid(), role: '', company: '', start: '', end: '', bullets: [] }, ...profile.experiences])}>
            <Plus /> Adicionar
          </Button>
        }
      >
        {profile.experiences.length === 0 && <p className="text-sm text-muted-foreground">Sem experiência formal? Use a seção de projetos: voluntariado e empresa júnior contam.</p>}
        {profile.experiences.map((e) => (
          <ItemCard key={e.id} onRemove={() => removeFrom('experiences', e.id)}>
            <div className="grid gap-3 pr-8 sm:grid-cols-2">
              <Field label="Cargo"><Input value={e.role} onChange={(ev) => patchList<Experience>('experiences', e.id, { role: ev.target.value })} /></Field>
              <Field label="Empresa"><Input value={e.company} onChange={(ev) => patchList<Experience>('experiences', e.id, { company: ev.target.value })} /></Field>
              <Field label="Início"><Input value={e.start} placeholder="2024" onChange={(ev) => patchList<Experience>('experiences', e.id, { start: ev.target.value })} /></Field>
              <Field label="Fim" hint="Vazio = atual"><Input value={e.end} onChange={(ev) => patchList<Experience>('experiences', e.id, { end: ev.target.value })} /></Field>
            </div>
            <Field label="Conquistas (uma por linha)">
              <LinesField rows={4} value={e.bullets} onChange={(v) => patchList<Experience>('experiences', e.id, { bullets: v })} placeholder="Automatizei 12 relatórios e economizei 5 h por semana." />
            </Field>
          </ItemCard>
        ))}
      </Block>

      <Block
        title="Projetos e atividades"
        hint="Projetos pessoais, voluntariado, empresa júnior, freelas."
        action={
          <Button variant="outline" size="sm" onClick={() => set('projects', [...profile.projects, { id: uid(), kind: 'Projeto', name: '', description: '' }])}>
            <Plus /> Adicionar
          </Button>
        }
      >
        {profile.projects.map((p) => (
          <ItemCard key={p.id} onRemove={() => removeFrom('projects', p.id)}>
            <div className="grid gap-3 pr-8 sm:grid-cols-[180px_1fr]">
              <Field label="Tipo">
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  value={p.kind}
                  onChange={(ev) => patchList<Project>('projects', p.id, { kind: ev.target.value as ProjectKind })}
                >
                  {KINDS.map((k) => <option key={k}>{k}</option>)}
                </select>
              </Field>
              <Field label="Nome"><Input value={p.name} onChange={(ev) => patchList<Project>('projects', p.id, { name: ev.target.value })} /></Field>
            </div>
            <Field label="O que você fez e o resultado">
              <Textarea rows={2} value={p.description} onChange={(ev) => patchList<Project>('projects', p.id, { description: ev.target.value })} />
            </Field>
          </ItemCard>
        ))}
      </Block>

      <Block
        title="Formação"
        action={
          <Button variant="outline" size="sm" onClick={() => set('education', [...profile.education, { id: uid(), course: '', institution: '', period: '' }])}>
            <Plus /> Adicionar
          </Button>
        }
      >
        {profile.education.map((e) => (
          <ItemCard key={e.id} onRemove={() => removeFrom('education', e.id)}>
            <div className="grid gap-3 pr-8 sm:grid-cols-3">
              <Field label="Curso"><Input value={e.course} onChange={(ev) => patchList<Education>('education', e.id, { course: ev.target.value })} /></Field>
              <Field label="Instituição"><Input value={e.institution} onChange={(ev) => patchList<Education>('education', e.id, { institution: ev.target.value })} /></Field>
              <Field label="Período"><Input value={e.period} placeholder="2023 – 2025" onChange={(ev) => patchList<Education>('education', e.id, { period: ev.target.value })} /></Field>
            </div>
          </ItemCard>
        ))}
      </Block>

      <div className="grid gap-4 sm:grid-cols-2">
        <Block title="Idiomas" hint="Com o nível: Inglês intermediário.">
          <LinesField rows={3} value={profile.languages} onChange={(v) => set('languages', v)} />
        </Block>
        <Block title="Certificações" hint="Uma por linha.">
          <LinesField rows={3} value={profile.certifications} onChange={(v) => set('certifications', v)} />
        </Block>
      </div>
    </div>
  )
}
