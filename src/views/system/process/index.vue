<template>
  <div class="app-container">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="我的待办" name="todo">
        <el-table v-loading="todoLoading" :data="todoList">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column label="标题" prop="title" />
          <el-table-column label="审批人" width="200">
            <template #default="scope">{{ approverText(scope.row.approverIds) }}</template>
          </el-table-column>
          <el-table-column label="申请人" width="160">
            <template #default="scope">{{ scope.row.applicantId }}</template>
          </el-table-column>
          <el-table-column label="创建时间" width="180">
            <template #default="scope"><span>{{ parseTime(scope.row.createdAt) }}</span></template>
          </el-table-column>
          <el-table-column label="操作" align="center" fixed="right" min-width="180"
            class-name="small-padding fixed-width">
            <template #default="scope">
              <el-button link type="primary" icon="CircleCheck" @click="openApprove(scope.row)"
                v-hasPermi="['process:approve']">通过</el-button>
              <el-button link type="primary" icon="Close" @click="openReject(scope.row)"
                v-hasPermi="['process:approve']">驳回</el-button>
            </template>
          </el-table-column>
        </el-table>
        <pagination v-show="todoTotal > 0" :total="todoTotal" v-model:page="todoQuery.pageNum"
          v-model:limit="todoQuery.pageSize" @pagination="getTodo" />
      </el-tab-pane>
      <el-tab-pane label="我的申请" name="mine">
        <div class="mb8">
          <el-button type="primary" plain icon="Plus" @click="openCreate">新建流程</el-button>
        </div>
        <el-table v-loading="listLoading" :data="list">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column label="标题" prop="title" />
          <el-table-column label="状态" width="120">
            <template #default="scope">
              <el-tag :type="statusType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="审批人" width="200">
            <template #default="scope">{{ approverText(scope.row.approverIds) }}</template>
          </el-table-column>
          <el-table-column label="创建时间" width="180">
            <template #default="scope"><span>{{ parseTime(scope.row.createdAt) }}</span></template>
          </el-table-column>
        </el-table>
        <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize"
          @pagination="getList" />
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="approveOpen" title="审批意见" width="500px" append-to-body>
      <el-input v-model="approveComment" type="textarea" rows="4" placeholder="填写意见" />
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitApprove">确 定</el-button>
          <el-button @click="approveOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>
    <el-dialog v-model="rejectOpen" title="驳回意见" width="500px" append-to-body>
      <el-input v-model="rejectComment" type="textarea" rows="4" placeholder="填写意见" />
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :disabled="!rejectComment || !rejectComment.trim()" @click="submitReject">确 定</el-button>
          <el-button @click="rejectOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="createOpen" title="新建流程" width="600px" append-to-body>
      <el-form :model="form" label-width="80px" ref="formRef">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入标题" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="form.content" type="textarea" rows="4" placeholder="请输入内容" />
        </el-form-item>
        <el-form-item label="审批人" prop="approverIds">
          <el-select v-model="form.approverIds" multiple filterable style="width:100%" placeholder="选择审批人">
            <el-option v-for="u in userOptions" :key="u.userId" :label="u.userName" :value="u.userId" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitCreate">确 定</el-button>
          <el-button @click="createOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { listTodo, approveProcess, rejectProcess, listProcesses, createProcess } from '@/api/system/process'
import { listUser } from '@/api/system/user'

const activeTab = ref('todo')

const todoQuery = ref({ pageNum: 1, pageSize: 10 })
const todoLoading = ref(false)
const todoList = ref([])
const todoTotal = ref(0)

function getTodo() {
  todoLoading.value = true
  listTodo(todoQuery.value)
    .then(res => { todoList.value = res.rows || []; todoTotal.value = res.total || 0 })
    .catch(() => { })
    .finally(() => { todoLoading.value = false })
}

const query = ref({ pageNum: 1, pageSize: 10 })
const listLoading = ref(false)
const list = ref([])
const total = ref(0)
function getList() {
  listLoading.value = true
  listProcesses(query.value)
    .then(res => { list.value = res.rows || []; total.value = res.total || 0 })
    .catch(() => { })
    .finally(() => { listLoading.value = false })
}

const approveOpen = ref(false)
const approveComment = ref('')
let currentRow = null
function openApprove(row) { currentRow = row; approveComment.value = ''; approveOpen.value = true }
function submitApprove() { approveProcess(currentRow._id, { comment: approveComment.value }).then(() => { approveOpen.value = false; getTodo() }).catch(() => { }) }

const rejectOpen = ref(false)
const rejectComment = ref('')
function openReject(row) { currentRow = row; rejectComment.value = ''; rejectOpen.value = true }
function submitReject() { if (!rejectComment.value || !String(rejectComment.value).trim()) return; rejectProcess(currentRow._id, { comment: rejectComment.value }).then(() => { rejectOpen.value = false; getTodo() }).catch(() => { }) }

const createOpen = ref(false)
const form = ref({ title: '', content: '', approverIds: [] })
const userOptions = ref([])
const userMap = ref({})
function openCreate() { createOpen.value = true }
function submitCreate() { createProcess(form.value).then(() => { createOpen.value = false; getList() }).catch(() => { }) }

listUser({ pageNum: 1, pageSize: 50 }).then(res => {
  const items = res.rows || res.data?.items || []
  userOptions.value = items.map(u => ({ userId: u.userId || u.id, userName: u.userName || u.username }))
  userMap.value = Object.fromEntries(userOptions.value.map(u => [String(u.userId), u.userName]))
}).catch(() => { })

function statusType(s) { return s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'info' }
function statusLabel(s) { return s === 'approved' ? '已通过' : s === 'rejected' ? '已驳回' : '待审批' }
function approverText(ids) { return Array.isArray(ids) && ids.length ? ids.map(x => userMap.value[String(x)] || String(x)).join('、') : '' }

getTodo(); getList()
</script>