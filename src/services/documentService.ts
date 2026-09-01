import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import { db } from "../db/db.js";
import type { AiClient } from "./aiClient.js";
import type { DocumentRecord, DocumentStatus } from "../types/document.js";

const CONFIDENCE_THRESHOLD = 0.8; // abaixo disso, vai para conferência humana
const MAX_ATTEMPTS = 3;

export class DocumentService {
  constructor(private aiClient: AiClient) {}

  async ingest(fileBuffer: Buffer, originalFilename: string): Promise<DocumentRecord> {
    const contentHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    const existing = this.findByHash(contentHash);

    const id = randomUUID();
    const receivedAt = new Date().toISOString();

    if (existing) {
      /* 
      Copia o resultado já conhecido em vez de só apontar pro original:
      quem consulta este registro não precisa saber que é duplicata para
      ter a resposta completa.
      */
      db.prepare(
        `INSERT INTO documents
         (id, original_filename, content_hash, status, doc_type, confidence, fields,
          suggested_filename, duplicate_of_id, attempts, received_at, processed_at)
         VALUES (@id, @originalFilename, @contentHash, @status, @docType, @confidence, @fields,
                 @suggestedFilename, @duplicateOfId, 0, @receivedAt, @processedAt)`
      ).run({
        id,
        originalFilename,
        contentHash,
        status: existing.status,
        docType: existing.docType,
        confidence: existing.confidence,
        fields: existing.fields,
        suggestedFilename: existing.suggestedFilename,
        duplicateOfId: existing.id,
        receivedAt,
        processedAt: receivedAt,
      });
      return this.getById(id)!;
    }

    db.prepare(
      `INSERT INTO documents
       (id, original_filename, content_hash, status, attempts, received_at)
       VALUES (@id, @originalFilename, @contentHash, @status, 0, @receivedAt)`
    ).run({ id, originalFilename, contentHash, status: "received" satisfies DocumentStatus, receivedAt });

    
    await this.process(id, fileBuffer, originalFilename);

    return this.getById(id)!;
  }

  private async process(id: string, fileBuffer: Buffer, filename: string): Promise<void> {
    this.updateStatus(id, "processing");

    let lastError: unknown = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const result = await this.aiClient.classify(fileBuffer, filename);
        const status: DocumentStatus =
          result.confidence >= CONFIDENCE_THRESHOLD ? "processed" : "pending_review";

        db.prepare(
          `UPDATE documents
           SET status = @status, doc_type = @docType, confidence = @confidence,
               fields = @fields, suggested_filename = @suggestedFilename,
               attempts = @attempts, processed_at = @processedAt, error_message = NULL
           WHERE id = @id`
        ).run({
          id,
          status,
          docType: result.docType,
          confidence: result.confidence,
          fields: JSON.stringify(result.fields),
          suggestedFilename: result.suggestedFilename,
          attempts: attempt,
          processedAt: new Date().toISOString(),
        });
        return;
      } catch (err) {
        lastError = err;
        this.incrementAttempts(id, attempt);
      }
    }

    db.prepare(
      `UPDATE documents SET status = 'failed', error_message = @errorMessage WHERE id = @id`
    ).run({ id, errorMessage: lastError instanceof Error ? lastError.message : String(lastError) });
  }

  private incrementAttempts(id: string, attempts: number): void {
    db.prepare(`UPDATE documents SET attempts = @attempts WHERE id = @id`).run({ id, attempts });
  }

  private updateStatus(id: string, status: DocumentStatus): void {
    db.prepare(`UPDATE documents SET status = @status WHERE id = @id`).run({ id, status });
  }

  findByHash(contentHash: string): DocumentRecord | undefined {
    const row = db
      .prepare(`SELECT * FROM documents WHERE content_hash = @contentHash AND duplicate_of_id IS NULL LIMIT 1`)
      .get({ contentHash });
    return mapRow(row);
  }

  getById(id: string): DocumentRecord | undefined {
    const row = db.prepare(`SELECT * FROM documents WHERE id = @id`).get({ id });
    return mapRow(row);
  }

  list(filter?: { status?: DocumentStatus }): DocumentRecord[] {
    const rows = filter?.status
      ? db.prepare(`SELECT * FROM documents WHERE status = @status ORDER BY received_at DESC`).all({ status: filter.status })
      : db.prepare(`SELECT * FROM documents ORDER BY received_at DESC`).all();
    return (rows as any[]).map((r) => mapRow(r)!);
  }

  
  review(id: string, correctedFields: Record<string, unknown>, correctedDocType?: string): DocumentRecord | undefined {
    const doc = this.getById(id);
    if (!doc) return undefined;

    db.prepare(
      `UPDATE documents
       SET fields = @fields, doc_type = COALESCE(@docType, doc_type),
           status = 'processed', reviewed_at = @reviewedAt
       WHERE id = @id`
    ).run({
      id,
      fields: JSON.stringify(correctedFields),
      docType: correctedDocType ?? null,
      reviewedAt: new Date().toISOString(),
    });

    return this.getById(id);
  }
}


function mapRow(row: any): DocumentRecord | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    OriginalFilename: row.original_Filename,
    contentHash: row.content_hash,
    status: row.status,
    docType: row.doc_type,
    confidence: row.confidence,
    fields: row.fields,
    suggestedFilename: row.suggested_filename,
    duplicateOfId: row.duplicate_of_id,
    attempts: row.attempts,
    errorMessage: row.error_message,
    receivedAt: row.received_at,
    processedAt: row.processed_at,
    reviewedAt: row.reviewed_at,
  };
}
