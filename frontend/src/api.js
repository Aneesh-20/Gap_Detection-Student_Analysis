import API_BASE from './config';

export const fetchQuestions = async (skip = 0, limit = 100) => {
  const response = await fetch(`${API_BASE}/api/questions?skip=${skip}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch questions');
  return response.json();
};

export const fetchDashboardData = async () => {
  const response = await fetch(`${API_BASE}/api/data`);
  if (!response.ok) throw new Error('Failed to fetch dashboard data');
  return response.json();
};
