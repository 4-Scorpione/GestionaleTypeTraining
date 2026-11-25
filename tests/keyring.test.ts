import { describe, expect, it } from 'vitest';
import { creaKeyring, impostaCredenziali, ruotaChiavi, sbloccaKeyring, validaKeyring } from '../src/backend/github/keyring';

/** Portachiavi dell'archivio GitHub: il token non deve mai essere leggibile senza password. */

const TOKEN = 'github_pat_esempio_non_valido';

describe('portachiavi', () => {
  it('sblocca il token solo con la password giusta', async () => {
    const { keyring, chiavi } = await creaKeyring(TOKEN, 'admin', 'admin');
    expect(chiavi.token).toBe(TOKEN);
    expect(JSON.stringify(keyring)).not.toContain(TOKEN);
    expect(JSON.stringify(keyring)).not.toContain('admin');
    const riaperto = await sbloccaKeyring(validaKeyring(JSON.parse(JSON.stringify(keyring))), 'admin', 'admin');
    expect(riaperto.token).toBe(TOKEN);
    await expect(sbloccaKeyring(keyring, 'admin', 'sbagliata')).rejects.toThrow();
    await expect(sbloccaKeyring(keyring, 'nessuno', 'admin')).rejects.toThrow();
  });

  it('l’amministratore aggiunge un utente che riceve lo stesso token', async () => {
    const { keyring, chiavi } = await creaKeyring(TOKEN, 'admin', 'admin');
    const aggiornato = await impostaCredenziali(keyring, chiavi, 'mario.rossi', 'prova1234', false);
    const suo = await sbloccaKeyring(aggiornato, 'mario.rossi', 'prova1234');
    expect(suo.token).toBe(TOKEN);
    expect(suo.ka).toBeNull();
    expect(aggiornato.revisione).toBeGreaterThan(keyring.revisione);
  });

  it('una seconda rotazione con chiavi superate viene respinta invece di escludere tutti gli utenti', async () => {
    const { keyring, chiavi } = await creaKeyring(TOKEN, 'admin', 'admin', 1000);
    const conUtente = await impostaCredenziali(keyring, chiavi, 'mario.rossi', 'prova1234', false);
    const prima = await ruotaChiavi(conUtente, chiavi, 'github_pat_secondo_token');
    expect(Object.keys(prima.keyring.utenti)).toHaveLength(2);
    // stesse chiavi di prima della rotazione, sul portachiavi già ruotato (es. doppio invio)
    await expect(ruotaChiavi(prima.keyring, chiavi, 'github_pat_secondo_token')).rejects.toMatchObject({ codice: 'CONFLITTO' });
    // con le chiavi aggiornate la rotazione resta possibile e conserva tutti gli utenti
    const seconda = await ruotaChiavi(prima.keyring, prima.chiavi, 'github_pat_terzo_token');
    expect(Object.keys(seconda.keyring.utenti)).toHaveLength(2);
    expect((await sbloccaKeyring(seconda.keyring, 'mario.rossi', 'prova1234')).token).toBe('github_pat_terzo_token');
  });
});
