import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from '@/stores/ui';
import ConfirmDialog from './ConfirmDialog.vue';
import QuotaGauge from './QuotaGauge.vue';
import SpendChart from './SpendChart.vue';
import StatusBadge from './StatusBadge.vue';
import ToastList from './ToastList.vue';

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('QuotaGauge', () => {
  it('renders the percentage, label and level', () => {
    const w = mount(QuotaGauge, { props: { quota: { key: 'vcpus', label: 'vCPUs', used: 60, limit: 64, percent: 93.8, remaining: 4, level: 'critical' } } });
    expect(w.text()).toContain('93.8%');
    expect(w.text()).toContain('60 / 64');
    expect(w.attributes('data-level')).toBe('critical');
    expect(w.attributes('aria-label')).toBe('vCPUs: 60 of 64 (93.8%)');
    expect(w.findAll('circle')[1].attributes('stroke')).toBe('#ef4444');
  });
});

describe('SpendChart', () => {
  it('draws one point per day and a path', () => {
    const w = mount(SpendChart, { props: { values: [100, 200, 150] } });
    expect(w.findAll('circle')).toHaveLength(3);
    expect(w.find('path[stroke]').attributes('d')).toMatch(/^M.*L.*L/);
    expect(w.text()).toContain('day 3');
  });
});

describe('StatusBadge', () => {
  it('styles known statuses and falls back for unknown ones', () => {
    expect(mount(StatusBadge, { props: { status: 'ACTIVE' } }).classes().join(' ')).toContain('emerald');
    expect(mount(StatusBadge, { props: { status: 'mystery' } }).classes().join(' ')).toContain('slate');
  });
});

describe('ui store + dialogs', () => {
  it('shows toasts and resolves confirmations', async () => {
    const ui = useUiStore();
    const toasts = mount(ToastList);
    ui.notify('error', 'Something broke', 0);
    await toasts.vm.$nextTick();
    expect(toasts.text()).toContain('Something broke');
    await toasts.find('button').trigger('click');
    expect(ui.toasts).toHaveLength(0);

    const dialog = mount(ConfirmDialog);
    const answer = ui.ask({ title: 'Delete volume', message: 'Sure?', confirmLabel: 'Delete', danger: true });
    await dialog.vm.$nextTick();
    expect(dialog.text()).toContain('Delete volume');
    const buttons = dialog.findAll('button');
    expect(buttons[1].classes()).toContain('btn-danger');
    await buttons[1].trigger('click');
    expect(await answer).toBe(true);
    expect(dialog.find('[role=dialog]').exists()).toBe(false);
  });
});
