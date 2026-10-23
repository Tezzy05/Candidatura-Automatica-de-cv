import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { importProfileText } from './importer'
import { sampleJob, sampleProfile } from './sample'
import { courseName } from './summary'
import { tailorLocal } from './tailor'
import type { Profile } from './types'

const year = new Date().getFullYear()

describe('composeSummary', () => {
  it('perfil experiente na mesma área: igual ao exemplo do vídeo', () => {
    const t = tailorLocal({ ...sampleProfile, experiences: [{ ...sampleProfile.experiences[0], start: String(year - 2) }] }, sampleJob)
    expect(t.resume.summary).toBe(
      'Analista de dados com 2 anos de experiência, formado em Análise de Dados. Domínio de SQL, Power BI, Python e Excel avançado. Entrego painéis e automações que cortam retrabalho.',
    )
  })

  it('respeita a concordância escolhida', () => {
    const exp = [{ ...sampleProfile.experiences[0], start: String(year - 2) }]
    expect(tailorLocal({ ...sampleProfile, experiences: exp, gender: 'feminino' }, sampleJob).resume.summary).toContain('formada em')
    expect(tailorLocal({ ...sampleProfile, experiences: exp, gender: 'neutro' }, sampleJob).resume.summary).toContain('com formação em')
  })

  it('estudante sem experiência: fala de prática em projetos e da primeira oportunidade', () => {
    const student: Profile = {
      ...sampleProfile,
      about: '',
      experiences: [],
      education: [{ id: 'f', course: 'Tecnólogo em Análise de Dados', institution: 'Fatec', period: `${year - 1} – ${year + 1}` }],
    }
    const s = tailorLocal(student, sampleJob).resume.summary
    expect(s).toMatch(/^Estudante de Análise de Dados \(Fatec\)\./)
    expect(s).toContain('Experiência prática com SQL, Power BI, Python e Excel avançado em projetos, voluntariado e empresa júnior.')
    expect(s).toContain('Busco minha primeira oportunidade como analista de dados.')
  })

  it('transição de carreira: parte do cargo atual e usa a melhor conquista com número', () => {
    const changer: Profile = {
      ...sampleProfile,
      headline: 'Assistente administrativo',
      about: '',
      education: [],
      experiences: [{ ...sampleProfile.experiences[0], start: String(year - 3) }],
    }
    const s = tailorLocal(changer, { ...sampleJob, title: 'Cientista de Dados Pleno' }).resume.summary
    expect(s).toMatch(/^Assistente administrativo com 3 anos de experiência, em transição para cientista de dados\./)
    expect(s).toContain('que já uso no trabalho atual')
    expect(s).toContain('Automatizei 12 relatórios')
  })
})

describe('naturalidade com um CV importado', () => {
  const { profile } = importProfileText(readFileSync(new URL('./fixtures/cv-word.txt', import.meta.url), 'utf8'))
  const job = {
    title: 'Analista de Controladoria Pleno',
    company: '',
    location: '',
    description: 'Requisitos:\n- Excel avançado e Power BI\n- Experiência com fechamento contábil e conciliação bancária\n- SAP FI',
  }
  const t = tailorLocal({ ...profile, gender: 'feminino' }, job)

  it('não repete a abertura na terceira frase', () => {
    expect(t.resume.summary.match(/Analista financeira/gi)).toHaveLength(1)
    expect(t.resume.summary).toContain('Reduzo prazos de fechamento com automação.')
  })

  it('põe ferramentas antes de áreas e nome comum em minúscula', () => {
    expect(t.resume.summary).toContain('Domínio de Excel avançado, Power BI, SAP FI e conciliação bancária.')
    expect(t.resume.summary).toContain('conciliação bancária')
  })

  it('não usa pedaço solto da vaga como competência', () => {
    expect(t.resume.skills).not.toContain('Contábil')
    expect(t.resume.skills).toContain('Contabilidade')
  })
})

describe('courseName', () => {
  it('tira o tipo do curso', () => {
    expect(courseName('Tecnólogo em Análise de Dados')).toBe('Análise de Dados')
    expect(courseName('Bacharelado em Administração')).toBe('Administração')
    expect(courseName('Engenharia de Produção')).toBe('Engenharia de Produção')
  })
})
