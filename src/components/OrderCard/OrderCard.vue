<template>
  <div 
    class="order-card"
    :class="orderCardClasses"
    :data-status="canonicalizeStatus(order.status)" 
    :data-order-id="order.id"
  >
    <!-- Top Section: Badge + Order Type + Menu -->
    <div class="order-top" :class="headerColorClass">
      <div class="order-badge">#{{ order.id }}</div>
      <div class="order-type">{{ order.order_type?.name || 'Sur Place' }}</div>
      <div class="menu-container">
        <button class="order-menu-btn" @click="toggleOrderMenu">
          <span class="menu-dot"></span>
          <span class="menu-dot"></span>
          <span class="menu-dot"></span>
        </button>
        
        <!-- Dropdown Menu -->
        <div v-if="showOrderMenu" class="order-dropdown-menu" @click.stop>
          <button class="menu-item" @click="handlePrint">
            PRINT
          </button>
          <button class="menu-item" @click="toggleContactInfo">
            CONTACT
          </button>
        </div>
      </div>
    </div>

    <!-- Contact Info Modal -->
    <div v-if="showContactInfo" class="contact-overlay" @click="closeContactInfo">
      <div class="contact-modal" @click.stop>
        <button class="close-btn" @click="closeContactInfo">×</button>
        <div class="contact-body">
          <div class="contact-field">
            <span>{{ customerInfo.name || 'N/A' }}</span>
          </div>
          <div class="contact-field">
            <span>{{ customerInfo.phone || 'N/A' }}</span>
          </div>
          <div class="contact-field">
            <span>{{ customerInfo.address || 'N/A' }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Main Content: Products and Customizations -->
    <div class="order-content">
      <div class="items-list">
        <div v-if="parsedItems.length > 0">
          <div v-for="item in parsedItems" :key="item.name + '-' + item.quantity" class="order-item">
            <div class="item-main">
              <span class="item-quantity">{{ item.quantity }}×</span>
              <span class="item-name">{{ item.name }}</span>
            </div>
            <div v-if="item.boisson_name || item.accompagnement_name" class="item-customizations">
              <div v-if="item.accompagnement_name" class="customization">
                – {{ item.accompagnement_name }}
              </div>
              <div v-if="item.boisson_name" class="customization">
                – {{ item.boisson_name }}
              </div>
            </div>
          </div>
        </div>
        <!-- Debug: Show when no parsed items -->
        <div v-else class="debug-fallback">
          <div class="order-item">
            <div class="item-main">
              <span class="item-quantity">1×</span>
              <span class="item-name">Order #{{ order.id }}</span>
            </div>
            <div class="item-debug">
              <small>Debug: Check console for order details</small>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Bottom Section: Prep Time + Status Button -->
    <div class="order-bottom">
      <div class="prep-section">
        <div class="prep-controls">
          <button 
            class="prep-btn"
            :disabled="(order.additional_prep_time || 0) <= 0" 
            @click="handleDecreasePrepTime"
          >
            -
          </button>
          <div class="countdown">{{ formattedCountdown }}</div>
          <button 
            class="prep-btn"
            @click="handleIncreasePrepTime"
          >
            +
          </button>
        </div>
      </div>
      
      <button 
        class="status-btn"
        :class="getStatusButtonClass(order.status)"
        @click="handleStatusAction"
      >
        {{ getStatusButtonText(order.status) }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useOrderCard } from '../../composables/useOrderCard'

interface Props {
  order: any
  globalPrepTime: any
  expandedOrders: Set<string>
  isNewlyArrived?: boolean
}

interface Emits {
  prepTimeUpdated: [orderId: any, newTime: number]
  statusUpdated: [orderId: any, status: string]
  'toggle-expand': [orderId: any]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Order card composable
const { 
  computeRemainingSeconds, 
  canonicalizeStatus, 
  getNextStatus,
  getStatusDisplay,
  parseItems, 
  updateOrderStatus
} = useOrderCard()

// Local state
const showOrderMenu = ref(false)
const showContactInfo = ref(false)
const currentTime = ref(Date.now()) // For live countdown updates
let timer: NodeJS.Timeout | null = null

// Setup live timer
onMounted(() => {
  timer = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000) // Update every second
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})

// Computed properties
const orderCardClasses = computed(() => {
  const status = canonicalizeStatus(props.order.status)
  
  // Check if countdown has reached 0 and order is not ready
  currentTime.value // Trigger reactivity
  const seconds = props.order.countdownSeconds ?? computeRemainingSeconds(props.order, props.globalPrepTime)
  const isCountdownExpired = seconds <= 0
  const isNotReady = status !== 'READY' && status !== 'CLOSED'
  
  return [
    `status-${status.toLowerCase()}`,
    { 
      'overdue': props.order.isWarning && status !== 'READY',
      'countdown-expired': isCountdownExpired && isNotReady,
      'newly-arrived-glow': props.isNewlyArrived && status === 'PENDING'
    }
  ]
})

const parsedItems = computed(() => {
  return parseItems(props.order.order_details || props.order)
})

const headerColorClass = computed(() => {
  const orderType = props.order.order_type?.name || 'Sur Place'
  
  if (orderType === 'Livraison') return 'header-livraison'
  if (orderType === 'Emporter') return 'header-emporter'
  if (orderType === 'Sur Place') return 'header-sur-place'
  
  return 'header-sur-place' // Default to Sur Place
})

const formatOrderTime = computed(() => {
  if (props.order.created_at) {
    const date = new Date(props.order.created_at)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    })
  }
  return '--:--'
})

