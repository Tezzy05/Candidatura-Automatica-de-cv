import { emptyProfile } from './sample'
import { SKILLS } from './skills'
import { containsTerm, fold, uid } from './text'
import type { Education, Experience, Profile, Project, ProjectKind } from './types'

/**
 * Lê um currículo ou perfil do LinkedIn colado como texto e preenche o perfil, sem IA.
 * Acerta o grosso (contato, seções, experiências com datas); o resto você revisa nos campos.
 */

type SectionName = 'about' | 'experience' | 'education' | 'skills' | 'languages' | 'certifications' | 'projects' | 'ignore'

const SECTIONS: Array<[SectionName, RegExp]> = [
  ['about', /^(resumo( profissional)?|sobre( mim)?|perfil( profissional)?|objetivo( profissional)?|apresentacao|summary|about)$/],
  ['experience', /^(experiencias?( profissiona(l|is))?|historico profissional|trajetoria profissional|experience|work experience)$/],
  ['education', /^(formacao( academica)?|escolaridade|educacao|education)$/],
  ['skills', /^(competencias( tecnicas| principais)?|habilidades( tecnicas)?|conhecimentos( tecnicos| em informatica)?|ferramentas|skills|top skills|principais competencias|tecnologias)$/],
  ['languages', /^(idiomas?|languages)$/],
  ['certifications', /^(certificac(ao|oes)|certificados?|cursos( complementares| e certificac(ao|oes))?|licencas e certificados|licenses & certifications|certifications|qualificacoes complementares)$/],
  ['projects', /^(projetos( pessoais| academicos)?|voluntariado|trabalho voluntario|atividades( complementares| extracurriculares)?|projects|volunteer experience)$/],
  ['ignore', /^(informacoes (pessoais|adicionais)|dados pessoais|referencias|contato|contact|honors-awards|publicacoes)$/],
]

const MONTHS = 'jan|fev|feb|mar|abr|apr|mai|may|jun|jul|ago|aug|set|sep|out|oct|nov|dez|dec'
const DATE = `(?:(?:${MONTHS})[a-zç]*\\.?\\s*(?:de\\s+|/)?|\\d{1,2}/)?(?:19|20)\\d{2}`
const RANGE = new RegExp(`(${DATE})\\s*(?:-|–|—|a|ate|até|to)\\s*(${DATE}|atual|o momento|momento|presente|present|hoje|atualmente|current)`, 'i')
const SINGLE = new RegExp(`^(?:desde\\s+)?(${DATE})$`, 'i')

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/
const PHONE = /(\+?55\s*)?\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}/
const LINKEDIN = /(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w\-%]+\/?/i
const URL = /(https?:\/\/|www\.)\S+|\b[\w-]+\.(dev|io|me|com\.br|github\.io)\/?\S*/i
/** "São Paulo, SP", "Campinas - SP", "Campinas, São Paulo, Brasil" (exige vírgula ou hífen com espaços: "Front-end" não é cidade). */
const LOCATION = /^\p{Lu}[\p{L} .'-]*(?:,\s*|\s+[-/]\s+)(?:[A-Z]{2}|\p{Lu}[\p{L} ]+)(?:,\s*Brasil)?$/u
const LANGUAGE = /\b(ingles|espanhol|frances|alemao|italiano|portugues|mandarim|chines|japones|coreano|russo|arabe|libras|english|spanish|french|german|italian|portuguese)\b/
const PRIVATE = /\b(cpf|rg|idade|anos de idade|estado civil|nascimento|nacionalidade|solteir|casad|cnh)\b|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/i
const BULLET = /^\s*([-•*·▪●–➢>]|\d+[.)])\s*/

const ROLE_WORDS =
  /\b(analista|assistente|auxiliar|gerente|coordenador|coordenadora|supervisor|supervisora|diretor|diretora|desenvolvedor|desenvolvedora|engenheiro|engenheira|estagiario|estagiaria|estagio|tecnico|tecnica|consultor|consultora|especialista|vendedor|vendedora|atendente|designer|programador|programadora|operador|operadora|recepcionista|lider|head|intern|developer|engineer|manager|cientista|arquiteto|arquiteta|professor|professora|jovem aprendiz|aprendiz|trainee|socio|fundador|fundadora|freelancer)\b/
