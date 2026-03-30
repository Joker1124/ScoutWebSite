import { tokenStorage } from './TokenStorage';
import { supabase } from '../../supabaseClient';

/**
 * خدمة المصادقة المركزية
 */
export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  static getInstance() {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(email: string, password: string): Promise<any> {
    try {
      // جلب المستخدم بالبريد الإلكتروني من Supabase مباشرة
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error || !user) {
        throw new Error('بيانات الدخول غير صحيحة');
      }

      // التحقق من كلمة السر (نص خام كما في السيرفر الأصلي)
      const dbPassword = user.password || user.password_hash;
      if (dbPassword !== password) {
        throw new Error('بيانات الدخول غير صحيحة');
      }

      // التحقق من حالة الحساب
      if (user.status !== 'active') {
        throw new Error('الحساب بانتظار التفعيل');
      }

      // في الحل المباشر (Client-side)، لا نحتاج لتوكنات JWT مخصصة من السيرفر
      // سنقوم بحفظ بيانات المستخدم محلياً
      const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        unit_id: user.unit_id
      };

      // نستخدم توكن وهمي للتوافق مع بقية الكود، أو يمكننا استخدام توكن Supabase إذا فعلنا Auth
      const dummyToken = 'client-side-session';
      await tokenStorage.saveTokens(dummyToken, dummyToken, userData);
      
      return userData;
    } catch (err: any) {
      console.error('Login error:', err);
      throw err;
    }
  }

  async logout() {
    await tokenStorage.clearAll();
    window.location.reload();
  }

  async refreshAccessToken(): Promise<string | null> {
    // في وضع الـ Client-side المباشر، لا نحتاج لتجديد التوكن المخصص
    return 'client-side-session';
  }

  async getValidToken(): Promise<string | null> {
    // دائماً نرجع التوكن الوهمي أو توكن Supabase
    return 'client-side-session';
  }
}

export const authService = AuthService.getInstance();
