// GitHub API utility for serverless app
export class GithubApi {
  // List the tree of the repository (recursive by default)
  async listTree(sha: string = 'HEAD', recursive: boolean = true): Promise<any[]> {
    // Get the SHA of the branch if 'HEAD' is passed
    let treeSha = sha;
    if (sha === 'HEAD') {
      // Correct endpoint for branch info
      const url = `https://api.github.com/repos/${this.owner}/${this.repo}/branches/${this.branch}`;
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) throw new Error('Failed to get branch info');
      const data = await res.json();
      treeSha = data.commit.commit.tree.sha;
    }
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees/${treeSha}${recursive ? '?recursive=1' : ''}`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) throw new Error('Failed to list tree');
    const data = await res.json();
    return data.tree;
  }
  token: string;
  owner: string;
  repo: string;
  branch: string;
  constructor(token: string, owner: string, repo: string, branch: string = 'main') {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
  }

  get headers() {
    return {
      Authorization: `token ${this.token}`,
      Accept: 'application/vnd.github.v3+json',
    };
  }

  async listFiles(path = ''): Promise<any[]> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) throw new Error('Failed to list files');
    return res.json();
  }

  async readFile(path: string): Promise<string> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) throw new Error('Failed to read file');
    const data = await res.json();
    return atob(data.content.replace(/\n/g, ''));
  }

  async writeFile(path: string, content: string, message = 'Update file'): Promise<any> {
    // Get SHA if file exists
    let sha = undefined;
    try {
      const file = await this.getFileMeta(path);
      sha = file.sha;
    } catch {}
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`;
    const body = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: this.branch,
      ...(sha ? { sha } : {}),
    };
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to write file');
    return res.json();
  }

  async getFileMeta(path: string): Promise<any> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) throw new Error('File not found');
    return res.json();
  }

  async uploadImage(path: string, file: File, message = 'Upload image'): Promise<any> {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          const content = (reader.result as string).split(',')[1];
          const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`;
          let sha = undefined;
          try {
            const meta = await this.getFileMeta(path);
            sha = meta.sha;
          } catch {}
          const body = {
            message,
            content,
            branch: this.branch,
            ...(sha ? { sha } : {}),
          };
          const res = await fetch(url, {
            method: 'PUT',
            headers: this.headers,
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error('Failed to upload image');
          resolve(await res.json());
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async getFileHistory(path: string): Promise<any[]> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/commits?path=${path}&sha=${this.branch}`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) throw new Error('Failed to get file history');
    return res.json();
  }

  async getFileAtCommit(path: string, sha: string): Promise<string> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}?ref=${sha}`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) throw new Error('Failed to get file at commit');
    const data = await res.json();
    return atob(data.content.replace(/\n/g, ''));
  }
}
