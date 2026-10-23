import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkInvented, tailorWithAI } from './ai'
import { sampleJob, sampleProfile } from './sample'
import { tailorLocal } from './tailor'

const aiResume = {
  title: 'Analista de Dados Júnior',
  summary: 'Analista de dados. Domínio de SQL, Power BI e Python.',
  skills: ['SQL', 'Power BI', 'Python', 'Airflow'],
  experiences: [
    {
      role: 'Assistente Administrativo',
      company: 'Empresa X',
      period: '2024 – atual',
      bullets: ['Automatizei 12 relatórios e economizei 5 h por semana.', 'Reduzi em 40% o tempo de fechamento.'],
    },
  ],
  projects: [],
  certifications: [],
  adherence: 82,
  assessment: 'Perfil cobre os requisitos principais.',
  tips: ['Estude Airflow.'],
}

afterEach(() => vi.unstubAllGlobals())

describe('checkInvented', () => {
  it('aponta competência e número que não estão no perfil', () => {
    const w = checkInvented(sampleProfile, sampleJob, aiResume)
    expect(w.some((x) => x.includes('Airflow'))).toBe(true)
    expect(w.some((x) => x.includes('40'))).toBe(true)
    expect(w.some((x) => x.includes('"Power BI"'))).toBe(false)
    expect(w.some((x) => x.includes('12'))).toBe(false)
  })
})

describe('tailorWithAI', () => {
  it('pede saída estruturada com fallback e devolve o currículo com avisos', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body))
      expect(body.model).toBe('claude-opus-5-5')
      expect(body.fallbacks).toBe('default')
      expect(body.output_config.format.type).toBe('json_schema')
      expect(body.thinking).toBeUndefined()
      expect(new Headers(init.headers).get('anthropic-beta')).toContain('server-side-fallback-2026-07-01')
      return new Response(
        JSON.stringify({
          id: 'msg_1',
          type: 'message',
          role: 'assistant',
          model: 'claude-opus-5-5',
          content: [{ type: 'text', text: JSON.stringify(aiResume) }],
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 10 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const local = tailorLocal(sampleProfile, sampleJob)
    const t = await tailorWithAI({ apiKey: 'sk-test', model: 'claude-opus-5-5' }, sampleProfile, sampleJob, local)

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(t.engine).toBe('ia')
    expect(t.resume.name).toBe('Seu Nome')
    expect(t.resume.skills).toContain('Power BI')
    expect(t.aiNote).toMatch(/^82\/100/)
    expect(t.warnings?.join(' ')).toContain('Airflow')
    expect(t.match.score).toBe(local.match.score)
  })
})
