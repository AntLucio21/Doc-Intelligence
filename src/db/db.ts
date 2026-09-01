import Database from "better-sqlite3";
import path from "path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "doc-intelligence.sqlite3");
export const db = new Database(dbPath);

/*
if (!fs.existsSync(dbPath)) {
  console.log(`Criando banco de dados em ${dbPath}`);
} else {
  console.log(`Usando banco de dados existente em ${dbPath}`);
}
*/

db.pragma("journal_mode = WAL"); // cofiguração do banco para permitir múltiplas leituras e uma escrita simultaneamente, melhorando a performance

/* 
OBS: SQLite é escolha da fatia vertical (simples, sem
infraestrutura extra, arquivo único fácil de inspecionar). 
Em produção, isso seria MariaDB/Postgres
*/

db.exec(`
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  original_filename TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  doc_type TEXT,
  confidence REAL,
  fields TEXT,
  suggested_filename TEXT,
  duplicate_of_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  received_at TEXT NOT NULL,
  processed_at TEXT,
  reviewed_at TEXT,
  FOREIGN KEY (duplicate_of_id) REFERENCES documents(id)
);

-- Índice pelo hash: é o que permite detectar reenvio do mesmo documento
-- (fato "c" do desafio) sem varrer a tabela inteira.
CREATE INDEX IF NOT EXISTS idx_documents_content_hash ON documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
`);


