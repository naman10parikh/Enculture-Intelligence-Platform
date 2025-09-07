const API_BASE_URL = 'http://localhost:8000/api/v1';

export const chatThreadsApi = {
  // Create a new chat thread
  createThread: async (title = null) => {
    const response = await fetch(`${API_BASE_URL}/chat/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to create chat thread');
    }

    return response.json();
  },

  // Get all chat threads
  getThreads: async (limit = 50, offset = 0) => {
    const response = await fetch(`${API_BASE_URL}/chat/threads?limit=${limit}&offset=${offset}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to fetch chat threads');
    }

    return response.json();
  },

  // Get recent threads for sidebar
  getRecentThreads: async (limit = 10) => {
    const response = await fetch(`${API_BASE_URL}/chat/threads/recent?limit=${limit}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to fetch recent threads');
    }

    return response.json();
  },

  // Get a specific thread with all messages
  getThread: async (threadId) => {
    const response = await fetch(`${API_BASE_URL}/chat/threads/${threadId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to fetch chat thread');
    }

    return response.json();
  },

  // Delete a thread
  deleteThread: async (threadId) => {
    const response = await fetch(`${API_BASE_URL}/chat/threads/${threadId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to delete chat thread');
    }

    return response.json();
  },

  // Update thread title
  updateThreadTitle: async (threadId, title) => {
    const response = await fetch(`${API_BASE_URL}/chat/threads/${threadId}/title`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to update thread title');
    }

    return response.json();
  },

  // Search chat threads
  searchThreads: async (query, limit = 20) => {
    const response = await fetch(`${API_BASE_URL}/chat/threads/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to search chat threads');
    }

    return response.json();
  },

  // Stream chat with thread persistence
  streamChatWithThread: async (threadId, prompt, onChunkReceived) => {
    const response = await fetch(`${API_BASE_URL}/chat/stream-with-thread?thread_id=${threadId}&prompt=${encodeURIComponent(prompt)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to get streaming response from backend');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onChunkReceived(data);
          } catch (e) {
            console.warn('Failed to parse SSE data:', line);
          }
        }
      }
    }
  },
};
