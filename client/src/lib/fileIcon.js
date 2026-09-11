import { File, FileArchive, FileAudio, FileCode, FileText, FileVideo } from 'lucide-react'
import { extension } from './format'

export function fileIcon(mime, name) {
  const ext = extension(name)
  if (mime?.startsWith('video/')) return FileVideo
  if (mime?.startsWith('audio/')) return FileAudio
  if (['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz'].includes(ext)) return FileArchive
  if (['pdf', 'doc', 'docx', 'rtf', 'odt', 'pages'].includes(ext)) return FileText
  if (['html', 'js', 'ts', 'py', 'json', 'xml', 'sh'].includes(ext)) return FileCode
  return File
}
