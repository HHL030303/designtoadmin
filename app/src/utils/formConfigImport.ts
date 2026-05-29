import ExcelJS from 'exceljs'
import type { FieldConfig, FieldConfigStatus, FieldOptionConfig, FormFieldType } from '../types'

const FIELD_SHEET_NAME = '字段配置'
const OPTION_SHEET_NAME = '选项配置明细'

type FieldConfigHeaderKey =
  | 'field_key'
  | 'field_name'
  | 'field_type'
  | 'required'
  | 'searchable'
  | 'default_value'
  | 'sort_value'
  | 'status'
  | 'span'
  | 'placeholder'
  | 'option_set_key'

type OptionHeaderKey =
  | 'option_set_key'
  | 'field_key'
  | 'label'
  | 'value'
  | 'sort_value'
  | 'status'

const VALID_FIELD_TYPES: FormFieldType[] = [
  'text',
  'textarea',
  'select',
  'number',
  'date',
  'boolean',
  'multi_select',
  'year'
]

const VALID_STATUSES: FieldConfigStatus[] = ['enabled', 'disabled']

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeCellValue(value: ExcelJS.CellValue | undefined | null): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    return value.text.trim()
  }

  return String(value).trim()
}

function readCellText(row: ExcelJS.Row, columnIndex: number): string {
  const cell = row.getCell(columnIndex)
  return normalizeCellValue(cell.value ?? cell.text)
}

function parseBooleanValue(
  rawValue: string,
  rowNumber: number,
  header: string,
): boolean {
  const normalized = rawValue.trim().toLowerCase()

  if (normalized === 'true') {
    return true
  }

  if (normalized === 'false') {
    return false
  }

  throw new Error(`第 ${rowNumber} 行“${header}”仅支持 true 或 false`)
}

function parseStatusValue(
  rawValue: string,
  rowNumber: number,
  header: string,
): FieldConfigStatus {
  const normalized = rawValue.trim().toLowerCase() as FieldConfigStatus

  if (VALID_STATUSES.includes(normalized)) {
    return normalized
  }

  throw new Error(`第 ${rowNumber} 行“${header}”仅支持 enabled 或 disabled`)
}

function parseFieldTypeValue(
  rawValue: string,
  rowNumber: number,
): FormFieldType {
  const normalized = rawValue.trim().toLowerCase() as FormFieldType

  if (VALID_FIELD_TYPES.includes(normalized)) {
    return normalized
  }

  throw new Error(`第 ${rowNumber} 行“field_type”不是支持的字段类型`)
}

function parseSortValue(rawValue: string, rowNumber: number, header: string): number {
  const parsed = Number(rawValue)

  if (!Number.isFinite(parsed)) {
    throw new Error(`第 ${rowNumber} 行“${header}”必须是数字`)
  }

  return parsed
}

function parseSpanValue(rawValue: string, rowNumber: number): 12 | 24 | undefined {
  if (rawValue.length === 0) {
    return 12
  }

  if (rawValue === '12' || rawValue === '24') {
    return Number(rawValue) as 12 | 24
  }

  throw new Error(`第 ${rowNumber} 行“span”仅支持 12 或 24`)
}

function parseDefaultValue(
  rawValue: string,
  fieldType: FormFieldType,
  rowNumber: number,
): string | number | boolean | undefined {
  if (rawValue.length === 0) {
    return undefined
  }

  if (fieldType === 'number') {
    return parseSortValue(rawValue, rowNumber, 'default_value')
  }

  if (fieldType === 'boolean') {
    return parseBooleanValue(rawValue, rowNumber, 'default_value')
  }

  return rawValue
}

function buildHeaderIndexMap<T extends string>(
  row: ExcelJS.Row,
  headers: readonly T[],
): Map<T, number> {
  const headerMap = new Map<T, number>()

  row.eachCell((cell, columnIndex) => {
    const key = String(cell.text ?? '').trim() as T
    if (headers.includes(key)) {
      headerMap.set(key, columnIndex)
    }
  })

  return headerMap
}

