import { buildDictionary, type SkillEntry } from './skills'
import { containsTerm, cosine, fold, termRegex, tokens } from './text'
import type { Job, JobKeyword, KeywordHit, MatchResult, Profile } from './types'

type Section = 'required' | 'desirable' | 'ignore'

const HEADER_IGNORE = /beneficio|oferecemos|remuneracao|salario|sobre (a empresa|nos)|quem somos|nossa cultura|etapas do processo/
const HEADER_DESIRABLE = /diferencia|desejave|nice to have|bonus|plus|seria (legal|otimo)|sera um/
const HEADER_REQUIRED = /requisito|obrigatori|qualificac|o que (buscamos|esperamos|voce precisa)|precisa ter|responsabilidade|atividade|atribuic|o que voce (vai|ira) fazer|desafio|perfil|competencia|conhecimento|habilidade|requirement/
const INLINE_DESIRABLE = /diferencial|desejavel|e um plus|sera um plus|nice to have|nao obrigatorio/
const BULLET = /^\s*([-•*·▪●–]|\d+[.)])\s*/

/** Qualificadores de nível: "Inglês avançado" não é o mesmo que "Inglês intermediário". */
const LEVEL = /\b(basico|intermediario|avancado|fluente|nativo|tecnico|conversacao)\b/

/** Competências que outras comprovam: quem usa Power BI faz BI; quem usa AWS conhece Cloud. */
const IMPLIED_BY: Record<string, string[]> = {
  'business intelligence': ['power bi', 'tableau', 'looker', 'qlik'],
  'analise de dados': ['sql', 'power bi', 'python', 'tableau', 'looker', 'linguagem r', 'estatistica'],
  dashboards: ['power bi', 'tableau', 'looker', 'qlik'],
  cloud: ['aws', 'azure', 'google cloud'],
  'metodologias ageis': ['scrum', 'kanban'],
  'pacote office': ['excel'],
  'apis rest': ['graphql'],
}

/** Siglas que aparecem em vagas mas não são competências. */
const NOT_SKILLS = new Set(
  'clt pj ltda cnpj cpf pcd vr va vt eua usa sp rj mg pr rs sc ba df ti ok rh plr ppr gympass wellhub home office hibrido remoto'.split(' '),
)

interface Line {
  start: number
  end: number
  section: Section
  /** Item de lista ou linha curta: a competência foi citada de forma explícita, não no meio de um parágrafo. */
  listed: boolean
}

/** Classifica cada linha da vaga: obrigatório, diferencial ou ignorado (benefícios, sobre a empresa). */
function lineMap(description: string, mentionsSkill: (folded: string) => boolean): Line[] {
  const out: Line[] = []
  let current: Section = 'required'
  let pos = 0
  for (const line of description.split('\n')) {
    const bullet = BULLET.test(line)
    const f = fold(line).trim().replace(BULLET, '')
    const words = f.split(/\s+/).filter(Boolean).length
    // Cabeçalho: termina em ":" ou é uma linha curta, sem pontuação e sem nenhuma competência ("Será um diferencial").
    const header =
      !bullet && words > 0 && words <= 8 && (f.endsWith(':') || (!/[.;,]/.test(f) && words <= 6 && !mentionsSkill(f)))
    let section: Section = current
    if (header && HEADER_IGNORE.test(f)) current = section = 'ignore'
    else if (header && HEADER_DESIRABLE.test(f)) current = section = 'desirable'
    else if (header && HEADER_REQUIRED.test(f)) current = section = 'required'
    else if (current !== 'ignore' && INLINE_DESIRABLE.test(f)) section = 'desirable'
    out.push({ start: pos, end: pos + line.length, section, listed: bullet || (words <= 12 && !/[.!?]$/.test(f)) })
    pos += line.length + 1
  }
  return out
}

