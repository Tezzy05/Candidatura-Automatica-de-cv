/**
 * Remove acentos e põe em minúsculas preservando o tamanho da string,
 * para que um índice no texto normalizado aponte para o mesmo trecho no original.
 */
export function fold(text: string): string {
  let out = ''
  for (const ch of text) {
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    out += base.length === ch.length ? base : ch
  }
  return out
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Regex que acha o termo como palavra inteira (aceita "C#", "Node.js", "CI/CD"). */
export function termRegex(foldedTerm: string, flags = 'g'): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(foldedTerm)}(?![\\p{L}\\p{N}+#])`, `u${flags}`)
}

export function containsTerm(foldedText: string, foldedTerm: string): boolean {
  return termRegex(foldedTerm, '').test(foldedText)
}

const STOPWORDS = new Set(
  `a o as os um uma uns umas de do da dos das em no na nos nas por para pra com sem e ou que se ao aos
  como mais menos muito muita seu sua seus suas nosso nossa voce voces ele ela eles elas isso esse essa este esta
  ser estar ter ha sao foi era sera tem pelo pela pelos pelas entre sobre ate apos tambem ja nao sim
  vaga vagas empresa time equipe area areas atuar atuacao trabalhar trabalho buscamos procuramos pessoa
  profissional candidato candidata requisitos requisito desejavel desejaveis diferencial diferenciais
  conhecimento conhecimentos experiencia experiencias responsabilidades atividades beneficios
  the and or of to in for with on at by an is are be as we you our your will`.split(/\s+/),
)

export function tokens(text: string): string[] {
  return fold(text)
    .split(/[^\p{L}\p{N}+#]+/u)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
}

/** Similaridade de cosseno entre dois textos (frequência de termos). 0 a 1. */
export function cosine(a: string, b: string): number {
  const fa = freq(tokens(a))
  const fb = freq(tokens(b))
  let dot = 0
  for (const [t, n] of fa) dot += n * (fb.get(t) ?? 0)
  const na = Math.sqrt([...fa.values()].reduce((s, n) => s + n * n, 0))
  const nb = Math.sqrt([...fb.values()].reduce((s, n) => s + n * n, 0))
  return na && nb ? dot / (na * nb) : 0
}

function freq(list: string[]) {
  const m = new Map<string, number>()
  for (const t of list) m.set(t, (m.get(t) ?? 0) + 1)
  return m
}

/** Lista em português: "A, B e C". */
export function joinPt(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`
}

export const hasNumber = (s: string) => /\d/.test(s)

export const uid = () => Math.random().toString(36).slice(2, 10)
