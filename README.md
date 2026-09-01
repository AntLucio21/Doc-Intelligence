# DOC Intelligence — Trilha A (Back-end)

Fatia vertical de um serviço de classificação e extração de dados de
documentos para o escritório de advocacia. Ver `docs/ARCHITECTURE.md` para
as decisões de arquitetura e o que ficou de fora, e `CARTA_FECHAMENTO.md`
(gerada à parte) para a carta de fechamento pedida no desafio.

## O que esta fatia entrega

Caminho completo, de ponta a ponta, rodando de verdade:

1. `POST /documents` — recebe um arquivo (multipart), calcula o hash do
   conteúdo, verifica se já foi visto (deduplicação) e, se não, chama o
   classificador (hoje um **dublê**, ver `src/services/aiClient.ts`) com
   retry em caso de falha.
2. Se a confiança devolvida for baixa, o documento fica em
   `pending_review` — não passa como pronto.
3. `GET /documents` e `GET /documents/:id` — consultam o que já foi
   processado.
4. `POST /documents/:id/review` — conferência humana corrige os campos e o
   documento vira `processed`.

## Como rodar

Pré-requisitos: Node.js 20+.

```bash
npm install
npm run dev        # sobe a API em http://localhost:3000 com hot-reload (tsx)
```

Ou, para simular produção:

```bash
npm run build
npm start
```

O banco SQLite é criado automaticamente em `data/doc-intelligence.sqlite3`
na primeira execução — não precisa de setup manual.

### Testando manualmente

```bash
curl -X POST http://localhost:3000/documents -F "file=@/caminho/para/arquivo.pdf"

curl http://localhost:3000/documents

curl http://localhost:3000/documents/<id>

curl -X POST http://localhost:3000/documents/<id>/review \
  -H "Content-Type: application/json" \
  -d '{"fields": {"nome": "Nome Corrigido"}, "docType": "identidade"}'
```

## Validação manual realizada

Além dos testes automatizados, o fluxo completo foi testado manualmente via
`curl` contra o servidor local, confirmando:

- Envio de um documento novo → processado com sucesso, campos preenchidos.
- Reenvio do mesmo conteúdo → detectado como duplicata (`duplicateOfId`
  preenchido), sem nova chamada ao classificador (`attempts: 0`).
- Documento com confiança baixa → cai em `pending_review`.
- Revisão humana em um documento `pending_review` → muda para `processed`
  com `reviewedAt` preenchido.

## Testes automatizados

```bash
npm test
```

**O que eu escolhi testar, e por quê:** os testes cobrem a lógica de
negócio em `DocumentService`, não a camada HTTP — é onde estão as decisões
que realmente importam para o produto (não é código "sabido", é onde um bug
silencioso custaria caro):

- **Limiar de confiança** decide certo entre `processed` e `pending_review`
  — é a regra central do requisito "não deixar o documento entrar como
  pronto quando a máquina não tem confiança".
- **Deduplicação por hash** — prova que um reenvio não dispara uma nova
  chamada (paga) ao classificador e fica corretamente vinculado ao
  original.
- **Retry e falha esgotada** — prova que uma falha do classificador não
  trava o sistema nem finge sucesso; após esgotar tentativas, o documento
  fica visivelmente `failed`.
- **Revisão humana** — prova que a correção manual move o documento de
  `pending_review` para `processed` e registra `reviewedAt`.

Não escrevi testes de HTTP (rotas) nem de banco de dados isoladamente — na
fatia vertical, o valor está na lógica de decisão, e testar isso direto no
serviço é mais rápido de rodar e mais fácil de ler do que subir um servidor
HTTP de teste para cada caso.

## Estrutura do projeto

```
src/
  index.ts               # bootstrap do Express
  routes/documents.ts     # camada HTTP (validação, status codes)
  services/
    documentService.ts    # regras de negócio (dedupe, confiança, retry, revisão)
    aiClient.ts            # dublê do classificador de IA de terceiro
  db/db.ts                 # conexão SQLite + schema
  types/document.ts        # tipos compartilhados
docs/
  ARCHITECTURE.md           # ADRs — decisões, alternativas, o que não foi feito
node_modules/               
tests/
  documentService.test.ts  # testes da lógica de negócio
prompts/
  prompts.md                 # registro dos prompts usados com o agente de IA
CLAUDE.md                    # instruções dadas ao agente de IA
```

## Variáveis de ambiente

Nenhuma obrigatória. Opcional: `PORT` (padrão `3000`).

## Dados de teste

Nenhum dado real de cliente foi usado em nenhum momento — o classificador é
um dublê que gera campos fictícios, e os arquivos enviados durante o
desenvolvimento foram arquivos de texto simples criados só para o teste
manual do fluxo.
