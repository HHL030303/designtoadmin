import dayjs from 'dayjs'
import type { CreateCoursePayload } from '../types'

export interface CourseFormValues {
  series: string
  subject: string
  educationStage: CreateCoursePayload['educationStage']
  grade: string
  volume: CreateCoursePayload['volume']
  textbook: string
  chapterName?: string
  title: string
  researchOwner: string
  orderType: CreateCoursePayload['orderType']
  isBEnd: CreateCoursePayload['isBEnd']
  hasLessonPlan: CreateCoursePayload['hasLessonPlan']
  hasScript?: CreateCoursePayload['hasScript']
  artCopyright: CreateCoursePayload['artCopyright']
  textCopyright: CreateCoursePayload['textCopyright']
  researchDueDate: dayjs.Dayjs
  finalDueDate: dayjs.Dayjs
}

export const courseFormOptions = {
  series: ['松鼠语文', '一起课件', '松鼠数学'],
  subject: ['语文', '数学', '英语', '物理', '化学', '生物', '地理', '历史', '道法', '科学'],
  educationStage: ['小学', '初中', '高中'],
  grade: [
    '一年级',
    '二年级',
    '三年级',
    '四年级',
    '五年级',
    '六年级',
    '七年级',
    '八年级',
    '九年级',
    '高一',
    '高二',
    '高三',
  ],
  volume: ['上册', '下册', '必修上', '必修下', '选择性必修上', '选择性必修下'],
  textbook: ['统编版', '北师大版', '人教版'],
  researchOwner: ['陈老师', '徐老师', '叶老师', '乔老师', '王老师'],
  orderType: ['全新订单', '售后订单', '迭代订单'],
  isBEnd: ['是', '否'],
  hasLessonPlan: ['有', '无'],
  hasScript: ['有', '无'],
  artCopyright: ['是', '否'],
  textCopyright: ['是', '否'],
} as const

export const createCourseFormInitialValues: CourseFormValues = {
  series: '松鼠语文',
  subject: '语文',
  educationStage: '初中',
  grade: '七年级',
  volume: '上册',
  textbook: '统编版',
  chapterName: '',
  title: '',
  researchOwner: '陈老师',
  orderType: '全新订单',
  isBEnd: '否',
  hasLessonPlan: '有',
  hasScript: '有',
  artCopyright: '否',
  textCopyright: '否',
  researchDueDate: dayjs().add(3, 'day'),
  finalDueDate: dayjs().add(7, 'day'),
}
