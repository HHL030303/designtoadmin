import dayjs from 'dayjs'
import ExcelJS from 'exceljs'
import { courseFormOptions } from '../constants/courseForm'
import type { CreateCoursePayload } from '../types'

const TEMPLATE_SHEET_NAME = '新建课件'
const OPTION_SHEET_NAME = '下拉选项'
const TEMPLATE_FILE_PREFIX = '新建课件表单导出模板'
const MAX_TEMPLATE_ROWS = 200
const DATE_OPTION_DAYS = 365

type CourseImportField = keyof CreateCoursePayload

interface TemplateColumn {
  key: CourseImportField
  header: string
  width: number
  required: boolean
  manualEntry?: boolean
  options?: readonly string[]
}

const dateOptions = Array.from({ length: DATE_OPTION_DAYS }, (_, index) =>
  dayjs().add(index, 'day').format('YYYY-MM-DD'),
)

export const courseImportColumns: TemplateColumn[] = [
  { key: 'series', header: '品牌', width: 14, required: true, options: courseFormOptions.series },
  { key: 'subject', header: '学科', width: 12, required: true, options: courseFormOptions.subject },
  {
    key: 'educationStage',
    header: '学段',
    width: 12,
    required: true,
    options: courseFormOptions.educationStage,
  },
  { key: 'grade', header: '年级', width: 12, required: true, options: courseFormOptions.grade },
  { key: 'volume', header: '分册', width: 16, required: true, options: courseFormOptions.volume },
  {
    key: 'textbook',
    header: '教材版本',
    width: 14,
    required: true,
    options: courseFormOptions.textbook,
  },
  { key: 'chapterName', header: '单元/章节', width: 24, required: false, manualEntry: true },
  { key: 'title', header: '课件名称', width: 28, required: true, manualEntry: true },
  {
    key: 'researchOwner',
    header: '制作老师',
    width: 14,
    required: true,
    options: courseFormOptions.researchOwner,
  },
  {
    key: 'orderType',
    header: '订单类型',
    width: 14,
    required: true,
    options: courseFormOptions.orderType,
  },
  { key: 'isBEnd', header: '是否B端', width: 12, required: true, options: courseFormOptions.isBEnd },
  {
    key: 'hasLessonPlan',
    header: '教案',
    width: 12,
    required: true,
    options: courseFormOptions.hasLessonPlan,
  },
  { key: 'hasScript', header: '逐字稿', width: 12, required: false, options: courseFormOptions.hasScript },
  {
    key: 'artCopyright',
    header: '版权登记（美术）',
    width: 18,
    required: true,
    options: courseFormOptions.artCopyright,
  },
  {
    key: 'textCopyright',
    header: '版权登记（文字）',
    width: 18,
    required: true,
    options: courseFormOptions.textCopyright,
  },
  {
    key: 'researchDueDate',
    header: '老师预期交稿时间',
    width: 18,
    required: true,
    options: dateOptions,
  },
  {
    key: 'finalDueDate',
    header: '课件预期交付日期',
    width: 18,
    required: true,
    options: dateOptions,
  },
]