/** Encontra as competências pedidas na vaga, preservando a grafia usada por ela. */
export function extractKeywords(job: Job, dict: SkillEntry[]): JobKeyword[] {
  // O título fica de fora: ele é avaliado à parte, em "Cargo e área".
  const text = job.description
  const folded = fold(text)

  // Todas as ocorrências de todos os termos; os mais longos têm prioridade ("Power BI" antes de "BI").
  const hits: Array<{ entry: SkillEntry; start: number; end: number; term: string }> = []
  for (const entry of dict) {
    for (const term of entry.terms) {
      for (const m of folded.matchAll(termRegex(term))) hits.push({ entry, start: m.index, end: m.index + term.length, term })
    }
  }
  hits.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start)

  const lines = lineMap(text, (f) => dict.some((e) => e.terms.some((t) => containsTerm(f, t))))
  const lineAt = (i: number) => lines.find((l) => i >= l.start && i <= l.end)

  const taken: Array<[number, number]> = []
  const byKey = new Map<string, JobKeyword & { canonical: boolean; first: number; listed: boolean }>()
  const add = (key: string, label: string, kind: JobKeyword['kind'], start: number, canonical: boolean) => {
    const line = lineAt(start)
    if (!line || line.section === 'ignore') return
    const required = line.section === 'required'
    const prev = byKey.get(key)
    if (!prev) {
      byKey.set(key, { key, label, kind, required, canonical, first: start, listed: line.listed })
      return
    }
    prev.required ||= required
    prev.listed ||= line.listed
    // Prefere o nome principal ("Power BI") a um sinônimo ("DAX") quando a vaga usa os dois.
    if (canonical && !prev.canonical) Object.assign(prev, { label, canonical })
  }

  for (const h of hits) {
    if (taken.some(([s, e]) => h.start < e && h.end > s)) continue
    taken.push([h.start, h.end])
    add(h.entry.key, text.slice(h.start, h.end), h.entry.kind, h.start, h.term === h.entry.key)
  }

  // Ferramentas fora do dicionário escritas como sigla ou nome próprio (ex.: "AutoCAD", "OKRs", "SolidWorks").
  for (const m of text.matchAll(/(?<![\p{L}\p{N}])[A-Z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*(?![\p{L}\p{N}])/gu)) {
    const key = fold(m[0])
    if (m[0].length > 20 || NOT_SKILLS.has(key) || byKey.has(key)) continue
    if (taken.some(([s, e]) => m.index < e && m.index + m[0].length > s)) continue
    add(key, m[0], 'hard', m.index, true)
  }

  return [...byKey.values()]
    .sort((a, b) => Number(b.required) - Number(a.required) || Number(b.listed) - Number(a.listed) || a.first - b.first)
    .map(({ key, label, kind, required }) => ({ key, label: tidyLabel(label), kind, required }))
}

function tidyLabel(label: string) {
  const t = label.trim()
  // "sql" → "SQL", "python" → "Python": se a vaga escreveu tudo minúsculo, ajusta a caixa.
  if (t === t.toLowerCase()) return t.length <= 4 ? t.toUpperCase() : t[0].toUpperCase() + t.slice(1)
  return t
}

type Evidence = KeywordHit['evidence'][number]

export function profileSegments(p: Profile): Array<[Evidence, string]> {
  return [
    ['competências', [...p.skills, ...p.languages].join('\n')],
    ['experiência', p.experiences.map((e) => `${e.role}\n${e.bullets.join('\n')}`).join('\n')],
    ['projetos', p.projects.map((x) => `${x.name}\n${x.description}`).join('\n')],
    ['formação', p.education.map((e) => e.course).join('\n')],
    ['certificações', p.certifications.join('\n')],
    ['sobre', `${p.headline}\n${p.about}`],
  ]
}

/** Como o próprio perfil escreve essa competência (ex.: "Inglês intermediário"). */
function ownWording(p: Profile, terms: string[]): string | undefined {
  return [...p.skills, ...p.languages, ...p.certifications].find((s) => terms.some((t) => containsTerm(fold(s), t)))?.trim()
}

