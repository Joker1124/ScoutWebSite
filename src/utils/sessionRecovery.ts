import { authService } from '../services/authService';
import { tokenStorage } from '../services/TokenStorage';

/**
 * وظيفة استعادة الجلسة عند فتح التطبيق
 */
export const recoverSession = async () => {
  console.log('جاري محاولة استعادة الجلسة...');
  
  try {
    // 1. جلب بيانات المستخدم المخزنة
    const userData = await tokenStorage.getUserData();
    if (!userData) {
      console.log('لا توجد بيانات مستخدم مخزنة');
      return null;
    }

    // 2. محاولة تجديد التوكن
    const accessToken = await authService.getValidToken();
    if (!accessToken) {
      console.log('فشل تجديد التوكن، الجلسة منتهية');
      await tokenStorage.clearAll();
      return null;
    }

    console.log('تم استعادة الجلسة بنجاح');
    return userData;
  } catch (err) {
    console.error('Session recovery error:', err);
    return null;
  }
};
