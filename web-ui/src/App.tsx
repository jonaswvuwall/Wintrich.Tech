import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './presentation/pages/Home';
import { Dashboard } from './presentation/pages/Dashboard';
import { About } from './presentation/pages/About';
import { Traceroute } from './presentation/pages/Traceroute';
import { AnycastAtlas } from './presentation/pages/AnycastAtlas';
import { TlsHandshake } from './presentation/pages/TlsHandshake';
import { Globe } from './presentation/pages/Globe';
import { PortSkyline } from './presentation/pages/PortSkyline';
import { LatencyHeatmap } from './presentation/pages/LatencyHeatmap';
import { WeatherMap } from './presentation/pages/WeatherMap';
import { RouteFlap } from './presentation/pages/RouteFlap';
import { SubmarineCables } from './presentation/pages/SubmarineCables';
import { SharedReportPage } from './presentation/pages/SharedReportPage';
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
        <Route path="/visualize" element={<Navigate to="/visualize/globe" replace />} />
        <Route path="/visualize/globe" element={<Globe />} />
        <Route path="/visualize/skyline" element={<PortSkyline />} />
        <Route path="/visualize/traceroute" element={<Traceroute />} />
        <Route path="/visualize/anycast" element={<AnycastAtlas />} />
        <Route path="/visualize/tls" element={<TlsHandshake />} />
        <Route path="/visualize/heatmap" element={<LatencyHeatmap />} />
        <Route path="/visualize/weather" element={<WeatherMap />} />
        <Route path="/visualize/flap" element={<RouteFlap />} />
        <Route path="/visualize/cables" element={<SubmarineCables />} />
        {/* Legacy redirect */}
        <Route path="/traceroute" element={<Navigate to="/visualize/traceroute" replace />} />
        <Route path="/r/:id" element={<SharedReportPage />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}

export default App;
