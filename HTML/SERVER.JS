const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML', 'PUCPAGE.html'));
});

app.get('/puc', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML', 'PUCPAGE.html'));
});

app.get('/details', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML', 'DTEPAGE.html'));
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});