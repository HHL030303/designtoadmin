import { useCallback, useEffect, useMemo, useState } from 'react'
import { courseService } from '../services/courseService'
import type {
  CourseRecord,
  CreateCoursePayload,
  CreateServiceTicketPayload,
  CreateTicketResult,
  DashboardStats,
  DispatchPayload,
  UploadPagePayload,
  UploadStylePayload,
  UpdateResearchPayload,
} from '../types'

export function useCourseStore() {
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await courseService.listCourses()
      setCourses(data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCourses()
  }, [loadCourses])

  const createCourse = useCallback(async (payload: CreateCoursePayload) => {
    try {
      setMutating(true)
      setError(null)
      const created = await courseService.createCourse(payload)
      setCourses((current) => [created, ...current])
      return created
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : '创建失败')
      throw createError
    } finally {
      setMutating(false)
    }
  }, [])

  const bulkCreateCourses = useCallback(async (payloads: CreateCoursePayload[]) => {
    try {
      setMutating(true)
      setError(null)
      const created = await courseService.bulkCreateCourses(payloads)
      setCourses((current) => [...created, ...current])
      return created
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : '批量创建失败')
      throw createError
    } finally {
      setMutating(false)
    }
  }, [])

  const updateCourse = useCallback(async (courseId: string, payload: CreateCoursePayload) => {
    try {
      setMutating(true)
      setError(null)
      const updated = await courseService.updateCourse(courseId, payload)
      setCourses((current) =>
        current.map((course) => (course.id === updated.id ? updated : course)),
      )
      return updated
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : '更新失败')
      throw updateError
    } finally {
      setMutating(false)
    }
  }, [])

  const advanceCourse = useCallback(async (courseId: string) => {
    try {
      setMutating(true)
      setError(null)
      const updated = await courseService.advanceCourse(courseId)
      setCourses((current) =>
        current.map((course) => (course.id === updated.id ? updated : course)),
      )
      return updated
    } catch (advanceError) {
      setError(advanceError instanceof Error ? advanceError.message : '状态推进失败')
      throw advanceError
    } finally {
      setMutating(false)
    }
  }, [])

  const createTicket = useCallback(
    async (courseId: string, payload: CreateServiceTicketPayload, requester: string) => {
      try {
        setMutating(true)
        setError(null)
        const result: CreateTicketResult = await courseService.createTicket(
          courseId,
          payload,
          requester,
        )
        setCourses((current) => [
          result.created,
          ...current.map((course) =>
            course.id === result.source.id ? result.source : course,
          ),
        ])
        return result
      } catch (ticketError) {
        setError(ticketError instanceof Error ? ticketError.message : '创建工单失败')
        throw ticketError
      } finally {
        setMutating(false)
      }
    },
    [],
  )

  const updateResearch = useCallback(async (courseId: string, payload: UpdateResearchPayload) => {
    try {
      setMutating(true)
      setError(null)
      const updated = await courseService.updateResearch(courseId, payload)
      setCourses((current) =>
        current.map((course) => (course.id === updated.id ? updated : course)),
      )
      return updated
    } catch (researchError) {
      setError(researchError instanceof Error ? researchError.message : '教研任务更新失败')
      throw researchError
    } finally {
      setMutating(false)
    }
  }, [])

  const saveStyleDispatch = useCallback(async (courseId: string, payload: DispatchPayload) => {
    try {
      setMutating(true)
      setError(null)
      const updated = await courseService.saveStyleDispatch(courseId, payload)
      setCourses((current) =>
        current.map((course) => (course.id === updated.id ? updated : course)),
      )
      return updated
    } catch (dispatchError) {
      setError(dispatchError instanceof Error ? dispatchError.message : '风格稿派单失败')
      throw dispatchError
    } finally {
      setMutating(false)
    }
  }, [])

  const savePageDispatch = useCallback(async (courseId: string, payload: DispatchPayload) => {
    try {
      setMutating(true)
      setError(null)
      const updated = await courseService.savePageDispatch(courseId, payload)
      setCourses((current) =>
        current.map((course) => (course.id === updated.id ? updated : course)),
      )
      return updated
    } catch (dispatchError) {
      setError(dispatchError instanceof Error ? dispatchError.message : '内页派单失败')
      throw dispatchError
    } finally {
      setMutating(false)
    }
  }, [])

  const uploadStyle = useCallback(async (courseId: string, payload: UploadStylePayload) => {
    try {
      setMutating(true)
      setError(null)
      const updated = await courseService.uploadStyleDraft(courseId, payload)
      setCourses((current) =>
        current.map((course) => (course.id === updated.id ? updated : course)),
      )
      return updated
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '风格稿上传失败')
      throw uploadError
    } finally {
      setMutating(false)
    }
  }, [])

  const uploadPage = useCallback(async (courseId: string, payload: UploadPagePayload) => {
    try {
      setMutating(true)
      setError(null)
      const updated = await courseService.uploadPageDraft(courseId, payload)
      setCourses((current) =>
        current.map((course) => (course.id === updated.id ? updated : course)),
      )
      return updated
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '内页上传失败')
      throw uploadError
    } finally {
      setMutating(false)
    }
  }, [])

  const stats = useMemo<DashboardStats>(
    () => ({
      total: courses.length,
      active: courses.filter((course) => course.status !== 'archived').length,
      overdue: courses.filter((course) => course.overdue).length,
      archived: courses.filter((course) => course.status === 'archived').length,
    }),
    [courses],
  )

  return {
    courses,
    stats,
    loading,
    mutating,
    error,
    reload: loadCourses,
    createCourse,
    bulkCreateCourses,
    updateCourse,
    advanceCourse,
    updateResearch,
    saveStyleDispatch,
    savePageDispatch,
    uploadStyle,
    uploadPage,
    createTicket,
  }
}
