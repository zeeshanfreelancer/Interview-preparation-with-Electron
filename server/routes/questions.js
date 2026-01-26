const express = require('express');
const router = express.Router();
const Question = require('../models/Question');

// Get all questions for a language
router.get('/:language', async (req, res) => {
  try {
    const { language } = req.params;
    const questions = await Question.find({ language }).sort({ createdAt: -1 });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all languages
router.get('/', async (req, res) => {
  try {
    const languages = await Question.distinct('language');
    res.json(languages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new question
router.post('/', async (req, res) => {
  try {
    const { language, question, answer } = req.body;

    if (!language || !question) {
      return res.status(400).json({ message: 'Language and question are required' });
    }

    const newQuestion = new Question({
      language,
      question,
      answer: answer || ''
    });

    const savedQuestion = await newQuestion.save();
    res.status(201).json(savedQuestion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update question
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer } = req.body;

    const updatedQuestion = await Question.findByIdAndUpdate(
      id,
      {
        question,
        answer,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!updatedQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json(updatedQuestion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete question
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedQuestion = await Question.findByIdAndDelete(id);

    if (!deletedQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search questions
router.get('/search/:language', async (req, res) => {
  try {
    const { language } = req.params;
    const { q } = req.query;

    if (!q) {
      return res.json([]);
    }

    const questions = await Question.find({
      language,
      $or: [
        { question: { $regex: q, $options: 'i' } },
        { answer: { $regex: q, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });

    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete all questions for a language (effectively deleting the language)
router.delete('/language/:language', async (req, res) => {
  try {
    const { language } = req.params;
    const result = await Question.deleteMany({ language });
    
    res.json({ 
      message: `Language '${language}' deleted successfully`, 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;