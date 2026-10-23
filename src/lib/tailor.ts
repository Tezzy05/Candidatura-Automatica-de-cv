import { scoreMatch } from './match'
import { buildDictionary, type SkillEntry } from './skills'
import { containsTerm, fold, hasNumber, joinPt, termRegex, uid } from './text'
import type { Job, KeywordHit, MatchResult, Profile, Resume, Tailored } from './types'

const compact = (s: string) => fold(s).replace(/[\s.\-_/]/g, '')

/**
 * Troca a grafia do perfil pela grafia da vaga quando é o mesmo termo escrito diferente
 * ("PowerBI" → "Power BI", "nodejs" → "Node.js"). Nunca troca uma ferramenta por outra.
 */
export function applyJobSpelling(text: string, matched: KeywordHit[], dict: SkillEntry[]): string {
  let out = text
  for (const kw of matched) {
    const entry = dict.find((e) => e.key === kw.key)
    if (kw.levelGap) continue
    for (const term of entry?.terms ?? []) {
      // Só grafias diferentes do mesmo nome ("PowerBI" × "Power BI"); acento e caixa ficam como você escreveu.
      if (compact(term) !== compact(kw.label) || term === fold(kw.label)) continue
      const folded = fold(out)
      const re = termRegex(term)
      let result = ''
      let last = 0
      for (const m of folded.matchAll(re)) {
        result += out.slice(last, m.index) + kw.label
        last = m.index + term.length
      }
      out = result + out.slice(last)
    }
  }
  return out
}

function relevance(text: string, matched: KeywordHit[], dict: SkillEntry[]): number {
  const f = fold(text)
  let hits = 0
  for (const kw of matched) {
    const terms = dict.find((e) => e.key === kw.key)?.terms ?? [kw.key]
    if (terms.some((t) => containsTerm(f, t))) hits += kw.required ? 1 : 0.6
  }
  return hits + (hasNumber(text) ? 0.5 : 0)
}

function yearsOfExperience(profile: Profile): number {
  const years = profile.experiences.map((e) => Number(e.start.match(/(19|20)\d{2}/)?.[0])).filter(Boolean)
  return years.length ? new Date().getFullYear() - Math.min(...years) : 0
}

function firstSentence(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ')
  const m = t.match(/^.+?[.!?](\s|$)/)
  return (m ? m[0] : t).trim()
}

const WEAK_START = /^(responsavel por|fazia|fazer|realizava|auxiliava|ajudava|atuava|participava|tarefas?:)/

export function buildResume(profile: Profile, job: Job, match: MatchResult): { resume: Resume; tips: string[] } {
  const dict = buildDictionary([...profile.skills, ...profile.certifications])
  const m = match.matched
  const spell = (s: string) => applyJobSpelling(s, m, dict)

  const title = job.title.trim() || profile.headline

  // Competências: primeiro as que a vaga pede (com o nome que a vaga usa), depois as demais do perfil.
  const matchedKeys = new Set(m.map((k) => k.key))
  const label = (k: KeywordHit) => (k.levelGap ? k.ownLabel! : k.label)
  const fromJob = [...m].sort((a, b) => Number(b.required) - Number(a.required)).map(label)
  const others = profile.skills.filter((s) => {
    const entry = dict.find((e) => e.terms.includes(fold(s.trim())))
    return !matchedKeys.has(entry?.key ?? fold(s))
  })
  const skills = [...fromJob, ...others].slice(0, Math.max(fromJob.length, 12))

  // Resumo de 3 linhas: quem você é, o que domina (na língua da vaga) e o que entrega.
  const years = yearsOfExperience(profile)
  const course = profile.education[0]?.course.replace(/^(tecn[oó]logo|bacharelado|graduação|licenciatura|técnico|mba|pós-graduação|especialização)\s+(em|de)\s+/i, '')
  const who = profile.headline.trim() || title
  const line1 = `${who}${years >= 1 ? ` com ${years} ${years === 1 ? 'ano' : 'anos'} de experiência` : ''}${course ? `, formação em ${course}` : ''}.`
  // "Domínio de..." cita ferramentas que você declarou, não conceitos genéricos como "Painéis".
  const declared = new Set(profile.skills.map((s) => dict.find((e) => e.terms.includes(fold(s.trim())))?.key ?? fold(s)))
  const hard = m.filter((k) => k.kind === 'hard')
  const tools = hard.filter((k) => declared.has(k.key))
  const top = (tools.length ? tools : hard).map(label).slice(0, 5)
  if (!top.length) top.push(...profile.skills.slice(0, 5))
  const line2 = top.length ? `Domínio de ${joinPt(top)}.` : ''
  const line3 = profile.about.trim() ? spell(firstSentence(profile.about)) : ''
  const summary = [line1, line2, line3].filter(Boolean).join(' ')

  const experiences = profile.experiences.map((e, i) => {
    const ranked = e.bullets
      .map((b, idx) => ({ b: b.trim(), idx, r: relevance(b, m, dict) }))
      .filter((x) => x.b)
      .sort((a, b) => b.r - a.r || a.idx - b.idx)
      .slice(0, i < 2 ? 4 : 2)
      .map((x) => spell(x.b))
    return { role: e.role, company: e.company, period: [e.start, e.end || 'atual'].filter(Boolean).join(' – '), bullets: ranked }
  })

  const thin = profile.experiences.length < 2
  const projects = profile.projects
    .map((p) => ({ p, r: relevance(`${p.name} ${p.description}`, m, dict) }))
    .filter((x) => thin || x.r >= 1)
    .sort((a, b) => b.r - a.r)
    .slice(0, 4)
    .map(({ p }) => ({ kind: p.kind, name: p.name, description: spell(p.description) }))

  const certifications = [...profile.certifications]
    .sort((a, b) => relevance(b, m, dict) - relevance(a, m, dict))
    .slice(0, 4)

  const resume: Resume = {
    name: profile.name,
    title,
    contact: [profile.location, profile.phone, profile.email, profile.linkedin, ...profile.links].map((c) => c.trim()).filter(Boolean),
    summary,
    skills,
    experiences,
    projects,
    education: profile.education.map(({ course, institution, period }) => ({ course, institution, period })),
    languages: profile.languages,
    certifications,
  }

  return { resume, tips: buildTips(profile, match, resume) }
}

