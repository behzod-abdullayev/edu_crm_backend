const fs = require('fs');
const path = require('path');

// ─── Sozlamalar ───────────────────────────────────────────────────────────────

const OUTPUT_FILE = path.join(__dirname, 'Barcha_kodlar.txt');

// Bu papka va fayllarni O'TKAZIB yuboradi
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'logs',
  'uploads',
  '.git',
  '.vscode',
  '.idea',
  'coverage',
  '__pycache__',
]);

// Bu kengaytmali fayllarni O'TKAZIB yuboradi (binary, media, lock)
const SKIP_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp',
  '.mp4', '.mp3', '.wav', '.avi', '.mov',
  '.zip', '.rar', '.tar', '.gz', '.7z',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.ttf', '.woff', '.woff2', '.eot', '.otf',
  '.exe', '.dll', '.so', '.bin',
  '.map',           // source map fayllar (juda katta, keraksiz)
  '.lock',          // package-lock.json, yarn.lock — o'tkazib yuboriladi quyida
]);

// Bu aniq fayl nomlarini O'TKAZIB yuboradi
const SKIP_FILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'Barcha_kodlar.txt',  // o'zini o'zi yozmasin
  'kod.js',             // bu skriptning o'zi
  '.DS_Store',
  'Thumbs.db',
]);

// Faqat shu papkalarni QAMRAB oladi (bo'sh qolsa — hammasi)
// Agar faqat muayyan papkalarni xohlasangiz, bu yerga yozing:
// const INCLUDE_ONLY = ['src', 'test'];
const INCLUDE_ONLY = []; // bo'sh = hamma narsa

// ─── Statistika ───────────────────────────────────────────────────────────────
let stats = {
  totalFiles: 0,
  skippedFiles: 0,
  totalLines: 0,
  totalSize: 0,
  fileList: [],
};

// ─── Yordamchi funksiyalar ────────────────────────────────────────────────────

function shouldSkip(filePath, name, isDir) {
  if (isDir) return SKIP_DIRS.has(name);

  if (SKIP_FILES.has(name)) return true;

  const ext = path.extname(name).toLowerCase();
  if (SKIP_EXTENSIONS.has(ext)) return true;

  // Yashirin fayllarni saqlaydi (.env, .eslintrc va h.k.) — faqat sof binary o'tkaziladi
  return false;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function separator(label) {
  const line = '═'.repeat(60);
  return `\n\n${line}\n  📄 ${label}\n${line}\n`;
}

// ─── Asosiy traverse ─────────────────────────────────────────────────────────

let result = '';

function traverse(dir, depth = 0) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  // Avval papkalar, keyin fayllar (tartib uchun)
  const dirs = entries.filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  const files = entries.filter(e => !e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of [...dirs, ...files]) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(__dirname, fullPath);

    if (entry.isDirectory()) {
      if (shouldSkip(fullPath, entry.name, true)) {
        stats.skippedFiles++;
        continue;
      }
      traverse(fullPath, depth + 1);
    } else {
      if (shouldSkip(fullPath, entry.name, false)) {
        stats.skippedFiles++;
        continue;
      }

      let content;
      try {
        content = fs.readFileSync(fullPath, 'utf8');
      } catch {
        // Binary fayl — o'tkazib yubor
        stats.skippedFiles++;
        continue;
      }

      const lineCount = content.split('\n').length;
      const fileSize = Buffer.byteLength(content, 'utf8');

      stats.totalFiles++;
      stats.totalLines += lineCount;
      stats.totalSize += fileSize;
      stats.fileList.push(`  ${relativePath.padEnd(55)} ${String(lineCount).padStart(5)} qator   ${formatSize(fileSize)}`);

      result += separator(relativePath);
      result += content;
    }
  }
}

// ─── Ishga tushirish ──────────────────────────────────────────────────────────

console.log('🔍 Loyiha fayllari yig\'ilmoqda...\n');

const startTime = Date.now();

if (INCLUDE_ONLY.length > 0) {
  for (const dir of INCLUDE_ONLY) {
    const fullDir = path.join(__dirname, dir);
    if (fs.existsSync(fullDir)) traverse(fullDir);
  }
} else {
  // Root dagi fayllarni ham qo'shadi (.env, package.json, docker-compose va h.k.)
  traverse(__dirname);
}

// ─── Header yozish ───────────────────────────────────────────────────────────

const header = `${'█'.repeat(62)}
██                                                          ██
██         LOYIHA TO'LIQ KOD ARXIVI                        ██
██                                                          ██
${'█'.repeat(62)}

📁 Papka    : ${__dirname}
📅 Sana     : ${new Date().toLocaleString('uz-UZ')}
📊 Fayllar  : ${stats.totalFiles} ta fayl
📝 Qatorlar : ${stats.totalLines.toLocaleString()} qator
💾 Hajm     : ${formatSize(stats.totalSize)}
⏱  Vaqt     : ${Date.now() - startTime} ms

${'─'.repeat(62)}
FAYL RO'YXATI:
${'─'.repeat(62)}
${stats.fileList.join('\n')}

${'─'.repeat(62)}

`;

// ─── Saqlash ─────────────────────────────────────────────────────────────────

try {
  fs.writeFileSync(OUTPUT_FILE, header + result, 'utf8');

  console.log('✅ Muvaffaqiyatli!\n');
  console.log(`📁 Fayl    : ${OUTPUT_FILE}`);
  console.log(`📊 Fayllar : ${stats.totalFiles} ta`);
  console.log(`📝 Qatorlar: ${stats.totalLines.toLocaleString()} ta`);
  console.log(`💾 Hajm    : ${formatSize(stats.totalSize)}`);
  console.log(`⏱  Vaqt    : ${Date.now() - startTime} ms`);
  console.log(`\n🚫 O'tkazilgan: ${stats.skippedFiles} ta fayl (node_modules, dist, binary...)`);
} catch (err) {
  console.error('❌ Yozishda xatolik:', err.message);
}