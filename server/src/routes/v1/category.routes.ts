// Governed by .rules v1.0
import { Router } from 'express';
import { CategoryController } from '../../controllers/category.controller.js';

export const categoryRouter = Router();
categoryRouter.get('/', CategoryController.list);
