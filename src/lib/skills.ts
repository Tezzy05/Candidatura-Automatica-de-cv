import { fold } from './text'

/**
 * Dicionário de competências: "Nome canônico|sinônimo|sinônimo".
 * Serve para reconhecer, na vaga e no perfil, o mesmo conhecimento escrito de jeitos diferentes.
 * As competências do seu próprio perfil entram automaticamente, então não precisa listar tudo aqui.
 * Prefixos: "~" competência comportamental, "@" idioma ou documento (ficam fora do "Domínio de..." do resumo),
 * "^" substantivo comum (vai em minúscula no meio da frase: "domínio de SQL e conciliação bancária").
 */
const RAW = `
SQL|sql server|mysql|postgresql|postgres|t-sql|pl/sql|oracle sql|consultas sql
Power BI|powerbi|power-bi|dax|power query
Excel|excel avançado|excel intermediário|excel básico|microsoft excel|planilhas|planilha|vba|macros
Python|pandas|numpy|python3
Linguagem R|rstudio|tidyverse
Tableau
Looker|looker studio|google data studio|data studio
Qlik|qlik sense|qlikview
Google Sheets|planilhas google
^Estatística|estatistica descritiva|inferência estatística|testes de hipótese
Machine Learning|aprendizado de máquina|scikit-learn|sklearn|modelos preditivos
Deep Learning|tensorflow|pytorch|keras|redes neurais
IA generativa|inteligência artificial generativa|llm|llms|genai|chatgpt|prompt engineering|engenharia de prompt
^Inteligência Artificial|inteligencia artificial|ia
ETL|elt|pipelines de dados|pipeline de dados|integração de dados
^Engenharia de dados|data engineering
Spark|pyspark|apache spark
Airflow|apache airflow
Databricks
Snowflake
BigQuery|google bigquery
Data Warehouse|dw|data lake|lakehouse|modelagem dimensional
^Modelagem de dados|modelagem de banco de dados|modelo relacional
^Dashboards|dashboard|painéis|painel|relatórios gerenciais|indicadores|kpis|kpi
^Análise de dados|analise de dados|data analysis|análise de dados
Business Intelligence|bi
Big Data|hadoop
NoSQL|mongodb|cassandra|dynamodb|redis
JavaScript|js|ecmascript
TypeScript|ts
React|react.js|reactjs
React Native
Next.js|nextjs
Vue.js|vue|vuejs
Angular|angularjs
Node.js|node|nodejs|express|nestjs
HTML|html5
CSS|css3|sass|scss|tailwind|tailwindcss
Java|spring|spring boot
Kotlin
Swift|ios
Android
C#|.net|dotnet|asp.net
PHP|laravel
Ruby|rails|ruby on rails
Go|golang
Rust
C++
APIs REST|api rest|apis|api|restful|rest
GraphQL
^Microsserviços|microservices|microsserviço
Git|github|gitlab|bitbucket|versionamento
Docker|containers|contêineres
Kubernetes|k8s
CI/CD|integração contínua|entrega contínua|github actions|jenkins
AWS|amazon web services|ec2|s3|lambda
Azure|microsoft azure
Google Cloud|gcp|google cloud platform
Cloud|computação em nuvem|nuvem
Linux|bash|shell script
^Testes automatizados|testes unitários|tdd|jest|cypress|selenium|qa
^Segurança da informação|cibersegurança|ciberseguranca|lgpd|iso 27001
^Redes de computadores|redes|tcp/ip
^Suporte técnico|help desk|service desk|suporte ao usuário
ITIL
Scrum|sprints|sprint
Kanban
^Metodologias ágeis|metodologias ageis|agile|ágil|agilidade
^Gestão de projetos|gerenciamento de projetos|project management|pmbok|pmp
Jira|confluence
Trello|asana|notion|monday
Figma|sketch|adobe xd
UX|ux design|experiência do usuário|user experience|pesquisa com usuários
UI|ui design
Product Management|gestão de produto|product owner|product manager|roadmap|discovery
Photoshop|adobe photoshop
Illustrator|adobe illustrator
Canva
Pacote Office|microsoft office|office 365|word|powerpoint|outlook
Google Workspace|g suite
SAP|sap fi|sap mm|sap sd|sap hana
ERP|totvs|protheus|oracle erp
CRM|salesforce|hubspot|pipedrive|rd station crm
^Marketing digital|marketing online
SEO|otimização para buscadores
^Mídia paga|tráfego pago|google ads|meta ads|facebook ads
^Redes sociais|social media|instagram|tiktok|linkedin ads
Copywriting|redação publicitária
Google Analytics|ga4|analytics
Inbound marketing|rd station|automação de marketing
E-commerce|ecommerce|loja virtual|marketplace|vtex|shopify
^Vendas|prospecção|negociação com clientes|inside sales|vendas consultivas
^Atendimento ao cliente|atendimento|customer success|sucesso do cliente|sac|customer service
~Negociação|negociacao
^Contabilidade|contábil|contabil|ciências contábeis
^Finanças|financeiro|análise financeira|planejamento financeiro|fp&a
^Contas a pagar|contas a receber|tesouraria|fluxo de caixa|conciliação bancária
^Controladoria|orçamento|budget
^Fiscal|tributário|impostos|sped|obrigações acessórias
^Auditoria|controles internos|compliance
^Departamento pessoal|dp|folha de pagamento|esocial
^Recrutamento e seleção|recrutamento|seleção|r&s|talent acquisition|recrutador
^Recursos Humanos|rh|gestão de pessoas|people
^Logística|logistica|supply chain|cadeia de suprimentos|estoque|armazenagem
^Compras|suprimentos|procurement
^Rotinas administrativas|administrativo|rotina administrativa|gestão de documentos
^Jurídico|gestão de contratos|advocacia
Lean|lean manufacturing|six sigma|melhoria contínua|kaizen|5s
^Mapeamento de processos|bpmn|gestão de processos|melhoria de processos
^Automação|automação de processos|rpa|power automate|automações|automatizar
Low-code|no-code|power apps|appsheet|bubble
~Comunicação|comunicacao|boa comunicação|comunicação clara
~Trabalho em equipe|colaboração|trabalhar em equipe
~Liderança|lideranca|gestão de equipes|gestão de pessoas e equipes|liderar
~Proatividade|proativo|proativa
~Organização|organizado|organizada
~Resolução de problemas|solução de problemas|problem solving
~Pensamento analítico|raciocínio lógico|pensamento crítico|perfil analítico
@Inglês|ingles|english|inglês intermediário|inglês avançado|inglês fluente|inglês técnico
@Espanhol|espanhol intermediário|espanhol avançado|spanish
@CNH|carteira de habilitação
`

