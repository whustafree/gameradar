import { useRef } from 'react';
import { useDialogA11y } from '../hooks/useDialogA11y';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  useDialogA11y<HTMLDivElement>(isOpen, onClose, boxRef);

  return (
    <div className={`modal-overlay ${isOpen ? '' : 'hidden'}`} onClick={onClose}>
      <div
        ref={boxRef}
        className="modal-box"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h3>{title}</h3>
        {children}
        <div className="modal-actions" style={{ marginTop: '0.5rem' }}>
          <button type="button" className="btn-primary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
