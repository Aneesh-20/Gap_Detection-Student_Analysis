# Gap Detection & Student Analysis 🧠

A comprehensive full-stack application designed to analyze student responses using **Item Response Theory (IRT)** and clustering techniques. This tool helps educators identify learning gaps, evaluate question difficulty, and group students based on their performance across various topics.

## 🚀 Features

- **Item Response Theory (IRT) Analysis**: Accurately estimates student ability and question difficulty/discrimination.
- **Student Clustering**: Groups students using KMeans clustering to identify performance cohorts.
- **Interactive Dashboards**: Visualizes data through Heatmaps and Radar charts to track subject-specific skills.
- **Bulk Import**: Easily import questions and student responses via CSV.
- **Mock LLM Integration**: Generates questions and auto-tags them by topic.

## 🛠️ Tech Stack

### Backend
- **FastAPI**: High-performance API framework.
- **Pandas & NumPy**: Data manipulation and numerical operations.
- **girth**: IRT model fitting.
- **scikit-learn**: KMeans clustering.

### Frontend
- **React + Vite**: Fast and modern frontend framework.
- **D3.js**: Custom data visualizations (Heatmaps, Radar Charts).
- **Lucide React**: Beautiful icons.

## 💻 Local Setup

### Prerequisites
- Node.js (v18+)
- Python (3.9+)

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn api.main:app --reload
```
The backend will be available at `http://localhost:8000`. API documentation (Swagger UI) can be accessed at `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:5173`.

## 🐳 Docker Setup

The easiest way to run the entire application is using Docker. Ensure you have Docker and docker-compose installed.

```bash
docker-compose up --build
```
- The frontend will be running on `http://localhost:5173`
- The backend API will be running on `http://localhost:8000`

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.
