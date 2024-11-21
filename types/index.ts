export interface TaskStatus {
  status: string;
  url: string;
  result?: string;
  mindmap?: string;
}

export interface ProcessResponse {
  task_ids: string[];
}

export interface UploadResponse {
  task_id: string;
} 