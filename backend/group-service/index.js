const express = require('express');
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    // Lógica BD...
    res.status(200).json({
        statusCode: 200,
        intOpCode: 'GRP200',
        data: [{ id: 1, name: 'Workspace Frontend' }]
    });
});

app.listen(3003, () => {
    console.log('Servicio Grupos en el puerto 3003');
});