const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// GET /api/tasks/stats - Get summary counts for dashboard
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const [total, completed, pending, highPriorityPending, overdue] = await Promise.all([
      Task.countDocuments({}),
      Task.countDocuments({ status: 'Completed' }),
      Task.countDocuments({ status: 'Pending' }),
      Task.countDocuments({ status: 'Pending', priority: 'High' }),
      Task.countDocuments({ status: 'Pending', dueDate: { $lt: now } })
    ]);

    res.json({
      success: true,
      data: {
        total,
        completed,
        pending,
        highPriorityPending,
        overdue
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task statistics',
      error: error.message
    });
  }
});

// GET /api/tasks - Retrieve all tasks with optional filters and search
router.get('/', async (req, res) => {
  try {
    const { status, priority, subject, search, sortBy = 'dueDate', order = 'asc' } = req.query;

    const query = {};

    // Filter by status (Pending / Completed)
    if (status && ['Pending', 'Completed'].includes(status)) {
      query.status = status;
    }

    // Filter by priority (Low / Medium / High)
    if (priority && ['Low', 'Medium', 'High'].includes(priority)) {
      query.priority = priority;
    }

    // Filter by subject
    if (subject && subject.trim() !== '') {
      query.subject = { $regex: subject.trim(), $options: 'i' };
    }

    // Text search query across title, subject, and description
    if (search && search.trim() !== '') {
      const regex = { $regex: search.trim(), $options: 'i' };
      query.$or = [{ title: regex }, { subject: regex }, { description: regex }];
    }

    // Sort order
    const sortOptions = {};
    const sortDirection = order === 'desc' ? -1 : 1;
    if (sortBy === 'priority') {
      // Custom sorting priority handled in query or JS if needed, or by string
      sortOptions.priority = sortDirection;
    } else if (sortBy === 'createdAt') {
      sortOptions.createdAt = sortDirection;
    } else if (sortBy === 'title') {
      sortOptions.title = sortDirection;
    } else {
      sortOptions.dueDate = sortDirection;
    }

    const tasks = await Task.find(query).sort(sortOptions);

    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
});

// GET /api/tasks/:id - Retrieve single task by ID
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task',
      error: error.message
    });
  }
});

// POST /api/tasks - Create a new task
router.post('/', async (req, res) => {
  try {
    const { title, subject, dueDate, priority, status, description } = req.body;

    // Basic validation
    if (!title || !subject || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, subject, and due date are required fields.'
      });
    }

    const newTask = new Task({
      title: title.trim(),
      subject: subject.trim(),
      dueDate: new Date(dueDate),
      priority: priority || 'Medium',
      status: status || 'Pending',
      description: description ? description.trim() : ''
    });

    const savedTask = await newTask.save();

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: savedTask
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create task'
    });
  }
});

// PUT /api/tasks/:id - Update an existing task
router.put('/:id', async (req, res) => {
  try {
    const { title, subject, dueDate, priority, status, description } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (title !== undefined) task.title = title.trim();
    if (subject !== undefined) task.subject = subject.trim();
    if (dueDate !== undefined) task.dueDate = new Date(dueDate);
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;
    if (description !== undefined) task.description = description.trim();

    const updatedTask = await task.save();

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update task'
    });
  }
});

// PATCH /api/tasks/:id/toggle - Toggle task between Pending & Completed
router.patch('/:id/toggle', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    task.status = task.status === 'Completed' ? 'Pending' : 'Completed';
    const updatedTask = await task.save();

    res.json({
      success: true,
      message: `Task marked as ${updatedTask.status}`,
      data: updatedTask
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update task status',
      error: error.message
    });
  }
});

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    if (!deletedTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully',
      data: deletedTask
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete task',
      error: error.message
    });
  }
});

module.exports = router;