function ensureRequiredHeaders<T extends string>(
  headerMap: Map<T, number>,
  requiredHeaders: readonly T[],
  sheetName: string,
): void {
  for (const header of requiredHeaders) {
    if (!headerMap.has(header)) {
      throw new Error(`工作表“${sheetName}”缺少列“${header}”`)
    }
  }
}

function collectOptions(
  sheet: ExcelJS.Worksheet,
  headerMap: Map<OptionHeaderKey, number>,
): Map<string, FieldOptionConfig[]> {
  const groupedOptions = new Map<string, FieldOptionConfig[]>()

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    const optionSetKey = readCellText(row, headerMap.get('option_set_key') ?? 0)
    const fieldKey = readCellText(row, headerMap.get('field_key') ?? 0)
    const label = readCellText(row, headerMap.get('label') ?? 0)
    const value = readCellText(row, headerMap.get('value') ?? 0)
    const sortRaw = readCellText(row, headerMap.get('sort_value') ?? 0)
    const statusRaw = readCellText(row, headerMap.get('status') ?? 0)

    if (![optionSetKey, fieldKey, label, value, sortRaw, statusRaw].some(Boolean)) {
      continue
    }

    if (!optionSetKey || !fieldKey || !label || !value) {
      throw new Error(`工作表“${OPTION_SHEET_NAME}”第 ${rowNumber} 行有选项数据缺失`)
    }

    const optionStatus = parseStatusValue(statusRaw, rowNumber, 'status')
    if (optionStatus !== 'enabled') {
      continue
    }

    const option: FieldOptionConfig = {
      label,
      sort_value: parseSortValue(sortRaw, rowNumber, 'sort_value'),
      status: optionStatus,
      value,
    }

    const currentOptions = groupedOptions.get(optionSetKey) ?? []
    currentOptions.push(option)
    groupedOptions.set(optionSetKey, currentOptions)
  }

  groupedOptions.forEach((options, optionSetKey) => {
    const sortedOptions = [...options].sort(
      (left, right) => (left.sort_value ?? 0) - (right.sort_value ?? 0),
    )
    groupedOptions.set(optionSetKey, sortedOptions)
  })

  return groupedOptions
}

