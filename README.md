# CV sob medida (nome provisório)

Cole a vaga e receba o currículo adaptado a ela, montado só com o que está no seu perfil, e a sua **aderência em %**.

É a versão automática do método "um currículo para cada vaga":

| Regra | O que o sistema faz |
|---|---|
| 1. Formato | Gera 1 coluna, 1 página, PDF com texto selecionável. Sem foto, tabela ou barrinhas de nível. |
| 2. Topo | Nome, cidade, telefone, e-mail e LinkedIn. Nunca CPF, idade ou endereço completo. |
| 3. Título | Usa o título exato da vaga logo abaixo do nome. |
| 4. Resumo | Três linhas: quem você é, o que domina (nos termos da vaga) e o que entrega. O molde muda conforme o momento: estudante, recém-formado, transição de carreira ou experiente. |
| 5. Palavras-chave | Lê a vaga, separa requisitos de diferenciais, ignora benefícios e escreve as competências como a vaga escreve ("PowerBI" no seu perfil vira "Power BI" se a vaga escreve assim). |
| 6. Experiência | Põe primeiro as conquistas mais ligadas à vaga e avisa quando falta número ("verbo + ação + número"). |
| 7. Sem experiência | Puxa projetos, voluntariado e empresa júnior. |
| Teste final | O PDF sai com o nome `Seu-Nome-Cargo-da-Vaga.pdf`. |

**Ele não inventa nada.** O que a vaga pede e você não tem vira dica, não linha no currículo. Se a vaga pede "Inglês avançado" e seu perfil diz "intermediário", o currículo mantém "intermediário" e a nota cai (nível acima do pedido conta como atendido).

**Roda sem IA**, 100% no navegador: nenhum dado sai do seu computador.

## Como usar

1. **Meu perfil**: preencha uma vez com tudo o que você já fez. Atalhos: **Importar CV antigo** (cole o texto do seu currículo ou do PDF do LinkedIn; o sistema separa contato, experiências, formação, competências e descarta CPF, idade e estado civil) ou **Carregar exemplo** para testar. Escolha também a concordância das frases (formado, formada ou "com formação em").
2. **Nova vaga**: cole título e descrição completa.
3. **Analisar e gerar**: aparece a aderência, as palavras-chave encontradas e faltantes, as dicas e o currículo.
4. **Ajuste na própria folha**: clique em qualquer texto do currículo para corrigir. Enter confirma, Esc cancela, apagar um tópico inteiro remove o tópico. "Desfazer edições" volta ao gerado. Se passar de 1 página, aparece uma linha vermelha onde a página termina.
5. **Baixar PDF**: no diálogo de impressão, escolha "Salvar como PDF".

Tudo fica salvo no seu navegador (perfil e histórico). Use **Backup** para levar para outro computador.

## Como a aderência é calculada

| Parte | Peso | Como |
|---|---|---|
| Requisitos obrigatórios | 60% | Quantos o perfil comprova. Comprovar numa experiência ou projeto vale 100%; só listar em competências vale 80%; nível abaixo do pedido vale metade. |
| Diferenciais | 15% | Mesma conta, para o que a vaga chama de diferencial/desejável. |
| Cargo e área | 15% | O título da vaga comparado ao seu cargo, experiências e formação (ignora júnior/pleno/sênior). |
| Contexto geral | 10% | Quanto do vocabulário da vaga aparece no seu perfil. |

Se a vaga não tiver diferenciais, os pesos são redistribuídos. 80%+ é alta, 60%+ boa, 40%+ média.

## Como o texto fica natural sem IA

- **Resumo por momento de carreira**: "Estudante de Análise de Dados (Fatec). Experiência prática com SQL e Power BI em projetos e voluntariado. Busco minha primeira oportunidade como analista de dados." é diferente de "Assistente administrativo com 3 anos de experiência, em transição para cientista de dados. Domínio de Python e SQL, que já uso no trabalho atual."
- **Sua voz**: a terceira frase do resumo é a sua própria frase do "Sobre você" (a primeira que não repete a abertura) ou a sua melhor conquista com número.
- **Gramática**: concordância de gênero, nomes comuns em minúscula no meio da frase ("domínio de SQL e conciliação bancária"), ferramentas antes de áreas, comportamentais no fim da lista.
- **Grafia da vaga**: "PowerBI" vira "Power BI" se a vaga escreve assim; um pedaço solto como "contábil" vira "Contabilidade".
- **Última palavra é sua**: edição direta na folha antes de baixar.

## IA (desligada)

A integração com o Claude (`src/lib/ai.ts`) está pronta mas desligada: não aparece na tela e o SDK nem é baixado. Para religar, troque `AI_ENABLED` para `true` em `src/lib/ai-config.ts`; aparecem o botão "Gerar com IA" e a tela para colar uma chave da API da Anthropic.

## Rodar no computador

### Windows, sem saber programar

1. No GitHub, clique em **Code → Download ZIP**.
2. Clique no ZIP com o botão direito e escolha **Extrair tudo**.
3. Dentro da pasta extraída, dê dois cliques em **`iniciar.bat`**.

Na primeira vez ele confere se o Node.js está instalado (se não estiver, oferece instalar pelo winget ou abre a página de download) e baixa as dependências, o que leva 1 ou 2 minutos. Depois o navegador abre sozinho no app. Para encerrar, feche a janela preta.

| Comando | O que faz |
|---|---|
| `iniciar.bat` | abre neste computador |
| `iniciar.bat lan` | também abre no celular, na mesma rede Wi-Fi (o Windows pode pedir para liberar no firewall) |

Seu perfil e o histórico ficam salvos no navegador, não na pasta. Ao baixar uma versão nova do projeto, eles continuam lá, desde que você use o mesmo navegador e o mesmo endereço (`http://localhost:5173`).

### Para quem desenvolve

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # testes do motor
npm run build    # gera dist/
```

## Publicar no GitHub Pages

O workflow `.github/workflows/deploy.yml` testa e publica a cada push na `main`. Uma vez só: em **Settings → Pages**, escolha **Source: GitHub Actions**.

## Estrutura

```
src/lib/skills.ts    dicionário de competências e sinônimos
src/lib/match.ts     lê a vaga (requisitos × diferenciais) e calcula a aderência
src/lib/tailor.ts    monta o currículo e as dicas
src/lib/summary.ts   resumo de 3 linhas por momento de carreira
src/lib/importer.ts  lê CV colado em texto (Word, PDF, LinkedIn) sem IA
src/lib/ai.ts        integração com o Claude (desligada; ver AI_ENABLED)
src/components/      telas: vaga, perfil, histórico, folha A4
```

Stack: React + Vite + TypeScript, Tailwind v4 + shadcn/ui, Motion. Direção visual: estilo Vercel do Refero Styles (monocromático, bordas finas, rótulos em mono) com o azul do vídeo como acento.
