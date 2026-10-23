import type { Job, Profile } from './types'

export const emptyProfile = (): Profile => ({
  name: '',
  location: '',
  phone: '',
  email: '',
  linkedin: '',
  links: [],
  headline: '',
  about: '',
  gender: 'neutro',
  skills: [],
  experiences: [],
  projects: [],
  education: [],
  languages: [],
  certifications: [],
})

/** Perfil fictício, igual ao do vídeo, para testar o sistema antes de preencher o seu. */
export const sampleProfile: Profile = {
  name: 'Seu Nome',
  location: 'São Paulo, SP',
  phone: '(11) 90000-0000',
  email: 'seunome@email.com',
  linkedin: 'linkedin.com/in/seunome',
  links: [],
  headline: 'Analista de dados',
  gender: 'masculino',
  about: 'Entrego painéis e automações que cortam retrabalho. Gosto de transformar planilhas soltas em indicadores que a gerência usa para decidir.',
  skills: ['SQL', 'PowerBI', 'Python', 'Excel avançado', 'Comunicação', 'Trabalho em equipe'],
  experiences: [
    {
      id: 'e1',
      role: 'Assistente Administrativo',
      company: 'Empresa X',
      start: '2024',
      end: '',
      bullets: [
        'Automatizei 12 relatórios em Excel e Python e economizei 5 h por semana da equipe.',
        'Criei o painel de vendas em PowerBI usado pela gerência nas reuniões semanais.',
        'Organizei o arquivo de contratos da área.',
        'Responsável por atender fornecedores por telefone.',
      ],
    },
  ],
  projects: [
    { id: 'p1', kind: 'Projeto', name: 'Painel de vendas', description: 'Painel em PowerBI com consultas SQL sobre 3 anos de vendas de um e-commerce (dados públicos).' },
    { id: 'p2', kind: 'Voluntariado', name: 'ONG do bairro', description: 'Montei as planilhas de controle de doações da ONG, usadas por 8 voluntários.' },
    { id: 'p3', kind: 'Empresa júnior', name: 'Diretor de projetos', description: 'Coordenei 4 projetos de consultoria para pequenos negócios.' },
  ],
  education: [{ id: 'f1', course: 'Tecnólogo em Análise de Dados', institution: 'Faculdade Y', period: '2023 – 2025' }],
  languages: ['Inglês intermediário', 'Espanhol básico'],
  certifications: [],
}

export const sampleJob: Job = {
  title: 'Analista de Dados Júnior',
  company: 'Empresa X',
  location: 'São Paulo · Híbrido',
  description: `Sobre a vaga
Você vai apoiar as áreas de negócio com análises e painéis.

Requisitos:
- SQL
- Power BI
- Python
- Excel avançado
- Boa comunicação

Diferenciais:
- Inglês intermediário
- Conhecimento em Airflow

Benefícios:
- Vale-transporte, plano de saúde e Gympass`,
}
