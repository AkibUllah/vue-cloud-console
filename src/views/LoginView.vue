<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const email = ref('akib@meghna.cloud');
const password = ref('password');

async function submit() {
  if (await auth.login(email.value.trim(), password.value)) {
    await router.push(typeof route.query.next === 'string' ? route.query.next : '/');
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-4">
    <form class="card w-full max-w-sm space-y-4" @submit.prevent="submit">
      <div class="flex items-center gap-2">
        <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#1f54d6" /><path d="M10 21a4 4 0 0 1 .6-7.95A6 6 0 0 1 22 14a3.5 3.5 0 0 1 0 7z" fill="#fff" /></svg>
        <div>
          <h1 class="text-lg font-semibold">Meghna Cloud Console</h1>
          <p class="text-xs text-slate-500">Sign in to your project</p>
        </div>
      </div>
      <div>
        <label class="label" for="email">Email</label>
        <input id="email" v-model="email" class="input" type="email" autocomplete="username" required />
      </div>
      <div>
        <label class="label" for="password">Password</label>
        <input id="password" v-model="password" class="input" type="password" autocomplete="current-password" required minlength="6" />
      </div>
      <p v-if="auth.error" class="text-sm text-red-600" role="alert">{{ auth.error }}</p>
      <button type="submit" class="btn-primary w-full" :disabled="auth.loading">{{ auth.loading ? 'Signing in…' : 'Sign in' }}</button>
      <p class="text-xs text-slate-500">Mock mode: any email with a password of 6+ characters signs in. Prefix the email with <code>admin</code> for the admin role.</p>
    </form>
  </div>
</template>
