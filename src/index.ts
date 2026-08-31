import express from 'express';
import "./db/db.js";

const app = express();
app.use(express.json());


app.get('/health', (req, res) => {res.json({status : 'ok'}
  );
});

const port = 3000;

app.listen(port, () => {
  console.log(`rodando em http://localhost:${port}`);
});

