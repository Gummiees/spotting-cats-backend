import { Response, NextFunction } from 'express';
import { NoteCacheService } from '@/services/implementations/note/noteCacheService';
import { ResponseUtil } from '@/utils/response';
import { AuthRequest } from '@/models/requests';
import { userService } from '@/services/userService';

const noteService = new NoteCacheService();

export class NoteController {
  // Create a new note for a user by username
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { username } = req.params;
      const { note } = req.body;
      if (!username || !note) {
        return ResponseUtil.badRequest(res, 'username and note are required');
      }
      const user = await userService.getUserByUsername(username);
      if (!user) {
        return ResponseUtil.notFound(res, 'User not found');
      }
      const fromUserId = req.user!.userId;
      const createdNote = await noteService.create({
        forUserId: user.id!,
        fromUserId,
        note,
        createdAt: new Date(),
      });
      ResponseUtil.success(res, createdNote, 'Note created', 201);
    } catch (err) {
      next(err);
    }
  }

  // Update note text by note ID and username
  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { username, id } = req.params;
      const { note } = req.body;
      if (!username || !id || !note) {
        return ResponseUtil.badRequest(
          res,
          'username, id, and note are required'
        );
      }
      const user = await userService.getUserByUsername(username);
      if (!user) {
        return ResponseUtil.notFound(res, 'User not found');
      }
      const existing = await noteService.getById(id);
      if (!existing || existing.forUserId !== user.id) {
        return ResponseUtil.notFound(res, 'Note not found');
      }
      const updated = await noteService.update(id, { note });
      if (!updated) {
        return ResponseUtil.notFound(res, 'Note not found');
      }
      ResponseUtil.success(res, null, 'Note updated');
    } catch (err) {
      next(err);
    }
  }

  // Delete note by note ID and username
  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { username, id } = req.params;
      if (!username || !id) {
        return ResponseUtil.badRequest(res, 'username and id are required');
      }
      const user = await userService.getUserByUsername(username);
      if (!user) {
        return ResponseUtil.notFound(res, 'User not found');
      }
      const existing = await noteService.getById(id);
      if (!existing || existing.forUserId !== user.id) {
        return ResponseUtil.notFound(res, 'Note not found');
      }
      const deleted = await noteService.delete(id);
      if (!deleted) {
        return ResponseUtil.notFound(res, 'Note not found');
      }
      ResponseUtil.success(res, null, 'Note deleted');
    } catch (err) {
      next(err);
    }
  }

  // List notes for a user by username (using forUserId FK)
  static async listByUsername(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { username } = req.params;
      if (!username) {
        return ResponseUtil.badRequest(res, 'username is required');
      }
      const user = await userService.getUserByUsername(username);
      if (!user) {
        return ResponseUtil.notFound(res, 'User not found');
      }
      const notes = await noteService.getByForUserIdWithUsernames(user.id!);
      ResponseUtil.success(res, notes, 'Notes retrieved');
    } catch (err) {
      next(err);
    }
  }
}
