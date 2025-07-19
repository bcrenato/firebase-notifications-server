const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();

// Configura CORS para permitir chamadas do seu site no GitHub Pages
const corsOptions = {
  origin: 'https://bcrenato.github.io', // coloque * se quiser liberar para todos (não recomendado em prod)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions));

app.use(bodyParser.json());

// Inicializa Firebase Admin usando as credenciais que você colocou no Render
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://cadastro-membros-c5cd4-default-rtdb.firebaseio.com"
});

// Endpoint para enviar notificações
app.post('/send', async (req, res) => {
  const { title, body, image } = req.body;

  try {
    // Lê todos os tokens salvos no Realtime Database
    const snapshot = await admin.database().ref('tokens').once('value');
    const tokens = snapshot.exists() ? Object.values(snapshot.val()) : [];

    if (tokens.length === 0) {
      return res.status(404).json({ error: 'Nenhum token encontrado.' });
    }

    const message = {
      notification: {
        title,
        body,
        image
      },
      tokens
    };

    /**
     * 🔷 Esta chamada usa a **API v1 do FCM**
     * desde que:
     * - O projeto no Firebase tenha a API v1 ativada (já está)
     * - O admin SDK esteja atualizado (>=9 já usa v1 por padrão)
     * - A conta de serviço tenha permissão
     * 
     * Se der erro 404 `/batch`, normalmente é por conta de:
     * - SDK desatualizado
     * - tokens inválidos (antigos ou incorretos)
     * - permissões insuficientes
     * 
     * Por isso: garanta que tudo acima está OK!
     */

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
