import { notificationService } from '../services/notificationService';
import { responseHandler, handleError } from '../utils/helper';
import { Request, Response } from 'express';

export const getAutomatedTaskRules = async (req: Request, res: Response) => {
  try {
    const rules = await notificationService.getAllAutomatedTaskRules();
    responseHandler(res, 200, 'Automated task rules fetched', rules);
  } catch (e) {
    handleError(res, e as Error);
  }
};


export const createAutomatedTaskRule = async (req: Request, res: Response) => {
  try {
    const rule = await notificationService.createAutomatedTaskRule(req.body);
    responseHandler(res, 201, 'Automated task rule created', rule);
  } catch (e) {
    handleError(res, e as Error);
  }
};

export const updateAutomatedTaskRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rule = await notificationService.updateAutomatedTaskRule(id, req.body);
    responseHandler(res, 200, 'Automated task rule updated', rule);
  } catch (e) {
    handleError(res, e as Error);
  }
};

export const deleteAutomatedTaskRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await notificationService.deleteAutomatedTaskRule(id);
    responseHandler(res, 200, 'Automated task rule deleted');
  } catch (e) {
    handleError(res, e as Error);
  }
}; 