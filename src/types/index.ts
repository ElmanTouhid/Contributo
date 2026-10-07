export type UserRole = 'student' | 'contributor' | 'admin';

export interface StudentUser {
  id: string;
  name: string;
  universityId: string; // Strictly "C" followed by 6 digits (e.g., C253124)
  role: UserRole;
  department: string;
  batch?: string;
  avatarSeed?: string;
  createdAt: string;
  lastLogin: string;
  hashedPassword: string; // Stored securely
}

export type ResourceType = 'video' | 'playlist';

export interface AcademicResource {
  id: string;
  courseId: string;
  resourceType: ResourceType; // 'video' | 'playlist'
  title: string;
  topic: string;
  description: string;
  youtubeUrl: string;
  sharedBy: string; // Name of the student who shared it
  studentId?: string; // University ID / ID of submitter
  creator?: string; // Optional channel/creator name if extracted or entered
  youtubeVideoId?: string;
  playlistId?: string;
  dateAdded: string;
  tags?: string[];
}

export interface Chapter {
  id: string;
  courseId: string;
  number: number;
  title: string;
  description: string;
  resources: AcademicResource[];
}

export interface Course {
  id: string;
  code: string; // e.g. "CHEM-2301"
  name: string; // e.g. "Chemistry"
  department: string;
  credits: number;
  description: string;
  term: string;
  resources: AcademicResource[]; // Course → YouTube Resources
  chapters?: Chapter[];
}

export interface UserHistoryItem {
  id: string;
  studentId: string; // Scoped to student
  resourceId: string;
  watchedAt: string;
  completed: boolean;
}

export interface UserFavoriteItem {
  id: string;
  studentId: string; // Scoped to student
  resourceId: string;
  addedAt: string;
}

export type ActiveNavTab = 
  | 'dashboard' 
  | 'courses' 
  | 'course-detail' 
  | 'search' 
  | 'favorites' 
  | 'history' 
  | 'profile' 
  | 'settings' 
  | 'admin';
