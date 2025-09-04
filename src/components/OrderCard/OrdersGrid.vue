<template>
  <div class="orders-grid">
    <OrderCard
      v-for="order in orders"
      :key="order.id"
      :order="order"
      :global-prep-time="globalPrepTime"
      :expanded-orders="expandedOrders"
      :is-newly-arrived="newlyArrivedOrders.has(order.id)"
      @prep-time-updated="(orderId, newTime) => $emit('update-prep-time', orderId, newTime)"
      @status-updated="(orderId, status) => $emit('order-status-change', orderId, status)"
      @toggle-expand="(orderId) => $emit('toggle-expand', orderId)"
    />
  </div>
</template>

<script setup lang="ts">
import OrderCard from './OrderCard.vue'

// Define Order interface locally
interface Order {
  id: string
  status: string
  customer_name?: string
  items: any[]
  type?: string
  createdAt: number
  additional_prep_time?: number
}

interface Props {
  orders: Order[]
  typeIcons: Record<string, string>
  expandedOrders: Set<string>
  newlyArrivedOrders: Set<string>
  globalPrepTime?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'order-status-change': [orderId: string, newStatus: string]
  'toggle-expand': [orderId: string]
  'update-prep-time': [orderId: string, prepTime: number]
}>()
</script>

<style scoped>
.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); /* Slightly wider for scaled cards */
  gap: 2rem; /* Increased gap to prevent overlapping of scaled cards */
  padding: 1rem; /* Add padding around the grid */
}

/* Responsive grid adjustments */
@media (max-width: 1200px) {
  .orders-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }
}

@media (max-width: 768px) {
  .orders-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
    padding: 0.5rem;
  }
}

@media (max-width: 480px) {
  .orders-grid {
    grid-template-columns: 1fr; /* Single column on very small screens */
    gap: 0.75rem;
    padding: 0.25rem;
  }
}

@media (max-width: 320px) {
  .orders-grid {
    gap: 0.5rem;
    padding: 0.125rem;
  }
}

.order-item {
  padding: 0.25rem 0;
  border-bottom: 1px solid #e5e7eb;
}
</style>