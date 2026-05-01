import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './presentation/pages/Home';
import { Dashboard } from './presentation/pages/Dashboard';
import { About } from './presentation/pages/About';
import { Navigation } from './presentation/components/Navigation';
import { GlobalStyles } from './presentation/styles/GlobalStyles';

function App() {
  return (
    <Router>
      <GlobalStyles />
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}

export default App;
