import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const result = await authService.register(req.body, ip, userAgent);

      res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier, password } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const result = await authService.login(identifier, password, ip, userAgent);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const tokens = await authService.refreshTokens(refreshToken, ip, userAgent);

      res.status(200).json({
        success: true,
        message: 'Tokens refreshed successfully',
        data: {
          tokens,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const userId = req.user?.userId;
      await authService.logout(refreshToken, userId);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const user = await authService.getMe(userId);

      res.status(200).json({
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPasswordRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier } = req.body;
      const result = await authService.forgotPasswordRequest(identifier);
      res.status(200).json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPasswordVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier, otp, newPassword } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const result = await authService.forgotPasswordVerify(identifier, otp, newPassword, ip, userAgent);
      res.status(200).json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { currentPassword, newPassword } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const result = await authService.changePassword(userId, currentPassword, newPassword, ip, userAgent);
      res.status(200).json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const result = await authService.logoutAll(userId, ip, userAgent);
      res.status(200).json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async resubmitVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const updatedUser = await authService.resubmitVerification(userId, req.body, ip, userAgent);
      res.status(200).json({
        success: true,
        message: 'Credentials resubmitted for verification',
        data: updatedUser,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
