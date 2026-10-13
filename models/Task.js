const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters long'],
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    subject: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      maxlength: [50, 'Subject name cannot exceed 50 characters']
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    priority: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High'],
        message: 'Priority must be Low, Medium, or High'
      },
      default: 'Medium'
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'Completed'],
        message: 'Status must be Pending or Completed'
      },
      default: 'Pending'
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters']
    }
  },
  {
    timestamps: true
  }
);

// Virtual helper to check if task is overdue
taskSchema.virtual('isOverdue').get(function () {
  if (this.status === 'Completed') return false;
  return new Date(this.dueDate) < new Date();
});

// Ensure virtual fields are serialized
taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
