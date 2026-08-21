export type EmployeeRole = "manager" | "sales";
export type ModuleType = "video" | "article";
export type CourseStatus = "draft" | "published" | "archived";

export interface Employee {
  id: string;
  full_name: string;
  employee_role: EmployeeRole;
  department: string | null;
  is_admin: boolean;
}

export interface AgendaItem {
  title: string;
  summary: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  full_description: string | null;
  agenda: AgendaItem[];
  cover_image_url: string | null;
  category: string | null;
  status: CourseStatus;
  pass_threshold_pct: number;
}

export interface Module {
  id: string;
  course_id: string;
  order_index: number;
  type: ModuleType;
  title: string;
  body: string | null;
  video_url: string | null;
  doc_name: string | null;
  doc_url: string | null;
}

export interface QuizQuestion {
  id: string;
  module_id: string;
  order_index: number;
  question_text: string;
  quiz_options: QuizOption[];
}

export interface QuizOption {
  id: string;
  question_id: string;
  order_index: number;
  option_text: string;
  is_correct: boolean;
}

export interface Enrollment {
  id: string;
  employee_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
}

export interface ModuleProgress {
  id: string;
  employee_id: string;
  module_id: string;
  completed: boolean;
  best_score_pct: number | null;
  attempts: number;
  completed_at: string | null;
}

export interface Certificate {
  id: string;
  employee_id: string;
  course_id: string;
  cert_number: string;
  issued_at: string;
}

export interface LeaderboardRow {
  course_id: string;
  employee_id: string;
  full_name: string;
  employee_role: EmployeeRole;
  avg_score_pct: number | null;
  modules_completed: number;
  modules_total: number;
  completed_at: string | null;
  rank: number;
}

export interface CourseRating {
  course_id: string;
  avg_rating: number;
  rating_count: number;
}

export interface CourseFeedback {
  id: string;
  employee_id: string;
  course_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}
