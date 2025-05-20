const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// CORS middleware
app.use(cors());

// Body parser middleware (Express's built-in)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Define a simple test route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Mount routers
app.use('/api/auth', require('./routes/auth'));

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
