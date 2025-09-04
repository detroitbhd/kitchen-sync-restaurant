import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase/index'

interface OpeningHour {
  day_of_week: number
  day_name: string
  is_closed: boolean
  open_time_lunch: string
  close_time_lunch: string
  open_time_evening: string
  close_time_evening: string
}

export function useRestaurantHours() {
  const editingOpeningHours = ref<OpeningHour[]>([])
  const loading = ref(false)
  const currentTimeRef = ref(Date.now()) // For reactive time updates
  let timeTimer: NodeJS.Timeout | null = null

  // Setup time timer for reactive updates
  onMounted(() => {
    // Fetch opening hours immediately when composable is used
    fetchOpeningHours()
    
    // Update time every minute for restaurant status
    timeTimer = setInterval(() => {
      currentTimeRef.value = Date.now()
    }, 60000)
  })

  onUnmounted(() => {
    if (timeTimer) {
      clearInterval(timeTimer)
      timeTimer = null
    }
  })
  const openingHours = ref({
    monday: { open: '09:00', close: '22:00', closed: false },
    tuesday: { open: '09:00', close: '22:00', closed: false },
    wednesday: { open: '09:00', close: '22:00', closed: false },
    thursday: { open: '09:00', close: '22:00', closed: false },
    friday: { open: '09:00', close: '22:00', closed: false },
    saturday: { open: '09:00', close: '22:00', closed: false },
    sunday: { open: '09:00', close: '22:00', closed: true }
  })

  const isLoading = computed(() => loading.value)

  const fetchOpeningHours = async () => {
    loading.value = true
    try {
      // Fetch real opening hours from Supabase
      const { data, error } = await supabase
        .from('opening_hours')
        .select('*')
        .order('day_of_week', { ascending: true })

      if (error) {
        console.error('Error fetching opening hours from Supabase:', error)
        // Fallback to default hours if database fetch fails
        editingOpeningHours.value = [
          { day_of_week: 1, day_name: 'Monday', is_closed: false, open_time_lunch: '', close_time_lunch: '', open_time_evening: '18:30', close_time_evening: '23:30' },
          { day_of_week: 2, day_name: 'Tuesday', is_closed: false, open_time_lunch: '', close_time_lunch: '', open_time_evening: '18:30', close_time_evening: '23:30' },
          { day_of_week: 3, day_name: 'Wednesday', is_closed: false, open_time_lunch: '', close_time_lunch: '', open_time_evening: '18:30', close_time_evening: '23:30' },
          { day_of_week: 4, day_name: 'Thursday', is_closed: false, open_time_lunch: '', close_time_lunch: '', open_time_evening: '18:30', close_time_evening: '23:30' },
          { day_of_week: 5, day_name: 'Friday', is_closed: false, open_time_lunch: '', close_time_lunch: '', open_time_evening: '18:30', close_time_evening: '23:30' },
          { day_of_week: 6, day_name: 'Saturday', is_closed: false, open_time_lunch: '', close_time_lunch: '', open_time_evening: '18:30', close_time_evening: '23:30' },
          { day_of_week: 0, day_name: 'Sunday', is_closed: false, open_time_lunch: '', close_time_lunch: '', open_time_evening: '18:30', close_time_evening: '23:30' }
        ]
      } else {
        // Use real data from database
        editingOpeningHours.value = data || []
      }
    } catch (error) {
      console.error('Error fetching opening hours:', error)
      // Fallback to default hours on any error
      editingOpeningHours.value = [
        { day_of_week: 1, day_name: 'Monday', is_closed: false, open_time_lunch: '', close_time_lunch: '', open_time_evening: '18:30', close_time_evening: '23:30' },
        { day_of_week: 2, day_name: 'Tuesday', is_closed: false, open_time_lunch: '', close_time_lunch: '', open_time_evening: '18:30', close_time_evening: '23:30' },
        { day_of_week: 3, day_name: 'Wednesday', is_closed: false, open_time_lunch: '', close_time_lunch: '', open_time_evening: '18:30', close_time_evening: '23:30' },
        { day_of_week: 4, day_name: 'Thursday', is_closed: false, open_time_lunch: '', close_time_lunch: '', open_time_evening: '18:30', close_time_evening: '23:30' },
        { day_of_week: 5, day_name: 'Friday', is_closed: false, open_time_lunch: '', close_time_lunch: '', open_time_evening: '18:30', close_time_evening: '23:30' },
        { day_of_week: 6, day_name: 'Saturday', is_closed: false, open_time_lunch: '', close_time_lunch: '', open_time_evening: '18:30', close_time_evening: '23:30' },
        { day_of_week: 0, day_name: 'Sunday', is_closed: false, open_time_lunch: '', close_time_lunch: '', open_time_evening: '18:30', close_time_evening: '23:30' }
      ]
    } finally {
      loading.value = false
    }
  }

  const saveOpeningHours = async () => {
    loading.value = true
    try {
      // Save all opening hours to Supabase
      for (const daySchedule of editingOpeningHours.value) {
        const { error } = await supabase
          .from('opening_hours')
          .upsert({
            day_of_week: daySchedule.day_of_week,
            day_name: daySchedule.day_name,
            is_closed: daySchedule.is_closed,
            open_time_lunch: daySchedule.open_time_lunch || null,
            close_time_lunch: daySchedule.close_time_lunch || null,
            open_time_evening: daySchedule.open_time_evening || null,
            close_time_evening: daySchedule.close_time_evening || null
          }, {
            onConflict: 'day_of_week'
          })
        
        if (error) {
          console.error(`Error saving ${daySchedule.day_name} schedule:`, error)
          throw error
        }
      }
      
      console.log('✅ Opening hours saved successfully')
      // Refresh the data after saving
      await fetchOpeningHours()
    } catch (error) {
      console.error('Error saving opening hours:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const cancelEditingOpeningHours = () => {
    editingOpeningHours.value = []
  }

  const saveOpeningRow = async (row: OpeningHour) => {
    try {
      const { error } = await supabase
        .from('opening_hours')
        .upsert({
          day_of_week: row.day_of_week,
          day_name: row.day_name,
          is_closed: row.is_closed,
          open_time_lunch: row.open_time_lunch || null,
          close_time_lunch: row.close_time_lunch || null,
          open_time_evening: row.open_time_evening || null,
          close_time_evening: row.close_time_evening || null
        }, {
          onConflict: 'day_of_week'
        })
      
      if (error) throw error
      
      console.log(`✅ ${row.day_name} schedule saved`)
      // Refresh the data after saving
      await fetchOpeningHours()
    } catch (error) {
      console.error(`Error saving ${row.day_name} schedule:`, error)
      throw error
    }
  }

  const saveAllOpeningHours = async () => {
    await saveOpeningHours()
  }

  const initializeEditingHours = () => {
    fetchOpeningHours()
  }

  // Check if restaurant is currently open based on current time and real database data
  const isCurrentlyOpen = computed(() => {
    // Use reactive time reference to trigger updates
    currentTimeRef.value
    
    // Don't calculate if we haven't loaded the opening hours yet
    if (!editingOpeningHours.value.length) {
      return false
    }
    
    const now = new Date()
    const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
    
    // Find today's schedule from the database data
    const todaySchedule = editingOpeningHours.value.find(day => day.day_of_week === currentDay)
    
    if (!todaySchedule) {
      console.log(`🔴 No schedule found for day ${currentDay}`)
      return false
    }
    
    // If the restaurant is marked as closed for this day
    if (todaySchedule.is_closed) {
      console.log(`🔴 Restaurant closed - ${todaySchedule.day_name} is marked as closed`)
      return false
    }
    
    // Check lunch hours if they exist
    const hasLunchHours = todaySchedule.open_time_lunch && todaySchedule.close_time_lunch
    if (hasLunchHours) {
      const lunchOpen = todaySchedule.open_time_lunch.slice(0, 5) // Remove seconds if present
      const lunchClose = todaySchedule.close_time_lunch.slice(0, 5)
      if (currentTime >= lunchOpen && currentTime <= lunchClose) {
        console.log(`� Restaurant OPEN - lunch hours: ${lunchOpen}-${lunchClose} (current: ${currentTime})`)
        return true
      }
    }
    
    // Check evening hours if they exist
    const hasEveningHours = todaySchedule.open_time_evening && todaySchedule.close_time_evening
    if (hasEveningHours) {
      const eveningOpen = todaySchedule.open_time_evening.slice(0, 5) // Remove seconds if present
      const eveningClose = todaySchedule.close_time_evening.slice(0, 5)
      if (currentTime >= eveningOpen && currentTime <= eveningClose) {
        console.log(`🟢 Restaurant OPEN - evening hours: ${eveningOpen}-${eveningClose} (current: ${currentTime})`)
        return true
      }
    }
    
    console.log(`🔴 Restaurant CLOSED - current time ${currentTime} is outside operating hours on ${todaySchedule.day_name}`)
    return false
  })

  return {
    editingOpeningHours,
    openingHours,
    isLoading,
    isCurrentlyOpen,
    fetchOpeningHours,
    saveOpeningHours,
    cancelEditingOpeningHours,
    saveOpeningRow,
    saveAllOpeningHours,
    initializeEditingHours
  }
}
