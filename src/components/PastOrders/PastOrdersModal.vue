<template>
  <div class="modal-backdrop" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <div class="header-left">
          <button 
            @click="toggleCalendar" 
            class="today-btn"
            :class="{ active: showCalendar }"
          >
            {{ selectedDate ? formatSelectedDate : 'Today' }}
          </button>
          
          <select v-model="orderTypeFilter" @change="applyFilters" class="type-select">
            <option value="all">All Types</option>
            <option value="delivery">Delivery</option>
            <option value="eat-in">Eat In</option>
            <option value="takeaway">Takeaway</option>
          </select>
          
          <span class="order-count">{{ orders.length }} orders</span>
        </div>
        
        <div class="header-center">
        </div>
        
        <div class="header-right">
          <button @click="closeModal" class="close-btn">×</button>
        </div>
        
        <!-- Calendar Popup -->
        <div v-if="showCalendar" class="calendar-popup">
          <div class="calendar-grid">
            <div v-for="(day, index) in calendarDays" :key="`${day.date?.getTime() || index}`" 
                 class="calendar-day" 
                 :class="{ 
                   selected: isSelectedDate(day.date), 
                   today: isToday(day.date)
                 }"
                 @click="selectDate(day.date)">
              <div class="day-number">{{ day.day }}</div>
              <div class="day-month">{{ day.date.toLocaleDateString('en-US', { month: 'short' }) }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-body">
        <div v-if="isLoading" class="loading">
          Loading orders...
        </div>
        
        <div v-else-if="error" class="error">
          <h4>Error loading orders:</h4>
          <p>{{ error }}</p>
          <button @click="loadOrders" class="retry-btn">Retry</button>
        </div>
        
        <div v-else-if="orders.length === 0" class="empty">
          <p>No orders found.</p>
        </div>
        
        <div v-else class="orders-grid">
          <div 
            v-for="order in orders" 
            :key="order.id" 
            class="past-order-card"
          >
            <!-- Contact Info Modal for this specific order -->
            <div v-if="showContactInfo && selectedContactOrder?.id === order.id" class="contact-overlay" @click="closeContactInfo">
              <div class="contact-modal" @click.stop>
                <button class="close-btn" @click="closeContactInfo">×</button>
                <div class="contact-body">
                  <div class="contact-field">
                    <span>{{ contactInfo.name || 'N/A' }}</span>
                  </div>
                  <div class="contact-field">
                    <span>{{ contactInfo.phone || 'N/A' }}</span>
                  </div>
                  <div class="contact-field">
                    <span>{{ contactInfo.address || 'N/A' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="order-header">
              <div class="order-id-section">
                <span class="order-badge">#{{ order.id }}</span>
                <span class="order-type-header">{{ order.order_type?.name || 'Sur Place' }}</span>
                <div class="header-menu">
                  <button class="menu-btn" @click="toggleOrderMenu(order.id)">⋮</button>
                  <div v-if="activeOrderMenu === order.id" class="menu-dropdown">
                    <button @click="handlePrint(order)" class="menu-item">PRINT</button>
                    <button @click="showContactModal(order)" class="menu-item">CONTACT</button>
                  </div>
                </div>
              </div>
              <div class="status-badge" :class="getStatusClass(order.status)">{{ order.status }}</div>
            </div>
            
            <div class="order-content">
              <div class="items-list">
                <div v-for="(item, index) in parseOrderItems(order.order_details)" :key="`${order.id}-${item.product_name}-${index}`" class="order-item">
                  <div class="item-main">
                    <span class="item-quantity">{{ item.quantity }}×</span>
                    <span class="item-name">{{ item.product_name }}</span>
                  </div>
                  <div v-if="item.boisson_name || item.accompagnement_name" class="item-customizations">
                    <div v-if="item.boisson_name" class="customization">
                      + {{ item.boisson_name }}
                    </div>
                    <div v-if="item.accompagnement_name" class="customization">
                      + {{ item.accompagnement_name }}
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="order-meta">
                <div class="meta-item">
                  <span class="meta-value">{{ formatDateSimple(order.created_at) }}</span>
                </div>
              </div>
            </div>
            
            <div class="order-actions">
              <button 
                v-if="order.status === 'CLOSED'"
                @click="reactivateOrder(order.id)"
                class="action-btn primary"
              >
                SEND BACK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../lib/supabase/index'

interface Props {
  typeIcons: Record<string, string>
}

interface Emits {
  close: []
  orderReactivated: [orderId: any]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isLoading = ref(true)
const orders = ref<any[]>([])
const error = ref('')
const searchStatus = ref<string>('CLOSED')

// New filter state
const selectedDateRange = ref('today')
const customDate = ref('')
const statusFilter = ref('all')
const orderTypeFilter = ref('all')
const originalOrders = ref<any[]>([]) // Store all loaded orders for filtering

// Calendar state
const showCalendar = ref(false)
const selectedDate = ref<Date | null>(null)
const calendarDate = ref(new Date())

// Menu state
const activeOrderMenu = ref<string | null>(null)

// Contact modal state
const showContactInfo = ref(false)
const selectedContactOrder = ref<any>(null)
const contactInfo = ref({
  name: '',
  phone: '',
  address: ''
})

const parseOrderItems = (orderDetails: any) => {
  try {
    console.log('parseOrderItems received:', orderDetails)
    
    // If orderDetails is a JSON string, parse it first
    if (typeof orderDetails === 'string') {
      try {
        console.log('parseOrderItems: parsing JSON string')
        const parsed = JSON.parse(orderDetails)
        console.log('parseOrderItems: parsed JSON:', parsed)
        if (Array.isArray(parsed)) {
          console.log('parseOrderItems: parsed is array, processing directly')
          return parsed.map((item: any) => ({
            product_name: item.product?.name || item.product_name || item.name || 'Produit',
            quantity: item.quantity || 1,
            boisson_name: item.boisson?.name || item.boisson_name,
            accompagnement_name: item.accompagnement?.name || item.accompagnement_name,
            customizations: item.customizations || []
          }))
        }
      } catch (e) {
        console.log('parseOrderItems: JSON parsing failed:', e)
      }
    }
    
    // If orderDetails is already an array
    if (Array.isArray(orderDetails)) {
      console.log('parseOrderItems: orderDetails is array, processing directly')
      return orderDetails.map((item: any) => ({
        product_name: item.product?.name || item.product_name || item.name || 'Produit',
        quantity: item.quantity || 1,
        boisson_name: item.boisson?.name || item.boisson_name,
        accompagnement_name: item.accompagnement?.name || item.accompagnement_name,
        customizations: item.customizations || []
      }))
    }

    // Fallback for empty or invalid data
    console.log('parseOrderItems: no valid data found')
    return []
  } catch (error) {
    console.error('parseOrderItems error:', error)
    return []
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}

const formatDateSimple = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

const getStatusClass = (status: string) => {
  const statusMap: Record<string, string> = {
    'PENDING': 'status-pending',
    'ACCEPTED': 'status-accepted', 
    'PREPARING': 'status-preparing',
    'READY': 'status-ready',
    'CLOSED': 'status-closed'
  }
  return statusMap[status] || 'status-unknown'
}

const loadOrders = async () => {
  isLoading.value = true
  error.value = ''
  
  try {
    console.log('Loading only CLOSED past orders')
    
    const { data, error: queryError } = await supabase
      .from('orders')
      .select(`
        *,
        order_type:order_type_id (
          id,
          name
        )
      `)
      .eq('status', 'CLOSED')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (queryError) throw queryError
    
    console.log('Loaded orders data:', data)
    originalOrders.value = data || []
    applyFilters() // Apply current filters
    console.log(`Loaded ${originalOrders.value.length} CLOSED orders`)
    
  } catch (err: any) {
    console.error('Error loading orders:', err)
    error.value = err.message || 'Unknown error occurred'
    orders.value = []
  } finally {
    isLoading.value = false
  }
}

const reactivateOrder = async (orderId: any) => {
  try {
    console.log('Reactivating order:', orderId)
    
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'En cours' })
      .eq('id', orderId)
    
    if (updateError) throw updateError
    
    // Remove from local list
    originalOrders.value = originalOrders.value.filter((order: any) => order.id !== orderId)
    applyFilters() // Reapply filters
    
    // Close menu
    activeOrderMenu.value = null
    
    // Notify parent
    emit('orderReactivated', orderId)
    
    console.log('Order reactivated successfully!')
    
  } catch (err: any) {
    console.error('Error reactivating order:', err)
    alert(`Failed to reactivate order: ${err.message}`)
  }
}

// Menu functions
const toggleOrderMenu = (orderId: string) => {
  activeOrderMenu.value = activeOrderMenu.value === orderId ? null : orderId
}

const handlePrint = (order: any) => {
  activeOrderMenu.value = null
  // TODO: Implement print functionality
  console.log('Print order:', order.id)
}

const showContactModal = (order: any) => {
  activeOrderMenu.value = null
  selectedContactOrder.value = order
  contactInfo.value = {
    name: order.customer_name || 'Guest Customer',
    phone: order.customer_phone || 'No phone provided',
    address: order.customer_address || 'No address provided'
  }
  showContactInfo.value = true
}

const closeContactInfo = () => {
  showContactInfo.value = false
  selectedContactOrder.value = null
}

// Calendar functionality
const toggleCalendar = () => {
  console.log('toggleCalendar clicked, current showCalendar:', showCalendar.value)
  if (showCalendar.value) {
    // If calendar is open, close it
    showCalendar.value = false
    console.log('Calendar closed')
  } else {
    // If calendar is closed, open it
    showCalendar.value = true
    console.log('Calendar opened')
  }
}

const closeModal = () => {
  // Reset date to today when closing modal
  selectedDate.value = null
  showCalendar.value = false
  emit('close')
}

const setTodayFilter = () => {
  selectedDate.value = new Date()
  showCalendar.value = false
  applyFilters()
}

const formatSelectedDate = computed(() => {
  if (!selectedDate.value) return 'Today'
  
  const today = new Date()
  const isToday = selectedDate.value.toDateString() === today.toDateString()
  
  if (isToday) {
    return 'Today'
  }
  
  return selectedDate.value.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })
})

const calendarDays = computed(() => {
  const today = new Date()
  const days = []
  
  // Generate 15 days ending with today (14 previous days + today)
  for (let i = 14; i >= 0; i--) {
    const date = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000))
    days.push({ 
      day: date.getDate(), 
      date: date, 
      inRange: true // All days are selectable
    })
  }
  
  return days
})