const SENIORITY = /^(junior|jr|pleno|pl|senior|sr|i|ii|iii|iv|estagiario|estagiaria|trainee|especialista)$/
const titleTokens = (s: string) => tokens(s).filter((t) => !SENIORITY.test(t))

export function scoreMatch(profile: Profile, job: Job): MatchResult {
  const dict = buildDictionary([...profile.skills, ...profile.certifications])
  const keywords = extractKeywords(job, dict)
  const segments = profileSegments(profile).map(([name, text]) => [name, fold(text)] as const)
  const corpus = segments.map(([, t]) => t).join('\n')

  const matched: KeywordHit[] = []
  const missing: JobKeyword[] = []
  for (const kw of keywords) {
    const own = dict.find((e) => e.key === kw.key)?.terms ?? [kw.key]
    const implied = (IMPLIED_BY[kw.key] ?? []).flatMap((k) => dict.find((e) => e.key === k)?.terms ?? [])
    const terms = [...own, ...implied]
    const evidence = segments.filter(([, text]) => terms.some((t) => containsTerm(text, t))).map(([n]) => n)
    if (!evidence.length) {
      missing.push(kw)
      continue
    }
    const hit: KeywordHit = { ...kw, evidence }
    // A vaga pede um nível ("avançado") que o perfil não declara: conta pela metade e o currículo mantém o seu nível.
    if (LEVEL.test(fold(kw.label)) && !containsTerm(corpus, fold(kw.label))) {
      hit.levelGap = true
      hit.ownLabel = ownWording(profile, terms) ?? dict.find((e) => e.key === kw.key)?.label ?? kw.label
    }
    matched.push(hit)
  }

  // Comprovar numa experiência ou projeto vale mais do que só listar a competência.
  const strength = (h: KeywordHit) =>
    (h.evidence.some((e) => e !== 'competências' && e !== 'sobre') ? 1 : 0.8) * (h.levelGap ? 0.5 : 1)
  const coverage = (required: boolean) => {
    const all = keywords.filter((k) => k.required === required)
    if (!all.length) return null
    const got = matched.filter((m) => m.required === required)
    return { score: got.reduce((s, h) => s + strength(h), 0) / all.length, total: all.length, hits: got.length }
  }
  const req = coverage(true)
  const des = coverage(false)

  const jobTitle = titleTokens(job.title)
  const candidates = [profile.headline, ...profile.experiences.map((e) => e.role), ...profile.education.map((e) => e.course)]
  const titleScore = jobTitle.length
    ? Math.max(
        0,
        ...candidates.map((c) => {
          const ct = new Set(titleTokens(c))
          return jobTitle.filter((t) => ct.has(t)).length / jobTitle.length
        }),
      )
    : 0

  const context = Math.min(1, cosine(`${job.title}\n${job.description}`, corpus) / 0.35)

  const parts = [
    req && { label: 'Requisitos obrigatórios', score: req.score, weight: 60, detail: `${req.hits} de ${req.total} encontrados no seu perfil` },
    des && { label: 'Diferenciais', score: des.score, weight: 15, detail: `${des.hits} de ${des.total} encontrados` },
    {
      label: 'Cargo e área',
      score: titleScore,
      weight: 15,
      detail: titleScore >= 0.99 ? 'você já atua ou se formou nessa função' : titleScore > 0 ? 'função parecida com a sua' : 'função diferente das que você já exerceu',
    },
    { label: 'Contexto geral', score: context, weight: 10, detail: 'vocabulário da vaga presente no seu perfil' },
  ].filter((p): p is NonNullable<typeof p> => Boolean(p))

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0)
  const score = Math.round((parts.reduce((s, p) => s + p.score * p.weight, 0) / totalWeight) * 100)

  return {
    score,
    level: score >= 80 ? 'alta' : score >= 60 ? 'boa' : score >= 40 ? 'média' : 'baixa',
    breakdown: parts.map((p) => ({ ...p, weight: Math.round((p.weight / totalWeight) * 100), score: Math.round(p.score * 100) })),
    matched,
    missing,
    keywords,
  }
}
