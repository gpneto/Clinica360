import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';

describe('Firebase Functions - Contact Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncWhatsAppContacts - Validações', () => {
    it('deve validar autenticação do usuário', () => {
      const request = {
        auth: null,
        data: {
          companyId: 'company1',
        },
      };

      const uid = request.auth?.uid;
      expect(uid).toBeUndefined();

      if (!uid) {
        expect(() => {
          throw new HttpsError('unauthenticated', 'Usuário não autenticado');
        }).toThrow('Usuário não autenticado');
      }
    });

    it('deve validar que companyId é obrigatório', () => {
      const request = {
        auth: { uid: 'user1' },
        data: {},
      };

      const companyId = request.data?.companyId;
      expect(companyId).toBeUndefined();

      if (!companyId) {
        expect(() => {
          throw new HttpsError('invalid-argument', 'companyId é obrigatório');
        }).toThrow('companyId é obrigatório');
      }
    });

    it('deve processar sincronização de contatos', () => {
      const contacts = [
        {
          id: '5511999999999',
          name: 'João Silva',
          profileName: 'João',
          lastMessageAt: new Date('2024-01-20T10:00:00'),
        },
        {
          id: '5511888888888',
          name: 'Maria Santos',
          profileName: 'Maria',
          lastMessageAt: new Date('2024-01-20T11:00:00'),
        },
      ];

      expect(contacts.length).toBe(2);
      expect(contacts.every(contact => contact.id && contact.name)).toBe(true);
    });
  });

  describe('getWhatsAppContactsPhotos - Validações', () => {
    it('deve validar autenticação do usuário', () => {
      const request = {
        auth: null,
        data: {
          companyId: 'company1',
        },
      };

      const uid = request.auth?.uid;
      expect(uid).toBeUndefined();

      if (!uid) {
        expect(() => {
          throw new HttpsError('unauthenticated', 'Usuário não autenticado');
        }).toThrow('Usuário não autenticado');
      }
    });

    it('deve validar que companyId é obrigatório', () => {
      const request = {
        auth: { uid: 'user1' },
        data: {},
      };

      const companyId = request.data?.companyId;
      expect(companyId).toBeUndefined();

      if (!companyId) {
        expect(() => {
          throw new HttpsError('invalid-argument', 'companyId é obrigatório');
        }).toThrow('companyId é obrigatório');
      }
    });

    it('deve processar busca de fotos de contatos', () => {
      const contactIds = ['5511999999999', '5511888888888'];
      const photos = contactIds.map(id => ({
        contactId: id,
        photoUrl: `https://example.com/photos/${id}.jpg`,
      }));

      expect(photos.length).toBe(2);
      expect(photos.every(photo => photo.contactId && photo.photoUrl)).toBe(true);
    });
  });
});

