require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Task = require('./models/Task');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/tasks', taskRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Seed helper to give evaluators realistic sample data on initial run
async function seedInitialDataIfEmpty() {
  try {
    const count = await Task.countDocuments();
    if (count === 0) {
      console.log('📦 Database is empty. Seeding initial student tasks...');
      const sampleTasks = [
        {
          title: 'Submit FST Assignment 1',
          subject: 'Full Stack Technologies',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          priority: 'High',
          status: 'Pending',
          description: 'Complete CRUD application using HTML, CSS, JavaScript, Node.js and MongoDB.'
        },
        {
          title: 'Design Database Schema for Project',
          subject: 'DBMS',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          priority: 'Medium',
          status: 'Pending',
          description: 'Draw ER diagram and normalize tables up to 3NF.'
        },
        {
          title: 'Computer Networks Packet Tracer Lab',
          subject: 'Computer Networks',
          dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          priority: 'High',
          status: 'Pending',
          description: 'Configure router subnets and test ping connectivity.'
        },
        {
          title: 'Review Operating Systems Unit 2 Notes',
          subject: 'Operating Systems',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          priority: 'Low',
          status: 'Completed',
          description: 'Read CPU scheduling algorithms: FCFS, SJF, and Round Robin.'
        }
      ];
      await Task.insertMany(sampleTasks);
      console.log(' Initial student tasks seeded successfully.');
    }
  } catch (err) {
    console.error('Error seeding initial data:', err.message);
  }
}

// Connect to MongoDB Atlas
if (!MONGODB_URI) {
  console.error('CRITICAL ERROR: MONGODB_URI is not defined in .env file!');
  process.exit(1);
}

// Start Server
app.listen(PORT, () => {
  console.log('========================================================');
  console.log(`🚀 Student Task Manager Server is LIVE!`);
  console.log(`🌐 Open in your browser: http://localhost:${PORT}`);
  console.log(`⚡ Keep this terminal open while using the app`);
  console.log('========================================================');

  mongoose
    .connect(MONGODB_URI)
    .then(async () => {
      console.log('✅ Connected to MongoDB Atlas successfully.');
      await seedInitialDataIfEmpty();
    })
    .catch((err) => {
      console.error('❌ MongoDB Atlas Connection Error:', err.message);
    });
});
