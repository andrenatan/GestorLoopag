---
name: loopag-design
description: Aplica e mantém o design system visual do Loopag (cores, tipografia, espaçamento e padrões de componentes) ao criar ou melhorar qualquer tela do projeto. Use esta skill sempre que o usuário pedir para "melhorar o visual", "deixar mais bonito", "padronizar o design", "aplicar o design system", redesenhar uma página existente, ou criar qualquer nova tela/componente do Loopag — mesmo que o pedido não mencione explicitamente "design" ou "estilo". Consulte também antes de criar cards, tabelas, badges, cabeçalhos de página ou blocos de filtro, para manter consistência com o resto do app.
---

# Design System — Loopag

Este skill garante que toda tela nova ou redesenhada do Loopag siga a mesma
linguagem visual já estabelecida nas páginas mais maduras do projeto
(Financeiro, Renovações Manuais, Templates de Mensagem, Aplicativos).

**Antes de aplicar qualquer estilo, sempre confira os valores reais e atuais em:**
- `client/src/index.css` — CSS Variables (`:root` e `.dark`), fonte da verdade das cores.
- `tailwind.config.ts` — mapeamento das variáveis para classes utilitárias.
- `components.json` — configuração base do shadcn/ui.

Os valores abaixo são a referência conhecida no momento da criação deste skill,
mas **o arquivo `index.css` sempre tem prioridade** se houver divergência —
o time pode ter ajustado tokens desde então.

---

## 1. Paleta de cores

- **Tema duplo**: claro e escuro, persistido via theme provider (`localStorage`).
  Nunca hardcode uma cor fixa — sempre use a CSS Variable ou a variante `dark:`
  explícita do Tailwind.
- **Cores de acento (marca)**:
  - Azul neon — `#6366f1` (indigo-500-ish)
  - Roxo — `#8b5cf6` (violet-500-ish)
  - Aparecem principalmente em: ícones de cabeçalho de página (fundo do ícone),
    botões primários, badges de destaque, sparklines de gráficos.
- **Cores semânticas** (consistentes em todo o app):
  - Verde → Entrada / Sucesso / Ativo (ex: badge "Entrada", badge "Ativo",
    linha "Lucros"/"Entradas" nos cards financeiros)
  - Vermelho → Saída / Erro / Inativo (ex: badge "Saída", botão de excluir)
  - Amarelo/Âmbar → Pendente / Atenção (ex: status "ULTIMO" nas Renovações
    Manuais, badges "Pendente")
  - Azul → Informativo neutro (ex: badge "Entrada" alternativo, ícones de
    calendário/projeção)
- **Efeito visual de fundo**: glassmorphism sutil em cards e modais — fundo
  semi-transparente com blur, borda fina (`border-white/10` ou equivalente no
  tema escuro), nunca cards totalmente opacos ou com bordas duras.
- **Agrupamento por cor** (padrão específico já usado em Renovações Manuais):
  quando uma listagem precisa indicar "safras" ou grupos temporais/lógicos,
  cicle entre ~5 cores suaves de fundo (ex: pink/amber/emerald/sky/violet, com
  variante `dark:` para o tema escuro) — nunca cores saturadas que atrapalhem
  a leitura do texto.

## 2. Tipografia

- Fonte padrão do projeto (a definida em `tailwind.config.ts`/`index.css` —
  confirme antes de assumir uma família específica).
- Hierarquia típica observada nas páginas existentes:
  - Título de página: bold, tamanho grande (ex: `text-2xl`/`text-3xl`)
  - Subtítulo de página: peso normal, cor esmaecida (`text-muted-foreground`
    ou equivalente), tamanho menor (`text-sm`)
  - Valor de métrica em card (ex: "R$ 36.144,00"): bold, tamanho grande
    (`text-2xl`/`text-3xl`), cor semântica (verde/vermelho/roxo conforme o tipo)
  - Label de métrica (ex: "LUCROS", "ENTRADAS"): uppercase, tamanho pequeno,
    peso médio, cor esmaecida, com ícone à esquerda
  - Corpo de tabela: tamanho padrão, nome do cliente/produto em bold, campo
    secundário (ex: nome do cliente abaixo do produto) em cor esmaecida

