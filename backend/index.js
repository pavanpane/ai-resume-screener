require('dotenv').config();
const express = require('express');
const cors = require('cors');
const screeningRoutes = require('./src/routes/screeningRoutes');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api', screeningRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
