import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import type { AiSettings } from './ai-config'
import { profileSegments } from './match'
import { buildDictionary } from './skills'
import { containsTerm, fold, uid } from './text'
import type { Job, Profile, Tailored } from './types'


const ResumeSchema = z.object({
  title: z.string(),
  summary: z.string(),
  skills: z.array(z.string()),
  experiences: z.array(
    z.object({ role: z.string(), company: z.string(), period: z.string(), bullets: z.array(z.string()) }),
  ),
  projects: z.array(z.object({ kind: z.string(), name: z.string(), description: z.string() })),
  certifications: z.array(z.string()),
  adherence: z.number(),
  assessment: z.string(),
  tips: z.array(z.string()),
})

const TAILOR_SYSTEM = `Você adapta currículos para vagas específicas, em português do Brasil, seguindo regras de currículo para robôs de triagem (ATS) e para a leitura de 7 segundos do recrutador.

Regra principal: use apenas fatos que estão no perfil. Nunca invente ferramenta, cargo, empresa, data, número, certificação ou nível de idioma. Se a vaga pede algo que o perfil não comprova, deixe de fora do currículo e cite em "tips". Você pode reescrever, reordenar, resumir e cortar.

Como montar:
- title: o título exato da vaga.
- summary: no máximo 3 linhas (cerca de 300 caracteres). Quem a pessoa é, o que domina (com os termos da vaga) e o que entrega.
- skills: primeiro as competências da vaga que o perfil comprova, escritas exatamente como a vaga escreve (se a vaga diz "Power BI", escreva "Power BI", não "ferramentas de visualização"). Depois, outras do perfil que ajudem nessa vaga. Até 12 itens.
- experiences: todas as experiências do perfil, na mesma ordem e com os mesmos cargos, empresas e períodos. Bullets no formato verbo no passado + ação + número, usando só números que existem no perfil; sem número no perfil, escreva sem número. Primeiro os bullets mais ligados à vaga. Até 4 bullets nas duas experiências mais recentes e até 2 nas demais.
- projects: projetos, voluntariado e empresa júnior que reforçam a vaga (até 4). Se a pessoa tem pouca experiência, eles são essenciais.
- certifications: só as do perfil, as mais relevantes primeiro.
- O currículo precisa caber em 1 página.
- adherence: de 0 a 100, quanto o perfil real (não o currículo) atende a vaga. Seja honesto: requisitos obrigatórios ausentes derrubam a nota.
- assessment: 2 ou 3 frases explicando a nota.
- tips: o que a pessoa poderia acrescentar ao perfil ou estudar para essa vaga, e perguntas sobre números que deixariam os bullets mais fortes.`

function client(settings: AiSettings) {
  // Chamada direta do navegador com a chave da própria pessoa, guardada só neste navegador.
  return new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true })
}

export function friendlyError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'Chave de API inválida. Confira em Configurações.'
  if (err instanceof Anthropic.PermissionDeniedError) return 'Essa chave não tem permissão para usar esse modelo.'
  if (err instanceof Anthropic.RateLimitError) return 'Limite de uso atingido. Espere um pouco e tente de novo.'
  if (err instanceof Anthropic.BadRequestError) return `A API recusou o pedido: ${err.message}`
  if (err instanceof Anthropic.APIConnectionError) return 'Sem conexão com a API da Anthropic.'
  if (err instanceof Anthropic.APIError) return `Erro da API (${err.status}): ${err.message}`
  return err instanceof Error ? err.message : String(err)
}

