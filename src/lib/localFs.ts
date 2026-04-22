/**
 * Utility for local file system access (File System Access API)
 * This allows "linking" local folders/files for persistent access in the browser.
 */

export interface LocalFileHandle {
  id: string;
  name: string;
  kind: 'file' | 'directory';
  handle: FileSystemHandle;
  lastAccessed: number;
}

export const requestLocalLink = async (kind: 'file' | 'directory' = 'directory'): Promise<FileSystemHandle | null> => {
  try {
    if (kind === 'directory') {
      // @ts-ignore - Only in modern browsers
      return await window.showDirectoryPicker();
    } else {
      // @ts-ignore
      const [handle] = await window.showOpenFilePicker();
      return handle;
    }
  } catch (err: any) {
    if (err.name === 'AbortError') return null;
    throw err;
  }
};

export const verifyPermission = async (fileHandle: FileSystemHandle, withWrite = false): Promise<boolean> => {
  const opts: any = {};
  if (withWrite) opts.mode = 'readwrite';
  
  // @ts-ignore
  if ((await fileHandle.queryPermission(opts)) === 'granted') return true;
  // @ts-ignore
  if ((await fileHandle.requestPermission(opts)) === 'granted') return true;
  
  return false;
};

export const readFileContent = async (fileHandle: FileSystemFileHandle): Promise<string> => {
  const file = await fileHandle.getFile();
  return await file.text();
};

export const writeFileContent = async (fileHandle: FileSystemFileHandle, contents: string): Promise<void> => {
  // @ts-ignore
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
};

export const listDirectoryFiles = async (dirHandle: FileSystemDirectoryHandle): Promise<LocalFileHandle[]> => {
  const results: LocalFileHandle[] = [];
  // @ts-ignore
  for await (const entry of dirHandle.values()) {
    results.push({
      id: `${dirHandle.name}/${entry.name}`,
      name: entry.name,
      kind: entry.kind as any,
      handle: entry,
      lastAccessed: Date.now()
    });
  }
  return results;
};
