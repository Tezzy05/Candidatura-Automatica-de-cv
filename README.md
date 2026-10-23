# CV sob medida (nome provisório)

Cole a vaga e receba o currículo adaptado a ela, montado só com o que está no seu perfil, e a sua **aderência em %**.

É a versão automática do método "um currículo para cada vaga":

| Regra | O que o sistema faz |
|---|---|
| 1. Formato | Gera 1 coluna, 1 página, PDF com texto selecionável. Sem foto, tabela ou barrinhas de nível. |
| 2. Topo | Nome, cidade, telefone, e-mail e LinkedIn. Nunca CPF, idade ou endereço completo. |
| 3. Título | Usa o título exato da vaga logo abaixo do nome. |
| 4. Resumo | Três linhas: quem você é, o que domina (nos termos da vaga) e o que entrega. |
| 5. Palavras-chave | Lê a vaga, separa requisitos de diferenciais, ignora benefícios e escreve as competências como a vaga escreve ("PowerBI" no seu perfil vira "Power BI" se a vaga escreve assim). |
| 6. Experiência | Põe primeiro as conquistas mais ligadas à vaga e avisa quando falta número ("verbo + ação + número"). |
| 7. Sem experiência | Puxa projetos, voluntariado e empresa júnior. |
| Teste final | O PDF sai com o nome `Seu-Nome-Cargo-da-Vaga.pdf`. |

**Ele não inventa nada.** O que a vaga pede e você não tem vira dica, não linha no currículo. Se a vaga pede "Inglês avançado" e seu perfil diz "intermediário", o currículo mantém "intermediário" e a nota cai.

## Como usar

1. **Meu perfil**: preencha uma vez com tudo o que você já fez (ou "Importar CV antigo" com IA, ou "Carregar exemplo" para testar).
2. **Nova vaga**: cole título e descrição completa.
3. **Analisar e gerar**: aparece a aderência, as palavras-chave encontradas e faltantes, as dicas e o currículo.
4. **Baixar PDF**: no diálogo de impressão, escolha "Salvar como PDF".

Tudo fica salvo no seu navegador (perfil, histórico e chave da API). Use **Backup** para levar para outro computador.

## Como a aderência é calculada

| Parte | Peso | Como |
|---|---|---|
| Requisitos obrigatórios | 60% | Quantos o perfil comprova. Comprovar numa experiência ou projeto vale 100%; só listar em competências vale 80%; nível abaixo do pedido vale metade. |
| Diferenciais | 15% | Mesma conta, para o que a vaga chama de diferencial/desejável. |
| Cargo e área | 15% | O título da vaga comparado ao seu cargo, experiências e formação (ignora júnior/pleno/sênior). |
| Contexto geral | 10% | Quanto do vocabulário da vaga aparece no seu perfil. |

Se a vaga não tiver diferenciais, os pesos são redistribuídos. 80%+ é alta, 60%+ boa, 40%+ média.

## Com ou sem IA

- **Motor local** (padrão, grátis, offline): regras + dicionário de ~130 competências com sinônimos (`src/lib/skills.ts`). As competências do seu perfil entram no dicionário automaticamente.
- **Gerar com IA** (opcional): em "Configurar IA", cole uma chave da [API da Anthropic](https://console.anthropic.com/settings/keys). O Claude reescreve resumo e bullets com mais naturalidade, dá uma segunda nota com justificativa e importa CV antigo em texto. A chave vai do seu navegador direto para a Anthropic. Depois, o sistema confere o resultado e avisa se apareceu competência ou número que não está no seu perfil.

## Rodar no computador

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
src/lib/tailor.ts    monta o currículo e as dicas (motor local)
src/lib/ai.ts        integração com o Claude (carregada só quando usada)
src/components/      telas: vaga, perfil, histórico, folha A4
```

Stack: React + Vite + TypeScript, Tailwind v4 + shadcn/ui, Motion. Direção visual: estilo Vercel do Refero Styles (monocromático, bordas finas, rótulos em mono) com o azul do vídeo como acento.
