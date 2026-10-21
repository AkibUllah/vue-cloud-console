import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/api/client';
import type { Flavor, Image, Keypair, Network, Quota } from '@/api/types';
import { quotaViews } from '@/lib/quota';

export const useCatalogStore = defineStore('catalog', () => {
  const images = ref<Image[]>([]);
  const flavors = ref<Flavor[]>([]);
  const networks = ref<Network[]>([]);
  const keypairs = ref<Keypair[]>([]);
  const quota = ref<Quota | null>(null);
  const loaded = ref(false);

  const views = computed(() => (quota.value ? quotaViews(quota.value) : []));
  const flavorById = computed(() => new Map(flavors.value.map((f) => [f.id, f])));
  const imageById = computed(() => new Map(images.value.map((i) => [i.id, i])));
  const networkById = computed(() => new Map(networks.value.map((n) => [n.id, n])));

  async function load(force = false) {
    if (loaded.value && !force) return;
    const c = await api().catalog();
    images.value = c.images;
    flavors.value = c.flavors;
    networks.value = c.networks;
    keypairs.value = c.keypairs;
    loaded.value = true;
  }

  async function refreshQuota() {
    quota.value = await api().quota();
  }

  return { images, flavors, networks, keypairs, quota, views, flavorById, imageById, networkById, loaded, load, refreshQuota };
});