const formattedCountdown = computed(() => {
  // Trigger reactivity with currentTime to update every second
  currentTime.value
  
  const seconds = props.order.countdownSeconds ?? computeRemainingSeconds(props.order, props.globalPrepTime)
  const minutes = Math.ceil(seconds / 60) // Round up to next minute
  
  return `${minutes}m`
})

// Customer info computed property (placeholder data for now)
const customerInfo = computed(() => ({
  name: props.order.customer_name || 'Guest Customer',
  phone: props.order.customer_phone || 'No phone provided',
  address: props.order.customer_address || 'No address provided'
}))

// Status and action methods
const getStatusButtonClass = (status: string) => {
  const canonical = canonicalizeStatus(status)
  return `btn-${canonical.toLowerCase()}`
}

const getStatusButtonText = (status: string) => {
  const canonical = canonicalizeStatus(status)
  switch (canonical) {
    case 'PENDING': return 'ACCEPT'
    case 'ACCEPTED': return 'READY'
    case 'READY': return 'CLOSE'
    default: return 'ACCEPT'
  }
}

// Event handlers
const toggleOrderMenu = () => {
  showOrderMenu.value = !showOrderMenu.value
}

const handleDecreasePrepTime = async () => {
  try {
    const newTime = Math.max(0, (props.order.additional_prep_time || 0) - 1)
    // Update in Supabase
    emit('prepTimeUpdated', props.order.id, newTime)
  } catch (error) {
    console.error('Failed to decrease prep time:', error)
  }
}

const handleIncreasePrepTime = async () => {
  try {
    const newTime = (props.order.additional_prep_time || props.order.prep_time || 0) + 1
    // Update in Supabase
    emit('prepTimeUpdated', props.order.id, newTime)
  } catch (error) {
    console.error('Failed to increase prep time:', error)
  }
}

const handleStatusAction = async () => {
  try {
    let newStatus = ''
    const canonical = canonicalizeStatus(props.order.status)
    
    // Fixed status flow: PENDING -> ACCEPTED -> READY -> CLOSED
    if (canonical === 'PENDING') newStatus = 'En cours'    // ACCEPT: PENDING -> ACCEPTED
    else if (canonical === 'ACCEPTED') newStatus = 'Prêt'  // READY: ACCEPTED -> READY  
    else if (canonical === 'READY') newStatus = 'CLOSED'   // CLOSE: READY -> CLOSED
    else return

    await updateOrderStatus(props.order.id, newStatus)
    emit('statusUpdated', props.order.id, newStatus)
  } catch (error) {
    console.error('Failed to update status:', error)
  }
}

