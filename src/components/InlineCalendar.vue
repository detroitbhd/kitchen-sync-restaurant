<template>
  <div ref="root" class="calendar-popover" role="dialog" aria-label="Choose date">
    <div class="cal-grid cal-weekdays">
      <span v-for="d in weekdays" :key="d" class="cal-wd">{{ d }}</span>
    </div>
    <div class="cal-grid">
      <template v-for="cell in cells" :key="cell.key">
        <div v-if="cell.blank" class="cal-blank" />
        <button v-else type="button" class="cal-day" :class="{ 'is-today': cell.isToday, 'is-selected': cell.isSelected }" :disabled="cell.isDisabled" @click="pick(cell.date)">
          {{ cell.day }}
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{ modelValue: string; max: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void; (e: 'close'): void }>()

const root = ref<HTMLElement | null>(null)

const toDate = (s: string) => {
  const [y, m, d] = (s || '').split('-').map(n => parseInt(n, 10))
  return new Date(y, (m || 1) - 1, d || 1)
}

const today = new Date()
const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

const selected = ref<Date>(toDate(props.modelValue || props.max))
const maxDate = computed(() => toDate(props.max))
const minDate = computed(() => {
  const d = new Date(maxDate.value.getTime())
  d.setDate(d.getDate() - 14) // last 15 days inclusive
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
})

// Keep view in sync with selection, but navigation is disabled in range mode
const viewYear = ref(selected.value.getFullYear())
const viewMonth = ref(selected.value.getMonth())

watch(() => props.modelValue, (v) => {
  const d = toDate(v || props.max)
  selected.value = d
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
})

const weekdays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const buildCells = () => {
  // Build placeholders to align the first day to its weekday (Mon-first)
  const start = minDate.value
  const end = maxDate.value
  const startJs = start.getDay() // 0 Sun..6 Sat
  const lead = (startJs + 6) % 7 // Mon-first offset
  const out: any[] = []
  for (let i = 0; i < lead; i++) out.push({ key: `blank-${i}`, blank: true })
  // Generate each day in the 15-day range
  const days = Math.floor((end.getTime() - start.getTime()) / (24*60*60*1000)) + 1
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    d.setDate(d.getDate() + i)
    const dateStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const isDisabled = dateStart.getTime() > maxDate.value.getTime() || dateStart.getTime() < minDate.value.getTime()
    const isToday = dateStart.getTime() === todayStart.getTime()
    const isSelected = props.modelValue ? dateStart.getTime() === toDate(props.modelValue).setHours(0,0,0,0) : false
    out.push({ key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, day: d.getDate(), isDisabled, isToday, isSelected, date: d })
  }
  return out
}

const cells = computed(() => buildCells())

const pick = (d: Date) => {
  const dateStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (dateStart.getTime() > maxDate.value.getTime()) return
  if (dateStart.getTime() < minDate.value.getTime()) return
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  emit('update:modelValue', `${yyyy}-${mm}-${dd}`)
  emit('close')
}

const onDocClick = (e: MouseEvent) => {
  const el = root.value
  if (!el) return
  if (e.target instanceof Node && !el.contains(e.target)) emit('close')
}
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') emit('close') }

onMounted(() => { document.addEventListener('mousedown', onDocClick); document.addEventListener('keydown', onKey) })
onBeforeUnmount(() => { document.removeEventListener('mousedown', onDocClick); document.removeEventListener('keydown', onKey) })
</script>

<style scoped>
.calendar-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 100%;
  background: var(--bg);
  border: 1px solid rgba(15,23,42,0.08);
  border-radius: 12px;
  box-shadow: 0 18px 40px rgba(2,6,23,0.14);
  z-index: 90;
  padding: 0.5rem;
}
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.cal-weekdays { margin-bottom: 2px; }
.cal-wd { text-align: center; font-size: 0.72rem; color: #94a3b8; font-weight: 700; padding: 2px 0; }
.cal-day { height: 36px; border-radius: 10px; border: 0; background: transparent; color: var(--text); cursor: pointer; font-weight: 600; }
.cal-day:hover { background: rgba(2,6,23,0.06) }
.cal-day.is-today { outline: 2px solid rgba(124,58,237,0.3); }
.cal-day.is-selected { background: linear-gradient(135deg, #7c3aed, #06b6d4); color: #fff; }
.cal-day:disabled { opacity: 0.4; cursor: not-allowed }
.cal-blank { height: 36px; }
</style>