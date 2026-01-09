export interface Category {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
}