// Menu handlers
const handlePrint = () => {
  showOrderMenu.value = false
  // TODO: Implement print functionality
  console.log('Print order:', props.order.id)
}

const toggleContactInfo = () => {
  showOrderMenu.value = false
  showContactInfo.value = true
}

const closeContactInfo = () => {
  showContactInfo.value = false
}
</script>

<style scoped>
.order-card {
  background: white;
  border-radius: 13.2px; /* 10% increase */
  box-shadow: 0 2.2px 8.8px rgba(0, 0, 0, 0.1); /* 10% increase */
  border: none; /* Remove border to allow header to extend to edges */
  padding: 0; /* Remove padding to allow header to reach borders */
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 0; /* Remove gap to allow header to connect */
  transform: scale(1.1); /* Overall 10% size increase */
  transform-origin: center;
  margin: 1.1rem; /* Add margin to prevent overlapping */
  overflow: hidden; /* Ensure header doesn't break border radius */
}

.order-card:hover {
  box-shadow: 0 4.4px 13.2px rgba(0, 0, 0, 0.15); /* 10% increase */
  transform: scale(1.1) translateY(-1.1px); /* Maintain scale with hover effect */
}

.order-card.overdue {
  animation: pulse-warning 2s infinite;
}

.order-card.countdown-expired {
  border: 3px solid #ef4444; /* Red border */
  border-radius: 13.2px; /* Maintain border radius */
  animation: pulse-countdown-expired 2s infinite ease-in-out;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2); /* Additional glow effect */
}

/* Countdown expired takes precedence over overdue */
.order-card.countdown-expired.overdue {
  animation: pulse-countdown-expired 2s infinite ease-in-out;
}

/* Newly arrived glow effect */
.order-card.newly-arrived-glow {
  animation: gentle-glow 2s infinite ease-in-out;
  border: 2px solid #22c55e; /* Light green border */
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2); /* Green glow */
}

@keyframes pulse-warning {
  0%, 100% { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
  50% { box-shadow: 0 4px 16px rgba(239, 68, 68, 0.2); }
}

@keyframes pulse-countdown-expired {
  0%, 100% { 
    border-color: #ef4444;
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2), 0 2.2px 8.8px rgba(0, 0, 0, 0.1);
  }
  50% { 
    border-color: #dc2626;
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.4), 0 4.4px 13.2px rgba(239, 68, 68, 0.3);
  }
}

@keyframes gentle-glow {
  0%, 100% { 
    border-color: #22c55e;
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2), 0 2.2px 8.8px rgba(0, 0, 0, 0.1);
  }
  50% { 
    border-color: #16a34a;
    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.4), 0 4.4px 13.2px rgba(34, 197, 94, 0.3);
  }
}

/* Top Section */
.order-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2375rem; /* Reduced by 10% from 1.375rem */
  margin: 0; /* No margin - goes to borders */
  border-radius: 13.2px 13.2px 0 0; /* Only top corners rounded */
}

/* Solid color variants for header background based on order type */
.header-livraison {
  background: #ef4444; /* Solid red for delivery */
}

.header-emporter {
  background: #8b5cf6; /* Solid purple for takeout */
}

.header-sur-place {
  background: #eab308; /* Solid yellow for dine-in */
}

/* Content area with padding */
.order-content {
  padding: 1.375rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.order-badge {
  color: white;
  background: #6b7280; /* Default gray badge for all order types */
  padding: 0.55rem 1.1rem; /* 10% increase */
  border-radius: 22px; /* 10% increase */
  font-weight: 700;
  font-size: 0.9625rem; /* 10% increase */
  box-shadow: 0 2.2px 4.4px rgba(0, 0, 0, 0.2); /* 10% increase */
}

.order-type {
  font-weight: 600;
  color: white; /* White text on colored backgrounds */
  font-size: 1.2375rem; /* 10% increase */
}

.order-menu-btn {
  display: flex;
  flex-direction: column;
  gap: 2.2px; /* 10% increase */
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.55rem; /* 10% increase */
  border-radius: 6.6px; /* 10% increase */
  transition: background-color 0.2s ease;
}

.order-menu-btn:hover {
  background: #f3f4f6;
}

.menu-dot {
  width: 4.4px; /* 10% increase */
  height: 4.4px; /* 10% increase */
  background: #000000; /* Black dots */
  border-radius: 50%;
}

/* Menu Container */
.menu-container {
  position: relative;
}

/* Dropdown Menu */
.order-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 120px;
  overflow: hidden;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  text-align: left;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.menu-item:hover {
  background: #f9fafb;
}

.menu-item:not(:last-child) {
  border-bottom: 1px solid #f3f4f6;
}

/* Contact Modal */
.contact-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.contact-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 300px;
  max-height: 80vh;
  overflow: hidden;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 20px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  transition: color 0.2s ease;
  z-index: 1;
}

