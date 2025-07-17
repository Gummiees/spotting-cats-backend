import { Note, NoteFilters } from '@/models/note';

export interface INoteService {
  // CRUD operations
  create(note: Omit<Note, 'id'>): Promise<Note>;
  getAll(filters?: NoteFilters): Promise<Note[]>;
  getById(id: string): Promise<Note | null>;
  getByForUserId(forUserId: string, filters?: NoteFilters): Promise<Note[]>;
  getByFromUserId(fromUserId: string, filters?: NoteFilters): Promise<Note[]>;
  update(id: string, update: Partial<Note>): Promise<boolean>;
  delete(id: string): Promise<boolean>;

  // Utility methods
  getNotesForUser(userId: string, filters?: NoteFilters): Promise<Note[]>;
  getNotesFromUser(userId: string, filters?: NoteFilters): Promise<Note[]>;
  getNotesBetweenUsers(
    userId1: string,
    userId2: string,
    filters?: NoteFilters
  ): Promise<Note[]>;
}
