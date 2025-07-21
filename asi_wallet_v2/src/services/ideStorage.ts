// IDE Storage Service for managing Rholang files and folders

export interface IDEFile {
  id: string;
  name: string;
  content: string;
  folderId?: string;
  type: 'file' | 'folder';
  modified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDEFolder {
  id: string;
  name: string;
  parentId?: string;
  type: 'folder';
  createdAt: Date;
  updatedAt: Date;
}

export type IDEItem = IDEFile | IDEFolder;

class IDEStorageService {
  private static readonly STORAGE_KEY = 'asi_wallet_ide_files';
  private static readonly WORKSPACE_KEY = 'asi_wallet_ide_workspace';
  private static readonly EXAMPLES_VERSION = '1.2'; // Increment when examples change

  static saveFiles(files: IDEItem[]): void {
    try {
      const serialized = JSON.stringify(files, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      });
      localStorage.setItem(this.STORAGE_KEY, serialized);
    } catch (error) {
      console.error('Error saving IDE files:', error);
    }
  }

  static loadFiles(): IDEItem[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const versionStored = localStorage.getItem(this.STORAGE_KEY + '_version');
      
      // If no files or version mismatch, use defaults
      if (!stored || versionStored !== this.EXAMPLES_VERSION) {
        const defaultFiles = this.getDefaultFiles();
        this.saveFiles(defaultFiles);
        localStorage.setItem(this.STORAGE_KEY + '_version', this.EXAMPLES_VERSION);
        return defaultFiles;
      }
      
      const parsed = JSON.parse(stored, (key, value) => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
          return new Date(value);
        }
        return value;
      });
      
      return parsed;
    } catch (error) {
      console.error('Error loading IDE files:', error);
      return this.getDefaultFiles();
    }
  }

  static getDefaultFiles(): IDEItem[] {
    const now = new Date();
    return [
      {
        id: 'examples-folder',
        name: 'Examples',
        type: 'folder',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'contracts-folder',
        name: 'Contracts',
        type: 'folder',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'hello-rho',
        name: 'hello.rho',
        content: `new stdout(\`rho:io:stdout\`), deployerId(\`rho:rchain:deployerId\`) in {
  stdout!("Hello from ASI Wallet!") |
  deployerId!("Deploy successful")
}`,
        folderId: 'examples-folder',
        type: 'file',
        modified: false,
        createdAt: now,
        updatedAt: now
      },
    ];
  }

  static exportFile(file: IDEFile): void {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static async importFile(file: File): Promise<IDEFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const now = new Date();
        const ideFile: IDEFile = {
          id: `file-${Date.now()}`,
          name: file.name,
          content,
          type: 'file',
          modified: false,
          createdAt: now,
          updatedAt: now
        };
        resolve(ideFile);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  static exportWorkspace(files: IDEItem[]): void {
    const workspace = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      files: files.filter(item => item.type === 'file'),
      folders: files.filter(item => item.type === 'folder')
    };
    
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asi-wallet-workspace-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static async importWorkspace(file: File): Promise<IDEItem[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const workspace = JSON.parse(content);
          
          if (!workspace.files || !workspace.folders) {
            throw new Error('Invalid workspace format');
          }
          
          const items: IDEItem[] = [
            ...workspace.folders.map((folder: any) => ({
              ...folder,
              createdAt: new Date(folder.createdAt),
              updatedAt: new Date(folder.updatedAt)
            })),
            ...workspace.files.map((file: any) => ({
              ...file,
              createdAt: new Date(file.createdAt),
              updatedAt: new Date(file.updatedAt)
            }))
          ];
          
          resolve(items);
        } catch (error) {
          reject(new Error('Failed to parse workspace file'));
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  static saveWorkspaceState(state: any): void {
    localStorage.setItem(this.WORKSPACE_KEY, JSON.stringify(state));
  }

  static loadWorkspaceState(): any {
    try {
      const stored = localStorage.getItem(this.WORKSPACE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}

export default IDEStorageService;