const selectDate = (date: Date | null) => {
  if (!date) return
  selectedDate.value = date
  showCalendar.value = false
  applyFilters()
}

const isSelectedDate = (date: Date | null) => {
  if (!date || !selectedDate.value) return false
  return date.toDateString() === selectedDate.value.toDateString()
}

const isToday = (date: Date | null) => {
  if (!date) return false
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

// New unified filter function
const applyFilters = () => {
  let filteredOrders = [...originalOrders.value]
  
  // Apply date filter - always filter by date (default to today if no date selected)
  const filterDate = selectedDate.value || new Date()
  const startOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
  
  filteredOrders = filteredOrders.filter(order => {
    const orderDate = new Date(order.created_at)
    return orderDate >= startOfDay && orderDate < endOfDay
  })
  
  // Apply order type filter
  if (orderTypeFilter.value !== 'all') {
    filteredOrders = filteredOrders.filter(order => {
      const orderType = order.order_type?.name?.toLowerCase() || 'sur place'
      
      switch (orderTypeFilter.value) {
        case 'delivery':
          return orderType.includes('livraison') || orderType.includes('delivery')
        case 'eat-in':
          return orderType.includes('sur place') || orderType.includes('eat') || orderType === 'sur place'
        case 'takeaway':
          return orderType.includes('emporter') || orderType.includes('takeaway') || orderType.includes('take')
        default:
          return true
      }
    })
  }
  
  orders.value = filteredOrders
}

onMounted(() => {
  // Set today as the default selected date
  selectedDate.value = new Date()
  loadOrders()
})
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  position: relative;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
}