export async function parseFormConfigBuffer(buffer: ArrayBuffer): Promise<FieldConfig[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const fieldSheet = workbook.getWorksheet(FIELD_SHEET_NAME)
  const optionSheet = workbook.getWorksheet(OPTION_SHEET_NAME)

  if (!fieldSheet || !optionSheet) {
    throw new Error('Excel 中缺少“字段配置”或“选项配置明细”工作表')
  }

  const fieldHeaderMap = buildHeaderIndexMap<FieldConfigHeaderKey>(fieldSheet.getRow(1), [
    'field_key',
    'field_name',
    'field_type',
    'required',
    'searchable',
    'default_value',
    'sort_value',
    'status',
    'span',
    'placeholder',
    'option_set_key',
  ])
  const optionHeaderMap = buildHeaderIndexMap<OptionHeaderKey>(optionSheet.getRow(1), [
    'option_set_key',
    'field_key',
    'label',
    'value',
    'sort_value',
    'status',
  ])

  ensureRequiredHeaders(
    fieldHeaderMap,
    [
      'field_key',
      'field_name',
      'field_type',
      'required',
      'searchable',
      'sort_value',
      'status',
    ],
    FIELD_SHEET_NAME,
  )
  ensureRequiredHeaders(
    optionHeaderMap,
    ['option_set_key', 'field_key', 'label', 'value', 'sort_value', 'status'],
    OPTION_SHEET_NAME,
  )

  const groupedOptions = collectOptions(optionSheet, optionHeaderMap)
  const fieldConfigs: FieldConfig[] = []
  const fieldKeys = new Set<string>()

  for (let rowNumber = 2; rowNumber <= fieldSheet.rowCount; rowNumber += 1) {
    const row = fieldSheet.getRow(rowNumber)
    const fieldKey = readCellText(row, fieldHeaderMap.get('field_key') ?? 0)
    const fieldName = readCellText(row, fieldHeaderMap.get('field_name') ?? 0)
    const fieldTypeRaw = readCellText(row, fieldHeaderMap.get('field_type') ?? 0)
    const requiredRaw = readCellText(row, fieldHeaderMap.get('required') ?? 0)
    const searchableRaw = readCellText(row, fieldHeaderMap.get('searchable') ?? 0)
    const defaultValue = readCellText(row, fieldHeaderMap.get('default_value') ?? 0)
    const sortRaw = readCellText(row, fieldHeaderMap.get('sort_value') ?? 0)
    const statusRaw = readCellText(row, fieldHeaderMap.get('status') ?? 0)
    const spanRaw = readCellText(row, fieldHeaderMap.get('span') ?? 0)
    const placeholder = readCellText(row, fieldHeaderMap.get('placeholder') ?? 0)
    const optionSetKey = readCellText(row, fieldHeaderMap.get('option_set_key') ?? 0)

    if (
      ![
        fieldKey,
        fieldName,
        fieldTypeRaw,
        requiredRaw,
        searchableRaw,
        defaultValue,
        sortRaw,
        statusRaw,
        spanRaw,
        placeholder,
        optionSetKey,
      ].some(Boolean)
    ) {
      continue
    }

    if (!fieldKey || !fieldName || !fieldTypeRaw || !requiredRaw || !searchableRaw || !sortRaw) {
      throw new Error(`工作表“${FIELD_SHEET_NAME}”第 ${rowNumber} 行缺少必要字段`)
    }

    if (fieldKeys.has(fieldKey)) {
      throw new Error(`工作表“${FIELD_SHEET_NAME}”中 field_key“${fieldKey}”重复`)
    }
    fieldKeys.add(fieldKey)

    const fieldType = parseFieldTypeValue(fieldTypeRaw, rowNumber)
    const status = parseStatusValue(statusRaw, rowNumber, 'status')

    if (status !== 'enabled') {
      continue
    }

    const optionConfig = optionSetKey ? groupedOptions.get(optionSetKey) ?? [] : undefined
    if ((fieldType === 'select' || fieldType === 'multi_select') && (!optionConfig || !optionConfig.length)) {
      throw new Error(`第 ${rowNumber} 行字段“${fieldName}”缺少有效选项配置`)
    }

    fieldConfigs.push({
      default_value: parseDefaultValue(defaultValue, fieldType, rowNumber),
      field_key: fieldKey,
      field_name: fieldName,
      field_type: fieldType,
      option_config: fieldType === 'boolean' ? undefined : optionConfig,
      placeholder: placeholder || undefined,
      required: parseBooleanValue(requiredRaw, rowNumber, 'required'),
      searchable: parseBooleanValue(searchableRaw, rowNumber, 'searchable'),
      sort_value: parseSortValue(sortRaw, rowNumber, 'sort_value'),
      span: parseSpanValue(spanRaw, rowNumber),
      status,
    })
  }

  if (fieldConfigs.length === 0) {
    throw new Error('Excel 中没有可预览的启用字段')
  }

  return fieldConfigs.sort((left, right) => left.sort_value - right.sort_value)
}

export async function parseFormConfigFile(file: File): Promise<FieldConfig[]> {
  const buffer = await file.arrayBuffer()
  return parseFormConfigBuffer(buffer)
}

function ensureBooleanValue(value: unknown, fieldName: string): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  throw new Error(`字段“${fieldName}”必须是布尔值`)
}

function ensureStringValue(value: unknown, fieldName: string): string {
  if (fieldName === 'type') {
    return ''
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }

  throw new Error(`字段“${fieldName}”必须是非空字符串`)
}

function ensureOptionalStringValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value === 'string') {
    return value
  }

  throw new Error('可选字符串字段格式不正确')
}

function ensureFieldType(value: unknown): FormFieldType {
  if (typeof value === 'string' && VALID_FIELD_TYPES.includes(value as FormFieldType)) {
    return value as FormFieldType
  }

  throw new Error('field_type 不是支持的字段类型')
}

function ensureStatus(value: unknown): FieldConfigStatus {
  if (typeof value === 'string' && VALID_STATUSES.includes(value as FieldConfigStatus)) {
    return value as FieldConfigStatus
  }

  throw new Error('status 仅支持 enabled 或 disabled')
}

