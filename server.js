require('dotenv').config(); // para rodar local com .env

const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();

// 🌐 configura CORS
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*'; // pode ser https://bcrenato.github.io
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());

// 🔐 inicializa Firebase Admin
let initialized = false;
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.DATABASE_URL
  });

  initialized = true;
  console.log("✅ Firebase Admin inicializado com sucesso.");
} catch (err) {
  console.error("❌ Erro ao inicializar Firebase Admin:", err.message);
  process.exit(1);
}

// 🌐 endpoint para teste rápido
app.get('/', (req, res) => {
  res.json({ message: '🎯 Servidor Firebase Admin está no ar.' });
});

// 🔷 endpoint para enviar notificações
app.post('/send', async (req, res) => {
  const { title, body, image } = req.body;

  if (!initialized) {
    return res.status(500).json({ error: 'Firebase Admin não inicializado.' });
  }

  console.log('📨 Enviando notificação:', { title, body, image });

  try {
    const snapshot = await admin.database().ref('tokens').once('value');
    const tokens = Object.values(snapshot.val() || {});

    if (tokens.length === 0) {
      return res.status(404).json({ error: 'Nenhum token encontrado no banco.' });
    }

    const message = {
      tokens,
      notification: { title, body, image }
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`✅ Sucesso: ${response.successCount}, ❌ Falhas: ${response.failureCount}`);
    res.json({
      success: response.successCount,
      failure: response.failureCount,
      responses: response.responses
    });

  } catch (err) {
    console.error('❌ Erro ao enviar notificações:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`🌐 Aceitando requisições de: ${allowedOrigin}`);
});
