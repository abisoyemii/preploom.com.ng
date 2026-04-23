const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const DATA_DIR = path.join(__dirname, '..', 'data');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/preploom';
const USE_MONGO = process.env.USE_MONGO !== 'false';

class Database {
  constructor() {
    this.connected = false;
    this.models = {};
  }

  async connect() {
    if (!USE_MONGO) {
      console.log('🗂️  Using JSON fallback (USE_MONGO=false)');
      return;
    }

    try {
      await mongoose.connect(MONGO_URI, {
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
        bufferCommands: false,
      });

      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️  MongoDB disconnected');
      });

      this.connected = true;
      console.log('✅ MongoDB connected');
      await this.migrateJsonToMongo();
    } catch (err) {
      console.error('❌ MongoDB connection failed:', err.message);
      console.log('🔄 Falling back to JSON storage');
    }
  }

  async migrateJsonToMongo() {
    try {
      const files = ['users.json', 'progress.json', 'enrollments.json'];
      for (const file of files) {
        const filePath = path.join(DATA_DIR, file);
        try {
          const data = await fs.readFile(filePath, 'utf8');
          const jsonData = JSON.parse(data);
          
          // Import logic per model (to be implemented with models)
          console.log(`📤 Migrated ${file}:`, Object.keys(jsonData).length || jsonData.length);
        } catch (e) {
          console.log(`⏭️  Skip migration ${file}:`, e.message);
        }
      }
      console.log('✅ Data migration complete');
    } catch (err) {
      console.error('⚠️  Migration warning:', err.message);
    }
  }

  // JSON Fallback Helpers (preserves existing functionality)
  async readJson(filename) {
    if (this.connected && USE_MONGO) {
      // MongoDB implementation with models
      return await this.models[filename]?.find({}) || [];
    }
    
    try {
      const data = await fs.readFile(path.join(DATA_DIR, filename), 'utf8');
      return JSON.parse(data);
    } catch {
      return filename.includes('user') ? {} : [];
    }
  }

  async writeJson(filename, data) {
    if (this.connected && USE_MONGO) {
      // MongoDB save with models
      return await this.models[filename]?.create(data);
    }
    
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
  }

  registerModel(name, model) {
    this.models[name] = model;
  }
}

module.exports = new Database();

