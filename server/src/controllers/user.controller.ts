// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { UserService, type UserFilters } from '../services/user.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const UserController = {
  list: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const users = await UserService.list(req.query as unknown as UserFilters);
    res.json(new ApiResponse(users, 'Users loaded'));
  }),
  update: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = await UserService.update(String(req.params.id ?? ''), req.body as Record<string, unknown>);
    res.json(new ApiResponse(user, 'User updated'));
  })
};
