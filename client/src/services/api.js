const API_BASE_URL = 'http://localhost:3000/api';

// API service functions
export const apiService = {
  // Questions
  async getQuestions(language) {
    try {
      const response = await fetch(`${API_BASE_URL}/questions/${language}`);
      if (!response.ok) throw new Error('Failed to fetch questions');
      return await response.json();
    } catch (error) {
      console.error('Error fetching questions:', error);
      throw error;
    }
  },

  async createQuestion(questionData) {
    try {
      const response = await fetch(`${API_BASE_URL}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionData),
      });
      if (!response.ok) throw new Error('Failed to create question');
      return await response.json();
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  },

  async updateQuestion(id, questionData) {
    try {
      const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionData),
      });
      if (!response.ok) throw new Error('Failed to update question');
      return await response.json();
    } catch (error) {
      console.error('Error updating question:', error);
      throw error;
    }
  },

  async deleteQuestion(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete question');
      return await response.json();
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  },

  async searchQuestions(language, query) {
    try {
      const response = await fetch(`${API_BASE_URL}/questions/search/${language}?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Failed to search questions');
      return await response.json();
    } catch (error) {
      console.error('Error searching questions:', error);
      throw error;
    }
  },

  // Languages
  async getLanguages() {
    try {
      const response = await fetch(`${API_BASE_URL}/languages`);
      if (!response.ok) throw new Error('Failed to fetch languages');
      return await response.json();
    } catch (error) {
      console.error('Error fetching languages:', error);
      throw error;
    }
  },

  async deleteLanguage(language) {
    try {
      const response = await fetch(`${API_BASE_URL}/questions/language/${language}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete language');
      return await response.json();
    } catch (error) {
      console.error('Error deleting language:', error);
      throw error;
    }
  },

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) throw new Error('Server not responding');
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
};