import { t } from '../i18n';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
const openDialogs: HTMLElement[] = [];
let unlockedOverflow = '';
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  dismissable = true,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  dismissable?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    if (!openDialogs.length) unlockedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const node = ref.current!;
    openDialogs.push(node);
    const updateVisibility = () =>
      openDialogs.forEach((dialog, index) =>
        dialog.setAttribute('aria-hidden', String(index !== openDialogs.length - 1)),
      );
    updateVisibility();
    const focusable = () =>
      [
        ...node.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex="0"]',
        ),
      ].filter((e) => e.getClientRects().length > 0);
    (focusable()[0] || node).focus();
    const key = (event: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== node) return;
      if (event.key === 'Escape' && dismissable) {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === 'Tab') {
        const items = focusable(),
          first = items[0],
          last = items[items.length - 1];
        if (!first) {
          event.preventDefault();
          node.focus();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === node)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      const wasTop = openDialogs[openDialogs.length - 1] === node;
      openDialogs.splice(openDialogs.indexOf(node), 1);
      updateVisibility();
      if (!openDialogs.length) document.body.style.overflow = unlockedOverflow;
      if (wasTop && previous?.isConnected) previous.focus();
    };
  }, [dismissable]);
  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (dismissable && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-heading">
          <h2 id={titleId}>{title}</h2>
          {dismissable && (
            <button className="icon-button" onClick={onClose} aria-label={t('Cerrar diálogo')}>
              <X size={20} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
