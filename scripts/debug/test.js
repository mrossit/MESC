const express = require('express');
const app = express();
const PORT = 5000;

app.get('/', (req, res) => {
  res.send('<h1>MESC Working!</h1><p>Port: ' + PORT + '</p>');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Test server: http://0.0.0.0:' + PORT);
});