function buildTips(profile: Profile, match: MatchResult, resume: Resume): string[] {
  const tips: string[] = []
  const missingReq = match.missing.filter((k) => k.required).map((k) => k.label)
  const missingDes = match.missing.filter((k) => !k.required).map((k) => k.label)
  if (missingReq.length)
    tips.push(`A vaga pede ${joinPt(missingReq)} e isso não aparece no seu perfil. Se você tem, cadastre com uma evidência (experiência ou projeto). Se não tem, não coloque: é um ponto para estudar.`)
  if (missingDes.length) tips.push(`Diferenciais que você não comprovou: ${joinPt(missingDes)}.`)
  for (const h of match.matched.filter((k) => k.levelGap))
    tips.push(`A vaga pede ${h.label} e seu perfil diz ${h.ownLabel}. O currículo mantém o seu nível. Se você já está acima disso, atualize o perfil.`)

  const onlyListed = match.matched.filter((h) => h.evidence.every((e) => e === 'competências' || e === 'sobre')).map((h) => h.label)
  if (onlyListed.length)
    tips.push(`${joinPt(onlyListed)} ${onlyListed.length > 1 ? 'aparecem' : 'aparece'} só na lista de competências. Mostre onde você usou isso numa experiência ou projeto: vale mais no ranking.`)

  const bullets = resume.experiences.flatMap((e) => e.bullets)
  const noNumber = bullets.filter((b) => !hasNumber(b)).length
  if (noNumber)
    tips.push(`${noNumber} ${noNumber > 1 ? 'conquistas estão' : 'conquista está'} sem número. Use verbo + ação + número: "Automatizei 12 relatórios e economizei 5 h por semana".`)
  const weak = bullets.filter((b) => WEAK_START.test(fold(b)))
  if (weak.length) tips.push(`Troque começos como "Responsável por" e "Fazia" por um verbo de entrega: automatizei, reduzi, criei, implantei.`)

  if (!profile.experiences.length)
    tips.push('Sem experiência formal? Cadastre projetos, voluntariado e empresa júnior. Tudo isso conta como experiência.')
  if (!profile.linkedin.trim()) tips.push('Coloque o link do seu LinkedIn no topo.')
  if (!profile.email.trim() || !profile.phone.trim()) tips.push('Faltam e-mail ou telefone no topo.')
  if (match.breakdown.find((b) => b.label === 'Cargo e área')?.score === 0)
    tips.push('O cargo da vaga é diferente das funções que você já exerceu. O título do currículo segue a vaga, então garanta que o resumo e as experiências sustentem esse título.')
  return tips
}

export function tailorLocal(profile: Profile, job: Job): Tailored {
  const match = scoreMatch(profile, job)
  const { resume, tips } = buildResume(profile, job, match)
  return { id: uid(), createdAt: new Date().toISOString(), job, match, resume, tips, engine: 'local' }
}
