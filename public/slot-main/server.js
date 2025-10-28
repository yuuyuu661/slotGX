// server.js
const express = require('express');
const app = express();
const path = require('path');

app.use(express.static(path.join(__dirname, 'public'))); // HTMLや画像のある場所

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

