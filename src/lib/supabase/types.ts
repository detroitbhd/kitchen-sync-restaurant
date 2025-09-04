export type KitchenOrderItem = {
  id?: number
  name: string
  quantity?: number
}

export type KitchenOrder = {
  id: string
  customer_name?: string
  items?: KitchenOrderItem[] | string
  notes?: string
  status?: string
  prep_time?: number
  created_at?: string
}
