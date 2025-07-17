import { HelloService } from '@/services/helloService';
import { ResponseUtil } from '@/utils/response';
import { NextFunction, Request, Response } from 'express';

export class HelloController {
  static getHello(req: Request, res: Response, next: NextFunction): void {
    try {
      const { name } = req.query;
      const helloMessage = HelloService.getHelloMessage(name as string);
      ResponseUtil.success(
        res,
        helloMessage,
        'Hello message retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static getWelcome(_req: Request, res: Response, next: NextFunction): void {
    try {
      const welcomeMessage = HelloService.getWelcomeMessage();
      ResponseUtil.success(
        res,
        { message: welcomeMessage },
        'Welcome message retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}
