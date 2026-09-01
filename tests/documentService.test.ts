import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DocumentService } from "../src/services/documentService.js";
import type { AiClient } from "../src/services/aiClient.js";
import type { ClassificationResult } from "../src/types/document.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Antes de cada teste, apaga o banco pra cada teste começar isolado.
// (Simples de propósito: é um arquivo SQLite só, sem infra extra.)
beforeEach(() => {
  const dbFile = path.resolve(__dirname, "../data/doc-intelligence.sqlite3");
  for (const suffix of ["", "-wal", "-shm"]) {
    const p = dbFile + suffix;
    if (fs.existsSync(p)) fs.rmSync(p);
  }
});

class StubAiClient implements AiClient {
  constructor(private result: ClassificationResult | (() => ClassificationResult), private shouldThrow = false) {}
  async classify(): Promise<ClassificationResult> {
    if (this.shouldThrow) throw new Error("erro simulado");
    return typeof this.result === "function" ? this.result() : this.result;
  }
}

const highConfidenceResult: ClassificationResult = {
  docType: "identidade",
  confidence: 0.95,
  fields: { nome: "Fulano de Tal" },
  suggestedFilename: "identidade_fulano.pdf",
};

const lowConfidenceResult: ClassificationResult = {
  docType: "comprovante_residencia",
  confidence: 0.4,
  fields: { endereco: "Rua Exemplo, 123" },
  suggestedFilename: "comprovante_fulano.pdf",
};

describe("DocumentService.ingest", () => {
  // Por que este teste importa: é a regra central do produto — o motivo de
  // existir o "pending_review" é justamente não deixar coisa incerta passar
  // como se estivesse pronta.
  it("marca como 'processed' quando a confiança está acima do limiar", async () => {
    const service = new DocumentService(new StubAiClient(highConfidenceResult));
    const doc = await service.ingest(Buffer.from("conteudo-fake"), "doc1.pdf");
    expect(doc.status).toBe("processed");
    expect(doc.confidence).toBe(0.95);
  });

  it("marca como 'pending_review' quando a confiança está abaixo do limiar", async () => {
    const service = new DocumentService(new StubAiClient(lowConfidenceResult));
    const doc = await service.ingest(Buffer.from("conteudo-fake-2"), "doc2.pdf");
    expect(doc.status).toBe("pending_review");
  });

  // Fato "c" do desafio: o mesmo documento chega mais de uma vez.
  // Testa que o segundo envio não dispara uma nova chamada (paga) ao
  // classificador e é vinculado ao original via duplicate_of_id.
  it("detecta reenvio do mesmo conteúdo e não reprocessa", async () => {
    let callCount = 0;
    const service = new DocumentService(
      new StubAiClient(() => {
        callCount++;
        return highConfidenceResult;
      })
    );
    const buffer = Buffer.from("mesmo-conteudo-exato");
    const first = await service.ingest(buffer, "original.pdf");
    const second = await service.ingest(buffer, "reenvio_do_whatsapp.pdf");

    expect(callCount).toBe(1);
    expect(second.duplicateOfId).toBe(first.id);
    expect(second.status).toBe("processed");
  });

  // Fato "a": o classificador falha de vez em quando. O sistema precisa
  // tentar de novo antes de desistir, e desistir de forma visível (status
  // 'failed'), nunca fingindo sucesso.
  it("tenta novamente em caso de falha e marca como 'failed' após esgotar tentativas", async () => {
    const service = new DocumentService(new StubAiClient(highConfidenceResult, true));
    const doc = await service.ingest(Buffer.from("vai-falhar"), "doc3.pdf");
    expect(doc.status).toBe("failed");
    expect(doc.errorMessage).toBeTruthy();
  });
});

describe("DocumentService.review", () => {
  it("move o documento de pending_review para processed após correção humana", async () => {
    const service = new DocumentService(new StubAiClient(lowConfidenceResult));
    const doc = await service.ingest(Buffer.from("precisa-de-revisao"), "doc4.pdf");
    expect(doc.status).toBe("pending_review");

    const reviewed = service.review(doc.id, { endereco: "Rua Corrigida, 456" }, "comprovante_residencia");
    expect(reviewed?.status).toBe("processed");
    expect(reviewed?.reviewedAt).toBeTruthy();
  });
});
