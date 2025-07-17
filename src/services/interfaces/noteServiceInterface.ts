import { Note, NoteFilters, NoteResponse } from '@/models/note';

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

  // Response methods with resolved usernames
  getAllWithUsernames(filters?: NoteFilters): Promise<NoteResponse[]>;
  getByIdWithUsernames(id: string): Promise<NoteResponse | null>;
  getByForUserIdWithUsernames(
    forUserId: string,
    filters?: NoteFilters
  ): Promise<NoteResponse[]>;
  getByFromUserIdWithUsernames(
    fromUserId: string,
    filters?: NoteFilters
  ): Promise<NoteResponse[]>;
  getNotesForUserWithUsernames(
    userId: string,
    filters?: NoteFilters
  ): Promise<NoteResponse[]>;
  getNotesFromUserWithUsernames(
    userId: string,
    filters?: NoteFilters
  ): Promise<NoteResponse[]>;
  getNotesBetweenUsersWithUsernames(
    userId1: string,
    userId2: string,
    filters?: NoteFilters
  ): Promise<NoteResponse[]>;
}
