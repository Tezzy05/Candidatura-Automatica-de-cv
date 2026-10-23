import { describe, expect, it } from 'vitest'
import { extractKeywords, scoreMatch } from './match'
import { sampleJob, sampleProfile } from './sample'
import { buildDictionary } from './skills'
import { fold } from './text'
import { tailorLocal } from './tailor'

describe('fold', () => {
  it('remove acentos sem mudar o tamanho', () => {
    expect(fold('Análise Ção')).toBe('analise cao')
    expect(fold('Análise Ção').length).toBe('Análise Ção'.length)
  })
})

describe('extractKeywords', () => {
  const dict = buildDictionary([])

  it('separa obrigatórios de diferenciais e ignora benefícios', () => {
    const kws = extractKeywords(sampleJob, dict)
    const byLabel = Object.fromEntries(kws.map((k) => [k.label, k.required]))
    expect(byLabel['SQL']).toBe(true)
    expect(byLabel['Power BI']).toBe(true)
    expect(byLabel['Excel avançado']).toBe(true)
    expect(byLabel['Airflow']).toBe(false)
    expect(byLabel['Inglês intermediário']).toBe(false)
    expect(kws.find((k) => /gympass|transporte/i.test(k.label))).toBeUndefined()
  })

  it('prefere o termo mais longo ("Power BI" e não "BI")', () => {
    const kws = extractKeywords({ ...sampleJob, description: 'Requisitos: Power BI' }, dict)
    expect(kws.map((k) => k.label)).toEqual(['Power BI'])
  })

  it('marca como diferencial a linha que diz "é um diferencial"', () => {
    const kws = extractKeywords({ ...sampleJob, description: 'Requisitos:\n- SQL\n- Inglês intermediário é um diferencial' }, dict)
    expect(kws.find((k) => k.key === 'ingles')?.required).toBe(false)
  })

  it('não trata o título como cabeçalho de seção', () => {
    const kws = extractKeywords({ ...sampleJob, title: 'Analista de Benefícios', description: 'SQL e Excel' }, dict)
    expect(kws.map((k) => k.label)).toEqual(['SQL', 'Excel'])
  })

  it('reconhece "Será um diferencial" sem dois-pontos como seção', () => {
    const kws = extractKeywords({ ...sampleJob, description: 'O que esperamos de você\nSQL\n\nSerá um diferencial\ndbt, Airflow' }, dict)
    expect(kws.find((k) => k.label === 'SQL')?.required).toBe(true)
    expect(kws.find((k) => k.label === 'Airflow')?.required).toBe(false)
  })

  it('pega ferramentas fora do dicionário escritas como sigla ou nome próprio', () => {
    const kws = extractKeywords({ ...sampleJob, description: 'Requisitos:\n- AutoCAD\n- SolidWorks\nRegime CLT' }, dict)
    expect(kws.map((k) => k.label)).toEqual(['AutoCAD', 'SolidWorks'])
  })
})

describe('scoreMatch', () => {
  it('dá nota alta para o perfil do vídeo na vaga do vídeo', () => {
    const r = scoreMatch(sampleProfile, sampleJob)
    expect(r.score).toBeGreaterThanOrEqual(70)
    expect(r.missing.map((k) => k.label)).toContain('Airflow')
    expect(r.matched.find((k) => k.label === 'Power BI')?.evidence).toContain('experiência')
  })

  it('dá nota baixa para uma vaga de outra área', () => {
    const r = scoreMatch(sampleProfile, {
      title: 'Desenvolvedor Java Sênior',
      company: '',
      location: '',
      description: 'Requisitos: Java, Spring Boot, Kubernetes, AWS, microsserviços, Kafka',
    })
    expect(r.score).toBeLessThan(30)
    expect(r.level).toBe('baixa')
  })
})

describe('tailorLocal', () => {
  const t = tailorLocal(sampleProfile, sampleJob)

  it('usa o título exato da vaga', () => {
    expect(t.resume.title).toBe('Analista de Dados Júnior')
  })

  it('escreve as competências como a vaga escreve', () => {
    expect(t.resume.skills.slice(0, 4)).toEqual(['SQL', 'Power BI', 'Python', 'Excel avançado'])
    expect(t.resume.experiences[0].bullets.join(' ')).toContain('Power BI')
    expect(t.resume.experiences[0].bullets.join(' ')).not.toContain('PowerBI')
  })

  it('não inventa competência que o perfil não tem', () => {
    expect(t.resume.skills).not.toContain('Airflow')
    expect(t.tips.join(' ')).toContain('Airflow')
  })

  it('põe primeiro as conquistas mais ligadas à vaga', () => {
    expect(t.resume.experiences[0].bullets[0]).toMatch(/Automatizei|painel/)
    expect(t.resume.experiences[0].bullets.at(-1)).toMatch(/Responsável|arquivo/)
  })

  it('não sobe o nível de idioma além do que o perfil declara', () => {
    const t2 = tailorLocal(sampleProfile, { ...sampleJob, description: 'Requisitos:\n- SQL\n- Inglês avançado' })
    const hit = t2.match.matched.find((k) => k.key === 'ingles')
    expect(hit?.levelGap).toBe(true)
    expect(t2.resume.skills.join(' ')).not.toMatch(/Inglês/)
    expect(t2.resume.languages).toContain('Inglês intermediário')
    expect(t2.tips.join(' ')).toContain('Inglês intermediário')
  })

  it('nível acima do pedido atende a vaga', () => {
    const fluent = { ...sampleProfile, languages: ['Inglês avançado'] }
    const t3 = tailorLocal(fluent, { ...sampleJob, description: 'Requisitos:\n- SQL\n- Inglês intermediário' })
    expect(t3.match.matched.find((k) => k.key === 'ingles')?.levelGap).toBeUndefined()
    expect(t3.tips.join(' ')).not.toMatch(/mantém o seu nível/)
  })

  it('deixa competências comportamentais fora do "Domínio de..."', () => {
    expect(t.resume.summary).not.toMatch(/Domínio de[^.]*comunicação/i)
  })

  it('não leva CPF nem idade para o topo', () => {
    expect(t.resume.contact.join(' ')).not.toMatch(/cpf|idade|anos/i)
  })
})
