import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import RailNav from '../components/RailNav';
import TopBar from '../components/TopBar';
import CommandPalette from '../components/CommandPalette';
import ResQue from '../components/ResQue';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('resobin_rail_collapsed');
    return saved ? JSON.parse(saved) : true;
  });
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('resobin_rail_collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  // Global cmd-K / ctrl-K and custom 'open-command-palette' event
  // so any child component (e.g., Dashboard hero) can open the palette
  // without prop drilling.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    const onCustom = () => setPaletteOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-command-palette', onCustom);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-palette', onCustom);
    };
  }, []);

  return (
    <div className="app-layout">
      <RailNav collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className={`main-wrap ${collapsed ? '' : 'expanded'}`}>
        <TopBar onOpenPalette={() => setPaletteOpen(true)} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ResQue />
    </div>
  );
}
