# Arquitetura e Decisões — DOC Intelligence (Trilha A — Back-end)

Este documento registra as decisões tomadas para a fatia vertical entregue,
as alternativas consideradas e por que cada uma foi descartada. O objetivo
não é justificar que tudo está certo, e sim deixar rastreável *como* se
pensou — inclusive o que ficou pra depois.

## Visão geral

```
Cliente (app interna) ──POST /documents (multipart)──▶  API (Express)
                                                              │
                                                    hash SHA-256 do conteúdo
                                                              │
                                            já existe? ──sim──▶ copia resultado, marca duplicata
                                                    │não
                                                    ▼
                                        Classificador de IA (dublê/real)
                                          [retry até 3x, timeout implícito]
                                                    │
                                    confiança ≥ 0.8 ──sim──▶ status "processed"
                                                    │não
                                                    ▼
                                          status "pending_review"
                                                    │
                                    POST /documents/:id/review (humano corrige)
                                                    ▼
                                          status "processed"
```

## ADR-000 — Arquitetura em camadas, não MVC

**Decisão:** rota (`routes/`) → serviço (`services/`) → acesso a dados
(`db/`), sem separar um `Model`/`Repository` explícito nem existir uma
`View`.

**Por que não MVC:** o padrão MVC nasceu para aplicações que renderizam
interface — o "V" existe para separar "o que os dados são" de "como
aparecem na tela". Numa API REST sem UI (a Trilha A não pede front-end),
não existe "como aparece na tela" — quem decide isso é o cliente que
consome a API. Forçar uma "View" aqui seria uma camada vazia que só faz
`res.json(dados)`, sem separar responsabilidade real nenhuma.

**O que existe de fato:** uma arquitetura em camadas simples (rota fina →
serviço com a regra de negócio → SQL direto). Isso é diferente de MVC
"puro", mas cumpre o mesmo objetivo de separação de responsabilidades que
MVC busca — só que adaptado a uma API sem apresentação visual.

**Limite conhecido, não resolvido:** o acesso ao banco (SQL) está direto
dentro de `documentService.ts`, sem uma camada `Repository` separada. Num
projeto maior, isso valeria a pena isolar — o serviço falaria só com uma
interface abstrata de repositório, o que facilitaria trocar de banco ou
testar sem SQLite real. Não fiz essa separação na fatia vertical por
tempo; fica registrado como próximo passo explícito.

## ADR-001 — Stack: Node.js + TypeScript, sem framework web pesado (Express puro)

**Decisão:** TypeScript rodando em Node.js, com Express para HTTP.

**Alternativas consideradas:**
- **Python (FastAPI)** — eu tenho mais prática em Python (NumPy, PyQt), e o
  ecossistema de IA/documentos é forte em Python. Descartei porque a vaga
  para a qual este teste se aplica pede TypeScript, e a Trilha A é a
  oportunidade de mostrar isso no back-end sem depender de framework de
  front-end que eu não domino.
- **NestJS** — mais estrutura (DI, módulos), mas overhead de aprendizado e
  boilerplate que não se paga numa entrega de 3 dias por alguém sem
  experiência prévia com o framework. Express puro é suficiente para o
  tamanho desta fatia e mais fácil de eu justificar linha a linha.

**Trade-off aceito:** menos "andaime" arquitetural pronto (validação,
injeção de dependência, etc. são manuais aqui). Para um sistema real isso
provavelmente cresceria para algo mais estruturado — registrado como risco
conhecido, não resolvido.

## ADR-002 — Persistência: SQLite na fatia vertical, não MariaDB

**Decisão:** SQLite via `better-sqlite3`, arquivo único em `data/`.

**Por quê:** a fatia vertical não precisa de um servidor de banco separado
para provar a lógica (dedupe, fila de revisão, confiança). SQLite roda sem
infraestrutura extra e o schema é trivialmente portável para MariaDB/Postgres
depois — a camada de acesso já está isolada em `src/db` e
`DocumentService`, então trocar o banco significa reescrever essa camada,
não o resto do sistema.

