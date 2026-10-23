import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Resume } from '@/lib/types'

/** A4 a 96 dpi. */
export const PAGE_W = 794
export const PAGE_H = 1123

const BLUE = '#3341e6'

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
 * Currículo em uma coluna, sem foto, sem tabela, sem barrinhas: o robô de triagem lê na ordem certa.
 */
export function ResumeSheet({ resume, ref, style }: { resume: Resume; ref?: React.Ref<HTMLDivElement>; style?: React.CSSProperties }) {
  const text = { fontSize: 11.5, lineHeight: 1.5, color: '#2b2b2b' }
  return (
    <div
      ref={ref}
      lang="pt-BR"
      style={{
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
          {resume.name || 'Seu nome'}
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 600, color: BLUE }}>{resume.title}</p>
        <p style={{ margin: '6px 0 0', fontSize: 11, color: '#666' }}>{resume.contact.join('  ·  ')}</p>
      </header>

      {resume.summary && (
        <Section title="Resumo">
          <p style={{ ...text, margin: 0 }}>{resume.summary}</p>
        </Section>
      )}

      {resume.skills.length > 0 && (
        <Section title="Competências">
          <p style={{ ...text, margin: 0, color: '#111', fontWeight: 500 }}>{resume.skills.join('  ·  ')}</p>
        </Section>
      )}

      {resume.experiences.length > 0 && (
        <Section title="Experiência">
          {resume.experiences.map((e, i) => (
            <div key={i} style={{ marginTop: i ? 10 : 0 }}>
              <p style={{ margin: 0, fontSize: 12.5 }}>
                <strong style={{ fontWeight: 700 }}>{e.role}</strong>
                <span style={{ color: '#666' }}> · {[e.company, e.period].filter(Boolean).join(' · ')}</span>
              </p>
              <ul style={{ margin: '3px 0 0', paddingLeft: 16, listStyle: 'disc' }}>
                {e.bullets.map((b, j) => (
                  <li key={j} style={text}>{b}</li>
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
                <strong style={{ color: '#111' }}>{p.kind === 'Projeto' ? 'Projeto' : p.kind}: </strong>
                {p.name}
                {p.description ? ` — ${p.description}` : ''}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {resume.education.length > 0 && (
        <Section title="Formação">
          {resume.education.map((e, i) => (
            <p key={i} style={{ ...text, margin: 0 }}>
              <strong style={{ color: '#111' }}>{e.course}</strong>
              <span style={{ color: '#666' }}> · {[e.institution, e.period].filter(Boolean).join(' · ')}</span>
            </p>
          ))}
        </Section>
      )}

      {resume.certifications.length > 0 && (
        <Section title="Certificações">
          <p style={{ ...text, margin: 0 }}>{resume.certifications.join('  ·  ')}</p>
        </Section>
      )}

      {resume.languages.length > 0 && (
        <Section title="Idiomas">
          <p style={{ ...text, margin: 0 }}>{resume.languages.join('  ·  ')}</p>
        </Section>
      )}
    </div>
  )
}

/** Na tela: reduzido para caber na coluna. Na impressão: uma cópia em tamanho real, fora do app (ver index.css). */
export function ResumePaper({ resume, onOverflow }: { resume: Resume; onOverflow?: (over: boolean) => void }) {
  const wrap = useRef<HTMLDivElement>(null)
  const page = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / PAGE_W)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (page.current) onOverflow?.(page.current.scrollHeight > PAGE_H + 1)
  })

  return (
    <div ref={wrap} className="w-full overflow-hidden" style={{ height: PAGE_H * scale }}>
      <ResumeSheet
        ref={page}
        resume={resume}
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
