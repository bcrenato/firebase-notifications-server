const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();

// ✅ Middleware de CORS no topo
app.use(cors({
  origin: 'https://bcrenato.github.io',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// ✅ Body parser
app.use(bodyParser.json());

// ✅ Opcional: responder manualmente a qualquer OPTIONS (nem sempre necessário)
app.options('*', cors());

// 🔷 Inicializa Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://cadastro-membros-c5cd4-default-rtdb.firebaseio.com"
});

// 🔷 Endpoint POST
app.post('/send', async (req, res) => {
  const { title, body, image } = req.body;

  try {
    const snapshot = await admin.database().ref('tokens').once('value');
    const tokens = snapshot.exists() ? Object.values(snapshot.val()) : [];

    if (tokens.length === 0) {
      return res.status(404).json({ error: 'Nenhum token encontrado.' });
    }

    const message = {
      notification: { title, body, image },
      tokens
    };

    const response = await admin.messaging().sendMulticast(message);

    res.json({
      success: response.successCount,
      failure: response.failureCount,
      responses: response.responses
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Erro ao enviar notificações.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
