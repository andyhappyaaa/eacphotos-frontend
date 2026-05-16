import { defineConfig } from 'vite';

// Vite 配置文件 - 用于开发服务器和生产构建

export default defineConfig({
  // 根目录（所有源文件都在此目录下）
  root: 'src',

  // 构建输出配置
  build: {
    // 输出目录（相对于项目根目录）
    outDir: '../dist',
    // 清空输出目录
    emptyOutDir: true,

    // Rollup 配置（用于构建优化）
    rollupOptions: {
      // 入口点（多页面应用）
      input: {
        // 主页
        main: 'index.html',
        // 图库页
        gallery: 'gallery.html',
        // 搜索页
        search: 'search.html',
        // 上传页
        upload: 'upload.html',
        // 登录页
        login: 'login.html',
        // 注册页
        register: 'register.html',
        // 个人主页
        profile: 'profile.html',
        // 新闻页
        news: 'news.html'
      }
    }
  },

  // 开发服务器配置
  server: {
    // 服务器端口
    port: 3000,

    // API 代理配置
    // 开发时将 /api 请求代理到后端
    proxy: {
      '/api': {
        // 后端开发服务器地址
        target: 'http://localhost:8787',
        // 改变请求头的 origin
        changeOrigin: true
      }
    }
  }
});
