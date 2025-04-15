// src/vue-shim.d.ts
import { type ComponentCustomProperties } from 'vue';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $formatBytes(bytes: number): string;
    $formatSeconds(seconds: number): string;
    $formatTimestamp(timestamp: number, format: string): string;
  }
}

export const registerFilters = (app: any) => {

  app.config.globalProperties.$formatBytes = function (bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  };

  app.config.globalProperties.$formatSeconds = function (seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    const parts: string[] = [];

    if (hours > 0) { parts.push(`${hours}h`); }
    if (minutes > 0) { parts.push(`${minutes}m`); }
    if (remainingSeconds > 0 || parts.length === 0) { parts.push(`${remainingSeconds}s`); }

    return parts.join(' ');
  };

  app.config.globalProperties.$formatTimestamp = function (timestamp: number, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    const date = new Date(timestamp * 1000);
    const formatTokens: { [key: string]: string } = {
      'YYYY': date.getFullYear().toString(),
      'MM': String(date.getMonth() + 1).padStart(2, '0'), // Months are zero-based
      'DD': String(date.getDate()).padStart(2, '0'),
      'HH': String(date.getHours()).padStart(2, '0'),
      'mm': String(date.getMinutes()).padStart(2, '0'),
      'ss': String(date.getSeconds()).padStart(2, '0')
    };
    return format.replace(/YYYY|MM|DD|HH|mm|ss/g, (token) => formatTokens[token]);
  };
}

