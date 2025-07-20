import { ObjectId } from 'mongodb';

export interface Note {
  id?: string;
  forUserId: string; // FK to User
  fromUserId?: string; // FK to User (optional for orphaned notes)
  note: string; // mandatory string
  createdAt: Date; // mandatory DateTime
  updatedAt?: Date; // DateTime
}

export interface NoteResponse {
  id: string;
  forUser: string; // Username of the user the note is for
  fromUser?: string; // Username of the user who created the note
  note: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateNote {
  forUserId: string;
  fromUserId: string;
  note: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface NoteWithObjectId extends Omit<Note, 'id'> {
  _id: ObjectId;
}

export interface NoteDocument extends Omit<Note, 'id'> {
  _id: ObjectId;
}

export interface NoteFilters {
  forUserId?: string;
  fromUserId?: string;
  limit?: number;
  page?: number;
}

export function createNoteWithDefaults(
  noteData: Partial<CreateNote>
): CreateNote {
  const createdAt = noteData.createdAt ?? new Date();
  return {
    ...noteData,
    forUserId: noteData.forUserId!,
    fromUserId: noteData.fromUserId!,
    note: noteData.note!,
    createdAt,
  };
}
