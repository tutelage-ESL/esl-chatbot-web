<template>
	<div :class="wrapperClasses">
		<div :class="contentClasses">
			<AppText size="11" weight="semibold" color="brand-primary" :class-list="eyebrowClasses">
				{{ eyebrow }}
			</AppText>

			<AppText size="section-h2" weight="semibold" color="brand-ink" :class-list="titleClasses">
				{{ title }}
			</AppText>

			<AppText
				v-if="description"
				size="16"
				color="brand-sub"
				:class-list="descriptionClasses"
			>
				{{ description }}
			</AppText>
		</div>

		<div v-if="hasAction" :class="actionClasses">
			<slot name="action" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { twMerge } from 'tailwind-merge'

interface SectionHeaderProps {
	eyebrow: string
	title: string
	description?: string
	align?: 'start' | 'center'
	wrapperClass?: string
	contentClass?: string
	eyebrowClass?: string
	titleClass?: string
	descriptionClass?: string
	actionClass?: string
}

const props = withDefaults(defineProps<SectionHeaderProps>(), {
	description: '',
	align: 'start',
	wrapperClass: '',
	contentClass: '',
	eyebrowClass: '',
	titleClass: '',
	descriptionClass: '',
	actionClass: '',
})

const slots = useSlots()
const hasAction = computed(() => Boolean(slots.action))

const wrapperClasses = computed(() => {
	const layoutClasses = hasAction.value
		? props.align === 'start'
			? 'flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-6'
			: 'flex flex-col items-center gap-5'
		: ''

	return twMerge('w-full', layoutClasses, props.wrapperClass)
})

const contentClasses = computed(() => twMerge(
	'w-full max-w-2xl',
	props.align === 'center' ? 'mx-auto text-center' : 'text-left',
	props.contentClass,
))

const eyebrowClasses = computed(() => twMerge(
	'uppercase tracking-[0.2em] text-sm mb-3',
	props.eyebrowClass,
))

const titleClasses = computed(() => twMerge(
	'tracking-[-0.03em] leading-[1.05]',
	props.titleClass,
))

const descriptionClasses = computed(() => twMerge(
	'mt-4 leading-relaxed',
	props.align === 'center' ? 'mx-auto' : '',
	props.descriptionClass,
))

const actionClasses = computed(() => twMerge(
	props.align === 'start' ? 'w-full md:w-auto md:shrink-0' : '',
	props.actionClass,
))
</script>
