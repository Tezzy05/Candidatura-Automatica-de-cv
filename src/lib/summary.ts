import { fold, hasNumber, joinPt } from './text'
import type { Education, Gender, Profile, ProjectKind } from './types'

/** Momento de carreira, que muda o jeito de se apresentar. */
export type Situation = 'estudante' | 'recém-formado' | 'transição' | 'experiente'

export interface SummaryInput {
  profile: Profile
  /** Título da vaga. */
  title: string
  /** Ferramentas da vaga que o perfil comprova, na grafia da vaga. */
  tools: string[]
  /** Diferenciais da vaga que o perfil comprova. */
  extras: string[]
  /** Se as ferramentas aparecem nas experiências (e não só na lista de competências). */
  usedAtWork: boolean
  /** O cargo da vaga é diferente de tudo o que a pessoa já fez. */
  newArea: boolean
  /** Formação mais ligada à vaga. */
  education?: Education
  /** Conquista com número mais ligada à vaga, já na grafia da vaga. */
  bestBullet?: string
  /** "Sobre você", já na grafia da vaga. */
  about: string
}

const YEAR = /(19|20)\d{2}/g
const SENIORITY = /\s+(j[uú]nior|jr\.?|pleno|pl|s[eê]nior|sr\.?|i{1,3}|iv)$/i

export function yearsOfExperience(profile: Profile): number {
  const years = profile.experiences.map((e) => Number(e.start.match(YEAR)?.[0])).filter(Boolean)
  return years.length ? Math.max(0, new Date().getFullYear() - Math.min(...years)) : 0
}

/** "Tecnólogo em Análise de Dados" → "Análise de Dados". */
export function courseName(course: string): string {
  return course
    .replace(/^(curso\s+)?(superior\s+)?(de\s+)?(tecn[oó]logo|tecnologia|bacharelado|bacharel|gradua[cç][aã]o|licenciatura|t[eé]cnico|mba|p[oó]s-gradua[cç][aã]o|especializa[cç][aã]o|mestrado)\s+(em|de)\s+/i, '')
    .trim()
}

export function inProgress(e: Education): boolean {
  if (/cursando|andamento|previs|atual|conclus[aã]o em/i.test(`${e.period} ${e.course}`)) return true
  const years = (e.period.match(YEAR) ?? []).map(Number)
  return years.length > 0 && Math.max(...years) > new Date().getFullYear()
}

export function situation(input: Pick<SummaryInput, 'profile' | 'newArea' | 'education'>): Situation {
  const { profile, newArea, education } = input
  const years = yearsOfExperience(profile)
  if (education && inProgress(education) && years < 2) return 'estudante'
  if (years < 1) return 'recém-formado'
  return newArea ? 'transição' : 'experiente'
}

const graduated: Record<Gender, string> = { masculino: 'formado em', feminino: 'formada em', neutro: 'com formação em' }

function sentences(text: string): string[] {
  return text.trim().replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=\p{Lu})/u).filter(Boolean)
}

const sentence = (s: string) => {
  const t = s.trim().replace(/\s+/g, ' ')
  if (!t) return ''
  return t[0].toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.')
}

/** "Assistente Administrativo" → "Assistente administrativo" (só no meio da frase; siglas ficam). */
const lowerTail = (s: string) => s.replace(/(\s)(\p{Lu})(\p{Ll})/gu, (_m, sp: string, a: string, b: string) => sp + a.toLowerCase() + b)

const ACTIVITY: Record<ProjectKind, string> = {
  Projeto: 'projetos',
  Voluntariado: 'voluntariado',
  'Empresa júnior': 'empresa júnior',
  Freelance: 'freelas',
  Curso: 'cursos práticos',
}

/**
 * Resumo de 3 linhas, sem IA: quem você é, o que domina (na língua da vaga) e o que entrega.
 * O molde muda conforme o momento de carreira, para não soar igual em todo currículo.
 */
export function composeSummary(input: SummaryInput): string {
  const { profile, title, tools, extras, usedAtWork, education, bestBullet, about } = input
  const gender = profile.gender ?? 'neutro'
  const years = yearsOfExperience(profile)
  const yearsText = years >= 1 ? `${years} ${years === 1 ? 'ano' : 'anos'} de experiência` : ''
  const course = education ? courseName(education.course) : ''
  const base = lowerTail(title.replace(SENIORITY, '').trim())
  const target = /^\p{Lu}\p{Ll}/u.test(base) ? base[0].toLowerCase() + base.slice(1) : base
  const who = lowerTail((profile.headline.trim() || title).trim())
  const kind = situation(input)

  // 1. Quem você é
  let line1: string
  if (kind === 'estudante') {
    line1 = course ? `Estudante de ${course}${education?.institution ? ` (${education.institution})` : ''}` : who
    if (yearsText) line1 += `, com ${yearsText}`
  } else if (kind === 'recém-formado') {
    line1 = course ? `${who}, ${graduated[gender]} ${course}` : who
  } else if (kind === 'transição') {
    const lastRole = lowerTail(profile.experiences[0]?.role || who)
    line1 = `${lastRole} com ${yearsText}${course ? ` e formação em ${course}` : ''}, em transição para ${target}`
  } else {
    line1 = `${who} com ${yearsText}${course ? `, ${graduated[gender]} ${course}` : ''}`
  }

  // 2. O que domina
  let line2 = ''
  if (tools.length) {
    const list = joinPt(tools.slice(0, 5))
    const plus = extras.length ? `, além de ${joinPt(extras.slice(0, 2))}` : ''
    if (kind === 'estudante' || (kind === 'recém-formado' && !usedAtWork)) {
      const kinds = [...new Set(profile.projects.map((p) => ACTIVITY[p.kind]))]
      line2 = `Experiência prática com ${list}${plus}${kinds.length ? ` em ${joinPt(kinds)}` : ''}`
    } else if (kind === 'transição' && usedAtWork) {
      line2 = `Domínio de ${list}${plus}, que já uso no trabalho atual`
    } else {
      line2 = `Domínio de ${list}${plus}`
    }
  }

  // 3. O que entrega: sua própria frase (a primeira que não repete a linha 1), ou sua melhor conquista com número
  const opening = fold(who).split(' ').slice(0, 2).join(' ')
  const own = sentences(about).find((s) => !fold(s).startsWith(opening))
  let line3 = own ?? (bestBullet && hasNumber(bestBullet) ? bestBullet : '')
  if (!line3 && kind === 'estudante') line3 = `Busco minha primeira oportunidade como ${target}`

  return [line1, line2, line3].map(sentence).filter(Boolean).join(' ')
}
