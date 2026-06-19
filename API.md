# API Documentation

## `GET /api/health`
Check if the API is running smoothly.

## `GET /api/questions`
Fetch all questions.
**Query Parameters:**
- `skip` (int): Number of items to skip (default: 0).
- `limit` (int): Max number of items to return (default: 100).

## `POST /api/questions`
Create a new question.

## `POST /api/smart/generate`
Auto-generate a question based on a topic.

## `GET /api/data`
Retrieve data formatted for the Dashboard Heatmap and Radar charts.
