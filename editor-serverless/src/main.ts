import './style.css';
import { GithubApi } from './github-api';


const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div style="display:flex; height:100vh;">
    <aside style="width:320px; background:#f5f5f5; padding:16px; box-sizing:border-box; border-right:1px solid #ddd; display:flex; flex-direction:column; gap:16px; min-height:0; align-items:flex-start; justify-content:center;">
      <!-- GitHub config is now loaded from app-config.json -->
      <div id="editor-ui" style="display:none; flex:1 1 0; flex-direction:column; min-height:0;">
        <button id="show-tree" style="width:100%;margin-bottom:8px;">Show Repo Tree</button>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <button id="change-config" style="flex:0 0 auto;">Change Config</button>
          <span style="font-size:0.9em;color:#888;">Config: <span id="config-name">src/app-config.json</span></span>
        </div>
        <div id="config-modal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); align-items:center; justify-content:center; z-index:1000;">
          <div style="background:#fff; color:#222; padding:24px; border-radius:8px; min-width:340px; max-width:90vw; max-height:90vh; display:flex; flex-direction:column; gap:12px;">
            <h3>Edit Config (<span id="modal-config-name"></span>)</h3>
            <textarea id="modal-config-content" style="width:100%;height:200px;font-family:monospace;"></textarea>
            <div style="display:flex;gap:8px;justify-content:flex-end;">
              <button id="modal-save-config">Save</button>
              <button id="modal-cancel-config">Cancel</button>
            </div>
          </div>
        </div>
        <div id="tree-view" style="flex:1 1 0; font-family:monospace; white-space:pre; background:#fff; border:1px solid #ccc; padding:8px; min-height:0; overflow:auto; text-align:left; display:flex; flex-direction:column; justify-content:center;"></div>
      </div>
    </aside>
    <main style="flex:1; padding:24px; box-sizing:border-box; overflow:auto;">
      <h1>Serverless Documentation Editor</h1>
      <div>
        <button id="list-files">List Files</button>
        <input id="filepath" placeholder="File path (e.g. docs/index.md)" />
        <button id="load-file">Load</button>
        <button id="save-file">Save</button>
        <button id="show-history">Show History</button>
      </div>
      <textarea id="editor" style="width:100%;height:200px;margin-top:16px;"></textarea>
      <div style="margin-top:16px;">
        <input type="file" id="image-upload" />
        <button id="upload-image">Upload Image</button>
      </div>
      <div id="file-list"></div>
      <div id="history-list"></div>
      <div id="diff-view"></div>
    </main>
  </div>