**Por que não fui direto de MariaDB:** setup de um servidor MariaDB só para
rodar a entrega adiciona fricção para quem for avaliar (`git clone` +
`npm install` + rodar já deveria bastar). Ambiente real definitivamente
usaria um banco com servidor próprio, com pool de conexões e migrations
versionadas — isso fica como próximo passo explícito, não escondido.

## ADR-003 — Processamento síncrono na fatia vertical, fila fica para depois

**Decisão:** o `POST /documents` chama o classificador (com retry) antes de
responder.

**Fato do ambiente que isso ignora, conscientemente:** a chamada ao modelo
leva de 5 a 40 segundos, e duas pessoas do atendimento podem enviar ao mesmo
tempo. Seguro a requisição HTTP do cliente por até 40s × 3 tentativas é ruim
de verdade em produção — o app do atendimento provavelmente daria timeout,
e picos de 800 documentos/dia concentrados em duas horas (fato "e") vão
empilhar conexões abertas.

**Por que entreguei assim mesmo:** a fatia vertical pede "receber, passar
pelo processamento (dublê ou não), gravar, consultar" — processamento
síncrono é a forma mais direta de provar esse caminho fim-a-fim em pouco
código, e é o que dava para testar de ponta a ponta com confiança dentro do
prazo.

**O que eu faria num sistema real (registrado como risco conhecido, não
implementado):** `POST /documents` responderia imediatamente com
`status: "received"` e um `id`; uma fila (BullMQ/SQS/equivalente) processaria
de forma assíncrona; o cliente faria polling em `GET /documents/:id` ou
receberia um webhook. O schema já foi desenhado pensando nisso — o campo
`status` já tem o estado `"received"` e `"processing"` justamente para
suportar essa transição sem redesenhar a tabela.

## ADR-004 — Deduplicação por hash de conteúdo (SHA-256), não por nome de arquivo

**Decisão:** calcular SHA-256 do conteúdo do arquivo recebido e comparar com
hashes já vistos, antes de chamar o classificador.

**Por quê:** o fato "b" do desafio diz que quem envia não valida nada e usa
nomes tipo `WhatsApp Image 2026-08-11 at 09.12.33.jpeg` — o nome do arquivo
não serve como identidade. O conteúdo, sim. Isso resolve o fato "c" (reenvio
por insegurança) sem gastar uma chamada paga ao modelo de terceiro à toa.

**Limite conhecido, não resolvido:** duas fotos levemente diferentes do
*mesmo* papel físico (ângulo diferente, nova foto) têm hashes diferentes e
não seriam detectadas como duplicatas. Um sistema mais sofisticado
compararia por similaridade perceptual de imagem ou pelos campos extraídos
depois da classificação — fica registrado como próximo passo, não como algo
que o hash resolve sozinho.

## ADR-005 — Limiar de confiança fixo (0.8), sem calibração por tipo de documento

**Decisão:** um único `CONFIDENCE_THRESHOLD = 0.8` decide se o documento vai
para `pending_review` ou `processed`.

**Alternativa descartada:** limiar por tipo de documento (ex.: identidade
exige confiança maior que comprovante de residência, porque errar dado de
identidade é mais grave). Descartei por tempo — calibrar isso exigiria dados
reais de confiança do modelo por tipo, que eu não tenho no prazo do desafio.
Fica registrado como a decisão que eu menos defenderia hoje (ver carta de
fechamento).

## O que não foi feito (conscientemente)

- Autenticação/autorização na API (o desafio explicitamente não pede).
- Fila assíncrona real (ADR-003).
- Deploy e infraestrutura de produção.
- Interface gráfica (fora do escopo da Trilha A).
- Testes de carga simulando os 800 documentos/dia do fato "e".
- Rotação/expurgo de arquivos originais após processamento (LGPD/dado
  sensível — fato "d" — fica como risco conhecido: hoje os bytes do arquivo
  não são persistidos em disco pela API, só o hash e os campos extraídos,
  o que já reduz a superfície, mas uma política formal de retenção não foi
  desenhada).
