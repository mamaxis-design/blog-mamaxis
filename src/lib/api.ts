const BASE_URL = `https://${import.meta.env.MICROCMS_SERVICE_DOMAIN}.microcms.io/api/v1`;
const API_KEY = import.meta.env.MICROCMS_API_KEY;

const microfetch = async (path: string, params?: Record<string, string>) => {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    headers: { "X-MICROCMS-API-KEY": API_KEY },
  });
  return res.json();
};

export const getPosts = async () => {
  const data = await microfetch("/posts", {
    limit: "100",
    orders: "-publishedAt",
    depth: "2",
  });
  return data.contents;
};

export const getPostDetail = async (slug: string) => {
  const data = await microfetch("/posts", {
    filters: `slug[equals]${slug}`,
    depth: "2",
  });
  return data.contents[0];
};

export const getCategories = async () => {
  const data = await microfetch("/categories");
  return data.contents;
};