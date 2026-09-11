# Gerador de Bingo Didático — Design

## Contexto

O usuário organiza uma dinâmica de "bingo didático" em sala de aula: em vez de
bolas numeradas, o sorteio é feito com perguntas de um tema específico (ex:
cálculo de porcentagem), e as cartelas dos alunos contêm as **respostas**
dessas perguntas. Quem completa a cartela primeiro, vence.

Um exemplo já validado e usado em sala existe em
`BINGO PORCENTAGEM.pdf`. Esse arquivo contém, nesta ordem:

- Folha explicativa (objetivos, habilidade BNCC, regras do jogo)
- 40 cartelas, cada uma com 9 respostas dispostas em grade 3×3, todas
  distintas entre si
- 25 fichas de sorteio **com gabarito** (cálculo + resultado — ficam com o
  professor)
- 25 fichas de sorteio **sem gabarito** (só o cálculo — vão para a caixa de
  sorteio, para não revelar a resposta)
- Marcadores de resposta para recortar
- Modelo de verso decorativo para cartelas e fichas (opcional)
- Molde de caixa dobrável para sortear as fichas (3 partes)
- Molde de caixa dobrável para guardar as cartelas (2 partes)
- Folha de rascunho para cálculos

O objetivo deste projeto é generalizar esse material: dado qualquer conjunto
de perguntas e respostas de qualquer disciplina, gerar automaticamente todas
essas peças, prontas para impressão, mantendo a estrutura e as medidas do
exemplo validado.

## Análise que fundamenta o design (card size)

Antes de desenhar a solução, foi feita uma simulação (Monte Carlo, 3000
partidas por cenário) para responder: quantas respostas por cartela tornam o
jogo competitivo sem ser cansativo, e a proporção perguntas/cartela é
adequada?

| Cenário | Sorteios até 1º vencedor (média) | Faixa p10–p90 | % do banco usado |
|---|---:|---:|---:|
| Exemplo do PDF (25 perguntas, 9 resp./cartela, 40 cartelas) | 17,9 | 16–20 | 71,5% |
| 50 perguntas, 9 resp./cartela, 40 cartelas | 33,5 | 29–38 | 67,0% |
| 50 perguntas, 16 resp./cartela, 40 cartelas | 40,7 | 38–44 | 81,5% |
| 50 perguntas, 25 resp./cartela, 40 cartelas | 44,8 | 43–47 | 89,7% |

Conclusões incorporadas ao design:

- Manter **grade 3×3 (9 respostas por cartela)** como padrão replica a
  proporção do exemplo validado e escala bem para bancos de perguntas
  maiores — o jogo termina, em média, usando ~2/3 do banco de perguntas,
  o que é competitivo (incerteza até perto do fim) sem ser exaustivo.
- O número de cartelas em jogo simultâneas (ex: 40 vs. 20 vs. 10) tem efeito
  moderado e decrescente sobre a duração — o mesmo banco de perguntas e
  conjunto de cartelas serve turmas de tamanhos variados sem recalibração.
- Todas as respostas do banco de perguntas devem ser **numericamente/
  textualmente únicas** — se duas perguntas diferentes tiverem a mesma
  resposta, a correspondência pergunta→cartela fica ambígua. Isso vira uma
  validação obrigatória no gerador.
