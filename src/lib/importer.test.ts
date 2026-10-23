import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { importProfileText } from './importer'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

describe('importProfileText: CV em Word', () => {
  const { profile: p } = importProfileText(fixture('cv-word.txt'))

  it('lê o topo e descarta dados sensíveis', () => {
    expect(p.name).toBe('MARIA SILVA')
    expect(p.headline).toBe('Analista Financeira')
    expect(p.location).toBe('São Paulo, SP')
    expect(p.phone).toBe('(11) 98765-4321')
    expect(p.email).toBe('maria.silva@gmail.com')
    expect(p.linkedin).toBe('linkedin.com/in/mariasilva')
    expect(JSON.stringify(p)).not.toMatch(/123\.456|28 anos|Solteira/)
  })

  it('separa experiências com cargo, empresa, datas e conquistas', () => {
    expect(p.experiences).toHaveLength(2)
    expect(p.experiences[0]).toMatchObject({ role: 'Analista Financeira Pleno', company: 'Banco Alfa', start: 'mar/2022', end: '' })
    expect(p.experiences[0].bullets).toEqual([
      'Reduzi o fechamento mensal de 8 para 5 dias automatizando conciliações em Excel e Power Query.',
      'Criei 6 dashboards em Power BI para a diretoria acompanhar o fluxo de caixa.',
    ])
    expect(p.experiences[1]).toMatchObject({ role: 'Assistente Financeiro', company: 'Comércio Beta', start: 'jan/2019', end: 'fev/2022' })
  })

  it('lê formação, competências, idiomas e certificações', () => {
    expect(p.education[0]).toMatchObject({ course: 'Bacharelado em Ciências Contábeis', institution: 'Universidade Presbiteriana Mackenzie', period: '2015 – 2019' })
    expect(p.skills).toContain('SAP FI')
    expect(p.skills).toHaveLength(6)
    expect(p.languages).toEqual(['Inglês avançado', 'Espanhol intermediário'])
    expect(p.certifications).toEqual(['CPA-20 (Anbima)', 'Power BI Essentials – Udemy'])
    expect(p.about).toMatch(/^Analista financeira com foco/)
  })
})

describe('importProfileText: PDF do LinkedIn', () => {
  const { profile: p } = importProfileText(fixture('cv-linkedin.txt'))

  it('lê contato, competências e idiomas da coluna lateral', () => {
    expect(p.email).toBe('joao.souza@outlook.com')
    expect(p.linkedin).toBe('linkedin.com/in/joaosouza-dev')
    expect(p.skills).toEqual(['React', 'TypeScript', 'Node.js'])
    expect(p.languages).toEqual(['Inglês (Professional Working)'])
  })

  it('acha nome, cargo e cidade depois da coluna lateral', () => {
    expect(p.name).toBe('João Souza')
    expect(p.headline).toBe('Desenvolvedor Front-end')
    expect(p.location).toBe('Campinas, São Paulo')
  })

  it('lê experiências no formato empresa → cargo → período', () => {
    expect(p.experiences).toHaveLength(2)
    expect(p.experiences[0]).toMatchObject({ role: 'Desenvolvedor Front-end', company: 'Empresa Gama', start: 'abril 2023', end: '' })
    expect(p.experiences[0].bullets[0]).toMatch(/^Migrei 40 telas/)
    expect(p.experiences[1]).toMatchObject({ role: 'Estagiário de Desenvolvimento', company: 'Empresa Gama', start: 'agosto 2021', end: 'março 2023' })
  })

  it('lê a formação', () => {
    expect(p.education[0].institution).toBe('Universidade Estadual de Campinas')
    expect(p.education[0].course).toMatch(/Ciência da Computação/)
    expect(p.education[0].period).toBe('2019 – 2023')
  })
})

describe('importProfileText: CV sem títulos de seção', () => {
  const { profile: p, found } = importProfileText(fixture('cv-sem-titulos.txt'))

  it('aproveita contato e competências conhecidas do texto', () => {
    expect(p.name).toBe('Ana Lima')
    expect(p.location).toBe('Rio de Janeiro, RJ')
    expect(p.skills).toEqual(expect.arrayContaining(['Excel', 'Canva', 'Redes sociais']))
    expect(found).toContain('nome')
  })
})
