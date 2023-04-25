

<template>
  <div class="container">
    <el-form :model="form" :rules="rules" ref="form_ref" label-width="100px">
      <el-form-item prop="file_dir" label="图片路径">
        <el-input v-model="form.file_dir" readonly dark @click="choose_folder('file_dir')">
          <!-- <template #append>
            <el-icon style="vertical-align: middle" size="20" @click="choose_folder('file_dir')">
              <FolderOpened />
            </el-icon>
          </template> -->
        </el-input>
      </el-form-item>

      <el-form-item prop="template_dir" label="模板路径">
        <el-input v-model="form.template_dir" readonly dark @click="choose_folder('template_dir')">
          <!-- <template #append>
            <el-icon
              style="vertical-align: middle"
              size="20"
              @click="choose_folder('template_dir')"
            >
              <FolderOpened />
            </el-icon>
          </template> -->
        </el-input>
      </el-form-item>

      <el-form-item label="详情">
        <div class="status-list">
          <p class="status-msg" v-for="item of list" :class="item.status">
            <span :style="{ color: item.color }">{{ item.msg }}</span>
          </p>
        </div>
      </el-form-item>

      <div class="text-center">
        <el-button type="primary" class="submit-btn" dark @click="start_process">开始处理</el-button>
      </div>
    </el-form>
  </div>
</template>


<script setup>
import { ref, reactive, onBeforeUnmount, toRaw } from 'vue'

const form = reactive({
  file_dir: '',
  template_dir: ''
})
const rules = reactive({
  file_dir: [{ required: true, trigger: 'blur', message: '请选择文件路径' }],
  template_dir: [{ required: true, trigger: 'blur', message: '请选择模板路径' }]
})
const form_ref = ref()
const list = reactive([])

async function choose_folder(prop) {
  form[prop] = await window.api.invoke_open_foler()
}

function start_process() {
  form_ref.value.validate((valid) => {
    if (valid) {
      list.length = 0;
      _register()
      window.api.start_process(form.file_dir, form.template_dir)
    }
  })
}

function _register() {
  window.api.register_win()
  window.api.on_process(_status_callback)
}

function _status_callback(event, msg, status, color = '') {
  list.unshift({ msg, status, color })
}

onBeforeUnmount(() => {
  window.api.remove_on_process();
  window.api.remove_win();
})
</script>

<style lang="less">
@import './assets/css/styles.less';
@import './assets/css/public.less';
// .container {
//   background-color: #111;
// }
.status-list {
  height: calc(100vh - 200px);
  width: 100%;
  overflow-y: auto;

  .process {
    color: #86a5b1;
  }
  .success {
    color: #67C23A;
  }
  .error {
    color: #F56C6C
  }
}
.status-msg {
  margin-bottom: 5px;
}
.submit-btn {
  width: 120px;
}
</style>
