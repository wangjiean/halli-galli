<template>
  <div class="auth-page">
    <n-card class="auth-card" title="登录">
      <n-form ref="formRef" :model="formData" :rules="rules">
        <n-form-item path="username" label="用户名">
          <n-input v-model:value="formData.username" placeholder="请输入用户名" />
        </n-form-item>
        <n-form-item path="password" label="密码">
          <n-input v-model:value="formData.password" type="password" placeholder="请输入密码" />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" block :loading="loading" @click="handleLogin">
            登录
          </n-button>
        </n-form-item>
      </n-form>
      <div class="auth-link">
        还没有账号？
        <router-link to="/register">立即注册</router-link>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '../stores/auth';
import { useSocketStore } from '../stores/socket';

const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();
const socketStore = useSocketStore();

const formRef = ref(null);
const loading = ref(false);

const formData = reactive({
  username: '',
  password: ''
});

const rules = {
  username: { required: true, message: '请输入用户名', trigger: 'blur' },
  password: { required: true, message: '请输入密码', trigger: 'blur' }
};

async function handleLogin() {
  await formRef.value?.validate();
  loading.value = true;

  try {
    const result = await authStore.login(formData.username, formData.password);
    if (result.success) {
      message.success('登录成功');
      socketStore.connect(result.token);
      router.push('/');
    } else {
      message.error(result.error || '登录失败');
    }
  } catch (err) {
    message.error('登录失败');
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