.order-count {
  background: #f8fafc;
  color: #374151;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  color: #6b7280;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.today-btn {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  font-weight: 500;
  color: #374151;
}

.today-btn.active {
  background: white;
  color: #374151;
  border-color: #d1d5db;
}

.type-select {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  min-width: 120px;
  cursor: pointer;
}

.modal-body {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.loading, .empty, .error {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.error {
  color: #dc2626;
}

.debug-info {
  background: #f3f4f6;
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
  text-align: left;
}

.retry-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
}

.retry-btn:hover {
  background: #2563eb;
}

.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.past-order-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.order-id {
  font-weight: 600;
  color: #3b82f6;
}

.customer {
  font-weight: 500;
  flex: 1;
}

.status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-pending { background: #fef3c7; color: #92400e; }
.status-accepted { background: #dbeafe; color: #1e40af; }
.status-preparing { background: #fed7d7; color: #c53030; }
.status-ready { background: #d1fae5; color: #065f46; }
.status-closed { background: #f3f4f6; color: #374151; }
.status-unknown { background: #f9fafb; color: #6b7280; }

.order-details {
  margin-bottom: 1rem;
}

.type {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
  display: block;
}

.items-list {
  margin: 0.5rem 0;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.order-item:last-child {
  border-bottom: none;
}

.item-name {
  font-weight: 500;
  color: #374151;
}

.quantity {
  font-size: 0.875rem;
  color: #6b7280;
}

.customizations {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.customization {
  font-size: 0.75rem;
  color: #9ca3af;
  font-style: italic;
}

.items {
  font-size: 0.875rem;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.created {
  font-size: 0.75rem;
  color: #9ca3af;
  margin: 0;
}

.reactivate-btn {
  width: 100%;
  background: #60a5fa;
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.reactivate-btn:hover {
  background: #3b82f6;
}

.status-info {
  text-align: center;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
  color: #6b7280;
  font-style: italic;
}

/* Date Filter Bar Styles */
.date-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
}

.filter-section label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
  white-space: nowrap;
}

.date-select, .status-select, .date-input {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  min-width: 120px;
}

.date-input {
  min-width: 150px;
}

.filter-results {
  margin-left: auto;
}

.results-count {
  background: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Enhanced Order Card Styles */
.past-order-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  overflow: hidden;
}

.past-order-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.order-id-section {
  display: flex;
  align-items: center;
  gap: 1rem; /* Increased gap for better spacing */
  position: relative;
}

.order-badge {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 700;
  font-size: 0.875rem;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.order-type-header {
  font-weight: 600;
  color: #374151;
  font-size: 1.125rem;
}

.header-menu {
  position: relative;
}

.menu-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  color: #6b7280;
  transition: all 0.2s ease;
}

.menu-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
  min-width: 160px;
  overflow: hidden;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: white;
  text-align: left;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
  transition: background-color 0.2s ease;
}

.menu-item:hover {
  background: #f3f4f6;
}

.menu-item.reactivate {
  color: #3b82f6;
  font-weight: 500;
}

.menu-item.delete {
  color: #dc2626;
  border-top: 1px solid #f3f4f6;
}

.status-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.order-content {
  padding: 1.25rem;
}

.order-type {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #f1f5f9;
  border-radius: 6px;
}

.type-text {
  font-weight: 600; /* Increased weight to match new cards */
  color: #475569;
  font-size: 1.125rem; /* Increased to match order type in new cards */
}

.items-section {
  margin-bottom: 1rem;
}

.items-header {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.75rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.order-item {
  margin-bottom: 0.75rem;
}

.item-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.item-name {
  font-weight: 600;
  color: #111827;
  font-size: 1.125rem;
}

.item-quantity {
  font-weight: 600;
  color: #3b82f6;
  font-size: 1rem;
}

.item-customizations {
  margin-left: 3.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.customization {
  font-size: 1rem;
  color: #6b7280;
  font-weight: 500;
  background: #f1f5f9;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
  width: fit-content;
}

.order-meta {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
}

.meta-item {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.meta-value {
  font-size: 0.75rem; /* Reduced size for created date */
  color: #6b7280;
  font-weight: 400;
}

.order-actions {
  padding: 1rem 1.25rem;
  border-top: 1px solid #e5e7eb;
  background: #f8fafc;
}

.action-btn {
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.action-btn.primary {
  background: #3b82f6;
  color: white;
}

.action-btn.primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .date-filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .filter-section {
    justify-content: space-between;
  }
  
  .filter-results {
    margin-left: 0;
    text-align: center;
  }
  
  .orders-grid {
    grid-template-columns: 1fr;
  }
}

/* Calendar Styles */
.today-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  position: relative;
}

.today-btn.active {
  background: #1d4ed8;
}

.clear-btn {
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  margin-left: 0.5rem;
}

.clear-btn:hover {
  background: #dc2626;
}

.calendar-popup {
  position: absolute;
  top: calc(100% + 8px);
  left: 1.5rem;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  z-index: 1000;
  padding: 1rem;
  min-width: 600px;
  max-width: 700px;
}

.calendar-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1rem;
}

.calendar-title {
  font-weight: 600;
  color: #111827;
  font-size: 1rem;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(15, 1fr);
  gap: 4px;
}

.calendar-day {
  width: 36px;
  height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.75rem;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  transition: all 0.2s;
}

.calendar-day:hover {
  background: #e5e7eb;
  border-color: #3b82f6;
}

.calendar-day.selected {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.calendar-day.today {
  background: #fef3c7;
  border-color: #f59e0b;
  font-weight: 600;
}

.day-number {
  font-weight: 600;
  font-size: 0.875rem;
}

.day-month {
  font-size: 0.625rem;
  color: #6b7280;
  margin-top: 1px;
}

.calendar-day:hover {
  background: #f3f4f6;
}

.calendar-day.selected {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.calendar-day.selected .day-month {
  color: #bfdbfe;
}

.calendar-day.today {
  background: #fef3c7;
  color: #92400e;
  border-color: #f59e0b;
}

.calendar-day.today .day-month {
  color: #b45309;
}

.calendar-day.today.selected {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.calendar-day.today.selected .day-month {
  color: #bfdbfe;
}

/* Contact Modal */
.contact-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
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
</style>