export interface SkillEntry {
  key: string
  label: string
  kind: 'hard' | 'soft' | 'language'
  /** Nome comum, não de produto: no meio da frase vai em minúscula. */
  common?: boolean
  /** Termos já normalizados (sem acento, minúsculos), do mais longo para o mais curto. */
  terms: string[]
}

export const SKILLS: SkillEntry[] = RAW.trim()
  .split('\n')
  .map((line): SkillEntry => {
    const common = line.startsWith('^')
    const kind = line.startsWith('~') ? 'soft' : line.startsWith('@') ? 'language' : 'hard'
    const parts = line.replace(/^[~@^]/, '').split('|').map((p) => p.trim()).filter(Boolean)
    const terms = [...new Set(parts.map(fold))].sort((a, b) => b.length - a.length)
    return { key: fold(parts[0]), label: parts[0], kind, common, terms }
  })

/** Dicionário estendido com as competências do perfil que não estão nele. */
export function buildDictionary(profileSkills: string[]): SkillEntry[] {
  const known = new Map<string, SkillEntry>()
  for (const s of SKILLS) for (const t of s.terms) known.set(t, s)
  const extra: SkillEntry[] = []
  for (const raw of profileSkills) {
    const t = fold(raw.trim())
    if (t.length < 2 || known.has(t)) continue
    const entry: SkillEntry = { key: t, label: raw.trim(), kind: 'hard', terms: [t] }
    known.set(t, entry)
    extra.push(entry)
  }
  return [...SKILLS, ...extra]
}

/** Acha a entrada do dicionário para um termo qualquer (ex.: "powerbi" → Power BI). */
export function entryFor(dict: SkillEntry[], term: string): SkillEntry | undefined {
  const t = fold(term.trim())
  return dict.find((e) => e.key === t || e.terms.includes(t))
}
