import { t } from '../i18n';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
const openDialogs: HTMLElement[] = [];
let unlockedOverflow = '';
const inertBefore = new Map<HTMLElement, boolean>();
function updateVisibility() {
  const top = openDialogs.at(-1);
  if (!top) {
    for (const [node, inert] of inertBefore) node.inert = inert;
    inertBefore.clear();
    return;
  }
  // Portals are direct body children. Keep the background and lower dialogs inert.
  for (const node of document.body.children) {
    if (!(node instanceof HTMLElement)) continue;
    if (!inertBefore.has(node)) inertBefore.set(node, node.inert);
    node.inert = node !== top.parentElement;
  }
  for (const dialog of openDialogs) {
    if (dialog === top) dialog.removeAttribute('aria-hidden');
    else dialog.setAttribute('aria-hidden', 'true');
  }
}
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
    updateVisibility();
    const focusable = () =>
      [
        ...node.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[contenteditable="true"],[tabindex]:not([tabindex="-1"])',
        ),
      ].filter(
        (e) => e.tabIndex >= 0 && !e.closest('[inert],[hidden]') && e.getClientRects().length > 0,
      );
    (focusable()[0] || node).focus();
    const key = (event: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== node) return;
      if (event.key === 'Escape' && dismissable) {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === 'Tab') {
        const items = focusable();
        const index = items.indexOf(document.activeElement as HTMLElement);
        const next = event.shiftKey
          ? index <= 0
            ? items.length - 1
            : index - 1
          : (index + 1) % items.length;
        // WebKit on macOS may skip buttons with native Tab settings. Keep every
        // control reachable inside this modal independently of that preference.
        event.preventDefault();
        (items[next] || node).focus();
      }
    };
    const containFocus = (event: FocusEvent) => {
      if (openDialogs.at(-1) === node && !node.contains(event.target as Node))
        (focusable()[0] || node).focus();
    };
    document.addEventListener('focusin', containFocus);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      document.removeEventListener('focusin', containFocus);
      const wasTop = openDialogs[openDialogs.length - 1] === node;
      openDialogs.splice(openDialogs.indexOf(node), 1);
      updateVisibility();
      if (!openDialogs.length) document.body.style.overflow = unlockedOverflow;
      if (wasTop && previous?.isConnected && !previous.closest('[inert]')) previous.focus();
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