const SCHOOL_WORDS = /\b(universidade|faculdade|instituto|escola|centro universitario|fatec|etec|senai|senac|sesi|usp|unicamp|unesp|puc|fgv|insper|mackenzie|uninove|unip|anhanguera|estacio|ifsp|ufrj|ufmg|college|university)\b/
const COURSE_WORDS = /\b(graduacao|bacharel|bacharelado|tecnologo|tecnologia em|tecnico em|licenciatura|mba|pos-graduacao|pos graduacao|especializacao|mestrado|doutorado|ensino medio|curso|engenharia|administracao|ciencia|ciencias|analise)\b/

const SPLIT = /\s+(?:\||–|—|-|@|·)\s+|\s+(?:na|no|em)\s+(?=\p{Lu})/u
/** Na formação, "em" faz parte do nome do curso ("Bacharelado em Contábeis"). */
const SPLIT_EDU = /\s+(?:\||–|—|-|@|·)\s+|\s*·\s*/u

const clean = (s: string) => s.replace(BULLET, '').replace(/\s+/g, ' ').trim()
const isBullet = (s: string) => BULLET.test(s)

function headerOf(line: string): SectionName | null {
  const f = fold(line).replace(/[:•\-–_=*#]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!f || f.split(' ').length > 5) return null
  return SECTIONS.find(([, re]) => re.test(f))?.[0] ?? null
}

function splitList(lines: string[]): string[] {
  return lines
    .flatMap((l) => clean(l).split(/\s*[,;|·•]\s*|\s+-\s+/))
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter((s) => s.length > 1 && s.length <= 50)
}

/** "jan de 2024 - o momento (1 ano)" → { start: "jan 2024", end: "" } */
function parseRange(line: string): { start: string; end: string; rest: string } | null {
  // fold() preserva o tamanho, então os índices do texto normalizado valem para o original.
  const m = new RegExp(RANGE.source, 'id').exec(fold(line))
  if (!m?.indices) return null
  const [whole, s, e] = m.indices as unknown as Array<[number, number]>
  const pretty = (x: string) => x.replace(/\s+de\s+/i, ' ').replace(/\.$/, '').trim()
  const end = line.slice(e[0], e[1])
  const isNow = !/\d{4}/.test(end)
  const rest = (line.slice(0, whole[0]) + ' ' + line.slice(whole[1]))
    .replace(/\(\s*\d+\s*(anos?|mes(es)?|years?|months?)[^)]*\)/gi, '')
    .replace(/\(\s*\)/g, '')
    .replace(/^[\s|,–—-]+|[\s|,–—(-]+$/g, '')
    .trim()
  return { start: pretty(line.slice(s[0], s[1])), end: isNow ? '' : pretty(end), rest }
}

/** Separa "Cargo – Empresa" ou duas linhas soltas em cargo e empresa. */
function roleAndCompany(parts: string[]): { role: string; company: string } {
  const pieces = parts.flatMap((p) => p.split(SPLIT)).map((p) => p.trim()).filter(Boolean)
  if (!pieces.length) return { role: '', company: '' }
  const roleIdx = pieces.findIndex((p) => ROLE_WORDS.test(fold(p)))
  if (roleIdx >= 0) {
    const role = pieces[roleIdx]
    const company = pieces.find((_, i) => i !== roleIdx && !LOCATION.test(pieces[i])) ?? ''
    return { role, company }
  }
  return { role: pieces[0], company: pieces[1] ?? '' }
}

function parseExperiences(lines: string[]): Experience[] {
  const out: Experience[] = []
  let header: string[] = []
  let current = null as Experience | null

  const start = (range: { start: string; end: string }, headerLines: string[]): Experience => {
    const { role, company } = roleAndCompany(headerLines)
    const exp = { id: uid(), role, company, start: range.start, end: range.end, bullets: [] }
    out.push(exp)
    return exp
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const range = isBullet(line) ? null : parseRange(line)
    if (range) {
      // A data abre uma nova experiência; as linhas curtas logo antes dela são cargo e empresa.
      current = start(range, [...header, ...(range.rest ? [range.rest] : [])])
      header = []
      continue
    }
    const short = !isBullet(line) && line.split(/\s+/).length <= 8 && !/[.;]$/.test(line)
    const nextHasDate = lines.slice(i + 1, i + 3).some((l) => !isBullet(l) && parseRange(l))
    if (short && (nextHasDate || !current)) {
      header.push(line)
      continue
    }
    if (current && !current.role && short && !current.bullets.length) {
      // LinkedIn: empresa e duração vêm antes, o cargo depois.
      Object.assign(current, roleAndCompany([line]))
      continue
    }
    if (current) {
      if (short && LOCATION.test(line) && !current.bullets.length) continue
      const text = clean(line)
      // Linha que continua a frase anterior (quebra de linha no meio do bullet).
      const last = current.bullets.length - 1
      if (!isBullet(line) && last >= 0 && !/[.;:!?]$/.test(current.bullets[last]) && /^\p{Ll}/u.test(text)) {
        current.bullets[last] += ` ${text}`
      } else current.bullets.push(text)
    }
  }
  // LinkedIn agrupa vários cargos sob a mesma empresa: o cargo sem empresa herda a de cima.
  out.forEach((e, i) => {
    if (!e.company && i > 0) e.company = out[i - 1].company
  })
  return out.filter((e) => e.role || e.company || e.bullets.length)
}

function parseEducation(lines: string[]): Education[] {
  const out: Education[] = []
  let block: string[] = []
  const flush = () => {
    if (!block.length) return
    let period = ''
    const parts: string[] = []
    for (const l of block) {
      const r = parseRange(l)
      const single = fold(clean(l)).match(new RegExp(DATE, 'i'))
      if (r) {
        period = [r.start, r.end || 'atual'].join(' – ')
        if (r.rest) parts.push(...r.rest.split(SPLIT_EDU))
      } else if (single && SINGLE.test(fold(clean(l)))) period = clean(l)
      else parts.push(...clean(l).split(SPLIT_EDU))
    }
    const pieces = parts.map((p) => p.trim()).filter(Boolean)
    const school = pieces.find((p) => SCHOOL_WORDS.test(fold(p)))
    const course = pieces.find((p) => p !== school && COURSE_WORDS.test(fold(p))) ?? pieces.find((p) => p !== school) ?? ''
    if (course || school) out.push({ id: uid(), course, institution: school ?? pieces.find((p) => p !== course) ?? '', period })
    block = []
  }
  for (const raw of lines) {
    const l = raw.trim()
    if (!l) {
      flush()
      continue
    }
    // Uma linha com curso ou escola depois de um bloco com data começa uma nova formação.
    if (block.length && block.some((b) => parseRange(b) || SINGLE.test(fold(clean(b)))) && (SCHOOL_WORDS.test(fold(l)) || COURSE_WORDS.test(fold(l)))) flush()
    block.push(l)
  }
  flush()
  return out
}

function projectKind(text: string): ProjectKind {
  const f = fold(text)
  if (/volunt/.test(f)) return 'Voluntariado'
  if (/empresa junior/.test(f)) return 'Empresa júnior'
  if (/freela|freelance|autonomo/.test(f)) return 'Freelance'
  if (/curso|bootcamp/.test(f)) return 'Curso'
  return 'Projeto'
}

function parseProjects(lines: string[], heading: string): Project[] {
  const out: Project[] = []
  for (const raw of lines) {
    const l = clean(raw)
    if (!l) continue
    const last = out[out.length - 1]
    if (last && !isBullet(raw) && /^\p{Ll}/u.test(l)) {
      last.description += ` ${l}`
      continue
    }
    const m = l.match(/^([^:–—]{2,60})\s*(?::|–|—|\s-\s)\s*(.+)$/)
    const name = m ? m[1].trim() : l.length <= 60 ? l : l.split(/[.,]/)[0]
    const description = m ? m[2].trim() : l.length <= 60 ? '' : l
    out.push({ id: uid(), kind: projectKind(`${heading} ${l}`), name, description })
  }
  return out
}

export interface ImportReport {
  profile: Profile
  found: string[]
}

export function importProfileText(text: string): ImportReport {
  const p = emptyProfile()
  const lines = text.replace(/\r/g, '').split('\n')

  const blocks: Record<SectionName | 'top', string[]> = {
    top: [], about: [], experience: [], education: [], skills: [], languages: [], certifications: [], projects: [], ignore: [],
  }
  const projectHeadings: string[] = []
  let current: SectionName | 'top' = 'top'
  for (const line of lines) {
    const h = headerOf(line)
    if (h) {
      current = h
      if (h === 'projects') projectHeadings.push(line)
      continue
    }
    blocks[current].push(line)
  }

  // No PDF do LinkedIn, nome, cargo e cidade vêm depois da coluna lateral (idiomas, competências):
  // o que não for idioma volta para o topo.
  const notLanguage = blocks.languages.filter((l) => l.trim() && !LANGUAGE.test(fold(l)))
  if (notLanguage.length) {
    blocks.languages = blocks.languages.filter((l) => LANGUAGE.test(fold(l)))
    blocks.top.push(...notLanguage)
  }

  // Topo: contatos, nome e cargo. Dados sensíveis (CPF, idade, estado civil) ficam de fora.
  const top = blocks.top.map((l) => l.trim()).filter(Boolean)
  const all = top.join('  ')
  p.email = all.match(EMAIL)?.[0] ?? text.match(EMAIL)?.[0] ?? ''
  p.linkedin = (all.match(LINKEDIN)?.[0] ?? text.match(LINKEDIN)?.[0] ?? '').replace(/^(https?:\/\/)?(www\.)?/i, '').replace(/\/$/, '')
  p.phone = (all.match(PHONE)?.[0] ?? '').trim()
  for (const l of top) {
    for (const piece of l.split(/\s*[|·•]\s*|\s{2,}/)) {
      const s = piece.trim()
      if (!s || PRIVATE.test(s)) continue
      if (EMAIL.test(s) || LINKEDIN.test(s) || (PHONE.test(s) && s.replace(PHONE, '').trim().length < 4)) continue
      if (URL.test(s)) {
        p.links.push(s.replace(/^https?:\/\//, ''))
        continue
      }
      if (!p.location && LOCATION.test(s) && s.split(' ').length <= 6 && !ROLE_WORDS.test(fold(s))) {
        p.location = s.replace(/,\s*Brasil$/i, '').replace(/\s+[-/]\s+/, ', ')
        continue
      }
      if (/^(endereco|rua|av\.?|avenida)\b/i.test(fold(s))) continue
      if (!p.name && s.split(' ').length <= 6 && !/\d/.test(s)) p.name = s
      else if (!p.headline && s.split(' ').length <= 10 && !/\d/.test(s) && !s.includes('@')) p.headline = s
    }
  }

  p.about = blocks.about.map((l) => l.trim()).filter(Boolean).join(' ')
  p.experiences = parseExperiences(blocks.experience)
  p.education = parseEducation(blocks.education)
  p.languages = splitList(blocks.languages.filter((l) => l.trim()))
  p.certifications = blocks.certifications.map(clean).filter(Boolean)
  p.projects = parseProjects(blocks.projects, projectHeadings.join(' '))
  p.skills = splitList(blocks.skills.filter((l) => l.trim()))

  // Sem seção de competências: pega as conhecidas que aparecem no texto.
  if (!p.skills.length) {
    const f = fold(text)
    p.skills = SKILLS.filter((s) => s.kind !== 'language' && s.terms.some((t) => t.length > 2 && containsTerm(f, t))).map((s) => s.label)
  }
  if (!p.headline && p.experiences[0]) p.headline = p.experiences[0].role

  const found = [
    p.name && 'nome',
    (p.email || p.phone) && 'contato',
    p.experiences.length && `${p.experiences.length} ${p.experiences.length > 1 ? 'experiências' : 'experiência'}`,
    p.education.length && `${p.education.length} ${p.education.length > 1 ? 'formações' : 'formação'}`,
    p.skills.length && `${p.skills.length} competências`,
    p.projects.length && `${p.projects.length} ${p.projects.length > 1 ? 'projetos' : 'projeto'}`,
    p.languages.length && 'idiomas',
    p.certifications.length && 'certificações',
  ].filter((x): x is string => Boolean(x))

  return { profile: p, found }
}