## 3. Espaçamento

- Cards e seções usam padding generoso (`p-6` como referência comum) e
  `rounded-xl`/`rounded-2xl` — nunca cantos retos ou padding apertado.
- Espaçamento entre cards de métricas: grid com `gap-4`/`gap-6`.
- Formulários: campos empilhados com `space-y-4`/`space-y-6`, seções separadas
  por um título de subseção (ex: "Informações Pessoais", "Status e Pagamento").

## 4. Padrões de componentes recorrentes

Sempre que for criar um destes elementos, siga o padrão já validado em vez de
inventar um novo layout:

### Cabeçalho de página
Ícone com fundo colorido (gradiente ou cor sólida de acento) + título em bold
+ subtítulo esmaecido logo abaixo + ações (botões) alinhadas à direita.
Referência: topo das páginas Financeiro, Aplicativos, Renovações Manuais.

### Card de métrica
Ícone pequeno + label uppercase esmaecida no topo → valor grande e colorido
abaixo → sparkline opcional (Recharts) na base do card, sem eixos visíveis,
só a linha da tendência.
Referência: cards "Lucros/Entradas/Saídas" do Financeiro.

### Badge de status
Pill pequeno, cor de fundo suave + texto na cor semântica correspondente
(nunca texto branco sobre fundo saturado). Exemplos de vocabulário já em uso:
"Ativo"/"Inativo", "Entrada"/"Saída", "ULTIMO OK"/"ULTIMO"/"FALTA",
"Pendente"/"Aprovado"/"Reprovado".

### Tabela padrão
Cabeçalho em uppercase, cor esmaecida, sem borda pesada. Linhas com hover
sutil. Coluna de ações à direita com ícones (editar = lápis, excluir = lixeira
vermelha), sempre em botões pequenos com fundo circular/arredondado.
Paginação no rodapé com contagem total ("Mostrando 1 até 10 de X resultados").

### Bloco de filtros
Inputs de data + selects + botão de ação primário (cor de acento) alinhados
horizontalmente, com labels pequenas em uppercase acima de cada campo.

### Formulário de criação/edição
Seções com título de subseção, campos em grid de 2 colunas quando fizer
sentido (ex: Nome + Telefone lado a lado), campo obrigatório marcado com `*`.

## 5. Como aplicar esta skill a uma tela

Ao receber um pedido de redesign ou criação de tela:

1. **Leia primeiro** `client/src/index.css` e `tailwind.config.ts` para
   confirmar os tokens atuais (não assuma os valores deste documento sem
   checar — eles podem ter evoluído).
2. **Identifique o tipo de conteúdo** da tela (é uma listagem? um formulário?
   um dashboard de métricas?) e mapeie para o(s) padrão(ões) da seção 4.
3. **Reaproveite componentes shadcn/ui já usados no projeto** (`Card`,
   `Badge`, `Table`, `Select`, `Input`, `Button`) em vez de estilizar HTML puro.
4. **Nunca altere lógica de negócio, endpoints ou nomes de campos** ao aplicar
   este skill — é uma mudança estritamente visual, a menos que o usuário peça
   explicitamente uma mudança funcional junto.
5. Se a tela usa gráficos, use Recharts, seguindo o mesmo estilo (sem grid
   pesado, cores semânticas para cada série, sparklines minimalistas para
   cards e gráficos completos para páginas de relatório).
6. Ao terminar, rode `npm run check` para garantir que nada quebrou.

## 6. O que evitar

- Cores hardcoded fora do design system (nunca `#ff0000` direto, use as
  variáveis/classes semânticas).
- Cantos retos, sombras duras, ou cards sem padding.
- Misturar ícones de bibliotecas diferentes (o projeto usa `lucide-react`
  para ícones e `react-icons/si` só para logos de marcas — não introduza
  outra biblioteca de ícones).
- Texto branco puro sobre fundo colorido saturado nos badges — prefira fundo
  suave + texto na cor correspondente.
- Reinventar um padrão de card/tabela/badge quando já existe um equivalente
  em outra página do projeto — sempre procure primeiro se algo parecido já
  existe antes de criar do zero.