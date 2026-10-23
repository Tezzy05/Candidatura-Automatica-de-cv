/** Perfil-mestre: tudo o que você já fez. O currículo de cada vaga é um recorte dele. */
export interface Profile {
  name: string
  location: string
  phone: string
  email: string
  linkedin: string
  /** Portfólio, GitHub etc. */
  links: string[]
  /** Cargo que você ocupa ou busca; usado quando a vaga não tem título claro. */
  headline: string
  /** Texto livre sobre você. Serve de matéria-prima para o resumo de 3 linhas. */
  about: string
  skills: string[]
  experiences: Experience[]
  projects: Project[]
  education: Education[]
  languages: string[]
  certifications: string[]
}

export interface Experience {
  id: string
  role: string
  company: string
  start: string
  end: string
  /** Uma conquista por linha. Ideal: verbo + ação + número. */
  bullets: string[]
}

export type ProjectKind = 'Projeto' | 'Voluntariado' | 'Empresa júnior' | 'Freelance' | 'Curso'

export interface Project {
  id: string
  kind: ProjectKind
  name: string
  description: string
}

export interface Education {
  id: string
  course: string
  institution: string
  period: string
}

export interface Job {
  title: string
  company: string
  location: string
  description: string
}

/** Uma competência pedida pela vaga, com o termo exatamente como a vaga escreve. */
export interface JobKeyword {
  /** Chave canônica (sem acento, minúscula), usada para comparar. */
  key: string
  /** Como aparece na vaga, ex.: "Power BI". É esse termo que vai para o currículo. */
  label: string
  kind: 'hard' | 'soft' | 'language'
  required: boolean
}

export interface KeywordHit extends JobKeyword {
  /** Onde o perfil comprova essa competência. */
  evidence: Array<'competências' | 'experiência' | 'projetos' | 'formação' | 'sobre' | 'certificações'>
  /** A vaga pede um nível (ex.: "avançado") que o perfil não declara. */
  levelGap?: boolean
  /** Como o perfil escreve a competência; usado no currículo quando há diferença de nível. */
  ownLabel?: string
}

export interface MatchResult {
  /** 0 a 100 */
  score: number
  level: 'baixa' | 'média' | 'boa' | 'alta'
  breakdown: Array<{ label: string; score: number; weight: number; detail: string }>
  matched: KeywordHit[]
  missing: JobKeyword[]
  /** Palavras-chave detectadas na vaga (obrigatórias + diferenciais). */
  keywords: JobKeyword[]
}

/** O currículo final: uma coluna, uma página, sem foto nem tabela. */
export interface Resume {
  name: string
  title: string
  contact: string[]
  summary: string
  skills: string[]
  experiences: Array<{ role: string; company: string; period: string; bullets: string[] }>
  projects: Array<{ kind: string; name: string; description: string }>
  education: Array<{ course: string; institution: string; period: string }>
  languages: string[]
  certifications: string[]
}

export interface Tailored {
  id: string
  createdAt: string
  job: Job
  match: MatchResult
  resume: Resume
  /** Dicas do que melhorar no perfil (nunca inventadas no currículo). */
  tips: string[]
  engine: 'local' | 'ia'
  /** Avaliação qualitativa da IA, quando usada. */
  aiNote?: string
  /** Termos que a IA colocou no currículo e que não aparecem no perfil. */
  warnings?: string[]
}
