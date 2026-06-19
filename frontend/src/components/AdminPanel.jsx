import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trash2, Edit2, Plus, Upload, Copy, Search, Sparkles, RefreshCw } from 'lucide-react';
import '../admin.css';

const AdminPanel = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ topic: '', grade: '', type: 'MCQ', text: '' });
  const [aiTopic, setAiTopic] = useState('Algebra');

  const [search, setSearch] = useState('');

  const [topicOptions, setTopicOptions] = useState([]);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkStatus, setBulkStatus] = useState(null);
  const gradeOptions = ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  const typeOptions = ['MCQ', 'Short ans.'];

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const [questionsRes, subjectsRes] = await Promise.all([
        axios.get('http://localhost:8000/api/questions'),
        axios.get('http://localhost:8000/api/subjects')
      ]);
      setQuestions(questionsRes.data);
      setTopicOptions(subjectsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'add') {
      handleOpenModal();
      navigate('/admin', { replace: true });
    } else if (params.get('action') === 'add-subject') {
      setIsSubjectModalOpen(true);
      navigate('/admin', { replace: true });
    } else if (params.get('action') === 'bulk-import') {
      setIsBulkModalOpen(true);
      navigate('/admin', { replace: true });
    }
  }, [location.search, navigate]);

  // Stats calculation
  const totalQuestions = questions.length;
  const avgDiff = questions.length > 0 ? (questions.reduce((acc, q) => acc + (q.irt_difficulty || 0), 0) / questions.length).toFixed(2) : '0.00';
  const flaggedItems = questions.filter(q => q.is_flagged).length;
  const untaggedItems = questions.filter(q => !q.topic || q.topic === '').length;

  const handleOpenModal = (question = null) => {
    if (question) {
      setEditingId(question.question_id);
      setFormData({ topic: question.topic, grade: question.grade, type: question.type || 'MCQ', text: question.text });
    } else {
      setEditingId(null);
      setFormData({ topic: topicOptions[0] || '', grade: gradeOptions[0], type: 'MCQ', text: '' });
    }
    setIsModalOpen(true);
  };

  const handleGenerateAi = async () => {
    try {
      const res = await axios.post('http://localhost:8000/api/smart/generate', { topic: aiTopic });
      setFormData({ ...formData, topic: aiTopic, text: res.data.text, type: res.data.type });
      setIsAiModalOpen(false);
      setIsModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`http://localhost:8000/api/questions/${editingId}`, formData);
      } else {
        await axios.post('http://localhost:8000/api/questions', formData);
      }
      setIsModalOpen(false);
      fetchQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (questionId) => {
    if (window.confirm(`Delete ${questionId}?`)) {
      try {
        await axios.delete(`http://localhost:8000/api/questions/${questionId}`);
        fetchQuestions();
      } catch (err) {}
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubject.trim()) return;
    try {
      await axios.post('http://localhost:8000/api/subjects', { name: newSubject });
      setNewSubject('');
      setIsSubjectModalOpen(false);
      fetchQuestions(); // Refresh subjects list
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkFile) return;
    const formPayload = new FormData();
    formPayload.append('file', bulkFile);
    try {
      setBulkStatus('Uploading...');
      const res = await axios.post('http://localhost:8000/api/questions/bulk-import', formPayload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setBulkStatus(`✅ ${res.data.message}`);
      setBulkFile(null);
      fetchQuestions();
    } catch (err) {
      setBulkStatus(`❌ ${err.response?.data?.detail || 'Upload failed'}`);
    }
  };

  const filteredQuestions = questions.filter(q => q.text?.toLowerCase().includes(search.toLowerCase()) || q.question_id.includes(search));

  return (
    <div>
      <div className="dashboard-header">
        <div className="dashboard-title">
          Question bank
          <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
            {totalQuestions} questions
          </span>
        </div>
        <div className="controls">
          <button className="secondary-btn" onClick={() => setIsAiModalOpen(true)}>
            <Sparkles size={16} style={{ color: '#8b5cf6' }} /> AI Generate
          </button>
          <button className="primary-btn" onClick={() => setIsSubjectModalOpen(true)}><Plus size={16} /> Add subject</button>
          <button className="primary-btn" onClick={() => handleOpenModal()}><Plus size={16} /> Add question</button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-title">Total questions</div>
          <div className="stat-value">{totalQuestions}</div>
          <div className="stat-subtitle">across 5 subjects</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Avg difficulty (IRT)</div>
          <div className="stat-value">{avgDiff}</div>
          <div className="stat-subtitle">beta parameter</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Flagged items</div>
          <div className="stat-value danger">{flaggedItems}</div>
          <div className="stat-subtitle">poor discrimination (&lt;0.2)</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Untagged</div>
          <div className="stat-value warning">{untaggedItems}</div>
          <div className="stat-subtitle">need curriculum tag</div>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <select className="select-box" style={{ flex: 1 }}><option>All subjects</option></select>
            <select className="select-box" style={{ flex: 1 }}><option>All difficulty</option></select>
            <select className="select-box" style={{ flex: 1 }}><option>All types</option></select>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search question..." 
              className="select-box" 
              style={{ width: '100%', paddingLeft: '2.5rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <tbody>
              {filteredQuestions.map((q) => (
                <tr key={q.question_id}>
                  <td style={{ color: 'var(--text-secondary)', width: '80px' }}>{q.question_id}</td>
                  <td style={{ maxWidth: '400px', paddingRight: '2rem' }}>
                    <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{q.text}</div>
                    {q.is_flagged && <div style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}><RefreshCw size={12}/> Weak item detected (IR: {q.irt_discrimination?.toFixed(2)})</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="tag tag-subject">{q.topic}</span>
                      <span className={`tag tag-${q.difficulty_label?.toLowerCase()}`}>{q.difficulty_label}</span>
                      <span className="tag tag-type">{q.type}</span>
                      {q.is_flagged && <span className="tag tag-weak">Flagged</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon-btn edit-btn" onClick={() => handleOpenModal(q)}><Edit2 size={16} /></button>
                    <button className="icon-btn"><Copy size={16} /></button>
                    <button className="icon-btn delete-btn" onClick={() => handleDelete(q.question_id)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingId ? `Edit ${editingId}` : 'Add Question'}</h2>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Question Text</label>
                <textarea className="select-box" style={{ width: '100%', minHeight: '100px' }} value={formData.text} onChange={e => setFormData({...formData, text: e.target.value})} required />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Topic</label>
                  <select className="select-box" style={{ width: '100%' }} value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})}>
                    {topicOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Grade</label>
                  <select className="select-box" style={{ width: '100%' }} value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})}>
                    {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Type</label>
                  <select className="select-box" style={{ width: '100%' }} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAiModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2><Sparkles size={20} style={{ color: '#8b5cf6', marginRight: '8px' }}/> Generate Question</h2>
              <button className="icon-btn" onClick={() => setIsAiModalOpen(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Select Curriculum Topic</label>
              <select className="select-box" style={{ width: '100%' }} value={aiTopic} onChange={e => setAiTopic(e.target.value)}>
                {topicOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={handleGenerateAi}>Generate Draft</button>
            </div>
          </div>
        </div>
      )}

      {isSubjectModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Add New Subject</h2>
              <button className="icon-btn" onClick={() => setIsSubjectModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddSubject}>
              <div className="form-group">
                <label>Subject Name</label>
                <input 
                  type="text" 
                  className="select-box" 
                  style={{ width: '100%' }} 
                  value={newSubject} 
                  onChange={e => setNewSubject(e.target.value)} 
                  required 
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setIsSubjectModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBulkModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2><Upload size={20} style={{ marginRight: '8px' }}/> Bulk Import Questions</h2>
              <button className="icon-btn" onClick={() => { setIsBulkModalOpen(false); setBulkStatus(null); setBulkFile(null); }}>×</button>
            </div>
            <div className="form-group">
              <label>Upload CSV File</label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 1rem' }}>
                Required columns: <code>text</code>, <code>topic</code><br/>
                Optional columns: <code>grade</code>, <code>type</code>
              </p>
              <div 
                style={{ 
                  border: '2px dashed var(--border)', 
                  borderRadius: '0.75rem', 
                  padding: '2rem', 
                  textAlign: 'center', 
                  cursor: 'pointer',
                  background: bulkFile ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                  transition: 'background 0.2s'
                }}
                onClick={() => document.getElementById('csv-upload').click()}
              >
                <Upload size={32} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, color: bulkFile ? 'var(--success)' : 'var(--text-secondary)' }}>
                  {bulkFile ? `📄 ${bulkFile.name}` : 'Click to select a .csv file'}
                </p>
                <input 
                  id="csv-upload"
                  type="file" 
                  accept=".csv" 
                  style={{ display: 'none' }} 
                  onChange={e => { setBulkFile(e.target.files[0]); setBulkStatus(null); }} 
                />
              </div>
            </div>
            {bulkStatus && (
              <p style={{ fontSize: '0.9rem', marginTop: '1rem', color: bulkStatus.startsWith('✅') ? 'var(--success)' : bulkStatus.startsWith('❌') ? 'var(--danger)' : 'var(--text-secondary)' }}>
                {bulkStatus}
              </p>
            )}
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={() => { setIsBulkModalOpen(false); setBulkStatus(null); setBulkFile(null); }}>Cancel</button>
              <button className="primary-btn" onClick={handleBulkImport} disabled={!bulkFile || bulkStatus === 'Uploading...'}>
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
