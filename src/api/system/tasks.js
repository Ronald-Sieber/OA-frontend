import request from '@/utils/request'

export function listTasks(params) {
  return request({ url: '/api/tasks', method: 'get', params })
}

export function addTask(data) {
  return request({ url: '/api/tasks', method: 'post', data })
}

export function updateTask(id, data) {
  return request({ url: `/api/tasks/${id}`, method: 'put', data })
}

export function getTask(id) {
  return request({ url: `/api/tasks/${id}`, method: 'get' })
}

export function uploadTaskAttachment(id, file) {
  const form = new FormData()
  form.append('file', file)
  return request({ url: `/api/tasks/${id}/attachments`, method: 'post', data: form, headers: { 'Content-Type': 'multipart/form-data' } })
}
