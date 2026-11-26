
import { Syllabus, User } from '../types';

const STORAGE_KEY_PREFIX = 'smart_syllabus_data_';
const SESSION_KEY = 'smart_syllabus_user';
const USERS_CREDENTIALS_KEY = 'smart_syllabus_auth';

export const StorageService = {
  // User Authentication
  registerUser: (email: string, password: string): boolean => {
    const authData = localStorage.getItem(USERS_CREDENTIALS_KEY);
    const users = authData ? JSON.parse(authData) : {};
    
    if (users[email]) {
      return false; // User already exists
    }
    
    users[email] = password;
    localStorage.setItem(USERS_CREDENTIALS_KEY, JSON.stringify(users));
    return true;
  },

  verifyUser: (email: string, password: string): boolean => {
    const authData = localStorage.getItem(USERS_CREDENTIALS_KEY);
    const users = authData ? JSON.parse(authData) : {};
    return users[email] === password;
  },

  userExists: (email: string): boolean => {
    const authData = localStorage.getItem(USERS_CREDENTIALS_KEY);
    const users = authData ? JSON.parse(authData) : {};
    return !!users[email];
  },

  // Session Management
  setCurrentUser: (user: User) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },
  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  },
  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  // Syllabus Scoped to Email
  saveSyllabus: (syllabus: Syllabus) => {
    const userEmail = syllabus.userEmail;
    const key = STORAGE_KEY_PREFIX + userEmail;
    const existing = StorageService.getHistory(userEmail);
    const updated = [syllabus, ...existing.filter(s => s.id !== syllabus.id)];
    localStorage.setItem(key, JSON.stringify(updated));
  },

  getHistory: (email: string): Syllabus[] => {
    const key = STORAGE_KEY_PREFIX + email;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  updateTopicStatus: (syllabusId: string, moduleId: string, topicId: string, status: any): Syllabus | null => {
    const currentUser = StorageService.getCurrentUser();
    if (!currentUser) return null;

    const history = StorageService.getHistory(currentUser.email);
    const syllabus = history.find(s => s.id === syllabusId);
    
    if (syllabus) {
      const module = syllabus.modules.find(m => m.id === moduleId);
      if (module) {
        const topic = module.topics.find(t => t.id === topicId);
        if (topic) {
          topic.status = status;
          StorageService.saveSyllabus(syllabus);
          return syllabus;
        }
      }
    }
    return null;
  },

  deleteSyllabus: (id: string, email: string) => {
    const key = STORAGE_KEY_PREFIX + email;
    const history = StorageService.getHistory(email);
    const updated = history.filter(s => s.id !== id);
    localStorage.setItem(key, JSON.stringify(updated));
  }
};
