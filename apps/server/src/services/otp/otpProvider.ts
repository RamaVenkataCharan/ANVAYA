/**
 * OTP Notification Provider Interface and Development Implementation
 * Note: Never integrate a real SMS/email provider in development.
 * Logs OTPs directly to server console.
 * Strictly forbidden in production.
 */

export interface IOtpProvider {
  sendOtp(
    target: string,
    code: string,
    purpose: 'PASSWORD_RESET' | 'VERIFICATION'
  ): Promise<{ success: boolean; message: string }>;
}

export class DevConsoleOtpProvider implements IOtpProvider {
  async sendOtp(
    target: string,
    code: string,
    purpose: 'PASSWORD_RESET' | 'VERIFICATION'
  ): Promise<{ success: boolean; message: string }> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DevConsoleOtpProvider is forbidden in production environment');
    }

    console.log(`\n========================================`);
    console.log(`[DEV OTP PROVIDER] Purpose: ${purpose}`);
    console.log(`[DEV OTP PROVIDER] Destination: ${target}`);
    console.log(`[DEV OTP PROVIDER] Verification Code: ${code}`);
    console.log(`========================================\n`);
    return { success: true, message: 'OTP generated and logged to server console (dev mode)' };
  }
}

export const defaultOtpProvider: IOtpProvider = new DevConsoleOtpProvider();
