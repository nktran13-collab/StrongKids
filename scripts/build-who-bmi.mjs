/**
 * Chuyển bảng WHO BMI-for-age (5–19 tuổi) từ file .xlsx chính thức
 * thành dữ liệu TypeScript gọn cho ứng dụng.
 *
 * Nguồn tải:
 * https://www.who.int/tools/growth-reference-data-for-5to19-years/indicators/bmi-for-age
 * File: bmi-boys-z-who-2007-exp.xlsx, bmi-girls-z-who-2007-exp.xlsx
 *
 * Cách dùng: node scripts/build-who-bmi.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outFile = path.join(root, 'src', 'content', 'whoBmi.ts')

function readZip(file) {
  const buf = fs.readFileSync(file)
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error(`Không phải file zip/xlsx hợp lệ: ${file}`)
  const count = buf.readUInt16LE(eocd + 10)
  let offset = buf.readUInt32LE(eocd + 16)
  const entries = new Map()
  for (let i = 0; i < count; i += 1) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) throw new Error('Central directory hỏng')
    const method = buf.readUInt16LE(offset + 10)
    const compSize = buf.readUInt32LE(offset + 20)
    const nameLen = buf.readUInt16LE(offset + 28)
    const extraLen = buf.readUInt16LE(offset + 30)
    const commentLen = buf.readUInt16LE(offset + 32)
    const localOffset = buf.readUInt32LE(offset + 42)
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLen)
    entries.set(name, { method, compSize, localOffset })
    offset += 46 + nameLen + extraLen + commentLen
  }
  return { buf, entries }
}

function readEntry(zip, name) {
  const entry = zip.entries.get(name)
  if (!entry) throw new Error(`Thiếu ${name}`)
  const { buf } = zip
  if (buf.readUInt32LE(entry.localOffset) !== 0x04034b50) throw new Error('Local header hỏng')
  const nameLen = buf.readUInt16LE(entry.localOffset + 26)
  const extraLen = buf.readUInt16LE(entry.localOffset + 28)
  const start = entry.localOffset + 30 + nameLen + extraLen
  const data = buf.subarray(start, start + entry.compSize)
  return entry.method === 0 ? data : zlib.inflateRawSync(data)
}

function extract(file) {
  const zip = readZip(file)
  const xml = readEntry(zip, 'xl/worksheets/sheet1.xml').toString('utf8')
  const rows = []
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = {}
    for (const cellMatch of rowMatch[1].matchAll(/<c r="([A-Z]+)\d+"[^>]*>([\s\S]*?)<\/c>/g)) {
      const value = cellMatch[2].match(/<v>([^<]*)<\/v>/)
      if (value) cells[cellMatch[1]] = Number(value[1])
    }
    if (Number.isFinite(cells.A) && Number.isFinite(cells.B)) rows.push(cells)
  }
  // Bỏ dòng tiêu đề và chỉ giữ các cột Month, L, M, S.
  return rows
    .filter((row) => row.A >= 61 && row.A <= 228)
    .sort((a, b) => a.A - b.A)
    .map((row) => ({
      month: row.A,
      l: Number(row.B.toPrecision(9)),
      m: Number(row.C.toPrecision(9)),
      s: Number(row.D.toPrecision(9)),
    }))
}

function table(rows) {
  if (rows.length !== 168) throw new Error(`Số dòng không đúng: ${rows.length}`)
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].month !== 61 + i) throw new Error(`Thiếu tháng ${61 + i}`)
  }
  const format = (values) => {
    const lines = []
    for (let i = 0; i < values.length; i += 8) {
      lines.push(`    ${values.slice(i, i + 8).join(', ')},`)
    }
    return lines.join('\n')
  }
  return `{
    l: [
${format(rows.map((row) => row.l))}
    ],
    m: [
${format(rows.map((row) => row.m))}
    ],
    s: [
${format(rows.map((row) => row.s))}
    ],
  }`
}

const boys = extract(path.join(root, 'data', 'who', 'bmi-boys-z-who-2007-exp.xlsx'))
const girls = extract(path.join(root, 'data', 'who', 'bmi-girls-z-who-2007-exp.xlsx'))

const content = `// AUTO-GENERATED bởi scripts/build-who-bmi.mjs — không sửa tay.
// Nguồn: WHO Growth reference data for 5–19 years, BMI-for-age (2007).
// https://www.who.int/tools/growth-reference-data-for-5to19-years/indicators/bmi-for-age
// Tải ngày: 2026-11-11. Giá trị L, M, S theo từng tháng tuổi (61–228 tháng).

export interface WhoBmiLmsTable {
  l: number[]
  m: number[]
  s: number[]
}

export const WHO_BMI_LMS: {
  minMonth: number
  maxMonth: number
  source: string
  sourceUrl: string
  retrieved: string
  boys: WhoBmiLmsTable
  girls: WhoBmiLmsTable
} = {
  minMonth: 61,
  maxMonth: 228,
  source: 'WHO BMI-for-age (5–19 years), 2007 growth reference',
  sourceUrl: 'https://www.who.int/tools/growth-reference-data-for-5to19-years/indicators/bmi-for-age',
  retrieved: '2026-11-11',
  boys: ${table(boys)},
  girls: ${table(girls)},
}
`

fs.writeFileSync(outFile, content)
console.log(`Đã ghi ${outFile} (${boys.length} tháng nam, ${girls.length} tháng nữ)`)
