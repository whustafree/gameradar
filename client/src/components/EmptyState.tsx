export default function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div id="empty-state" className="empty-state">
      <div className="empty-icon">🔍</div>
      <h3>No se encontraron juegos</h3>
      <p>Prueba con otros filtros o términos de búsqueda</p>
      <button className="btn-primary" onClick={onReset}>Limpiar filtros</button>
    </div>
  );
}