.close-btn:hover {
  color: #374151;
}

.contact-body {
  padding: 16px;
}

.contact-field {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
  text-align: center;
}

.contact-field:last-child {
  border-bottom: none;
}

.contact-field span {
  color: #374151;
  font-weight: 500;
  font-size: 15px;
}

/* Main Content - Products Section */
.order-content {
  flex: 1;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.825rem; /* 10% increase */
}

.item-main {
  display: flex;
  align-items: center;
  gap: 0.825rem; /* 10% increase */
  margin-bottom: 0.55rem; /* 10% increase */
}

.item-quantity {
  /* Removed background and styling to match Product text */
  color: #111827;
  font-size: 1.2375rem; /* 10% increase, matching item-name */
  font-weight: 700;
  /* Removed padding, border-radius, background, etc. */
}

.item-name {
  font-weight: 700;
  color: #111827;
  font-size: 1.2375rem; /* 10% increase */
  flex: 1;
}

.item-customizations {
  margin-left: 3.575rem; /* 10% increase */
  display: flex;
  flex-direction: column;
  gap: 0.275rem; /* 10% increase */
}

.customization {
  font-size: 1.1rem; /* 10% increase */
  color: #111827; /* Changed to black font */
  font-weight: 500;
  /* Removed background and padding - no frame */
  display: inline-block;
  width: fit-content;
}

.debug-fallback {
  opacity: 0.7;
}

.item-debug {
  margin-left: 3.575rem; /* 10% increase */
  font-size: 0.825rem; /* 10% increase */
  color: #ef4444;
  font-style: italic;
}

/* Bottom Section */
.order-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.1rem; /* 10% increase */
  padding: 1.375rem; /* Add padding to move away from borders */
}

.prep-section {
  display: flex;
  flex-direction: column;
  gap: 0.55rem; /* 10% increase */
}

.prep-controls {
  display: flex;
  align-items: center;
  gap: 0.55rem; /* 10% increase */
}

