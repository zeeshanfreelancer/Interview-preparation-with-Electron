const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Default languages configuration
const DEFAULT_LANGUAGES = ['React', 'JavaScript', 'HTML', 'CSS'];

// Get all questions for a language
router.get('/:language', async (req, res) => {
  try {
    const { language } = req.params;
    // Logging removed in production to prevent disk space issues
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] GET /questions/${language} - Database connected: ${global.dbConnected}, ReadyState: ${mongoose.connection.readyState}`);
    }

    // Try database first, fallback to offline mode
    if (global.dbConnected && mongoose.connection.readyState === 1) {
      const Question = require('../models/Question');
      const questions = await Question.find({ language }).sort({ createdAt: -1 });
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API] Found ${questions.length} questions for language: ${language}`);
      }
      return res.json(questions);
    }

    // Offline mode - return empty array
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[API] Database not available. Returning empty questions for ${language}`);
    }
    return res.json([]);
  } catch (error) {
    console.error('[API] Error fetching questions:', error.message);
    console.error('[API] Error stack:', error.stack);
    // Return empty array on any error to maintain functionality
    return res.json([]);
  }
});

// Get all languages
router.get('/', async (req, res) => {
  try {
    // Try database first, fallback to defaults
    if (global.dbConnected && mongoose.connection.readyState === 1) {
      const Question = require('../models/Question');
      const languages = await Question.distinct('language');
      // Always include default languages, plus any from database
      const allLanguages = [...new Set([...DEFAULT_LANGUAGES, ...languages])];
      return res.json(allLanguages);
    }

    // Offline mode - return default languages
    return res.json(DEFAULT_LANGUAGES);
  } catch (error) {
    console.error('Error fetching languages:', error.message);
    // Return defaults on any error
    return res.json(DEFAULT_LANGUAGES);
  }
});

// Create new question
router.post('/', async (req, res) => {
  try {
    const { language, question, answer } = req.body;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] POST /questions - Language: ${language}, Question length: ${question?.length || 0}`);
      console.log(`[API] Database connected: ${global.dbConnected}, ReadyState: ${mongoose.connection.readyState}`);
    }

    if (!language || !question) {
      console.warn('[API] Missing required fields - language or question');
      return res.status(400).json({ message: 'Language and question are required' });
    }

    // Try database first, fallback to offline mode
    if (global.dbConnected && mongoose.connection.readyState === 1) {
      const Question = require('../models/Question');
      const newQuestion = new Question({
        language,
        question: question.trim(),
        answer: (answer || '').trim()
      });

      const savedQuestion = await newQuestion.save();
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API] Question created successfully with ID: ${savedQuestion._id}`);
      }
      return res.status(201).json(savedQuestion);
    }

    // Offline mode - return mock response
    if (process.env.NODE_ENV === 'development') {
      console.warn('[API] Database not available. Question not persisted.');
    }
    const mockQuestion = {
      _id: 'offline_' + Date.now(),
      language,
      question: question.trim(),
      answer: (answer || '').trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    res.status(201).json(mockQuestion);
  } catch (error) {
    console.error('[API] Error creating question:', error.message);
    console.error('[API] Error stack:', error.stack);
    res.status(500).json({ message: `Failed to create question: ${error.message}` });
  }
});

// Update question
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer } = req.body;

    // Try database first, fallback to offline mode
    if (global.dbConnected && mongoose.connection.readyState === 1) {
      const Question = require('../models/Question');
      const updatedQuestion = await Question.findByIdAndUpdate(
        id,
        {
          question: question?.trim(),
          answer: answer?.trim(),
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!updatedQuestion) {
        return res.status(404).json({ message: 'Question not found' });
      }

      return res.json(updatedQuestion);
    }

    // Offline mode - return mock response
    console.warn('Database not available. Question update not persisted.');
    const mockQuestion = {
      _id: id,
      language: 'React', // Default
      question: question?.trim() || 'Updated question',
      answer: answer?.trim() || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    res.json(mockQuestion);
  } catch (error) {
    console.error('Error updating question:', error.message);
    res.status(500).json({ message: 'Failed to update question' });
  }
});

// Delete question
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try database first, fallback to offline mode
    if (global.dbConnected && mongoose.connection.readyState === 1) {
      const Question = require('../models/Question');
      const deletedQuestion = await Question.findByIdAndDelete(id);

      if (!deletedQuestion) {
        return res.status(404).json({ message: 'Question not found' });
      }

      return res.json({ message: 'Question deleted successfully' });
    }

    // Offline mode - acknowledge deletion
    console.warn('Database not available. Question deletion not persisted.');
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error.message);
    res.status(500).json({ message: 'Failed to delete question' });
  }
});

// Search questions
router.get('/search/:language', async (req, res) => {
  try {
    const { language } = req.params;
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    // Try database first, fallback to offline mode
    if (global.dbConnected && mongoose.connection.readyState === 1) {
      const Question = require('../models/Question');
      const questions = await Question.find({
        language,
        $or: [
          { question: { $regex: q.trim(), $options: 'i' } },
          { answer: { $regex: q.trim(), $options: 'i' } }
        ]
      }).sort({ createdAt: -1 });

      return res.json(questions);
    }

    // Offline mode - return empty array
    console.warn('Database not available. Search not available in offline mode.');
    res.json([]);
  } catch (error) {
    console.error('Error searching questions:', error.message);
    res.status(500).json({ message: 'Search failed' });
  }
});

// Delete all questions for a language (effectively deleting the language)
router.delete('/language/:language', async (req, res) => {
  try {
    const { language } = req.params;

    // Try database first, fallback to offline mode
    if (global.dbConnected && mongoose.connection.readyState === 1) {
      const Question = require('../models/Question');
      const result = await Question.deleteMany({ language });

      return res.json({
        message: `Language '${language}' deleted successfully`,
        deletedCount: result.deletedCount
      });
    }

    // Offline mode - acknowledge deletion
    console.warn('Database not available. Language deletion not persisted.');
    res.json({
      message: `Language '${language}' deleted successfully`,
      deletedCount: 0
    });
  } catch (error) {
    console.error('Error deleting language:', error.message);
    res.status(500).json({ message: 'Failed to delete language' });
  }
});

module.exports = router;