function getColumnName(columnIndex: number): string {
  let current = columnIndex
  let result = ''

  while (current > 0) {
    const remainder = (current - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    current = Math.floor((current - 1) / 26)
  }

  return result
}

function getCellText(
  row: ExcelJS.Row,
  columnIndex: number,
): string {
  const cell = row.getCell(columnIndex)

  if (cell.value instanceof Date) {
    return dayjs(cell.value).format('YYYY-MM-DD')
  }

  if (typeof cell.value === 'number' && courseImportColumns[columnIndex - 1]?.options === dateOptions) {
    return dayjs(new Date(Math.round((cell.value - 25569) * 86400 * 1000))).format('YYYY-MM-DD')
  }

  return String(cell.text ?? '').trim()
}

function normalizeDateValue(value: string, rowNumber: number, header: string): string {
  const normalized = value.trim()
  const parsed = dayjs(normalized, ['YYYY-MM-DD', 'YYYY/M/D', 'YYYY/M/DD', 'YYYY/MM/DD'], true)

  if (!parsed.isValid()) {
    throw new Error(`第 ${rowNumber} 行“${header}”不是有效日期，请使用 YYYY-MM-DD`)
  }

  return parsed.format('YYYY-MM-DD')
}

export function buildCourseImportTemplateWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(TEMPLATE_SHEET_NAME)
  const optionSheet = workbook.addWorksheet(OPTION_SHEET_NAME)

  sheet.columns = courseImportColumns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }))

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 24

  const noteRow = sheet.getRow(2)
  noteRow.height = 22

  courseImportColumns.forEach((column, index) => {
    const noteCell = noteRow.getCell(index + 1)
    const noteText = column.manualEntry ? '手动输入' : '下拉选择'
    noteCell.value = `${column.required ? '必填' : '选填'}｜${noteText}`
    noteCell.font = { color: { argb: 'FF666666' }, size: 11 }
    noteCell.alignment = { vertical: 'middle', horizontal: 'center' }

    if (!column.options) {
      return
    }

    const optionColumn = optionSheet.getColumn(index + 1)
    optionColumn.values = [undefined, ...column.options]
    optionColumn.width = Math.max(
      column.header.length + 4,
      ...column.options.map((item) => item.length + 2),
    )

    const optionColumnName = getColumnName(index + 1)
    const formula = `'${OPTION_SHEET_NAME}'!$${optionColumnName}$1:$${optionColumnName}$${column.options.length}`

    for (let rowNumber = 3; rowNumber <= MAX_TEMPLATE_ROWS + 2; rowNumber += 1) {
      sheet.getCell(rowNumber, index + 1).dataValidation = {
        type: 'list',
        allowBlank: !column.required,
        formulae: [formula],
        showErrorMessage: true,
        errorTitle: '输入无效',
        error: `请从下拉中选择“${column.header}”`,
      }
    }
  })

  sheet.views = [{ state: 'frozen', ySplit: 2 }]
  sheet.autoFilter = { from: 'A1', to: `${getColumnName(courseImportColumns.length)}1` }
  optionSheet.state = 'veryHidden'

  return workbook
}

export async function downloadCourseImportTemplate(): Promise<void> {
  const workbook = buildCourseImportTemplateWorkbook()
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob(
    [buffer],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  )
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = `${TEMPLATE_FILE_PREFIX}_${dayjs().format('YYYYMMDD')}.xlsx`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export async function parseCourseImportBuffer(buffer: ArrayBuffer): Promise<CreateCoursePayload[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const sheet = workbook.getWorksheet(TEMPLATE_SHEET_NAME) ?? workbook.worksheets[0]
  if (!sheet) {
    throw new Error('Excel 中没有可读取的工作表')
  }

  const headerMap = new Map<string, CourseImportField>()
  courseImportColumns.forEach((column) => {
    headerMap.set(column.header, column.key)
  })

  const columnIndexMap = new Map<CourseImportField, number>()
  sheet.getRow(1).eachCell((cell, columnIndex) => {
    const key = headerMap.get(String(cell.text ?? '').trim())
    if (key) {
      columnIndexMap.set(key, columnIndex)
    }
  })

  const requiredColumns = courseImportColumns.filter((column) => column.required)
  for (const column of requiredColumns) {
    if (!columnIndexMap.has(column.key)) {
      throw new Error(`Excel 缺少必需列“${column.header}”`)
    }
  }

  const payloads: CreateCoursePayload[] = []

  for (let rowNumber = 3; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    const rowValues = courseImportColumns.map((column) => {
      const columnIndex = columnIndexMap.get(column.key)
      return columnIndex ? getCellText(row, columnIndex) : ''
    })
    const hasAnyValue = rowValues.some((value) => value.length > 0)

    if (!hasAnyValue) {
      continue
    }

    const record = {} as CreateCoursePayload

    for (const column of courseImportColumns) {
      const columnIndex = columnIndexMap.get(column.key)
      const rawValue = columnIndex ? getCellText(row, columnIndex) : ''

      if (column.required && rawValue.length === 0) {
        throw new Error(`第 ${rowNumber} 行缺少必填字段“${column.header}”`)
      }

      if ((column.key === 'researchDueDate' || column.key === 'finalDueDate') && rawValue.length > 0) {
        ;(record as Record<CourseImportField, string | undefined>)[column.key] = normalizeDateValue(
          rawValue,
          rowNumber,
          column.header,
        )
        continue
      }

      if (rawValue.length > 0) {
        ;(record as Record<CourseImportField, string | undefined>)[column.key] = rawValue
      }
    }

    payloads.push(record)
  }

  if (payloads.length === 0) {
    throw new Error('Excel 中没有可导入的数据')
  }

  return payloads
}

export async function parseCourseImportFile(file: File): Promise<CreateCoursePayload[]> {
  const buffer = await file.arrayBuffer()
  return parseCourseImportBuffer(buffer)
}
