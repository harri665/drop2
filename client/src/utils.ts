export function relTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function fileIcon(mimeType?: string, name?: string): string {
  const ext = name?.split('.').pop()?.toLowerCase() ?? '';
  if (mimeType?.startsWith('image/')) return '🖼️';
  if (mimeType?.startsWith('video/')) return '🎬';
  if (mimeType?.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf' || ext === 'pdf') return '📄';
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) return '🗜️';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx'].includes(ext)) return '📊';
  if (['ppt', 'pptx'].includes(ext)) return '📑';
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'c', 'cpp', 'java'].includes(ext)) return '💻';
  if (['txt', 'md'].includes(ext)) return '📃';
  return '📁';
}

const ADJECTIVES = [
  'swift', 'quiet', 'brave', 'bright', 'calm', 'dark', 'fast', 'free',
  'gold', 'grand', 'green', 'happy', 'kind', 'large', 'light', 'long',
  'lucky', 'neat', 'nice', 'odd', 'open', 'pure', 'rare', 'red',
  'rich', 'sharp', 'shy', 'slim', 'soft', 'bold', 'cool', 'deep',
  'flat', 'fresh', 'full', 'glad', 'hard', 'holy', 'huge', 'icy',
  'just', 'keen', 'lean', 'live', 'lone', 'loud', 'low', 'mad',
  'mild', 'mint', 'new', 'next', 'old', 'pale', 'pink', 'plain',
  'plum', 'raw', 'real', 'ripe', 'rose', 'round', 'safe', 'sage',
  'salt', 'same', 'sane', 'true', 'vast', 'warm', 'wide', 'wild',
  'wise', 'witty', 'young', 'zeal',
];

const NOUNS = [
  'drop', 'note', 'link', 'page', 'file', 'code', 'data', 'base',
  'node', 'leaf', 'root', 'bird', 'boat', 'book', 'buck', 'bush',
  'cake', 'card', 'cart', 'chip', 'city', 'clip', 'club', 'clue',
  'coin', 'colt', 'copy', 'core', 'corn', 'crew', 'crop', 'cube',
  'curl', 'dawn', 'deal', 'deck', 'deed', 'deer', 'demo', 'desk',
  'dial', 'dice', 'dime', 'disk', 'dock', 'dome', 'door', 'dove',
  'down', 'draw', 'drum', 'duck', 'dump', 'dusk', 'dust', 'echo',
  'edge', 'elf', 'epic', 'fact', 'farm', 'fate', 'fawn', 'feed',
  'fern', 'flag', 'flaw', 'flea', 'flew', 'flip', 'flow', 'foam',
  'fold', 'folk', 'font', 'ford', 'fork', 'form', 'fort', 'fox',
  'frog', 'fuel', 'fuse', 'gate', 'gear', 'gem', 'gift', 'gist',
  'glow', 'glue', 'goal', 'grid', 'grip', 'gust', 'hack', 'halo',
  'hand', 'haze', 'head', 'heap', 'heat', 'heel', 'helm', 'herb',
  'hero', 'hike', 'hill', 'hint', 'hive', 'hole', 'home', 'hook',
  'horn', 'host', 'hour', 'hive', 'hulk', 'husk', 'icon', 'idea',
];

export function randomSlug(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}-${noun}-${num}`;
}

export function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