.prep-btn {
  width: 35.2px; /* 10% increase */
  height: 35.2px; /* 10% increase */
  border: 1px solid #d1d5db;
  border-radius: 6.6px; /* 10% increase */
  background: white;
  color: #374151;
  font-size: 1.1rem; /* 10% increase */
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.prep-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.prep-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.prep-time {
  font-size: 0.9625rem; /* 10% increase */
  font-weight: 600;
  color: #374151;
  min-width: 66px; /* 10% increase */
  text-align: center;
}

.countdown {
  font-size: 0.9625rem; /* 10% increase */
  font-weight: 600;
  color: #3b82f6;
  text-align: center;
}

.status-btn {
  padding: 0.825rem 1.65rem; /* 10% increase */
  border: none;
  border-radius: 8.8px; /* 10% increase */
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9625rem; /* 10% increase */
  text-transform: uppercase;
  letter-spacing: 0.055em; /* 10% increase */
}

.status-btn.btn-pending {
  background: #86efac; /* Light green for accept */
  color: #065f46; /* Dark green text */
}

.status-btn.btn-accepted {
  background: #fed7aa; /* Light orange for ready */
  color: #9a3412; /* Dark orange text */
}

.status-btn.btn-ready {
  background: #e5e7eb; /* Light grey for close */
  color: #374151; /* Dark grey text */
}

.status-btn:hover {
  transform: translateY(-1.1px); /* 10% increase */
  box-shadow: 0 4.4px 8.8px rgba(0, 0, 0, 0.15); /* 10% increase */
}

/* Mobile Responsiveness */
@media (max-width: 1024px) {
  .order-card {
    transform: scale(1.05); /* Slightly smaller scaling for tablets */
    margin: 0.8rem;
  }
  
  .order-top {
    padding: 1.1rem;
  }
  
  .order-content {
    padding: 1.1rem;
  }
  
  .order-bottom {
    padding: 1.1rem;
  }
}

@media (max-width: 768px) {
  .order-card {
    transform: scale(1.0); /* Normal scaling for mobile */
    margin: 0.5rem;
    max-width: 100%;
  }
  
  .order-top {
    padding: 1rem;
    flex-wrap: nowrap; /* Prevent wrapping */
  }
  
  .order-badge {
    font-size: 0.875rem;
    padding: 0.5rem 0.9rem;
    flex-shrink: 0; /* Prevent shrinking */
  }
  
  .order-type {
    font-size: 1.1rem;
    flex: 1;
    text-align: center;
  }
  
  .order-menu-btn {
    padding: 0.5rem;
    flex-shrink: 0; /* Prevent shrinking */
  }
  
  .menu-dot {
    width: 4px;
    height: 4px;
  }
  
  .order-content {
    padding: 1rem;
  }
  
  .item-name {
    font-size: 1.1rem;
  }
  
  .item-quantity {
    font-size: 1.1rem;
  }
  
  .customization {
    font-size: 1rem;
  }
  
  .order-bottom {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    padding: 1rem;
  }
  
  .prep-section {
    align-self: center;
  }
  
  .prep-controls {
    gap: 0.5rem;
  }
  
  .prep-btn {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }
  
  .countdown {
    font-size: 0.875rem;
    min-width: 50px;
  }
  
  .status-btn {
    padding: 0.75rem 1.5rem;
    font-size: 0.875rem;
    width: 100%;
    justify-self: stretch;
  }
}

@media (max-width: 480px) {
  .order-card {
    margin: 0.25rem;
    border-radius: 12px;
  }
  
  .order-top {
    padding: 0.875rem;
    border-radius: 12px 12px 0 0;
  }
  
  .order-badge {
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
  }
  
  .order-type {
    font-size: 1rem;
  }
  
  .order-menu-btn {
    padding: 0.4rem;
  }
  
  .menu-dot {
    width: 3.5px;
    height: 3.5px;
  }
  
  .order-content {
    padding: 0.875rem;
  }
  
  .item-name {
    font-size: 1rem;
  }
  
  .item-quantity {
    font-size: 1rem;
  }
  
  .customization {
    font-size: 0.9rem;
  }
  
  .item-customizations {
    margin-left: 2.5rem;
  }
  
  .order-bottom {
    padding: 0.875rem;
    gap: 0.875rem;
  }
  
  .prep-btn {
    width: 30px;
    height: 30px;
    font-size: 0.9rem;
  }
  
  .countdown {
    font-size: 0.8rem;
    min-width: 45px;
  }
  
  .status-btn {
    padding: 0.7rem 1.25rem;
    font-size: 0.8rem;
  }
}

@media (max-width: 320px) {
  .order-card {
    margin: 0.125rem;
  }
  
  .order-top {
    padding: 0.75rem;
  }
  
  .order-badge {
    font-size: 0.75rem;
    padding: 0.35rem 0.7rem;
  }
  
  .order-type {
    font-size: 0.9rem;
  }
  
  .order-content {
    padding: 0.75rem;
  }
  
  .order-bottom {
    padding: 0.75rem;
  }
  
  .item-name {
    font-size: 0.9rem;
  }
  
  .item-quantity {
    font-size: 0.9rem;
  }
  
  .prep-btn {
    width: 28px;
    height: 28px;
    font-size: 0.8rem;
  }
  
  .status-btn {
    padding: 0.6rem 1rem;
    font-size: 0.75rem;
  }
}
</style>
