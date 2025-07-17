import { Collection, ObjectId } from 'mongodb';
import { getMongoClient } from '@/utils/mongo';
import {
  Note,
  NoteFilters,
  NoteWithObjectId,
  createNoteWithDefaults,
} from '@/models/note';
import { INoteService } from '@/services/interfaces/noteServiceInterface';

export class NoteDatabaseService implements INoteService {
  private collection: Collection<NoteWithObjectId>;

  constructor() {
    this.collection = getMongoClient()
      .db()
      .collection<NoteWithObjectId>('notes');
  }

  async create(note: Omit<Note, 'id'>): Promise<Note> {
    try {
      const noteWithDefaults = createNoteWithDefaults(note);
      const result = await this.collection.insertOne({
        ...noteWithDefaults,
        _id: new ObjectId(),
      });

      return {
        id: result.insertedId.toString(),
        ...noteWithDefaults,
      };
    } catch (error) {
      console.error('Error creating note:', error);
      throw new Error('Failed to create note');
    }
  }

  async getAll(filters?: NoteFilters): Promise<Note[]> {
    try {
      const query: any = {};

      if (filters?.forUserId) {
        query.forUserId = filters.forUserId;
      }

      if (filters?.fromUserId) {
        query.fromUserId = filters.fromUserId;
      }

      const limit = filters?.limit || 50;
      const skip = (filters?.page || 0) * limit;

      const cursor = this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const notes = await cursor.toArray();

      return notes.map((note) => ({
        id: note._id.toString(),
        forUserId: note.forUserId,
        fromUserId: note.fromUserId,
        note: note.note,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      }));
    } catch (error) {
      console.error('Error getting all notes:', error);
      throw new Error('Failed to get notes');
    }
  }

  async getById(id: string): Promise<Note | null> {
    try {
      const note = await this.collection.findOne({ _id: new ObjectId(id) });

      if (!note) {
        return null;
      }

      return {
        id: note._id.toString(),
        forUserId: note.forUserId,
        fromUserId: note.fromUserId,
        note: note.note,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      };
    } catch (error) {
      console.error('Error getting note by id:', error);
      throw new Error('Failed to get note');
    }
  }

  async getByForUserId(
    forUserId: string,
    filters?: NoteFilters
  ): Promise<Note[]> {
    try {
      const query: any = { forUserId };

      if (filters?.fromUserId) {
        query.fromUserId = filters.fromUserId;
      }

      const limit = filters?.limit || 50;
      const skip = (filters?.page || 0) * limit;

      const cursor = this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const notes = await cursor.toArray();

      return notes.map((note) => ({
        id: note._id.toString(),
        forUserId: note.forUserId,
        fromUserId: note.fromUserId,
        note: note.note,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      }));
    } catch (error) {
      console.error('Error getting notes by forUserId:', error);
      throw new Error('Failed to get notes for user');
    }
  }

  async getByFromUserId(
    fromUserId: string,
    filters?: NoteFilters
  ): Promise<Note[]> {
    try {
      const query: any = { fromUserId };

      if (filters?.forUserId) {
        query.forUserId = filters.forUserId;
      }

      const limit = filters?.limit || 50;
      const skip = (filters?.page || 0) * limit;

      const cursor = this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const notes = await cursor.toArray();

      return notes.map((note) => ({
        id: note._id.toString(),
        forUserId: note.forUserId,
        fromUserId: note.fromUserId,
        note: note.note,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      }));
    } catch (error) {
      console.error('Error getting notes by fromUserId:', error);
      throw new Error('Failed to get notes from user');
    }
  }

  async update(id: string, update: Partial<Note>): Promise<boolean> {
    try {
      const updateData = {
        ...update,
        updatedAt: new Date(),
      };

      delete updateData.id; // Remove id from update data

      const result = await this.collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error updating note:', error);
      throw new Error('Failed to update note');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting note:', error);
      throw new Error('Failed to delete note');
    }
  }

  async getNotesForUser(
    userId: string,
    filters?: NoteFilters
  ): Promise<Note[]> {
    return this.getByForUserId(userId, filters);
  }

  async getNotesFromUser(
    userId: string,
    filters?: NoteFilters
  ): Promise<Note[]> {
    return this.getByFromUserId(userId, filters);
  }

  async getNotesBetweenUsers(
    userId1: string,
    userId2: string,
    filters?: NoteFilters
  ): Promise<Note[]> {
    try {
      const query = {
        $or: [
          { forUserId: userId1, fromUserId: userId2 },
          { forUserId: userId2, fromUserId: userId1 },
        ],
      };

      const limit = filters?.limit || 50;
      const skip = (filters?.page || 0) * limit;

      const cursor = this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const notes = await cursor.toArray();

      return notes.map((note) => ({
        id: note._id.toString(),
        forUserId: note.forUserId,
        fromUserId: note.fromUserId,
        note: note.note,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      }));
    } catch (error) {
      console.error('Error getting notes between users:', error);
      throw new Error('Failed to get notes between users');
    }
  }
}
