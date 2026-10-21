import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('@/components/AppShell.vue'),
    children: [
      { path: '', name: 'overview', component: () => import('@/views/OverviewView.vue') },
      { path: 'instances', name: 'instances', component: () => import('@/views/InstancesView.vue') },
      { path: 'instances/new', name: 'instance-create', component: () => import('@/views/InstanceWizardView.vue') },
      { path: 'volumes', name: 'volumes', component: () => import('@/views/VolumesView.vue') },
      { path: 'floating-ips', name: 'floating-ips', component: () => import('@/views/FloatingIpsView.vue') },
      { path: 'security-groups', name: 'security-groups', component: () => import('@/views/SecurityGroupsView.vue') },
      { path: 'billing', name: 'billing', component: () => import('@/views/BillingView.vue') },
      { path: 'activity', name: 'activity', component: () => import('@/views/ActivityView.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.restored) await auth.restore();
  if (!to.meta.public && !auth.isAuthenticated) return { name: 'login', query: { next: to.fullPath } };
  if (to.name === 'login' && auth.isAuthenticated) return { name: 'overview' };
  return true;
});
