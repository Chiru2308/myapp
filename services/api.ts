import { Syllabus, User } from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('smart_syllabus_token');
}

function setToken(token: string) {
  localStorage.setItem('smart_syllabus_token', token);
}

function clearAuth() {
  localStorage.removeItem('smart_syllabus_token');
  localStorage.removeItem('smart_syllabus_user');
}

function storeUser(user: User) {
  localStorage.setItem('smart_syllabus_user', JSON.stringify(user));
}

function readStoredUser(): User | null {
  const data = localStorage.getItem('smart_syllabus_user');
  return data ? JSON.parse(data) : null;
}

async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) clearAuth();
    throw new Error(data.message || `Request failed: ${res.status}`);
  }
  return data as T;
}

export const ApiService = {
  registerUser: async (email: string, password: string): Promise<User> => {
    const { token, user } = await fetchApi<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(token);
    storeUser(user);
    return user;
  },

  loginUser: async (email: string, password: string): Promise<User> => {
    const { token, user } = await fetchApi<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(token);
    storeUser(user);
    return user;
  },

  logout: () => {
    clearAuth();
  },

  getCurrentUser: (): User | null => readStoredUser(),

  isAuthenticated: (): boolean => !!getToken(),

  getHistory: async (email: string): Promise<Syllabus[]> => {
    const syllabi = await fetchApi<Syllabus[]>('/syllabi');
    return syllabi;
  },

  saveSyllabus: async (syllabus: Syllabus): Promise<Syllabus> => {
    return fetchApi<Syllabus>('/syllabi', {
      method: 'POST',
      body: JSON.stringify(syllabus),
    });
  },

  updateTopicStatus: async (
    syllabusId: string,
    moduleId: string,
    topicId: string,
    status: string
  ): Promise<Syllabus | null> => {
    return fetchApi<Syllabus>(`/syllabi/${syllabusId}/topic-status`, {
      method: 'PATCH',
      body: JSON.stringify({ moduleId, topicId, status }),
    });
  },

  deleteSyllabus: async (id: string): Promise<void> => {
    await fetchApi(`/syllabi/${id}`, { method: 'DELETE' });
  },
};
