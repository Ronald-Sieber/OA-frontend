<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" multiple clearable style="width: 240px" placeholder="选择状态">
          <el-option label="未开始" value="todo" />
          <el-option label="进行中" value="doing" />
          <el-option label="已完成" value="done" />
        </el-select>
      </el-form-item>
      <el-form-item label="截止时间" style="width: 308px">
        <el-date-picker v-model="dueRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-"
          start-placeholder="开始日期" end-placeholder="结束日期"></el-date-picker>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd">新增任务</el-button>
      </el-col>
    </el-row>

    <el-table v-loading="loading" :data="taskList" :row-key="row => row._id">
      <el-table-column type="index" label="序号" width="60" />
      <el-table-column label="标题" prop="title" :show-overflow-tooltip="true" />
      <el-table-column label="状态" prop="status" width="120" />
      <el-table-column label="截止时间" prop="dueAt" width="180">
        <template #default="scope"><span>{{ parseTime(scope.row.dueAt) }}</span></template>
      </el-table-column>
      <el-table-column label="创建时间" prop="createdAt" width="180">
        <template #default="scope"><span>{{ parseTime(scope.row.createdAt) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" fixed="right" min-width="220" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" @click="handleView(scope.row)">查看</el-button>
          <el-button link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
          <el-button link type="primary" @click="openUpload(scope.row)">上传附件</el-button>
        </template>
      </el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="700px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入标题" />
        </el-form-item>
        <el-form-item label="描述" prop="desc">
          <el-input v-model="form.desc" type="textarea" :rows="4" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" style="width: 240px">
            <el-option label="未开始" value="todo" />
            <el-option label="进行中" value="doing" />
            <el-option label="已完成" value="done" />
          </el-select>
        </el-form-item>
        <el-form-item label="截止时间" prop="dueAt">
          <el-date-picker v-model="form.dueAt" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog title="查看任务" v-model="viewOpen" width="700px" append-to-body>
      <div>
        <p><strong>标题：</strong>{{ viewTask.title }}</p>
        <p><strong>描述：</strong>{{ viewTask.desc }}</p>
        <p><strong>状态：</strong>{{ viewTask.status }}</p>
        <p><strong>截止时间：</strong>{{ parseTime(viewTask.dueAt) }}</p>
        <p><strong>附件：</strong>
          <span v-if="!viewTask.attachments || !viewTask.attachments.length">无</span>
          <span v-else>
            <el-link v-for="(a, i) in viewTask.attachments" :key="i" :href="a.url" target="_blank" :download="a.name"
              style="margin-right:8px">{{ a.name }}</el-link>
          </span>
        </p>
      </div>
    </el-dialog>

    <el-dialog title="上传附件" v-model="uploadOpen" width="500px" append-to-body>
      <input ref="fileInput" type="file" multiple style="display:none" @change="onFilesSelected" />
      <el-button type="success" @click="triggerUpload">选择文件</el-button>
      <div class="attachment-list" style="margin-top:8px">
        <el-tag v-for="(a, i) in uploadPreview" :key="i" closable @close="removeUploadPreview(i)"
          style="margin-right:8px">{{ a.name }}</el-tag>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="doUpload">上 传</el-button>
          <el-button @click="closeUpload">关 闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, toRefs, getCurrentInstance } from 'vue'
import { listTasks, addTask, updateTask, getTask, uploadTaskAttachment } from '@/api/system/tasks'

const { proxy } = getCurrentInstance()

const taskList = ref([])
const loading = ref(false)
const showSearch = ref(true)
const total = ref(0)
const open = ref(false)
const title = ref('')
const dueRange = ref([])

const data = reactive({
  form: { title: '', desc: '', status: 'todo', dueAt: '' },
  queryParams: { pageNum: 1, pageSize: 10, status: [] }
})
const { form, queryParams } = toRefs(data)

function getList() {
  loading.value = true
  const params = { page: queryParams.value.pageNum, pageSize: queryParams.value.pageSize }
  if (Array.isArray(queryParams.value.status) && queryParams.value.status.length) params.status = queryParams.value.status.join(',')
  if (Array.isArray(dueRange.value) && dueRange.value.length === 2) {
    params.beginDueAt = dueRange.value[0]
    params.endDueAt = dueRange.value[1]
  }
  listTasks(params).then(res => {
    taskList.value = res.rows || []
    total.value = res.total || 0
    loading.value = false
  })
}
function handleQuery() { getList() }
function resetQuery() { proxy.resetForm('queryRef'); dueRange.value = []; getList() }

function handleAdd() { open.value = true; title.value = '新增任务'; form.value = { title: '', desc: '', status: 'todo', dueAt: '' } }
function handleEdit(row) { open.value = true; title.value = '编辑任务'; form.value = { title: row.title, desc: row.desc || '', status: row.status || 'todo', dueAt: (row.dueAt || '').slice(0, 10), _id: row._id } }
function cancel() { open.value = false; form.value = { title: '', desc: '', status: 'todo', dueAt: '' } }

function submitForm() {
  proxy.$refs['formRef'].validate(valid => {
    if (!valid) return
    const payload = { title: form.value.title, desc: form.value.desc, status: form.value.status, dueAt: form.value.dueAt }
    if (form.value._id) {
      updateTask(form.value._id, payload).then(() => { proxy.$modal.msgSuccess('修改成功'); open.value = false; getList() })
    } else {
      addTask(payload).then(() => { proxy.$modal.msgSuccess('新增成功'); open.value = false; getList() })
    }
  })
}

const rules = { title: [{ required: true, message: '标题不能为空', trigger: 'blur' }] }

getList()

const viewOpen = ref(false)
const viewTask = ref({ title: '', desc: '', status: 'todo', dueAt: '', attachments: [] })
function handleView(row) { getTask(row._id).then(r => { viewTask.value = r.data || row; viewOpen.value = true }) }

const uploadOpen = ref(false)
const uploadTarget = ref('')
const fileInput = ref(null)
const uploadPreview = ref([])
function openUpload(row) { uploadOpen.value = true; uploadTarget.value = row._id; uploadPreview.value = [] }
function triggerUpload() { fileInput.value && fileInput.value.click() }
function onFilesSelected(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  uploadPreview.value = files.map(f => ({ name: f.name }))
}
function removeUploadPreview(i) { uploadPreview.value.splice(i, 1) }
function doUpload() {
  if (!uploadTarget.value || !fileInput.value || !fileInput.value.files || !fileInput.value.files.length) return
  const files = Array.from(fileInput.value.files)
  const tasks = files.map(f => uploadTaskAttachment(uploadTarget.value, f))
  Promise.all(tasks).then(() => { proxy.$modal.msgSuccess('上传成功'); uploadOpen.value = false; fileInput.value.value = ''; getList() })
}
function closeUpload() { uploadOpen.value = false; uploadTarget.value = ''; uploadPreview.value = []; if (fileInput.value) fileInput.value.value = '' }
</script>
