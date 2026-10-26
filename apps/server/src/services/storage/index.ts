import { LocalStorageService } from './localStorage.service';
export * from './storage.interface';
export * from './localStorage.service';

export const storageService = new LocalStorageService();
