# Registro de prompts — DOC Intelligence

Prompts na íntegra, na ordem em que foram escritos, sem edição posterior.
Nenhum prompt foi reescrito para ficar "mais bonito" depois do fato.

Esta conversa começou antes deste desafio (ajuda com currículo e carta de
motivação para a mesma candidatura, na Lamarck Sociedade de Advogados). O
registro abaixo cobre a partir do momento em que o desafio técnico entrou
na conversa.


OBS: Gostaria de informar que como eu tenho pouca experiência profissional no ramo, fiz bastante coisa junto somente a Claude IA(usando o agente gratuito) no desafio e foi muito divertido o processo, onde estudei e aprendi muito nesse projeto sobre vários conceitos.
---

**Prompt 1** (anexando o PDF do desafio):

> sobre aquela vaga de desenvolvedor em que te falei.. estou com esse
> documento em que recebi e que preciso de sua ajuda para fazer um
> esqueleto do projeto proposto. Para mim é um baita desafio tendo em vista
> que não tenho muita experiencia de fazer um projeto do zero, mas quero
> tentar seguindo as regras propostas pela atividade avaliativa

---

**Prompt 2:**

> na verdade, recebi literalmente a 10 minutos atrás

---

**Prompt 3** (seleção em pergunta de múltipla escolha):

> Não sei, quero sua opinião baseada no que eu já sei

---

O agente recomendou a Trilha A (Back-end), com TypeScript + Node.js +
SQLite, e construiu o esqueleto inicial do projeto (estrutura de pastas,
schema do banco, dublê do classificador de IA, regras de negócio, rotas
HTTP, testes automatizados e documentação), entregando um `.zip` com o
projeto rodando e testado (type-check, testes automatizados e teste manual
via `curl`).

---

**Prompt 4:**

> eu entendi um pouco da estrutura da API montada e que foi utilizada
> estrutura de Model, Controller e view. nesse caso, como foi trabalhado
> somente o backend, não temos front e consequentemente, não temos
> interface grafica da API, tanto que, se eu abro o link do local host, só
> tem uma mensagem de um GET, seria nessa ideia, né

---

**Prompt 5:**

> entendi, mas para uma estrutura de um sistema, não seria mais válido uma
> estrutura utilizando conceitos de MVC? Entendo que, o objetivo da
> atividade, é somente uma trilha de back-end de uma API com um objetivo,
> sem necessidade de front e além que, pelo que vi, está sendo feito dessa
> maneira por ser o mais simples possível. Mas fiquei curioso para saber

---

O agente explicou a diferença entre MVC (pensado para aplicações com
interface) e a arquitetura em camadas usada no projeto (rota → serviço →
acesso a dados), e se ofereceu para registrar essa explicação em
`docs/ARCHITECTURE.md`.

---


**Prompt 8** (com um passo a passo próprio de estudo e uma lista extensa de
dúvidas sobre a estrutura de pastas e conceitos):

> certo! só queria uma sugestão, você consegue me dar um passo a passo de
> tudo que eu preciso fazer? mas antes vou te enviar um passo a passo de
> como fiz para correção caso eu tenha errado algo e estrutura com dúvidas
> de tudo: ler o código, entender o fluxo na teoria (funções oque cada
> arquivo faz) e na prática também, anotar dúvidas e perguntar ao claude.
> Após tudo isso, começa a codar e testar e ao mesmo tempo fazer a
> atualização de cada coisa feita no git hub [...] [detalhamento pasta por
> pasta de data/, dist/, routes/, services/, types/, docs/, node_modules/,
> prompts/, src/, tests/, com dúvidas específicas sobre fatia vertical,
> hash SHA-256, dedupe, pool de conexões, migrations e o ADR-003]

---

O agente corrigiu alguns pontos da leitura da estrutura (o que `dist/`,
`.gitkeep`, `aiClient.ts` e `types/` realmente são/fazem), respondeu cada
dúvida conceitual (fatia vertical, hash, dedupe, pool de conexões,
migrations, ADR-003), detalhou `documentService.ts` função por função, e
propôs um passo a passo geral (entender → refazer do zero → adicionar
camada de repository → carta de fechamento → commits incrementais →
simular entrevista).

---

**Prompt 9:**

> tabom.. No momento, peço para explicar por linha se conseguir o
> funcionamento do arquivo documents.js que fica na pasta routes

---

O agente explicou `routes/documents.ts` linha a linha.

---

**Prompt 10:**

> faça o seguinte, quero que me explique passo a passo a como fazer do
> zero esse projeto. Pois estou com dificuldade, mesmo o readme informando
> como foi feita a estrutura. Infelizmente ainda tenho muito a aprender.
> eu comecei a fazer pelas instalações das dependencias, os package json,
> e os do tsconfig também e já fiz as pastas do src contendo o arquivo
> index.ts onde já montei o esboço do servidor, contendo só a informação
> do servidor e acredito que agora tenho que montar os arquivos dos
> serviços, é isso?

---

O agente corrigiu a ideia de que seria preciso compilar manualmente durante
o desenvolvimento (o `tsx` faz isso em memória) e propôs a ordem de
construção de baixo para cima: `types/` → `db/` → `aiClient.ts` →
`documentService.ts` → `routes/` → `index.ts` (montagem final) → testes.

---

**Prompt 11:**

> terminei de montar a API. agora preciso saber se do jeito que está, eu
> rodando como explica no readme, eu consigo testar realmente a
> funcionalidade do sistema.

---

O agente montou um checklist de verificação manual (subir servidor, testar
`/health`, enviar documento, provar deduplicação, forçar baixa confiança,
testar revisão humana, rodar `npm test`), deixando claro que não tinha
acesso ao código do usuário para rodar por ele.

---

**Prompt 12:**

> Entendi, vou testar. Eu coloco algum conteúdo nos pdf?


---

*(Fim do registro até o momento da entrega. Caso qualquer ajuste seja feito
depois deste ponto — por conta própria ou com apoio de IA — este arquivo
deve ser atualizado antes da submissão final.)*

