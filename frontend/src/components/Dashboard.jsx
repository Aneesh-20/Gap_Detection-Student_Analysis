import { useState, useEffect } from 'react';
import axios from 'axios';
import CohortHeatmap from './CohortHeatmap';
import StudentRadarChart from './StudentRadarChart';
import { Filter } from 'lucide-react';
import API_BASE from '../config';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedTopic, setSelectedTopic] = useState('All Topics');
  const [selectedGrade, setSelectedGrade] = useState('All Grades');
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/data`);
        setData(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data from backend API. Please ensure the Python server is running.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading Assessment Data...</div>;
  if (error) return <div className="loading" style={{ color: 'var(--danger)' }}>{error}</div>;

  const topics = ['All Topics', ...new Set(data.questions.map(q => q.topic))];
  const grades = ['All Grades', ...new Set(data.questions.map(q => q.grade))];
  const students = Array.from(new Set(data.heatmap.map(d => d.student_id))).sort();

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Gap Detection</h1>
          <p className="dashboard-subtitle">Map knowledge gaps across your cohort using Item Response Theory</p>
        </div>
        <div className="controls">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <Filter size={18} />
            <select 
              className="select-box"
              value={selectedGrade} 
              onChange={(e) => setSelectedGrade(e.target.value)}
            >
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select 
              className="select-box"
              value={selectedTopic} 
              onChange={(e) => setSelectedTopic(e.target.value)}
            >
              {topics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid-layout">
        {/* Left Column: Heatmap */}
        <div className="card">
          <h2 className="card-title">Cohort Knowledge Gap Heatmap</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Rows represent students (clustered by performance profile), columns represent questions.
          </p>
          <CohortHeatmap 
            data={data.heatmap} 
            selectedTopic={selectedTopic} 
            selectedGrade={selectedGrade} 
          />
        </div>

        {/* Right Column: Radar Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 className="card-title">Student Skill Profile</h2>
          <select 
            className="select-box" 
            style={{ width: '100%', marginBottom: '2rem' }}
            value={selectedStudent || ''}
            onChange={(e) => setSelectedStudent(e.target.value)}
          >
            <option value="" disabled>Select a student</option>
            {students.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <StudentRadarChart 
              radarData={data.radar} 
              studentId={selectedStudent || students[0]} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
