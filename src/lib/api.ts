import type { Category, MicroCmsListResponse, Post } from '../types/microcms';

const BASE_URL = `https://${import.meta.env.MICROCMS_SERVICE_DOMAIN}.microcms.io/api/v1`;
const API_KEY = import.meta.env.MICROCMS_API_KEY;

const microfetch = async <T>(path: string, params?: Record<string, string>): Promise<T> => {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    headers: { 'X-MICROCMS-API-KEY': API_KEY },
  });
  if (!res.ok) {
    throw new Error(`microCMS API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
};

export const getPosts = async (): Promise<Post[]> => {
  const data = await microfetch<MicroCmsListResponse<Post>>('/posts', {
    limit: '100',
    orders: '-publishedDate',
    depth: '2',
  });
  return data.contents;
};

export const getPostDetail = async (slug: string): Promise<Post> => {
  const data = await microfetch<MicroCmsListResponse<Post>>('/posts', {
    filters: `slug[equals]${slug}`,
    depth: '2',
  });
  const post = data.contents[0];
  if (!post) {
    throw new Error(`Post not found: ${slug}`);
  }
  return post;
};

export const getCategories = async (): Promise<Category[]> => {
  const data = await microfetch<MicroCmsListResponse<Category>>('/categories');
  return data.contents;
};
