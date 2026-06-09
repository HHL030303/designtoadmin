import type { Dayjs } from 'dayjs'
import type { FieldConfig } from '../types'

type TaskFormValue = string | number | boolean | Dayjs | null | undefined
type TaskFormValues = Record<string, TaskFormValue>

type SettlementFieldKeys = {
  depositFieldKey?: string
  estimatedPageCountFieldKey?: string
  estimatedRemainingPaymentFieldKey?: string
  estimatedTotalPriceFieldKey?: string
  pptUnitPriceFieldKey?: string
  settlementTypeFieldKey?: string
  stationedFeeFieldKey?: string
  urgentFeeFieldKey?: string
}

export type SettlementChangeSource =
  | 'dependencies'
  | 'deposit'
  | 'estimated_total_price'
  | 'other'

function normalizeFieldIdentifier(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, '').trim().toLowerCase()
}

function findFieldByName(fieldConfigs: FieldConfig[], targetName: string): FieldConfig | undefined {
  const normalizedTargetName = normalizeFieldIdentifier(targetName)

  return fieldConfigs.find(
    (field) => normalizeFieldIdentifier(field.field_name) === normalizedTargetName,
  )
}

function parseNumericValue(value: TaskFormValue): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return undefined
  }

  const parsedValue = Number(normalizedValue)
  return Number.isFinite(parsedValue) ? parsedValue : undefined
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2))
}

export function resolveTaskSettlementFieldKeys(
  fieldConfigs: FieldConfig[],
): SettlementFieldKeys {
  return {
    depositFieldKey: findFieldByName(fieldConfigs, '定金')?.field_key,
    estimatedPageCountFieldKey: findFieldByName(fieldConfigs, '预估页数')?.field_key,
    estimatedRemainingPaymentFieldKey: findFieldByName(fieldConfigs, '预估尾款')?.field_key,
    estimatedTotalPriceFieldKey: findFieldByName(fieldConfigs, '预估总价')?.field_key,
    pptUnitPriceFieldKey: findFieldByName(fieldConfigs, 'ppt单价')?.field_key,
    settlementTypeFieldKey: findFieldByName(fieldConfigs, '结算类型')?.field_key,
    stationedFeeFieldKey: findFieldByName(fieldConfigs, '驻场费')?.field_key,
    urgentFeeFieldKey: findFieldByName(fieldConfigs, '加急费')?.field_key,
  }
}

export function resolveTaskSettlementChangeSource(
  fieldKeys: SettlementFieldKeys,
  previousValues: TaskFormValues | undefined,
  nextValues: TaskFormValues,
): SettlementChangeSource {
  const dependencyFieldKeys = [
    fieldKeys.settlementTypeFieldKey,
    fieldKeys.estimatedPageCountFieldKey,
    fieldKeys.pptUnitPriceFieldKey,
    fieldKeys.stationedFeeFieldKey,
    fieldKeys.urgentFeeFieldKey,
  ].filter((fieldKey): fieldKey is string => Boolean(fieldKey))

  const hasDependencyChange = dependencyFieldKeys.some(
    (fieldKey) => previousValues?.[fieldKey] !== nextValues[fieldKey],
  )

  if (hasDependencyChange) {
    return 'dependencies'
  }

  if (
    fieldKeys.depositFieldKey &&
    previousValues?.[fieldKeys.depositFieldKey] !== nextValues[fieldKeys.depositFieldKey]
  ) {
    return 'deposit'
  }

  if (
    fieldKeys.estimatedTotalPriceFieldKey &&
    previousValues?.[fieldKeys.estimatedTotalPriceFieldKey] !==
      nextValues[fieldKeys.estimatedTotalPriceFieldKey]
  ) {
    return 'estimated_total_price'
  }

  return 'other'
}

export function shouldUsePerPageSettlement(
  fieldConfigs: FieldConfig[],
  fieldKey: string | undefined,
  value: TaskFormValue,
): boolean {
  if (!fieldKey || value === undefined || value === null || value === '') {
    return false
  }

  if (String(value).trim() === '按页结算') {
    return true
  }

  const settlementField = fieldConfigs.find((field) => field.field_key === fieldKey)
  const matchedOption = settlementField?.option_config?.find(
    (option) => option.value === String(value),
  )

  return normalizeFieldIdentifier(matchedOption?.label) === normalizeFieldIdentifier('按页结算')
}

export function buildPerPageSettlementUpdates(
  fieldConfigs: FieldConfig[],
  values: TaskFormValues,
  options?: {
    changeSource?: SettlementChangeSource
  },
): Partial<TaskFormValues> {
  const settlementFieldKeys = resolveTaskSettlementFieldKeys(fieldConfigs)
  const settlementTypeValue = settlementFieldKeys.settlementTypeFieldKey
    ? values[settlementFieldKeys.settlementTypeFieldKey]
    : undefined

  if (
    !shouldUsePerPageSettlement(
      fieldConfigs,
      settlementFieldKeys.settlementTypeFieldKey,
      settlementTypeValue,
    )
  ) {
    return {}
  }

  if (options?.changeSource === 'other') {
    return {}
  }

  const estimatedPageCount = parseNumericValue(
    settlementFieldKeys.estimatedPageCountFieldKey
      ? values[settlementFieldKeys.estimatedPageCountFieldKey]
      : undefined,
  ) ?? 0
  const pptUnitPrice = parseNumericValue(
    settlementFieldKeys.pptUnitPriceFieldKey
      ? values[settlementFieldKeys.pptUnitPriceFieldKey]
      : undefined,
  ) ?? 0
  const stationedFee = parseNumericValue(
    settlementFieldKeys.stationedFeeFieldKey
      ? values[settlementFieldKeys.stationedFeeFieldKey]
      : undefined,
  ) ?? 0
  const urgentFee = parseNumericValue(
    settlementFieldKeys.urgentFeeFieldKey
      ? values[settlementFieldKeys.urgentFeeFieldKey]
      : undefined,
  ) ?? 0

  const totalPrice = roundMoney(
    estimatedPageCount * pptUnitPrice + stationedFee + urgentFee,
  )
  const updates: Partial<TaskFormValues> = {}
  const currentTotalPriceValue = settlementFieldKeys.estimatedTotalPriceFieldKey
    ? values[settlementFieldKeys.estimatedTotalPriceFieldKey]
    : undefined
  const currentTotalPrice = parseNumericValue(currentTotalPriceValue)
  const shouldPreserveManualTotalPrice = options?.changeSource === 'estimated_total_price'

  if (settlementFieldKeys.estimatedTotalPriceFieldKey && !shouldPreserveManualTotalPrice) {
    updates[settlementFieldKeys.estimatedTotalPriceFieldKey] = totalPrice
  }

  const effectiveTotalPrice =
    shouldPreserveManualTotalPrice ? currentTotalPrice : totalPrice

  const depositValue = parseNumericValue(
    settlementFieldKeys.depositFieldKey
      ? values[settlementFieldKeys.depositFieldKey]
      : undefined,
  )

  if (settlementFieldKeys.estimatedRemainingPaymentFieldKey) {
    updates[settlementFieldKeys.estimatedRemainingPaymentFieldKey] =
      depositValue === undefined || effectiveTotalPrice === undefined
        ? undefined
        : roundMoney(effectiveTotalPrice - depositValue)
  }

  return updates
}
