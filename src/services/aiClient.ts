import { ClassificationResult } from "../types/document.js";


export interface AiClient {
    classify(fileBuffer: Buffer, filename: string): Promise<ClassificationResult>;
};

const SAMPLE_TYPES = ["identidade", "comprovante_residencia", "contracheque"];

export class MockAiClient implements AiClient {
  constructor(
    private opts: { minLatencyMs?: number; maxLatencyMs?: number; failureRate?: number } = {}
  ) {}

  async classify(fileBuffer: Buffer, filename: string): Promise<ClassificationResult> {
  const minMs = this.opts.minLatencyMs ?? 50;
  const maxMs = this.opts.maxLatencyMs ?? 300;
  const failureRate = this.opts.failureRate ?? 0.1;

  const delay = minMs + Math.random() * (maxMs - minMs);
  await new Promise((resolve) => setTimeout(resolve, delay));
  
  if (Math.random() < failureRate) {
  throw new Error("Falha simulada do modelo de terceiro (timeout ou erro upstream)");
    }
  const docType = SAMPLE_TYPES[Math.floor(Math.random() * SAMPLE_TYPES.length)];
  const confidence = Math.round((0.55 + Math.random() * 0.45) * 100) / 100;  
    return {
      docType,
      confidence,
      fields: mockFieldsFor(docType),
      suggestedFilename: `${docType}_${Date.now()}${extensionOf(filename)}`,
    };
  }    
}  

function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx) : "";
}

function mockFieldsFor(docType: string): Record<string, string> {
  switch (docType) {
    case "identidade":
      return {
        nome: "Nome Fictício da Silva",
        filiacao: "Mãe Fictícia / Pai Fictício",
        data_nascimento: "1990-01-01",
        numero: "000000000",
        orgao_emissor: "SSP/RN",
      };
    default:
      return { observacao: "Campos de exemplo do dublê para este tipo de documento" };
  }
}