import { redirect } from '@sveltejs/kit';

export const ssr = false;

export function load() {
  // 服务端/加载阶段直接重定向到统一身份验证端
  redirect(302, 'https://auth.eacof.org/login');
}
