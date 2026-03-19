<template>
  <div class="auth-page">
    <n-card class="auth-card" title="注册">
      <n-form ref="formRef" :model="formData" :rules="rules">
        <n-form-item path="username" label="用户名">
          <n-input v-model:value="formData.username" placeholder="3-20 位字母数字下划线" />
        </n-form-item>
        <n-form-item path="password" label="密码">
          <n-input v-model:value="formData.password" type="password" placeholder="6-20 位密码" />
        </n-form-item>
        <n-form-item path="confirmPassword" label="确认密码">
          <n-input v-model:value="formData.confirmPassword" type="password" placeholder="再次输入密码" />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" block :loading="loading" @click="handleRegister">
            注册
          </n-button>
        </n-form-item>
      </n-form>
      <div class="auth-link">
        已有账号？
        <router-link to="/login">立即登录</router-link>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();

const formRef = ref(null);
const loading = ref(false);

const formData = reactive({
  username: '',
  password: '',
  confirmPassword: ''
});

const validatePasswordConfirm = (rule, value) => {
  if (value !== formData.password) {
    return new Error('两次输入的密码不一致');
  }
  return true;
};

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名 3-20 位', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码 6-20 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: ['blur', 'input'] },
    { validator: validatePasswordConfirm, trigger: ['blur', 'input'] }
  ]
};

async function handleRegister() {
  await formRef.value?.validate();
  loading.value = true;

  try {
    const result = await authStore.register(formData.username, formData.password);
    if (result.success) {
      message.success('注册成功，请登录');
      router.push('/login');
    } else {
      message.error(result.error || '注册失败');
    }
  } catch (err) {
    message.error('注册失败');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}

.auth-card {
  width: 100%;
  max-width: 400px;
}

.auth-link {
  text-align: center;
  margin-top: 16px;
}

.auth-link a {
  color: #18a058;
  text-decoration: none;
}
</style>
