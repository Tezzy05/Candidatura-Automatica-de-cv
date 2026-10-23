import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Resume } from '@/lib/types'

/** A4 a 96 dpi. */
export const PAGE_W = 794
export const PAGE_H = 1123

const BLUE = '#3341e6'
const SEP = '  ·  '

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 16 }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: BLUE }}>
        {title}
        <span aria-hidden style={{ flex: 1, height: 1, background: '#e4e4ea' }} />
      </h2>
      {children}
    </section>
  )
}

/**
 * Trecho de texto que vira editável na prévia. Enter confirma; o valor só é gravado ao sair do campo.
 * O `key` com o valor remonta o elemento quando o texto muda por fora, para o React não brigar com o cursor.
 */
function Text({ value, onChange, style, placeholder }: { value: string; onChange?: (v: string) => void; style?: React.CSSProperties; placeholder?: string }) {
  if (!onChange) return <span style={style}>{value}</span>
  return (
    <span
      key={value}
      className="cv-edit"
      style={style}
      data-placeholder={placeholder}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        }
        if (e.key === 'Escape') {
          e.currentTarget.textContent = value
          e.currentTarget.blur()
        }
      }}
      onBlur={(e) => {
        const next = (e.currentTarget.textContent ?? '').replace(/\s+/g, ' ').trim()
        if (next !== value) onChange(next)
      }}
    >
      {value}
    </span>
  )
}

const splitList = (v: string) => v.split('·').map((s) => s.trim()).filter(Boolean)

/**
 * Currículo em uma coluna, sem foto, sem tabela, sem barrinhas: o robô de triagem lê na ordem certa.
 * Com `onEdit`, cada trecho pode ser corrigido direto na folha.
 */
