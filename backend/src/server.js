const app = require('./app');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

mongoose.set('strictQuery', false);

const ensureAdminUser = async () => {
  try {
    const existingAdmin = await User.findOne({ username: ADMIN_USERNAME, role: 'admin' });
    if (!existingAdmin) {
      await User.create({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD, role: 'admin' });
      console.log(`Created admin user: ${ADMIN_USERNAME}`);
    }
  } catch (error) {
    console.error('Admin seed error:', error);
  }
};

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('Connected to MongoDB');
    await ensureAdminUser();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });