import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/base.css';
import './styles/scene.css';
import './styles/board.css';
import './styles/views.css';
import './styles/charts.css';
import './styles/report.css';
import Participant from './views/Participant.jsx';
import Admin from './views/Admin.jsx';
import Live from './views/Live.jsx';
import Report from './views/Report.jsx';

function route() {
  const p = window.location.pathname.replace(/\/+$/, '');
  if (p === '/admin') return <Admin />;
  if (p === '/live') return <Live />;
  if (p === '/report') return <Report />;
  return <Participant />;
}

createRoot(document.getElementById('root')).render(<React.StrictMode>{route()}</React.StrictMode>);