`;




let github: GithubApi | null = null;
let currentConfig = 'src/app-config.json';
function loadConfig(configPath: string) {
  fetch(configPath)
    .then(r => r.json())
    .then(cfg => {
      github = new GithubApi(cfg.token, cfg.owner, cfg.repo, cfg.branch);
      (document.getElementById('editor-ui') as HTMLDivElement).style.display = '';
      document.getElementById('config-name')!.textContent = configPath;
      currentConfig = configPath;
    })
    .catch(e => {
      alert('Failed to load ' + configPath + ': ' + e.message);
    });
}
loadConfig(currentConfig);

// Change config button logic with modal edit
const changeConfigBtn = document.getElementById('change-config') as HTMLButtonElement;
const configModal = document.getElementById('config-modal') as HTMLDivElement;
const modalConfigName = document.getElementById('modal-config-name') as HTMLSpanElement;
const modalConfigContent = document.getElementById('modal-config-content') as HTMLTextAreaElement;
const modalSaveConfig = document.getElementById('modal-save-config') as HTMLButtonElement;
const modalCancelConfig = document.getElementById('modal-cancel-config') as HTMLButtonElement;

if (changeConfigBtn) {
  changeConfigBtn.onclick = async () => {
    // Show modal with current config
    modalConfigName.textContent = currentConfig;
    try {
      const res = await fetch(currentConfig);
      const json = await res.json();
      modalConfigContent.value = JSON.stringify(json, null, 2);
    } catch (e) {
      modalConfigContent.value = '// Failed to load config: ' + (e as Error).message;
    }
    configModal.style.display = 'flex';
  };
}

if (modalCancelConfig) {
  modalCancelConfig.onclick = () => {
    configModal.style.display = 'none';
  };
}

if (modalSaveConfig) {
  modalSaveConfig.onclick = async () => {
    let newConfig;
    try {
      newConfig = JSON.parse(modalConfigContent.value);
    } catch (e) {
      alert('Invalid JSON: ' + (e as Error).message);
      return;
    }
    // Save config file using GitHub API (overwrite current config)
    try {
      await github!.writeFile(currentConfig, JSON.stringify(newConfig, null, 2), 'Update config');
      configModal.style.display = 'none';
      loadConfig(currentConfig);
    } catch (e) {
      alert('Failed to save config: ' + (e as Error).message);
    }
  };
}


// Show repo tree button logic
// Show file history button logic
const showHistoryBtn = document.getElementById('show-history') as HTMLButtonElement;
if (showHistoryBtn) {
  showHistoryBtn.onclick = async () => {
    if (!github) return;
    const filepath = (document.getElementById('filepath') as HTMLInputElement).value.trim();
    const historyList = document.getElementById('history-list');
    if (!filepath) {
      historyList!.textContent = 'No file selected.';
      return;
    }
    historyList!.textContent = 'Loading history...';
    try {
      const history = await github.getFileHistory(filepath);
      if (!history.length) {
        historyList!.textContent = 'No history found.';
        return;
      }
      historyList!.innerHTML = '<b>Commit History:</b><ul style="padding-left:16px;">' +
        history.map((commit, idx) => {
          // Hide SHA, make clickable for diff
          return `<li style="cursor:pointer;color:#222;" data-idx="${idx}"><b>${commit.commit.author.date}</b>: ${commit.commit.message}</li>`;
        }).join('') + '</ul>';

      // Add click listeners for diff
      Array.from(historyList!.querySelectorAll('li')).forEach(li => {
        li.addEventListener('click', async () => {
          const idx = parseInt(li.getAttribute('data-idx')!);
          if (isNaN(idx) || idx >= history.length - 1) return;
          const commit = history[idx];
          const prevCommit = history[idx + 1];
          const filepath = (document.getElementById('filepath') as HTMLInputElement).value.trim();
          const diffView = document.getElementById('diff-view');
          diffView!.textContent = 'Loading diff...';
          try {
            const oldContent = await github!.getFileAtCommit(filepath, prevCommit.sha);
            const newContent = await github!.getFileAtCommit(filepath, commit.sha);
            diffView!.innerHTML = renderDiff(oldContent, newContent);
          } catch (e) {
            diffView!.textContent = 'Error loading diff: ' + (e as Error).message;
          }
        });
      });
// Simple line-by-line diff renderer
function renderDiff(oldStr: string, newStr: string): string {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  let html = '<div style="font-family:monospace;white-space:pre;">';
  let i = 0, j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      html += `<div style="background:#fff;">${escapeHtml(oldLines[i])}</div>`;
      i++; j++;
    } else if (j < newLines.length && (i >= oldLines.length || oldLines[i] !== newLines[j])) {
      html += `<div style="background:#e6ffe6;">+ ${escapeHtml(newLines[j])}</div>`;
      j++;
    } else if (i < oldLines.length && (j >= newLines.length || oldLines[i] !== newLines[j])) {
      html += `<div style="background:#ffecec;">- ${escapeHtml(oldLines[i])}</div>`;
      i++;
    }
  }
  html += '</div>';
  return html;
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, function(tag) {
    const chars: any = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'};
    return chars[tag] || tag;
  });
}
    } catch (e) {
      historyList!.textContent = 'Error loading history: ' + (e as Error).message;
    }
  };
}
const showTreeBtn = document.getElementById('show-tree') as HTMLButtonElement;
if (showTreeBtn) {
  showTreeBtn.onclick = async () => {
    if (!github) return;
    const treeView = document.getElementById('tree-view');
    if (!treeView) return;
    treeView.textContent = 'Loading...';
    try {
      const tree = await github.listTree();
      // Build a nested tree structure
      const root: any = { children: {}, type: 'tree', path: '' };
      tree.forEach(item => {
        const parts = item.path.split('/');
        let node = root;
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (!node.children[part]) {
            node.children[part] = {
              children: {},
              type: i === parts.length - 1 ? item.type : 'tree',
              path: parts.slice(0, i + 1).join('/'),
              _item: i === parts.length - 1 ? item : undefined
            };
          }
          node = node.children[part];
        }
      });

      // Render the tree recursively, folders closed by default
      treeView.innerHTML = '';
      function renderNode(node: any, depth = 0): HTMLDivElement {
        const container = document.createElement('div');
        Object.entries(node.children).forEach(([name, child]: [string, any]) => {
          const el = document.createElement('div');
          el.style.marginLeft = (depth * 16) + 'px';
          el.style.color = '#222';
          el.style.userSelect = 'none';
          if (child.type === 'tree') {
            el.style.cursor = 'pointer';
            el.innerHTML = `<span style=\"font-weight:bold;\">▶️</span> 📁 ${name}`;
            let open = false;
            let childrenContainer: HTMLDivElement | null = null;
            el.onclick = (e) => {
              e.stopPropagation();
              open = !open;
              el.innerHTML = `<span style=\"font-weight:bold;\">${open ? '▼' : '▶️'} </span> 📁 ${name}`;
              if (open) {
                childrenContainer = renderNode(child, depth + 1);
                el.after(childrenContainer);
              } else if (childrenContainer) {
                childrenContainer.remove();
                childrenContainer = null;
              }
            };
            el.dataset.depth = String(depth);
            container.appendChild(el);
          } else {
            el.style.cursor = 'pointer';
            el.textContent = '📄 ' + name;
            el.onclick = async (e) => {
              e.stopPropagation();
              if (treeView) treeView.querySelectorAll('div').forEach(d => d.style.background = '');
              el.style.background = '#e0e0e0';
              try {
                const content = await github!.readFile(child.path);
                (document.getElementById('editor') as HTMLTextAreaElement).value = content;
                (document.getElementById('filepath') as HTMLInputElement).value = child.path;
              } catch (e) {
                alert('Failed to load file: ' + (e as Error).message);
              }
            };
            el.dataset.depth = String(depth);
            container.appendChild(el);
          }
        });
        return container;
      }
      if (treeView) {
        treeView.innerHTML = '';
        treeView.appendChild(renderNode(root, 0));
      }
    } catch (e) {
      let extra = '';
      if (e instanceof Error && 'response' in e) {
        extra = JSON.stringify((e as any).response);
      }
      treeView.textContent = 'Error loading tree: ' + (e as Error).message + '\n' + extra;
      // Also log to console for developer
      console.error('Error loading tree:', e);
    }
  };
}
