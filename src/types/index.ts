export type ExamSection = 'Mid-Term' | 'Final Group-A' | 'Final Group-B';

export type ResourceType = 'video' | 'playlist';

export type ReportReason =
  | 'Spam'
  | 'Wrong course/segment'
  | 'Inappropriate'
  | 'Broken link or file'
  | 'Other';

export interface Course {
  id: string;
  code: string;
  title: string;
  department: string;
  shortDesc: string;
  color: string;
  badge: string;
}

export interface Segment {
  id: string;
  course_id: string;
  segment_number: number;
  title: string;
  subtopics: string;
  exam_section: ExamSection;
}

export interface YouTubeResource {
  id: string;
  course_id: string;
  segment_id: string;
  youtube_url: string;
  youtube_id: string;
  resource_type: ResourceType;
  title: string;
  topic: string;
  description: string;
  contributor_id: string;
  contributor_name: string;
  created_at: string;
}

export interface FileResource {
  id: string;
  course_id: string;
  segment_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  title: string;
  description: string;
  contributor_id: string;
  contributor_name: string;
  created_at: string;
}

export interface Report {
  id?: string;
  resource_kind: 'youtube' | 'file';
  resource_id: string;
  reporter_id: string;
  reason: ReportReason;
  created_at?: string;
}

export interface RegisteredStudent {
  userId: string;
  email: string;
  universityEmail: string; // backwards compatibility alias for existing components
  studentId: string;
  displayName: string;
  createdAt?: string;
}

export interface StudentProfile {
  id: string;
  displayName: string;
  universityId: string; // kept private, never displayed on resources
  department?: string;
  semester?: string;
  avatarColor?: string;
}

export interface SegmentResourceCount {
  segmentId: string;
  videoCount: number;
  fileCount: number;
}

export interface CourseResourceCount {
  courseId: string;
  totalResources: number;
  videoCount: number;
  fileCount: number;
}
