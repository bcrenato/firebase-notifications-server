require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.DATABASE_URL
  });
  console.log("✅ Firebase Admin inicializado com sucesso!");
} catch (err) {
  console.error("❌ Erro ao inicializar Firebase Admin:", err);
  process.exit(1);
}

app.get('/', (req, res) => {
  res.send('Servidor Firebase Admin rodando localmente');
});

app.post('/send', async (req, res) => {
  const { title, body, image } = req.body;

  console.log('📨 Requisição recebida para enviar notificações:', { title, body, image });

  try {
    const snapshot = await admin.database().ref('tokens').once('value');
    const tokens = Object.values(snapshot.val() || {});

    if (tokens.length === 0) {
      return res.status(404).json({ error: 'Nenhum token encontrado.' });
    }

    const response = await admin.messaging().sendMulticast({
      tokens,
      notification: { title, body, image },
    });

    console.log(`✅ Sucesso: ${response.successCount}, ❌ Falhas: ${response.failureCount}`);
    res.json(response);
  } catch (error) {
    console.error('❌ Erro ao enviar notificações:', error);
    res.status(500).json({ error: error.message });
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
