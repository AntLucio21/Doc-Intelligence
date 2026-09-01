import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { DocumentService } from "../services/documentService.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const reviewSchema = z.object({
  fields: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
  docType: z.string().optional(),
});

export function documentsRouter(documentService: DocumentService): Router {
  const router = Router();

  // 1. Receber um documento (imagem ou PDF) enviado por uma aplicação cliente.
  router.post("/documents", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Campo 'file' é obrigatório (multipart/form-data)." });
    }
    try {
      const doc = await documentService.ingest(req.file.buffer, req.file.originalname);
      res.status(201).json(serialize(doc));
    } catch (err) {
      res.status(500).json({ error: "Falha ao processar o documento.", detail: String(err) });
    }
  });

  // 3. Listar documentos já processados / consultar o resultado de um.
  router.get("/documents", (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const docs = documentService.list(status ? { status: status as any } : undefined);
    res.json(docs.map(serialize));
  });

  router.get("/documents/:id", (req, res) => {
    const doc = documentService.getById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Documento não encontrado." });
    res.json(serialize(doc));
  });

  // 4. Conferência humana corrige o que a máquina errou.
  router.post("/documents/:id/review", (req, res) => {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Corpo inválido.", detail: parsed.error.flatten() });
    }
    const updated = documentService.review(req.params.id, parsed.data.fields, parsed.data.docType);
    if (!updated) return res.status(404).json({ error: "Documento não encontrado." });
    res.json(serialize(updated));
  });

  return router;
}

function serialize(doc: ReturnType<DocumentService["getById"]>) {
  if (!doc) return doc;
  return {
    ...doc,
    fields: doc.fields ? JSON.parse(doc.fields) : null,
  };
}
