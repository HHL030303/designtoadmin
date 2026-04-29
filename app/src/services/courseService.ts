import {
  advanceCourseWorkflow,
  canCompleteResearch,
  createCourseRecord,
  createDerivedServiceCourse,
  updatePageDispatch,
  updateResearchTask,
  updateStyleDispatch,
  uploadPageDraft,
  uploadStyleDraft,
} from '../domain/courseWorkflow'
import { initialCourses } from './mockData'
import type {
  CourseRecord,
  CreateTicketResult,
  CreateCoursePayload,
  CreateServiceTicketPayload,
  DispatchPayload,
  UploadPagePayload,
  UploadStylePayload,
  UpdateResearchPayload,
} from '../types'

const LATENCY = 220

let courseDb: CourseRecord[] = structuredClone(initialCourses)

function delay<T>(value: T, duration = LATENCY): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), duration)
  })
}

function cloneCourses() {
  return structuredClone(courseDb)
}

export const courseService = {
  async listCourses() {
    return delay(cloneCourses())
  },

  async createCourse(payload: CreateCoursePayload) {
    const record = createCourseRecord(payload, courseDb)
    courseDb = [record, ...courseDb]
    return delay(structuredClone(record))
  },

  async advanceCourse(courseId: string) {
    let updated: CourseRecord | undefined

    courseDb = courseDb.map((course) => {
      if (course.id !== courseId) {
        return course
      }

      if (course.status === 'research' && !canCompleteResearch(course)) {
        throw new Error('请先补全教研资料、实际交稿日期与审核状态')
      }

      updated = advanceCourseWorkflow(course)
      if (course.status === 'pendingArchive' && updated.status === 'packing') {
        updated = advanceCourseWorkflow(updated)
      }
      return updated
    })

    if (!updated) {
      throw new Error('未找到对应课件')
    }

    return delay(structuredClone(updated))
  },

  async updateResearch(courseId: string, payload: UpdateResearchPayload) {
    let updated: CourseRecord | undefined

    courseDb = courseDb.map((course) => {
      if (course.id !== courseId) {
        return course
      }

      updated = updateResearchTask(course, payload)
      return updated
    })

    if (!updated) {
      throw new Error('未找到对应课件')
    }

    return delay(structuredClone(updated))
  },

  async saveStyleDispatch(courseId: string, payload: DispatchPayload) {
    let updated: CourseRecord | undefined

    courseDb = courseDb.map((course) => {
      if (course.id !== courseId) {
        return course
      }

      updated = updateStyleDispatch(course, payload)
      return updated
    })

    if (!updated) {
      throw new Error('未找到对应课件')
    }

    return delay(structuredClone(updated))
  },

  async savePageDispatch(courseId: string, payload: DispatchPayload) {
    let updated: CourseRecord | undefined

    courseDb = courseDb.map((course) => {
      if (course.id !== courseId) {
        return course
      }

      updated = updatePageDispatch(course, payload)
      return updated
    })

    if (!updated) {
      throw new Error('未找到对应课件')
    }

    return delay(structuredClone(updated))
  },

  async uploadStyleDraft(courseId: string, payload: UploadStylePayload) {
    let updated: CourseRecord | undefined

    courseDb = courseDb.map((course) => {
      if (course.id !== courseId) {
        return course
      }

      // if (!validateStyleFileNames(course, payload.files)) {
      //   throw new Error(`文件命名不符合规范，请使用“${course.title}_风格稿_版本号”前缀`)
      // }

      updated = uploadStyleDraft(course, payload)
      return updated
    })

    if (!updated) {
      throw new Error('未找到对应课件')
    }

    return delay(structuredClone(updated))
  },

  async uploadPageDraft(courseId: string, payload: UploadPagePayload) {
    let updated: CourseRecord | undefined

    courseDb = courseDb.map((course) => {
      if (course.id !== courseId) {
        return course
      }

      // if (!validatePageFileNames(course, payload.files)) {
      //   throw new Error(`文件命名不符合规范，请使用“${course.title}_内页成品_版本号”前缀`)
      // }

      updated = uploadPageDraft(course, payload)
      return updated
    })

    if (!updated) {
      throw new Error('未找到对应课件')
    }

    return delay(structuredClone(updated))
  },

  async createTicket(
    courseId: string,
    payload: CreateServiceTicketPayload,
    requester: string,
  ) {
    const sourceCourse = courseDb.find((course) => course.id === courseId)
    if (!sourceCourse) {
      throw new Error('未找到对应课件')
    }

    const result: CreateTicketResult = createDerivedServiceCourse(
      sourceCourse,
      payload,
      requester,
      courseDb,
    )

    courseDb = [result.created, ...courseDb.map((course) =>
      course.id === courseId ? result.source : course,
    )]

    return delay(structuredClone(result))
  },
}
