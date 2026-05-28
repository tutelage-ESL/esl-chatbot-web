import { setCookie } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { accessToken, refreshToken } = body;

  if (accessToken) {
    setCookie(event, 'accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  if (refreshToken) {
    setCookie(event, 'refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  return { success: true };
});