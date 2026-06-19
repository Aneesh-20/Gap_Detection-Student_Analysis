import { Link, useLocation } from 'react-router-dom';
import { 
  List, Plus, Upload, 
  BarChart2, Calendar, Users, 
  TrendingUp, Activity, Map, 
  Settings, Lock 
} from 'lucide-react';
import '../admin.css';

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { section: 'QUESTIONS', items: [
      { name: 'Question bank', path: '/admin', icon: <List size={18} /> },
      { name: 'Add question', path: '/admin?action=add', icon: <Plus size={18} /> },
      { name: 'Add subject', path: '/admin?action=add-subject', icon: <Plus size={18} /> },
      { name: 'Bulk import', path: '/admin?action=bulk-import', icon: <Upload size={18} /> }
    ]},
    { section: 'ASSESSMENTS', items: [
      { name: 'Assessments', path: '#', icon: <BarChart2 size={18} /> },
      { name: 'Schedule', path: '#', icon: <Calendar size={18} /> },
      { name: 'Assign students', path: '#', icon: <Users size={18} /> }
    ]},
    { section: 'ANALYTICS', items: [
      { name: 'Item analysis', path: '#', icon: <TrendingUp size={18} /> },
      { name: 'IRT dashboard', path: '/', icon: <Activity size={18} /> },
      { name: 'Curriculum map', path: '#', icon: <Map size={18} /> }
    ]},
    { section: 'SYSTEM', items: [
      { name: 'Settings', path: '#', icon: <Settings size={18} /> },
      { name: 'Roles & access', path: '#', icon: <Lock size={18} /> }
    ]}
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>AssessIQ Admin</h2>
        <p>Learning gap platform</p>
      </div>

      <div className="sidebar-nav">
        {navItems.map((group, idx) => (
          <div key={idx} className="nav-group">
            <h3 className="nav-section-title">{group.section}</h3>
            {group.items.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  to={item.path} 
                  key={item.name} 
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
