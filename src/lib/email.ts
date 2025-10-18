import { Resend } from 'resend';

// Lazy initialize Resend to avoid errors during module loading
let resendClient: Resend | null = null;
const getResendClient = () => {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
};

const fromEmail = process.env.FROM_EMAIL || 'noreply@essaydoctor.app';
const emailEnabled = process.env.ENABLE_EMAIL_SENDING === 'true';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  if (!emailEnabled) {
    console.log('Email sending disabled. Verification token:', token);
    console.log('Verification URL:', `${appUrl}/verify-email?token=${token}`);
    return { success: true };
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const verificationUrl = `${appUrl}/verify-email?token=${token}`;

  try {
    const resend = getResendClient();
    if (!resend) {
      throw new Error('Resend client not initialized');
    }

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Verify your Essay Doctor account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to Essay Doctor!</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Thank you for signing up. Please verify your email address by clicking the button below:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}"
               style="background-color: #0070f3; color: white; padding: 12px 30px;
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #999; font-size: 14px;">
            If the button doesn't work, copy and paste this URL into your browser:
          </p>
          <p style="color: #0070f3; font-size: 14px; word-break: break-all;">
            ${verificationUrl}
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">
            This link will expire in 24 hours. If you didn't create an account,
            you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  if (!emailEnabled) {
    console.log('Email sending disabled. Password reset token:', token);
    console.log('Reset URL:', `${appUrl}/reset-password?token=${token}`);
    return { success: true };
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  try {
    const resend = getResendClient();
    if (!resend) {
      throw new Error('Resend client not initialized');
    }

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Reset your Essay Doctor password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Password Reset Request</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="background-color: #0070f3; color: white; padding: 12px 30px;
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #999; font-size: 14px;">
            If the button doesn't work, copy and paste this URL into your browser:
          </p>
          <p style="color: #0070f3; font-size: 14px; word-break: break-all;">
            ${resetUrl}
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">
            This link will expire in 1 hour. If you didn't request a password reset,
            you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}
