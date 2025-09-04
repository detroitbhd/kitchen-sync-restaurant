<template>
  <div class="modal-backdrop">
    <div class="bg-white shadow-xl w-full flex flex-col modal-card anchored">
      <div class="px-3 py-2 border-b modal-header">
        <h3 class="text-lg font-semibold">Orders</h3>
        <div class="group header-filter">
          <button
            type="button"
            class="date-btn date-btn--prev"
            @click="changeSelectedDate(-1)"
            aria-label="Previous day"
          >
            <i class="bi bi-chevron-left" aria-hidden="true"></i>
          </button>
          <input 
            ref="dateInputRef" 
            v-model="selectedDate" 
            type="date" 
            id="date-picker" 
            class="input" 
            aria-label="Select date" 
            :max="todayStr" 
            @focus="showCalendar = true" 
          />
          <span class="date-display" @click="showCalendar = true">{{ dateLabel }}</span>
          <InlineCalendar 
            v-if="showCalendar" 
            v-model="selectedDate" 
            :max="todayStr" 
            @close="showCalendar = false" 
          />
          <button
            type="button"
            class="date-btn date-btn--next"
            @click="changeSelectedDate(1)"
            aria-label="Next day"
          >
            <i class="bi bi-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
        <button @click="$emit('close')" class="modal-close-btn" aria-label="Close past orders">
          <svg class="icon-x" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <path d="M6 6L18 18M6 18L18 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <div class="flex-1 p-4 overflow-y-auto past-orders-scroll">
        <div v-if="isLoading" class="text-center text-slate-500 mt-4">
          Loading orders...
        </div>
        <div v-else-if="closedOrders.length === 0" class="text-center text-slate-500 mt-4">
          No closed orders found for {{ dateLabel }}.
        </div>
        <div v-else id="past-order-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <PastOrderCard
            v-for="order in closedOrders"
            :key="order.id"
            :order="order"
            :type-icons="typeIcons"
            @reactivate="handleReactivateOrder"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { usePastOrders } from '../../composables/usePastOrders'
import InlineCalendar from '../InlineCalendar.vue'
import PastOrderCard from './PastOrderCard.vue'

interface Props {
  typeIcons: Record<string, string>
  typeMap?: Record<string, string>
}

interface Emits {
  close: []
  orderReactivated: [orderId: any]
}

const props = withDefaults(defineProps<Props>(), {
  typeMap: () => ({})
})

const emit = defineEmits<Emits>()

const {
  selectedDate,
  showCalendar,
  closedOrders,
  isLoading,
  dateLabel,
  todayStr,
  fetchPastOrders,
  changeSelectedDate,
  reactivateOrder
} = usePastOrders()

const dateInputRef = ref<HTMLInputElement | null>(null)

const handleReactivateOrder = async (orderId: any) => {
  console.log('Modal handling reactivation for order:', orderId)
  
  try {
    const success = await reactivateOrder(orderId)
    if (success) {
      console.log('Order reactivated successfully:', orderId)
      emit('orderReactivated', orderId)
      // Don't auto-close the modal, let user see the result
      // emit('close')
    } else {
      console.error('Failed to reactivate order:', orderId)
      alert('Failed to reactivate the order. Please try again.')
    }
  } catch (error) {
    console.error('Error during reactivation:', error)
    alert('An error occurred while reactivating the order.')
  }
}

// Watch for date changes and refetch orders
watch(selectedDate, () => {
  fetchPastOrders(props.typeMap)
}, { immediate: false })

// Fetch orders when component mounts
onMounted(() => {
  fetchPastOrders(props.typeMap)
})
</script>

<style scoped>
@import './PastOrders.css';
</style>