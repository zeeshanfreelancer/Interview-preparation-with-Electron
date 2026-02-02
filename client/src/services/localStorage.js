const STORAGE_KEY = 'interview-questions';
const LANGUAGES_KEY = 'interview-languages';

export const localStorageService = {
  // Questions
  getQuestions(language) {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return data[language] || [];
    } catch (error) {
      console.error('Error reading questions:', error);
      return [];
    }
  },

  createQuestion(questionData) {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (!data[questionData.language]) {
        data[questionData.language] = [];
      }
      
      const newQuestion = {
        ...questionData,
        _id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      data[questionData.language].push(newQuestion);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return newQuestion;
    } catch (error) {
      console.error('Error creating question:', error);
      throw new Error('Failed to create question');
    }
  },

  updateQuestion(id, questionData) {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      
      for (const language in data) {
        const questionIndex = data[language].findIndex(q => q._id === id);
        if (questionIndex !== -1) {
          data[language][questionIndex] = {
            ...data[language][questionIndex],
            ...questionData,
            updatedAt: new Date().toISOString()
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          return data[language][questionIndex];
        }
      }
      throw new Error('Question not found');
    } catch (error) {
      console.error('Error updating question:', error);
      throw new Error('Failed to update question');
    }
  },

  deleteQuestion(id) {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      
      for (const language in data) {
        const questionIndex = data[language].findIndex(q => q._id === id);
        if (questionIndex !== -1) {
          data[language].splice(questionIndex, 1);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          return true;
        }
      }
      throw new Error('Question not found');
    } catch (error) {
      console.error('Error deleting question:', error);
      throw new Error('Failed to delete question');
    }
  },

  searchQuestions(language, query) {
    try {
      const questions = this.getQuestions(language);
      return questions.filter(q => 
        q.question.toLowerCase().includes(query.toLowerCase()) ||
        q.answer.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching questions:', error);
      return [];
    }
  },

  // Languages
  getLanguages() {
    try {
      const languages = JSON.parse(localStorage.getItem(LANGUAGES_KEY) || '[]');
      return languages;
    } catch (error) {
      console.error('Error reading languages:', error);
      return [];
    }
  },

  saveLanguages(languages) {
    try {
      localStorage.setItem(LANGUAGES_KEY, JSON.stringify(languages));
    } catch (error) {
      console.error('Error saving languages:', error);
    }
  },

  deleteLanguage(language) {
    try {
      // Remove language from languages list
      const languages = this.getLanguages().filter(lang => lang !== language);
      this.saveLanguages(languages);
      
      // Remove all questions for this language
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      delete data[language];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      
      return true;
    } catch (error) {
      console.error('Error deleting language:', error);
      throw new Error('Failed to delete language');
    }
  },

  // Health check (always returns OK for localStorage)
  healthCheck() {
    return Promise.resolve({
      status: 'OK',
      message: 'localStorage is available',
      timestamp: new Date().toISOString()
    });
  },

  // Database status (localStorage info)
  getDatabaseStatus() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const totalQuestions = Object.values(data).reduce((sum, questions) => sum + questions.length, 0);
      const questionsByLanguage = {};
      
      for (const [language, questions] of Object.entries(data)) {
        questionsByLanguage[language] = questions.length;
      }
      
      return Promise.resolve({
        connected: true,
        totalQuestions,
        questionsByLanguage,
        storageUsed: JSON.stringify(data).length
      });
    } catch (error) {
      return Promise.resolve({
        connected: false,
        error: error.message,
        totalQuestions: 0,
        questionsByLanguage: {}
      });
    }
  }
};