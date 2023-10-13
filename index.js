const express = require('express');
const bodyParser = require('body-parser');
const Replicate = require('replicate'); // Importa Replicate
const fs = require('fs');
const app = express();
const port = 4000;
const io = require('socket.io');
const http = require('http');
const server = http.createServer(app);
const socket = io(server);
const path = require('path');
const multer = require('multer');
// Configura la ruta estática para servir archivos HTML y otros recursos
app.use(express.static(path.join(__dirname, 'static')));
const API_key = require('./api-key');

// Configura el cliente de Replicate
const replicate = new Replicate({
  auth: API_key,
});

app.use(bodyParser.json({ limit: '500mb' }));

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
      cb(null, true);
    } else {
      cb(new Error('El archivo debe ser de tipo audio/mpeg o audio/mp3'), false);
    }
  },
});


app.post('/transcribir', upload.single('audio'), async (req, res) => {
    try {
        socket.emit('progress', '0');
      socket.emit('status', 'Archivo de audio recibido!')
      // Verifica si se ha enviado un archivo .mp3 en la solicitud
      if (!req.file) {
        console.error('No se proporcionó ningún archivo de audio .mp3 en la solicitud.');
        socket.emit('status', 'No se recibió ningún archivo de audio!')
        return res.status(400).json({ error: 'No se proporcionó ningún archivo de audio .mp3' });
      }
  
      const audioBuffer = req.file.buffer;
  
      console.log('Enviando archivo completo a Replicate Whisper para transcripción...');
  
      // Convierte el audioBuffer a una cadena base64
      const audioBase64 = audioBuffer.toString('base64');
  
      // Envía el estado actual
      socket.emit('status', 'Transcribiendo archivo de audio...');
  
      try {
        socket.emit('progress', '50');
        // Utiliza Replicate Whisper para transcribir el audio completo
        const output = await replicate.run(
          "openai/whisper:91ee9c0c3df30478510ff8c8a3a545add1ad0259ad3a9f78fba57fbc05ee64f7",
          {
            input: {
                audio: "data:audio/mpeg;base64," + audioBase64 // Agrega el tipo de contenido al URI base64
            }
          }
        );
  
        // Extrae la transcripción de la respuesta de Replicate
        socket.emit('progress', '75');
        const transcripcion = output.transcription;
    
        // Devuelve la transcripción como respuesta
        console.log('Transcripción:', transcripcion);
        socket.emit('progress', '100');
        socket.emit('status', 'Transcripción terminada...');
        res.json({ transcripcion });
      } catch (error) {
        // Manejar errores, si es necesario
        console.error('Error al procesar el archivo de audio:', error);
        res.status(500).json({ error: 'Error interno al procesar el archivo de audio' });
      }
    } catch (error) {
      console.error('Error al transcribir el archivo de audio:', error);
      res.status(500).json({ error: 'Error interno al procesar el archivo de audio' });
    }
  });
    
server.listen(port, () => {
  console.log(`Accede a la página desde: http://localhost:${port}`);
});
