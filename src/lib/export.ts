import type { Resume } from './types'

/** Versão em texto puro, para colar em formulários de candidatura. */
export function resumeToText(r: Resume): string {
  const out: string[] = [r.name.toUpperCase(), r.title, r.contact.join(' | ')]
  const section = (title: string, lines: string[]) => lines.length && out.push('', title.toUpperCase(), ...lines)
  section('Resumo', r.summary ? [r.summary] : [])
  section('Competências', r.skills.length ? [r.skills.join(' · ')] : [])
  section('Experiência', r.experiences.flatMap((e) => [`${e.role} · ${[e.company, e.period].filter(Boolean).join(' · ')}`, ...e.bullets.map((b) => `• ${b}`)]))
  section('Projetos e atividades', r.projects.map((p) => `• ${p.kind}: ${p.name}${p.description ? ` — ${p.description}` : ''}`))
  section('Formação', r.education.map((e) => `${e.course} · ${[e.institution, e.period].filter(Boolean).join(' · ')}`))
  section('Certificações', r.certifications.length ? [r.certifications.join(' · ')] : [])
  section('Idiomas', r.languages.length ? [r.languages.join(' · ')] : [])
  return out.join('\n')
}

/** Nome do arquivo como no vídeo: Seu-Nome-Analista-de-Dados.pdf */
export function pdfFileName(r: Resume): string {
  const slug = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return [slug(r.name || 'Curriculo'), slug(r.title)].filter(Boolean).join('-')
}