export function ResumeSheet({ resume, ref, style, onEdit, pageBreak }: { resume: Resume; ref?: React.Ref<HTMLDivElement>; style?: React.CSSProperties; onEdit?: (r: Resume) => void; pageBreak?: boolean }) {
  const text = { fontSize: 11.5, lineHeight: 1.5, color: '#2b2b2b' }
  const edit = onEdit
    ? <K extends keyof Resume>(k: K, map: (v: string) => Resume[K] = (v) => v as Resume[K]) => (v: string) => onEdit({ ...resume, [k]: map(v) })
    : undefined
  const editItem = onEdit
    ? <K extends 'experiences' | 'projects' | 'education'>(k: K, i: number, field: keyof Resume[K][number]) =>
        (v: string) => onEdit({ ...resume, [k]: resume[k].map((x, j) => (j === i ? { ...x, [field]: v } : x)) })
    : undefined
  const editBullet = onEdit
    ? (i: number, j: number) => (v: string) =>
        onEdit({
          ...resume,
          // Apagar todo o texto de um tópico remove o tópico.
          experiences: resume.experiences.map((e, x) =>
            x === i ? { ...e, bullets: v ? e.bullets.map((b, y) => (y === j ? v : b)) : e.bullets.filter((_, y) => y !== j) } : e,
          ),
        })
    : undefined

  return (
    <div
      ref={ref}
      lang="pt-BR"
      style={{
        position: 'relative',
        width: PAGE_W,
        minHeight: PAGE_H,
        padding: '44px 52px',
        background: '#fff',
        color: '#111',
        fontFamily: "'Geist Variable', Inter, Arial, sans-serif",
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <header>
        <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
          <Text value={resume.name || 'Seu nome'} onChange={edit?.('name')} />
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 600, color: BLUE }}>
          <Text value={resume.title} onChange={edit?.('title')} />
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 11, color: '#666' }}>
          <Text value={resume.contact.join(SEP)} onChange={edit?.('contact', splitList)} />
        </p>
      </header>

      {(resume.summary || onEdit) && (
        <Section title="Resumo">
          <p style={{ ...text, margin: 0 }}>
            <Text value={resume.summary} onChange={edit?.('summary')} placeholder="Escreva um resumo de 3 linhas" />
          </p>
        </Section>
      )}

      {resume.skills.length > 0 && (
        <Section title="Competências">
          <p style={{ ...text, margin: 0, color: '#111', fontWeight: 500 }}>
            <Text value={resume.skills.join(SEP)} onChange={edit?.('skills', splitList)} />
          </p>
        </Section>
      )}

      {resume.experiences.length > 0 && (
        <Section title="Experiência">
          {resume.experiences.map((e, i) => (
            <div key={i} style={{ marginTop: i ? 10 : 0 }}>
              <p style={{ margin: 0, fontSize: 12.5 }}>
                <strong style={{ fontWeight: 700 }}>
                  <Text value={e.role} onChange={editItem?.('experiences', i, 'role')} />
                </strong>
                <span style={{ color: '#666' }}>
                  {' · '}
                  <Text value={e.company} onChange={editItem?.('experiences', i, 'company')} />
                  {' · '}
                  <Text value={e.period} onChange={editItem?.('experiences', i, 'period')} />
                </span>
              </p>
              <ul style={{ margin: '3px 0 0', paddingLeft: 16, listStyle: 'disc' }}>
                {e.bullets.map((b, j) => (
                  <li key={j} style={text}>
                    <Text value={b} onChange={editBullet?.(i, j)} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Section>
      )}

      {resume.projects.length > 0 && (
        <Section title="Projetos e atividades">
          <ul style={{ margin: 0, paddingLeft: 16, listStyle: 'disc' }}>
            {resume.projects.map((p, i) => (
              <li key={i} style={text}>
                <strong style={{ color: '#111' }}>{p.kind}: </strong>
                <Text value={p.name} onChange={editItem?.('projects', i, 'name')} />
                {(p.description || onEdit) && ' — '}
                <Text value={p.description} onChange={editItem?.('projects', i, 'description')} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {resume.education.length > 0 && (
        <Section title="Formação">
          {resume.education.map((e, i) => (
            <p key={i} style={{ ...text, margin: 0 }}>
              <strong style={{ color: '#111' }}>
                <Text value={e.course} onChange={editItem?.('education', i, 'course')} />
              </strong>
              <span style={{ color: '#666' }}>
                {' · '}
                <Text value={e.institution} onChange={editItem?.('education', i, 'institution')} />
                {' · '}
                <Text value={e.period} onChange={editItem?.('education', i, 'period')} />
              </span>
            </p>
          ))}
        </Section>
      )}

      {resume.certifications.length > 0 && (
        <Section title="Certificações">
          <p style={{ ...text, margin: 0 }}>
            <Text value={resume.certifications.join(SEP)} onChange={edit?.('certifications', splitList)} />
          </p>
        </Section>
      )}

      {resume.languages.length > 0 && (
        <Section title="Idiomas">
          <p style={{ ...text, margin: 0 }}>
            <Text value={resume.languages.join(SEP)} onChange={edit?.('languages', splitList)} />
          </p>
        </Section>
      )}

      {pageBreak && (
        // Onde a primeira página termina: tudo abaixo desta linha vai para uma segunda página.
        <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: PAGE_H - 1, borderTop: '1px dashed #d93036' }} />
      )}
    </div>
  )
}

/** Na tela: reduzido para caber na coluna e editável. Na impressão: uma cópia em tamanho real, fora do app (ver index.css). */
export function ResumePaper({ resume, onOverflow, onEdit }: { resume: Resume; onOverflow?: (over: boolean) => void; onEdit?: (r: Resume) => void }) {
  const wrap = useRef<HTMLDivElement>(null)
  const page = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState(PAGE_H)

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / PAGE_W)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (!page.current) return
    const h = page.current.scrollHeight
    if (h !== height) setHeight(h)
    onOverflow?.(h > PAGE_H + 1)
  }, [resume, height, onOverflow])

  return (
    <div ref={wrap} className="w-full overflow-hidden" style={{ height: height * scale }}>
      <ResumeSheet
        ref={page}
        resume={resume}
        onEdit={onEdit}
        pageBreak={height > PAGE_H + 1}
        style={{ transform: `scale(${scale})`, transformOrigin: 'top left', boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 8px 30px rgba(0,0,0,0.06)', borderRadius: 2 }}
      />
      {createPortal(
        <div className="print-only">
          <ResumeSheet resume={resume} />
        </div>,
        document.body,
      )}
    </div>
  )
}
