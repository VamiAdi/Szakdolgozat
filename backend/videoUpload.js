const fs = require('fs')
const path = require('path')
const multer = require('multer')

const PUBLIC_DIR = path.join(__dirname, '..', 'public')
const ALLOWED_EXT = new Set(['.mp4', '.webm', '.mov', '.ogg'])
const MAX_BYTES = 100 * 1024 * 1024

function sanitizeVideoBasename(original) {
  const base = path.basename(String(original || 'video'))
  const ext = path.extname(base).toLowerCase()
  const stem = path
    .basename(base, ext)
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return `${stem || 'video'}${ext}`
}

function uniquePublicFilename(original) {
  let candidate = sanitizeVideoBasename(original)
  if (!ALLOWED_EXT.has(path.extname(candidate).toLowerCase())) {
    candidate = `${path.basename(candidate, path.extname(candidate))}.mp4`
  }
  const abs = path.join(PUBLIC_DIR, candidate)
  if (!fs.existsSync(abs)) return candidate
  const ext = path.extname(candidate)
  const stem = path.basename(candidate, ext)
  return `${stem}-${Date.now()}${ext}`
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true })
    cb(null, PUBLIC_DIR)
  },
  filename(_req, file, cb) {
    cb(null, uniquePublicFilename(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase()
    if (!ALLOWED_EXT.has(ext)) {
      const err = new Error('Csak mp4, webm, mov vagy ogg videó tölthető fel.')
      err.code = 'INVALID_VIDEO_TYPE'
      return cb(err)
    }
    cb(null, true)
  },
})

function uploadVideoMiddleware(req, res, next) {
  upload.single('video')(req, res, (err) => {
    if (!err) return next()
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'A videó legfeljebb 100 MB lehet.' })
    }
    if (err.code === 'INVALID_VIDEO_TYPE') {
      return res.status(400).json({ message: err.message })
    }
    console.error('Videó feltöltés hiba:', err)
    return res.status(400).json({ message: 'A videó feltöltése sikertelen.' })
  })
}

module.exports = {
  PUBLIC_DIR,
  uploadVideoMiddleware,
}