async function ask<T extends z.ZodType>(settings: AiSettings, schema: T, system: string, content: string): Promise<z.infer<T>> {
  const response = await client(settings).beta.messages.parse({
    model: settings.model,
    max_tokens: 16000,
    system,
    messages: [{ role: 'user', content }],
    output_config: { effort: 'medium', format: betaZodOutputFormat(schema) },
    // Se o modelo recusar, a API refaz o pedido em outro modelo automaticamente.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  })
  if (response.stop_reason === 'refusal') throw new Error('O modelo recusou o pedido. Revise o texto e tente de novo.')
  if (response.stop_reason === 'max_tokens') throw new Error('A resposta ficou longa demais. Encurte o perfil ou a vaga.')
  if (!response.parsed_output) throw new Error('A resposta da IA veio num formato inesperado.')
  return response.parsed_output
}

/** Reescreve o currículo com IA, partindo da análise local, e confere se nada foi inventado. */
export async function tailorWithAI(settings: AiSettings, profile: Profile, job: Job, local: Tailored): Promise<Tailored> {
  const { match } = local
  const content = `<perfil>
${JSON.stringify(profile, null, 2)}
</perfil>

<vaga>
Título: ${job.title}
Empresa: ${job.company}
Local: ${job.location}

${job.description}
</vaga>

<analise_previa>
Competências da vaga encontradas no perfil: ${match.matched.map((k) => `${k.label}${k.required ? '' : ' (diferencial)'}${k.levelGap ? ` (perfil declara: ${k.ownLabel})` : ''}`).join(', ') || 'nenhuma'}
Competências da vaga ausentes no perfil: ${match.missing.map((k) => `${k.label}${k.required ? '' : ' (diferencial)'}`).join(', ') || 'nenhuma'}
</analise_previa>`

  const out = await ask(settings, ResumeSchema, TAILOR_SYSTEM, content)

  return {
    ...local,
    id: uid(),
    createdAt: new Date().toISOString(),
    engine: 'ia',
    resume: {
      ...local.resume,
      title: out.title,
      summary: out.summary,
      skills: out.skills,
      experiences: out.experiences,
      projects: out.projects,
      certifications: out.certifications,
    },
    tips: out.tips,
    aiNote: `${Math.round(out.adherence)}/100. ${out.assessment}`,
    warnings: checkInvented(profile, job, out),
  }
}

/** Aponta competências e números que aparecem no currículo da IA e não existem no perfil. */
export function checkInvented(profile: Profile, job: Job, out: Pick<z.infer<typeof ResumeSchema>, 'skills' | 'experiences' | 'projects'>): string[] {
  const dict = buildDictionary([...profile.skills, ...profile.certifications])
  const corpus = fold(profileSegments(profile).map(([, t]) => t).join('\n'))
  const warnings: string[] = []

  for (const skill of out.skills) {
    const f = fold(skill.trim())
    const terms = dict.find((e) => e.key === f || e.terms.includes(f))?.terms ?? [f]
    if (!terms.some((t) => containsTerm(corpus, t))) warnings.push(`Competência "${skill}" não aparece no seu perfil.`)
  }

  const profileNumbers = new Set(corpus.match(/\d+([.,]\d+)?/g) ?? [])
  const jobNumbers = new Set(fold(job.description).match(/\d+([.,]\d+)?/g) ?? [])
  const texts = [...out.experiences.flatMap((e) => e.bullets), ...out.projects.map((p) => p.description)]
  for (const text of texts) {
    const unknown = (text.match(/\d+([.,]\d+)?/g) ?? []).filter((n) => !profileNumbers.has(n) && !jobNumbers.has(n))
    if (unknown.length) warnings.push(`Número ${unknown.join(', ')} em "${text}" não está no seu perfil.`)
  }
  return warnings
}

const ProfileSchema = z.object({
  name: z.string(),
  location: z.string(),
  phone: z.string(),
  email: z.string(),
  linkedin: z.string(),
  links: z.array(z.string()),
  headline: z.string(),
  about: z.string(),
  skills: z.array(z.string()),
  experiences: z.array(
    z.object({ role: z.string(), company: z.string(), start: z.string(), end: z.string(), bullets: z.array(z.string()) }),
  ),
  projects: z.array(
    z.object({
      kind: z.enum(['Projeto', 'Voluntariado', 'Empresa júnior', 'Freelance', 'Curso']),
      name: z.string(),
      description: z.string(),
    }),
  ),
  education: z.array(z.object({ course: z.string(), institution: z.string(), period: z.string() })),
  languages: z.array(z.string()),
  certifications: z.array(z.string()),
})

const IMPORT_SYSTEM = `Você transforma um currículo ou perfil do LinkedIn colado em texto num perfil estruturado, em português do Brasil.
Copie os fatos sem inventar nada. Campos sem informação ficam como texto vazio ou lista vazia.
- Não traga CPF, RG, idade, data de nascimento, estado civil nem endereço completo; em "location" deixe só cidade e estado.
- experiences: a mais recente primeiro; "end" vazio se for o emprego atual. Um bullet por conquista ou atividade, como estava no texto.
- projects: projetos pessoais, voluntariado, empresa júnior, freelas e cursos práticos.
- about: o resumo ou "sobre" do texto, se houver.`

export async function importProfileWithAI(settings: AiSettings, text: string): Promise<Profile> {
  const out = await ask(settings, ProfileSchema, IMPORT_SYSTEM, `<texto>\n${text}\n</texto>`)
  return {
    ...out,
    gender: 'neutro',
    experiences: out.experiences.map((e) => ({ ...e, id: uid() })),
    projects: out.projects.map((p) => ({ ...p, id: uid() })),
    education: out.education.map((e) => ({ ...e, id: uid() })),
  }
}
