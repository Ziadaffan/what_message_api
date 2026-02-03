const { server } = require('./app');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

startServer();