- A ferramenta deve mostrar uma estimativa ao vivo ("≈33 perguntas sorteadas
  até o 1º vencedor, usando 66% do seu banco") conforme o usuário ajusta nº
  de perguntas / respostas por cartela / nº de cartelas, usando a mesma
  lógica de simulação (ou sua aproximação analítica: para uma cartela
  isolada, o sorteio esperado de conclusão é `k*(N+1)/(k+1)`, onde `k` =
  respostas por cartela e `N` = tamanho do banco; com múltiplas cartelas em
  jogo o valor real fica abaixo disso, conforme a tabela acima).

## Decisões de escopo

1. **Forma de entrega**: um Artifact (página web publicada, link único, sem
   servidor/backend). Roda em qualquer navegador/dispositivo, sem
   instalação. Alternativas descartadas: app local (perde acesso por link em
   qualquer dispositivo) e app com backend próprio (exigiria hospedagem sem
   necessidade real, já que nada aqui depende de processamento server-side).
2. **Geometria fixa, estilo customizável**: as dimensões, dobras, cortes e
   layout das cartelas, fichas e moldes de caixa permanecem **idênticos ao
   exemplo validado** — não serão redesenhados. O que é customizável por
   tema: cor (paleta), tipografia e imagens (upload próprio ou ícone de uma
   biblioteca embutida por categoria de disciplina, tingível na cor
   escolhida).
3. **Banco de perguntas reutilizável**: o usuário pode salvar bancos de
   perguntas nomeados (ex: "Porcentagem 6º ano") e reabri-los depois, sem
   redigitar tudo a cada novo bingo.

## Arquitetura

Artifact único (HTML/CSS/JS), sem backend. Capacidades declaradas:

- **`downloads`** — para o usuário salvar os PDFs gerados (cartelas, fichas,
  folha explicativa, moldes) no próprio dispositivo. Essa é a via oficial da
  plataforma para "página gera arquivo → usuário baixa"; não há como usar um
  link `<a download>` comum dentro de um Artifact.
- **`db`** — para persistir bancos de perguntas nomeados e presets de
  tema (cor/tipografia/imagem) entre sessões, compartilhados por quem abrir
  a página (o usuário é o único editor esperado, mas a ferramenta pode ser
  usada por outros professores se o link for compartilhado).
- **`assets`** — para upload de imagem/logo próprio (capa, verso, caixa),
  20 MiB de limite por arquivo, tipos aceitos: imagem/SVG.

Geração de PDF client-side via biblioteca jsPDF (carregada via CDN
permitido). Toda a lógica de sorteio, validação e composição do PDF roda no
navegador de quem estiver usando a página.

## Fluxo de dados

1. Usuário abre a página → opcionalmente carrega um banco de perguntas salvo
   (via `db`) ou começa um novo.
2. Preenche: nome do tema, lista de perguntas+respostas (colar em bloco ou
   linha a linha), nº de cartelas (padrão 40), respostas por cartela (padrão
   9), paleta de cores, tipografia, imagem (upload via `assets` ou escolha
   de ícone da biblioteca embutida).
3. A cada mudança nos parâmetros numéricos, a página recalcula e mostra a
   estimativa de duração do jogo (seção "Análise" acima).
4. Ao clicar em gerar: roda as validações (abaixo); se falharem, aponta o
   problema específico (quais perguntas colidem em resposta, ou proporção
   fora da faixa recomendada) e não prossegue até o usuário ajustar.
5. Validado, o motor de geração roda:
   - Sorteia `nº de cartelas` combinações únicas de `respostas por cartela`
     itens do banco (com verificação de que nenhuma cartela repete a
     combinação de outra).
   - Monta as fichas de sorteio com gabarito e sem gabarito (uma ficha por
     pergunta do banco).
   - Preenche a folha explicativa com o nome do tema (texto de objetivos e
     regras é um template editável).
   - Aplica cor/tipografia/imagem escolhidas a cartelas, fichas, marcadores,
     folha de rascunho, moldes de caixa e verso.
6. Usuário baixa o PDF combinado ("Baixar tudo") ou os PDFs individuais por
   peça (cartelas / fichas com gabarito / fichas sem gabarito / folha
   explicativa / moldes de caixa), via `downloads.save()`.
7. Opcionalmente salva o banco de perguntas e/ou o preset de tema para reuso
   futuro (via `db`).

## Validações

- **Respostas duplicadas**: bloqueia a geração e lista quais perguntas têm a
  mesma resposta.
- **Banco pequeno demais**: nº de perguntas deve ser maior que respostas por
  cartela (mínimo técnico); abaixo de ~1,5x esse valor, aviso de que o jogo
  vai ficar curto/pouco competitivo.
- **Banco desproporcionalmente grande**: se a proporção projetar uso de
  menos de ~40% do banco em média, aviso de que muitas perguntas nunca serão
  sorteadas (não é um erro, só um aviso informativo).
- **Poucas perguntas para gerar cartelas únicas**: verificação de que o
  número de combinações possíveis (`C(N, k)`) é suficientemente maior que o
  número de cartelas pedido, com aviso caso esteja próximo do limite (nesses
  parâmetros típicos, o espaço de combinações é sempre ordens de grandeza
  maior que o necessário, mas a checagem evita loops infinitos em casos
  extremos, ex.: pedir 40 cartelas com um banco de 9 perguntas e 9 respostas
  por cartela, onde só existe 1 combinação possível).

## Geração de conteúdo — detalhes por peça

- **Cartelas**: grade 3×3 (ou o tamanho escolhido), preenchida com uma
  amostra aleatória sem repetição de respostas do banco; a ordem dentro da
  grade também é embaralhada por cartela.
- **Fichas de sorteio**: duas versões por pergunta do banco — uma com o
  gabarito impresso (para conferência do professor) e uma sem (para ir na
  caixa de sorteio).
- **Folha explicativa**: nome do tema, seção de objetivos/regras com texto
  padrão editável pelo usuário antes de gerar.
- **Marcadores** e **folha de rascunho**: peças fixas de layout, com
  cor/tipografia do tema aplicadas.
- **Moldes de caixa (sorteio e armazenamento) e verso decorativo**: mesma
  geometria, dobras e cortes do exemplo validado; título, cor, tipografia e
  imagem (upload ou ícone da biblioteca) aplicados sobre essa geometria
  fixa.

## Saída

- Botão "Baixar tudo": um PDF único combinado, replicando a estrutura do
  exemplo original (folha explicativa → cartelas → fichas com gabarito →
  fichas sem gabarito → marcadores → verso → moldes de caixa → folha de
  rascunho).
- Botões individuais por peça, para reimpressão parcial sem regenerar tudo.

## Testes / QA

Não há backend para testes de integração tradicionais. A verificação
consiste em:

- Testes determinísticos no código JS: nenhuma cartela gerada é idêntica a
  outra; validação de respostas duplicadas dispara corretamente; validação
  de banco pequeno/grande demais dispara nos limiares corretos.
- Inspeção visual dos PDFs gerados (com bancos de tamanhos variados e textos
  de diferentes comprimentos) para garantir que nenhum texto estoura o
  layout e que os moldes de caixa saem nas medidas corretas.
- Medidas exatas (dimensões de página, posição de cada elemento nas
  cartelas/fichas/moldes) serão extraídas do PDF de exemplo
  (`BINGO PORCENTAGEM.pdf`) durante a implementação, para reprodução fiel —
  isso é trabalho do plano de implementação, não deste documento de design.

## Fora de escopo (esta versão)

- Geração de imagens por IA dentro da própria página (o runtime de Artifact
  não expõe geração de imagem para o visitante da página); a ferramenta
  cobre isso com upload próprio + biblioteca de ícones.
- Edição da geometria dos moldes de caixa/dobras (permanecem fixos, iguais
  ao exemplo validado).
- Variantes de vitória além de "cartela cheia" (ex: linha, coluna, diagonal)
  — pode ser considerado em versão futura, mas não faz parte deste pedido.

## Direção visual (definida para o Plano 2, via skill frontend-design)

A interface do gerador (formulário + preview) não é uma landing page — é uma
ferramenta de trabalho. O elemento central da tela é a própria cartela sendo
montada ao vivo enquanto o formulário é preenchido, não um título ou hero
genérico.

**Cor** (paleta nomeada, deliberadamente distinta do combo
creme+terracota comum em interfaces geradas por IA):

| Token | Hex | Uso |
|---|---|---|
| `--papel` | `#F3EFE3` | Fundo — bege kraft/manila, remete às fichas e envelopes físicos do produto |
| `--tinta` | `#1F2A24` | Texto — quase-preto com leve matiz verde-pinho |
| `--carimbo` | `#2F6F5E` | Ação primária e estados de sucesso — verde-carimbo ("aprovado") |
| `--mostarda` | `#C98A1F` | Destaques na cartela ao vivo e estados de atenção |
| `--caneta-vermelha` | `#B23A2E` | Avisos e erros de validação — a caneta de correção do professor |
| `--linha` | `#DCD3BE` | Fio sutil para bordas de "ficha" |

Esta paleta é a do CHROME da própria ferramenta (o app), não a paleta que o
professor escolhe para o tema do bingo gerado (essa é definida por
parâmetro no formulário, seção "Tema visual customizável").

**Tipografia:** títulos e números de passo em **Zilla Slab** (serifada
robusta, textura de material didático impresso); corpo e campos de
formulário em **Karla** (sans humanista, legível em formulários).

**Layout:** duas colunas no desktop — formulário em passos numerados à
esquerda (1 Tema, 2 Perguntas, 3 Cartelas, 4 Visual), painel fixo à direita
com a cartela renderizada ao vivo, o indicador de duração do jogo e os
avisos de validação. Empilha em coluna única no mobile. Bordas retas, fio
fino, sem cantos arredondados uniformes nem sombra genérica de card SaaS —
como uma ficha real sobre a mesa. Botões em sentence case, sem seta
decorativa (ex: "Gerar bingo", não "Gerar bingo →").
