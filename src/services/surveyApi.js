/**
 * Survey API service for managing surveys and responses
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class SurveyService {
  constructor() {
    this.baseUrl = `${API_BASE_URL}/surveys`;
  }

  /**
   * Create a new survey
   * @param {Object} surveyData - Survey data
   * @returns {Promise<Object>} Created survey
   */
  async createSurvey(surveyData) {
    try {
      const response = await fetch(`${this.baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(surveyData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating survey:', error);
      throw error;
    }
  }

  /**
   * Publish a survey to target audience
   * @param {string} surveyId - Survey ID
   * @param {Array<string>} targetAudience - Array of user IDs
   * @returns {Promise<Object>} Publish result
   */
  async publishSurvey(surveyId, targetAudience) {
    try {
      const response = await fetch(`${this.baseUrl}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          survey_id: surveyId,
          target_audience: targetAudience,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error publishing survey:', error);
      throw error;
    }
  }

  /**
   * Get all surveys
   * @returns {Promise<Object>} Surveys list
   */
  async getAllSurveys() {
    try {
      const response = await fetch(`${this.baseUrl}/list`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching surveys:', error);
      throw error;
    }
  }

  /**
   * Get a specific survey by ID
   * @param {string} surveyId - Survey ID
   * @returns {Promise<Object>} Survey data
   */
  async getSurvey(surveyId) {
    try {
      const response = await fetch(`${this.baseUrl}/${surveyId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching survey:', error);
      throw error;
    }
  }

  /**
   * Submit survey response
   * @param {string} surveyId - Survey ID
   * @param {string} userId - User ID
   * @param {Object} responses - Survey responses
   * @returns {Promise<Object>} Submission result
   */
  async submitSurveyResponse(surveyId, userId, responses) {
    try {
      const response = await fetch(`${this.baseUrl}/submit-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          survey_id: surveyId,
          user_id: userId,
          responses: responses,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting survey response:', error);
      throw error;
    }
  }

  /**
   * Get all responses for a survey
   * @param {string} surveyId - Survey ID
   * @returns {Promise<Object>} Survey responses
   */
  async getSurveyResponses(surveyId) {
    try {
      const response = await fetch(`${this.baseUrl}/${surveyId}/responses`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching survey responses:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const surveyService = new SurveyService();
export default surveyService;