function ensureSortNumber(value: unknown, fieldName: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  throw new Error(`字段“${fieldName}”必须是数字`)
}

function ensureSpanValue(value: unknown): 12 | 24 | undefined {
  if (value === undefined || value === null) {
    return 12
  }

  if (value === 12 || value === 24) {
    return value
  }

  throw new Error('span 仅支持 12 或 24')
}

function validateOptionConfig(value: unknown): FieldOptionConfig[] | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Array.isArray(value)) {
    throw new Error('option_config 必须是数组')
  }

  return value.map((option, index) => {
    if (!isPlainObject(option)) {
      throw new Error(`option_config 第 ${index + 1} 项必须是对象`)
    }
    const label = ensureStringValue(option.label, `option_config[${index}].label`)
    const optionValue = ensureStringValue(option.value, `option_config[${index}].value`)
    const sortValue =
      option.sort_value === undefined ? undefined : ensureSortNumber(option.sort_value, `option_config[${index}].sort_value`)
    const status =
      option.status === undefined ? undefined : ensureStatus(option.status)

    return {
      label,
      sort_value: sortValue,
      status,
      value: optionValue,
      relate_show_field_key:option?.relate_show_field_key||undefined
    }
  })
}

export function validateFieldConfigJson(
  value: unknown,
  options?: {
    currentFieldKey?: string
    existingFieldKeys?: string[]
  },
): FieldConfig {
  if (!isPlainObject(value)) {
    throw new Error('当前配置必须是 JSON 对象')
  }

  const fieldKey = ensureStringValue(value.field_key, 'field_key')
  const fieldName = ensureStringValue(value.field_name, 'field_name')
  const fieldType = ensureFieldType(value.field_type)
  const required = ensureBooleanValue(value.required, 'required')
  const searchable = ensureBooleanValue(value.searchable, 'searchable')
  const sortValue = ensureSortNumber(value.sort_value, 'sort_value')
  const typeValue = ensureStringValue(value.type, 'type')
  const status = ensureStatus(value.status)
  const span = ensureSpanValue(value.span)
  const placeholder = ensureOptionalStringValue(value.placeholder)
  const optionConfig = validateOptionConfig(value.option_config)

  if (
    options?.existingFieldKeys?.includes(fieldKey) &&
    options.currentFieldKey !== fieldKey
  ) {
    throw new Error(`field_key“${fieldKey}”已存在，请保持唯一`)
  }

  if ((fieldType === 'select' || fieldType === 'multi_select') && (!optionConfig || !optionConfig.length)) {
    throw new Error(`${fieldName} 为 ${fieldType} 类型时，option_config 不能为空`)
  }

  if (fieldType === 'boolean' && optionConfig && optionConfig.length > 0) {
    throw new Error(`${fieldName} 为 boolean 类型时，不需要 option_config`)
  }

  if (
    fieldType !== 'select' &&
    fieldType !== 'multi_select' &&
    fieldType !== 'boolean' &&
    optionConfig &&
    optionConfig.length > 0
  ) {
    throw new Error(`${fieldName} 不是选项类型，不需要 option_config`)
  }

  if (
    value.default_value !== undefined &&
    value.default_value !== null &&
    typeof value.default_value !== 'string' &&
    typeof value.default_value !== 'number' &&
    typeof value.default_value !== 'boolean'
  ) {
    throw new Error('default_value 仅支持 string、number 或 boolean')
  }

  if (fieldType === 'number' && value.default_value !== undefined && typeof value.default_value !== 'number' && value.default_value!=='') {
    throw new Error('number 类型的 default_value 必须是数字')
  }

  return {
    default_value:
      value.default_value === undefined || value.default_value === null
        ? undefined
        : (value.default_value as string | number | boolean),
    field_key: fieldKey,
    field_name: fieldName,
    field_type: fieldType,
    id:
      value.id === undefined || value.id === null || value.id === ''
        ? undefined
        : String(value.id),
    option_config: fieldType === 'boolean' ? undefined : optionConfig,
    placeholder,
    required,
    searchable,
    sort_value: sortValue,
    span,
    status,
    type:typeValue
  }
}
