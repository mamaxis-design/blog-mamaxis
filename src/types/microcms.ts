export interface MicroCmsImage {
  url: string;
  width?: number;
  height?: number;
}

export interface Category {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  revisedAt?: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  eyecatch?: MicroCmsImage;
  category?: Category;
  tags?: string;
  metaTitle?: string;
  metaDescription?: string;
  publishedDate: string;
  publishedAt?: string;
  readingTime?: string;
  createdAt?: string;
  updatedAt?: string;
  revisedAt?: string;
}

export interface MicroCmsListResponse<T> {
  contents: T[];
  totalCount: number;
  offset: number;
  limit: number;
}
