export default function Footer() {
  return (
    <footer>
      <div className="footer-content">
        <p className="footer-text">Hecho con ❤️ para gamers</p>
        <div className="footer-links">
          <a href="/stats" target="_blank">📊 Stats</a>
          <span>•</span>
          <a href="#" onClick={() => alert('FreeGameHub v2.1 - Hecho con ❤️ para gamers')}>ℹ️ Acerca de</a>
        </div>
        <p className="footer-copyright">© 2026 FreeGameHub</p>
      </div>
    </footer>
  );
}
