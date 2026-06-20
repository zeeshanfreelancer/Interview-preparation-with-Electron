export const isElectron = () =>
  typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);

export const openJsonFile = () => window.electronAPI?.openJsonFile?.() ?? null;

export const saveFile = (options) => window.electronAPI?.saveFile?.(options) ?? null;
