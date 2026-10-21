import { z } from 'zod';
import type { CreateInstanceInput, Flavor, Image, Quota } from '@/api/types';
import { hoursInMonth } from './format';
import { canLaunch } from './quota';

export const WIZARD_STEPS = ['image', 'flavor', 'network', 'keypair', 'review'] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export interface WizardState {
  step: number;
  name: string;
  image_id: string | null;
  flavor_id: string | null;
  network_id: string | null;
  keypair_id: string | null;
  security_group_ids: string[];
}

export const initialWizard = (): WizardState => ({ step: 0, name: '', image_id: null, flavor_id: null, network_id: null, keypair_id: null, security_group_ids: ['sg-default'] });

export const nameSchema = z
  .string()
  .trim()
  .min(3, 'at least 3 characters')
  .max(40, 'at most 40 characters')
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'lowercase letters, digits and hyphens; must start and end alphanumeric');

const required = (message: string) => z.string().nullable().refine((v): v is string => !!v, message);

const stepSchemas: Record<WizardStep, z.ZodTypeAny> = {
  image: z.object({ name: nameSchema, image_id: required('pick an image') }),
  flavor: z.object({ flavor_id: required('pick a flavor') }),
  network: z.object({ network_id: required('pick a network'), security_group_ids: z.array(z.string()).min(1, 'at least one security group') }),
  keypair: z.object({}), // optional: an instance may be created without SSH key (console access only)
  review: z.object({}),
};

export function stepName(state: WizardState): WizardStep {
  return WIZARD_STEPS[Math.min(Math.max(state.step, 0), WIZARD_STEPS.length - 1)];
}

/** Field errors for the current step, empty when the step is complete. */
export function validateStep(state: WizardState): Record<string, string> {
  const result = stepSchemas[stepName(state)].safeParse(state);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '_');
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

export function canProceed(state: WizardState): boolean {
  return Object.keys(validateStep(state)).length === 0;
}

export function next(state: WizardState): WizardState {
  if (!canProceed(state) || state.step >= WIZARD_STEPS.length - 1) return state;
  return { ...state, step: state.step + 1 };
}

export function back(state: WizardState): WizardState {
  return { ...state, step: Math.max(0, state.step - 1) };
}

/** Flavors that satisfy the chosen image's minimum disk/RAM. */
export function compatibleFlavors(flavors: Flavor[], image: Image | undefined): Flavor[] {
  if (!image) return flavors;
  return flavors.filter((f) => f.ram_mb >= image.min_ram_mb && f.disk_gb >= image.min_disk_gb);
}

export interface Estimate { hourly_bdt: number; monthly_bdt: number }

export function estimate(flavor: Flavor | undefined, month = new Date()): Estimate {
  if (!flavor) return { hourly_bdt: 0, monthly_bdt: 0 };
  const hours = hoursInMonth(month);
  return { hourly_bdt: flavor.hourly_bdt, monthly_bdt: Math.round(flavor.hourly_bdt * hours * 100) / 100 };
}

export interface ReviewProblem { message: string }

export function reviewProblems(state: WizardState, flavors: Flavor[], images: Image[], quota: Quota | null): ReviewProblem[] {
  const problems: ReviewProblem[] = [];
  const flavor = flavors.find((f) => f.id === state.flavor_id);
  const image = images.find((i) => i.id === state.image_id);
  if (!flavor || !image) return [{ message: 'image and flavor are required' }];
  if (!compatibleFlavors([flavor], image).length) problems.push({ message: `${flavor.name} is below ${image.name}'s minimum (${image.min_ram_mb} MB RAM, ${image.min_disk_gb} GB disk)` });
  if (quota) {
    const check = canLaunch(quota, flavor);
    if (!check.ok) problems.push(...check.blockers.map((b) => ({ message: `quota: ${b}` })));
  }
  return problems;
}

export function toInput(state: WizardState): CreateInstanceInput {
  if (!state.image_id || !state.flavor_id || !state.network_id) throw new Error('wizard is incomplete');
  return {
    name: state.name.trim(),
    image_id: state.image_id,
    flavor_id: state.flavor_id,
    network_id: state.network_id,
    keypair_id: state.keypair_id,
    security_group_ids: state.security_group_ids,
  };
}
