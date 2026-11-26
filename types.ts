
export enum UserRole {
  STUDENT = 'Student',
  CORRESPONDENCE = 'Correspondence',
  GOVERNMENT_ASPIRANT = 'Govt Aspirant'
}

export enum TopicStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed'
}

export interface User {
  email: string;
  name?: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  status: TopicStatus;
  importance: 'High' | 'Medium' | 'Low';
}

export interface Module {
  id: string;
  title: string;
  topics: Topic[];
}

export interface TimetableTask {
  topicTitle: string;
  moduleTitle: string;
  duration: number;
  goal: string;
  importance: 'High' | 'Medium' | 'Low';
}

export interface TimetableDay {
  dayNumber: number;
  tasks: TimetableTask[];
}

export interface Timetable {
  days: TimetableDay[];
  summary: string;
  isFallback?: boolean;
  error?: string;
}

export interface Syllabus {
  id: string;
  userEmail: string; // Scoping data to user
  title: string;
  description: string;
  role: UserRole;
  modules: Module[];
  timetable?: Timetable;
  examDate?: string;
  dailyStudyHours?: number;
  createdAt: string;
  isFallback?: boolean;
  error?: string;
}

export interface AppState {
  userRole: UserRole | null;
  currentSyllabus: Syllabus | null;
  history: Syllabus[];
  isLoading: boolean;
  error: string | null;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

