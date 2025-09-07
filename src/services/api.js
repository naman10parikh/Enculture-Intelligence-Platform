/**
 * API service for Enculture platform backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * Chat service for handling AI chat functionality
 */
export class ChatService {
  constructor() {
    this.baseUrl = `${API_BASE_URL}/chat`;
  }

  /**
   * Send a chat message and get streaming response
   * @param {Array} messages - Array of chat messages
   * @param {string} persona - User persona (ceo, hr_admin, manager, employee)
   * @param {boolean} useTools - Whether to enable web search tools
   * @returns {AsyncGenerator} Streaming response chunks
   */
  async *streamChat(messages, persona = null, useTools = true) {
    try {
      const payload = {
        messages: messages.map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: msg.timestamp?.toISOString()
        })),
        persona,
        use_tools: useTools,
        stream: true
      };

      const response = await fetch(`${this.baseUrl}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.error) {
                  throw new Error(data.error);
                }
                
                if (data.done) {
                  return;
                }
                
                if (data.content) {
                  yield data.content;
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Streaming chat error:', error);
      yield `I apologize, but I encountered an error: ${error.message}. Please try again.`;
    }
  }

  /**
   * Send a chat message and get complete response (non-streaming)
   * @param {Array} messages - Array of chat messages
   * @param {string} persona - User persona
   * @param {boolean} useTools - Whether to enable web search tools
   * @returns {Promise<string>} Complete response
   */
  async sendChat(messages, persona = null, useTools = true) {
    try {
      const payload = {
        messages: messages.map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: msg.timestamp?.toISOString()
        })),
        persona,
        use_tools: useTools,
        stream: false
      };

      const response = await fetch(`${this.baseUrl}/completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Chat completion error:', error);
      return `I apologize, but I encountered an error: ${error.message}. Please try again.`;
    }
  }

  /**
   * Generate survey questions using AI
   * @param {string} context - Survey context
   * @param {number} numQuestions - Number of questions to generate
   * @param {Array<string>} questionTypes - Types of questions
   * @param {string} persona - User persona
   * @returns {Promise<Array>} Generated survey questions
   */
  async generateSurvey(context, numQuestions = 5, questionTypes = ['multiple_choice', 'rating', 'text'], persona = null) {
    try {
      const payload = {
        context,
        num_questions: numQuestions,
        question_types: questionTypes,
        persona
      };

      const response = await fetch(`${this.baseUrl}/generate-survey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.questions;
    } catch (error) {
      console.error('Survey generation error:', error);
      return [];
    }
  }

  /**
   * Check chat service health
   * @returns {Promise<boolean>} Service health status
   */
  async checkHealth() {
    try {
      // Health endpoint is at root level, not under /api/v1
      const healthUrl = API_BASE_URL.replace('/api/v1', '') + '/health';
      const response = await fetch(healthUrl);
      return response.ok;
    } catch (error) {
      console.error('Health check error:', error);
      return false;
    }
  }

  /**
   * Generate survey template using AI
   * @param {string} description - Natural language description of desired survey
   * @param {string} type - Survey type (default: 'culture')
   * @param {string} targetAudience - Target audience (default: 'employees')
   * @returns {Promise<Object>} Generated survey template
   */
  async generateSurveyTemplate(description, type = 'culture', targetAudience = 'employees') {
    try {
      const payload = {
        description,
        type,
        target_audience: targetAudience
      };

      const response = await fetch(`${this.baseUrl}/generate-survey-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const template = await response.json();
      return template;
    } catch (error) {
      console.error('Survey template generation error:', error);
      return null;
    }
  }
}

/**
 * Global chat service instance
 */
export const chatService = new ChatService();

/**
 * General API utilities
 */
export class ApiService {
  static async checkBackendHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return null;
    }
  }

  static getApiBaseUrl() {
    return API_BASE_URL;
  }
}

export default {
  ChatService,
  ApiService,
  chatService
};
