import { useEffect } from 'react';

const CAMPO = 'input, textarea, select, [role="combobox"]';

/** Campi che non aprono la tastiera (tendine pure) o con la tendina aperta: lì non si scorre, la tendina si posiziona da sola. */
const daIgnorare = (el: HTMLElement) => (el as HTMLInputElement).readOnly || el.getAttribute('aria-expanded') === 'true';

/**
 * Sul telefono la tastiera copre il campo appena toccato (task, luogo, minuti):
 * quando un campo prende il fuoco lo si riporta al centro della parte di schermo che resta visibile.
 * Usa visualViewport quando c'è, altrimenti scrollIntoView.
 */
export function useCampoVisibile(attivo: boolean) {
  useEffect(() => {
    if (!attivo || typeof window === 'undefined') return;
    let timer = 0;
    const porta = (campo: HTMLElement) => {
      if (daIgnorare(campo)) return;
      const elemento = (campo.closest('.mantine-InputWrapper-root') as HTMLElement | null) ?? campo;
      const vv = window.visualViewport;
      const r = elemento.getBoundingClientRect();
      const altezza = vv?.height ?? window.innerHeight;
      // se il campo finisce sotto la parte visibile (o sopra), lo si porta al centro
      if (r.bottom > altezza - 24 || r.top < 8) elemento.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    const alFuoco = (e: FocusEvent) => {
      const campo = (e.target as HTMLElement | null)?.closest(CAMPO) as HTMLElement | null;
      if (!campo) return;
      window.clearTimeout(timer);
      // si aspetta che la tastiera sia salita e abbia ridotto la viewport
      timer = window.setTimeout(() => porta(campo), 350);
    };
    // la viewport cambia più volte mentre la tastiera sale: si agisce una volta sola, a movimento finito
    const alRidimensiona = () => {
      const attivoOra = document.activeElement as HTMLElement | null;
      if (!attivoOra?.matches(CAMPO)) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => porta(attivoOra), 150);
    };
    document.addEventListener('focusin', alFuoco);
    window.visualViewport?.addEventListener('resize', alRidimensiona);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('focusin', alFuoco);
      window.visualViewport?.removeEventListener('resize', alRidimensiona);
    };
  }, [attivo]);
}
