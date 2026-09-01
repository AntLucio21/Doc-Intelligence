import express from 'express';
import "./db/db.js";
import { documentsRouter } from "./routes/documents.js";
import { DocumentService } from "./services/documentService.js";
import { MockAiClient } from "./services/aiClient.js";

const app = express();
app.use(express.json());

const aiClient = new MockAiClient();
const documentService = new DocumentService(aiClient);



app.get('/health', (req, res) => {res.json({status : 'ok'}
  );
});
app.use(documentsRouter(documentService));

const port = 3000;

app.listen(port, () => {
  console.log(`rodando em http://localhost:${port}`);
});

