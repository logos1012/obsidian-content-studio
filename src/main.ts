import { App, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf, normalizePath } from 'obsidian';
import { StudioView, VIEW_TYPE } from './view';
import { findClaude } from './claude';

export interface Settings { ideaFolder: string; claudePath: string }
const DEFAULTS: Settings = { ideaFolder: '콘텐츠 스튜디오/아이디어', claudePath: '' };

export default class ContentStudioPlugin extends Plugin {
  settings: Settings = { ...DEFAULTS };

  async onload() {
    this.settings = { ...DEFAULTS, ...(await this.loadData()) };
    this.registerView(VIEW_TYPE, leaf => new StudioView(leaf, this));
    this.addRibbonIcon('pin', '콘텐츠 스튜디오 열기', () => void this.openView());
    this.addCommand({ id: 'open', name: '콘텐츠 스튜디오 열기', callback: () => void this.openView() });
    this.addCommand({
      id: 'open-current-idea', name: '현재 노트를 아이디어로 열기',
      checkCallback: c => { const f = this.app.workspace.getActiveFile(); const ok = !!f && this.isIdea(f); if (ok && !c) void this.openView(f!); return ok; }
    });
    this.addCommand({ id: 'open-elsewhere', name: '다른 위치의 아이디어 열기', callback: () => void this.openView(undefined, true) });
    this.addSettingTab(new StudioSettings(this.app, this));
  }

  isIdea(f: TFile) { return this.app.metadataCache.getFileCache(f)?.frontmatter?.['content-studio'] === 'idea'; }
  async saveSettings() { await this.saveData(this.settings); }
  folder() { return normalizePath(this.settings.ideaFolder.trim() || DEFAULTS.ideaFolder); }

  async openView(file?: TFile, everywhere = false) {
    let leaf: WorkspaceLeaf | null = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0] ?? null;
    if (!leaf) { leaf = this.app.workspace.getLeaf('tab'); await leaf.setViewState({ type: VIEW_TYPE, active: true }); }
    this.app.workspace.revealLeaf(leaf);
    const v = leaf.view as StudioView;
    if (file) await v.openIdea(file); else v.showList(everywhere);
  }
}

class StudioSettings extends PluginSettingTab {
  constructor(app: App, private plugin: ContentStudioPlugin) { super(app, plugin); }
  display() {
    const el = this.containerEl; el.empty();
    new Setting(el).setName('아이디어 폴더').setDesc('새 아이디어 노트가 만들어지는 폴더입니다. 바꿔도 기존 노트는 옮기지 않아요. 없으면 만들어요.')
      .addText(t => t.setValue(this.plugin.settings.ideaFolder).onChange(async v => { this.plugin.settings.ideaFolder = v; await this.plugin.saveSettings(); }));
    const detected = findClaude('');
    new Setting(el).setName('Claude Code 실행 파일 경로').setDesc(`비워 두면 자동으로 찾아요. 지금: ${detected ?? '찾지 못했어요'}`)
      .addText(t => t.setPlaceholder('/opt/homebrew/bin/claude').setValue(this.plugin.settings.claudePath).onChange(async v => { this.plugin.settings.claudePath = v; await this.plugin.saveSettings(); }));
  }
}
