const bcrypt = require('bcryptjs');

async function generateHash() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const clientHash = await bcrypt.hash('client123', 10);

  console.log('Admin hash:', adminHash);
  console.log('Client hash:', clientHash);
}

generateHash();
